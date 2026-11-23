"use client"

import { usePathname } from "next/navigation"
import { LinkTabs } from "@/components/shell/link-tabs"

export function GastosTabs() {
  const pathname = usePathname()
  return (
    <LinkTabs
      active={pathname.startsWith("/gastos/fijos") ? "fijos" : "tarjetas"}
      tabs={[
        { key: "tarjetas", label: "Tarjetas", href: "/gastos/tarjetas" },
        { key: "fijos", label: "Fijos", href: "/gastos/fijos" },
      ]}
    />
  )
}
