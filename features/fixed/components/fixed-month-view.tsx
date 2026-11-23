"use client"

import { cn } from "cn"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { Check, Lock, MoreVertical, Pencil, Plus, Trash, Undo } from "pixelarticons/react"
import { useEffect, useState, useTransition } from "react"
import { toast } from "sonner"
import { MemberAvatar } from "@/components/pixel/member-chip"
import { Money } from "@/components/pixel/money"
import { Panel } from "@/components/pixel/panel"
import { SegmentedBar } from "@/components/pixel/segmented-bar"
import { Button } from "@/components/ui/button"
import { Drawer, DrawerContent, DrawerDescription, DrawerHeader, DrawerTitle } from "@/components/ui/drawer"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { CategoryChip } from "@/features/categories/components/category-chip"
import type { CategoryOption } from "@/features/categories/types"
import type { MemberOption } from "@/features/tasks/types"
import { dueLabel } from "@/lib/domain/recurrence"
import { shortDate } from "@/lib/domain/format"
import { addDaysISO } from "@/lib/domain/dates"
import { undoPayment } from "../actions"
import { PAYMENT_METHODS } from "../schemas"
import type { FixedWithPayment } from "../types"
import { FixedDeleteDialog, FixedForm, PaymentForm } from "./fixed-forms"

type Totals = {
  byCurrency: Record<string, { total: number; paid: number; pending: number }>
  paidCount: number
  count: number
}

type DrawerState =
  | { kind: "edit"; item: FixedWithPayment | null }
  | { kind: "pay"; item: FixedWithPayment }
  | { kind: "pick" }
  | null

