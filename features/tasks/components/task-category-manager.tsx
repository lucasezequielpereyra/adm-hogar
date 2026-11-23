"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import { Pencil, Plus, Trash } from "pixelarticons/react"
import { useState, useTransition } from "react"
import { Controller, useForm } from "react-hook-form"
import { toast } from "sonner"
import { ColorPicker } from "@/components/form/color-picker"
import { FormField } from "@/components/form/form-field"
import { IconPicker } from "@/components/form/icon-picker"
import { Panel } from "@/components/pixel/panel"
import { Button } from "@/components/ui/button"
import { Drawer, DrawerContent, DrawerDescription, DrawerHeader, DrawerTitle } from "@/components/ui/drawer"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { isPaletteKey } from "@/lib/palette"
import { deleteTaskCategory, saveTaskCategory } from "../actions"
import { taskCategorySchema, type TaskCategoryValues } from "../schemas"
import type { TaskCategoryNode, TaskCategoryRow } from "../types"
import { CategoryLabel } from "./category-label"

type Editing = { id: string | null; values: TaskCategoryValues; parentName?: string } | null

export function TaskCategoryManager({ tree }: { tree: TaskCategoryNode[] }) {
  const [editing, setEditing] = useState<Editing>(null)

  const editValues = (c: TaskCategoryRow): TaskCategoryValues => ({
    name: c.name,
    parent_id: c.parent_id,
    icon: c.icon,
    color: isPaletteKey(c.color) ? c.color : "gris",
  })

  return (
    <div className="flex flex-col gap-6">
      <Button
        className="self-start"
        onClick={() => setEditing({ id: null, values: { name: "", parent_id: null, icon: "box", color: "gris" } })}
      >
        <Plus aria-hidden /> Nueva categoría
      </Button>

      {tree.map((root) => (
        <Panel key={root.id}>
          <div className="flex items-center gap-2">
            <CategoryLabel category={root} className="flex-1 text-base font-semibold" />
            <Button variant="ghost" size="icon-sm" aria-label={`Editar ${root.name}`} onClick={() => setEditing({ id: root.id, values: editValues(root) })}>
              <Pencil aria-hidden />
            </Button>
          </div>
          <ul className="mt-2 flex flex-col gap-1 pl-7">
            {root.children.map((c) => (
              <li key={c.id} className="flex items-center gap-2">
                <span className="flex-1">{c.name}</span>
                <Button
                  variant="ghost"
                  size="icon-xs"
                  aria-label={`Editar ${c.name}`}
                  onClick={() => setEditing({ id: c.id, values: editValues(c), parentName: root.name })}
                >
                  <Pencil aria-hidden />
                </Button>
              </li>
            ))}
          </ul>
          <Button
            variant="link"
            className="mt-3 ml-7"
            onClick={() =>
              setEditing({
                id: null,
                parentName: root.name,
                values: { name: "", parent_id: root.id, icon: root.icon, color: isPaletteKey(root.color) ? root.color : "gris" },
              })
            }
          >
            + Subcategoría
          </Button>
        </Panel>
      ))}

      <Drawer open={!!editing} onOpenChange={(o) => !o && setEditing(null)} repositionInputs={false}>
        <DrawerContent>
          <DrawerHeader>
            <DrawerTitle>
              {editing?.id ? "Editar" : editing?.values.parent_id ? "Nueva subcategoría" : "Nueva categoría"}
            </DrawerTitle>
            <DrawerDescription>{editing?.parentName ? `Dentro de ${editing.parentName}` : "Categoría principal"}</DrawerDescription>
          </DrawerHeader>
          <div className="overflow-y-auto px-5 pt-1 pb-8">
            {editing && <CategoryForm key={editing.id ?? "nueva"} editing={editing} onDone={() => setEditing(null)} />}
          </div>
        </DrawerContent>
      </Drawer>
    </div>
  )
}

function CategoryForm({ editing, onDone }: { editing: NonNullable<Editing>; onDone: () => void }) {
  const [pending, startTransition] = useTransition()
  const form = useForm<TaskCategoryValues>({ resolver: zodResolver(taskCategorySchema), defaultValues: editing.values })
  const { errors } = form.formState
  const isChild = !!editing.values.parent_id

  return (
    <form
      noValidate
      className="flex flex-col gap-5"
      onSubmit={form.handleSubmit((v) =>
        startTransition(async () => {
          const res = await saveTaskCategory(editing.id, v)
          if (res.ok) {
            toast.success("Categoría guardada")
            onDone()
          } else toast.error(res.error)
        }),
      )}
    >
      <FormField id="cat-name" label="Nombre" error={errors.name?.message}>
        <Input id="cat-name" aria-invalid={!!errors.name} {...form.register("name")} />
      </FormField>
      {!isChild && (
        <>
          <div className="flex flex-col gap-3">
            <Label>Ícono</Label>
            <Controller control={form.control} name="icon" render={({ field }) => <IconPicker value={field.value} onChange={field.onChange} />} />
          </div>
          <div className="flex flex-col gap-3">
            <Label>Color</Label>
            <Controller control={form.control} name="color" render={({ field }) => <ColorPicker value={field.value} onChange={field.onChange} />} />
          </div>
        </>
      )}
      <div className="flex gap-4">
        <Button type="submit" disabled={pending} className="flex-1">
          {pending ? "Guardando…" : "Guardar"}
        </Button>
        {editing.id && (
          <Button
            type="button"
            variant="destructive"
            size="icon"
            aria-label="Borrar categoría"
            disabled={pending}
            onClick={() => {
              if (!confirm(isChild ? "¿Borrar esta subcategoría?" : "¿Borrar la categoría y sus subcategorías? Las tareas quedan sin categoría.")) return
              startTransition(async () => {
                const res = await deleteTaskCategory(editing.id!)
                if (res.ok) {
                  toast.success("Categoría borrada")
                  onDone()
                } else toast.error(res.error)
              })
            }}
          >
            <Trash aria-hidden />
          </Button>
        )}
      </div>
    </form>
  )
}
