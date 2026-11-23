"use client"

import { cn } from "cn"
import { Sparkles } from "pixelarticons/react"
import { useState, useTransition } from "react"
import { toast } from "sonner"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { recategorizeOne, setEntityCategory } from "../actions"
import type { CategoryOption, CategoryState, EntityType } from "../types"
import { CategoryIcon } from "./category-badge"

/**
 * Chip de categoría de un gasto. Muestra ✨ si la asignó la IA o una regla,
 * "Revisar" si tiene baja confianza o falló, y al tocarlo deja cambiarla.
 */
export function CategoryChip({
  entityType,
  entityId,
  state,
  categories,
}: {
  entityType: EntityType
  entityId: string
  state: CategoryState
  categories: CategoryOption[]
}) {
  const [open, setOpen] = useState(false)
  const [pending, startTransition] = useTransition()
  const category = categories.find((c) => c.id === state.category_id)
  const categorizing = state.categorization_status === "categorizing"
  const automatic = state.category_source === "ai" || state.category_source === "rule"

  if (categorizing) {
    return (
      <span className="inline-flex animate-blink-3 items-center gap-1.5 text-sm text-uva">
        <Sparkles className="size-4" aria-hidden /> Categorizando…
      </span>
    )
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          disabled={pending}
          className="inline-flex min-w-0 items-center gap-1.5 text-left text-sm"
          aria-label={`Categoría: ${category?.name ?? "sin categoría"}. Tocá para cambiarla.`}
        >
          {category && <CategoryIcon category={category} />}
          <span className="truncate">{category?.name ?? "Sin categoría"}</span>
          {automatic && <Sparkles className="size-4 shrink-0 text-uva" aria-label="Asignada automáticamente" />}
          {state.needs_review && (
            <span className="shrink-0 bg-uva px-1.5 text-xs font-semibold text-white dark:text-tinta">Revisar</span>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-[min(320px,calc(100vw-40px))] p-0">
        {(automatic || state.categorization_status === "failed") && (
          <div className="border-b-[3px] border-tinta/10 p-3 text-sm dark:border-white/10">
            {state.categorization_status === "failed" ? (
              <p>No se pudo categorizar automáticamente. Elegí una categoría.</p>
            ) : (
              <>
                <p className="flex items-center gap-1.5 font-semibold">
                  <Sparkles className="size-4 text-uva" aria-hidden />
                  {state.category_source === "rule" ? "Por una regla aprendida" : "Elegida por la IA"}
                  {state.ai_confidence !== null && state.category_source === "ai" && (
                    <span className="font-normal text-muted-foreground">· {Math.round(state.ai_confidence * 100)}% seguro</span>
                  )}
                </p>
                {state.ai_reason && <p className="mt-1 text-muted-foreground">{state.ai_reason}</p>}
              </>
            )}
          </div>
        )}
        <ul className="max-h-72 overflow-y-auto p-1" role="listbox" aria-label="Elegí una categoría">
          {categories
            .filter((c) => !c.is_system)
            .map((c) => (
              <li key={c.id}>
                <button
                  type="button"
                  role="option"
                  aria-selected={c.id === state.category_id}
                  className={cn(
                    "flex min-h-11 w-full items-center gap-2 px-3 text-left hover:bg-accent",
                    c.id === state.category_id && "bg-accent font-semibold",
                  )}
                  onClick={() => {
                    setOpen(false)
                    if (c.id === state.category_id && !state.needs_review) return
                    startTransition(async () => {
                      const res = await setEntityCategory(entityType, entityId, c.id)
                      if (res.ok) toast.success(`Categoría: ${c.name}`)
                      else toast.error(res.error)
                    })
                  }}
                >
                  <CategoryIcon category={c} />
                  {c.name}
                </button>
              </li>
            ))}
        </ul>
        <div className="border-t-[3px] border-tinta/10 p-2 dark:border-white/10">
          <button
            type="button"
            className="flex min-h-11 w-full items-center gap-2 px-3 text-left text-uva hover:bg-accent"
            onClick={() => {
              setOpen(false)
              startTransition(async () => {
                const res = await recategorizeOne(entityType, entityId)
                if (!res.ok) toast.error(res.error)
              })
            }}
          >
            <Sparkles className="size-5" aria-hidden /> Volver a categorizar con IA
          </button>
        </div>
      </PopoverContent>
    </Popover>
  )
}
