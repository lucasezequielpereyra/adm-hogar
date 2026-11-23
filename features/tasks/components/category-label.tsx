import { cn } from "cn"
import { categoryIcon } from "@/lib/icons"
import { paletteVar } from "@/lib/palette"
import type { TaskCategoryRow } from "../types"

/** Ícono + nombre de la categoría (y su padre, si es subcategoría). */
export function CategoryLabel({
  category,
  parent,
  className,
}: {
  category: Pick<TaskCategoryRow, "name" | "icon" | "color">
  parent?: Pick<TaskCategoryRow, "name"> | null
  className?: string
}) {
  const Icon = categoryIcon(category.icon)
  return (
    <span className={cn("inline-flex min-w-0 items-center gap-1.5 text-sm", className)}>
      <span
        className="inline-flex size-5 shrink-0 items-center justify-center text-tinta"
        style={{ background: paletteVar(category.color) }}
        aria-hidden
      >
        <Icon className="size-4" />
      </span>
      <span className="truncate">
        {parent ? `${parent.name} › ` : ""}
        {category.name}
      </span>
    </span>
  )
}
