import type { Database } from "@/lib/supabase/database.types"

export type Category = Database["public"]["Tables"]["categories"]["Row"]
export type CategoryOption = Pick<Category, "id" | "name" | "icon" | "color" | "is_system" | "description"> &
  Partial<Pick<Category, "created_by_ai">>

/** Entidades que tienen categoría de gasto. */
export const CATEGORIZABLE = {
  card_expense: "card_expenses",
  fixed_expense: "fixed_expenses",
  pending_purchase: "pending_purchases",
} as const

export type EntityType = keyof typeof CATEGORIZABLE

/** Estado de categorización que muestra el chip. */
export type CategoryState = {
  category_id: string | null
  category_source: string | null
  ai_confidence: number | null
  ai_reason: string | null
  needs_review: boolean
  categorization_status: string
}
