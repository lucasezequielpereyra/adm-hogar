"use client"

import { cn } from "cn"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { Calendar, Check, ChevronDown, Lock, Plus, Undo } from "pixelarticons/react"
import { useEffect, useState, useTransition } from "react"
import { toast } from "sonner"
import { FormField } from "@/components/form/form-field"
import { Money } from "@/components/pixel/money"
import { Button } from "@/components/ui/button"
import { Drawer, DrawerContent, DrawerDescription, DrawerHeader, DrawerTitle } from "@/components/ui/drawer"
import { Input } from "@/components/ui/input"
import { CategoryChip } from "@/features/categories/components/category-chip"
import type { CategoryOption } from "@/features/categories/types"
import { monthLabel, shortDate } from "@/lib/domain/format"
import { paletteVar } from "@/lib/palette"
import { setStatementDates, setStatementPaid } from "../actions"
import { statementDatesSchema } from "../schemas"
import type { Card, CardExpense, CardPeriod, CardStatement, InstallmentRow, MoneyByCurrency } from "../types"
import { CardExpenseForm, type ExpensePrefill } from "./card-expense-form"

export type CardGroup = {
  info: CardPeriod
  rows: InstallmentRow[]
  totals: MoneyByCurrency
  /** Grupales (compartidos) e individuales (personales propios). */
  split: { shared: MoneyByCurrency; personal: MoneyByCurrency }
}

export function CardsView({
  groups,
  cards,
  statements,
  categories,
  today,
  defaultCurrency,
  prefill,
  expandAll = false,
}: {
  groups: CardGroup[]
  cards: Card[]
  statements: CardStatement[]
  categories: CategoryOption[]
  today: string
  defaultCurrency: "ARS" | "USD"
  prefill: ExpensePrefill | null
  /** Con el filtro "a revisar" se abren todas (si no, parece vacío). */
  expandAll?: boolean
}) {
  const [editor, setEditor] = useState<{ open: boolean; expense: CardExpense | null; prefill: ExpensePrefill | null }>({
    open: false,
    expense: null,
    prefill: null,
  })
  const [datesFor, setDatesFor] = useState<CardPeriod | null>(null)
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  useEffect(() => {
    if (searchParams.get("nuevo") === "1") {
      setEditor({ open: true, expense: null, prefill })
      const p = new URLSearchParams(searchParams)
      p.delete("nuevo")
      p.delete("desde")
      router.replace(p.size ? `${pathname}?${p}` : pathname, { scroll: false })
    }
  }, [searchParams, router, pathname, prefill])

  const close = () => setEditor((s) => ({ ...s, open: false }))

  return (
    <>
      <Button className="self-start" onClick={() => setEditor({ open: true, expense: null, prefill: null })}>
        <Plus aria-hidden /> Cargar gasto
      </Button>

      {groups.map((g) => (
        <CardSection
          key={`${g.info.card.id}-${g.info.period}`}
          group={g}
          categories={categories}
          today={today}
          defaultOpen={expandAll && g.rows.length > 0}
          onEditExpense={(expense) => setEditor({ open: true, expense, prefill: null })}
          onEditDates={() => setDatesFor(g.info)}
        />
      ))}

      <Drawer open={editor.open} onOpenChange={(o) => !o && close()} repositionInputs={false}>
        <DrawerContent>
          <DrawerHeader>
            <DrawerTitle>{editor.expense ? "Editar gasto" : "Gasto de tarjeta"}</DrawerTitle>
            <DrawerDescription className="sr-only">Datos del gasto de tarjeta.</DrawerDescription>
          </DrawerHeader>
          <div className="overflow-y-auto px-5 pt-1 pb-8">
            {editor.open && (
              <CardExpenseForm
                key={editor.expense?.id ?? editor.prefill?.fromPendingId ?? "nuevo"}
                expense={editor.expense}
                prefill={editor.prefill}
                cards={cards}
                statements={statements}
                categories={categories}
                today={today}
                defaultCurrency={defaultCurrency}
                onDone={close}
              />
            )}
          </div>
        </DrawerContent>
      </Drawer>

      <Drawer open={!!datesFor} onOpenChange={(o) => !o && setDatesFor(null)} repositionInputs={false}>
        <DrawerContent>
          <DrawerHeader>
            <DrawerTitle>Fechas del resumen</DrawerTitle>
            <DrawerDescription>
              {datesFor && `${datesFor.card.name}, resumen de ${monthLabel(datesFor.period).toLowerCase()}.`} Si cambiás el cierre, las
              compras se acomodan solas.
            </DrawerDescription>
          </DrawerHeader>
          <div className="overflow-y-auto px-5 pt-1 pb-8">
            {datesFor && <StatementDatesForm key={`${datesFor.card.id}-${datesFor.period}`} info={datesFor} onDone={() => setDatesFor(null)} />}
          </div>
        </DrawerContent>
      </Drawer>
    </>
  )
}

