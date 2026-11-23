import { MIN_RULE_LENGTH } from "./normalize"

export type Rule = { id: string; pattern: string; category_id: string; hits: number }

/**
 * Busca la regla que aplica a una descripción normalizada.
 * 1. Coincidencia exacta.
 * 2. Patrón contenido como palabras completas; gana el más largo y, en
 *    empate, el de más hits.
 */
export function matchRule(normalized: string, rules: Rule[]): Rule | null {
  if (!normalized) return null
  const exact = rules.find((r) => r.pattern === normalized)
  if (exact) return exact
  const padded = ` ${normalized} `
  const candidates = rules.filter((r) => r.pattern.length >= MIN_RULE_LENGTH && padded.includes(` ${r.pattern} `))
  candidates.sort((a, b) => b.pattern.length - a.pattern.length || b.hits - a.hits)
  return candidates[0] ?? null
}
