import { describe, expect, it } from "vitest"
import { cardStatementPeriod, closingDate, planInstallments, statementDueDate, statementPeriod, suggestedStatementDates } from "./periods"
import { addDaysISO } from "./dates"

describe("statementPeriod (igual que public.statement_period)", () => {
  it.each([
    ["2026-11-25", 25, "2026-11-01"], // el día del cierre entra
    ["2026-11-26", 25, "2026-12-01"], // después del cierre → mes siguiente
    ["2026-12-31", 25, "2027-01-01"], // cambio de año
    ["2027-02-28", 31, "2027-02-01"], // cierre 31 en febrero = 28
    ["2027-02-28", 30, "2027-02-01"],
    ["2026-11-01", 1, "2026-11-01"],
    ["2026-11-02", 1, "2026-12-01"],
  ])("%s con cierre %i → %s", (date, closing, expected) => {
    expect(statementPeriod(date, closing)).toBe(expected)
  })
})

describe("fechas del resumen", () => {
  it("cierre y vencimiento", () => {
    expect(closingDate("2026-11-01", 25)).toBe("2026-11-25")
    expect(statementDueDate("2026-11-01", 25, 5)).toBe("2026-12-05") // vence el mes siguiente
    expect(statementDueDate("2026-11-01", 8, 18)).toBe("2026-11-18") // vence el mismo mes
  })
})

describe("planInstallments", () => {
  it("12 cuotas desde el período de la compra, suma exacta", () => {
    const plan = planInstallments("2026-11-26", 25, 1000, 3)
    expect(plan.map((p) => p.period)).toEqual(["2026-12-01", "2027-01-01", "2027-02-01"])
    expect(plan.map((p) => p.amount)).toEqual([333.33, 333.33, 333.34])
  })
})

describe("cardStatementPeriod (igual que private.card_statement_period)", () => {
  it("sin resúmenes cargados da lo mismo que statementPeriod (cierres 5, 25, 30 y 31)", () => {
    for (const closing of [5, 25, 30, 31]) {
      for (let d = "2026-01-01"; d <= "2026-04-30"; d = addDaysISO(d, 1)) {
        expect(cardStatementPeriod(d, closing)).toBe(statementPeriod(d, closing))
      }
    }
  })

  const nov = (closing_date: string) => [{ period: "2026-11-01", closing_date, due_date: "2026-12-07" }]

  it("un cierre real más tarde trae la compra al mes", () => {
    expect(cardStatementPeriod("2026-11-27", 25, nov("2026-11-28"))).toBe("2026-11-01")
    expect(cardStatementPeriod("2026-11-29", 25, nov("2026-11-28"))).toBe("2026-12-01")
  })

  it("un cierre real más temprano la manda al mes siguiente", () => {
    expect(cardStatementPeriod("2026-11-23", 25, nov("2026-11-22"))).toBe("2026-12-01")
  })

  it("un cierre del mes anterior que cae en este mes también cuenta", () => {
    const oct = [{ period: "2026-10-01", closing_date: "2026-11-02", due_date: "2026-11-12" }]
    expect(cardStatementPeriod("2026-11-01", 25, oct)).toBe("2026-10-01")
    expect(cardStatementPeriod("2026-11-03", 25, oct)).toBe("2026-11-01")
  })

  it("las cuotas usan los cierres reales", () => {
    expect(planInstallments("2026-11-27", 25, 300, 3, nov("2026-11-28")).map((p) => p.period)).toEqual([
      "2026-11-01",
      "2026-12-01",
      "2027-01-01",
    ])
  })
})

describe("suggestedStatementDates", () => {
  it("sin resumen anterior, usa los días de la tarjeta", () => {
    expect(suggestedStatementDates("2026-12-01", 25, 5)).toEqual({ closing: "2026-12-25", due: "2027-01-05" })
  })

  it("con el anterior cargado, propone sus fechas un mes después", () => {
    const prev = [{ period: "2026-11-01", closing_date: "2026-11-27", due_date: "2026-12-09" }]
    expect(suggestedStatementDates("2026-12-01", 25, 5, prev)).toEqual({ closing: "2026-12-27", due: "2027-01-09" })
  })

  it("recorta al último día del mes", () => {
    const prev = [{ period: "2027-01-01", closing_date: "2027-01-31", due_date: "2027-02-10" }]
    expect(suggestedStatementDates("2027-02-01", 31, 10, prev).closing).toBe("2027-02-28")
  })
})
