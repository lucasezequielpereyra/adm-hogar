/**
 * Cuentas con nombre de usuario. Supabase Auth necesita un email, así que
 * cada usuario se mapea a un email interno que nunca se muestra ni recibe
 * correo: "ana" → "ana@usuarios.hogar.invalid" (.invalid es un dominio
 * reservado: no existe). El usuario no se puede cambiar después.
 */

/** 3 a 20 caracteres: letras, números, punto, guion o guion bajo. Empieza con letra o número. */
export const USERNAME_RE = /^[a-z0-9][a-z0-9._-]{2,19}$/

export const DEFAULT_USERNAME_DOMAIN = "usuarios.hogar.invalid"

/** "  @Ana " → "ana" */
export function normalizeUsername(input: string): string {
  return input.trim().replace(/^@/, "").toLowerCase()
}

export function isValidUsername(username: string): boolean {
  return USERNAME_RE.test(username)
}

/** Email interno de Supabase Auth para un usuario. */
export function usernameToEmail(username: string, domain: string = DEFAULT_USERNAME_DOMAIN): string {
  return `${normalizeUsername(username)}@${domain}`
}
