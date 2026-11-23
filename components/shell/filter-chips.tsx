"use client"

import { cn } from "cn"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import type { ReactNode } from "react"

/** Fila de chips que filtran por un parámetro de la URL. */
export function FilterChips({
  param,
  options,
  label,
  extra,
}: {
  param: string
  options: { value: string | null; label: ReactNode }[]
  label: string
  extra?: ReactNode
}) {
  const router = useRouter()
  const pathname = usePathname()
  const params = useSearchParams()
  const current = params.get(param)

  return (
    <div className="-mx-4 flex gap-3 overflow-x-auto px-[19px] py-[3px]" role="group" aria-label={label}>
      {options.map((o) => {
        const active = (o.value ?? null) === current
        return (
          <button
            key={o.value ?? "todos"}
            type="button"
            aria-pressed={active}
            onClick={() => {
              const next = new URLSearchParams(params)
              if (o.value) next.set(param, o.value)
              else next.delete(param)
              router.replace(next.size ? `${pathname}?${next}` : pathname, { scroll: false })
            }}
            className={cn(
              "inline-flex h-10 shrink-0 items-center gap-1.5 px-3 text-sm font-semibold pixel-frame",
              active ? "bg-moneda text-tinta" : "bg-panel",
            )}
          >
            {o.label}
          </button>
        )
      })}
      {extra}
    </div>
  )
}

/** Chip que prende/apaga un parámetro booleano de la URL (?param=1). */
export function ToggleChip({ param, label }: { param: string; label: ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const params = useSearchParams()
  const active = params.get(param) === "1"
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={() => {
        const next = new URLSearchParams(params)
        if (active) next.delete(param)
        else next.set(param, "1")
        router.replace(next.size ? `${pathname}?${next}` : pathname, { scroll: false })
      }}
      className={cn(
        "inline-flex h-10 shrink-0 items-center gap-1.5 px-3 text-sm font-semibold pixel-frame",
        active ? "bg-uva text-white dark:text-tinta" : "bg-panel",
      )}
    >
      {label}
    </button>
  )
}
