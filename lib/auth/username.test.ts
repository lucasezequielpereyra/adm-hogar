import { describe, expect, it } from "vitest"
import { isValidUsername, normalizeUsername, usernameToEmail } from "./username"

describe("usernames", () => {
  it("normaliza: minúsculas, sin @ y sin espacios", () => {
    expect(normalizeUsername("  @Ana ")).toBe("ana")
    expect(normalizeUsername("Bruno.Gatos")).toBe("bruno.gatos")
  })

  it.each([
    ["ana", true],
    ["bruno_92", true],
    ["la-casa.de.ana", true],
    ["ab", false], // muy corto
    ["a".repeat(21), false], // muy largo
    ["_ana", false], // empieza con símbolo
    ["ana pérez", false], // espacio y tilde
    ["ñandu", false],
    ["ana@casa", false],
  ])("%s → %s", (u, ok) => {
    expect(isValidUsername(u)).toBe(ok)
  })

  it("mapea a un email interno", () => {
    expect(usernameToEmail("Ana")).toBe("ana@usuarios.hogar.invalid")
    expect(usernameToEmail("ana", "otro.dominio")).toBe("ana@otro.dominio")
  })
})
