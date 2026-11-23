import "server-only"
import { createClient } from "@/lib/supabase/server"
import type { ShoppingItem, ShoppingList } from "./types"

export async function getListByMonth(householdId: string, month: string): Promise<ShoppingList | null> {
  const supabase = await createClient()
  const { data } = await supabase
    .from("shopping_lists")
    .select("*")
    .eq("household_id", householdId)
    .eq("month", month)
    .eq("is_template", false)
    .maybeSingle()
  return data
}

export async function getListById(householdId: string, id: string): Promise<ShoppingList | null> {
  const supabase = await createClient()
  const { data } = await supabase.from("shopping_lists").select("*").eq("household_id", householdId).eq("id", id).maybeSingle()
  return data
}

export async function getItems(listId: string): Promise<ShoppingItem[]> {
  const supabase = await createClient()
  const { data } = await supabase
    .from("shopping_items")
    .select("*")
    .eq("list_id", listId)
    .order("is_purchased")
    .order("sort_order")
    .order("created_at")
  return data ?? []
}

export async function getTemplates(householdId: string) {
  const supabase = await createClient()
  const { data } = await supabase
    .from("shopping_lists")
    .select("id, name, shopping_items(count)")
    .eq("household_id", householdId)
    .eq("is_template", true)
    .order("name")
  return (data ?? []).map((t) => ({ id: t.id, name: t.name, count: t.shopping_items[0]?.count ?? 0 }))
}

/** Lista más reciente anterior al mes dado (para "crear a partir del mes anterior"). */
export async function getPreviousList(householdId: string, month: string) {
  const supabase = await createClient()
  const { data } = await supabase
    .from("shopping_lists")
    .select("id, name, month")
    .eq("household_id", householdId)
    .eq("is_template", false)
    .lt("month", month)
    .order("month", { ascending: false })
    .limit(1)
    .maybeSingle()
  return data
}

/** Totales de una lista: estimado, real y progreso. */
export function listTotals(items: ShoppingItem[]) {
  const purchased = items.filter((i) => i.is_purchased)
  const estimated = items.reduce((s, i) => s + Number(i.estimated_price ?? 0), 0)
  const real = purchased.reduce((s, i) => s + Number(i.actual_price ?? i.estimated_price ?? 0), 0)
  const missingReal = purchased.filter((i) => i.actual_price === null).length
  return { estimated, real, purchased: purchased.length, total: items.length, missingReal }
}
