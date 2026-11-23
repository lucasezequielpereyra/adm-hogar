"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import { Trash } from "pixelarticons/react"
import { useTransition } from "react"
import { Controller, useForm, useWatch } from "react-hook-form"
import { toast } from "sonner"
import { FormField } from "@/components/form/form-field"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Textarea } from "@/components/ui/textarea"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import { WEEKDAY_INITIAL, WEEKDAY_NAME, WEEKDAYS_UI } from "@/lib/domain/recurrence"
import { deleteTask, saveTask } from "../actions"
import { FREQUENCY_LABEL, PRIORITY_LABEL, taskSchema, type TaskValues } from "../schemas"
import type { MemberOption, TaskCategoryNode, TaskItem } from "../types"

const NONE = "__none__"

export function taskToValues(task: TaskItem | null, defaults: Partial<TaskValues> = {}): TaskValues {
  if (!task) {
    return {
      title: "",
      description: "",
      task_category_id: null,
      assigned_to: null,
      due_date: null,
      priority: "medium",
      frequency: "once",
      weekdays: [],
      month_day: null,
      is_private: false,
      ...defaults,
    }
  }
  return {
    title: task.title,
    description: task.description ?? "",
    task_category_id: task.task_category_id,
    assigned_to: task.assigned_to,
    due_date: task.due_date,
    priority: task.priority as TaskValues["priority"],
    frequency: task.frequency as TaskValues["frequency"],
    weekdays: task.weekdays ?? [],
    month_day: task.month_day,
    is_private: task.is_private,
  }
}

