"use client"

import Link from "next/link"
import { useState } from "react"
import { cn } from "cn"
import { CheckboxOn, CreditCard, Plus, Receipt, ShoppingBag, ShoppingCart } from "pixelarticons/react"
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer"

const ACTIONS = [
  { href: "/tareas?nueva=1", label: "Nueva tarea", icon: CheckboxOn },
  { href: "/compras/mes?nuevo=1", label: "Ítem para la compra del mes", icon: ShoppingCart },
  { href: "/compras/pendientes?nueva=1", label: "Compra pendiente", icon: ShoppingBag },
  { href: "/gastos/tarjetas?nuevo=1", label: "Gasto de tarjeta", icon: CreditCard },
  { href: "/gastos/fijos?pagar=1", label: "Pago de gasto fijo", icon: Receipt },
]

/** Botón (+): un bloque dorado que hace "bump" y abre las acciones rápidas. */
export function Fab() {
  const [open, setOpen] = useState(false)
  const [bump, setBump] = useState(0)

  return (
    <Drawer open={open} onOpenChange={setOpen}>
      <DrawerTrigger asChild>
        <button
          type="button"
          aria-label="Agregar"
          onClick={() => setBump((b) => b + 1)}
          className="fixed right-5 z-40 bottom-[calc(96px+env(safe-area-inset-bottom)+16px)]"
        >
          <span
            key={bump}
            className={cn(
              "flex size-16 items-center justify-center bg-moneda text-tinta pixel-block active:pixel-pressed",
              bump > 0 && "animate-block-bump",
            )}
          >
            <Plus className="size-10" aria-hidden />
          </span>
        </button>
      </DrawerTrigger>
      <DrawerContent>
        <DrawerHeader>
          <DrawerTitle>Agregar</DrawerTitle>
          <DrawerDescription>¿Qué querés cargar?</DrawerDescription>
        </DrawerHeader>
        <ul className="flex flex-col gap-4 px-5 pt-2 pb-6">
          {ACTIONS.map(({ href, label, icon: Icon }) => (
            <li key={href}>
              <Link
                href={href}
                onClick={() => setOpen(false)}
                className="mx-[3px] flex h-14 items-center gap-3 bg-panel px-4 text-base font-semibold pixel-block active:pixel-pressed"
              >
                <Icon className="size-6" aria-hidden />
                {label}
              </Link>
            </li>
          ))}
        </ul>
      </DrawerContent>
    </Drawer>
  )
}
