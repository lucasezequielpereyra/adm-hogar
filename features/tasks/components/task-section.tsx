import type { ReactNode } from "react"
import { Panel } from "@/components/pixel/panel"
import type { MemberOption, TaskCategoryRow, TaskItem } from "../types"
import { TaskRow } from "./task-row"

export function TaskSection({
  title,
  tasks,
  tone,
  today,
  categoriesById,
  membersById,
  footer,
}: {
  title: string
  tasks: TaskItem[]
  tone?: "alerta"
  today: string
  categoriesById: Map<string, TaskCategoryRow>
  membersById: Map<string, MemberOption>
  footer?: ReactNode
}) {
  if (tasks.length === 0) return null
  return (
    <Panel title={`${title} (${tasks.length})`} tone={tone}>
      <ul className="-my-3 flex flex-col divide-y-[3px] divide-tinta/10 dark:divide-white/10">
        {tasks.map((t) => {
          const category = t.task_category_id ? categoriesById.get(t.task_category_id) : null
          const parent = category?.parent_id ? categoriesById.get(category.parent_id) : null
          return (
            <TaskRow
              key={t.id}
              task={t}
              category={category}
              parentCategory={parent}
              assignee={t.assigned_to ? membersById.get(t.assigned_to) : null}
              today={today}
            />
          )
        })}
      </ul>
      {footer}
    </Panel>
  )
}
