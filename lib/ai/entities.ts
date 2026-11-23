import type { ExpenseInput } from "./prompt"

export type EntityType = "card_expense" | "fixed_expense" | "pending_purchase"

export const ENTITY_TABLE = {
  card_expense: "card_expenses",
  fixed_expense: "fixed_expenses",
  pending_purchase: "pending_purchases",
} as const

/** Columnas a leer de cada tabla para armar el input del LLM. */
export const ENTITY_SELECT = {
  card_expense: "id, household_id, created_by, is_private, categorization_status, category_id, description, amount, currency, purchase_date",
  fixed_expense: "id, household_id, created_by, is_private, categorization_status, category_id, name, notes, amount, currency",
  pending_purchase: "id, household_id, created_by, is_private, categorization_status, category_id, name, notes, estimated_price, currency",
} as const

export type EntityRow = {
  id: string
  household_id: string
  created_by: string | null
  is_private: boolean
  categorization_status: string
  category_id: string | null
  description?: string
  name?: string
  notes?: string | null
  amount?: number | string
  estimated_price?: number | string | null
  currency?: string
  purchase_date?: string
}

/** Texto principal del gasto (lo que se normaliza y se manda al LLM). */
export function entityDescription(type: EntityType, row: EntityRow): string {
  return type === "card_expense" ? (row.description ?? "") : (row.name ?? "")
}

export function entityInput(type: EntityType, row: EntityRow): ExpenseInput {
  const base = { currency: row.currency ?? null }
  switch (type) {
    case "card_expense":
      return { ...base, description: row.description ?? "", amount: Number(row.amount), date: row.purchase_date, kind: "gasto de tarjeta de crédito" }
    case "fixed_expense":
      return {
        ...base,
        description: row.notes ? `${row.name} (${row.notes})` : (row.name ?? ""),
        amount: Number(row.amount),
        kind: "gasto fijo mensual del hogar",
      }
    case "pending_purchase":
      return {
        ...base,
        description: row.notes ? `${row.name} (${row.notes})` : (row.name ?? ""),
        amount: row.estimated_price == null ? null : Number(row.estimated_price),
        kind: "compra pendiente",
      }
  }
}
