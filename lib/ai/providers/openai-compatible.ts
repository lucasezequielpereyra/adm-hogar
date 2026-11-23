import "server-only"
import OpenAI from "openai"
import type { ChatCompletionCreateParamsNonStreaming } from "openai/resources/chat/completions"
import type { CategorizationProvider } from "./types"

/**
 * Proveedor para APIs compatibles con OpenAI (DeepSeek por defecto).
 * - Sin reintentos y con timeout corto: la categorización no puede demorar.
 * - JSON mode y temperatura 0.
 * - DeepSeek activa el modo "thinking" si no se lo apaga: lo apagamos.
 */
export function createOpenAICompatibleProvider(opts: {
  apiKey: string
  baseURL: string
  model: string
  timeoutMs: number
  disableThinking?: boolean
}): CategorizationProvider {
  const client = new OpenAI({ apiKey: opts.apiKey, baseURL: opts.baseURL, timeout: opts.timeoutMs, maxRetries: 0 })
  return {
    model: opts.model,
    async complete(messages, { signal, maxTokens }) {
      const body = {
        model: opts.model,
        messages,
        response_format: { type: "json_object" },
        temperature: 0,
        max_tokens: maxTokens,
        stream: false,
        // Campo propio de DeepSeek (no está en los tipos de OpenAI).
        ...(opts.disableThinking !== false ? { thinking: { type: "disabled" } } : {}),
      } as ChatCompletionCreateParamsNonStreaming
      const res = await client.chat.completions.create(body, { signal })
      return {
        content: res.choices[0]?.message?.content ?? "",
        model: res.model ?? opts.model,
        usage: res.usage ?? undefined,
      }
    },
  }
}
