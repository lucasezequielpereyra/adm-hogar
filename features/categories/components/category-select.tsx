"use client"

import { Sparkles } from "pixelarticons/react"
import { InlinePicker, type PickerGroup } from "@/components/form/searchable-picker"
import type { CategoryOption } from "../types"
import { CategoryIcon } from "./category-badge"

/**
 * Selector de categoría de gasto con buscador. `null` = que se categorice sola.
 * Se despliega en el lugar: los formularios viven en drawers y ahí un
 * desplegable flotante no scrollea bien con el dedo.
 */
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
  const visible = categories.filter((c) => !c.is_system)
  const auto = (
    <span className="inline-flex items-center gap-2">
      <Sparkles aria-hidden className="size-5 text-uva" /> {autoLabel}
    </span>
  )
  const groups: PickerGroup[] = [
    { key: "__auto__", options: [{ value: null, label: auto, keywords: `${autoLabel} automatica ia` }] },
    {
      key: "categorias",
      options: visible.map((c) => ({
        value: c.id,
        label: (
          <span className="inline-flex items-center gap-2">
            <CategoryIcon category={c} /> {c.name}
          </span>
        ),
        keywords: c.name,
      })),
    },
  ]
  const selected = visible.find((c) => c.id === value)
  return (
    <InlinePicker
      id={id}
      groups={groups}
      value={value}
      onChange={onChange}
      display={
        selected ? (
          <span className="inline-flex items-center gap-2">
            <CategoryIcon category={selected} /> {selected.name}
          </span>
        ) : (
          auto
        )
      }
      searchPlaceholder="Buscar categoría…"
    />
  )
}
