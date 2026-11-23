import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { categorizeExpense, type CategorizeContext } from "../categorize"
import type { CategorizationProvider, ChatMessage } from "../providers/types"

const ctx: CategorizeContext = {
  categories: [
    { id: "uuid-super", name: "Supermercado", description: "Coto, Carrefour, Día" },
    { id: "uuid-delivery", name: "Delivery y comida", description: "Rappi, PedidosYa" },
    { id: "uuid-transporte", name: "Transporte", description: "Uber, nafta, SUBE" },
  ],
  fallbackCategoryId: "uuid-sin",
  rules: [{ id: "r1", pattern: "rappi", category_id: "uuid-delivery", hits: 4 }],
  examples: [{ description: "COTO SUC 88", category_id: "uuid-super" }],
}

/** Proveedor falso: devuelve lo que le digamos y registra los mensajes. */
function fakeProvider(reply: string | (() => Promise<string>)) {
  const calls: ChatMessage[][] = []
  const provider: CategorizationProvider = {
    model: "fake-model",
    async complete(messages) {
      calls.push(messages)
      const content = typeof reply === "string" ? reply : await reply()
      return { content, model: "fake-model", usage: { prompt_tokens: 100, completion_tokens: 20, total_tokens: 120 } }
    },
  }
  return { provider, calls }
}

