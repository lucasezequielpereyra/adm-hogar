import "server-only"
import { createClient } from "@supabase/supabase-js"
import type { Database } from "./database.types"
import { supabaseUrl } from "./env"

/**
 * Cliente con la secret key: saltea RLS. Usar solo en el servidor y
 * filtrando SIEMPRE por household_id (categorización en background,
 * rate limit, ai_logs).
 */
export function createAdminClient() {
  const key = process.env.SUPABASE_SECRET_KEY
  if (!key) throw new Error("Falta SUPABASE_SECRET_KEY (solo servidor). Mirá .env.example.")
  return createClient<Database>(supabaseUrl(), key, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
}

export type AdminClient = ReturnType<typeof createAdminClient>
