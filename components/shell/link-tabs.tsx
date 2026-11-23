import { cn } from "cn"
import Link from "next/link"

/** Pestañas que navegan (estado en la URL). */
export function LinkTabs({
  tabs,
  active,
  label = "Vistas",
}: {
  tabs: { href: string; label: React.ReactNode; key: string }[]
  active: string
  label?: string
}) {
  return (
    <nav className="mx-[3px] flex w-full gap-3" aria-label={label}>
      {tabs.map((t) => {
        const isActive = t.key === active
        return (
          <Link
            key={t.key}
            href={t.href}
            aria-current={isActive ? "page" : undefined}
            className={cn(
              "inline-flex h-11 flex-1 items-center justify-center gap-2 px-3 font-semibold",
              isActive ? "bg-moneda text-tinta pixel-selected" : "bg-panel text-foreground pixel-block active:pixel-pressed",
            )}
          >
            {t.label}
          </Link>
        )
      })}
    </nav>
  )
}
