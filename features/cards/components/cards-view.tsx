"use client"

import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { Lock, Plus } from "pixelarticons/react"
import { useEffect, useState } from "react"
import { Money } from "@/components/pixel/money"
import { Button } from "@/components/ui/button"
import { Drawer, DrawerContent, DrawerDescription, DrawerHeader, DrawerTitle } from "@/components/ui/drawer"
import { CategoryChip } from "@/features/categories/components/category-chip"
import type { CategoryOption } from "@/features/categories/types"
import { monthLabel, shortDate } from "@/lib/domain/format"
import { paletteVar } from "@/lib/palette"
import type { Card, CardExpense, CardPeriod, InstallmentRow, MoneyByCurrency } from "../types"
import { CardExpenseForm, type ExpensePrefill } from "./card-expense-form"

type Group = { info: CardPeriod; rows: InstallmentRow[]; totals: MoneyByCurrency }

export function CardsView({
  groups,
  cards,
  categories,
  today,
  defaultCurrency,
  prefill,
}: {
  groups: Group[]
  cards: Card[]
  categories: CategoryOption[]
  today: string
  defaultCurrency: "ARS" | "USD"
  prefill: ExpensePrefill | null
}) {
  const [editor, setEditor] = useState<{ open: boolean; expense: CardExpense | null; prefill: ExpensePrefill | null }>({
    open: false,
    expense: null,
    prefill: null,
  })
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

      {groups.map(({ info, rows, totals }) => (
        <section key={info.card.id} className="mx-[3px] bg-panel pixel-box" aria-label={`${info.card.name} ${info.card.bank ?? ""}`}>
          <header className="flex items-center gap-3 border-b-[3px] border-tinta p-4" style={{ boxShadow: `inset 8px 0 0 0 ${paletteVar(info.card.color)}` }}>
            <div className="flex min-w-0 flex-1 flex-col pl-2">
              <h3 className="truncate font-display text-[26px] leading-none">
                {info.card.name} {info.card.bank}
                {info.card.last4 && <span className="text-muted-foreground"> ·{info.card.last4}</span>}
              </h3>
              <p className="text-sm text-muted-foreground">
                Resumen de {monthLabel(info.period).toLowerCase()} · cierra {shortDate(info.closing)} · vence {shortDate(info.due)}
              </p>
            </div>
            <div className="flex flex-col items-end">
              <Money amount={totals.ARS ?? 0} display decimals={false} className="text-2xl" />
              {totals.USD ? <Money amount={totals.USD} currency="USD" display className="text-lg" /> : null}
            </div>
          </header>
          {rows.length === 0 ? (
            <p className="p-4 text-muted-foreground">Sin gastos en este resumen.</p>
          ) : (
            <ul className="flex flex-col divide-y-[3px] divide-tinta/10 px-4 dark:divide-white/10">
              {rows.map((r) => (
                <li key={r.id} className="flex flex-col gap-1.5 py-3">
                  <button
                    type="button"
                    className="flex items-start gap-3 text-left"
                    onClick={() => setEditor({ open: true, expense: r.expense, prefill: null })}
                  >
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
        </section>
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
                categories={categories}
                today={today}
                defaultCurrency={defaultCurrency}
                onDone={close}
              />
            )}
          </div>
        </DrawerContent>
      </Drawer>
    </>
  )
}