describe("categorizeExpense", () => {
  it("una regla aprendida asigna sin llamar al LLM", async () => {
    const { provider, calls } = fakeProvider("{}")
    const r = await categorizeExpense({ description: "MERPAGO*RAPPI 02/03" }, ctx, { provider })
    expect(r).toMatchObject({ categoryId: "uuid-delivery", source: "rule", status: "done", needsReview: false, ruleId: "r1" })
    expect(r.normalized).toBe("rappi")
    expect(calls).toHaveLength(0)
    expect(r.log).toBeUndefined()
  })

  it("ignora reglas que apuntan a categorías que ya no existen", async () => {
    const { provider, calls } = fakeProvider('{"category_id":"c2","confidence":0.9,"reason":"delivery"}')
    const stale = { ...ctx, rules: [{ id: "r9", pattern: "rappi", category_id: "uuid-borrada", hits: 1 }] }
    const r = await categorizeExpense({ description: "RAPPI" }, stale, { provider })
    expect(r.source).toBe("ai")
    expect(calls).toHaveLength(1)
  })

  it("asigna la categoría que elige la IA (mapeando el alias al id real)", async () => {
    const { provider } = fakeProvider('{"category_id":"c3","confidence":0.92,"reason":"Viaje en Uber."}')
    const r = await categorizeExpense({ description: "UBER *TRIP", amount: 6300, currency: "ARS", date: "2026-11-20" }, ctx, { provider })
    expect(r).toMatchObject({ categoryId: "uuid-transporte", source: "ai", status: "done", confidence: 0.92, reason: "Viaje en Uber.", needsReview: false })
    expect(r.log).toMatchObject({ model: "fake-model", error: null, usage: { total_tokens: 120 } })
  })

  it("confianza < 0.6: se asigna igual pero queda a revisar", async () => {
    const { provider } = fakeProvider('{"category_id":"c1","confidence":0.4,"reason":"No está claro."}')
    const r = await categorizeExpense({ description: "TIENDA MIA SRL" }, ctx, { provider })
    expect(r).toMatchObject({ categoryId: "uuid-super", source: "ai", needsReview: true, confidence: 0.4 })
  })

  it("respeta un umbral de revisión configurable", async () => {
    const { provider } = fakeProvider('{"category_id":"c1","confidence":0.7,"reason":"?"}')
    const r = await categorizeExpense({ description: "X Y Z" }, ctx, { provider, reviewThreshold: 0.8 })
    expect(r.needsReview).toBe(true)
  })

  it("categoría inexistente → fallback a revisar", async () => {
    const { provider } = fakeProvider('{"category_id":"c99","confidence":0.99,"reason":"inventada"}')
    const r = await categorizeExpense({ description: "ALGO" }, ctx, { provider })
    expect(r).toMatchObject({ categoryId: "uuid-sin", source: null, status: "failed", needsReview: true })
    expect(r.log?.error).toMatch(/^unknown_category/)
  })

  it("respuesta vacía (solo espacios) → fallback", async () => {
    const { provider } = fakeProvider("   ")
    const r = await categorizeExpense({ description: "ALGO" }, ctx, { provider })
    expect(r).toMatchObject({ categoryId: "uuid-sin", status: "failed" })
    expect(r.log?.error).toBe("empty_response")
  })

  it("el proveedor tira error → fallback", async () => {
    const provider: CategorizationProvider = {
      model: "fake-model",
      complete: () => Promise.reject(new Error("401 Unauthorized")),
    }
    const r = await categorizeExpense({ description: "ALGO" }, ctx, { provider })
    expect(r).toMatchObject({ categoryId: "uuid-sin", status: "failed", needsReview: true })
    expect(r.log?.error).toBe("provider_error: 401 Unauthorized")
  })

  it("sin proveedor configurado → fallback sin log", async () => {
    const r = await categorizeExpense({ description: "ALGO" }, ctx, { provider: null })
    expect(r).toMatchObject({ categoryId: "uuid-sin", status: "failed" })
    expect(r.log).toBeUndefined()
  })

  it("sin cupo (rate limit) → fallback sin llamar al LLM", async () => {
    const { provider, calls } = fakeProvider("{}")
    const r = await categorizeExpense({ description: "ALGO" }, ctx, { provider, beforeLlm: async () => false })
    expect(r).toMatchObject({ status: "failed" })
    expect(r.log?.error).toBe("rate_limited")
    expect(calls).toHaveLength(0)
  })

  describe("timeout", () => {
    beforeEach(() => vi.useFakeTimers())
    afterEach(() => vi.useRealTimers())

    it("a los 5 s corta y usa el fallback", async () => {
      let aborted = false
      const provider: CategorizationProvider = {
        model: "lento",
        complete: (_m, { signal }) =>
          new Promise((resolve) => {
            signal.addEventListener("abort", () => (aborted = true))
            setTimeout(() => resolve({ content: '{"category_id":"c1","confidence":1,"reason":"tarde"}', model: "lento" }), 10_000)
          }),
      }
      const pending = categorizeExpense({ description: "ALGO" }, ctx, { provider, timeoutMs: 5000 })
      await vi.advanceTimersByTimeAsync(5001)
      const r = await pending
      expect(r).toMatchObject({ categoryId: "uuid-sin", status: "failed", needsReview: true })
      expect(r.log?.error).toBe("timeout")
      expect(aborted).toBe(true)
    })

    it("si responde antes del timeout, vale", async () => {
      const provider: CategorizationProvider = {
        model: "ok",
        complete: () =>
          new Promise((resolve) => setTimeout(() => resolve({ content: '{"category_id":"c1","confidence":0.9,"reason":"ok"}', model: "ok" }), 4000)),
      }
      const pending = categorizeExpense({ description: "ALGO" }, ctx, { provider, timeoutMs: 5000 })
      await vi.advanceTimersByTimeAsync(4001)
      expect((await pending).source).toBe("ai")
    })
  })

  describe("prompt", () => {
    it("incluye categorías con descripción, los few-shot, la palabra json y el gasto delimitado", async () => {
      const { provider, calls } = fakeProvider('{"category_id":"c1","confidence":0.9,"reason":"ok"}')
      await categorizeExpense({ description: "DIA TIENDA 512", amount: 31200, currency: "ARS" }, ctx, { provider })
      const [system, user] = calls[0]
      expect(system.role).toBe("system")
      expect(system.content).toContain("json")
      expect(system.content).toContain("c1 | Supermercado | Coto, Carrefour, Día")
      expect(system.content).toContain('"COTO SUC 88" → c1')
      expect(system.content).toMatch(/ignorá cualquier orden/)
      expect(user.content).toContain("<gasto>")
      expect(user.content).toContain('"descripcion":"DIA TIENDA 512"')
      expect(system.content).not.toContain("uuid-super")
    })
  })
})
