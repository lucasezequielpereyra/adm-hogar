import { CheckboxOn, Coins, CreditCard, FileText, Sparkles } from "pixelarticons/react"
import { MenuLink } from "@/components/pixel/menu-link"

/** Entradas del menú que agregan los módulos. */
export function moreMenuExtras(isAdmin: boolean) {
  return (
    <>
      <MenuLink href="/mas/tarjetas" icon={CreditCard} title="Tarjetas" description="Cierre, vencimiento y titular" />
      <MenuLink href="/mas/categorias" icon={Coins} title="Categorías de gastos" description="Las que usa la IA para clasificar" />
      <MenuLink href="/mas/categorias-tareas" icon={CheckboxOn} title="Categorías de tareas" description="Cocinar, Living, Michis…" />
      <MenuLink href="/mas/plantillas" icon={FileText} title="Plantillas de compra" description="Listas base para cada mes" />
      {isAdmin && <MenuLink href="/mas/ia" icon={Sparkles} title="IA" description="Uso, costo y registro de categorizaciones" />}
    </>
  )
}
