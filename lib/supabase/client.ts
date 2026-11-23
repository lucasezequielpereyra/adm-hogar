"use client"

import { createBrowserClient } from "@supabase/ssr"
import type { Database } from "./database.types"
import { SESSION_COOKIE_OPTIONS } from "./cookies"
import { supabasePublishableKey, supabaseUrl } from "./env"

let client: ReturnType<typeof createBrowserClient<Database>> | undefined

/** Cliente de Supabase para el navegador (singleton). */
export function createClient() {
  client ??= createBrowserClient<Database>(supabaseUrl(), supabasePublishableKey(), {
    cookieOptions: SESSION_COOKIE_OPTIONS,
  })
  return client
}
