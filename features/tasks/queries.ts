import "server-only"
import { createClient } from "@/lib/supabase/server"
import type { TaskCategoryNode, TaskCategoryRow, TaskItem } from "./types"

const TASK_FIELDS =
  "id, title, description, task_category_id, assigned_to, due_date, priority, status, is_private, frequency, weekdays, month_day, recurrence_anchor, created_by, completed_at, completed_by"

/** Monedas del HUD: tareas que completaste en los últimos 7 días. */
export async function getWeeklyCoins(householdId: string, userId: string): Promise<number> {
  const supabase = await createClient()
  const since = new Date(Date.now() - 7 * 86_400_000).toISOString()
  const { count } = await supabase
    .from("task_completions")
    .select("id", { count: "exact", head: true })
    .eq("household_id", householdId)
    .eq("completed_by", userId)
    .gte("completed_at", since)
  return count ?? 0
}

export async function getTaskCategories(householdId: string): Promise<TaskCategoryNode[]> {
  const supabase = await createClient()
  const { data } = await supabase
    .from("task_categories")
    .select("*")
    .eq("household_id", householdId)
    .order("sort_order")
    .order("name")
  return buildCategoryTree(data ?? [])
}

export function buildCategoryTree(rows: TaskCategoryRow[]): TaskCategoryNode[] {
  const roots = rows.filter((r) => !r.parent_id).map((r) => ({ ...r, children: [] as TaskCategoryRow[] }))
  const byId = new Map(roots.map((r) => [r.id, r]))
  for (const r of rows) {
    if (r.parent_id) byId.get(r.parent_id)?.children.push(r)
  }
  return roots
}

export type TaskFilters = {
  view: "mias" | "todas"
  memberId?: string
  categoryId?: string
}

/**
 * Tareas pendientes (más las completadas hoy, para poder deshacer),
 * con los filtros de la vista.
 */
export async function getTasks(
  householdId: string,
  userId: string,
  filters: TaskFilters,
  categoryIds: string[] | null,
  startOfTodayIso: string,
): Promise<{ pending: TaskItem[]; doneToday: TaskItem[] }> {
  const supabase = await createClient()

  const base = () => {
    let q = supabase.from("tasks").select(TASK_FIELDS).eq("household_id", householdId)
    if (filters.view === "mias") q = q.eq("assigned_to", userId)
    else if (filters.memberId === "sin-asignar") q = q.is("assigned_to", null)
    else if (filters.memberId) q = q.eq("assigned_to", filters.memberId)
    if (categoryIds) q = q.in("task_category_id", categoryIds)
    return q
  }

  const [pending, done] = await Promise.all([
    base().eq("status", "pending").order("due_date", { ascending: true, nullsFirst: false }).order("priority").limit(300),
    base().eq("status", "done").gte("completed_at", startOfTodayIso).order("completed_at", { ascending: false }).limit(50),
  ])

  return { pending: (pending.data ?? []) as TaskItem[], doneToday: (done.data ?? []) as TaskItem[] }
}

export async function getTaskHistory(householdId: string, limit = 60) {
  const supabase = await createClient()
  const { data } = await supabase
    .from("task_completions")
    .select("id, completed_at, completed_by, task:tasks!task_completions_household_id_task_id_fkey(title, task_category_id)")
    .eq("household_id", householdId)
    .order("completed_at", { ascending: false })
    .limit(limit)
  return data ?? []
}