export function FixedMonthView({
  items,
  totals,
  period,
  today,
  isCurrentMonth,
  members,
  categories,
  currentUserId,
  defaultCurrency,
  summary,
}: {
  items: FixedWithPayment[]
  totals: Totals
  period: string
  today: string
  isCurrentMonth: boolean
  members: MemberOption[]
  categories: CategoryOption[]
  currentUserId: string
  defaultCurrency: "ARS" | "USD"
  /** Resumen por categoría (se arma en el servidor). */
  summary?: React.ReactNode
}) {
  const [drawer, setDrawer] = useState<DrawerState>(null)
  // Fuera del menú: abrir un diálogo desde un DropdownMenuItem deja el body bloqueado.
  const [deleting, setDeleting] = useState<FixedWithPayment | null>(null)
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const membersById = new Map(members.map((m) => [m.user_id, m]))

  useEffect(() => {
    const pagar = searchParams.get("pagar") === "1"
    const nuevo = searchParams.get("nuevo") === "1"
    if (pagar || nuevo) {
      setDrawer(pagar ? { kind: "pick" } : { kind: "edit", item: null })
      const p = new URLSearchParams(searchParams)
      p.delete("pagar")
      p.delete("nuevo")
      router.replace(p.size ? `${pathname}?${p}` : pathname, { scroll: false })
    }
  }, [searchParams, router, pathname])

  const active = items.filter((f) => f.is_active)
  const inactive = items.filter((f) => !f.is_active)
  const unpaid = active.filter((f) => !f.payment)
  const soon = isCurrentMonth ? unpaid.filter((f) => f.dueDate <= addDaysISO(today, 7)) : []
  const close = () => setDrawer(null)

  return (
    <div className="flex flex-col gap-6">
      <Panel>
        <div className="mb-3 flex items-baseline justify-between">
          <span className="font-semibold">
            {totals.paidCount} de {totals.count} pagados
          </span>
        </div>
        <SegmentedBar
          value={totals.paidCount}
          max={Math.max(totals.count, 1)}
          color="var(--moneda)"
          label={`${totals.paidCount} de ${totals.count} gastos fijos pagados`}
        />
        <div className="mt-4 flex flex-col gap-4">
          {Object.entries(totals.byCurrency).map(([cur, t]) => (
            <dl key={cur} className="grid grid-cols-3 gap-3">
              <div>
                <dt className="text-sm text-muted-foreground">Total {cur === "USD" ? "US$" : ""}</dt>
                <dd>
                  <Money amount={t.total} currency={cur as "ARS" | "USD"} display className="text-2xl" />
                </dd>
              </div>
              <div>
                <dt className="text-sm text-muted-foreground">Pagado</dt>
                <dd>
                  <Money amount={t.paid} currency={cur as "ARS" | "USD"} display className="text-2xl text-pasto-ink" />
                </dd>
              </div>
              <div>
                <dt className="text-sm text-muted-foreground">Falta</dt>
                <dd>
                  <Money amount={t.pending} currency={cur as "ARS" | "USD"} display className="text-2xl" />
                </dd>
              </div>
            </dl>
          ))}
        </div>
      </Panel>

      {summary}

      {soon.length > 0 && (
        <Panel title="Vencen esta semana" tone="alerta">
          <ul className="-my-1 flex flex-col gap-2">
            {soon.map((f) => {
              const due = dueLabel(f.dueDate, today)
              return (
                <li key={f.id} className="flex items-center gap-3">
                  <span className="min-w-0 flex-1 truncate font-semibold">{f.name}</span>
                  <span className={cn("text-sm", due.overdue && "font-semibold text-ladrillo")}>{due.text}</span>
                  <Money amount={f.amount} currency={f.currency as "ARS" | "USD"} className="text-sm" />
                </li>
              )
            })}
          </ul>
        </Panel>
      )}

      <Button className="self-start" onClick={() => setDrawer({ kind: "edit", item: null })}>
        <Plus aria-hidden /> Nuevo gasto fijo
      </Button>

      <ul className="flex flex-col gap-5">
        {active.map((f) => (
          <FixedCard
            key={f.id}
            item={f}
            today={today}
            isCurrentMonth={isCurrentMonth}
            responsibles={f.responsible_ids.flatMap((id) => membersById.get(id) ?? [])}
            categories={categories}
            onEdit={() => setDrawer({ kind: "edit", item: f })}
            onDelete={() => setDeleting(f)}
            onPay={() => setDrawer({ kind: "pay", item: f })}
          />
        ))}
      </ul>

      {inactive.length > 0 && (
        <details className="group">
          <summary className="cursor-pointer font-semibold text-muted-foreground">Inactivos ({inactive.length})</summary>
          <ul className="mt-4 flex flex-col gap-5">
            {inactive.map((f) => (
              <FixedCard
                key={f.id}
                item={f}
                today={today}
                isCurrentMonth={isCurrentMonth}
                responsibles={f.responsible_ids.flatMap((id) => membersById.get(id) ?? [])}
                categories={categories}
                onEdit={() => setDrawer({ kind: "edit", item: f })}
                onDelete={() => setDeleting(f)}
                onPay={() => setDrawer({ kind: "pay", item: f })}
              />
            ))}
          </ul>
        </details>
      )}

      <Drawer open={!!drawer} onOpenChange={(o) => !o && close()} repositionInputs={false}>
        <DrawerContent>
          <DrawerHeader>
            <DrawerTitle>
              {drawer?.kind === "pay"
                ? `Pagar ${drawer.item.name}`
                : drawer?.kind === "pick"
                  ? "¿Qué pagaste?"
                  : drawer?.kind === "edit" && drawer.item
                    ? "Editar gasto fijo"
                    : "Nuevo gasto fijo"}
            </DrawerTitle>
            <DrawerDescription className="sr-only">Gastos fijos del mes.</DrawerDescription>
          </DrawerHeader>
          <div className="overflow-y-auto px-5 pt-1 pb-8">
            {drawer?.kind === "edit" && (
              <FixedForm
                key={drawer.item?.id ?? "nuevo"}
                item={drawer.item}
                members={members}
                categories={categories}
                currentUserId={currentUserId}
                defaultCurrency={defaultCurrency}
                onDone={close}
              />
            )}
            {drawer?.kind === "pay" && <PaymentForm item={drawer.item} period={period} today={today} onDone={close} />}
            {drawer?.kind === "pick" &&
              (unpaid.length === 0 ? (
                <p>Ya está todo pagado este mes.</p>
              ) : (
                <ul className="flex flex-col gap-4">
                  {unpaid.map((f) => (
                    <li key={f.id}>
                      <button
                        type="button"
                        onClick={() => setDrawer({ kind: "pay", item: f })}
                        className="mx-[3px] flex min-h-14 w-[calc(100%-6px)] items-center gap-3 bg-panel px-4 text-left pixel-block active:pixel-pressed"
                      >
                        <span className="flex-1 font-semibold">{f.name}</span>
                        <span className="text-sm text-muted-foreground">{shortDate(f.dueDate)}</span>
                        <Money amount={f.amount} currency={f.currency as "ARS" | "USD"} />
                      </button>
                    </li>
                  ))}
                </ul>
              ))}
          </div>
        </DrawerContent>
      </Drawer>
      {deleting && (
        <FixedDeleteDialog item={deleting} open onOpenChange={(o) => !o && setDeleting(null)} onDeleted={() => setDeleting(null)} />
      )}
    </div>
  )
}

