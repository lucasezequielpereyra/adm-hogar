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

/** Cuotas de una compra: período y monto de cada una. */
export function planInstallments(
  purchaseDate: string,
  closingDay: number,
  total: number,
  count: number,
): { number: number; period: string; amount: number }[] {
  const first = statementPeriod(purchaseDate, closingDay)
  return splitInstallments(total, count).map((amount, i) => ({ number: i + 1, period: addMonthsISO(first, i), amount }))
}
