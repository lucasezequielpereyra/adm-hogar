/**
 * Gasto por categoría con filtros por tarjeta y por tipo (grupales /
 * individuales). Puro: lo usa el gráfico en el cliente y se testea solo.
 */

export type BreakdownRow = {
  categoryId: string | null
  cardId: string
  /** Gasto personal (RLS deja ver solo los propios). */
  isPrivate: boolean
  currency: string
  amount: number
  /** Cuota del mes elegido o del mes anterior (para la barra fantasma). */
  when: "current" | "prev"
}

export type BreakdownKind = "all" | "shared" | "personal"
export type BreakdownFilter = { cardId: string | null; kind: BreakdownKind }

export function filterRows(rows: BreakdownRow[], f: BreakdownFilter): BreakdownRow[] {
  return rows.filter(
    (r) =>
      (f.cardId === null || r.cardId === f.cardId) &&
      (f.kind === "all" || (f.kind === "personal" ? r.isPrivate : !r.isPrivate)),
  )
}

/** Por categoría, en una moneda: este mes contra el anterior, de mayor a menor. */
export function breakdownByCategory(rows: BreakdownRow[], f: BreakdownFilter, currency: "ARS" | "USD") {
  const acc = new Map<string, { current: number; prev: number }>()
  for (const r of filterRows(rows, f)) {
    if (r.currency !== currency) continue
    const id = r.categoryId ?? "none"
    const e = acc.get(id) ?? { current: 0, prev: 0 }
    e[r.when] += r.amount
    acc.set(id, e)
  }
  return [...acc.entries()]
    .map(([categoryId, v]) => ({ categoryId, current: Math.round(v.current), prev: Math.round(v.prev) }))
    .filter((r) => r.current > 0 || r.prev > 0)
    .sort((a, b) => b.current - a.current || b.prev - a.prev)
}

/** Total del mes elegido con el filtro, por moneda. */
export function breakdownTotal(rows: BreakdownRow[], f: BreakdownFilter): Partial<Record<"ARS" | "USD", number>> {
  const out: Partial<Record<"ARS" | "USD", number>> = {}
  for (const r of filterRows(rows, f)) {
    if (r.when !== "current") continue
    const cur = r.currency as "ARS" | "USD"
    out[cur] = Math.round(((out[cur] ?? 0) + r.amount) * 100) / 100
  }
  return out
}