function Totals({ totals, size = "lg" }: { totals: MoneyByCurrency; size?: "lg" | "sm" }) {
  return (
    <>
      <Money amount={totals.ARS ?? 0} display decimals={false} className={size === "lg" ? "text-2xl" : "text-base"} />
      {totals.USD ? <Money amount={totals.USD} currency="USD" display className={size === "lg" ? "text-lg" : "text-sm"} /> : null}
    </>
  )
}

/** Monto corto por moneda: "$ 12.000 + US$ 30". */
function Inline({ totals }: { totals: MoneyByCurrency }) {
  return (
    <>
      <Money amount={totals.ARS ?? 0} decimals={false} />
      {totals.USD ? (
        <>
          {" + "}
          <Money amount={totals.USD} currency="USD" />
        </>
      ) : null}
    </>
  )
}

function CardSection({
  group,
  categories,
  today,
  defaultOpen,
  onEditExpense,
  onEditDates,
}: {
  group: CardGroup
  categories: CategoryOption[]
  today: string
  defaultOpen: boolean
  onEditExpense: (expense: CardExpense) => void
  onEditDates: () => void
}) {
  const { info, rows, totals, split } = group
  const [open, setOpen] = useState(defaultOpen)
  const [pending, startTransition] = useTransition()
  const closed = info.closing < today
  const paidAt = info.statement?.paid_at ?? null
  const hasPersonal = Object.values(split.personal).some((v) => v && v > 0)
  const contentId = `card-${info.card.id}-${info.period}`

  const togglePaid = (paid: boolean) =>
    startTransition(async () => {
      const res = await setStatementPaid(info.card.id, info.period, paid, today)
      if (res.ok) toast.success(paid ? `Resumen de ${info.card.name} pagado` : "Pago deshecho")
      else toast.error(res.error)
    })

  return (
    <section className="mx-[3px] bg-panel pixel-box" aria-label={`${info.card.name} ${info.card.bank ?? ""}`}>
      <button
        type="button"
        aria-expanded={open}
        aria-controls={contentId}
        onClick={() => setOpen((o) => !o)}
        className={cn("flex w-full items-start gap-3 p-4 text-left", open && "border-b-[3px] border-tinta")}
        style={{ boxShadow: `inset 8px 0 0 0 ${paletteVar(info.card.color)}` }}
      >
        <span className="flex min-w-0 flex-1 flex-col gap-1 pl-2">
          <span className="truncate font-display text-[26px] leading-none">
            {info.card.name} {info.card.bank}
            {info.card.last4 && <span className="text-muted-foreground"> ·{info.card.last4}</span>}
          </span>
          <span className="text-sm text-muted-foreground">
            {monthLabel(info.period)} · cierra {shortDate(info.closing)} · vence {shortDate(info.due)}
          </span>
          {closed && rows.length > 0 && (
            <span
              className={cn(
                "inline-flex w-fit items-center gap-1 px-1.5 text-sm font-semibold",
                paidAt ? "bg-pasto text-tinta" : "bg-ladrillo text-white dark:text-tinta",
              )}
            >
              {paidAt ? (
                <>
                  <Check className="size-4" aria-hidden /> Pagado {shortDate(paidAt)}
                </>
              ) : (
                "Sin pagar"
              )}
            </span>
          )}
          {hasPersonal && (
            <span className="text-sm">
              Grupales <Inline totals={split.shared} /> · Individuales <Inline totals={split.personal} />
            </span>
          )}
        </span>
        <span className="flex flex-col items-end gap-1">
          <Totals totals={totals} />
          <span className="flex items-center gap-1 text-sm text-muted-foreground">
            {rows.length} {rows.length === 1 ? "gasto" : "gastos"}
            <ChevronDown className={cn("size-5", open && "rotate-180")} aria-hidden />
          </span>
        </span>
      </button>

      {open && (
        <div id={contentId}>
          <div className="flex flex-wrap items-center gap-3 border-b-[3px] border-tinta/10 px-4 py-3 dark:border-white/10">
            {closed && rows.length > 0 &&
              (paidAt ? (
                <Button size="sm" variant="outline" disabled={pending} onClick={() => togglePaid(false)}>
                  <Undo aria-hidden /> Deshacer pago
                </Button>
              ) : (
                <Button size="sm" variant="success" disabled={pending} onClick={() => togglePaid(true)}>
                  <Check aria-hidden /> Marcar como pagado
                </Button>
              ))}
            <Button size="sm" variant="ghost" onClick={onEditDates}>
              <Calendar aria-hidden /> Fechas
            </Button>
          </div>
          {rows.length === 0 ? (
            <p className="p-4 text-muted-foreground">Sin gastos en este resumen.</p>
          ) : (
            <ul className="flex flex-col divide-y-[3px] divide-tinta/10 px-4 dark:divide-white/10">
              {rows.map((r) => (
                <li key={r.id} className="flex flex-col gap-1.5 py-3">
                  <button type="button" className="flex items-start gap-3 text-left" onClick={() => onEditExpense(r.expense)}>
                    <span className="flex min-w-0 flex-1 flex-col">
                      <span className="truncate font-semibold">
                        {r.expense.description}
                        {r.installments_count > 1 && (
                          <span className="ml-2 bg-secondary px-1 text-sm font-normal">
                            {r.installment_number}/{r.installments_count}
                          </span>
                        )}
                      </span>
                      <span className="flex items-center gap-2 text-sm text-muted-foreground">
                        {shortDate(r.expense.purchase_date)}
                        {r.expense.is_private && (
                          <span className="inline-flex items-center gap-1">
                            <Lock className="size-4" aria-hidden /> Personal
                          </span>
                        )}
                      </span>
                    </span>
                    <span className="flex flex-col items-end">
                      <Money amount={r.amount} currency={r.currency as "ARS" | "USD"} className="font-semibold" />
                      {r.installments_count > 1 && (
                        <span className="text-xs text-muted-foreground">
                          de <Money amount={r.expense.amount} currency={r.currency as "ARS" | "USD"} />
                        </span>
                      )}
                    </span>
                  </button>
                  <CategoryChip
                    entityType="card_expense"
                    entityId={r.expense.id}
                    categories={categories}
                    state={{ ...r.expense, ai_confidence: r.expense.ai_confidence === null ? null : Number(r.expense.ai_confidence) }}
                  />
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </section>
  )
}

function StatementDatesForm({ info, onDone }: { info: CardPeriod; onDone: () => void }) {
  const [closing, setClosing] = useState(info.closing)
  const [due, setDue] = useState(info.due)
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  return (
    <form
      noValidate
      className="flex flex-col gap-5"
      onSubmit={(e) => {
        e.preventDefault()
        const parsed = statementDatesSchema.safeParse({ period: info.period, closing_date: closing, due_date: due })
        if (!parsed.success) {
          setError(parsed.error.issues[0]?.message ?? "Revisá las fechas.")
          return
        }
        startTransition(async () => {
          const res = await setStatementDates(info.card.id, parsed.data)
          if (res.ok) {
            toast.success("Fechas guardadas")
            onDone()
          } else toast.error(res.error)
        })
      }}
    >
      <div className="grid grid-cols-2 gap-4">
        <FormField id="st-closing" label="Cierra">
          <Input id="st-closing" type="date" value={closing} onChange={(e) => {
              setError(null)
              setClosing(e.target.value)
            }} />
        </FormField>
        <FormField id="st-due" label="Vence">
          <Input id="st-due" type="date" value={due} onChange={(e) => {
              setError(null)
              setDue(e.target.value)
            }} />
        </FormField>
      </div>
      {error && (
        <p role="alert" className="text-sm text-ladrillo">
          {error}
        </p>
      )}
      <Button type="submit" disabled={pending}>
        {pending ? "Guardando…" : "Guardar fechas"}
      </Button>
    </form>
  )
}
