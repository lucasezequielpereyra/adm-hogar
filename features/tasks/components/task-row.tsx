"use client"

import { cn } from "cn"
import { Lock, Repeat, Users } from "pixelarticons/react"
import { useOptimistic, useTransition } from "react"
import { toast } from "sonner"
import { useCoinPop } from "@/components/pixel/coin-pop"
import { MemberAvatar } from "@/components/pixel/member-chip"
import { Checkbox } from "@/components/ui/checkbox"
import { dueLabel, recurrenceLabel, type RecurrenceRule } from "@/lib/domain/recurrence"
import { playSound } from "@/lib/sound"
import { completeTask, reopenTask, undoCompleteTask } from "../actions"
import type { MemberOption, TaskCategoryRow, TaskItem } from "../types"
import { CategoryLabel } from "./category-label"
import { useTaskEditor } from "./task-editor"

export function TaskRow({
  task,
  category,
  parentCategory,
  assignee,
  today,
}: {
  task: TaskItem
  category?: TaskCategoryRow | null
  parentCategory?: TaskCategoryRow | null
  assignee?: MemberOption | null
  today: string
}) {
  const { openEdit } = useTaskEditor()
  const { pop, node } = useCoinPop()
  const [pending, startTransition] = useTransition()
  const [done, setDone] = useOptimistic(task.status === "done")

  const due = task.due_date ? dueLabel(task.due_date, today) : null
  const recurrence = recurrenceLabel({
    frequency: task.frequency as RecurrenceRule["frequency"],
    weekdays: task.weekdays,
    monthDay: task.month_day,
  })

  function toggle(checked: boolean) {
    startTransition(async () => {
      setDone(checked)
      if (checked) {
        pop()
        playSound("coin")
        const res = await completeTask(task.id)
        if (!res.ok) {
          playSound("error")
          toast.error(res.error)
          return
        }
        const { completionId, next } = res.data
        toast.success("¡Tarea hecha! +1", {
          description: next ? `La próxima: ${dueLabel(next, today).text.toLowerCase()}.` : undefined,
          action: completionId
            ? {
                label: "Deshacer",
                onClick: async () => {
                  const undo = await undoCompleteTask(completionId)
                  if (!undo.ok) toast.error(undo.error)
                },
              }
            : undefined,
        })
      } else {
        const res = await reopenTask(task.id)
        if (!res.ok) toast.error(res.error)
      }
    })
  }

  return (
    <li className="relative flex items-start gap-3 py-3">
      {node}
      <Checkbox
        checked={done}
        disabled={pending}
        onCheckedChange={(v) => toggle(v === true)}
        aria-label={done ? `Reabrir: ${task.title}` : `Completar: ${task.title}`}
        className="mt-0.5"
      />
      <button
        type="button"
        onClick={() => openEdit(task)}
        className="flex min-w-0 flex-1 flex-col gap-1 text-left"
      >
        <span className={cn("font-semibold", done && "text-muted-foreground line-through decoration-2")}>
          {task.priority === "high" && !done && (
            <span className="mr-1.5 inline-block bg-ladrillo px-1 font-display leading-tight text-white dark:text-tinta" aria-label="Prioridad alta">
              !
            </span>
          )}
          {task.title}
        </span>
        <span className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground">
          {category && <CategoryLabel category={category} parent={parentCategory} />}
          {due && !done && <span className={cn(due.overdue && "font-semibold text-ladrillo")}>{due.text}</span>}
          {recurrence && (
            <span className="inline-flex items-center gap-1">
              <Repeat className="size-4" aria-hidden />
              {recurrence}
            </span>
          )}
          {task.is_private && (
            <span className="inline-flex items-center gap-1">
              <Lock className="size-4" aria-hidden />
              Personal
            </span>
          )}
          {!task.assigned_to && !task.is_private && !done && (
            <span className="inline-flex items-center gap-1">
              <Users className="size-4" aria-hidden />
              Cualquiera
            </span>
          )}
        </span>
      </button>
      {assignee && <MemberAvatar name={assignee.name} color={assignee.color} size={28} />}
    </li>
  )
}
