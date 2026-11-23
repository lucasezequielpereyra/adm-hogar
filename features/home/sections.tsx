import Link from "next/link"
import { ChevronRight, Sparkles } from "pixelarticons/react"
import { EmptyState } from "@/components/pixel/empty-state"
import { Money } from "@/components/pixel/money"
import { Panel } from "@/components/pixel/panel"
import { SegmentedBar } from "@/components/pixel/segmented-bar"
import { Skeleton } from "@/components/ui/skeleton"
import { MiniCategoryBar } from "@/features/cards/components/mini-category-bar"
import { getCardDashboard } from "@/features/cards/queries"
import { getCategories } from "@/features/categories/queries"
import { getFixedForMonth } from "@/features/fixed/queries"
import { getItems, getListByMonth, listTotals } from "@/features/shopping/queries"
import { NewTaskButton } from "@/features/tasks/components/new-task-button"
import { TaskEditorProvider } from "@/features/tasks/components/task-editor"
import { TaskSection } from "@/features/tasks/components/task-section"
import { categoryMap, memberOptions } from "@/features/tasks/page-data"
import { getTaskCategories } from "@/features/tasks/queries"
import type { TaskItem } from "@/features/tasks/types"
import { addDaysISO, addMonthsISO, monthOf } from "@/lib/domain/dates"
import { monthLabel } from "@/lib/domain/format"
import { dueLabel } from "@/lib/domain/recurrence"
import type { HouseholdContext } from "@/lib/session"
import { createClient } from "@/lib/supabase/server"

const more = (href: string, label: string) => (
  <Link href={href} className="inline-flex items-center gap-1 text-sm font-semibold underline decoration-2 underline-offset-4">
    {label}
    <ChevronRight className="size-4" aria-hidden />
  </Link>
)

export function PanelSkeleton({ lines = 3 }: { lines?: number }) {
  return (
    <Panel>
      <Skeleton className="mb-4 h-7 w-1/2" />
      <div className="flex flex-col gap-3">
        {Array.from({ length: lines }, (_, i) => (
          <Skeleton key={i} className="h-6" style={{ width: `${90 - i * 15}%` }} />
        ))}
      </div>
    </Panel>
  )
}

/** Mis tareas (y las sin asignar) de hoy y las vencidas. */
export async function TodayTasks({ ctx, today }: { ctx: HouseholdContext; today: string }) {
  const supabase = await createClient()
  const [{ data }, categories] = await Promise.all([
    supabase
      .from("tasks")
      .select(
        "id, title, description, task_category_id, assigned_to, due_date, priority, status, is_private, frequency, weekdays, month_day, recurrence_anchor, created_by, completed_at, completed_by",
      )
      .eq("household_id", ctx.household.id)
      // Las mías y las sin asignar (son de todos).
      .or(`assigned_to.eq.${ctx.user.id},assigned_to.is.null`)
      .eq("status", "pending")
      .lte("due_date", today)
      .order("due_date")
      .limit(30),
    getTaskCategories(ctx.household.id),
  ])
  const tasks = (data ?? []) as TaskItem[]
  const members = memberOptions(ctx)
  const common = { today, categoriesById: categoryMap(categories), membersById: new Map(members.map((m) => [m.user_id, m])) }
  const overdue = tasks.filter((t) => t.due_date! < today)
  const dueToday = tasks.filter((t) => t.due_date === today)

  return (
    <TaskEditorProvider members={members} categories={categories} currentUserId={ctx.user.id} today={today}>
      {tasks.length === 0 ? (
        <Panel title="Hoy" action={more("/tareas", "Tareas")}>
          <EmptyState title="Nada pendiente para hoy" description="Disfrutá el día o adelantá algo de la semana." action={<NewTaskButton label="Crear tarea" variant="outline" />} />
        </Panel>
      ) : (
        <div className="flex flex-col gap-6">
          <TaskSection title="Vencidas" tone="alerta" tasks={overdue} {...common} />
          <TaskSection title="Hoy" tasks={dueToday} {...common} footer={<div className="mt-3">{more("/tareas", "Ver todas")}</div>} />
        </div>
      )}
    </TaskEditorProvider>
  )
}

/** Progreso de la compra del mes. */
export async function ShoppingProgress({ ctx, today }: { ctx: HouseholdContext; today: string }) {
  const month = monthOf(today)
  const list = await getListByMonth(ctx.household.id, month)
  const name = monthLabel(month).split(" ")[0].toLowerCase()
  if (!list) {
    return (
      <Panel title={`Compra de ${name}`} action={more("/compras/mes", "Armarla")}>
        <p className="text-muted-foreground">Todavía no hay lista de este mes.</p>
      </Panel>
    )
  }
  const t = listTotals(await getItems(list.id))
  return (
    <Panel title={`Compra de ${name}`} action={more("/compras/mes", "Ver lista")}>
      <SegmentedBar value={t.purchased} max={Math.max(t.total, 1)} label={`${t.purchased} de ${t.total} comprados`} />
      <div className="mt-3 flex items-baseline justify-between gap-3">
        <span>
          {t.purchased} de {t.total} comprados
        </span>
        <span className="text-sm text-muted-foreground">
          <Money amount={t.real} decimals={false} /> de <Money amount={t.estimated} decimals={false} />
        </span>
      </div>
    </Panel>
  )
}

