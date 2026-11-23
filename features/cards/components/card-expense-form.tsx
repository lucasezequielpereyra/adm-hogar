"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import { Trash } from "pixelarticons/react"
import { useState, useTransition } from "react"
import { Controller, useForm, useWatch } from "react-hook-form"
import { toast } from "sonner"
import { FormField } from "@/components/form/form-field"
import { Money } from "@/components/pixel/money"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Textarea } from "@/components/ui/textarea"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import { CategorySelect } from "@/features/categories/components/category-select"
import type { CategoryOption } from "@/features/categories/types"
import { monthLabel, shortDate } from "@/lib/domain/format"
import { formatAmountInput, parseAmount } from "@/lib/domain/money"
import { cardStatementPeriod, periodClosing, planInstallments, suggestedStatementDates } from "@/lib/domain/periods"
import { paletteVar } from "@/lib/palette"
import { deleteCardExpense, saveCardExpense } from "../actions"
import { cardExpenseSchema, statementDatesSchema, type CardExpenseValues } from "../schemas"
import type { Card, CardExpense, CardStatement } from "../types"

const QUICK_INSTALLMENTS = [1, 3, 6, 12]

export type ExpensePrefill = Partial<CardExpenseValues> & { fromPendingId?: string; pendingName?: string }

export function CardExpenseForm({
  expense,
  prefill,
  cards,
  statements,
  categories,
  today,
  defaultCurrency,
  onDone,
}: {
  expense: CardExpense | null
  prefill?: ExpensePrefill | null
  cards: Card[]
  /** Resúmenes cargados (cierres reales), para saber a qué resumen va el gasto. */
  statements: CardStatement[]
  categories: CategoryOption[]
  today: string
  defaultCurrency: "ARS" | "USD"
  onDone: () => void
}) {
  const [pending, startTransition] = useTransition()
  const activeCards = cards.filter((c) => c.is_active || c.id === expense?.card_id)
  const form = useForm<CardExpenseValues>({
    resolver: zodResolver(cardExpenseSchema),
    defaultValues: expense
      ? {
          description: expense.description,
          amount: formatAmountInput(expense.amount),
          currency: expense.currency as CardExpenseValues["currency"],
          purchase_date: expense.purchase_date,
          card_id: expense.card_id,
          installments_count: expense.installments_count,
          category_id: expense.category_source === "user" ? expense.category_id : null,
          is_private: expense.is_private,
          notes: expense.notes ?? "",
        }
      : {
          description: "",
          amount: "",
          currency: defaultCurrency,
          purchase_date: today,
          card_id: activeCards[0]?.id ?? "",
          installments_count: 1,
          category_id: null,
          is_private: false,
          notes: "",
          ...prefill,
        },
  })
  const { errors } = form.formState
  const [cardId, date, amount, count, currency] = useWatch({
    control: form.control,
    name: ["card_id", "purchase_date", "amount", "installments_count", "currency"],
  })
  const card = cards.find((c) => c.id === cardId)
  const own = card ? statements.filter((s) => s.card_id === card.id) : []
  const validDate = /^\d{4}-\d{2}-\d{2}$/.test(date ?? "")

  // Primer gasto de un resumen nuevo (el abierto o uno futuro) sin fechas
  // cargadas: se preguntan el cierre y el vencimiento reales.
  const period = card && validDate ? cardStatementPeriod(date, card.closing_day, own) : null
  const openPeriod = card ? cardStatementPeriod(today, card.closing_day, own) : null
  const askDates = !expense && !!card && !!period && !!openPeriod && period >= openPeriod && !own.some((s) => s.period === period)
  const [datesByKey, setDatesByKey] = useState<Record<string, { closing: string; due: string }>>({})
  const [datesError, setDatesError] = useState<string | null>(null)
  const datesKey = `${cardId}|${period}`
  const suggested = askDates && card && period ? suggestedStatementDates(period, card.closing_day, card.due_day, own) : null
  const dates = askDates ? (datesByKey[datesKey] ?? suggested) : null
  const setDates = (patch: Partial<{ closing: string; due: string }>) => {
    if (!dates) return
    setDatesError(null)
    setDatesByKey((m) => ({ ...m, [datesKey]: { ...dates, ...patch } }))
  }
  // Con las fechas que se están cargando, para que la vista previa coincida con lo que se guarda.
  const effective =
    askDates && period && dates ? [...own, { period, closing_date: dates.closing, due_date: dates.due }] : own

  const total = parseAmount(amount)
  const plan =
    card && validDate && total && total > 0 && count >= 1 && count <= 60
      ? planInstallments(date, card.closing_day, total, count, effective)
      : null

  if (activeCards.length === 0) {
    return <p>Primero cargá una tarjeta en Más → Tarjetas.</p>
  }

  return (
    <form
      noValidate
      className="flex flex-col gap-5"
      onSubmit={form.handleSubmit((v) => {
        let statement = null
        if (askDates && period && dates) {
          const st = statementDatesSchema.safeParse({ period, closing_date: dates.closing, due_date: dates.due })
          if (!st.success) {
            setDatesError(st.error.issues[0]?.message ?? "Revisá las fechas del resumen.")
            return
          }
          statement = st.data
        }
        startTransition(async () => {
          const res = await saveCardExpense(expense?.id ?? null, v, prefill?.fromPendingId, statement)
          if (res.ok) {
            toast.success(expense ? "Gasto actualizado" : "Gasto cargado")
            onDone()
          } else toast.error(res.error)
        })
      })}
    >
      {prefill?.pendingName && (
        <p className="bg-accent p-3 text-sm pixel-frame mx-[3px]">Desde la compra pendiente “{prefill.pendingName}”.</p>
      )}
      <FormField id="ce-desc" label="Descripción" error={errors.description?.message} hint="Como figura en el resumen, ej. MERPAGO*RAPPI">
        <Input id="ce-desc" autoFocus={!expense && !prefill} aria-invalid={!!errors.description} {...form.register("description")} />
      </FormField>

      <div className="grid grid-cols-[1fr_auto] items-end gap-4">
        <FormField id="ce-amount" label="Monto total" error={errors.amount?.message}>
          <Input id="ce-amount" inputMode="decimal" aria-invalid={!!errors.amount} {...form.register("amount")} />
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
        <FormField id="ce-date" label="Fecha" error={errors.purchase_date?.message}>
          <Input id="ce-date" type="date" aria-invalid={!!errors.purchase_date} {...form.register("purchase_date")} />
        </FormField>
        <FormField id="ce-card" label="Tarjeta" error={errors.card_id?.message}>
          <Controller
            control={form.control}
            name="card_id"
            render={({ field }) => (
              <Select value={field.value} onValueChange={field.onChange}>
                <SelectTrigger id="ce-card" aria-invalid={!!errors.card_id}>
                  <SelectValue placeholder="Elegí" />
                </SelectTrigger>
                <SelectContent>
                  {activeCards.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      <span className="inline-block size-3" style={{ background: paletteVar(c.color) }} aria-hidden />
                      {c.name} {c.bank ? c.bank : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
        </FormField>
      </div>

      <div className="flex flex-col gap-3">
        <Label htmlFor="ce-count">Cuotas</Label>
        <div className="flex items-center gap-3">
          <Controller
            control={form.control}
            name="installments_count"
            render={({ field }) => (
              <>
                <ToggleGroup
                  type="single"
                  value={QUICK_INSTALLMENTS.includes(field.value) ? String(field.value) : ""}
                  onValueChange={(v) => v && field.onChange(Number(v))}
                  aria-label="Cuotas rápidas"
                >
                  {QUICK_INSTALLMENTS.map((n) => (
                    <ToggleGroupItem key={n} value={String(n)} size="sm" className="w-11 px-0">
                      {n}
                    </ToggleGroupItem>
                  ))}
                </ToggleGroup>
                <Input
                  id="ce-count"
                  type="number"
                  inputMode="numeric"
                  min={1}
                  max={60}
                  className="h-10 w-20"
                  value={Number.isNaN(field.value) ? "" : field.value}
                  onChange={(e) => field.onChange(e.target.value === "" ? Number.NaN : Number(e.target.value))}
                  aria-invalid={!!errors.installments_count}
                />
              </>
            )}
          />
        </div>
        {errors.installments_count?.message && <p className="text-sm text-ladrillo">{errors.installments_count.message}</p>}
      </div>

      {askDates && card && period && dates && (
        <fieldset className="mx-[3px] flex flex-col gap-3 bg-panel p-3 pixel-frame">
          <legend className="sr-only">Fechas del resumen</legend>
          <p className="font-semibold">
            Primer gasto del resumen de {monthLabel(period).toLowerCase()} de {card.name}: ¿cuándo cierra y cuándo vence?
          </p>
          <p className="-mt-2 text-sm text-muted-foreground">Te proponemos estas fechas; corregilas si el banco las cambió.</p>
          <div className="grid grid-cols-2 gap-4">
            <FormField id="ce-st-closing" label="Cierra">
              <Input id="ce-st-closing" type="date" value={dates.closing} onChange={(e) => setDates({ closing: e.target.value })} />
            </FormField>
            <FormField id="ce-st-due" label="Vence">
              <Input id="ce-st-due" type="date" value={dates.due} onChange={(e) => setDates({ due: e.target.value })} />
            </FormField>
          </div>
          {datesError && (
            <p role="alert" className="text-sm text-ladrillo">
              {datesError}
            </p>
          )}
        </fieldset>
      )}

      {plan && card && (
        <div className="mx-[3px] flex flex-col gap-1 bg-accent p-3 text-sm pixel-frame" aria-live="polite">
          <span>
            Entra en el resumen de <strong>{monthLabel(plan[0].period).toLowerCase()}</strong> (cierra el{" "}
            {shortDate(periodClosing(plan[0].period, card.closing_day, effective))}).
          </span>
          {plan.length > 1 && (
            <span>
              {plan.length} cuotas de <Money amount={plan[0].amount} currency={currency} />; la última en {monthLabel(plan[plan.length - 1].period).toLowerCase()}.
            </span>
          )}
        </div>
      )}

      <FormField id="ce-cat" label="Categoría" hint={expense ? "Dejala en automática para no cambiarla." : "Si no elegís, se asigna sola."}>
        <Controller
          control={form.control}
          name="category_id"
          render={({ field }) => (
            <CategorySelect id="ce-cat" value={field.value} onChange={field.onChange} categories={categories} autoLabel={expense ? "Sin cambios" : undefined} />
          )}
        />
      </FormField>

      <FormField id="ce-notes" label="Notas">
        <Textarea id="ce-notes" placeholder="Opcional" {...form.register("notes")} />
      </FormField>

      <div className="flex items-center gap-3">
        <Controller control={form.control} name="is_private" render={({ field }) => <Switch id="ce-private" checked={field.value} onCheckedChange={field.onChange} />} />
        <Label htmlFor="ce-private">Personal (solo lo ves vos)</Label>
      </div>

      <div className="flex gap-4 pt-2">
        <Button type="submit" disabled={pending} className="flex-1">
          {pending ? "Guardando…" : expense ? "Guardar cambios" : "Cargar gasto"}
        </Button>
        {expense && (
          <Button
            type="button"
            variant="destructive"
            size="icon"
            aria-label="Borrar gasto"
            disabled={pending}
            onClick={() => {
              if (!window.confirm(`¿Borrar "${expense.description}" y todas sus cuotas?`)) return
              startTransition(async () => {
                const res = await deleteCardExpense(expense.id)
                if (res.ok) {
                  toast.success("Gasto borrado")
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
