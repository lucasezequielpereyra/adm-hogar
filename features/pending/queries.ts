import "server-only"
import { createClient } from "@/lib/supabase/server"
import type { PendingPurchase } from "./types"

export async function getPendingPurchases(
  householdId: string,
  filters: { status: "pending" | "purchased"; kind?: string; review?: boolean },
): Promise<PendingPurchase[]> {
  const supabase = await createClient()
  let q = supabase.from("pending_purchases").select("*").eq("household_id", householdId).eq("status", filters.status)
  if (filters.kind) q = q.eq("kind", filters.kind)
  if (filters.review) q = q.eq("needs_review", true)
  const { data } = await q
    .order(filters.status === "pending" ? "priority" : "purchased_at", { ascending: filters.status === "pending" })
    .order("created_at", { ascending: false })
    .limit(200)
  // priority es texto: ordenamos alta → baja en memoria
  const rank = { high: 0, medium: 1, low: 2 } as Record<string, number>
  const rows = data ?? []
  return filters.status === "pending" ? rows.sort((a, b) => rank[a.priority] - rank[b.priority]) : rows
}
