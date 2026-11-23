import { redirect } from "next/navigation"
import { Panel } from "@/components/pixel/panel"
import { PageHeader } from "@/components/shell/page-header"
import { Badge } from "@/components/ui/badge"
import { aiConfig } from "@/lib/ai/config"
import { getHouseholdContext } from "@/lib/session"
import { createClient } from "@/lib/supabase/server"

export const metadata = { title: "IA" }

const ENTITY_LABEL: Record<string, string> = {
  card_expense: "Tarjeta",
  fixed_expense: "Fijo",
  pending_purchase: "Pendiente",
}

export default async function IaPage() {
  const ctx = await getHouseholdContext()
  if (!ctx.isAdmin) redirect("/mas")
  const supabase = await createClient()
  const since = new Date(Date.now() - 86_400_000).toISOString()
  const [{ data: logs }, { data: today }, { data: categories }] = await Promise.all([
    supabase
      .from("ai_logs")
      .select("id, created_at, entity_type, source, input, output, model, latency_ms, total_tokens, error")
      .eq("household_id", ctx.household.id)
      .order("created_at", { ascending: false })
      .limit(50),
    supabase.from("ai_logs").select("total_tokens, error").eq("household_id", ctx.household.id).gte("created_at", since),
    supabase.from("categories").select("id, name").eq("household_id", ctx.household.id),
  ])
  const names = new Map((categories ?? []).map((c) => [c.id, c.name]))
  const cfg = aiConfig()
  const calls = today?.length ?? 0
  const tokens = (today ?? []).reduce((s, l) => s + (l.total_tokens ?? 0), 0)
  const errors = (today ?? []).filter((l) => l.error).length

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="IA" back="/mas" />
      <Panel title="Últimas 24 horas">
        <dl className="grid grid-cols-3 gap-3">
          <div>
            <dt className="text-sm text-muted-foreground">Llamadas</dt>
            <dd className="font-display text-3xl leading-none">{calls}</dd>
          </div>
          <div>
            <dt className="text-sm text-muted-foreground">Tokens</dt>
            <dd className="font-display text-3xl leading-none">{tokens.toLocaleString("es-AR")}</dd>
          </div>
          <div>
            <dt className="text-sm text-muted-foreground">Con error</dt>
            <dd className="font-display text-3xl leading-none">{errors}</dd>
          </div>
        </dl>
        <p className="mt-3 text-sm text-muted-foreground">
          Modelo {cfg.model} · límite {cfg.perMinute}/min y {cfg.perDay}/día por hogar
          {cfg.apiKey ? "" : " · falta DEEPSEEK_API_KEY: todo cae en “Sin categorizar”"}
        </p>
      </Panel>
      <Panel title="Registro">
        {(logs ?? []).length === 0 ? (
          <p className="text-muted-foreground">Todavía no hubo llamadas a la IA. Las reglas aprendidas no se registran porque no gastan cupo.</p>
        ) : (
          <ul className="-my-2 flex flex-col divide-y-[3px] divide-tinta/10 dark:divide-white/10">
            {(logs ?? []).map((l) => {
              const input = l.input as { description?: string } | null
              const output = l.output as { categoryId?: string; confidence?: number | null } | null
              return (
                <li key={l.id} className="flex flex-col gap-1 py-2 text-sm">
                  <span className="flex items-center gap-2">
                    <Badge variant="outline">{ENTITY_LABEL[l.entity_type] ?? l.entity_type}</Badge>
                    <span className="truncate font-semibold">{input?.description ?? "—"}</span>
                  </span>
                  <span className="text-muted-foreground">
                    {new Date(l.created_at).toLocaleString("es-AR", { timeZone: ctx.household.timezone, dateStyle: "short", timeStyle: "short" })}
                    {" · "}
                    {l.error ? (
                      <span className="text-ladrillo">{l.error}</span>
                    ) : (
                      <>
                        {names.get(output?.categoryId ?? "") ?? "?"}
                        {output?.confidence != null && ` (${Math.round(output.confidence * 100)}%)`}
                      </>
                    )}
                    {l.latency_ms != null && ` · ${l.latency_ms} ms`}
                    {l.total_tokens != null && ` · ${l.total_tokens} tokens`}
                  </span>
                </li>
              )
            })}
          </ul>
        )}
      </Panel>
    </div>
  )
}
