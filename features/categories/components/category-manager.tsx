"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import { Pencil, Plus, Trash } from "pixelarticons/react"
import { useState, useTransition } from "react"
import { Controller, useForm } from "react-hook-form"
import { toast } from "sonner"
import { ColorPicker } from "@/components/form/color-picker"
import { FormField } from "@/components/form/form-field"
import { IconPicker } from "@/components/form/icon-picker"
import { Button } from "@/components/ui/button"
import { Drawer, DrawerContent, DrawerDescription, DrawerHeader, DrawerTitle } from "@/components/ui/drawer"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { isPaletteKey } from "@/lib/palette"
import { deleteCategory, saveCategory } from "../actions"
import { categorySchema, type CategoryValues } from "../schemas"
import type { CategoryOption } from "../types"
import { CategoryIcon } from "./category-badge"

type Editing = { category: CategoryOption | null } | null

export function CategoryManager({ categories }: { categories: CategoryOption[] }) {
  const [editing, setEditing] = useState<Editing>(null)
  return (
    <div className="flex flex-col gap-5">
      <Button className="self-start" onClick={() => setEditing({ category: null })}>
        <Plus aria-hidden /> Nueva categoría
      </Button>
      <ul className="flex flex-col gap-4">
        {categories.map((c) => (
          <li key={c.id}>
            <button
              type="button"
              onClick={() => setEditing({ category: c })}
              className="mx-[3px] flex w-[calc(100%-6px)] items-start gap-3 bg-panel p-3 text-left pixel-block active:pixel-pressed"
            >
              <CategoryIcon category={c} size={28} />
              <span className="flex min-w-0 flex-1 flex-col">
                <span className="font-semibold">{c.name}</span>
                {c.description && <span className="line-clamp-2 text-sm text-muted-foreground">{c.description}</span>}
              </span>
              <Pencil className="size-5 shrink-0" aria-hidden />
            </button>
          </li>
        ))}
      </ul>
      <Drawer open={!!editing} onOpenChange={(o) => !o && setEditing(null)} repositionInputs={false}>
        <DrawerContent>
          <DrawerHeader>
            <DrawerTitle>{editing?.category ? "Editar categoría" : "Nueva categoría"}</DrawerTitle>
            <DrawerDescription>La descripción ayuda a la IA a decidir qué gastos van acá.</DrawerDescription>
          </DrawerHeader>
          <div className="overflow-y-auto px-5 pt-1 pb-8">
            {editing && <CategoryForm key={editing.category?.id ?? "nueva"} category={editing.category} onDone={() => setEditing(null)} />}
          </div>
        </DrawerContent>
      </Drawer>
    </div>
  )
}

function CategoryForm({ category, onDone }: { category: CategoryOption | null; onDone: () => void }) {
  const [pending, startTransition] = useTransition()
  const form = useForm<CategoryValues>({
    resolver: zodResolver(categorySchema),
    defaultValues: {
      name: category?.name ?? "",
      icon: category?.icon ?? "box",
      color: category && isPaletteKey(category.color) ? category.color : "gris",
      description: category?.description ?? "",
    },
  })
  const { errors } = form.formState
  return (
    <form
      noValidate
      className="flex flex-col gap-5"
      onSubmit={form.handleSubmit((v) =>
        startTransition(async () => {
          const res = await saveCategory(category?.id ?? null, v)
          if (res.ok) {
            toast.success("Categoría guardada")
            onDone()
          } else toast.error(res.error)
        }),
      )}
    >
      <FormField id="ecat-name" label="Nombre" error={errors.name?.message}>
        <Input id="ecat-name" aria-invalid={!!errors.name} {...form.register("name")} />
      </FormField>
      <FormField id="ecat-desc" label="Qué incluye" error={errors.description?.message} hint="Ej: Nafta, SUBE, Uber, peajes.">
        <Textarea id="ecat-desc" {...form.register("description")} />
      </FormField>
      <div className="flex flex-col gap-3">
        <Label>Ícono</Label>
        <Controller control={form.control} name="icon" render={({ field }) => <IconPicker value={field.value} onChange={field.onChange} />} />
      </div>
      <div className="flex flex-col gap-3">
        <Label>Color</Label>
        <Controller control={form.control} name="color" render={({ field }) => <ColorPicker value={field.value} onChange={field.onChange} />} />
      </div>
      <div className="flex gap-4">
        <Button type="submit" disabled={pending} className="flex-1">
          {pending ? "Guardando…" : "Guardar"}
        </Button>
        {category && !category.is_system && (
          <Button
            type="button"
            variant="destructive"
            size="icon"
            aria-label="Borrar categoría"
            disabled={pending}
            onClick={() => {
              if (!window.confirm(`¿Borrar "${category.name}"? Sus gastos pasan a "Sin categorizar".`)) return
              startTransition(async () => {
                const res = await deleteCategory(category.id)
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
