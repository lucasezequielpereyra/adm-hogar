import {
  Box, Bus, Car, Coffee, CreditCard, Fish, Gamepad, Gift, Heart, Home, Mug, Receipt,
  Shirt, ShoppingBag, ShoppingCart, Sofa, Suitcase, Tv, Zap, BookOpen, CircleQuestion,
  Dog, Drum, Fire, Brush, Spray, Trash, Bed, Coins, Wallet, Tools, Leaf, Scissors,
  Music, Phone, Wifi, Calendar, BottleWine, Potion, Cake, Moon, Sun, Star, Banknote,
} from "pixelarticons/react"
import type { ComponentType, SVGProps } from "react"

type Icon = ComponentType<SVGProps<SVGSVGElement>>

/** Cabeza de gato en la grilla de 24×24 de pixelarticons (no trae gato). */
const CAT_ROWS = [
  "x..........x",
  "xx........xx",
  "xxx......xxx",
  "xxxxxxxxxxxx",
  "xxxxxxxxxxxx",
  "xx..xxxx..xx",
  "xx..xxxx..xx",
  "xxxxxxxxxxxx",
  "xxxxx..xxxxx",
  "xxxxxxxxxxxx",
  ".xxxxxxxxxx.",
  "..xxxxxxxx..",
]
const CAT_PATH = CAT_ROWS.flatMap((row, y) =>
  [...row].map((c, x) => (c === "x" ? `M${x * 2} ${y * 2}h2v2h-2z` : "")).filter(Boolean),
).join("")

export function Cat(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor" xmlns="http://www.w3.org/2000/svg" {...props}>
      <path d={CAT_PATH} />
    </svg>
  )
}

/**
 * Íconos disponibles para categorías (de gastos y de tareas).
 * En la base se guarda la clave; acá se resuelve el componente.
 */
export const CATEGORY_ICONS = {
  cat: Cat,
  "shopping-cart": ShoppingCart,
  "shopping-bag": ShoppingBag,
  coffee: Coffee,
  mug: Mug,
  cake: Cake,
  car: Car,
  bus: Bus,
  zap: Zap,
  wifi: Wifi,
  phone: Phone,
  heart: Heart,
  potion: Potion,
  fish: Fish,
  dog: Dog,
  home: Home,
  sofa: Sofa,
  bed: Bed,
  shirt: Shirt,
  tv: Tv,
  gamepad: Gamepad,
  music: Music,
  "book-open": BookOpen,
  suitcase: Suitcase,
  receipt: Receipt,
  banknote: Banknote,
  coins: Coins,
  wallet: Wallet,
  "credit-card": CreditCard,
  gift: Gift,
  box: Box,
  fire: Fire,
  brush: Brush,
  spray: Spray,
  trash: Trash,
  tools: Tools,
  leaf: Leaf,
  scissors: Scissors,
  bottle: BottleWine,
  calendar: Calendar,
  drum: Drum,
  moon: Moon,
  sun: Sun,
  star: Star,
  "circle-question": CircleQuestion,
} satisfies Record<string, Icon>

export type CategoryIconKey = keyof typeof CATEGORY_ICONS

export const CATEGORY_ICON_KEYS = Object.keys(CATEGORY_ICONS) as CategoryIconKey[]

export function categoryIcon(key: string | null | undefined): Icon {
  return (key && key in CATEGORY_ICONS
    ? CATEGORY_ICONS[key as CategoryIconKey]
    : CircleQuestion) as Icon
}
