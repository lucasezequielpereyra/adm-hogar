import "server-only"
import { createClient } from "@/lib/supabase/server"
import type { CategoryOption } from "./types"

export async function getCategories(householdId: string): Promise<CategoryOption[]> {
  const supabase = await createClient()
  const { data } = await supabase
    .from("categories")
    .select("id, name, icon, color, is_system, description")
    .eq("household_id", householdId)
    .order("sort_order")
    .order("name")
  return data ?? []
}

export async function getSystemCategoryId(householdId: string): Promise<string> {
  const supabase = await createClient()
  const { data } = await supabase
    .from("categories")
    .select("id")
    .eq("household_id", householdId)
    .eq("is_system", true)
    .single()
  return data!.id
}
