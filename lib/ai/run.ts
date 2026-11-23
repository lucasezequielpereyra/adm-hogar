import "server-only"
import { createAdminClient, type AdminClient } from "@/lib/supabase/admin"
import { categorizeExpense, type CategorizeResult } from "./categorize"
import { aiConfig, getProvider } from "./config"
import { ENTITY_SELECT, ENTITY_TABLE, entityInput, type EntityRow, type EntityType } from "./entities"
import { normalizeDescription } from "./normalize"

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
  const result = await categorizeExpense(entityInput(entityType, row), ctx, {
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
      output: { raw: result.log.output, categoryId: result.categoryId, confidence: result.confidence, reason: result.reason } as never,
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
