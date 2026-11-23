import { describe, expect, it } from "vitest"
import { closingDate, planInstallments, statementDueDate, statementPeriod } from "./periods"

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
