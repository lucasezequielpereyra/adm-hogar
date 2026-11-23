import { Sparkles } from "pixelarticons/react"
import { ToggleChip } from "@/components/shell/filter-chips"
import { MonthNav, monthFromParam } from "@/components/shell/month-nav"
import { RecategorizeButton } from "@/features/categories/components/recategorize-button"
import { getCategories } from "@/features/categories/queries"
import { FixedMonthView } from "@/features/fixed/components/fixed-month-view"
import { fixedTotals, getFixedForMonth } from "@/features/fixed/queries"
import { memberOptions } from "@/features/tasks/page-data"
import { monthOf, todayISO } from "@/lib/domain/dates"
import { getHouseholdContext } from "@/lib/session"

export const metadata = { title: "Gastos fijos" }

export default async function FijosPage({ searchParams }: { searchParams: Promise<{ mes?: string; revisar?: string }> }) {
  const sp = await searchParams
  const ctx = await getHouseholdContext()
  const today = todayISO(ctx.household.timezone)
  const current = monthOf(today)
  const month = monthFromParam(sp.mes, current)
  const [items, categories] = await Promise.all([
    getFixedForMonth(ctx.household.id, month, { review: sp.revisar === "1" }),
    getCategories(ctx.household.id),
  ])

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
      />
    </div>
  )
}
