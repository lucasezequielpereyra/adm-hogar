export type Currency = "ARS" | "USD"

const moneyFormatters = new Map<string, Intl.NumberFormat>()

function moneyFormatter(currency: Currency, decimals: boolean) {
  const key = `${currency}-${decimals}`
  let f = moneyFormatters.get(key)
  if (!f) {
    f = new Intl.NumberFormat("es-AR", {
      style: "currency",
      currency,
      currencyDisplay: currency === "USD" ? "code" : "symbol",
      minimumFractionDigits: decimals ? 2 : 0,
      maximumFractionDigits: decimals ? 2 : 0,
    })
    moneyFormatters.set(key, f)
  }
  return f
}

/**
 * Formatea un monto en es-AR. Los centavos se muestran solo si existen
 * (o si se piden explícitamente).
 */
export function formatMoney(
  amount: number | string | null | undefined,
  currency: Currency = "ARS",
  { decimals }: { decimals?: boolean } = {},
): string {
  const n = typeof amount === "string" ? Number(amount) : (amount ?? 0)
  const showDecimals = decimals ?? !Number.isInteger(Math.round(n * 100) / 100)
  return moneyFormatter(currency, showDecimals)
    .format(n)
    .replace(/ /g, " ")
    .replace("USD", "US$")
}

export const MONTHS_ES = [
  "enero", "febrero", "marzo", "abril", "mayo", "junio",
  "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre",
] as const

const WEEKDAYS_SHORT = ["dom", "lun", "mar", "mié", "jue", "vie", "sáb"] as const

/** "2026-11-01" → "Noviembre 2026" */
export function monthLabel(isoMonth: string): string {
  const [y, m] = isoMonth.split("-").map(Number)
  const name = MONTHS_ES[m - 1]
  return `${name.charAt(0).toUpperCase()}${name.slice(1)} ${y}`
}

/** Fecha ISO (yyyy-mm-dd) → "jue 26 nov" */
export function shortDate(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number)
  const date = new Date(Date.UTC(y, m - 1, d))
  return `${WEEKDAYS_SHORT[date.getUTCDay()]} ${d} ${MONTHS_ES[m - 1].slice(0, 3)}`
}

/** Fecha ISO → "LUN 23 NOV" para el HUD. */
export function hudDate(iso: string): string {
  return shortDate(iso).toUpperCase()
}
