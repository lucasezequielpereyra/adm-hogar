"use client"

import { Sparkles } from "pixelarticons/react"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import type { CategoryOption } from "../types"
import { CategoryIcon } from "./category-badge"

export const AUTO = "__auto__"

/** Selector de categoría de gasto. `null` = que se categorice sola. */
export function CategorySelect({
  id,
  value,
  onChange,
  categories,
  autoLabel = "Automática (se asigna sola)",
}: {
  id?: string
  value: string | null
  onChange: (v: string | null) => void
  categories: CategoryOption[]
  autoLabel?: string
}) {
  return (
    <Select value={value ?? AUTO} onValueChange={(v) => onChange(v === AUTO ? null : v)}>
      <SelectTrigger id={id}>
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value={AUTO}>
          <Sparkles aria-hidden className="text-uva" /> {autoLabel}
        </SelectItem>
        {categories
          .filter((c) => !c.is_system)
          .map((c) => (
            <SelectItem key={c.id} value={c.id}>
              <CategoryIcon category={c} /> {c.name}
            </SelectItem>
          ))}
      </SelectContent>
    </Select>
  )
}
