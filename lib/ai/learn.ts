import "server-only"
import { createAdminClient } from "@/lib/supabase/admin"
import { ENTITY_SELECT, ENTITY_TABLE, entityDescription, type EntityRow, type EntityType } from "./entities"
import { MIN_RULE_LENGTH, normalizeDescription } from "./normalize"

/**
 * Aprende de una corrección manual: crea/actualiza la regla para la
 * descripción normalizada y registra la corrección (ejemplo few-shot).
 * Se llama después de verificar con RLS que el usuario puede editar el gasto.
 */
export async function recordCorrection(opts: {
  entityType: EntityType
  entityId: string
  fromCategoryId: string | null
  toCategoryId: string
  userId: string
}) {
  const admin = createAdminClient()
  const { data } = await admin
    .from(ENTITY_TABLE[opts.entityType] as "card_expenses")
    .select(ENTITY_SELECT[opts.entityType])
    .eq("id", opts.entityId)
    .maybeSingle()
  const row = data as EntityRow | null
  if (!row) return
  const description = entityDescription(opts.entityType, row)
  const normalized = normalizeDescription(description)

  if (normalized.length >= MIN_RULE_LENGTH) {
    const pattern = normalized.slice(0, 80)
    // No es un upsert: created_by es inmutable y la regla puede ser de otro miembro.
    const { data: existing } = await admin
      .from("category_rules")
      .select("id")
      .eq("household_id", row.household_id)
      .eq("pattern", pattern)
      .maybeSingle()
    const { error } = existing
      ? await admin.from("category_rules").update({ category_id: opts.toCategoryId }).eq("id", existing.id)
      : await admin.from("category_rules").insert({
          household_id: row.household_id,
          pattern,
          category_id: opts.toCategoryId,
          created_by: opts.userId,
        })
    if (error) console.error("[ai] no se pudo guardar la regla", error)
  }

  const { error: corrError } = await admin.from("category_corrections").insert({
    household_id: row.household_id,
    entity_type: opts.entityType,
    entity_id: opts.entityId,
    description: description.slice(0, 300),
    normalized,
    is_private: row.is_private,
    from_category_id: opts.fromCategoryId,
    to_category_id: opts.toCategoryId,
    created_by: opts.userId,
  })
  if (corrError) console.error("[ai] no se pudo registrar la corrección", corrError)
}
