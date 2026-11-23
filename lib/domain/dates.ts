export const DEFAULT_TIMEZONE = "America/Argentina/Buenos_Aires"

/** Fecha de hoy (yyyy-mm-dd) en la zona horaria dada. */
export function todayISO(timeZone: string = DEFAULT_TIMEZONE, now: Date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now)
}

/** Primer día del mes (yyyy-mm-01) de una fecha ISO. */
export function monthOf(iso: string): string {
  return `${iso.slice(0, 7)}-01`
}

/** Suma días a una fecha ISO (sin zona horaria: aritmética de calendario). */
export function addDaysISO(iso: string, days: number): string {
  const [y, m, d] = iso.split("-").map(Number)
  const date = new Date(Date.UTC(y, m - 1, d + days))
  return date.toISOString().slice(0, 10)
}

/** Suma meses a un mes ISO (yyyy-mm-01). */
export function addMonthsISO(isoMonth: string, months: number): string {
  const [y, m] = isoMonth.split("-").map(Number)
  const date = new Date(Date.UTC(y, m - 1 + months, 1))
  return date.toISOString().slice(0, 10)
}

/** Diferencia en días entre dos fechas ISO (b - a). */
export function diffDaysISO(a: string, b: string): number {
  const [ya, ma, da] = a.split("-").map(Number)
  const [yb, mb, db] = b.split("-").map(Number)
  return Math.round((Date.UTC(yb, mb - 1, db) - Date.UTC(ya, ma - 1, da)) / 86_400_000)
}

/** Día de la semana (0 = domingo) de una fecha ISO. */
export function weekdayISO(iso: string): number {
  const [y, m, d] = iso.split("-").map(Number)
  return new Date(Date.UTC(y, m - 1, d)).getUTCDay()
}

/** Cantidad de días del mes (m = 1..12). */
export function daysInMonth(year: number, month: number): number {
  return new Date(Date.UTC(year, month, 0)).getUTCDate()
}

export const MONTHS_ES_SHORT = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"] as const

function tzOffsetMs(timeZone: string, date: Date): number {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).formatToParts(date)
  const get = (t: string) => Number(parts.find((p) => p.type === t)?.value)
  const asUtc = Date.UTC(get("year"), get("month") - 1, get("day"), get("hour"), get("minute"), get("second"))
  return asUtc - date.getTime()
}

/** Medianoche de una fecha (yyyy-mm-dd) en la zona horaria dada, como ISO UTC. */
export function startOfDayUtcISO(dateIso: string, timeZone: string = DEFAULT_TIMEZONE): string {
  const [y, m, d] = dateIso.split("-").map(Number)
  const guess = Date.UTC(y, m - 1, d)
  return new Date(guess - tzOffsetMs(timeZone, new Date(guess))).toISOString()
}

/** Fecha de vencimiento de un día del mes, recortada al último día (31 → 30/28). */
export function dueDateInMonth(isoMonth: string, dueDay: number): string {
  const [y, m] = isoMonth.split("-").map(Number)
  const d = Math.min(dueDay, daysInMonth(y, m))
  return `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`
}
