import "server-only"
import { createAdminClient, type AdminClient } from "@/lib/supabase/admin"
import { categorizeExpense, type CategorizeResult } from "./categorize"
import { aiConfig, getProvider } from "./config"
import { ENTITY_SELECT, ENTITY_TABLE, entityInput, type EntityRow, type EntityType } from "./entities"
import { MAX_CATEGORIES, findEquivalent, normalizeName, pickColor, sanitizeProposal, type NewCategoryProposal } from "./new-category"
import { normalizeDescription } from "./normalize"
import { CATEGORY_ICON_KEYS } from "@/lib/icons"
import { PALETTE_KEYS, type PaletteKey } from "@/lib/palette"

const FEW_SHOT = 20

/** Contexto del hogar: categorías, reglas y últimas correcciones. */
async function loadContext(admin: AdminClient, householdId: string, ownerId: string | null, entityIsPrivate: boolean) {
  const [{ data: categories }, { data: rules }, { data: corrections }] = await Promise.all([
    admin.from("categories").select("id, name, description, is_system").eq("household_id", householdId).order("sort_order"),
    admin.from("category_rules").select("id, pattern, category_id, hits").eq("household_id", householdId),
    admin
      .from("category_corrections")
      .select("description, normalized, to_category_id, is_private, created_by")
      .eq("household_id", householdId)
      .order("created_at", { ascending: false })
      .limit(100),
  ])

  const system = (categories ?? []).find((c) => c.is_system)
  // Ejemplos: últimas 20 correcciones, sin repetir descripción. Las de ítems
  // personales solo se usan si el gasto a categorizar también es personal y
  // de la misma persona (si no, el "reason" o los logs podrían filtrarlas).
  const seen = new Set<string>()
  const examples = (corrections ?? [])
    .filter((c) => !c.is_private || (entityIsPrivate && c.created_by === ownerId))
    .filter((c) => (seen.has(c.normalized) ? false : (seen.add(c.normalized), true)))
    .slice(0, FEW_SHOT)
    .map((c) => ({ description: c.description, category_id: c.to_category_id }))

  return {
    categories: (categories ?? []).filter((c) => !c.is_system).map((c) => ({ id: c.id, name: c.name, description: c.description })),
    fallbackCategoryId: system?.id ?? "",
    rules: rules ?? [],
    examples,
  }
}

type CreatedCategory = { id: string; name: string; reused: boolean }

/**
 * Crea (o reutiliza) la categoría que propuso la IA. Relee las categorías
 * justo antes de insertar: el contexto del prompt puede estar viejo y la
 * recategorización por lotes corre en paralelo.
 */
async function applyNewCategory(admin: AdminClient, householdId: string, proposal: NewCategoryProposal): Promise<CreatedCategory | null> {
  const p = sanitizeProposal(proposal, CATEGORY_ICON_KEYS)
  if (!p) return null
  const { data } = await admin
    .from("categories")
    .select("id, name, color, sort_order, is_system")
    .eq("household_id", householdId)
  const all = data ?? []
  const same = findEquivalent(p.name, all)
  if (same) return same.is_system ? null : { id: same.id, name: same.name, reused: true }
  const regular = all.filter((c) => !c.is_system)
  if (regular.length >= MAX_CATEGORIES) return null

  // Va antes de "Otros" (que queda última).
  const otros = regular.find((c) => normalizeName(c.name) === "otros")
  const maxOrder = Math.max(0, ...regular.map((c) => c.sort_order))
  const sortOrder = otros ? otros.sort_order : maxOrder + 1

  const { data: created, error } = await admin
    .from("categories")
    .insert({
      household_id: householdId,
      name: p.name,
      description: p.description,
      icon: p.icon,
      color: pickColor(
        all.map((c) => c.color),
        PALETTE_KEYS,
      ) as PaletteKey,
      sort_order: sortOrder,
      is_system: false,
      created_by: null,
      created_by_ai: true,
    })
    .select("id, name")
    .single()

  if (error) {
    // Otra categorización la creó recién: se usa esa.
    if (error.code === "23505") {
      const { data: again } = await admin.from("categories").select("id, name, is_system").eq("household_id", householdId)
      const found = findEquivalent(p.name, again ?? [])
      return found && !found.is_system ? { id: found.id, name: found.name, reused: true } : null
    }
    console.error("[ai] crear categoría", error)
    return null
  }
  if (otros) await admin.from("categories").update({ sort_order: maxOrder + 1 }).eq("id", otros.id)
  return { id: created.id, name: created.name, reused: false }
}

/**
 * Categoriza un gasto en background (después de responder al usuario).
 * Usa la secret key: todas las consultas filtran por household_id.
 * Solo escribe si el gasto sigue "categorizing" (o si `force`), para no
 * pisar una corrección manual hecha mientras tanto.
 */
