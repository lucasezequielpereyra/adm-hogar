import { cn } from "cn"
import Link from "next/link"

/** Pestañas que navegan (estado en la URL). */
export function LinkTabs({ tabs, active }: { tabs: { href: string; label: string; key: string }[]; active: string }) {
  return (
    <nav className="mx-[3px] flex w-full gap-3" aria-label="Vistas">
      {tabs.map((t) => {
        const isActive = t.key === active
        return (
          <Link
            key={t.key}
            href={t.href}
            aria-current={isActive ? "page" : undefined}
            className={cn(
              "inline-flex h-11 flex-1 items-center justify-center px-3 font-semibold pixel-block",
              isActive ? "bg-moneda text-tinta pixel-pressed" : "bg-panel text-muted-foreground active:pixel-pressed",
            )}
          >
            {t.label}
          </Link>
        )
      })}
    </nav>
  )
}
