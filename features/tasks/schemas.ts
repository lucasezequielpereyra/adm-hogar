import { z } from "zod"
import { PALETTE_KEYS } from "@/lib/palette"
import { CATEGORY_ICON_KEYS } from "@/lib/icons"

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Fecha inválida.")

export const taskSchema = z
  .object({
    title: z.string().trim().min(1, "Poné un título.").max(120, "Máximo 120 caracteres."),
    description: z.string().trim().max(1000, "Máximo 1000 caracteres."),
    task_category_id: z.uuid().nullable(),
    assigned_to: z.uuid().nullable(),
    due_date: isoDate.nullable(),
    priority: z.enum(["low", "medium", "high"]),
    frequency: z.enum(["once", "daily", "weekly", "biweekly", "monthly"]),
    weekdays: z.array(z.number().int().min(0).max(6)),
    month_day: z.number().int().min(1, "Entre 1 y 31.").max(31, "Entre 1 y 31.").nullable(),
    is_private: z.boolean(),
  })
  .superRefine((v, ctx) => {
    if (v.frequency !== "once" && !v.due_date) {
      ctx.addIssue({ code: "custom", path: ["due_date"], message: "Las tareas que se repiten necesitan una fecha de inicio." })
    }
    if ((v.frequency === "weekly" || v.frequency === "biweekly") && v.weekdays.length === 0) {
      ctx.addIssue({ code: "custom", path: ["weekdays"], message: "Elegí al menos un día." })
    }
  })

export type TaskValues = z.infer<typeof taskSchema>

export const taskCategorySchema = z.object({
  name: z.string().trim().min(1, "Poné un nombre.").max(40, "Máximo 40 caracteres."),
  parent_id: z.uuid().nullable(),
  icon: z.enum(CATEGORY_ICON_KEYS as [string, ...string[]]),
  color: z.enum(PALETTE_KEYS),
})

export type TaskCategoryValues = z.infer<typeof taskCategorySchema>

export const PRIORITY_LABEL = { low: "Baja", medium: "Media", high: "Alta" } as const
export const FREQUENCY_LABEL = {
  once: "Una vez",
  daily: "Diaria",
  weekly: "Semanal",
  biweekly: "Quincenal",
  monthly: "Mensual",
} as const
