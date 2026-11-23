import Link from "next/link"
import { ChevronLeft } from "pixelarticons/react"
import type { ReactNode } from "react"

/** Título de pantalla con botón "volver" opcional. */
export function PageHeader({ title, back, action }: { title: string; back?: string; action?: ReactNode }) {
  return (
    <div className="mb-5 flex items-center gap-2">
      {back && (
        <Link href={back} aria-label="Volver" className="-ml-2 flex size-11 items-center justify-center">
          <ChevronLeft className="size-8" aria-hidden />
        </Link>
      )}
      <h1 className="min-w-0 flex-1 truncate font-display text-[40px] leading-none">{title}</h1>
      {action}
    </div>
  )
}
