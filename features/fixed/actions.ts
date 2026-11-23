"use server"

import { revalidatePath } from "next/cache"
import { initialCategoryState } from "@/features/categories/initial-state"
import { scheduleCategorization, scheduleLearning } from "@/features/categories/schedule"
import { fail, fromDb, fromZod, ok, type ActionResult } from "@/lib/actions"
import { parseAmount } from "@/lib/domain/money"
import { getHouseholdContext } from "@/lib/session"
import { createClient } from "@/lib/supabase/server"
import { fixedSchema, paymentSchema, type FixedValues, type PaymentValues } from "./schemas"

function revalidateFixed() {
  revalidatePath("/gastos", "layout")
  revalidatePath("/")
}

export async function saveFixed(id: string | null, values: FixedValues): Promise<ActionResult> {
  const ctx = await getHouseholdContext()
  const parsed = fixedSchema.safeParse(values)
  if (!parsed.success) return fromZod(parsed.error)
  const v = parsed.data
  const row = {
    name: v.name,
    amount: parseAmount(v.amount)!,
    currency: v.currency,
    due_day: v.due_day,
    payment_method: v.payment_method,
    // Personal: solo vos podés ser responsable (la base también lo valida).
    responsible_ids: v.is_private ? v.responsible_ids.filter((uid) => uid === ctx.user.id) : [...new Set(v.responsible_ids)],
    is_active: v.is_active,
    is_private: v.is_private,
    notes: v.notes || null,
  }
  const supabase = await createClient()
  if (id) {
    const { data: before } = await supabase.from("fixed_expenses").select("category_id, category_source").eq("id", id).maybeSingle()
    const update = v.category_id
      ? { ...row, category_id: v.category_id, category_source: "user", needs_review: false, categorization_status: "done" }
      : row
    const { error } = await supabase.from("fixed_expenses").update(update).eq("id", id).eq("household_id", ctx.household.id)
    if (error) return fromDb(error, "No se pudo guardar.")
    if (v.category_id && before && before.category_source !== "user") {
      scheduleLearning({ entityType: "fixed_expense", entityId: id, fromCategoryId: before.category_id, toCategoryId: v.category_id, userId: ctx.user.id })
    }
  } else {
    const category = await initialCategoryState(ctx.household.id, v.category_id)
    const { data, error } = await supabase
      .from("fixed_expenses")
      .insert({ ...row, ...category, household_id: ctx.household.id, created_by: ctx.user.id })
      .select("id")
      .single()
    if (error) return fromDb(error, "No se pudo guardar.")
    if (category.categorization_status === "categorizing") scheduleCategorization("fixed_expense", data.id, { userId: ctx.user.id })
  }
  revalidateFixed()
  return ok()
}

export async function deleteFixed(id: string): Promise<ActionResult> {
  const ctx = await getHouseholdContext()
  const supabase = await createClient()
  const { error } = await supabase.from("fixed_expenses").delete().eq("id", id).eq("household_id", ctx.household.id)
  if (error) return fromDb(error, "No se pudo borrar.")
  revalidateFixed()
  return ok()
}

export async function payFixed(fixedId: string, period: string, values: PaymentValues): Promise<ActionResult> {
  const ctx = await getHouseholdContext()
  const parsed = paymentSchema.safeParse(values)
  if (!parsed.success) return fromZod(parsed.error)
  if (!/^\d{4}-\d{2}-01$/.test(period)) return fail("Período inválido.")
  const supabase = await createClient()
  const { data: fixed } = await supabase
    .from("fixed_expenses")
    .select("currency")
    .eq("id", fixedId)
    .eq("household_id", ctx.household.id)
    .maybeSingle()
  if (!fixed) return fail("No encontramos ese gasto fijo.")
  const payment = {
    amount: parseAmount(parsed.data.amount)!,
    paid_at: parsed.data.paid_at,
    paid_by: ctx.user.id,
    notes: parsed.data.notes || null,
  }
  const { data: existing } = await supabase
    .from("fixed_expense_payments")
    .select("id")
    .eq("fixed_expense_id", fixedId)
    .eq("period", period)
    .maybeSingle()
  const { error } = existing
    ? await supabase.from("fixed_expense_payments").update(payment).eq("id", existing.id)
    : await supabase.from("fixed_expense_payments").insert({
        ...payment,
        household_id: ctx.household.id,
        fixed_expense_id: fixedId,
        period,
        currency: fixed.currency,
        created_by: ctx.user.id,
      })
  if (error) return fromDb(error, "No se pudo registrar el pago.")
  revalidateFixed()
  return ok()
}

export async function undoPayment(paymentId: string): Promise<ActionResult> {
  const ctx = await getHouseholdContext()
  const supabase = await createClient()
  const { error } = await supabase.from("fixed_expense_payments").delete().eq("id", paymentId).eq("household_id", ctx.household.id)
  if (error) return fromDb(error, "No se pudo deshacer el pago.")
  revalidateFixed()
  return ok()
}
