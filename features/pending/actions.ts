"use server"

import { revalidatePath } from "next/cache"
import { initialCategoryState } from "@/features/categories/initial-state"
import { scheduleCategorization, scheduleLearning } from "@/features/categories/schedule"
import { fail, fromDb, fromZod, ok, type ActionResult } from "@/lib/actions"
import { parseAmount } from "@/lib/domain/money"
import { getHouseholdContext } from "@/lib/session"
import { createClient } from "@/lib/supabase/server"
import { pendingSchema, type PendingValues } from "./schemas"

function revalidatePending() {
  revalidatePath("/compras/pendientes")
  revalidatePath("/")
}

export async function savePending(id: string | null, values: PendingValues): Promise<ActionResult> {
  const ctx = await getHouseholdContext()
  const parsed = pendingSchema.safeParse(values)
  if (!parsed.success) return fromZod(parsed.error)
  const v = parsed.data
  const row = {
    name: v.name,
    kind: v.kind,
    priority: v.priority,
    estimated_price: parseAmount(v.estimated_price),
    currency: v.currency,
    url: v.url || null,
    notes: v.notes || null,
    requested_by: v.requested_by,
    is_private: v.is_private,
  }
  const supabase = await createClient()

  if (id) {
    // Al editar, la categoría solo cambia si el usuario eligió una.
    const { data: before } = await supabase.from("pending_purchases").select("category_id, category_source").eq("id", id).maybeSingle()
    const update = v.category_id
      ? { ...row, category_id: v.category_id, category_source: "user", needs_review: false, categorization_status: "done" }
      : row
    const { error } = await supabase.from("pending_purchases").update(update).eq("id", id).eq("household_id", ctx.household.id)
    if (error) return fromDb(error, "No se pudo guardar.")
    if (v.category_id && before && before.category_source !== "user") {
      scheduleLearning({ entityType: "pending_purchase", entityId: id, fromCategoryId: before.category_id, toCategoryId: v.category_id, userId: ctx.user.id })
    }
  } else {
    const category = await initialCategoryState(ctx.household.id, v.category_id)
    const { data, error } = await supabase
      .from("pending_purchases")
      .insert({ ...row, ...category, household_id: ctx.household.id, created_by: ctx.user.id })
      .select("id")
      .single()
    if (error) return fromDb(error, "No se pudo guardar.")
    if (category.categorization_status === "categorizing") scheduleCategorization("pending_purchase", data.id, { userId: ctx.user.id })
  }
  revalidatePending()
  return ok()
}

export async function deletePending(id: string): Promise<ActionResult> {
  const ctx = await getHouseholdContext()
  const supabase = await createClient()
  const { error } = await supabase.from("pending_purchases").delete().eq("id", id).eq("household_id", ctx.household.id)
  if (error) return fromDb(error, "No se pudo borrar.")
  revalidatePending()
  return ok()
}

export async function setPendingPurchased(id: string, purchased: boolean): Promise<ActionResult> {
  const ctx = await getHouseholdContext()
  const supabase = await createClient()
  const { data, error } = await supabase
    .from("pending_purchases")
    .update(
      purchased
        ? { status: "purchased", purchased_at: new Date().toISOString() }
        : { status: "pending", purchased_at: null },
    )
    .eq("id", id)
    .eq("household_id", ctx.household.id)
    .select("id")
  if (error) return fromDb(error, "No se pudo actualizar.")
  if (!data?.length) return fail("No encontramos esa compra.")
  revalidatePending()
  return ok()
}
