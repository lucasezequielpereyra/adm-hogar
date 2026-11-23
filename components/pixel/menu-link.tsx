import Link from "next/link"
import { ChevronRight } from "pixelarticons/react"
import type { ComponentType, ReactNode, SVGProps } from "react"

/** Fila de menú tipo bloque con ícono, título y descripción. */
export function MenuLink({
  href,
  icon: Icon,
  title,
  description,
  trailing,
}: {
  href: string
  icon: ComponentType<SVGProps<SVGSVGElement>>
  title: string
  description?: string
  trailing?: ReactNode
}) {
  return (
    <Link
      href={href}
      className="mx-[3px] flex min-h-16 items-center gap-3 bg-panel px-4 py-3 pixel-block active:pixel-pressed"
    >
      <Icon className="size-6 shrink-0" aria-hidden />
      <span className="flex min-w-0 flex-1 flex-col">
        <span className="font-semibold">{title}</span>
        {description && <span className="text-sm text-muted-foreground">{description}</span>}
      </span>
      {trailing}
      <ChevronRight className="size-6 shrink-0" aria-hidden />
    </Link>
  )
}