/** Gastos fijos impagos que vencen en los próximos 7 días (o ya vencieron este mes). */
export async function FixedDueSoon({ ctx, today }: { ctx: HouseholdContext; today: string }) {
  const month = monthOf(today)
  const limit = addDaysISO(today, 7)
  const [current, next] = await Promise.all([
    getFixedForMonth(ctx.household.id, month),
    monthOf(limit) !== month ? getFixedForMonth(ctx.household.id, addMonthsISO(month, 1)) : Promise.resolve([]),
  ])
  const due = [...current, ...next]
    .filter((f) => f.is_active && !f.payment && f.dueDate <= limit)
    .sort((a, b) => a.dueDate.localeCompare(b.dueDate))
  if (due.length === 0) {
    return (
      <Panel title="Vencen esta semana" action={more("/gastos/fijos", "Fijos")}>
        <p className="text-muted-foreground">No hay gastos fijos por vencer en los próximos 7 días.</p>
      </Panel>
    )
  }
  return (
    <Panel title="Vencen esta semana" tone={due.some((f) => f.dueDate < today) ? "alerta" : undefined} action={more("/gastos/fijos", "Fijos")}>
      <ul className="flex flex-col gap-2">
        {due.map((f) => {
          const d = dueLabel(f.dueDate, today)
          return (
            <li key={`${f.id}-${f.dueDate}`} className="flex items-center gap-3">
              <span className="min-w-0 flex-1 truncate font-semibold">{f.name}</span>
              <span className={d.overdue ? "text-sm font-semibold text-ladrillo" : "text-sm"}>{d.text}</span>
              <Money amount={f.amount} currency={f.currency as "ARS" | "USD"} decimals={false} className="text-sm" />
            </li>
          )
        })}
      </ul>
    </Panel>
  )
}

/** Gasto de tarjetas del período actual con mini gráfico por categoría. */
export async function CardsSummary({ ctx, today }: { ctx: HouseholdContext; today: string }) {
  const [dash, categories] = await Promise.all([getCardDashboard(ctx.household.id, today, 0), getCategories(ctx.household.id)])
  if (dash.cards.length === 0) {
    return (
      <Panel title="Tarjetas" action={more("/mas/tarjetas", "Cargar una")}>
        <p className="text-muted-foreground">Cargá tus tarjetas para ver el gasto del período.</p>
      </Panel>
    )
  }
  const byId = new Map(categories.map((c) => [c.id, c]))
  const acc = new Map<string, number>()
  for (const r of dash.currentRows) {
    if (r.currency !== "ARS") continue
    const k = r.expense.category_id ?? "none"
    acc.set(k, (acc.get(k) ?? 0) + Number(r.amount))
  }
  const mini = [...acc.entries()].map(([k, v]) => ({
    key: k,
    name: byId.get(k)?.name ?? "Sin categoría",
    color: byId.get(k)?.color ?? "gris",
    value: Math.round(v),
  }))
  return (
    <Panel title="Tarjetas, período actual" action={more("/gastos/tarjetas", "Detalle")}>
      <div className="mb-4 flex flex-wrap items-baseline gap-x-5">
        <Money amount={dash.totals.ARS ?? 0} display decimals={false} className="text-5xl" />
        {dash.totals.USD ? <Money amount={dash.totals.USD} currency="USD" display className="text-3xl" /> : null}
      </div>
      <MiniCategoryBar data={mini} />
    </Panel>
  )
}

/** Contador de gastos con categoría a revisar (baja confianza o sin categorizar). */
export async function ReviewCounter({ ctx }: { ctx: HouseholdContext }) {
  const supabase = await createClient()
  const count = async (table: "card_expenses" | "fixed_expenses" | "pending_purchases") => {
    const { count } = await supabase
      .from(table)
      .select("id", { count: "exact", head: true })
      .eq("household_id", ctx.household.id)
      .eq("needs_review", true)
    return count ?? 0
  }
  const [cards, fixed, pending] = await Promise.all([count("card_expenses"), count("fixed_expenses"), count("pending_purchases")])
  const total = cards + fixed + pending
  if (total === 0) return null
  const links = [
    cards ? { href: "/gastos/tarjetas?revisar=1", label: `${cards} de tarjeta` } : null,
    fixed ? { href: "/gastos/fijos?revisar=1", label: `${fixed} fijos` } : null,
    pending ? { href: "/compras/pendientes?revisar=1", label: `${pending} compras pendientes` } : null,
  ].filter(Boolean) as { href: string; label: string }[]
  return (
    <Panel tone="ia">
      <p className="flex items-center gap-2 font-display text-[28px] leading-none">
        <Sparkles className="size-7 text-uva" aria-hidden />
        {total} {total === 1 ? "gasto a revisar" : "gastos a revisar"}
      </p>
      <p className="mt-1 text-sm text-muted-foreground">Categorías con baja confianza o que no se pudieron asignar.</p>
      <div className="mt-3 flex flex-wrap gap-x-4 gap-y-2">
        {links.map((l) => (
          <Link key={l.href} href={l.href} className="text-sm font-semibold underline decoration-2 underline-offset-4">
            {l.label}
          </Link>
        ))}
      </div>
    </Panel>
  )
}
