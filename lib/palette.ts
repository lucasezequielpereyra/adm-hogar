/**
 * Paleta cerrada de 16 colores para categorías, miembros y tarjetas.
 * En la base se guarda la clave; el color real sale de la variable CSS
 * `--pal-<clave>` (definida en app/globals.css).
 */
export const PALETTE = [
  { key: "rojo", label: "Rojo" },
  { key: "naranja", label: "Naranja" },
  { key: "amarillo", label: "Amarillo" },
  { key: "lima", label: "Lima" },
  { key: "verde", label: "Verde" },
  { key: "menta", label: "Menta" },
  { key: "cian", label: "Cian" },
  { key: "celeste", label: "Celeste" },
  { key: "azul", label: "Azul" },
  { key: "indigo", label: "Índigo" },
  { key: "violeta", label: "Violeta" },
  { key: "magenta", label: "Magenta" },
  { key: "rosa", label: "Rosa" },
  { key: "marron", label: "Marrón" },
  { key: "arena", label: "Arena" },
  { key: "gris", label: "Gris" },
] as const

export type PaletteKey = (typeof PALETTE)[number]["key"]

export const PALETTE_KEYS = PALETTE.map((p) => p.key) as [PaletteKey, ...PaletteKey[]]

export function isPaletteKey(value: unknown): value is PaletteKey {
  return typeof value === "string" && (PALETTE_KEYS as readonly string[]).includes(value)
}

/** Devuelve la variable CSS del color, con gris como respaldo. */
export function paletteVar(key: string | null | undefined): string {
  return `var(--pal-${isPaletteKey(key) ? key : "gris"})`
}

/** Mismos valores que --pal-* (para SVG, donde var() no funciona en atributos). */
export const PALETTE_HEX: Record<PaletteKey, string> = {
  rojo: "#f26b5b",
  naranja: "#f79a3e",
  amarillo: "#f8d040",
  lima: "#a8d84e",
  verde: "#5cc46a",
  menta: "#4fd1b0",
  cian: "#45c3e6",
  celeste: "#8cc8ff",
  azul: "#6f8cff",
  indigo: "#9a88ff",
  violeta: "#c27bea",
  magenta: "#ee6fc0",
  rosa: "#ffa5c4",
  marron: "#c08a5a",
  arena: "#e3c79a",
  gris: "#a9b2c3",
}

export function paletteHex(key: string | null | undefined): string {
  return PALETTE_HEX[isPaletteKey(key) ? key : "gris"]
}
