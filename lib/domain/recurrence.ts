import { addDaysISO, daysInMonth, diffDaysISO, MONTHS_ES_SHORT, weekdayISO } from "./dates"

export type Frequency = "once" | "daily" | "weekly" | "biweekly" | "monthly"

export type RecurrenceRule = {
  frequency: Frequency
  /** 0 = domingo … 6 = sábado (semanal y quincenal) */
  weekdays?: number[] | null
  /** 1..31 (mensual); se recorta al último día del mes */
  monthDay?: number | null
  /** Fecha que fija la paridad de semanas en quincenal */
  anchor?: string | null
}

/** Lunes de la semana de una fecha ISO. */
export function weekStartISO(iso: string): string {
  const wd = weekdayISO(iso) // 0 = domingo
  return addDaysISO(iso, wd === 0 ? -6 : 1 - wd)
}

function matchesDay(rule: RecurrenceRule, iso: string): boolean {
  switch (rule.frequency) {
    case "daily":
      return true
    case "weekly":
      return (rule.weekdays ?? []).includes(weekdayISO(iso))
    case "biweekly": {
      if (!(rule.weekdays ?? []).includes(weekdayISO(iso))) return false
      const anchor = rule.anchor ?? iso
      const weeks = Math.round(diffDaysISO(weekStartISO(anchor), weekStartISO(iso)) / 7)
      return ((weeks % 2) + 2) % 2 === 0
    }
    case "monthly": {
      const [y, m, d] = iso.split("-").map(Number)
      const target = Math.min(rule.monthDay ?? 1, daysInMonth(y, m))
      return d === target
    }
    default:
      return false
  }
}

/** Primera fecha >= `from` que cumple la regla (para alinear la fecha inicial). */
export function alignToRule(rule: RecurrenceRule, from: string): string {
  if (rule.frequency === "once") return from
  let d = from
  // Como máximo ~2 meses de búsqueda (mensual con día 31, quincenal).
  for (let i = 0; i < 62; i++) {
    if (matchesDay(rule, d)) return d
    d = addDaysISO(d, 1)
  }
  return from
}

/**
 * Próxima ocurrencia al completar una tarea: la primera fecha que cumple la
 * regla, estrictamente posterior a max(vencimiento, hoy). Así, una tarea
 * vencida no genera ocurrencias ya pasadas.
 */
export function nextOccurrence(rule: RecurrenceRule, dueDate: string, today: string): string | null {
  if (rule.frequency === "once") return null
  const base = dueDate > today ? dueDate : today
  return alignToRule(rule, addDaysISO(base, 1))
}

const WEEKDAY_SHORT = ["dom", "lun", "mar", "mié", "jue", "vie", "sáb"] as const
/** Orden de lunes a domingo para mostrar. */
export const WEEKDAYS_UI = [1, 2, 3, 4, 5, 6, 0] as const
export const WEEKDAY_INITIAL: Record<number, string> = { 0: "D", 1: "L", 2: "M", 3: "M", 4: "J", 5: "V", 6: "S" }
export const WEEKDAY_NAME: Record<number, string> = {
  0: "domingo", 1: "lunes", 2: "martes", 3: "miércoles", 4: "jueves", 5: "viernes", 6: "sábado",
}

function listDays(days: number[] | null | undefined) {
  return WEEKDAYS_UI.filter((d) => (days ?? []).includes(d))
    .map((d) => WEEKDAY_SHORT[d])
    .join(", ")
}

/** Descripción corta de la regla, para mostrar en la lista. */
export function recurrenceLabel(rule: RecurrenceRule): string | null {
  switch (rule.frequency) {
    case "daily":
      return "Todos los días"
    case "weekly":
      return `Cada semana: ${listDays(rule.weekdays)}`
    case "biweekly":
      return `Cada 2 semanas: ${listDays(rule.weekdays)}`
    case "monthly":
      return `Cada mes, el día ${rule.monthDay}`
    default:
      return null
  }
}

/** "Hoy", "Mañana", "Ayer", "Venció hace 3 días", "jue 26 nov". */
export function dueLabel(due: string, today: string): { text: string; overdue: boolean } {
  const diff = diffDaysISO(today, due)
  if (diff === 0) return { text: "Hoy", overdue: false }
  if (diff === 1) return { text: "Mañana", overdue: false }
  if (diff === -1) return { text: "Venció ayer", overdue: true }
  if (diff < 0) return { text: `Venció hace ${-diff} días`, overdue: true }
  const [, m, d] = due.split("-").map(Number)
  return { text: `${WEEKDAY_SHORT[weekdayISO(due)]} ${d} ${MONTHS_ES_SHORT[m - 1]}`, overdue: false }
}
