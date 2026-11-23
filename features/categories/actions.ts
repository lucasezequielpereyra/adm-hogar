"use server"

import { revalidatePath } from "next/cache"
import { fail, fromDb, fromZod, ok, type ActionResult } from "@/lib/actions"
import { getHouseholdContext } from "@/lib/session"
import { createClient } from "@/lib/supabase/server"
import { categorySchema, type CategoryValues } from "./schemas"
import { scheduleCategorization, scheduleLearning } from "./schedule"
import { CATEGORIZABLE, type EntityType } from "./types"

export async function saveCategory(id: string | null, values: CategoryValues): Promise<ActionResult> {
  const ctx = await getHouseholdContext()
  const parsed = categorySchema.safeParse(values)
  if (!parsed.success) return fromZod(parsed.error)
  const supabase = await createClient()
  const { error } = id
    ? await supabase.from("categories").update(parsed.data).eq("id", id).eq("household_id", ctx.household.id)
    : await supabase.from("categories").insert({ ...parsed.data, household_id: ctx.household.id, created_by: ctx.user.id })
  if (error) {
    if (error.code === "23505") return fail("Ya hay una categoría con ese nombre.")
    return fromDb(error, "No se pudo guardar la categoría.")
  }
  revalidatePath("/", "layout")
  return ok()
}

export async function deleteCategory(id: string): Promise<ActionResult> {
  const ctx = await getHouseholdContext()
  const supabase = await createClient()
  const { error } = await supabase.from("categories").delete().eq("id", id).eq("household_id", ctx.household.id)
  if (error) return fromDb(error, "No se pudo borrar la categoría.")
  revalidatePath("/", "layout")
  return ok()
}

/**
 * Corrección manual de la categoría de un gasto. La RLS de la tabla
 * garantiza que el usuario puede ver/editar el gasto.
 */
export async function setEntityCategory(entityType: EntityType, entityId: string, categoryId: string): Promise<ActionResult> {
  const ctx = await getHouseholdContext()
  const table = CATEGORIZABLE[entityType]
  if (!table) return fail("Tipo de gasto inválido.")
  const supabase = await createClient()
  const { data: before } = await supabase
    .from(table as "pending_purchases")
    .select("category_id")
    .eq("id", entityId)
    .eq("household_id", ctx.household.id)
    .maybeSingle()
  // Las tres tablas comparten las columnas de categorización.
  const { data, error } = await supabase
    .from(table as "pending_purchases")
    .update({
      category_id: categoryId,
      category_source: "user",
      needs_review: false,
      categorization_status: "done",
    })
    .eq("id", entityId)
    .eq("household_id", ctx.household.id)
    .select("id")
  if (error) return fromDb(error, "No se pudo cambiar la categoría.")
  if (!data?.length) return fail("No encontramos ese gasto.")
  scheduleLearning({
    entityType,
    entityId,
    fromCategoryId: before?.category_id ?? null,
    toCategoryId: categoryId,
    userId: ctx.user.id,
  })
  revalidatePath("/", "layout")
  return ok()
}

/** Vuelve a categorizar un gasto con IA (reglas primero). */
export async function recategorizeOne(entityType: EntityType, entityId: string): Promise<ActionResult> {
  const ctx = await getHouseholdContext()
  const table = CATEGORIZABLE[entityType]
  if (!table) return fail("Tipo de gasto inválido.")
  const supabase = await createClient()
  // Marcar con el cliente del usuario: la RLS confirma que puede editarlo.
  const { data, error } = await supabase
    .from(table as "pending_purchases")
    .update({ categorization_status: "categorizing" })
    .eq("id", entityId)
    .eq("household_id", ctx.household.id)
    .select("id")
  if (error) return fromDb(error, "No se pudo recategorizar.")
  if (!data?.length) return fail("No encontramos ese gasto.")
  scheduleCategorization(entityType, entityId, { force: true, userId: ctx.user.id })
  revalidatePath("/", "layout")
  return ok()
}
