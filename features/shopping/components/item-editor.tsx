"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import { Trash } from "pixelarticons/react"
import { useTransition } from "react"
import { Controller, useForm, useWatch } from "react-hook-form"
import { toast } from "sonner"
import { FormField } from "@/components/form/form-field"
import { Button } from "@/components/ui/button"
import { Drawer, DrawerContent, DrawerDescription, DrawerHeader, DrawerTitle } from "@/components/ui/drawer"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { formatAmountInput } from "@/lib/domain/money"
import { deleteItem, saveItem } from "../actions"
import { SHOPPING_CATEGORIES, UNITS } from "../constants"
import { shoppingItemSchema, type ShoppingItemValues } from "../schemas"
import type { ShoppingItem } from "../types"

export type ItemEditorState = { open: boolean; item: ShoppingItem | null }

function toValues(item: ShoppingItem | null): ShoppingItemValues {
  if (!item) {
    return { name: "", quantity: "1", unit: "u", category: "almacen", estimated_price: "", actual_price: "", is_purchased: false }
  }
  return {
    name: item.name,
    quantity: String(Number(item.quantity)).replace(".", ","),
    unit: item.unit as ShoppingItemValues["unit"],
    category: item.category as ShoppingItemValues["category"],
    estimated_price: formatAmountInput(item.estimated_price),
    actual_price: formatAmountInput(item.actual_price),
    is_purchased: item.is_purchased,
  }
}

export function ItemEditor({
  listId,
  state,
  onClose,
  allowPurchase,
}: {
  listId: string
  state: ItemEditorState
  onClose: () => void
  allowPurchase: boolean
}) {
  return (
    <Drawer open={state.open} onOpenChange={(o) => !o && onClose()} repositionInputs={false}>
      <DrawerContent>
        <DrawerHeader>
          <DrawerTitle>{state.item ? "Editar ítem" : "Nuevo ítem"}</DrawerTitle>
          <DrawerDescription className="sr-only">Datos del ítem de la compra.</DrawerDescription>
        </DrawerHeader>
        <div className="overflow-y-auto px-5 pt-1 pb-8">
          {state.open && (
            <ItemForm key={state.item?.id ?? "nuevo"} listId={listId} item={state.item} onDone={onClose} allowPurchase={allowPurchase} />
          )}
        </div>
      </DrawerContent>
    </Drawer>
  )
}

function ItemForm({
  listId,
  item,
  onDone,
  allowPurchase,
}: {
  listId: string
  item: ShoppingItem | null
  onDone: () => void
  allowPurchase: boolean
}) {
  const [pending, startTransition] = useTransition()
  const form = useForm<ShoppingItemValues>({ resolver: zodResolver(shoppingItemSchema), defaultValues: toValues(item) })
  const { errors } = form.formState
  const purchased = useWatch({ control: form.control, name: "is_purchased" })

  return (
    <form
      noValidate
      className="flex flex-col gap-5"
      onSubmit={form.handleSubmit((v) =>
        startTransition(async () => {
          const res = await saveItem(listId, item?.id ?? null, v)
          if (res.ok) {
            toast.success(item ? "Ítem actualizado" : "Ítem agregado")
            onDone()
          } else toast.error(res.error)
        }),
      )}
    >
      <FormField id="item-name" label="Qué" error={errors.name?.message}>
        <Input id="item-name" autoFocus={!item} aria-invalid={!!errors.name} {...form.register("name")} />
      </FormField>
      <div className="grid grid-cols-2 gap-4">
        <FormField id="item-qty" label="Cantidad" error={errors.quantity?.message}>
          <Input id="item-qty" inputMode="decimal" aria-invalid={!!errors.quantity} {...form.register("quantity")} />
        </FormField>
        <FormField id="item-unit" label="Unidad">
          <Controller
            control={form.control}
            name="unit"
            render={({ field }) => (
              <Select value={field.value} onValueChange={field.onChange}>
                <SelectTrigger id="item-unit">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {UNITS.map((u) => (
                    <SelectItem key={u.key} value={u.key}>
                      {u.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
        </FormField>
      </div>
      <FormField id="item-cat" label="Categoría">
        <Controller
          control={form.control}
          name="category"
          render={({ field }) => (
            <Select value={field.value} onValueChange={field.onChange}>
              <SelectTrigger id="item-cat">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {SHOPPING_CATEGORIES.map((c) => (
                  <SelectItem key={c.key} value={c.key}>
                    <c.icon aria-hidden /> {c.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        />
      </FormField>
      <FormField id="item-est" label="Precio estimado" hint="Total de la línea. Opcional." error={errors.estimated_price?.message}>
        <Input id="item-est" inputMode="decimal" placeholder="$" aria-invalid={!!errors.estimated_price} {...form.register("estimated_price")} />
      </FormField>
      {allowPurchase && (
        <>
          <div className="flex items-center gap-3">
            <Controller
              control={form.control}
              name="is_purchased"
              render={({ field }) => <Switch id="item-bought" checked={field.value} onCheckedChange={field.onChange} />}
            />
            <Label htmlFor="item-bought">Ya está comprado</Label>
          </div>
          {purchased && (
            <FormField id="item-real" label="Precio real" hint="Lo que pagaste. Si lo dejás vacío se usa el estimado." error={errors.actual_price?.message}>
              <Input id="item-real" inputMode="decimal" placeholder="$" aria-invalid={!!errors.actual_price} {...form.register("actual_price")} />
            </FormField>
          )}
        </>
      )}
      <div className="flex gap-4 pt-2">
        <Button type="submit" disabled={pending} className="flex-1">
          {pending ? "Guardando…" : item ? "Guardar cambios" : "Agregar"}
        </Button>
        {item && (
          <Button
            type="button"
            variant="destructive"
            size="icon"
            aria-label="Borrar ítem"
            disabled={pending}
            onClick={() =>
              startTransition(async () => {
                const res = await deleteItem(item.id)
                if (res.ok) {
                  toast.success("Ítem borrado")
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
