"use server"

import { revalidatePath } from "next/cache"
import { initialCategoryState } from "@/features/categories/initial-state"
import { scheduleCategorization, scheduleLearning } from "@/features/categories/schedule"
import { fail, fromDb, fromZod, ok, type ActionResult } from "@/lib/actions"
import { parseAmount } from "@/lib/domain/money"
import { closingDate, statementDueDate } from "@/lib/domain/periods"
import { getHouseholdContext } from "@/lib/session"
import { createClient } from "@/lib/supabase/server"
import {
  cardExpenseSchema,
  cardSchema,
  statementDatesSchema,
  type CardExpenseValues,
  type CardValues,
  type StatementDatesValues,
} from "./schemas"

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
  /** Primer gasto de un resumen nuevo: sus fechas reales (se guardan antes del gasto). */
  statement?: StatementDatesValues | null,
): Promise<ActionResult<{ id: string }>> {
  const ctx = await getHouseholdContext()
  const parsed = cardExpenseSchema.safeParse(values)
  if (!parsed.success) return fromZod(parsed.error)
  const v = parsed.data
  if (statement && !id) {
    const st = statementDatesSchema.safeParse(statement)
    if (!st.success) return fromZod(st.error)
    const supabase = await createClient()
    // Antes del gasto, así las cuotas ya usan el cierre real. Si otro lo
    // cargó recién, queda el suyo.
    const { error } = await supabase.from("card_statements").upsert(
      {
        household_id: ctx.household.id,
        card_id: v.card_id,
        period: st.data.period,
        closing_date: st.data.closing_date,
        due_date: st.data.due_date,
        created_by: ctx.user.id,
      },
      { onConflict: "card_id,period", ignoreDuplicates: true },
    )
    if (error) return fromDb(error, "No se pudieron guardar las fechas del resumen.")
  }
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

// ── Resúmenes (fechas reales y pago) ─────────────────────────────────

/** Fila del resumen o null (select-then-update/insert: created_by es inmutable). */
async function findStatement(cardId: string, period: string) {
  const supabase = await createClient()
  const { data } = await supabase.from("card_statements").select("id").eq("card_id", cardId).eq("period", period).maybeSingle()
  return data
}

/** Corrige las fechas de cierre y vencimiento de un resumen (mueve las compras si cambia el cierre). */
export async function setStatementDates(cardId: string, values: StatementDatesValues): Promise<ActionResult> {
  const ctx = await getHouseholdContext()
  const parsed = statementDatesSchema.safeParse(values)
  if (!parsed.success) return fromZod(parsed.error)
  const v = parsed.data
  const supabase = await createClient()
  const existing = await findStatement(cardId, v.period)
  const { error } = existing
    ? await supabase
        .from("card_statements")
        .update({ closing_date: v.closing_date, due_date: v.due_date })
        .eq("id", existing.id)
        .eq("household_id", ctx.household.id)
    : await supabase.from("card_statements").insert({
        household_id: ctx.household.id,
        card_id: cardId,
        period: v.period,
        closing_date: v.closing_date,
        due_date: v.due_date,
        created_by: ctx.user.id,
      })
  if (error) return fromDb(error, "No se pudieron guardar las fechas.")
  revalidateCards()
  return ok()
}

/** Marca (o desmarca) un resumen como pagado. Si no estaba cargado, se crea con las fechas de la tarjeta. */
export async function setStatementPaid(cardId: string, period: string, paid: boolean, paidAt: string): Promise<ActionResult> {
  const ctx = await getHouseholdContext()
  if (!/^\d{4}-\d{2}-01$/.test(period) || !/^\d{4}-\d{2}-\d{2}$/.test(paidAt)) return fail("Datos inválidos.")
  const supabase = await createClient()
  const payment = paid ? { paid_at: paidAt, paid_by: ctx.user.id } : { paid_at: null, paid_by: null }
  const existing = await findStatement(cardId, period)
  if (existing) {
    const { error } = await supabase.from("card_statements").update(payment).eq("id", existing.id).eq("household_id", ctx.household.id)
    if (error) return fromDb(error, "No se pudo actualizar el resumen.")
  } else {
    const { data: card } = await supabase
      .from("cards")
      .select("closing_day, due_day")
      .eq("id", cardId)
      .eq("household_id", ctx.household.id)
      .maybeSingle()
    if (!card) return fail("No encontramos la tarjeta.")
    const { error } = await supabase.from("card_statements").insert({
      household_id: ctx.household.id,
      card_id: cardId,
      period,
      closing_date: closingDate(period, card.closing_day),
      due_date: statementDueDate(period, card.closing_day, card.due_day),
      created_by: ctx.user.id,
      ...payment,
    })
    if (error) return fromDb(error, "No se pudo actualizar el resumen.")
  }
  revalidateCards()
  return ok()
}
