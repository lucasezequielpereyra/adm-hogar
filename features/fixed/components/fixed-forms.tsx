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
import { deleteFixed, payFixed, saveFixed } from "../actions"
import { fixedSchema, PAYMENT_METHODS, paymentSchema, type FixedValues, type PaymentValues } from "../schemas"
import type { FixedExpense, FixedWithPayment } from "../types"

const NONE = "__none__"

export function FixedForm({
  item,
  members,
  categories,
  currentUserId,
  defaultCurrency,
  onDone,
}: {
  item: FixedExpense | null
  members: MemberOption[]
  categories: CategoryOption[]
  currentUserId: string
  defaultCurrency: "ARS" | "USD"
  onDone: () => void
}) {
  const [pending, startTransition] = useTransition()
  const form = useForm<FixedValues>({
    resolver: zodResolver(fixedSchema),
    defaultValues: item
      ? {
          name: item.name,
          amount: formatAmountInput(item.amount),
          currency: item.currency as FixedValues["currency"],
          due_day: item.due_day,
          payment_method: item.payment_method as FixedValues["payment_method"],
          responsible_id: item.responsible_id,
          category_id: item.category_source === "user" ? item.category_id : null,
          is_active: item.is_active,
          is_private: item.is_private,
          notes: item.notes ?? "",
        }
      : {
          name: "",
          amount: "",
          currency: defaultCurrency,
          due_day: 10,
          payment_method: "debito",
          responsible_id: currentUserId,
          category_id: null,
          is_active: true,
          is_private: false,
          notes: "",
        },
  })
  const { errors } = form.formState

  return (
    <form
      noValidate
      className="flex flex-col gap-5"
      onSubmit={form.handleSubmit((v) =>
        startTransition(async () => {
          const res = await saveFixed(item?.id ?? null, v)
          if (res.ok) {
            toast.success(item ? "Gasto fijo actualizado" : "Gasto fijo creado")
            onDone()
          } else toast.error(res.error)
        }),
      )}
    >
      <FormField id="fx-name" label="Nombre" error={errors.name?.message} hint="Alquiler, expensas, luz, internet…">
        <Input id="fx-name" autoFocus={!item} aria-invalid={!!errors.name} {...form.register("name")} />
      </FormField>
      <div className="grid grid-cols-[1fr_auto] items-end gap-4">
        <FormField id="fx-amount" label="Monto de referencia" error={errors.amount?.message}>
          <Input id="fx-amount" inputMode="decimal" aria-invalid={!!errors.amount} {...form.register("amount")} />
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
      <div className="grid grid-cols-2 gap-4">
        <FormField id="fx-day" label="Vence el día" error={errors.due_day?.message}>
          <Controller
            control={form.control}
            name="due_day"
            render={({ field }) => (
              <Input
                id="fx-day"
                type="number"
                inputMode="numeric"
                min={1}
                max={31}
                value={Number.isNaN(field.value) ? "" : field.value}
                onChange={(e) => field.onChange(e.target.value === "" ? Number.NaN : Number(e.target.value))}
                aria-invalid={!!errors.due_day}
              />
            )}
          />
        </FormField>
        <FormField id="fx-method" label="Cómo se paga">
          <Controller
            control={form.control}
            name="payment_method"
            render={({ field }) => (
              <Select value={field.value} onValueChange={field.onChange}>
                <SelectTrigger id="fx-method">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(PAYMENT_METHODS).map(([k, label]) => (
                    <SelectItem key={k} value={k}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
        </FormField>
      </div>
      <FormField id="fx-cat" label="Categoría" hint={item ? "Dejala en automática para no cambiarla." : "Si no elegís, se asigna sola."}>
        <Controller
          control={form.control}
          name="category_id"
          render={({ field }) => (
            <CategorySelect id="fx-cat" value={field.value} onChange={field.onChange} categories={categories} autoLabel={item ? "Sin cambios" : undefined} />
          )}
        />
      </FormField>
      <FormField id="fx-resp" label="Responsable">
        <Controller
          control={form.control}
          name="responsible_id"
          render={({ field }) => (
            <Select value={field.value ?? NONE} onValueChange={(v) => field.onChange(v === NONE ? null : v)}>
              <SelectTrigger id="fx-resp">
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
      <FormField id="fx-notes" label="Notas">
        <Textarea id="fx-notes" placeholder="Nro. de cliente, CBU…" {...form.register("notes")} />
      </FormField>
      <div className="flex items-center gap-3">
        <Controller control={form.control} name="is_active" render={({ field }) => <Switch id="fx-active" checked={field.value} onCheckedChange={field.onChange} />} />
        <Label htmlFor="fx-active">Activo</Label>
      </div>
      <div className="flex items-center gap-3">
        <Controller control={form.control} name="is_private" render={({ field }) => <Switch id="fx-private" checked={field.value} onCheckedChange={field.onChange} />} />
        <Label htmlFor="fx-private">Personal (solo lo ves vos)</Label>
      </div>
      <div className="flex gap-4 pt-2">
        <Button type="submit" disabled={pending} className="flex-1">
          {pending ? "Guardando…" : item ? "Guardar cambios" : "Crear gasto fijo"}
        </Button>
        {item && (
          <Button
            type="button"
            variant="destructive"
            size="icon"
            aria-label="Borrar gasto fijo"
            disabled={pending}
            onClick={() => {
              if (!window.confirm(`¿Borrar "${item.name}" y su historial de pagos?`)) return
              startTransition(async () => {
                const res = await deleteFixed(item.id)
                if (res.ok) {
                  toast.success("Gasto fijo borrado")
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

export function PaymentForm({
  item,
  period,
  today,
  onDone,
}: {
  item: FixedWithPayment
  period: string
  today: string
  onDone: () => void
}) {
  const [pending, startTransition] = useTransition()
  const form = useForm<PaymentValues>({
    resolver: zodResolver(paymentSchema),
    defaultValues: {
      amount: formatAmountInput(item.payment?.amount ?? item.amount),
      paid_at: item.payment?.paid_at ?? (today.slice(0, 7) === period.slice(0, 7) ? today : item.dueDate),
      notes: item.payment?.notes ?? "",
    },
  })
  const { errors } = form.formState
  return (
    <form
      noValidate
      className="flex flex-col gap-5"
      onSubmit={form.handleSubmit((v) =>
        startTransition(async () => {
          const res = await payFixed(item.id, period, v)
          if (res.ok) {
            toast.success(`${item.name}: pagado`)
            onDone()
          } else toast.error(res.error)
        }),
      )}
    >
      <FormField id="pay-amount" label={`Monto pagado (${item.currency === "USD" ? "US$" : "$"})`} error={errors.amount?.message} hint="Puede ser distinto del monto de referencia.">
        <Input id="pay-amount" inputMode="decimal" autoFocus aria-invalid={!!errors.amount} {...form.register("amount")} />
      </FormField>
      <FormField id="pay-date" label="Fecha de pago" error={errors.paid_at?.message}>
        <Input id="pay-date" type="date" aria-invalid={!!errors.paid_at} {...form.register("paid_at")} />
      </FormField>
      <FormField id="pay-notes" label="Notas">
        <Input id="pay-notes" placeholder="Opcional" {...form.register("notes")} />
      </FormField>
      <Button type="submit" variant="success" disabled={pending}>
        {pending ? "Guardando…" : item.payment ? "Guardar pago" : "Marcar pagado"}
      </Button>
    </form>
  )
}
