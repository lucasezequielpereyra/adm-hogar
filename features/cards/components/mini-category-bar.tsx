import { formatMoney } from "@/lib/domain/format"
import { paletteVar } from "@/lib/palette"

export type MiniDatum = { key: string; name: string; color: string; value: number }

/**
 * Barra apilada chica: las 4 categorías más grandes + "Otras", con
 * separadores y leyenda con montos (el color no es lo único que identifica).
 */
export function MiniCategoryBar({ data }: { data: MiniDatum[] }) {
  const sorted = [...data].sort((a, b) => b.value - a.value)
  const top = sorted.slice(0, 4)
  const rest = sorted.slice(4).reduce((s, d) => s + d.value, 0)
  const items = rest > 0 ? [...top, { key: "otras", name: "Otras", color: "gris", value: rest }] : top
  const total = items.reduce((s, d) => s + d.value, 0)
  if (total <= 0) return null

  return (
    <div className="flex flex-col gap-3">
      <div className="mx-[3px] flex h-6 gap-[2px] bg-tinta p-[2px]" role="img" aria-label="Gasto por categoría">
        {items.map((d) => (
          <span key={d.key} style={{ width: `${(d.value / total) * 100}%`, background: paletteVar(d.color) }} title={d.name} />
        ))}
      </div>
      <ul className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
        {items.map((d) => (
          <li key={d.key} className="flex min-w-0 items-center gap-2">
            <span className="size-3 shrink-0 pixel-frame m-[3px]" style={{ background: paletteVar(d.color) }} aria-hidden />
            <span className="min-w-0 flex-1 truncate">{d.name}</span>
            <span className="tabular shrink-0">{formatMoney(d.value, "ARS", { decimals: false })}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}
