import { Box, Leaf, Potion, ShoppingBag, Spray, BottleWine } from "pixelarticons/react"
import { Cat } from "@/lib/icons"

export const SHOPPING_CATEGORIES = [
  { key: "almacen", label: "Almacén", icon: Box, color: "arena" },
  { key: "frescos", label: "Frescos", icon: Leaf, color: "lima" },
  { key: "limpieza", label: "Limpieza", icon: Spray, color: "cian" },
  { key: "higiene", label: "Higiene", icon: Potion, color: "rosa" },
  { key: "bebidas", label: "Bebidas", icon: BottleWine, color: "celeste" },
  { key: "mascotas", label: "Mascotas", icon: Cat, color: "magenta" },
  { key: "otros", label: "Otros", icon: ShoppingBag, color: "gris" },
] as const

export type ShoppingCategory = (typeof SHOPPING_CATEGORIES)[number]["key"]
export const SHOPPING_CATEGORY_KEYS = SHOPPING_CATEGORIES.map((c) => c.key) as [ShoppingCategory, ...ShoppingCategory[]]

export const UNITS = [
  { key: "u", label: "u." },
  { key: "kg", label: "kg" },
  { key: "g", label: "g" },
  { key: "l", label: "l" },
  { key: "ml", label: "ml" },
  { key: "paq", label: "paq." },
] as const

export type Unit = (typeof UNITS)[number]["key"]
export const UNIT_KEYS = UNITS.map((u) => u.key) as [Unit, ...Unit[]]
export const unitLabel = (u: string) => UNITS.find((x) => x.key === u)?.label ?? u
