"use client"

import { Copy, FileText, Plus } from "pixelarticons/react"
import { useTransition } from "react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { createMonthList } from "../actions"

/** Estado vacío del mes: crear la lista desde el mes anterior, una plantilla o vacía. */
export function StartList({
  month,
  monthName,
  previous,
  templates,
}: {
  month: string
  monthName: string
  previous: { id: string; name: string } | null
  templates: { id: string; name: string; count: number }[]
}) {
  const [pending, startTransition] = useTransition()
  const create = (source: string | null, label: string) =>
    startTransition(async () => {
      const res = await createMonthList(month, source)
      if (res.ok) toast.success(`Lista de ${monthName} creada${label}`)
      else toast.error(res.error)
    })

  return (
    <div className="flex flex-col gap-4">
      {previous && (
        <Button size="lg" disabled={pending} onClick={() => create(previous.id, ` a partir de ${previous.name}`)} className="w-full">
          <Copy aria-hidden /> Copiar {previous.name}
        </Button>
      )}
      {templates.map((t) => (
        <Button key={t.id} variant="secondary" disabled={pending} onClick={() => create(t.id, ` desde "${t.name}"`)} className="w-full">
          <FileText aria-hidden /> Usar plantilla “{t.name}” ({t.count})
        </Button>
      ))}
      <Button variant="outline" disabled={pending} onClick={() => create(null, "")} className="w-full">
        <Plus aria-hidden /> Empezar una lista vacía
      </Button>
    </div>
  )
}
