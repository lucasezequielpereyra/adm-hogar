/**
 * Categorías propuestas por la IA. El modelo puede sugerir una categoría
 * nueva cuando ninguna encaja; acá se sanea la propuesta y se decide si
 * se reutiliza una existente. Puro: sin base ni entorno (testeable).
 */

export type NewCategoryProposal = { name: string; description?: string; icon?: string }

export type SanitizedProposal = { name: string; description: string; icon: string }

/** Tope de categorías (sin contar "Sin categorizar") para que la IA no llene el hogar. */
export const MAX_CATEGORIES = 30

/** Nombres que nunca se crean (son comodines o ya existen como sistema). */
const RESERVED = new Set(["otros", "otro", "varios", "general", "gastos", "sin categorizar", "sin categoria", "categoria", "nueva categoria"])

/** Minúsculas, sin tildes ni signos; espacios colapsados. */
export function normalizeName(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9ñ ]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
}

/** Singular aproximado ("seguros" → "seguro", "préstamos" → "prestamo"). */
function stem(word: string): string {
  if (word.length > 4 && word.endsWith("es")) return word.slice(0, -2)
  if (word.length > 3 && word.endsWith("s")) return word.slice(0, -1)
  return word
}

function key(s: string): string {
  return normalizeName(s)
    .split(" ")
    .filter((w) => !["y", "e", "de", "del", "la", "el", "los", "las"].includes(w))
    .map(stem)
    .join(" ")
}

/**
 * Sanea lo que devolvió el modelo. Devuelve null si no sirve (vacío,
 * demasiado corto o largo, comodín como "Otros").
 */
export function sanitizeProposal(p: NewCategoryProposal | null | undefined, iconKeys: readonly string[], defaultIcon = "star"): SanitizedProposal | null {
  if (!p) return null
  const name = p.name.replace(/\s+/g, " ").trim()
  if (name.length < 2 || name.length > 40) return null
  if (RESERVED.has(normalizeName(name))) return null
  const pretty = name.charAt(0).toLocaleUpperCase("es-AR") + name.slice(1)
  const description = (p.description ?? "").replace(/\s+/g, " ").trim().slice(0, 300)
  const icon = p.icon && iconKeys.includes(p.icon) ? p.icon : defaultIcon
  return { name: pretty, description, icon }
}

/**
 * Busca una categoría existente equivalente (sin importar tildes,
 * mayúsculas ni plural): "Educacion" = "Educación", "Seguro" = "Seguros".
 */
export function findEquivalent<T extends { id: string; name: string }>(name: string, existing: T[]): T | null {
  const k = key(name)
  if (!k) return null
  return existing.find((c) => key(c.name) === k) ?? null
}

/** Primer color de la paleta que no usa ninguna categoría; si están todos, el que menos se repite. */
export function pickColor(used: readonly string[], palette: readonly string[]): string {
  const counts = new Map(palette.map((c) => [c, 0]))
  for (const u of used) if (counts.has(u)) counts.set(u, counts.get(u)! + 1)
  let best = palette[0]
  for (const c of palette) if (counts.get(c)! < counts.get(best)!) best = c
  return best
}
