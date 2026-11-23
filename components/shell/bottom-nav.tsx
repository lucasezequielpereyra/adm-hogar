"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "cn"
import { CheckboxOn, CreditCard, Home, MoreHorizontal, ShoppingCart } from "pixelarticons/react"
import { Michi } from "@/components/pixel/michi"

const ITEMS = [
  { href: "/", label: "Inicio", icon: Home, match: (p: string) => p === "/" },
  { href: "/tareas", label: "Tareas", icon: CheckboxOn, match: (p: string) => p.startsWith("/tareas") },
  { href: "/compras", label: "Compras", icon: ShoppingCart, match: (p: string) => p.startsWith("/compras") },
  { href: "/gastos", label: "Gastos", icon: CreditCard, match: (p: string) => p.startsWith("/gastos") },
  { href: "/mas", label: "Más", icon: MoreHorizontal, match: (p: string) => p.startsWith("/mas") },
]

/** Altura total de la barra (sin safe area), usada para separar el contenido. */
export const BOTTOM_NAV_HEIGHT = 96

/**
 * Barra inferior: cinco bloques apoyados sobre el suelo pixel.
 * La sección activa es el bloque dorado.
 */
export function BottomNav() {
  const pathname = usePathname()
  return (
    <nav
      aria-label="Secciones"
      className="fixed inset-x-0 bottom-0 z-40 pb-[env(safe-area-inset-bottom)]"
      style={{
        background:
          "var(--suelo) repeat-x 0 0 / 32px 20px, var(--tierra-deco) repeat 0 20px / 32px 12px, var(--tierra)",
        imageRendering: "pixelated",
      }}
    >
      {/* Los michis, sentados sobre el pasto */}
      <div aria-hidden className="pointer-events-none absolute -top-[18px] left-2 flex items-end">
        <Michi color="naranja" size={24} />
        <Michi color="negro" pose="durmiendo" size={28} flip zzz={false} />
      </div>
      <ul className="mx-auto grid max-w-xl grid-cols-5 gap-2 px-3 pt-6 pb-3">
        {ITEMS.map(({ href, label, icon: Icon, match }) => {
          const active = match(pathname)
          return (
            <li key={href}>
              <Link
                href={href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex h-[60px] flex-col items-center justify-center gap-0.5 text-sm font-semibold text-tinta pixel-block active:pixel-pressed dark:text-foreground",
                  active ? "-translate-y-[3px] bg-moneda dark:text-tinta" : "bg-panel",
                )}
              >
                <Icon className="size-6" aria-hidden />
                <span className="leading-none">{label}</span>
              </Link>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
