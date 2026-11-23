"use server"

import { revalidatePath } from "next/cache"
import { fail, fromDb, fromZod, ok, type ActionResult } from "@/lib/actions"
import { todayISO } from "@/lib/domain/dates"
import { alignToRule, nextOccurrence, type RecurrenceRule } from "@/lib/domain/recurrence"
import { getHouseholdContext } from "@/lib/session"
import { createClient } from "@/lib/supabase/server"
import { taskCategorySchema, taskSchema, type TaskCategoryValues, type TaskValues } from "./schemas"

function revalidateTasks() {
  revalidatePath("/tareas")
  revalidatePath("/")
}

/** Normaliza la recurrencia: alinea la fecha, fija el ancla y el día del mes. */
function normalizeTask(v: TaskValues) {
  const rule: RecurrenceRule = {
    frequency: v.frequency,
    weekdays: v.weekdays,
    monthDay: v.month_day ?? (v.due_date ? Number(v.due_date.slice(8, 10)) : null),
  }
  let due = v.due_date
  if (due && v.frequency !== "once" && v.frequency !== "daily") {
    rule.anchor = due
    due = alignToRule(rule, due)
  }
  const recurring = v.frequency !== "once"
  return {
    title: v.title,
    description: v.description || null,
    task_category_id: v.task_category_id,
    assigned_to: v.assigned_to,
    due_date: due,
    priority: v.priority,
    is_private: v.is_private,
    frequency: v.frequency,
    weekdays: v.frequency === "weekly" || v.frequency === "biweekly" ? [...new Set(v.weekdays)].sort() : null,
    month_day: v.frequency === "monthly" ? rule.monthDay : null,
    recurrence_anchor: recurring ? due : null,
  }
}

export async function saveTask(id: string | null, values: TaskValues): Promise<ActionResult> {
  const ctx = await getHouseholdContext()
  const parsed = taskSchema.safeParse(values)
  if (!parsed.success) return fromZod(parsed.error)
  const v = parsed.data

  if (v.is_private && v.assigned_to && v.assigned_to !== ctx.user.id) {
    return fail("Una tarea personal solo puede estar asignada a vos.", {
      assigned_to: "Una tarea personal solo puede estar asignada a vos.",
    })
  }
  if (v.assigned_to && !ctx.members.some((m) => m.user_id === v.assigned_to)) {
    return fail("Esa persona ya no es parte del hogar.")
  }

  const row = normalizeTask(v)
  const supabase = await createClient()
  const { error } = id
    ? await supabase.from("tasks").update(row).eq("id", id).eq("household_id", ctx.household.id)
    : await supabase.from("tasks").insert({ ...row, household_id: ctx.household.id, created_by: ctx.user.id })
  if (error) return fromDb(error, "No se pudo guardar la tarea.")
  revalidateTasks()
  return ok()
}

export async function deleteTask(id: string): Promise<ActionResult> {
  const ctx = await getHouseholdContext()
  const supabase = await createClient()
  const { error } = await supabase.from("tasks").delete().eq("id", id).eq("household_id", ctx.household.id)
  if (error) return fromDb(error, "No se pudo borrar la tarea.")
  revalidateTasks()
  return ok()
}

/**
 * Completa una tarea. Si es recurrente, calcula la próxima fecha en el
 * servidor (zona horaria del hogar) y la RPC crea la ocurrencia en la
 * misma transacción.
 */
export async function completeTask(id: string): Promise<ActionResult<{ completionId: string | null; next: string | null }>> {
  const ctx = await getHouseholdContext()
  const supabase = await createClient()
  const { data: task, error: readError } = await supabase
    .from("tasks")
    .select("id, due_date, frequency, weekdays, month_day, recurrence_anchor, status")
    .eq("id", id)
    .eq("household_id", ctx.household.id)
    .maybeSingle()
  if (readError || !task) return fail("No encontramos esa tarea.")
  if (task.status === "done") return ok({ completionId: null, next: null })

  const today = todayISO(ctx.household.timezone)
  const next =
    task.frequency === "once" || !task.due_date
      ? null
      : nextOccurrence(
          {
            frequency: task.frequency as RecurrenceRule["frequency"],
            weekdays: task.weekdays,
            monthDay: task.month_day,
            anchor: task.recurrence_anchor,
          },
          task.due_date,
          today,
        )

  const { data, error } = await supabase.rpc("complete_task", { p_task_id: id, p_next_due: next ?? undefined })
  if (error) return fromDb(error, "No se pudo completar la tarea.")
  revalidateTasks()
  return ok({ completionId: data, next })
}

export async function undoCompleteTask(completionId: string): Promise<ActionResult> {
  await getHouseholdContext()
  const supabase = await createClient()
  const { error } = await supabase.rpc("undo_complete_task", { p_completion_id: completionId })
  if (error) return fromDb(error, "No se pudo deshacer.")
  revalidateTasks()
  return ok()
}

/** Deshace la última vez que completaste esta tarea (desde "Hechas hoy"). */
export async function reopenTask(taskId: string): Promise<ActionResult> {
  const ctx = await getHouseholdContext()
  const supabase = await createClient()
  const { data } = await supabase
    .from("task_completions")
    .select("id")
    .eq("task_id", taskId)
    .eq("completed_by", ctx.user.id)
    .order("completed_at", { ascending: false })
    .limit(1)
    .maybeSingle()
  if (!data) return fail("Solo quien completó la tarea puede reabrirla.")
  return undoCompleteTask(data.id)
}

// ── Categorías de tareas ──────────────────────────────────────────────

export async function saveTaskCategory(id: string | null, values: TaskCategoryValues): Promise<ActionResult> {
  const ctx = await getHouseholdContext()
  const parsed = taskCategorySchema.safeParse(values)
  if (!parsed.success) return fromZod(parsed.error)
  const supabase = await createClient()
  const { error } = id
    ? await supabase.from("task_categories").update(parsed.data).eq("id", id).eq("household_id", ctx.household.id)
    : await supabase
        .from("task_categories")
        .insert({ ...parsed.data, household_id: ctx.household.id, created_by: ctx.user.id })
  if (error) {
    if (error.code === "23505") return fail("Ya hay una categoría con ese nombre en ese nivel.")
    return fromDb(error, "No se pudo guardar la categoría.")
  }
  revalidatePath("/mas/categorias-tareas")
  revalidateTasks()
  return ok()
}

export async function deleteTaskCategory(id: string): Promise<ActionResult> {
  const ctx = await getHouseholdContext()
  const supabase = await createClient()
  const { error } = await supabase.from("task_categories").delete().eq("id", id).eq("household_id", ctx.household.id)
  if (error) return fromDb(error, "No se pudo borrar la categoría.")
  revalidatePath("/mas/categorias-tareas")
  revalidateTasks()
  return ok()
}
