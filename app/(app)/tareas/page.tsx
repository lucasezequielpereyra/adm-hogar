import Link from "next/link"
import { Clock } from "pixelarticons/react"
import { EmptyState } from "@/components/pixel/empty-state"
import { LinkTabs } from "@/components/shell/link-tabs"
import { PageHeader } from "@/components/shell/page-header"
import { Button } from "@/components/ui/button"
import { NewTaskButton } from "@/features/tasks/components/new-task-button"
import { TaskEditorProvider } from "@/features/tasks/components/task-editor"
import { TaskFilters } from "@/features/tasks/components/task-filters"
import { TaskSection } from "@/features/tasks/components/task-section"
import { categoryFilterIds, categoryMap, memberOptions } from "@/features/tasks/page-data"
import { getTaskCategories, getTasks } from "@/features/tasks/queries"
import { startOfDayUtcISO, todayISO } from "@/lib/domain/dates"
import { getHouseholdContext } from "@/lib/session"

export const metadata = { title: "Tareas" }

export default async function TareasPage({
  searchParams,
}: {
  searchParams: Promise<{ vista?: string; miembro?: string; cat?: string }>
}) {
  const sp = await searchParams
  const view = sp.vista === "todas" ? "todas" : "mias"
  const ctx = await getHouseholdContext()
  const tz = ctx.household.timezone
  const today = todayISO(tz)

  const categories = await getTaskCategories(ctx.household.id)
  const { pending, doneToday } = await getTasks(
    ctx.household.id,
    ctx.user.id,
    { view, memberId: sp.miembro, categoryId: sp.cat },
    categoryFilterIds(categories, sp.cat),
    startOfDayUtcISO(today, tz),
  )

  const members = memberOptions(ctx)
  const membersById = new Map(members.map((m) => [m.user_id, m]))
  const categoriesById = categoryMap(categories)
  const common = { today, categoriesById, membersById }

  const overdue = pending.filter((t) => t.due_date && t.due_date < today)
  const dueToday = pending.filter((t) => t.due_date === today)
  const upcoming = pending.filter((t) => t.due_date && t.due_date > today)
  const noDate = pending.filter((t) => !t.due_date)

  const qs = (vista: string) => {
    const p = new URLSearchParams()
    if (vista === "todas") p.set("vista", "todas")
    if (sp.cat) p.set("cat", sp.cat)
    return p.size ? `/tareas?${p}` : "/tareas"
  }

  return (
    <TaskEditorProvider members={members} categories={categories} currentUserId={ctx.user.id} today={today}>
      <div className="flex flex-col gap-6">
        <PageHeader title="Tareas" action={<NewTaskButton label="Nueva" />} />
        <LinkTabs
          active={view}
          tabs={[
            { key: "mias", label: "Mis tareas", href: qs("mias") },
            { key: "todas", label: "Todas", href: qs("todas") },
          ]}
        />
        <TaskFilters members={members} categories={categories} showMembers={view === "todas"} />

        {pending.length === 0 && doneToday.length === 0 ? (
          <EmptyState
            title={view === "mias" ? "No tenés tareas pendientes" : "No hay tareas pendientes"}
            description="Creá una tarea o probá con otros filtros."
            action={<NewTaskButton label="Crear tarea" />}
          />
        ) : (
          <>
            <TaskSection title="Vencidas" tone="alerta" tasks={overdue} {...common} />
            <TaskSection title="Hoy" tasks={dueToday} {...common} />
            <TaskSection title="Próximas" tasks={upcoming} {...common} />
            <TaskSection title="Sin fecha" tasks={noDate} {...common} />
            <TaskSection title="Hechas hoy" tasks={doneToday} {...common} />
          </>
        )}

        <Button asChild variant="outline" className="w-full">
          <Link href="/tareas/historial">
            <Clock aria-hidden /> Ver historial
          </Link>
        </Button>
      </div>
    </TaskEditorProvider>
  )
}