function FixedCard({
  item,
  today,
  isCurrentMonth,
  responsibles,
  categories,
  onEdit,
  onPay,
  onDelete,
}: {
  item: FixedWithPayment
  today: string
  isCurrentMonth: boolean
  responsibles: MemberOption[]
  categories: CategoryOption[]
  onEdit: () => void
  onPay: () => void
  onDelete: () => void
}) {
  const [pending, startTransition] = useTransition()
  const paid = !!item.payment
  const due = dueLabel(item.dueDate, today)
  const overdue = !paid && isCurrentMonth && due.overdue

  return (
    <li className={cn("mx-[3px] flex flex-col gap-3 bg-panel p-4 pixel-box", overdue && "[--pixel-outline:var(--ladrillo)]", !item.is_active && "opacity-70")}>
      <div className="flex items-start gap-3">
        <button type="button" onClick={onEdit} className="flex min-w-0 flex-1 flex-col gap-1 text-left">
          <span className="font-semibold">{item.name}</span>
          <span className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground">
            <span>Vence el {item.due_day}</span>
            <span>{PAYMENT_METHODS[item.payment_method as keyof typeof PAYMENT_METHODS]}</span>
            {item.is_private && (
              <span className="inline-flex items-center gap-1">
                <Lock className="size-4" aria-hidden /> Personal
              </span>
            )}
          </span>
        </button>
        <div className="flex flex-col items-end gap-1">
          <Money amount={paid ? item.payment!.amount : item.amount} currency={item.currency as "ARS" | "USD"} display className="text-2xl" />
          {paid && Number(item.payment!.amount) !== Number(item.amount) && (
            <span className="text-xs text-muted-foreground">
              base <Money amount={item.amount} currency={item.currency as "ARS" | "USD"} />
            </span>
          )}
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon-sm" aria-label={`Opciones de ${item.name}`} className="-mr-2 -mt-1 shrink-0">
              <MoreVertical aria-hidden />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onSelect={onEdit}>
              <Pencil aria-hidden /> Editar
            </DropdownMenuItem>
            <DropdownMenuItem className="text-ladrillo" onSelect={onDelete}>
              <Trash aria-hidden /> Borrar
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <span className="flex items-center gap-2">
          {responsibles.length > 0 && (
            <span className="flex items-center gap-1" aria-label={`Responsables: ${responsibles.map((m) => m.name).join(", ")}`}>
              {responsibles.map((m) => (
                <MemberAvatar key={m.user_id} name={m.name} color={m.color} size={24} />
              ))}
            </span>
          )}
          <CategoryChip
            entityType="fixed_expense"
            entityId={item.id}
            categories={categories}
            state={{ ...item, ai_confidence: item.ai_confidence === null ? null : Number(item.ai_confidence) }}
          />
        </span>
        {paid ? (
          <span className="flex items-center gap-2">
            <button type="button" onClick={onPay} className="inline-flex items-center gap-1 bg-pasto px-2 py-1 text-sm font-semibold text-tinta pixel-frame">
              <Check className="size-4" aria-hidden /> Pagado {shortDate(item.payment!.paid_at)}
            </button>
            <Button
              variant="ghost"
              size="icon-xs"
              aria-label={`Deshacer pago de ${item.name}`}
              disabled={pending}
              onClick={() =>
                startTransition(async () => {
                  const res = await undoPayment(item.payment!.id)
                  if (res.ok) toast.success("Pago deshecho")
                  else toast.error(res.error)
                })
              }
            >
              <Undo aria-hidden />
            </Button>
          </span>
        ) : (
          <span className="flex items-center gap-3">
            {isCurrentMonth && <span className={cn("text-sm", overdue && "font-semibold text-ladrillo")}>{due.text}</span>}
            <Button size="sm" variant="success" onClick={onPay}>
              <Check aria-hidden /> Pagar
            </Button>
          </span>
        )}
      </div>
    </li>
  )
}
