import { Sparkles } from "pixelarticons/react"
import { ToggleChip } from "@/components/shell/filter-chips"
import { MonthNav, monthFromParam } from "@/components/shell/month-nav"
import { RecategorizeButton } from "@/features/categories/components/recategorize-button"
import { getCategories } from "@/features/categories/queries"
import { FixedCategorySummary } from "@/features/fixed/components/fixed-category-summary"
import { FixedMonthView } from "@/features/fixed/components/fixed-month-view"
import { fixedByCategory } from "@/features/fixed/summary"
import { fixedTotals, getFixedForMonth } from "@/features/fixed/queries"
import { memberOptions } from "@/features/tasks/page-data"
import { addMonthsISO, monthOf, todayISO } from "@/lib/domain/dates"
import { after } from "next/server"
import { sweepStaleCategorizations } from "@/lib/ai/run"
import { getHouseholdContext } from "@/lib/session"

export const metadata = { title: "Gastos fijos" }

export default async function FijosPage({ searchParams }: { searchParams: Promise<{ mes?: string; revisar?: string }> }) {
  const sp = await searchParams
  const ctx = await getHouseholdContext()
  // Reencola categorizaciones trabadas (si un after() anterior se cortó).
  after(() => sweepStaleCategorizations(ctx.household.id).catch((e) => console.error("[ai] sweep", e)))
  const today = todayISO(ctx.household.timezone)
  const current = monthOf(today)
  const month = monthFromParam(sp.mes, current)
  const review = sp.revisar === "1"
  const [items, categories, prevItems] = await Promise.all([
    getFixedForMonth(ctx.household.id, month, { review }),
    getCategories(ctx.household.id),
    // El resumen compara con el mes anterior (no se muestra con el filtro "a revisar").
    review ? Promise.resolve([]) : getFixedForMonth(ctx.household.id, addMonthsISO(month, -1)),
  ])
  const summary = review ? null : (
    <FixedCategorySummary
      ars={fixedByCategory(items, prevItems, "ARS", month)}
      usd={fixedByCategory(items, prevItems, "USD", month)}
      categories={categories}
    />
  )

  return (
    <div className="flex flex-col gap-5">
      <MonthNav basePath="/gastos/fijos" month={month} current={current} />
      <div className="flex flex-wrap items-center gap-3">
        <RecategorizeButton
          entityType="fixed_expense"
          ids={items.filter((f) => f.needs_review).map((f) => f.id)}
          label="Recategorizar los a revisar"
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
      <FixedMonthView
        items={items}
        totals={fixedTotals(items)}
        period={month}
        today={today}
        isCurrentMonth={month === current}
        members={memberOptions(ctx)}
        categories={categories}
        currentUserId={ctx.user.id}
        defaultCurrency={ctx.household.default_currency as "ARS" | "USD"}
        summary={summary}
      />
    </div>
  )
}
