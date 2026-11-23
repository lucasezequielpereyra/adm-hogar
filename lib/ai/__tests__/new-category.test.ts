import { describe, expect, it } from "vitest"
import { findEquivalent, pickColor, sanitizeProposal } from "../new-category"

const icons = ["home", "brush", "star"]

describe("sanitizeProposal", () => {
  it("limpia espacios, pone mayúscula inicial y conserva un ícono válido", () => {
    expect(sanitizeProposal({ name: "  personal   doméstico ", description: " Sueldo  y cargas ", icon: "brush" }, icons)).toEqual({
      name: "Personal doméstico",
      description: "Sueldo y cargas",
      icon: "brush",
    })
  })

  it("un ícono desconocido pasa al de por defecto", () => {
    expect(sanitizeProposal({ name: "Jardinería", icon: "rocket" }, icons)?.icon).toBe("star")
  })

  it("rechaza comodines, nombres vacíos o demasiado largos", () => {
    expect(sanitizeProposal({ name: "Otros" }, icons)).toBeNull()
    expect(sanitizeProposal({ name: "Sin categorizar" }, icons)).toBeNull()
    expect(sanitizeProposal({ name: "x" }, icons)).toBeNull()
    expect(sanitizeProposal({ name: "a".repeat(41) }, icons)).toBeNull()
    expect(sanitizeProposal(null, icons)).toBeNull()
  })
})

describe("findEquivalent", () => {
  const existing = [
    { id: "1", name: "Educación" },
    { id: "2", name: "Seguros" },
    { id: "3", name: "Préstamos y créditos" },
  ]

  it("ignora tildes, mayúsculas y plurales", () => {
    expect(findEquivalent("educacion", existing)?.id).toBe("1")
    expect(findEquivalent("Seguro", existing)?.id).toBe("2")
    expect(findEquivalent("prestamos y credito", existing)?.id).toBe("3")
  })

  it("no confunde categorías distintas", () => {
    expect(findEquivalent("Jardinería", existing)).toBeNull()
  })
})

describe("pickColor", () => {
  it("elige el primer color libre de la paleta", () => {
    expect(pickColor(["rojo", "verde"], ["rojo", "verde", "azul", "lima"])).toBe("azul")
  })

  it("si están todos usados, el que menos se repite", () => {
    expect(pickColor(["rojo", "rojo", "verde", "azul"], ["rojo", "verde", "azul"])).toBe("verde")
  })
})
