import Link from "next/link"
import { ChevronLeft, ChevronRight, CreditCard, Sparkles } from "pixelarticons/react"
import { EmptyState } from "@/components/pixel/empty-state"
import { Money } from "@/components/pixel/money"
import { Panel } from "@/components/pixel/panel"
import { ToggleChip } from "@/components/shell/filter-chips"
import { LinkTabs } from "@/components/shell/link-tabs"
import { Button } from "@/components/ui/button"
import { RecategorizeButton } from "@/features/categories/components/recategorize-button"
import { CardsView } from "@/features/cards/components/cards-view"
import type { BreakdownRow } from "@/features/cards/breakdown"
import { CategoryBreakdown } from "@/features/cards/components/category-breakdown"
import type { ExpensePrefill } from "@/features/cards/components/card-expense-form"
import { getCardDashboard, splitTotals, sumByCurrency } from "@/features/cards/queries"
import { getCategories } from "@/features/categories/queries"
import { todayISO } from "@/lib/domain/dates"
import { formatAmountInput } from "@/lib/domain/money"
import { after } from "next/server"
import { sweepStaleCategorizations } from "@/lib/ai/run"
import { getHouseholdContext } from "@/lib/session"
import { createClient } from "@/lib/supabase/server"

export const metadata = { title: "Tarjetas" }

const OFFSET_LABEL: Record<number, string> = { [-1]: "Mes anterior", 0: "Mes en curso", 1: "Próximo mes" }

