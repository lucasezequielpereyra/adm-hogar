const BASE = "http://hogar.local"

/**
 * Solo permite redirigir a rutas internas (evita open redirects).
 * Rechaza caracteres de control y barras invertidas (los navegadores borran
 * tabs/saltos de línea: "/\t/evil.com" terminaría siendo "//evil.com") y
 * después verifica, parseando la URL, que el origen siga siendo el propio.
 * Por último revisa la ruta ya normalizada: "/.//evil.com" o "/a/..//evil.com"
 * quedan como "//evil.com" al resolver los segmentos "." y "..".
 */
export function safeNext(next: string | null | undefined, fallback = "/"): string {
  if (!next || !next.startsWith("/") || /[\u0000-\u001f\u007f\\]/.test(next)) return fallback
  try {
    const url = new URL(next, BASE)
    if (url.origin !== BASE) return fallback
    const out = `${url.pathname}${url.search}${url.hash}`
    if (!out.startsWith("/") || out.startsWith("//") || out.startsWith("/\\")) return fallback
    return out
  } catch {
    return fallback
  }
}
