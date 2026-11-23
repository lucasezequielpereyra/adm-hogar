import Link from "next/link"
import { ChevronLeft, ChevronRight } from "pixelarticons/react"
import { addMonthsISO } from "@/lib/domain/dates"
import { monthLabel } from "@/lib/domain/format"

/** Navegación entre meses (estado en ?mes=yyyy-mm). */
export function MonthNav({ basePath, month, current, label }: { basePath: string; month: string; current: string; label?: string }) {
  const href = (m: string) => (m === current ? basePath : `${basePath}?mes=${m.slice(0, 7)}`)
  return (
    <div className="flex items-center justify-between gap-2">
      <Link href={href(addMonthsISO(month, -1))} aria-label="Mes anterior" className="flex size-11 items-center justify-center">
        <ChevronLeft className="size-8" aria-hidden />
      </Link>
      <h1 className="text-center font-display text-[36px] leading-none">{label ?? monthLabel(month)}</h1>
      <Link href={href(addMonthsISO(month, 1))} aria-label="Mes siguiente" className="flex size-11 items-center justify-center">
        <ChevronRight className="size-8" aria-hidden />
      </Link>
    </div>
  )
}

/** Lee ?mes=yyyy-mm y devuelve el primer día del mes (o el actual). */
export function monthFromParam(mes: string | undefined, current: string): string {
  return mes && /^\d{4}-\d{2}$/.test(mes) ? `${mes}-01` : current
}
