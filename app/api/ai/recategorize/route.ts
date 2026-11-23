import { NextResponse, type NextRequest } from "next/server"
import { z } from "zod"
import { ENTITY_TABLE, type EntityType } from "@/lib/ai/entities"
import { runCategorization } from "@/lib/ai/run"
import { getHouseholdContext } from "@/lib/session"
import { createClient } from "@/lib/supabase/server"

export const maxDuration = 60

const bodySchema = z.object({
  entityType: z.enum(["card_expense", "fixed_expense", "pending_purchase"]),
  ids: z.array(z.uuid()).min(1).max(10),
})

/**
 * Recategoriza un lote (máx. 10) de gastos. El cliente llama en lotes para
 * "todo el período". Reglas primero; el LLM consume cupo del hogar y, si se
 * acaba, responde 429 con lo que quedó sin procesar.
 */
export async function POST(request: NextRequest) {
  const parsed = bodySchema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ error: "Pedido inválido." }, { status: 400 })
  const { entityType, ids } = parsed.data

  const ctx = await getHouseholdContext()
  const supabase = await createClient()
  const table = ENTITY_TABLE[entityType as EntityType]

  // La RLS del usuario decide qué gastos puede tocar (incluye privacidad).
  const { data: allowed, error } = await supabase
    .from(table as "card_expenses")
    .update({ categorization_status: "categorizing" })
    .eq("household_id", ctx.household.id)
    .in("id", ids)
    .select("id")
  if (error) return NextResponse.json({ error: "No se pudo recategorizar." }, { status: 500 })

  const results: { id: string; status: string; source: string | null }[] = []
  let rateLimited = false
  const queue = [...(allowed ?? [])]

  // Concurrencia 3.
  await Promise.all(
    Array.from({ length: 3 }, async () => {
      while (queue.length) {
        const item = queue.shift()!
        const r = await runCategorization(entityType, item.id, { force: true, triggeredBy: ctx.user.id })
        if (r?.log?.error === "rate_limited") rateLimited = true
        results.push({ id: item.id, status: r?.status ?? "skipped", source: r?.source ?? null })
      }
    }),
  )

  const body = {
    processed: results.length,
    categorized: results.filter((r) => r.status === "done").length,
    failed: results.filter((r) => r.status === "failed").length,
    rateLimited,
  }
  return NextResponse.json(body, { status: rateLimited ? 429 : 200 })
}
