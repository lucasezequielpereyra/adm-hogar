import { describe, expect, it } from "vitest"
import { formatAmountInput, parseAmount, splitInstallments } from "./money"

describe("parseAmount", () => {
  it.each([
    ["12.500,50", 12500.5],
    ["12500,5", 12500.5],
    ["12.500", 12500],
    ["1.234.567", 1234567],
    ["12.5", 12.5],
    ["12.50", 12.5],
    ["$ 3.900", 3900],
    ["38500", 38500],
    ["0", 0],
  ])("%s → %s", (input, expected) => {
    expect(parseAmount(input)).toBe(expected)
  })
  it("rechaza texto inválido", () => {
    expect(parseAmount("abc")).toBeNull()
    expect(parseAmount("")).toBeNull()
    expect(parseAmount("12,5,3")).toBeNull()
  })
})

describe("formatAmountInput", () => {
  it("formatea para editar", () => {
    expect(formatAmountInput(12500.5)).toBe("12.500,5")
    expect(formatAmountInput("38500.00")).toBe("38.500")
    expect(formatAmountInput(null)).toBe("")
  })
})

describe("splitInstallments", () => {
  it("reparte exacto y la última absorbe los centavos", () => {
    expect(splitInstallments(100, 3)).toEqual([33.33, 33.33, 33.34])
    expect(splitInstallments(1000, 6).reduce((a, b) => a + b, 0)).toBeCloseTo(1000, 2)
  })
})
