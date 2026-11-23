import { cn } from "cn"
import { categoryIcon } from "@/lib/icons"
import { paletteVar } from "@/lib/palette"
import type { CategoryOption } from "../types"

export function CategoryIcon({ category, size = 20 }: { category: Pick<CategoryOption, "icon" | "color">; size?: number }) {
  const Icon = categoryIcon(category.icon)
  return (
    <span
      aria-hidden
      className="inline-flex shrink-0 items-center justify-center text-tinta"
      style={{ background: paletteVar(category.color), width: size, height: size }}
    >
      <Icon style={{ width: size - 4, height: size - 4 }} />
    </span>
  )
}

export function CategoryBadge({ category, className }: { category: Pick<CategoryOption, "icon" | "color" | "name">; className?: string }) {
  return (
    <span className={cn("inline-flex min-w-0 items-center gap-1.5 text-sm", className)}>
      <CategoryIcon category={category} />
      <span className="truncate">{category.name}</span>
    </span>
  )
}
