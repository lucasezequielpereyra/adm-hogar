"use server"

import { revalidatePath } from "next/cache"
import { initialCategoryState } from "@/features/categories/initial-state"
import { scheduleCategorization, scheduleLearning } from "@/features/categories/schedule"
import { fail, fromDb, fromZod, ok, type ActionResult } from "@/lib/actions"
import { parseAmount } from "@/lib/domain/money"
import { getHouseholdContext } from "@/lib/session"
import { createClient } from "@/lib/supabase/server"
import { cardExpenseSchema, cardSchema, type CardExpenseValues, type CardValues } from "./schemas"

function revalidateCards() {
  revalidatePath("/gastos", "layout")
  revalidatePath("/mas/tarjetas")
  revalidatePath("/")
}

export async function saveCard(id: string | null, values: CardValues): Promise<ActionResult> {
  const ctx = await getHouseholdContext()
  const parsed = cardSchema.safeParse(values)
  if (!parsed.success) return fromZod(parsed.error)
  const row = { ...parsed.data, bank: parsed.data.bank || null, last4: parsed.data.last4 || null }
  const supabase = await createClient()
  const { error } = id
    ? await supabase.from("cards").update(row).eq("id", id).eq("household_id", ctx.household.id)
    : await supabase.from("cards").insert({ ...row, household_id: ctx.household.id, created_by: ctx.user.id })
  if (error) return fromDb(error, "No se pudo guardar la tarjeta.")
  revalidateCards()
  return ok()
}

export async function deleteCard(id: string): Promise<ActionResult> {
  const ctx = await getHouseholdContext()
  const supabase = await createClient()
  const { error } = await supabase.from("cards").delete().eq("id", id).eq("household_id", ctx.household.id)
  if (error) return fromDb(error, "No se pudo borrar la tarjeta.")
  revalidateCards()
  return ok()
}

/**
 * Crea o edita un gasto de tarjeta. Las cuotas las genera la base (trigger).
 * Si viene de una compra pendiente, hereda su categoría y queda vinculado.
 */
export async function saveCardExpense(
  id: string | null,
  values: CardExpenseValues,
  fromPendingId?: string | null,
): Promise<ActionResult<{ id: string }>> {
  const ctx = await getHouseholdContext()
  const parsed = cardExpenseSchema.safeParse(values)
  if (!parsed.success) return fromZod(parsed.error)
  const v = parsed.data
  const row = {
    description: v.description,
    amount: parseAmount(v.amount)!,
    currency: v.currency,
    purchase_date: v.purchase_date,
    card_id: v.card_id,
    installments_count: v.installments_count,
    is_private: v.is_private,
    notes: v.notes || null,
  }
  const supabase = await createClient()

  if (id) {
    const { data: before } = await supabase.from("card_expenses").select("category_id, category_source").eq("id", id).maybeSingle()
    const update = v.category_id
      ? { ...row, category_id: v.category_id, category_source: "user", needs_review: false, categorization_status: "done" }
      : row
    const { error } = await supabase.from("card_expenses").update(update).eq("id", id).eq("household_id", ctx.household.id)
    if (error) return fromDb(error, "No se pudo guardar el gasto.")
    if (v.category_id && before && before.category_source !== "user") {
      scheduleLearning({ entityType: "card_expense", entityId: id, fromCategoryId: before.category_id, toCategoryId: v.category_id, userId: ctx.user.id })
    }
    revalidateCards()
    return ok({ id })
  }

  let category: Record<string, unknown> = await initialCategoryState(ctx.household.id, v.category_id)
  if (fromPendingId && !v.category_id) {
    const { data: pending } = await supabase
      .from("pending_purchases")
      .select("category_id, category_source, ai_confidence, ai_reason, needs_review, categorization_status")
      .eq("id", fromPendingId)
      .eq("household_id", ctx.household.id)
      .maybeSingle()
    // Se hereda la categoría ya resuelta: no hace falta volver a llamar a la IA.
    if (pending?.category_id && pending.categorization_status === "done") category = { ...pending }
  }

  const { data, error } = await supabase
    .from("card_expenses")
    .insert({ ...row, ...category, household_id: ctx.household.id, created_by: ctx.user.id })
    .select("id")
    .single()
  if (error) return fromDb(error, "No se pudo guardar el gasto.")

  if (category.categorization_status === "categorizing") {
    scheduleCategorization("card_expense", data.id, { userId: ctx.user.id })
  }

  if (fromPendingId) {
    await supabase
      .from("pending_purchases")
      .update({ card_expense_id: data.id })
      .eq("id", fromPendingId)
      .eq("household_id", ctx.household.id)
    revalidatePath("/compras/pendientes")
  }
  revalidateCards()
  return ok({ id: data.id })
}

export async function deleteCardExpense(id: string): Promise<ActionResult> {
  const ctx = await getHouseholdContext()
  const supabase = await createClient()
  const { error } = await supabase.from("card_expenses").delete().eq("id", id).eq("household_id", ctx.household.id)
  if (error) return fromDb(error, "No se pudo borrar el gasto.")
  revalidateCards()
  return ok()
}

/** Datos para precargar un gasto desde una compra pendiente. */
export async function getPendingPrefill(pendingId: string) {
  const ctx = await getHouseholdContext()
  const supabase = await createClient()
  const { data } = await supabase
    .from("pending_purchases")
    .select("id, name, estimated_price, currency, is_private, category_id, category_source")
    .eq("id", pendingId)
    .eq("household_id", ctx.household.id)
    .maybeSingle()
  if (!data) return fail("No encontramos esa compra.")
  return ok(data)
}
