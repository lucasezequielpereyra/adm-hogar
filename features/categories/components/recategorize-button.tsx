"use client"

import { useRouter } from "next/navigation"
import { Sparkles } from "pixelarticons/react"
import { useState } from "react"
import { toast } from "sonner"
import { SegmentedBar } from "@/components/pixel/segmented-bar"
import { Button } from "@/components/ui/button"
import type { EntityType } from "../types"

/** Recategoriza con IA una lista de gastos, en lotes de 10. */
export function RecategorizeButton({
  entityType,
  ids,
  label = "Recategorizar con IA",
}: {
  entityType: EntityType
  ids: string[]
  label?: string
}) {
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null)
  const router = useRouter()

  async function run() {
    if (ids.length === 0) return
    if (!window.confirm(`¿Volver a categorizar ${ids.length} ${ids.length === 1 ? "gasto" : "gastos"} con IA? Primero se aplican las reglas aprendidas.`)) return
    setProgress({ done: 0, total: ids.length })
    let ok = 0
    let failed = 0
    for (let i = 0; i < ids.length; i += 10) {
      const chunk = ids.slice(i, i + 10)
      const res = await fetch("/api/ai/recategorize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ entityType, ids: chunk }),
      })
      const body = await res.json().catch(() => ({}))
      ok += body.categorized ?? 0
      failed += body.failed ?? 0
      setProgress({ done: Math.min(i + chunk.length, ids.length), total: ids.length })
      router.refresh()
      if (res.status === 429) {
        toast.error("Se alcanzó el límite de uso de IA del hogar. Probá más tarde.")
        break
      }
      if (!res.ok) {
        toast.error(body.error ?? "No se pudo recategorizar.")
        break
      }
    }
    setProgress(null)
    toast.success(`Listo: ${ok} categorizados${failed ? `, ${failed} a revisar` : ""}.`)
  }

  if (progress) {
    return (
      <div className="flex flex-col gap-2" aria-live="polite">
        <span className="text-sm">
          Categorizando {progress.done} de {progress.total}…
        </span>
        <SegmentedBar value={progress.done} max={progress.total} color="var(--uva)" label="Progreso de la recategorización" />
      </div>
    )
  }

  return (
    <Button variant="outline" size="sm" onClick={run} disabled={ids.length === 0}>
      <Sparkles aria-hidden /> {label} ({ids.length})
    </Button>
  )
}
