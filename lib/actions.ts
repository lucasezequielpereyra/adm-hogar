import type { PostgrestError } from "@supabase/supabase-js"
import type { z } from "zod"

export type ActionFailure = { ok: false; error: string; fieldErrors?: Record<string, string> }
export type ActionResult<T = undefined> = { ok: true; data: T } | ActionFailure

export function ok<T = undefined>(data?: T): { ok: true; data: T } {
  return { ok: true, data: data as T }
}

export function fail(error: string, fieldErrors?: Record<string, string>): ActionFailure {
  return { ok: false, error, fieldErrors }
}

/** Errores de Zod → un mensaje por campo. */
export function fromZod(error: z.ZodError) {
  const fieldErrors: Record<string, string> = {}
  for (const issue of error.issues) {
    const key = issue.path.join(".")
    if (!fieldErrors[key]) fieldErrors[key] = issue.message
  }
  return fail("Revisá los datos marcados.", fieldErrors)
}

/** Traduce errores de Postgres/PostgREST a mensajes claros. */
export function fromDb(error: PostgrestError | null | undefined, fallback = "No se pudo guardar. Probá de nuevo.") {
  if (!error) return fail(fallback)
  // Errores lanzados por nuestras funciones con RAISE EXCEPTION ya vienen en español.
  if (error.code === "P0001" || error.code === "P0002" || error.code === "22023" || error.code === "23514" || error.code === "28000") {
    return fail(error.message)
  }
  if (error.code === "23505") {
    return fail(/duplicate key|unique constraint/i.test(error.message) ? "Ya existe un registro con esos datos." : error.message)
  }
  if (error.code === "42501") {
    // Nuestros RAISE con 42501 traen un mensaje en español; los de RLS no.
    return fail(/row-level security|permission denied/i.test(error.message) ? "No tenés permiso para hacer eso." : error.message)
  }
  if (error.code === "23503") return fail("Hace referencia a algo que ya no existe.")
  console.error("[db]", error)
  return fail(fallback)
}
