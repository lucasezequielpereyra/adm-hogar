import type { ReactNode } from "react"
import { Michis } from "./michi"

/** Estado vacío: los dos michis + qué pasa + qué hacer. */
export function EmptyState({
  title,
  description,
  action,
  pose = "durmiendo",
}: {
  title: string
  description?: string
  action?: ReactNode
  /** durmiendo: no hay nada · sentado: hay algo para arrancar */
  pose?: "sentado" | "durmiendo"
}) {
  return (
    <div className="flex flex-col items-center gap-3 px-4 py-8 text-center">
      <Michis size={80} mood={pose === "sentado" ? "sentados" : "durmiendo"} />
      <p className="font-display text-[28px] leading-none">{title}</p>
      {description && <p className="max-w-[32ch] text-muted-foreground">{description}</p>}
      {action && <div className="mt-2">{action}</div>}
    </div>
  )
}
