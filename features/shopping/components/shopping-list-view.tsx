"use client"

import { cn } from "cn"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { MoreVertical, Plus } from "pixelarticons/react"
import { useEffect, useOptimistic, useState, useTransition } from "react"
import { toast } from "sonner"
import { useCoinPop } from "@/components/pixel/coin-pop"
import { Money } from "@/components/pixel/money"
import { Panel } from "@/components/pixel/panel"
import { SegmentedBar } from "@/components/pixel/segmented-bar"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { paletteVar } from "@/lib/palette"
import { playSound } from "@/lib/sound"
import { deleteList, quickAddItem, saveAsTemplate, setPurchased } from "../actions"
import { SHOPPING_CATEGORIES, unitLabel, type ShoppingCategory } from "../constants"
import type { ShoppingItem, ShoppingList } from "../types"
import { ItemEditor, type ItemEditorState } from "./item-editor"

type Totals = { estimated: number; real: number; purchased: number; total: number; missingReal: number }

export function ShoppingListView({
  list,
  items,
  totals,
  isTemplate = false,
}: {
  list: ShoppingList
  items: ShoppingItem[]
  totals: Totals
  isTemplate?: boolean
}) {
  const [editor, setEditor] = useState<ItemEditorState>({ open: false, item: null })
  const searchParams = useSearchParams()
  const router = useRouter()
  const pathname = usePathname()

  // Acción rápida del botón (+): ?nuevo=1
  useEffect(() => {
    if (searchParams.get("nuevo") === "1") {
      setEditor({ open: true, item: null })
      const p = new URLSearchParams(searchParams)
      p.delete("nuevo")
      router.replace(p.size ? `${pathname}?${p}` : pathname, { scroll: false })
    }
  }, [searchParams, router, pathname])

  const groups = SHOPPING_CATEGORIES.map((c) => ({ ...c, items: items.filter((i) => i.category === c.key) })).filter(
    (g) => g.items.length > 0,
  )

  return (
    <div className="flex flex-col gap-6">
      {!isTemplate && (
        <Panel>
          <div className="mb-3 flex items-baseline justify-between gap-3">
            <span className="font-semibold">
              {totals.purchased} de {totals.total} comprados
            </span>
            <ListActions list={list} />
          </div>
          <SegmentedBar value={totals.purchased} max={Math.max(totals.total, 1)} label={`${totals.purchased} de ${totals.total} comprados`} />
          <dl className="mt-4 grid grid-cols-2 gap-4">
            <div>
              <dt className="text-sm text-muted-foreground">Estimado</dt>
              <dd>
                <Money amount={totals.estimated} display className="text-3xl" />
              </dd>
            </div>
            <div>
              <dt className="text-sm text-muted-foreground">Real (comprado)</dt>
              <dd>
                <Money amount={totals.real} display className="text-3xl" />
              </dd>
            </div>
          </dl>
          {totals.missingReal > 0 && (
            <p className="mt-2 text-sm text-muted-foreground">
              {totals.missingReal} {totals.missingReal === 1 ? "ítem comprado usa" : "ítems comprados usan"} el precio estimado.
            </p>
          )}
        </Panel>
      )}

      <QuickAdd listId={list.id} />

      {groups.map((g) => (
        <Panel
          key={g.key}
          title={
            <span className="flex items-center gap-2">
              <span className="inline-flex size-7 items-center justify-center text-tinta" style={{ background: paletteVar(g.color) }}>
                <g.icon className="size-5" aria-hidden />
              </span>
              {g.label}
            </span>
          }
        >
          <ul className="-my-2 flex flex-col divide-y-[3px] divide-tinta/10 dark:divide-white/10">
            {g.items.map((item) => (
              <ItemRow key={item.id} item={item} onEdit={() => setEditor({ open: true, item })} showCheck={!isTemplate} />
            ))}
          </ul>
        </Panel>
      ))}

      {isTemplate && (
        <Button variant="outline" onClick={() => setEditor({ open: true, item: null })}>
          <Plus aria-hidden /> Agregar ítem con detalle
        </Button>
      )}

      <ItemEditor listId={list.id} state={editor} onClose={() => setEditor((s) => ({ ...s, open: false }))} allowPurchase={!isTemplate} />
    </div>
  )
}

