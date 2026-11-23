"use client"

import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react"
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer"
import type { TaskValues } from "../schemas"
import type { MemberOption, TaskCategoryNode, TaskItem } from "../types"
import { TaskForm } from "./task-form"

type EditorState = { open: boolean; task: TaskItem | null; defaults?: Partial<TaskValues> }

const EditorContext = createContext<{
  openNew: (defaults?: Partial<TaskValues>) => void
  openEdit: (task: TaskItem) => void
} | null>(null)

export function useTaskEditor() {
  const ctx = useContext(EditorContext)
  if (!ctx) throw new Error("useTaskEditor fuera de TaskEditorProvider")
  return ctx
}

/**
 * Un único drawer para crear/editar tareas. Se abre solo si la URL trae
 * ?nueva=1 (acción rápida del botón +).
 */
export function TaskEditorProvider({
  members,
  categories,
  currentUserId,
  today,
  children,
}: {
  members: MemberOption[]
  categories: TaskCategoryNode[]
  currentUserId: string
  today: string
  children: ReactNode
}) {
  const [state, setState] = useState<EditorState>({ open: false, task: null })
  const searchParams = useSearchParams()
  const router = useRouter()
  const pathname = usePathname()

  const openNew = useCallback(
    (defaults?: Partial<TaskValues>) =>
      setState({ open: true, task: null, defaults: { assigned_to: currentUserId, ...defaults } }),
    [currentUserId],
  )
  const openEdit = useCallback((task: TaskItem) => setState({ open: true, task }), [])

  useEffect(() => {
    if (searchParams.get("nueva") === "1") {
      openNew()
      const params = new URLSearchParams(searchParams)
      params.delete("nueva")
      router.replace(params.size ? `${pathname}?${params}` : pathname, { scroll: false })
    }
  }, [searchParams, openNew, router, pathname])

  const value = useMemo(() => ({ openNew, openEdit }), [openNew, openEdit])
  const close = () => setState((s) => ({ ...s, open: false }))

  return (
    <EditorContext.Provider value={value}>
      {children}
      <Drawer open={state.open} onOpenChange={(o) => (o ? null : close())} repositionInputs={false}>
        <DrawerContent>
          <DrawerHeader>
            <DrawerTitle>{state.task ? "Editar tarea" : "Nueva tarea"}</DrawerTitle>
            <DrawerDescription className="sr-only">Completá los datos de la tarea.</DrawerDescription>
          </DrawerHeader>
          <div className="overflow-y-auto px-5 pt-1 pb-8">
            {state.open && (
              <TaskForm
                key={state.task?.id ?? "nueva"}
                task={state.task}
                defaults={state.defaults}
                members={members}
                categories={categories}
                currentUserId={currentUserId}
                today={today}
                onDone={close}
              />
            )}
          </div>
        </DrawerContent>
      </Drawer>
    </EditorContext.Provider>
  )
}
