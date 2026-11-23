/**
 * Resumen de gastos fijos por categoría (puro, sin base). Mismas reglas que
 * los totales del mes: los inactivos sin pago no cuentan; lo pagado usa el
 * monto real y lo pendiente el monto base.
 */

export type FixedSummaryItem = {
  amount: number | string
  currency: string
  category_id: string | null
  is_active: boolean
  created_at: string
  payment: { amount: number | string } | null
}

export type CategoryAmount = { categoryId: string; current: number; prev: number }

/** Cuánto cuenta un gasto fijo en un mes (null = no cuenta). */
function monthAmount(f: FixedSummaryItem): number | null {
  if (f.payment) return Number(f.payment.amount)
  if (!f.is_active) return null
  return Number(f.amount)
}

/**
 * Por categoría y moneda: el mes elegido contra el anterior. Del mes
 * anterior no cuentan los fijos creados después (no existían todavía).
 * `monthStart` es el primer día del mes elegido (YYYY-MM-01).
 */
export function fixedByCategory(
  current: FixedSummaryItem[],
  prev: FixedSummaryItem[],
  currency: "ARS" | "USD",
  monthStart: string,
): CategoryAmount[] {
  const acc = new Map<string, { current: number; prev: number }>()
  const add = (items: FixedSummaryItem[], key: "current" | "prev") => {
    for (const f of items) {
      if (f.currency !== currency) continue
      if (key === "prev" && !f.payment && f.created_at.slice(0, 10) >= monthStart) continue
      const amount = monthAmount(f)
      if (amount === null) continue
      const id = f.category_id ?? "none"
      const e = acc.get(id) ?? { current: 0, prev: 0 }
      e[key] += amount
      acc.set(id, e)
    }
  }
  add(current, "current")
  add(prev, "prev")
  return [...acc.entries()]
    .map(([categoryId, v]) => ({ categoryId, current: Math.round(v.current), prev: Math.round(v.prev) }))
    .filter((r) => r.current > 0 || r.prev > 0)
    .sort((a, b) => b.current - a.current || b.prev - a.prev)
}
