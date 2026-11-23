import { cn } from "cn"
import type { ReactNode } from "react"

/**
 * Panel tipo "caja de diálogo": contorno pixel con sombra dura.
 * El título usa la fuente display.
 */
export function Panel({
  title,
  action,
  tone = "panel",
  className,
  children,
  as: Tag = "section",
  ...rest
}: {
  title?: ReactNode
  action?: ReactNode
  tone?: "panel" | "alerta" | "ia"
  className?: string
  children?: ReactNode
  as?: "section" | "div" | "article"
} & Omit<React.HTMLAttributes<HTMLElement>, "title">) {
  return (
    <Tag
      className={cn(
        "mx-[3px] bg-panel p-4 text-card-foreground pixel-box",
        tone === "alerta" && "[--pixel-outline:var(--ladrillo)]",
        tone === "ia" && "[--pixel-outline:var(--uva)]",
        className,
      )}
      {...rest}
    >
      {(title || action) && (
        <header className="mb-3 flex items-center justify-between gap-3">
          {title && <h2 className="font-display text-[28px] leading-none">{title}</h2>}
          {action}
        </header>
      )}
      {children}
    </Tag>
  )
}
