import "server-only"
import { dueDateInMonth } from "@/lib/domain/dates"
import { createClient } from "@/lib/supabase/server"
import type { FixedWithPayment } from "./types"

/** Gastos fijos con su pago del mes (si existe) y la fecha de vencimiento. */
export async function getFixedForMonth(householdId: string, month: string, opts: { review?: boolean } = {}): Promise<FixedWithPayment[]> {
  const supabase = await createClient()
  let q = supabase.from("fixed_expenses").select("*").eq("household_id", householdId)
  if (opts.review) q = q.eq("needs_review", true)
  const [{ data: fixed }, { data: payments }] = await Promise.all([
    q.order("due_day").order("name"),
    supabase.from("fixed_expense_payments").select("*").eq("household_id", householdId).eq("period", month),
  ])
  const byFixed = new Map((payments ?? []).map((p) => [p.fixed_expense_id, p]))
  return (fixed ?? []).map((f) => ({ ...f, payment: byFixed.get(f.id) ?? null, dueDate: dueDateInMonth(month, f.due_day) }))
}

type Totals = Record<string, { total: number; paid: number; pending: number }>

/** Totales del mes por moneda (solo activos; lo pagado usa el monto real). */
export function fixedTotals(items: FixedWithPayment[]) {
  const byCurrency: Totals = {}
  for (const f of items) {
    if (!f.is_active && !f.payment) continue
    const cur = (byCurrency[f.currency] ??= { total: 0, paid: 0, pending: 0 })
    if (f.payment) {
      cur.paid += Number(f.payment.amount)
      cur.total += Number(f.payment.amount)
    } else {
      cur.pending += Number(f.amount)
      cur.total += Number(f.amount)
    }
  }
  const active = items.filter((f) => f.is_active)
  return { byCurrency, paidCount: active.filter((f) => f.payment).length, count: active.length }
}
