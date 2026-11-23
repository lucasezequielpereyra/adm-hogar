import "server-only"
import { createOpenAICompatibleProvider } from "./providers/openai-compatible"
import type { CategorizationProvider } from "./providers/types"

const num = (v: string | undefined, d: number) => {
  const n = Number(v)
  return Number.isFinite(n) && n > 0 ? n : d
}

export function aiConfig() {
  return {
    apiKey: process.env.DEEPSEEK_API_KEY ?? "",
    baseURL: process.env.DEEPSEEK_BASE_URL || "https://api.deepseek.com",
    model: process.env.DEEPSEEK_MODEL || "deepseek-v4-flash",
    timeoutMs: num(process.env.AI_TIMEOUT_MS, 5000),
    reviewThreshold: Math.min(1, num(process.env.AI_REVIEW_THRESHOLD, 0.6)),
    perMinute: num(process.env.AI_RATE_LIMIT_PER_MINUTE, 20),
    perDay: num(process.env.AI_RATE_LIMIT_PER_DAY, 300),
  }
}

/** Proveedor configurado, o null si falta la API key (todo cae en el fallback). */
export function getProvider(): CategorizationProvider | null {
  const c = aiConfig()
  if (!c.apiKey) return null
  return createOpenAICompatibleProvider({ apiKey: c.apiKey, baseURL: c.baseURL, model: c.model, timeoutMs: c.timeoutMs })
}
