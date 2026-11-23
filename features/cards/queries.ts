import "server-only"
import { addMonthsISO } from "@/lib/domain/dates"
import { closingDate, statementDueDate, statementPeriod } from "@/lib/domain/periods"
import { createClient } from "@/lib/supabase/server"
import type { Card, CardPeriod, InstallmentRow, MoneyByCurrency } from "./types"

export async function getCards(householdId: string, { activeOnly = false } = {}): Promise<Card[]> {
  const supabase = await createClient()
  let q = supabase.from("cards").select("*").eq("household_id", householdId)
  if (activeOnly) q = q.eq("is_active", true)
  const { data } = await q.order("created_at")
  return data ?? []
}

/** Período de cada tarjeta: el resumen abierto hoy + offset meses. */
export function cardPeriods(cards: Card[], today: string, offset: number): CardPeriod[] {
  return cards.map((card) => {
    const period = addMonthsISO(statementPeriod(today, card.closing_day), offset)
    return {
      card,
      period,
      closing: closingDate(period, card.closing_day),
      due: statementDueDate(period, card.closing_day, card.due_day),
    }
  })
}

/** Cuotas de los períodos pedidos, con su gasto (RLS filtra los privados ajenos). */
export async function getInstallments(householdId: string, periods: string[]): Promise<InstallmentRow[]> {
  if (periods.length === 0) return []
  const supabase = await createClient()
  const { data } = await supabase
    .from("card_installments")
    .select("*, expense:card_expenses!card_installments_household_id_card_expense_id_fkey!inner(*)")
    .eq("household_id", householdId)
    .in("period", [...new Set(periods)])
    .order("period")
  return (data ?? []) as InstallmentRow[]
}

export function sumByCurrency(rows: { amount: number | string; currency: string }[]): MoneyByCurrency {
  const out: MoneyByCurrency = {}
  for (const r of rows) {
    const cur = r.currency as "ARS" | "USD"
    out[cur] = Math.round(((out[cur] ?? 0) + Number(r.amount)) * 100) / 100
  }
  return out
}

/**
 * Datos del dashboard de tarjetas para un offset (0 = período actual).
 * Cada tarjeta tiene su propio período según su día de cierre.
 */
export async function getCardDashboard(householdId: string, today: string, offset: number) {
  const cards = await getCards(householdId)
  const current = cardPeriods(cards, today, offset)
  const prev = cardPeriods(cards, today, offset - 1)
  const next = cardPeriods(cards, today, offset + 1)

  const rows = await getInstallments(householdId, [...current, ...prev, ...next].map((p) => p.period))
  const pick = (ps: CardPeriod[]) => rows.filter((r) => ps.some((p) => p.card.id === r.card_id && p.period === r.period))

  const currentRows = pick(current)
  const prevRows = pick(prev)
  const nextRows = pick(next)

  return {
    cards,
    current,
    currentRows,
    prevRows,
    nextRows,
    totals: sumByCurrency(currentRows),
    prevTotals: sumByCurrency(prevRows),
    nextInstallments: sumByCurrency(nextRows.filter((r) => r.installments_count > 1)),
    nextTotals: sumByCurrency(nextRows),
  }
}

/** Totales por categoría (una moneda) del período actual y del anterior. */
export function byCategory(currentRows: InstallmentRow[], prevRows: InstallmentRow[], currency: "ARS" | "USD") {
  const acc = new Map<string, { current: number; prev: number }>()
  const add = (rows: InstallmentRow[], key: "current" | "prev") => {
    for (const r of rows) {
      if (r.currency !== currency) continue
      const id = r.expense.category_id ?? "none"
      const e = acc.get(id) ?? { current: 0, prev: 0 }
      e[key] += Number(r.amount)
      acc.set(id, e)
    }
  }
  add(currentRows, "current")
  add(prevRows, "prev")
  return [...acc.entries()]
    .map(([categoryId, v]) => ({ categoryId, current: Math.round(v.current), prev: Math.round(v.prev) }))
    .filter((r) => r.current > 0 || r.prev > 0)
    .sort((a, b) => b.current - a.current || b.prev - a.prev)
}
