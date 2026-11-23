import { cn } from "cn"
import { formatMoney, type Currency } from "@/lib/domain/format"

export function Money({
  amount,
  currency = "ARS",
  className,
  display = false,
  decimals,
}: {
  amount: number | string | null | undefined
  currency?: Currency
  className?: string
  /** Usa la fuente display (montos grandes). */
  display?: boolean
  /** Forzar (true) u ocultar (false) los centavos. Por defecto, solo si hay. */
  decimals?: boolean
}) {
  return (
    <span className={cn("tabular whitespace-nowrap", display && "font-display leading-none", className)}>
      {formatMoney(amount, currency, { decimals })}
    </span>
  )
}
