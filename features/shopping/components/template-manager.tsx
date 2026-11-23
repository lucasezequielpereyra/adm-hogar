"use client"

import Link from "next/link"
import { ChevronRight, Plus, Trash } from "pixelarticons/react"
import { useRouter } from "next/navigation"
import { useTransition } from "react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { createEmptyTemplate, deleteList } from "../actions"

export function TemplateManager({ templates }: { templates: { id: string; name: string; count: number }[] }) {
  const [pending, startTransition] = useTransition()
  const router = useRouter()
  return (
    <div className="flex flex-col gap-4">
      {templates.map((t) => (
        <div key={t.id} className="flex items-center gap-3">
          <Link href={`/compras/plantillas/${t.id}`} className="mx-[3px] flex min-h-14 flex-1 items-center gap-3 bg-panel px-4 pixel-block active:pixel-pressed">
            <span className="flex-1 font-semibold">{t.name}</span>
            <span className="text-sm text-muted-foreground">{t.count} ítems</span>
            <ChevronRight className="size-6" aria-hidden />
          </Link>
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label={`Borrar plantilla ${t.name}`}
            disabled={pending}
            onClick={() => {
              if (!window.confirm(`¿Borrar la plantilla "${t.name}"?`)) return
              startTransition(async () => {
                const res = await deleteList(t.id)
                if (res.ok) toast.success("Plantilla borrada")
                else toast.error(res.error)
              })
            }}
          >
            <Trash aria-hidden />
          </Button>
        </div>
      ))}
      <Button
        variant="outline"
        disabled={pending}
        onClick={() => {
          const name = window.prompt("Nombre de la plantilla", "Básicos")
          if (!name) return
          startTransition(async () => {
            const res = await createEmptyTemplate(name)
            if (res.ok) router.push(`/compras/plantillas/${res.data.id}`)
            else toast.error(res.error)
          })
        }}
      >
        <Plus aria-hidden /> Nueva plantilla
      </Button>
    </div>
  )
}
