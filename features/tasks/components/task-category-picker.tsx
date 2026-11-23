"use client"

import { DrawerPicker, InlinePicker, type PickerGroup } from "@/components/form/searchable-picker"
import type { TaskCategoryNode } from "../types"
import { CategoryLabel } from "./category-label"

/** Grupos para el buscador: cada categoría con sus subcategorías debajo. */
function buildGroups(tree: TaskCategoryNode[], noneLabel: string, rootLabel: (name: string) => string): PickerGroup[] {
  return [
    { key: "__none__", options: [{ value: null, label: noneLabel, keywords: noneLabel }] },
    ...tree.map((root) => ({
      key: root.id,
      options: [
        {
          value: root.id,
          label: <CategoryLabel category={{ ...root, name: rootLabel(root.name) }} className="text-base" />,
          keywords: root.name,
        },
        ...root.children.map((c) => ({
          value: c.id,
          label: <span>{c.name}</span>,
          // Incluye la categoría: buscar "michis" muestra todas sus subcategorías.
          keywords: `${root.name} ${c.name}`,
          indent: true,
        })),
      ],
    })),
  ]
}

function selectedDisplay(tree: TaskCategoryNode[], id: string | null, noneLabel: string) {
  if (!id) return <span className="text-muted-foreground">{noneLabel}</span>
  for (const root of tree) {
    if (root.id === id) return <CategoryLabel category={root} className="text-base" />
    const child = root.children.find((c) => c.id === id)
    if (child) return <CategoryLabel category={child} parent={root} className="text-base" />
  }
  return <span className="text-muted-foreground">{noneLabel}</span>
}

/** Para el formulario de tareas (dentro del drawer): se despliega en el lugar. */
export function TaskCategoryField({
  id,
  tree,
  value,
  onChange,
}: {
  id?: string
  tree: TaskCategoryNode[]
  value: string | null
  onChange: (value: string | null) => void
}) {
  return (
    <InlinePicker
      id={id}
      groups={buildGroups(tree, "Sin categoría", (n) => `${n} (general)`)}
      value={value}
      onChange={onChange}
      display={selectedDisplay(tree, value, "Sin categoría")}
      searchPlaceholder="Buscar categoría…"
    />
  )
}

/** Para filtrar la lista de tareas: se abre en un panel desde abajo. */
export function TaskCategoryFilterPicker({
  tree,
  value,
  onChange,
}: {
  tree: TaskCategoryNode[]
  value: string | null
  onChange: (value: string | null) => void
}) {
  return (
    <DrawerPicker
      title="Filtrar por categoría"
      ariaLabel="Filtrar por categoría"
      size="sm"
      groups={buildGroups(tree, "Todas las categorías", (n) => `Todo ${n}`)}
      value={value}
      onChange={onChange}
      display={selectedDisplay(tree, value, "Todas las categorías")}
      searchPlaceholder="Buscar categoría…"
    />
  )
}
