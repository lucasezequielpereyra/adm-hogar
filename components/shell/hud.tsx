import Link from "next/link"
import { Coin } from "@/components/pixel/coin"
import { hudDate } from "@/lib/domain/format"

/**
 * HUD superior: nombre del hogar, fecha y monedas de la semana
 * (tareas completadas por vos en los últimos 7 días).
 */
export function Hud({
  householdName,
  todayIso,
  coins,
}: {
  householdName: string
  todayIso: string
  coins: number
}) {
  return (
    <header
      className="sticky top-0 z-40 bg-cielo pt-[env(safe-area-inset-top)] text-tinta dark:text-foreground"
      style={{
        backgroundImage: "var(--cielo-deco)",
        backgroundRepeat: "repeat-x",
        backgroundSize: "128px 24px",
        backgroundPosition: "0 calc(env(safe-area-inset-top) + 2px)",
        imageRendering: "pixelated",
      }}
    >
      <div className="mx-auto flex h-14 max-w-xl items-center justify-between gap-3 px-4">
        <Link
          href="/mas/hogar"
          className="min-w-0 truncate font-display text-[26px] leading-none"
          aria-label={`Hogar: ${householdName}`}
        >
          {householdName}
        </Link>
        <div className="flex shrink-0 items-center gap-4 font-display text-[22px] leading-none">
          <span>{hudDate(todayIso)}</span>
          <span className="flex items-center gap-1" aria-label={`${coins} tareas completadas esta semana`}>
            <Coin size={20} />
            <span className="tabular">×{String(coins).padStart(2, "0")}</span>
          </span>
        </div>
      </div>
      <div className="h-[3px] bg-tinta" />
    </header>
  )
}