export default async function TarjetasPage({
  searchParams,
}: {
  searchParams: Promise<{ p?: string; revisar?: string; desde?: string; nuevo?: string }>
}) {
  const sp = await searchParams
  const offset = Math.max(-24, Math.min(12, Number.parseInt(sp.p ?? "0", 10) || 0))
  const ctx = await getHouseholdContext()
  // Reencola categorizaciones trabadas (si un after() anterior se cortó).
  after(() => sweepStaleCategorizations(ctx.household.id).catch((e) => console.error("[ai] sweep", e)))
  const today = todayISO(ctx.household.timezone)
  const [dash, categories] = await Promise.all([getCardDashboard(ctx.household.id, today, offset), getCategories(ctx.household.id)])

  if (dash.cards.length === 0) {
    return (
      <EmptyState
        title="Todavía no hay tarjetas"
        description="Cargá tus tarjetas con su día de cierre para empezar a registrar gastos."
        action={
          <Button asChild>
            <Link href="/mas/tarjetas">Cargar una tarjeta</Link>
          </Button>
        }
      />
    )
  }

  // Precarga desde una compra pendiente (?nuevo=1&desde=<id>)
  let prefill: ExpensePrefill | null = null
  if (sp.desde) {
    const supabase = await createClient()
    const { data } = await supabase
      .from("pending_purchases")
      .select("id, name, estimated_price, currency, is_private, category_id, category_source")
      .eq("id", sp.desde)
      .eq("household_id", ctx.household.id)
      .maybeSingle()
    if (data) {
      prefill = {
        fromPendingId: data.id,
        pendingName: data.name,
        description: data.name,
        amount: formatAmountInput(data.estimated_price),
        currency: data.currency as "ARS" | "USD",
        is_private: data.is_private,
        category_id: data.category_source === "user" ? data.category_id : null,
      }
    }
  }

  const review = sp.revisar === "1"
  const visible = (rows: typeof dash.currentRows) => (review ? rows.filter((r) => r.expense.needs_review) : rows)
  // Para el gráfico por categoría (se filtra por tarjeta y tipo en el cliente).
  const toBreakdown = (when: "current" | "prev") => (r: (typeof dash.currentRows)[number]): BreakdownRow => ({
    categoryId: r.expense.category_id,
    cardId: r.card_id,
    isPrivate: r.expense.is_private,
    currency: r.currency,
    amount: Number(r.amount),
    when,
  })
  const breakdownRows = [...dash.currentRows.map(toBreakdown("current")), ...dash.prevRows.map(toBreakdown("prev"))]

  const ars = dash.totals.ARS ?? 0
  const prevArs = dash.prevTotals.ARS ?? 0
  const delta = prevArs > 0 ? Math.round(((ars - prevArs) / prevArs) * 100) : null

  const groups = dash.current
    .filter((info) => info.card.is_active || dash.currentRows.some((r) => r.card_id === info.card.id))
    .map((info) => {
      const rows = dash.currentRows.filter((r) => r.card_id === info.card.id)
      return {
        info,
        rows: visible(rows).sort((a, b) => b.expense.purchase_date.localeCompare(a.expense.purchase_date)),
        totals: sumByCurrency(rows),
        split: splitTotals(rows),
      }
    })
  const split = splitTotals(dash.currentRows)
  const hasPersonal = dash.currentRows.some((r) => r.expense.is_private)

  // Pestañas solo mientras haya un resumen cerrado sin marcar como pagado.
  const showTabs = dash.unpaidClosed.length > 0 && (offset === 0 || offset === -1)
  const unpaidNames = dash.unpaidClosed.map((p) => p.card.name).join(", ")

  return (
    <div className="flex flex-col gap-6">
      {showTabs ? (
        <div className="flex flex-col gap-3">
          <h1 className="sr-only">{OFFSET_LABEL[offset]}</h1>
          <LinkTabs
            label="Resúmenes"
            active={String(offset)}
            tabs={[
              {
                key: "-1",
                href: "/gastos/tarjetas?p=-1",
                label: (
                  <>
                    Mes anterior
                    <span className="inline-block size-2.5 bg-ladrillo" aria-hidden />
                    <span className="sr-only">(sin pagar)</span>
                  </>
                ),
              },
              { key: "0", href: "/gastos/tarjetas", label: "Mes en curso" },
            ]}
          />
          <p className="text-sm text-muted-foreground">
            {offset === 0
              ? `Falta marcar como pagado el resumen anterior de ${unpaidNames}. Los gastos nuevos ya van a este mes.`
              : "Abrí cada tarjeta para marcar su resumen como pagado."}{" "}
            <Link href="/gastos/tarjetas?p=-2" className="underline underline-offset-2">
              Meses anteriores
            </Link>
          </p>
        </div>
      ) : (
        <div className="flex items-center justify-between gap-2">
          <Link href={`/gastos/tarjetas?p=${offset - 1}`} aria-label="Mes anterior" className="flex size-11 items-center justify-center">
            <ChevronLeft className="size-8" aria-hidden />
          </Link>
          <h1 className="text-center font-display text-[34px] leading-none">
            {OFFSET_LABEL[offset] ?? `${offset > 0 ? "Dentro de" : "Hace"} ${Math.abs(offset)} meses`}
          </h1>
          <Link href={`/gastos/tarjetas?p=${offset + 1}`} aria-label="Mes siguiente" className="flex size-11 items-center justify-center">
            <ChevronRight className="size-8" aria-hidden />
          </Link>
        </div>
      )}

      <Panel>
        <p className="text-sm text-muted-foreground">Total del mes (todas las tarjetas)</p>
        <div className="mt-1 flex flex-wrap items-baseline gap-x-5 gap-y-1">
          <Money amount={ars} display decimals={false} className="text-5xl" />
          {dash.totals.USD ? <Money amount={dash.totals.USD} currency="USD" display className="text-3xl" /> : null}
        </div>
        <dl className="mt-4 grid grid-cols-2 gap-4 border-t-[3px] border-tinta/10 pt-3 text-sm dark:border-white/10">
          <div>
            <dt className="text-muted-foreground">Grupales</dt>
            <dd>
              <Money amount={split.shared.ARS ?? 0} display decimals={false} className="text-2xl" />
              {split.shared.USD ? <Money amount={split.shared.USD} currency="USD" display className="ml-2 text-lg" /> : null}
            </dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Individuales (tuyos)</dt>
            <dd>
              {hasPersonal ? (
                <>
                  <Money amount={split.personal.ARS ?? 0} display decimals={false} className="text-2xl" />
                  {split.personal.USD ? <Money amount={split.personal.USD} currency="USD" display className="ml-2 text-lg" /> : null}
                </>
              ) : (
                <span className="text-muted-foreground">Ninguno</span>
              )}
            </dd>
          </div>
        </dl>
        <dl className="mt-4 grid grid-cols-2 gap-4 text-sm">
          <div>
            <dt className="text-muted-foreground">Contra el anterior</dt>
            <dd className="font-semibold">
              {delta === null ? "Sin datos" : `${delta > 0 ? "+" : ""}${delta}%`}{" "}
              <span className="font-normal text-muted-foreground">
                (<Money amount={prevArs} decimals={false} />)
              </span>
            </dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Cuotas del próximo resumen</dt>
            <dd className="font-semibold">
              <Money amount={dash.nextInstallments.ARS ?? 0} decimals={false} />
              {dash.nextInstallments.USD ? (
                <>
                  {" "}+ <Money amount={dash.nextInstallments.USD} currency="USD" />
                </>
              ) : null}
            </dd>
          </div>
        </dl>
      </Panel>

      {dash.currentRows.length > 0 && (
        <CategoryBreakdown
          rows={breakdownRows}
          cards={dash.cards.map((c) => ({ id: c.id, name: c.name, color: c.color }))}
          categories={categories}
        />
      )}

      <div className="flex flex-wrap items-center gap-3">
        <RecategorizeButton
          entityType="card_expense"
          ids={[...new Set(dash.currentRows.filter((r) => r.expense.category_source !== "user").map((r) => r.expense.id))]}
          label="Recategorizar el mes"
        />
        <ToggleChip
          param="revisar"
          label={
            <>
              <Sparkles className="size-4" aria-hidden /> A revisar
            </>
          }
        />
      </div>

      <CardsView
        groups={groups}
        cards={dash.cards}
        statements={dash.statements}
        expandAll={review}
        categories={categories}
        today={today}
        defaultCurrency={ctx.household.default_currency as "ARS" | "USD"}
        prefill={prefill}
      />

      <Button asChild variant="outline" className="w-full">
        <Link href="/mas/tarjetas">
          <CreditCard aria-hidden /> Administrar tarjetas
        </Link>
      </Button>
    </div>
  )
}
