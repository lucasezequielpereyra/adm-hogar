import { describe, expect, it } from "vitest"
import { parseLlmResponse } from "../schema"

const ids = ["c1", "c2", "c3"]

describe("parseLlmResponse", () => {
  it("acepta una respuesta válida", () => {
    const r = parseLlmResponse('{"category_id":"c2","confidence":0.82,"reason":"Es un supermercado."}', ids)
    expect(r).toEqual({ ok: true, value: { category_id: "c2", confidence: 0.82, reason: "Es un supermercado." } })
  })

  it("acepta confidence como string numérico", () => {
    const r = parseLlmResponse('{"category_id":"c1","confidence":"0.7","reason":"ok"}', ids)
    expect(r.ok && r.value.confidence).toBe(0.7)
  })

  it("recorta un reason demasiado largo en vez de fallar", () => {
    const r = parseLlmResponse(JSON.stringify({ category_id: "c1", confidence: 0.9, reason: "x".repeat(500) }), ids)
    expect(r.ok && r.value.reason.length).toBe(200)
  })

  it("acepta una categoría nueva propuesta, y descarta una mal formada sin fallar", () => {
    const ok = parseLlmResponse('{"category_id":"c1","confidence":0.5,"reason":"x","new_category":{"name":"Jardinería","icon":"leaf"}}', ids)
    expect(ok.ok && ok.value.new_category).toEqual({ name: "Jardinería", icon: "leaf" })
    const bad = parseLlmResponse('{"category_id":"c1","confidence":0.5,"reason":"x","new_category":"Jardinería"}', ids)
    expect(bad.ok && bad.value.new_category).toBeUndefined()
  })

  it("rechaza un category_id que no es del hogar", () => {
    const r = parseLlmResponse('{"category_id":"c9","confidence":0.9,"reason":"?"}', ids)
    expect(r).toMatchObject({ ok: false, error: "unknown_category" })
  })

  it("rechaza confidence fuera de 0–1", () => {
    expect(parseLlmResponse('{"category_id":"c1","confidence":1.5,"reason":"?"}', ids)).toMatchObject({ ok: false, error: "invalid_schema" })
    expect(parseLlmResponse('{"category_id":"c1","confidence":-0.1,"reason":"?"}', ids)).toMatchObject({ ok: false, error: "invalid_schema" })
  })

  it("rechaza campos faltantes", () => {
    expect(parseLlmResponse('{"category_id":"c1"}', ids)).toMatchObject({ ok: false, error: "invalid_schema" })
  })

  it("rechaza contenido vacío o solo espacios (JSON mode de DeepSeek)", () => {
    expect(parseLlmResponse("", ids)).toMatchObject({ ok: false, error: "empty_response" })
    expect(parseLlmResponse("     \n  ", ids)).toMatchObject({ ok: false, error: "empty_response" })
    expect(parseLlmResponse(null, ids)).toMatchObject({ ok: false, error: "empty_response" })
  })

  it("rechaza texto que no es JSON", () => {
    expect(parseLlmResponse("La categoría es Supermercado", ids)).toMatchObject({ ok: false, error: "invalid_json" })
  })
})
