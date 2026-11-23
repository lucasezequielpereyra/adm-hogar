import Link from "next/link"
import { ChevronLeft, ChevronRight, CreditCard, Sparkles } from "pixelarticons/react"
import { EmptyState } from "@/components/pixel/empty-state"
import { Money } from "@/components/pixel/money"
import { Panel } from "@/components/pixel/panel"
import { ToggleChip } from "@/components/shell/filter-chips"
import { Button } from "@/components/ui/button"
import { RecategorizeButton } from "@/features/categories/components/recategorize-button"
import { CardsView } from "@/features/cards/components/cards-view"
import { CategoryChartLazy as CategoryChart } from "@/features/cards/components/category-chart-lazy"
import type { ExpensePrefill } from "@/features/cards/components/card-expense-form"
import { byCategory, getCardDashboard, sumByCurrency } from "@/features/cards/queries"
import { getCategories } from "@/features/categories/queries"
import { todayISO } from "@/lib/domain/dates"
import { formatAmountInput } from "@/lib/domain/money"
import { getHouseholdContext } from "@/lib/session"
import { createClient } from "@/lib/supabase/server"

export const metadata = { title: "Tarjetas" }

const OFFSET_LABEL: Record<number, string> = { [-1]: "Período anterior", 0: "Período actual", 1: "Próximo período" }

export default async function TarjetasPage({
  searchParams,
}: {
  searchParams: Promise<{ p?: string; revisar?: string; desde?: string; nuevo?: string }>
}) {
  const sp = await searchParams
  const offset = Math.max(-24, Math.min(12, Number.parseInt(sp.p ?? "0", 10) || 0))
  const ctx = await getHouseholdContext()
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
  const categoriesById = new Map(categories.map((c) => [c.id, c]))
  const chartData = byCategory(dash.currentRows, dash.prevRows, "ARS").map((r) => {
    const c = categoriesById.get(r.categoryId)
    return { ...r, name: c?.name ?? "Sin categoría", color: c?.color ?? "gris" }
  })
  const usdByCategory = byCategory(dash.currentRows, dash.prevRows, "USD")

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
      }
    })

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between gap-2">
        <Link href={`/gastos/tarjetas?p=${offset - 1}`} aria-label="Período anterior" className="flex size-11 items-center justify-center">
          <ChevronLeft className="size-8" aria-hidden />
        </Link>
        <h1 className="text-center font-display text-[34px] leading-none">{OFFSET_LABEL[offset] ?? `Período ${offset > 0 ? "+" : ""}${offset}`}</h1>
        <Link href={`/gastos/tarjetas?p=${offset + 1}`} aria-label="Período siguiente" className="flex size-11 items-center justify-center">
          <ChevronRight className="size-8" aria-hidden />
        </Link>
      </div>

      <Panel>
        <p className="text-sm text-muted-foreground">Total del período (todas las tarjetas)</p>
        <div className="mt-1 flex flex-wrap items-baseline gap-x-5 gap-y-1">
          <Money amount={ars} display decimals={false} className="text-5xl" />
          {dash.totals.USD ? <Money amount={dash.totals.USD} currency="USD" display className="text-3xl" /> : null}
        </div>
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

      {chartData.length > 0 && (
        <Panel title="Por categoría">
          <CategoryChart data={chartData} currency="ARS" />
          {usdByCategory.length > 0 && (
            <div className="mt-4 border-t-[3px] border-tinta/10 pt-3 dark:border-white/10">
              <p className="mb-2 text-sm font-semibold">En dólares</p>
              <ul className="flex flex-col gap-1 text-sm">
                {usdByCategory.map((r) => (
                  <li key={r.categoryId} className="flex justify-between gap-3">
                    <span>{categoriesById.get(r.categoryId)?.name ?? "Sin categoría"}</span>
                    <Money amount={r.current} currency="USD" />
                  </li>
                ))}
              </ul>
            </div>
          )}
        </Panel>
      )}

      <div className="flex flex-wrap items-center gap-3">
        <RecategorizeButton
          entityType="card_expense"
          ids={[...new Set(dash.currentRows.filter((r) => r.expense.category_source !== "user").map((r) => r.expense.id))]}
          label="Recategorizar el período"
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
