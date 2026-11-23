"use client"

import { cn } from "cn"
import { Check } from "pixelarticons/react"
import { useTransition } from "react"
import { toast } from "sonner"
import { switchHousehold } from "../actions"

export function HouseholdSwitcher({
  households,
  currentId,
}: {
  households: { id: string; name: string; role: string }[]
  currentId: string
}) {
  const [pending, startTransition] = useTransition()
  return (
    <ul className="flex flex-col gap-3">
      {households.map((h) => {
        const current = h.id === currentId
        return (
          <li key={h.id}>
            <button
              type="button"
              disabled={pending || current}
              aria-current={current ? "true" : undefined}
              onClick={() =>
                startTransition(async () => {
                  const res = await switchHousehold(h.id)
                  if (res.ok) toast.success(`Ahora estás en ${h.name}`)
                  else toast.error(res.error)
                })
              }
              className={cn(
                "mx-[3px] flex min-h-14 w-[calc(100%-6px)] items-center gap-3 px-4 text-left font-semibold pixel-block active:pixel-pressed disabled:cursor-default",
                current ? "bg-moneda text-tinta" : "bg-panel",
              )}
            >
              <span className="flex-1">{h.name}</span>
              <span className="text-sm font-normal">{h.role === "admin" ? "Admin" : "Miembro"}</span>
              {current && <Check className="size-6" aria-hidden />}
            </button>
          </li>
        )
      })}
    </ul>
  )
}
