/**
 * Sesión larga: la cookie dura 400 días (el máximo que aceptan los
 * navegadores) y se renueva cada vez que se refresca el token, o sea, con
 * el uso. El refresh token de Supabase no vence solo; la sesión termina al
 * cerrar sesión o si se configura un tope en Supabase (Auth → Sessions),
 * que dejamos desactivado.
 */
export const SESSION_COOKIE_OPTIONS = {
  maxAge: 400 * 24 * 60 * 60,
  path: "/",
  sameSite: "lax" as const,
}
