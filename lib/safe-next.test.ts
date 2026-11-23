import { describe, expect, it } from "vitest"
import { safeNext } from "./safe-next"

describe("safeNext", () => {
  it.each([
    ["/tareas", "/tareas"],
    ["/unirse/HOGAR123", "/unirse/HOGAR123"],
    ["/gastos/tarjetas?p=-1#top", "/gastos/tarjetas?p=-1#top"],
  ])("permite rutas internas: %s", (input, expected) => {
    expect(safeNext(input)).toBe(expected)
  })

  it.each([
    [null],
    [undefined],
    [""],
    ["https://evil.com"],
    ["//evil.com"],
    ["/\\evil.com"],
    ["/\t/evil.com"],
    ["/\n/evil.com"],
    ["/\r//evil.com"],
    ["\\/evil.com"],
    ["javascript:alert(1)"],
    ["evil.com"],
    ["/.//evil.com"],
    ["/a/..//evil.com"],
    ["/%2e//evil.com"],
    ["/./\\evil.com"],
  ])("rechaza %j", (input) => {
    expect(safeNext(input)).toBe("/")
  })

  it("normaliza segmentos inofensivos", () => {
    expect(safeNext("/tareas/../gastos")).toBe("/gastos")
  })

  it("usa el fallback indicado", () => {
    expect(safeNext("//evil.com", "/bienvenida")).toBe("/bienvenida")
  })
})
