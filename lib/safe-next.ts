const BASE = "http://hogar.local"

/**
 * Solo permite redirigir a rutas internas (evita open redirects).
 * Rechaza caracteres de control y barras invertidas (los navegadores borran
 * tabs/saltos de línea: "/\t/evil.com" terminaría siendo "//evil.com") y
 * después verifica, parseando la URL, que el origen siga siendo el propio.
 */
export function safeNext(next: string | null | undefined, fallback = "/"): string {
  if (!next || !next.startsWith("/") || /[\u0000-\u001f\u007f\\]/.test(next)) return fallback
  try {
    const url = new URL(next, BASE)
    if (url.origin !== BASE) return fallback
    return `${url.pathname}${url.search}${url.hash}`
  } catch {
    return fallback
  }
}
