"use server"

import { redirect } from "next/navigation"
import { fail, fromZod, type ActionResult } from "@/lib/actions"
import { usernameToEmail } from "@/lib/auth/username"
import { safeNext } from "@/lib/safe-next"
import { createClient } from "@/lib/supabase/server"
import { loginSchema, signupSchema, type LoginValues, type SignupValues } from "./schemas"

/** Dominio del email interno de Auth. No cambiarlo con cuentas creadas. */
const authEmail = (username: string) => usernameToEmail(username, process.env.AUTH_USERNAME_DOMAIN || undefined)

export async function signInWithPassword(values: LoginValues, next?: string): Promise<ActionResult> {
  const parsed = loginSchema.safeParse(values)
  if (!parsed.success) return fromZod(parsed.error)

  const supabase = await createClient()
  const { error } = await supabase.auth.signInWithPassword({
    email: authEmail(parsed.data.username),
    password: parsed.data.password,
  })
  if (error) return fail("El usuario o la contraseña no coinciden.")
  redirect(safeNext(next))
}

/**
 * Crea la cuenta e inicia sesión en el momento (sin confirmación por mail:
 * en Supabase, "Confirm email" tiene que estar desactivado).
 */
export async function signUp(values: SignupValues, next?: string): Promise<ActionResult> {
  const parsed = signupSchema.safeParse(values)
  if (!parsed.success) return fromZod(parsed.error)

  const supabase = await createClient()
  const { data, error } = await supabase.auth.signUp({
    email: authEmail(parsed.data.username),
    password: parsed.data.password,
    options: { data: { full_name: parsed.data.name, username: parsed.data.username } },
  })
  if (error) {
    if (error.code === "user_already_exists" || error.code === "email_exists") {
      return fail("Ese usuario ya existe. Elegí otro.", { username: "Ese usuario ya existe. Elegí otro." })
    }
    if (error.code === "weak_password") return fail("La contraseña es muy débil.")
    return fail("No se pudo crear la cuenta. Probá de nuevo.")
  }
  if (!data.session) {
    // Pasa si el proyecto de Supabase todavía pide confirmar el email.
    console.error("[auth] signUp sin sesión: desactivá 'Confirm email' en Supabase (Authentication → Providers → Email).")
    return fail("La cuenta se creó pero no se pudo iniciar sesión. Avisale a quien administra la app.")
  }
  redirect(safeNext(next))
}

export async function signOut() {
  const supabase = await createClient()
  await supabase.auth.signOut()
  redirect("/ingresar")
}
