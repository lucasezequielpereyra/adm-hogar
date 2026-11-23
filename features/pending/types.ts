import type { Database } from "@/lib/supabase/database.types"

export type PendingPurchase = Database["public"]["Tables"]["pending_purchases"]["Row"]