export function TaskForm({
  task,
  defaults,
  members,
  categories,
  currentUserId,
  today,
  onDone,
}: {
  task: TaskItem | null
  defaults?: Partial<TaskValues>
  members: MemberOption[]
  categories: TaskCategoryNode[]
  currentUserId: string
  today: string
  onDone: () => void
}) {
  const [pending, startTransition] = useTransition()
  const form = useForm<TaskValues>({
    resolver: zodResolver(taskSchema),
    defaultValues: taskToValues(task, defaults),
  })
  const { errors } = form.formState
  const frequency = useWatch({ control: form.control, name: "frequency" })
  const isPrivate = useWatch({ control: form.control, name: "is_private" })
  const dueDate = useWatch({ control: form.control, name: "due_date" })

  const onSubmit = form.handleSubmit((values) =>
    startTransition(async () => {
      const res = await saveTask(task?.id ?? null, values)
      if (res.ok) {
        toast.success(task ? "Tarea actualizada" : "Tarea creada")
        onDone()
      } else {
        Object.entries(res.fieldErrors ?? {}).forEach(([k, m]) => form.setError(k as keyof TaskValues, { message: m }))
        toast.error(res.error)
      }
    }),
  )

  const assignable = isPrivate ? members.filter((m) => m.user_id === currentUserId) : members

  return (
    <form onSubmit={onSubmit} noValidate className="flex flex-col gap-5">
      <FormField id="task-title" label="Qué hay que hacer" error={errors.title?.message}>
        <Input id="task-title" autoFocus={!task} aria-invalid={!!errors.title} {...form.register("title")} />
      </FormField>

      <FormField id="task-category" label="Categoría">
        <Controller
          control={form.control}
          name="task_category_id"
          render={({ field }) => (
            <Select value={field.value ?? NONE} onValueChange={(v) => field.onChange(v === NONE ? null : v)}>
              <SelectTrigger id="task-category">
                <SelectValue placeholder="Sin categoría" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NONE}>Sin categoría</SelectItem>
                {categories.map((root) => (
                  <SelectGroup key={root.id}>
                    <SelectLabel>{root.name}</SelectLabel>
                    <SelectItem value={root.id}>{root.name} (general)</SelectItem>
                    {root.children.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {root.name} › {c.name}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                ))}
              </SelectContent>
            </Select>
          )}
        />
      </FormField>

      <FormField id="task-assigned" label="Quién la hace" error={errors.assigned_to?.message}>
        <Controller
          control={form.control}
          name="assigned_to"
          render={({ field }) => (
            <Select value={field.value ?? NONE} onValueChange={(v) => field.onChange(v === NONE ? null : v)}>
              <SelectTrigger id="task-assigned" aria-invalid={!!errors.assigned_to}>
                <SelectValue placeholder="Sin asignar" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NONE}>Sin asignar</SelectItem>
                {assignable.map((m) => (
                  <SelectItem key={m.user_id} value={m.user_id}>
                    {m.name}
                    {m.user_id === currentUserId ? " (vos)" : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        />
      </FormField>

      <div className="flex flex-col gap-3">
        <Label>Se repite</Label>
        <Controller
          control={form.control}
          name="frequency"
          render={({ field }) => (
            <ToggleGroup
              type="single"
              value={field.value}
              onValueChange={(v) => {
                if (!v) return
                field.onChange(v)
                if (v !== "once" && !form.getValues("due_date")) form.setValue("due_date", today)
                if (v === "monthly" && !form.getValues("month_day")) {
                  form.setValue("month_day", Number((form.getValues("due_date") ?? today).slice(8, 10)))
                }
              }}
              aria-label="Frecuencia"
            >
              {(Object.keys(FREQUENCY_LABEL) as (keyof typeof FREQUENCY_LABEL)[]).map((f) => (
                <ToggleGroupItem key={f} value={f} size="sm">
                  {FREQUENCY_LABEL[f]}
                </ToggleGroupItem>
              ))}
            </ToggleGroup>
          )}
        />
      </div>

      {(frequency === "weekly" || frequency === "biweekly") && (
        <div className="flex flex-col gap-3">
          <Label>{frequency === "weekly" ? "Qué días" : "Qué días (cada 2 semanas)"}</Label>
          <Controller
            control={form.control}
            name="weekdays"
            render={({ field }) => (
              <ToggleGroup
                type="multiple"
                value={field.value.map(String)}
                onValueChange={(v) => field.onChange(v.map(Number))}
                aria-label="Días de la semana"
              >
                {WEEKDAYS_UI.map((d) => (
                  <ToggleGroupItem key={d} value={String(d)} size="sm" aria-label={WEEKDAY_NAME[d]} className="w-9 px-0">
                    {WEEKDAY_INITIAL[d]}
                  </ToggleGroupItem>
                ))}
              </ToggleGroup>
            )}
          />
          {errors.weekdays?.message && (
            <p role="alert" className="text-sm text-ladrillo">
              {errors.weekdays.message}
            </p>
          )}
        </div>
      )}

      <div className="grid grid-cols-2 gap-4">
        <FormField
          id="task-due"
          label={frequency === "once" ? "Para cuándo" : "Empieza"}
          error={errors.due_date?.message}
        >
          <Controller
            control={form.control}
            name="due_date"
            render={({ field }) => (
              <Input
                id="task-due"
                type="date"
                value={field.value ?? ""}
                onChange={(e) => field.onChange(e.target.value || null)}
                aria-invalid={!!errors.due_date}
              />
            )}
          />
        </FormField>
        {frequency === "monthly" && (
          <FormField id="task-month-day" label="Día del mes" error={errors.month_day?.message}>
            <Controller
              control={form.control}
              name="month_day"
              render={({ field }) => (
                <Input
                  id="task-month-day"
                  type="number"
                  inputMode="numeric"
                  min={1}
                  max={31}
                  value={field.value ?? Number((dueDate ?? today).slice(8, 10))}
                  onChange={(e) => field.onChange(e.target.value ? Number(e.target.value) : null)}
                />
              )}
            />
          </FormField>
        )}
      </div>

      <div className="flex flex-col gap-3">
        <Label>Prioridad</Label>
        <Controller
          control={form.control}
          name="priority"
          render={({ field }) => (
            <ToggleGroup type="single" value={field.value} onValueChange={(v) => v && field.onChange(v)} aria-label="Prioridad">
              {(Object.keys(PRIORITY_LABEL) as (keyof typeof PRIORITY_LABEL)[]).map((p) => (
                <ToggleGroupItem key={p} value={p} size="sm">
                  {PRIORITY_LABEL[p]}
                </ToggleGroupItem>
              ))}
            </ToggleGroup>
          )}
        />
      </div>

      <FormField id="task-desc" label="Notas" error={errors.description?.message}>
        <Textarea id="task-desc" placeholder="Opcional" {...form.register("description")} />
      </FormField>

      <div className="flex items-center gap-3">
        <Controller
          control={form.control}
          name="is_private"
          render={({ field }) => (
            <Switch
              id="task-private"
              checked={field.value}
              onCheckedChange={(on) => {
                field.onChange(on)
                const assigned = form.getValues("assigned_to")
                if (on && assigned && assigned !== currentUserId) form.setValue("assigned_to", currentUserId)
              }}
            />
          )}
        />
        <Label htmlFor="task-private">Personal (solo la ves vos)</Label>
      </div>

      <div className="flex gap-4 pt-2">
        <Button type="submit" disabled={pending} className="flex-1">
          {pending ? "Guardando…" : task ? "Guardar cambios" : "Crear tarea"}
        </Button>
        {task && (
          <Button
            type="button"
            variant="destructive"
            size="icon"
            aria-label="Borrar tarea"
            disabled={pending}
            onClick={() =>
              startTransition(async () => {
                const res = await deleteTask(task.id)
                if (res.ok) {
                  toast.success("Tarea borrada")
                  onDone()
                } else toast.error(res.error)
              })
            }
          >
            <Trash aria-hidden />
          </Button>
        )}
      </div>
    </form>
  )
}
