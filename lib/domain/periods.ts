import { addMonthsISO, dueDateInMonth, monthOf } from "./dates"
import { splitInstallments } from "./money"

/**
 * Período (yyyy-mm-01) del resumen en el que cae una compra.
 * Gemelo de public.statement_period en SQL: el cierre del mes es
 * min(closingDay, último día); hasta el cierre → ese mes, después → el siguiente.
 */
export function statementPeriod(dateIso: string, closingDay: number): string {
  const month = monthOf(dateIso)
  return dateIso <= dueDateInMonth(month, closingDay) ? month : addMonthsISO(month, 1)
}

/** Fecha de cierre de un período. */
export function closingDate(period: string, closingDay: number): string {
  return dueDateInMonth(period, closingDay)
}

/** Fecha de vencimiento del resumen: después del cierre (mismo mes o el siguiente). */
export function statementDueDate(period: string, closingDay: number, dueDay: number): string {
  return dueDay > closingDay ? dueDateInMonth(period, dueDay) : dueDateInMonth(addMonthsISO(period, 1), dueDay)
}

/** Fechas reales de un resumen cargado (tabla card_statements). */
export type StatementDates = { period: string; closing_date: string; due_date: string }

function findStatement(period: string, statements: readonly StatementDates[]) {
  return statements.find((s) => s.period === period)
}

/** Cierre de un período: el real si está cargado, si no el del día de la tarjeta. */
export function periodClosing(period: string, closingDay: number, statements: readonly StatementDates[] = []): string {
  return findStatement(period, statements)?.closing_date ?? closingDate(period, closingDay)
}

/** Vencimiento de un período: el real si está cargado, si no el de los días de la tarjeta. */
export function periodDue(period: string, closingDay: number, dueDay: number, statements: readonly StatementDates[] = []): string {
  return findStatement(period, statements)?.due_date ?? statementDueDate(period, closingDay, dueDay)
}

/**
 * Resumen en el que cae una compra, teniendo en cuenta los cierres reales
 * cargados. Gemelo de private.card_statement_period: desde el mes anterior,
 * el primer período cuyo cierre es >= la fecha. Sin resúmenes cargados da
 * lo mismo que statementPeriod.
 */
export function cardStatementPeriod(dateIso: string, closingDay: number, statements: readonly StatementDates[] = []): string {
  let p = addMonthsISO(monthOf(dateIso), -1)
  for (let i = 0; i < 4; i++) {
    if (dateIso <= periodClosing(p, closingDay, statements)) return p
    p = addMonthsISO(p, 1)
  }
  return p
}

/** La misma fecha un mes después (recortada al último día: 31/01 → 28/02). */
function nextMonthSameDay(iso: string): string {
  return dueDateInMonth(addMonthsISO(monthOf(iso), 1), Number(iso.slice(8, 10)))
}

/**
 * Fechas para proponer en un resumen que todavía no se cargó: las del
 * resumen anterior un mes después (si está cargado), o las de los días de
 * la tarjeta.
 */
export function suggestedStatementDates(
  period: string,
  closingDay: number,
  dueDay: number,
  statements: readonly StatementDates[] = [],
): { closing: string; due: string } {
  const prev = findStatement(addMonthsISO(period, -1), statements)
  if (prev) return { closing: nextMonthSameDay(prev.closing_date), due: nextMonthSameDay(prev.due_date) }
  return { closing: closingDate(period, closingDay), due: statementDueDate(period, closingDay, dueDay) }
}

/** Cuotas de una compra: período y monto de cada una. */
export function planInstallments(
  purchaseDate: string,
  closingDay: number,
  total: number,
  count: number,
  statements: readonly StatementDates[] = [],
): { number: number; period: string; amount: number }[] {
  const first = cardStatementPeriod(purchaseDate, closingDay, statements)
  return splitInstallments(total, count).map((amount, i) => ({ number: i + 1, period: addMonthsISO(first, i), amount }))
}
