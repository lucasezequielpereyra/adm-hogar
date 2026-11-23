import { describe, expect, it } from "vitest"
import { breakdownByCategory, breakdownTotal, type BreakdownRow } from "../breakdown"

const row = (over: Partial<BreakdownRow>): BreakdownRow => ({
  categoryId: "super",
  cardId: "visa",
  isPrivate: false,
  currency: "ARS",
  amount: 100,
  when: "current",
  ...over,
})

const rows: BreakdownRow[] = [
  row({ amount: 1000 }),
  row({ cardId: "master", amount: 500 }),
  row({ categoryId: "ropa", isPrivate: true, amount: 300 }),
  row({ categoryId: "ropa", isPrivate: true, amount: 200, when: "prev" }),
  row({ amount: 800, when: "prev" }),
  row({ categoryId: null, currency: "USD", amount: 15 }),
]

describe("breakdownByCategory", () => {
  it("sin filtros suma todo por categoría, con el mes anterior aparte", () => {
    expect(breakdownByCategory(rows, { cardId: null, kind: "all" }, "ARS")).toEqual([
      { categoryId: "super", current: 1500, prev: 800 },
      { categoryId: "ropa", current: 300, prev: 200 },
    ])
  })

  it("filtra por tarjeta", () => {
    expect(breakdownByCategory(rows, { cardId: "master", kind: "all" }, "ARS")).toEqual([{ categoryId: "super", current: 500, prev: 0 }])
  })

  it("separa grupales de individuales", () => {
    expect(breakdownByCategory(rows, { cardId: null, kind: "personal" }, "ARS")).toEqual([{ categoryId: "ropa", current: 300, prev: 200 }])
    expect(breakdownByCategory(rows, { cardId: "visa", kind: "shared" }, "ARS")).toEqual([{ categoryId: "super", current: 1000, prev: 800 }])
  })

  it("los sin categoría van juntos y cada moneda por separado", () => {
    expect(breakdownByCategory(rows, { cardId: null, kind: "all" }, "USD")).toEqual([{ categoryId: "none", current: 15, prev: 0 }])
  })
})

describe("breakdownTotal", () => {
  it("suma solo el mes elegido, por moneda", () => {
    expect(breakdownTotal(rows, { cardId: "visa", kind: "all" })).toEqual({ ARS: 1300, USD: 15 })
    expect(breakdownTotal(rows, { cardId: null, kind: "personal" })).toEqual({ ARS: 300 })
  })
})
