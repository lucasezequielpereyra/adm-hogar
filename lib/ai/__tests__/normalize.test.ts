import { describe, expect, it } from "vitest"
import { normalizeDescription } from "../normalize"

describe("normalizeDescription", () => {
  it.each([
    ["MERPAGO*RAPPI 02/03", "rappi"],
    ["Cuota 3 de 6 NETFLIX.COM", "netflix com"],
    ["MERCADOPAGO * PEDIDOSYA", "pedidosya"],
    ["DLO*SPOTIFY", "spotify"],
    ["DLO*GOOGLE *YouTube", "youtube"],
    ["PAYU*AR*UBER", "ar uber"],
    ["FRAVEGA C.02/12", "fravega"],
    ["COTO SUC 123", "coto suc"],
    ["Farmacía Pérez Ñandú", "farmacia perez nandu"],
    ["  UBER    *TRIP   ", "uber trip"],
    ["123456 / 78", ""],
    ["", ""],
  ])("%j → %j", (input, expected) => {
    expect(normalizeDescription(input)).toBe(expected)
  })

  it("no saca palabras que empiezan como un prefijo si no hay *", () => {
    expect(normalizeDescription("MPLS STORE")).toBe("mpls store")
    expect(normalizeDescription("GOOGLE ONE")).toBe("google one")
  })

  it("tolera null/undefined", () => {
    expect(normalizeDescription(null)).toBe("")
    expect(normalizeDescription(undefined)).toBe("")
  })
})
