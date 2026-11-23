export type ChatMessage = { role: "system" | "user" | "assistant"; content: string }

export type CompletionUsage = {
  prompt_tokens?: number
  completion_tokens?: number
  total_tokens?: number
}

export type CompletionResult = { content: string; model: string; usage?: CompletionUsage }

/** Interfaz agnóstica del proveedor: cambiar de modelo = otra implementación. */
export interface CategorizationProvider {
  readonly model: string
  complete(messages: ChatMessage[], opts: { signal: AbortSignal; maxTokens: number }): Promise<CompletionResult>
}
