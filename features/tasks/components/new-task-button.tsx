"use client"

import { Plus } from "pixelarticons/react"
import { Button } from "@/components/ui/button"
import { useTaskEditor } from "./task-editor"

export function NewTaskButton({ label = "Nueva tarea", variant = "default" }: { label?: string; variant?: "default" | "outline" }) {
  const { openNew } = useTaskEditor()
  return (
    <Button size="sm" variant={variant} onClick={() => openNew()}>
      <Plus aria-hidden />
      {label}
    </Button>
  )
}
