"use client"

import { usePathname } from "next/navigation"
import { LinkTabs } from "@/components/shell/link-tabs"

export function ComprasTabs() {
  const pathname = usePathname()
  if (pathname.startsWith("/compras/plantillas")) return null
  return (
    <LinkTabs
      active={pathname.startsWith("/compras/pendientes") ? "pendientes" : "mes"}
      tabs={[
        { key: "mes", label: "Del mes", href: "/compras/mes" },
        { key: "pendientes", label: "Pendientes", href: "/compras/pendientes" },
      ]}
    />
  )
}
