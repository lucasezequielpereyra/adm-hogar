"use client"

import { Bar, BarChart, Cell, LabelList, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts"
import { formatMoney, type Currency } from "@/lib/domain/format"
import { paletteHex } from "@/lib/palette"

export type CategoryDatum = {
  categoryId: string
  name: string
  color: string
  current: number
  prev: number
}

const ROW = 64

/**
 * Gasto por categoría: barra llena = este período, barra fantasma (solo
 * contorno) = período anterior. El nombre va arriba de cada barra (la
 * identidad nunca depende solo del color) y hay vista en tabla.
 */
export function CategoryChart({ data: all, currency }: { data: CategoryDatum[]; currency: Currency }) {
  // El gráfico muestra lo gastado este período; lo que solo estuvo en el
  // anterior queda en la tabla.
  const data = all.filter((d) => d.current > 0)
  if (all.length === 0) return null
  const money = (v: number) => formatMoney(v, currency, { decimals: false })

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap gap-4 text-sm" aria-hidden>
        <span className="inline-flex items-center gap-2">
          <span className="m-[3px] inline-block h-3 w-5 pixel-frame" style={{ background: "var(--pal-azul)" }} /> Este período
        </span>
        <span className="inline-flex items-center gap-2">
          <span className="inline-block h-3 w-5 border-2 border-dashed border-muted-foreground" /> Período anterior
        </span>
      </div>
      <div style={{ height: data.length * ROW + 8 }} className="w-full [&_.recharts-rectangle]:[shape-rendering:crispEdges]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={data}
            layout="vertical"
            margin={{ top: 22, right: 84, bottom: 0, left: 3 }}
            barCategoryGap={22}
            barGap={4}
            accessibilityLayer
          >
            <XAxis type="number" hide domain={[0, (max: number) => max * 1.02]} />
            <YAxis type="category" dataKey="name" hide />
            <Tooltip
              cursor={{ fill: "var(--accent)", opacity: 0.6 }}
              content={({ active, payload }) => {
                if (!active || !payload?.length) return null
                const d = payload[0].payload as CategoryDatum
                const delta = d.prev > 0 ? Math.round(((d.current - d.prev) / d.prev) * 100) : null
                return (
                  <div className="bg-panel p-3 text-sm text-foreground pixel-box">
                    <p className="font-semibold">{d.name}</p>
                    <p>Este período: {money(d.current)}</p>
                    <p className="text-muted-foreground">Anterior: {money(d.prev)}</p>
                    {delta !== null && (
                      <p className="text-muted-foreground">
                        {delta >= 0 ? "+" : ""}
                        {delta}% contra el anterior
                      </p>
                    )}
                  </div>
                )
              }}
            />
            <Bar dataKey="current" barSize={18} stroke="var(--tinta)" strokeWidth={2} isAnimationActive={false}>
              {data.map((d) => (
                <Cell key={d.categoryId} fill={paletteHex(d.color)} />
              ))}
              {/* Nombre de la categoría, arriba de la barra */}
              <LabelList
                dataKey="name"
                content={({ x, y, value }) => (
                  <text x={Number(x)} y={Number(y) - 7} className="fill-foreground font-sans text-sm" style={{ fontSize: 14 }}>
                    {String(value)}
                  </text>
                )}
              />
              <LabelList
                dataKey="current"
                position="right"
                offset={8}
                formatter={(v) => money(Number(v))}
                className="fill-foreground font-display"
                style={{ fontSize: 18 }}
              />
            </Bar>
            <Bar
              dataKey="prev"
              barSize={8}
              fill="transparent"
              stroke="var(--muted-foreground)"
              strokeWidth={2}
              strokeDasharray="4 3"
              isAnimationActive={false}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
      <details className="text-sm">
        <summary className="cursor-pointer font-semibold">Ver como tabla</summary>
        <table className="mt-2 w-full text-left">
          <thead>
            <tr className="text-muted-foreground">
              <th className="py-1 font-normal">Categoría</th>
              <th className="py-1 text-right font-normal">Este período</th>
              <th className="py-1 text-right font-normal">Anterior</th>
            </tr>
          </thead>
          <tbody>
            {all.map((d) => (
              <tr key={d.categoryId} className="border-t-2 border-tinta/10 dark:border-white/10">
                <td className="py-1">{d.name}</td>
                <td className="tabular py-1 text-right">{money(d.current)}</td>
                <td className="tabular py-1 text-right">{money(d.prev)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </details>
    </div>
  )
}
