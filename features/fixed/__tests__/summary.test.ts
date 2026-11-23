import { describe, expect, it } from "vitest"
import { fixedByCategory, type FixedSummaryItem } from "../summary"

const item = (over: Partial<FixedSummaryItem>): FixedSummaryItem => ({
  amount: 1000,
  currency: "ARS",
  category_id: "vivienda",
  is_active: true,
  created_at: "2026-01-10T12:00:00Z",
  payment: null,
  ...over,
})

describe("fixedByCategory", () => {
  it("suma por categoría: pagado con el monto real, pendiente con el base", () => {
    const current = [
      item({ amount: 650000, payment: { amount: 700000 } }),
      item({ amount: 98000 }),
      item({ category_id: "servicios", amount: 38500 }),
    ]
    expect(fixedByCategory(current, [], "ARS", "2026-11-01")).toEqual([
      { categoryId: "vivienda", current: 798000, prev: 0 },
      { categoryId: "servicios", current: 38500, prev: 0 },
    ])
  })

  it("los inactivos solo cuentan si se pagaron ese mes", () => {
    const current = [item({ is_active: false }), item({ is_active: false, category_id: "seguros", payment: { amount: 500 } })]
    expect(fixedByCategory(current, [], "ARS", "2026-11-01")).toEqual([{ categoryId: "seguros", current: 500, prev: 0 }])
  })

  it("separa por moneda y agrupa los sin categoría", () => {
    const current = [item({ currency: "USD", amount: 3, category_id: null }), item({ amount: 10 })]
    expect(fixedByCategory(current, [], "USD", "2026-11-01")).toEqual([{ categoryId: "none", current: 3, prev: 0 }])
  })

  it("del mes anterior no cuenta los fijos creados después, salvo que tengan pago", () => {
    const prev = [
      item({ amount: 100 }),
      item({ amount: 200, created_at: "2026-11-05T10:00:00Z" }),
      item({ amount: 300, created_at: "2026-11-05T10:00:00Z", payment: { amount: 300 } }),
    ]
    expect(fixedByCategory([], prev, "ARS", "2026-11-01")).toEqual([{ categoryId: "vivienda", current: 0, prev: 400 }])
  })
})
