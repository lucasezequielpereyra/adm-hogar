import { describe, expect, it } from "vitest"
import { matchRule, type Rule } from "../rules"

const rule = (id: string, pattern: string, hits = 0): Rule => ({ id, pattern, category_id: `cat-${id}`, hits })

describe("matchRule", () => {
  const rules = [rule("1", "rappi", 3), rule("2", "coto"), rule("3", "coto suc", 1), rule("4", "uber"), rule("5", "uber eats", 0)]

  it("coincidencia exacta", () => {
    expect(matchRule("rappi", rules)?.id).toBe("1")
  })

  it("coincidencia por palabra completa dentro de la descripción", () => {
    expect(matchRule("pago rappi online", rules)?.id).toBe("1")
  })

  it("no matchea dentro de otra palabra", () => {
    expect(matchRule("rappitendero", rules)).toBeNull()
    expect(matchRule("cotorra", rules)).toBeNull()
  })

  it("gana el patrón más largo", () => {
    expect(matchRule("coto suc centro", rules)?.id).toBe("3")
    expect(matchRule("uber eats pedido", rules)?.id).toBe("5")
  })

  it("en empate de largo gana el de más hits", () => {
    const tie = [rule("a", "kiosko", 1), rule("b", "kiosco", 9), rule("c", "kiosco", 2)]
    expect(matchRule("el kiosco de la esquina", tie)?.id).toBe("b")
  })

  it("descripción vacía no matchea", () => {
    expect(matchRule("", rules)).toBeNull()
  })

  it("ignora patrones demasiado cortos en la búsqueda parcial", () => {
    expect(matchRule("ab cd", [rule("x", "ab")])).toBeNull()
  })
})
