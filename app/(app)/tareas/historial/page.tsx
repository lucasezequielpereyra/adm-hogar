import { EmptyState } from "@/components/pixel/empty-state"
import { MemberAvatar } from "@/components/pixel/member-chip"
import { Panel } from "@/components/pixel/panel"
import { PageHeader } from "@/components/shell/page-header"
import { CategoryLabel } from "@/features/tasks/components/category-label"
import { categoryMap, memberOptions } from "@/features/tasks/page-data"
import { getTaskCategories, getTaskHistory } from "@/features/tasks/queries"
import { shortDate } from "@/lib/domain/format"
import { getHouseholdContext } from "@/lib/session"

export const metadata = { title: "Historial de tareas" }

function localParts(iso: string, timeZone: string) {
  const date = new Intl.DateTimeFormat("en-CA", { timeZone, year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date(iso))
  const time = new Intl.DateTimeFormat("es-AR", { timeZone, hour: "2-digit", minute: "2-digit" }).format(new Date(iso))
  return { date, time }
}

export default async function HistorialPage() {
  const ctx = await getHouseholdContext()
  const [history, categories] = await Promise.all([getTaskHistory(ctx.household.id), getTaskCategories(ctx.household.id)])
  const membersById = new Map(memberOptions(ctx).map((m) => [m.user_id, m]))
  const categoriesById = categoryMap(categories)

  const byDay = new Map<string, typeof history>()
  for (const h of history) {
    const { date } = localParts(h.completed_at, ctx.household.timezone)
    byDay.set(date, [...(byDay.get(date) ?? []), h])
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Historial" back="/tareas" />
      {history.length === 0 ? (
        <EmptyState title="Todavía no hay tareas hechas" description="Cuando alguien complete una tarea, va a aparecer acá." />
      ) : (
        [...byDay.entries()].map(([day, items]) => (
          <Panel key={day} title={shortDate(day)}>
            <ul className="-my-2 flex flex-col divide-y-[3px] divide-tinta/10 dark:divide-white/10">
              {items.map((h) => {
                const who = h.completed_by ? membersById.get(h.completed_by) : null
                const category = h.task?.task_category_id ? categoriesById.get(h.task.task_category_id) : null
                const parent = category?.parent_id ? categoriesById.get(category.parent_id) : null
                return (
                  <li key={h.id} className="flex items-center gap-3 py-2">
                    {who ? <MemberAvatar name={who.name} color={who.color} size={28} /> : <span className="size-[34px]" />}
                    <span className="flex min-w-0 flex-1 flex-col">
                      <span className="truncate font-semibold">{h.task?.title ?? "Tarea borrada"}</span>
                      <span className="flex items-center gap-3 text-sm text-muted-foreground">
                        <span>
                          {who?.name ?? "Alguien"} · {localParts(h.completed_at, ctx.household.timezone).time}
                        </span>
                        {category && <CategoryLabel category={category} parent={parent} />}
                      </span>
                    </span>
                  </li>
                )
              })}
            </ul>
          </Panel>
        ))
      )}
    </div>
  )
}
