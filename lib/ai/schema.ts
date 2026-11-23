import { z } from "zod"

/** Forma que le pedimos al modelo (JSON mode). */
export const llmResponseSchema = z.object({
  category_id: z.string().trim().min(1),
  confidence: z.coerce.number().min(0).max(1),
  reason: z
    .string()
    .trim()
    .transform((s) => s.slice(0, 200)),
})

export type LlmResponse = z.infer<typeof llmResponseSchema>

export type ParseError = "empty_response" | "invalid_json" | "invalid_schema" | "unknown_category"

export type ParseResult = { ok: true; value: LlmResponse } | { ok: false; error: ParseError; detail?: string }

/**
 * Valida la respuesta del modelo. Falla si viene vacía o solo con espacios
 * (DeepSeek reemplaza el JSON inválido por espacios), si no es JSON, si no
 * cumple el schema o si el category_id no es una de las categorías dadas.
 */
export function parseLlmResponse(raw: string | null | undefined, validIds: Iterable<string>): ParseResult {
  if (!raw || raw.trim() === "") return { ok: false, error: "empty_response" }
  let json: unknown
  try {
    json = JSON.parse(raw)
  } catch {
    return { ok: false, error: "invalid_json", detail: raw.slice(0, 200) }
  }
  const parsed = llmResponseSchema.safeParse(json)
  if (!parsed.success) return { ok: false, error: "invalid_schema", detail: parsed.error.issues[0]?.message }
  const ids = new Set(validIds)
  if (!ids.has(parsed.data.category_id)) return { ok: false, error: "unknown_category", detail: parsed.data.category_id }
  return { ok: true, value: parsed.data }
}
