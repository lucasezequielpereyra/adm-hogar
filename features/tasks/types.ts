import type { Database } from "@/lib/supabase/database.types"

export type TaskRow = Database["public"]["Tables"]["tasks"]["Row"]
export type TaskCategoryRow = Database["public"]["Tables"]["task_categories"]["Row"]

export type TaskCategoryNode = TaskCategoryRow & { children: TaskCategoryRow[] }

/** Datos de una tarea que necesita la UI. */
export type TaskItem = Pick<
  TaskRow,
  | "id"
  | "title"
  | "description"
  | "task_category_id"
  | "assigned_to"
  | "due_date"
  | "priority"
  | "status"
  | "is_private"
  | "frequency"
  | "weekdays"
  | "month_day"
  | "recurrence_anchor"
  | "created_by"
  | "completed_at"
  | "completed_by"
>

export type MemberOption = { user_id: string; name: string; color: string }
