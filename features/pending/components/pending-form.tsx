"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import { Trash } from "pixelarticons/react"
import { useTransition } from "react"
import { Controller, useForm } from "react-hook-form"
import { toast } from "sonner"
import { FormField } from "@/components/form/form-field"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Textarea } from "@/components/ui/textarea"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import { CategorySelect } from "@/features/categories/components/category-select"
import type { CategoryOption } from "@/features/categories/types"
import type { MemberOption } from "@/features/tasks/types"
import { formatAmountInput } from "@/lib/domain/money"
import { deletePending, savePending } from "../actions"
import { KIND_LABEL, pendingSchema, type PendingValues } from "../schemas"
import type { PendingPurchase } from "../types"

const NONE = "__none__"

function toValues(p: PendingPurchase | null, currentUserId: string, currency: "ARS" | "USD"): PendingValues {
  if (!p) {
    return {
      name: "",
      kind: "hogar",
      priority: "medium",
      estimated_price: "",
      currency,
      url: "",
      notes: "",
      requested_by: currentUserId,
      category_id: null,
      is_private: false,
    }
  }
  return {
    name: p.name,
    kind: p.kind as PendingValues["kind"],
    priority: p.priority as PendingValues["priority"],
    estimated_price: formatAmountInput(p.estimated_price),
    currency: p.currency as PendingValues["currency"],
    url: p.url ?? "",
    notes: p.notes ?? "",
    requested_by: p.requested_by,
    // Al editar, "automática" significa "no cambiarla".
    category_id: p.category_source === "user" ? p.category_id : null,
    is_private: p.is_private,
  }
}

export function PendingForm({
  item,
  members,
  categories,
  currentUserId,
  defaultCurrency,
  onDone,
}: {
  item: PendingPurchase | null
  members: MemberOption[]
  categories: CategoryOption[]
  currentUserId: string
  defaultCurrency: "ARS" | "USD"
  onDone: () => void
}) {
  const [pending, startTransition] = useTransition()
  const form = useForm<PendingValues>({
    resolver: zodResolver(pendingSchema),
    defaultValues: toValues(item, currentUserId, defaultCurrency),
  })
  const { errors } = form.formState

  return (
    <form
      noValidate
      className="flex flex-col gap-5"
      onSubmit={form.handleSubmit((v) =>
        startTransition(async () => {
          const res = await savePending(item?.id ?? null, v)
          if (res.ok) {
            toast.success(item ? "Compra actualizada" : "Compra agregada")
            onDone()
          } else toast.error(res.error)
        }),
      )}
    >
      <FormField id="pp-name" label="Qué hay que comprar" error={errors.name?.message}>
        <Input id="pp-name" autoFocus={!item} aria-invalid={!!errors.name} {...form.register("name")} />
      </FormField>

      <div className="flex flex-col gap-3">
        <Label>Tipo</Label>
        <Controller
          control={form.control}
          name="kind"
          render={({ field }) => (
            <ToggleGroup
              type="single"
              value={field.value}
              onValueChange={(v) => {
                if (!v) return
                field.onChange(v)
                // Lo personal es privado por defecto (se puede compartir).
                form.setValue("is_private", v === "personal")
              }}
              aria-label="Tipo"
            >
              {(Object.keys(KIND_LABEL) as (keyof typeof KIND_LABEL)[]).map((k) => (
                <ToggleGroupItem key={k} value={k} size="sm">
                  {KIND_LABEL[k]}
                </ToggleGroupItem>
              ))}
            </ToggleGroup>
          )}
        />
      </div>

      <div className="flex flex-col gap-3">
        <Label>Prioridad</Label>
        <Controller
          control={form.control}
          name="priority"
          render={({ field }) => (
            <ToggleGroup type="single" value={field.value} onValueChange={(v) => v && field.onChange(v)} aria-label="Prioridad">
              <ToggleGroupItem value="low" size="sm">Baja</ToggleGroupItem>
              <ToggleGroupItem value="medium" size="sm">Media</ToggleGroupItem>
              <ToggleGroupItem value="high" size="sm">Alta</ToggleGroupItem>
            </ToggleGroup>
          )}
        />
      </div>

      <div className="grid grid-cols-[1fr_auto] items-end gap-4">
        <FormField id="pp-price" label="Precio estimado" error={errors.estimated_price?.message}>
          <Input id="pp-price" inputMode="decimal" placeholder="Opcional" aria-invalid={!!errors.estimated_price} {...form.register("estimated_price")} />
        </FormField>
        <Controller
          control={form.control}
          name="currency"
          render={({ field }) => (
            <ToggleGroup type="single" value={field.value} onValueChange={(v) => v && field.onChange(v)} aria-label="Moneda">
              <ToggleGroupItem value="ARS" size="sm">$</ToggleGroupItem>
              <ToggleGroupItem value="USD" size="sm">US$</ToggleGroupItem>
            </ToggleGroup>
          )}
        />
      </div>

      <FormField id="pp-cat" label="Categoría" hint={item ? "Dejala en automática para no cambiarla." : "Si no elegís, se asigna sola."}>
        <Controller
          control={form.control}
          name="category_id"
          render={({ field }) => (
            <CategorySelect
              id="pp-cat"
              value={field.value}
              onChange={field.onChange}
              categories={categories}
              autoLabel={item ? "Sin cambios" : "Automática (se asigna sola)"}
            />
          )}
        />
      </FormField>

      <FormField id="pp-who" label="Quién lo pidió">
        <Controller
          control={form.control}
          name="requested_by"
          render={({ field }) => (
            <Select value={field.value ?? NONE} onValueChange={(v) => field.onChange(v === NONE ? null : v)}>
              <SelectTrigger id="pp-who">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NONE}>Nadie en particular</SelectItem>
                {members.map((m) => (
                  <SelectItem key={m.user_id} value={m.user_id}>
                    {m.name}
                    {m.user_id === currentUserId ? " (vos)" : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        />
      </FormField>

      <FormField id="pp-url" label="Link" error={errors.url?.message}>
        <Input id="pp-url" type="url" inputMode="url" placeholder="https://" aria-invalid={!!errors.url} {...form.register("url")} />
      </FormField>

      <FormField id="pp-notes" label="Notas" error={errors.notes?.message}>
        <Textarea id="pp-notes" placeholder="Talle, color, modelo…" {...form.register("notes")} />
      </FormField>

      <div className="flex items-center gap-3">
        <Controller
          control={form.control}
          name="is_private"
          render={({ field }) => <Switch id="pp-private" checked={field.value} onCheckedChange={field.onChange} />}
        />
        <Label htmlFor="pp-private">Personal (solo la ves vos)</Label>
      </div>

      <div className="flex gap-4 pt-2">
        <Button type="submit" disabled={pending} className="flex-1">
          {pending ? "Guardando…" : item ? "Guardar cambios" : "Agregar"}
        </Button>
        {item && (
          <Button
            type="button"
            variant="destructive"
            size="icon"
            aria-label="Borrar"
            disabled={pending}
            onClick={() =>
              startTransition(async () => {
                const res = await deletePending(item.id)
                if (res.ok) {
                  toast.success("Compra borrada")
                  onDone()
                } else toast.error(res.error)
              })
            }
          >
            <Trash aria-hidden />
          </Button>
        )}
      </div>
    </form>
  )
}