function ItemRow({ item, onEdit, showCheck }: { item: ShoppingItem; onEdit: () => void; showCheck: boolean }) {
  const [pending, startTransition] = useTransition()
  const [checked, setChecked] = useOptimistic(item.is_purchased)
  const { pop, node } = useCoinPop()
  const price = item.is_purchased ? (item.actual_price ?? item.estimated_price) : item.estimated_price

  return (
    <li className="relative flex items-center gap-3 py-2">
      {node}
      {showCheck && (
        <Checkbox
          checked={checked}
          disabled={pending}
          aria-label={checked ? `Desmarcar ${item.name}` : `Marcar ${item.name} como comprado`}
          onCheckedChange={(v) =>
            startTransition(async () => {
              const on = v === true
              setChecked(on)
              if (on) {
                pop()
                playSound("check")
              }
              const res = await setPurchased(item.id, on)
              if (!res.ok) toast.error(res.error)
            })
          }
        />
      )}
      <button type="button" onClick={onEdit} className="flex min-w-0 flex-1 items-baseline gap-3 py-1 text-left">
        <span className={cn("min-w-0 flex-1 truncate", checked && "text-muted-foreground line-through decoration-2")}>
          {item.name}
        </span>
        <span className="shrink-0 text-sm text-muted-foreground">
          {String(Number(item.quantity)).replace(".", ",")} {unitLabel(item.unit)}
        </span>
        {price !== null && <Money amount={price} className="shrink-0 text-sm" />}
      </button>
    </li>
  )
}

function QuickAdd({ listId }: { listId: string }) {
  const [name, setName] = useState("")
  const [category, setCategory] = useState<ShoppingCategory>("almacen")
  const [pending, startTransition] = useTransition()

  return (
    <form
      className="flex flex-col gap-3"
      onSubmit={(e) => {
        e.preventDefault()
        if (!name.trim()) return
        startTransition(async () => {
          const res = await quickAddItem(listId, name, category)
          if (res.ok) setName("")
          else toast.error(res.error)
        })
      }}
    >
      <div className="flex gap-3">
        <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Agregar a la lista…" aria-label="Nuevo ítem" />
        <Button type="submit" size="icon" disabled={pending || !name.trim()} aria-label="Agregar ítem">
          <Plus aria-hidden />
        </Button>
      </div>
      <Select value={category} onValueChange={(v) => setCategory(v as ShoppingCategory)}>
        <SelectTrigger size="sm" aria-label="Categoría del ítem nuevo">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {SHOPPING_CATEGORIES.map((c) => (
            <SelectItem key={c.key} value={c.key}>
              <c.icon aria-hidden /> {c.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </form>
  )
}

function ListActions({ list }: { list: ShoppingList }) {
  const [pending, startTransition] = useTransition()
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon-sm" aria-label="Opciones de la lista" disabled={pending}>
          <MoreVertical aria-hidden />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem
          onSelect={() => {
            const name = window.prompt("Nombre de la plantilla", "Básicos del mes")
            if (!name) return
            startTransition(async () => {
              const res = await saveAsTemplate(list.id, name)
              if (res.ok) toast.success("Plantilla guardada")
              else toast.error(res.error)
            })
          }}
        >
          Guardar como plantilla
        </DropdownMenuItem>
        <DropdownMenuItem
          className="text-ladrillo"
          onSelect={() => {
            if (!window.confirm(`¿Borrar la lista de ${list.name}?`)) return
            startTransition(async () => {
              const res = await deleteList(list.id)
              if (res.ok) toast.success("Lista borrada")
              else toast.error(res.error)
            })
          }}
        >
          Borrar lista
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
