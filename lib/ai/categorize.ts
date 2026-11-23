import { normalizeDescription } from "./normalize"
import { buildMessages, type ExpenseInput, type FewShotExample, type PromptCategory } from "./prompt"
import type { CategorizationProvider, CompletionUsage } from "./providers/types"
import { matchRule, type Rule } from "./rules"
import type { NewCategoryProposal } from "./new-category"
import { parseLlmResponse } from "./schema"

export type CategorizeContext = {
  /** Categorías elegibles (sin "Sin categorizar"). */
  categories: PromptCategory[]
  /** "Sin categorizar": se usa si todo falla. */
  fallbackCategoryId: string
  rules: Rule[]
  examples: FewShotExample[]
}

export type CategorizeDeps = {
  provider: CategorizationProvider | null
  timeoutMs?: number
  reviewThreshold?: number
  maxTokens?: number
  /** Se llama justo antes del LLM (rate limit). false = no hay cupo. */
  beforeLlm?: () => Promise<boolean>
  /** Deja que el modelo proponga una categoría nueva (solo gastos fijos compartidos). */
  allowNewCategory?: boolean
  /** Íconos válidos para una categoría nueva. */
  iconKeys?: readonly string[]
  now?: () => number
}

export type CategorizeLog = {
  model: string | null
  latencyMs: number
  usage?: CompletionUsage
  input: unknown
  output: unknown
  error: string | null
}

export type CategorizeResult = {
  categoryId: string
  source: "rule" | "ai" | null
  status: "done" | "failed"
  confidence: number | null
  reason: string | null
  needsReview: boolean
  normalized: string
  ruleId?: string
  /** Categoría nueva propuesta por la IA (sin sanear; la crea run.ts). */
  newCategory?: NewCategoryProposal
  /** Presente si se intentó llamar al LLM (o se descartó por rate limit). */
  log?: CategorizeLog
}

class TimeoutError extends Error {}

/**
 * Categoriza un gasto. Es pura respecto de la base y el entorno: recibe el
 * contexto y el proveedor, así se testea sin red.
 *   1. Regla aprendida → se asigna sin llamar al LLM.
 *   2. LLM (timeout 5 s) → se valida; confianza < 0.6 → "a revisar".
 *   3. Cualquier falla → "Sin categorizar" + a revisar.
 */
export async function categorizeExpense(
  input: ExpenseInput,
  ctx: CategorizeContext,
  deps: CategorizeDeps,
): Promise<CategorizeResult> {
  const now = deps.now ?? Date.now
  const timeoutMs = deps.timeoutMs ?? 5000
  const threshold = deps.reviewThreshold ?? 0.6
  const normalized = normalizeDescription(input.description)
  const validIds = new Set(ctx.categories.map((c) => c.id))

  const fallback = (error: string, log?: Partial<CategorizeLog>): CategorizeResult => ({
    categoryId: ctx.fallbackCategoryId,
    source: null,
    status: "failed",
    confidence: null,
    reason: null,
    needsReview: true,
    normalized,
    log: log ? { model: null, latencyMs: 0, input: null, output: null, ...log, error } : undefined,
  })

  // 1. Reglas
  const rule = matchRule(
    normalized,
    ctx.rules.filter((r) => validIds.has(r.category_id)),
  )
  if (rule) {
    return {
      categoryId: rule.category_id,
      source: "rule",
      status: "done",
      confidence: 1,
      reason: `Regla aprendida: “${rule.pattern}”`,
      needsReview: false,
      normalized,
      ruleId: rule.id,
    }
  }

  if (!deps.provider || ctx.categories.length === 0) return fallback("no_provider")

  // 2. Rate limit
  if (deps.beforeLlm && !(await deps.beforeLlm())) {
    return fallback("rate_limited", { model: deps.provider.model })
  }

  // 3. LLM con timeout
  const { messages, toId } = buildMessages(input, ctx.categories, ctx.examples, {
    allowNewCategory: deps.allowNewCategory,
    iconKeys: deps.iconKeys,
  })
  const controller = new AbortController()
  const started = now()
  let timer: ReturnType<typeof setTimeout> | undefined
  try {
    const timeout = new Promise<never>((_, reject) => {
      timer = setTimeout(() => {
        controller.abort()
        reject(new TimeoutError("timeout"))
      }, timeoutMs)
    })
    const completion = await Promise.race([
      deps.provider.complete(messages, {
        signal: controller.signal,
        // La propuesta de categoría nueva necesita más espacio.
        maxTokens: deps.maxTokens ?? (deps.allowNewCategory ? 320 : 200),
      }),
      timeout,
    ])
    const latencyMs = now() - started
    const parsed = parseLlmResponse(completion.content, toId.keys())
    const log = {
      model: completion.model,
      latencyMs,
      usage: completion.usage,
      input: { description: input.description, normalized, messages },
      output: completion.content,
    }
    if (!parsed.ok) return fallback(parsed.detail ? `${parsed.error}: ${parsed.detail}` : parsed.error, log)

    const categoryId = toId.get(parsed.value.category_id)!
    const confidence = Math.round(parsed.value.confidence * 100) / 100
    return {
      categoryId,
      source: "ai",
      status: "done",
      confidence,
      reason: parsed.value.reason || null,
      needsReview: confidence < threshold,
      normalized,
      newCategory: deps.allowNewCategory && parsed.value.new_category ? parsed.value.new_category : undefined,
      log: { ...log, error: null },
    }
  } catch (err) {
    const latencyMs = now() - started
    const error = err instanceof TimeoutError ? "timeout" : `provider_error: ${err instanceof Error ? err.message : String(err)}`
    return fallback(error, { model: deps.provider.model, latencyMs, input: { description: input.description, normalized } })
  } finally {
    clearTimeout(timer)
  }
}
