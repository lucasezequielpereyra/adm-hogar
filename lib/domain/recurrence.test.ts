import { describe, expect, it } from "vitest"
import { alignToRule, dueLabel, nextOccurrence, recurrenceLabel, weekStartISO } from "./recurrence"

// Noviembre 2026: el lunes 23 es "hoy" en estos tests.
const TODAY = "2026-11-23"

describe("nextOccurrence", () => {
  it("una vez: no genera próxima", () => {
    expect(nextOccurrence({ frequency: "once" }, TODAY, TODAY)).toBeNull()
  })

  it("diaria: el día siguiente", () => {
    expect(nextOccurrence({ frequency: "daily" }, TODAY, TODAY)).toBe("2026-11-24")
  })

  it("diaria vencida: no genera ocurrencias pasadas", () => {
    expect(nextOccurrence({ frequency: "daily" }, "2026-11-18", TODAY)).toBe("2026-11-24")
  })

  it("completada antes de tiempo: sigue desde el vencimiento", () => {
    expect(nextOccurrence({ frequency: "daily" }, "2026-11-26", TODAY)).toBe("2026-11-27")
  })

  it("semanal con varios días (lun y jue)", () => {
    const rule = { frequency: "weekly" as const, weekdays: [1, 4] }
    expect(nextOccurrence(rule, "2026-11-23", TODAY)).toBe("2026-11-26") // lun → jue
    expect(nextOccurrence(rule, "2026-11-26", "2026-11-26")).toBe("2026-11-30") // jue → lun
  })

  it("quincenal: respeta la paridad de semanas del ancla", () => {
    // Ancla: sábado 21/11. Próximas: 5/12, 19/12…
    const rule = { frequency: "biweekly" as const, weekdays: [6], anchor: "2026-11-21" }
    expect(nextOccurrence(rule, "2026-11-21", "2026-11-21")).toBe("2026-12-05")
    expect(nextOccurrence(rule, "2026-12-05", "2026-12-05")).toBe("2026-12-19")
  })

  it("quincenal vencida hace 3 semanas: salta a la próxima semana válida", () => {
    const rule = { frequency: "biweekly" as const, weekdays: [6], anchor: "2026-10-31" }
    // Hoy 23/11; sábados válidos: 31/10, 14/11, 28/11
    expect(nextOccurrence(rule, "2026-10-31", TODAY)).toBe("2026-11-28")
  })

  it("mensual con día 31 se recorta al último día del mes", () => {
    const rule = { frequency: "monthly" as const, monthDay: 31 }
    expect(nextOccurrence(rule, "2027-01-31", "2027-01-31")).toBe("2027-02-28")
    expect(nextOccurrence(rule, "2027-02-28", "2027-02-28")).toBe("2027-03-31")
  })

  it("mensual en año bisiesto", () => {
    expect(nextOccurrence({ frequency: "monthly", monthDay: 30 }, "2028-01-30", "2028-01-30")).toBe("2028-02-29")
  })
})

describe("alignToRule", () => {
  it("lleva una semanal al primer día elegido", () => {
    expect(alignToRule({ frequency: "weekly", weekdays: [5] }, TODAY)).toBe("2026-11-27")
  })
  it("deja la fecha si ya cumple", () => {
    expect(alignToRule({ frequency: "weekly", weekdays: [1] }, TODAY)).toBe(TODAY)
  })
})

describe("etiquetas", () => {
  it("weekStartISO devuelve el lunes", () => {
    expect(weekStartISO("2026-11-29")).toBe("2026-11-23") // domingo → lunes anterior
  })
  it("recurrenceLabel", () => {
    expect(recurrenceLabel({ frequency: "weekly", weekdays: [4, 1] })).toBe("Cada semana: lun, jue")
    expect(recurrenceLabel({ frequency: "biweekly", weekdays: [6] })).toBe("Cada 2 semanas: sáb")
    expect(recurrenceLabel({ frequency: "monthly", monthDay: 10 })).toBe("Cada mes, el día 10")
    expect(recurrenceLabel({ frequency: "once" })).toBeNull()
  })
  it("dueLabel", () => {
    expect(dueLabel(TODAY, TODAY)).toEqual({ text: "Hoy", overdue: false })
    expect(dueLabel("2026-11-24", TODAY).text).toBe("Mañana")
    expect(dueLabel("2026-11-22", TODAY)).toEqual({ text: "Venció ayer", overdue: true })
    expect(dueLabel("2026-11-20", TODAY)).toEqual({ text: "Venció hace 3 días", overdue: true })
    expect(dueLabel("2026-11-26", TODAY).text).toBe("jue 26 nov")
  })
})
