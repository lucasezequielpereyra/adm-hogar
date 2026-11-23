import { describe, expect, it } from "vitest"
import { formatMoney, hudDate, monthLabel, shortDate } from "./format"

describe("formatMoney", () => {
  it("formatea pesos sin centavos si son enteros", () => {
    expect(formatMoney(1234567)).toBe("$ 1.234.567")
  })
  it("muestra centavos si existen", () => {
    expect(formatMoney(1234.5)).toBe("$ 1.234,50")
  })
  it("formatea dólares como US$", () => {
    expect(formatMoney(64, "USD")).toBe("US$ 64")
  })
  it("acepta strings numéricos (numeric de Postgres)", () => {
    expect(formatMoney("38500.00")).toBe("$ 38.500")
  })
})

describe("fechas", () => {
  it("monthLabel", () => expect(monthLabel("2026-11-01")).toBe("Noviembre 2026"))
  it("shortDate", () => expect(shortDate("2026-11-26")).toBe("jue 26 nov"))
  it("hudDate", () => expect(hudDate("2026-11-23")).toBe("LUN 23 NOV"))
})

import { startOfDayUtcISO, todayISO } from "./dates"

describe("zona horaria", () => {
  it("medianoche en Buenos Aires es 03:00 UTC", () => {
    expect(startOfDayUtcISO("2026-11-23", "America/Argentina/Buenos_Aires")).toBe("2026-11-23T03:00:00.000Z")
  })
  it("todayISO usa la zona del hogar", () => {
    // 23/11 01:30 UTC = 22/11 22:30 en Buenos Aires
    expect(todayISO("America/Argentina/Buenos_Aires", new Date("2026-11-23T01:30:00Z"))).toBe("2026-11-22")
  })
})

import { dueDateInMonth } from "./dates"

describe("dueDateInMonth", () => {
  it("recorta al último día del mes", () => {
    expect(dueDateInMonth("2026-11-01", 31)).toBe("2026-11-30")
    expect(dueDateInMonth("2027-02-01", 30)).toBe("2027-02-28")
    expect(dueDateInMonth("2026-11-01", 5)).toBe("2026-11-05")
  })
})
