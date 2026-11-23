import { Money } from "@/components/pixel/money"
import { Panel } from "@/components/pixel/panel"
import { CategoryChartLazy as CategoryChart } from "@/features/cards/components/category-chart-lazy"
import type { CategoryOption } from "@/features/categories/types"
import type { CategoryAmount } from "../summary"

/** Gastos fijos del mes por categoría (barra fantasma = mes anterior). Dólares aparte. */
export function FixedCategorySummary({
  ars,
  usd,
  categories,
}: {
  ars: CategoryAmount[]
  usd: CategoryAmount[]
  categories: CategoryOption[]
}) {
  if (ars.length === 0 && usd.length === 0) return null
  const byId = new Map(categories.map((c) => [c.id, c]))
  const chartData = ars.map((r) => {
    const c = byId.get(r.categoryId)
    return { ...r, name: c?.name ?? "Sin categoría", color: c?.color ?? "gris" }
  })
  const usdRows = usd.filter((r) => r.current > 0)

  return (
    <Panel title="Por categoría">
      {chartData.length > 0 && <CategoryChart data={chartData} currency="ARS" labels={{ current: "Este mes", prev: "Mes anterior" }} />}
      {usdRows.length > 0 && (
        <div className={chartData.length > 0 ? "mt-4 border-t-[3px] border-tinta/10 pt-3 dark:border-white/10" : undefined}>
          <p className="mb-2 text-sm font-semibold">En dólares</p>
          <ul className="flex flex-col gap-1 text-sm">
            {usdRows.map((r) => (
              <li key={r.categoryId} className="flex justify-between gap-3">
                <span>{byId.get(r.categoryId)?.name ?? "Sin categoría"}</span>
                <Money amount={r.current} currency="USD" />
              </li>
            ))}
          </ul>
        </div>
      )}
    </Panel>
  )
}
