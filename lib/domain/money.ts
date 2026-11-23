import { z } from "zod"

/**
 * Interpreta un monto escrito a mano en formato es-AR.
 *   "12.500,50" → 12500.5   "12500,5" → 12500.5   "12.500" → 12500
 *   "12.5" → 12.5 (un solo punto con 1–2 decimales se toma como decimal)
 * Devuelve null si no es un número válido.
 */
export function parseAmount(input: string | number | null | undefined): number | null {
  if (input === null || input === undefined) return null
  if (typeof input === "number") return Number.isFinite(input) ? input : null
  let s = input.trim().replace(/\s|\$|US\$|ARS|USD/gi, "")
  if (!s) return null
  if (s.includes(",")) {
    s = s.replace(/\./g, "").replace(",", ".")
  } else {
    const dots = (s.match(/\./g) ?? []).length
    if (dots > 1) s = s.replace(/\./g, "")
    else if (dots === 1 && /\.\d{3}$/.test(s)) s = s.replace(".", "")
  }
  if (!/^-?\d+(\.\d+)?$/.test(s)) return null
  const n = Math.round(Number(s) * 100) / 100
  return Number.isFinite(n) ? n : null
}

/** Número → texto editable en es-AR ("12.500,5" → sin símbolo). */
export function formatAmountInput(n: number | string | null | undefined): string {
  if (n === null || n === undefined || n === "") return ""
  const v = typeof n === "string" ? Number(n) : n
  return new Intl.NumberFormat("es-AR", { minimumFractionDigits: 0, maximumFractionDigits: 2 }).format(v)
}

/** Campo de monto obligatorio (string del formulario → número > 0). */
export const amountField = (message = "Ingresá un monto mayor a cero.") =>
  z
    .string()
    .refine((s) => {
      const n = parseAmount(s)
      return n !== null && n > 0
    }, message)

/** Campo de monto opcional ('' = sin monto). */
export const optionalAmountField = (message = "Ingresá un monto válido.") =>
  z.string().refine((s) => s.trim() === "" || (parseAmount(s) ?? -1) >= 0, message)

/** Reparte un total en N cuotas: centavos exactos, la última absorbe la diferencia. */
export function splitInstallments(total: number, count: number): number[] {
  const cents = Math.round(total * 100)
  const base = Math.floor(cents / count)
  const parts = Array.from({ length: count }, () => base)
  parts[count - 1] += cents - base * count
  return parts.map((c) => c / 100)
}
