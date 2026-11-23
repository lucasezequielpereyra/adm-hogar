"use client"

import { cn } from "cn"
import { useState, type ReactNode } from "react"
import { Money } from "@/components/pixel/money"
import { Panel } from "@/components/pixel/panel"
import type { CategoryOption } from "@/features/categories/types"
import { paletteVar } from "@/lib/palette"
import { breakdownByCategory, breakdownTotal, filterRows, type BreakdownFilter, type BreakdownKind, type BreakdownRow } from "../breakdown"
import { CategoryChartLazy as CategoryChart } from "./category-chart-lazy"

const KINDS: { value: BreakdownKind; label: string }[] = [
  { value: "all", label: "Todos" },
  { value: "shared", label: "Grupales" },
  { value: "personal", label: "Individuales" },
]

function Chips<T extends string | null>({
  label,
  value,
  options,
  onChange,
}: {
  label: string
  value: T
  options: { value: T; label: ReactNode }[]
  onChange: (v: T) => void
}) {
  return (
    <div className="-mx-4 flex gap-3 overflow-x-auto px-[19px] py-[3px]" role="group" aria-label={label}>
      {options.map((o) => {
        const active = o.value === value
        return (
          <button
            key={o.value ?? "todas"}
            type="button"
            aria-pressed={active}
            onClick={() => onChange(o.value)}
            className={cn(
              "inline-flex h-10 shrink-0 items-center gap-1.5 px-3 text-sm font-semibold pixel-frame",
              active ? "bg-moneda text-tinta" : "bg-panel",
            )}
          >
            {o.label}
          </button>
        )
      })}
    </div>
  )
}

/**
 * Gasto por categoría del mes con filtros por tarjeta y por tipo
 * (grupales / individuales). Filtra en el cliente: no recarga la página.
 */
export function CategoryBreakdown({
  rows,
  cards,
  categories,
}: {
  rows: BreakdownRow[]
  cards: { id: string; name: string; color: string }[]
  categories: CategoryOption[]
}) {
  const [filter, setFilter] = useState<BreakdownFilter>({ cardId: null, kind: "all" })
  const byId = new Map(categories.map((c) => [c.id, c]))

  const chartData = breakdownByCategory(rows, filter, "ARS").map((r) => {
    const c = byId.get(r.categoryId)
    return { ...r, name: c?.name ?? "Sin categoría", color: c?.color ?? "gris" }
  })
  const usd = breakdownByCategory(rows, filter, "USD").filter((r) => r.current > 0)
  const total = breakdownTotal(rows, filter)
  const empty = !filterRows(rows, filter).some((r) => r.when === "current")
  // Solo las tarjetas que tienen algo este mes o el anterior.
  const withRows = cards.filter((c) => rows.some((r) => r.cardId === c.id))

  return (
    <Panel title="Por categoría">
      <div className="flex flex-col gap-3">
        {withRows.length > 1 && (
          <Chips
            label="Tarjeta"
            value={filter.cardId}
            onChange={(cardId) => setFilter((f) => ({ ...f, cardId }))}
            options={[
              { value: null, label: "Todas" },
              ...withRows.map((c) => ({
                value: c.id,
                label: (
                  <>
                    <span className="inline-block size-3" style={{ background: paletteVar(c.color) }} aria-hidden />
                    {c.name}
                  </>
                ),
              })),
            ]}
          />
        )}
        <Chips label="Tipo de gasto" value={filter.kind} onChange={(kind) => setFilter((f) => ({ ...f, kind }))} options={KINDS} />
        <p className="text-sm" aria-live="polite">
          <span className="text-muted-foreground">Total con este filtro: </span>
          <Money amount={total.ARS ?? 0} decimals={false} className="font-semibold" />
          {total.USD ? (
            <>
              {" + "}
              <Money amount={total.USD} currency="USD" className="font-semibold" />
            </>
          ) : null}
        </p>
      </div>

      <div className="mt-4">
        {empty ? (
          <p className="text-muted-foreground">
            {filter.kind === "personal" ? "No tenés gastos personales con este filtro." : "No hay gastos con este filtro."}
          </p>
        ) : (
          chartData.length > 0 && <CategoryChart data={chartData} currency="ARS" labels={{ current: "Este mes", prev: "Mes anterior" }} />
        )}
      </div>

      {!empty && usd.length > 0 && (
        <div className="mt-4 border-t-[3px] border-tinta/10 pt-3 dark:border-white/10">
          <p className="mb-2 text-sm font-semibold">En dólares</p>
          <ul className="flex flex-col gap-1 text-sm">
            {usd.map((r) => (
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
