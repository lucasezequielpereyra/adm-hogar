import type { Database } from "@/lib/supabase/database.types"

export type Card = Database["public"]["Tables"]["cards"]["Row"]
export type CardExpense = Database["public"]["Tables"]["card_expenses"]["Row"]
export type CardInstallment = Database["public"]["Tables"]["card_installments"]["Row"]

export type InstallmentRow = CardInstallment & { expense: CardExpense }

export type CardPeriod = {
  card: Card
  period: string
  closing: string
  due: string
}

export type MoneyByCurrency = Partial<Record<"ARS" | "USD", number>>
