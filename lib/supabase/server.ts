import "server-only"
import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"
import type { Database } from "./database.types"
import { SESSION_COOKIE_OPTIONS } from "./cookies"
import { supabasePublishableKey, supabaseUrl } from "./env"

/**
 * Cliente de Supabase con la sesión del usuario (cookies). Todas las
 * consultas pasan por RLS.
 */
export async function createClient() {
  const cookieStore = await cookies()

  return createServerClient<Database>(supabaseUrl(), supabasePublishableKey(), {
    cookieOptions: SESSION_COOKIE_OPTIONS,
    cookies: {
      getAll() {
        return cookieStore.getAll()
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options))
        } catch {
          // Llamado desde un Server Component: el middleware ya refresca la sesión.
        }
      },
    },
  })
}

export type ServerClient = Awaited<ReturnType<typeof createClient>>
