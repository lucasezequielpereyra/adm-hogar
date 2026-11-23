import type { Database } from "@/lib/supabase/database.types"

export type Card = Database["public"]["Tables"]["cards"]["Row"]
export type CardExpense = Database["public"]["Tables"]["card_expenses"]["Row"]
export type CardInstallment = Database["public"]["Tables"]["card_installments"]["Row"]
export type CardStatement = Database["public"]["Tables"]["card_statements"]["Row"]

export type InstallmentRow = CardInstallment & { expense: CardExpense }

export type CardPeriod = {
  card: Card
  period: string
  /** Cierre y vencimiento: los reales si el resumen está cargado, si no los de los días de la tarjeta. */
  closing: string
  due: string
  /** Fila del resumen (fechas reales y si se pagó), si existe. */
  statement: CardStatement | null
}

export type MoneyByCurrency = Partial<Record<"ARS" | "USD", number>>