export async function runCategorization(
  entityType: EntityType,
  entityId: string,
  opts: { force?: boolean; triggeredBy?: string | null } = {},
): Promise<CategorizeResult | null> {
  const admin = createAdminClient()
  const table = ENTITY_TABLE[entityType]
  const { data } = await admin.from(table).select(ENTITY_SELECT[entityType]).eq("id", entityId).maybeSingle()
  const row = data as EntityRow | null
  if (!row) return null
  if (!opts.force && row.categorization_status !== "categorizing") return null

  const ctx = await loadContext(admin, row.household_id, row.created_by, row.is_private)
  const cfg = aiConfig()
  // Solo gastos fijos compartidos: una categoría la ve todo el hogar, así que
  // crearla desde un gasto personal filtraría su contenido.
  const allowNewCategory = entityType === "fixed_expense" && !row.is_private
  const result = await categorizeExpense(entityInput(entityType, row), ctx, {
    allowNewCategory,
    iconKeys: CATEGORY_ICON_KEYS,
    provider: getProvider(),
    timeoutMs: cfg.timeoutMs,
    reviewThreshold: cfg.reviewThreshold,
    beforeLlm: async () => {
      const { data: allowed } = await admin.rpc("consume_ai_quota", {
        p_household_id: row.household_id,
        p_cost: 1,
        p_per_minute: cfg.perMinute,
        p_per_day: cfg.perDay,
      })
      return allowed === true
    },
  })

  let createdCategory: CreatedCategory | null = null
  if (allowNewCategory && result.newCategory && result.source === "ai") {
    createdCategory = await applyNewCategory(admin, row.household_id, result.newCategory)
    if (createdCategory) {
      result.categoryId = createdCategory.id
      if (!createdCategory.reused) {
        // Categoría recién creada: queda a revisar para que alguien la confirme.
        result.needsReview = true
        result.reason = `Categoría nueva: ${createdCategory.name}. ${result.reason ?? ""}`.trim().slice(0, 300)
      }
    }
  }

  // Las tres tablas comparten las columnas de categorización.
  let update = admin
    .from(table as "card_expenses")
    .update({
      category_id: result.categoryId || null,
      category_source: result.source,
      ai_confidence: result.confidence,
      ai_reason: result.reason,
      needs_review: result.needsReview,
      categorization_status: result.status,
    })
    .eq("id", entityId)
    .eq("household_id", row.household_id)
  if (!opts.force) update = update.eq("categorization_status", "categorizing")
  await update

  if (result.ruleId) {
    const { data: rule } = await admin.from("category_rules").select("hits").eq("id", result.ruleId).maybeSingle()
    await admin
      .from("category_rules")
      .update({ hits: (rule?.hits ?? 0) + 1, last_matched_at: new Date().toISOString() })
      .eq("id", result.ruleId)
  }

  if (result.log) {
    await admin.from("ai_logs").insert({
      household_id: row.household_id,
      entity_type: entityType,
      entity_id: entityId,
      source: result.status === "failed" ? "fallback" : result.source,
      input: (result.log.input ?? { normalized: normalizeDescription(entityInput(entityType, row).description) }) as never,
      output: {
        raw: result.log.output,
        categoryId: result.categoryId,
        confidence: result.confidence,
        reason: result.reason,
        ...(result.newCategory ? { newCategory: result.newCategory, createdCategory } : {}),
      } as never,
      model: result.log.model,
      latency_ms: Math.round(result.log.latencyMs),
      prompt_tokens: result.log.usage?.prompt_tokens ?? null,
      completion_tokens: result.log.usage?.completion_tokens ?? null,
      total_tokens: result.log.usage?.total_tokens ?? null,
      error: result.log.error,
      created_by: opts.triggeredBy ?? row.created_by,
      // Los logs de ítems personales solo los ve su dueño.
      is_private: row.is_private,
      owner_id: row.created_by,
    })
  }

  return result
}

/** Reencola gastos trabados en "categorizing" (p. ej. si after() se cortó). */
export async function sweepStaleCategorizations(householdId: string, limit = 10) {
  const admin = createAdminClient()
  const cutoff = new Date(Date.now() - 2 * 60_000).toISOString()
  for (const type of Object.keys(ENTITY_TABLE) as EntityType[]) {
    const { data } = await admin
      .from(ENTITY_TABLE[type] as "card_expenses")
      .select("id")
      .eq("household_id", householdId)
      .eq("categorization_status", "categorizing")
      .lt("updated_at", cutoff)
      .limit(limit)
    for (const r of data ?? []) await runCategorization(type, r.id)
  }
}
