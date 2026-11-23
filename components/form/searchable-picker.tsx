"use client"

import { cn } from "cn"
import { Check, ChevronDown, Search } from "pixelarticons/react"
import { useEffect, useId, useMemo, useRef, useState, type ReactNode } from "react"
import { Drawer, DrawerContent, DrawerDescription, DrawerHeader, DrawerTitle } from "@/components/ui/drawer"
import { Input } from "@/components/ui/input"

export type PickerOption = {
  value: string | null
  label: ReactNode
  /** Texto donde se busca (ej. "cocinar lavar platos"). */
  keywords: string
  /** Subopción (va con sangría debajo de su grupo). */
  indent?: boolean
}

export type PickerGroup = { key: string; options: PickerOption[] }

/** En el celular no abrimos el teclado solo: tapa la lista. */
function hasFinePointer() {
  return typeof window !== "undefined" && window.matchMedia("(pointer: fine)").matches
}

/** Minúsculas y sin tildes: "Baño" y "bano" coinciden. */
export function normalizeSearch(s: string) {
  return s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim()
}

function filterGroups(groups: PickerGroup[], query: string): PickerGroup[] {
  const tokens = normalizeSearch(query).split(/\s+/).filter(Boolean)
  if (tokens.length === 0) return groups
  return groups
    .map((g) => ({
      ...g,
      options: g.options.filter((o) => {
        const hay = normalizeSearch(o.keywords)
        return tokens.every((t) => hay.includes(t))
      }),
    }))
    .filter((g) => g.options.length > 0)
}

/** Buscador + lista con scroll nativo (funciona bien con el dedo y dentro de drawers). */
export function PickerList({
  groups,
  value,
  onSelect,
  searchPlaceholder = "Buscar…",
  autoFocus = false,
}: {
  groups: PickerGroup[]
  value: string | null
  onSelect: (value: string | null) => void
  searchPlaceholder?: string
  autoFocus?: boolean
}) {
  const [query, setQuery] = useState("")
  const listId = useId()
  const inputRef = useRef<HTMLInputElement>(null)
  useEffect(() => {
    if (autoFocus && hasFinePointer()) inputRef.current?.focus()
  }, [autoFocus])
  const visible = useMemo(() => filterGroups(groups, query), [groups, query])
  const first = visible[0]?.options[0]

  return (
    <div className="flex flex-col gap-3">
      <div className="relative">
        <Search className="pointer-events-none absolute top-1/2 left-3 size-5 -translate-y-1/2 text-muted-foreground" aria-hidden />
        <Input
          ref={inputRef}
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => {
            // Enter elige el primer resultado.
            if (e.key === "Enter") {
              e.preventDefault()
              if (first) onSelect(first.value)
            }
          }}
          placeholder={searchPlaceholder}
          aria-label={searchPlaceholder}
          aria-controls={listId}
          className="pl-10"
        />
      </div>
      {/* data-vaul-no-drag: deslizar sobre la lista la scrollea, no arrastra el drawer. */}
      <ul
        id={listId}
        role="listbox"
        data-vaul-no-drag
        className="mx-[3px] max-h-[min(50dvh,380px)] touch-pan-y overflow-y-auto overscroll-contain bg-panel p-1 pixel-frame"
      >
        {visible.length === 0 && <li className="px-3 py-4 text-muted-foreground">No hay nada con “{query}”.</li>}
        {visible.map((g, gi) => (
          <li key={g.key} role="presentation" className={cn(gi > 0 && "mt-1 border-t-2 border-tinta/10 pt-1 dark:border-white/10")}>
            <ul role="group">
              {g.options.map((o) => {
                const selected = o.value === value
                return (
                  <li key={o.value ?? "__null__"} role="presentation">
                    <button
                      type="button"
                      role="option"
                      aria-selected={selected}
                      onClick={() => onSelect(o.value)}
                      className={cn(
                        "flex min-h-11 w-full items-center gap-2 px-3 py-1.5 text-left hover:bg-accent focus-visible:bg-accent",
                        o.indent && "pl-9",
                        selected && "bg-accent font-semibold",
                      )}
                    >
                      <span className="min-w-0 flex-1">{o.label}</span>
                      {selected && <Check className="size-5 shrink-0" aria-hidden />}
                    </button>
                  </li>
                )
              })}
            </ul>
          </li>
        ))}
      </ul>
    </div>
  )
}

const triggerClass =
  "flex h-12 w-full min-w-0 items-center justify-between gap-2 bg-panel px-3 text-left text-base text-foreground pixel-inset outline-none"

/** Selector que se despliega en el lugar (para usar dentro de formularios en drawers). */
export function InlinePicker({
  id,
  groups,
  value,
  onChange,
  display,
  searchPlaceholder,
}: {
  id?: string
  groups: PickerGroup[]
  value: string | null
  onChange: (value: string | null) => void
  /** Lo que muestra el botón (la opción elegida). */
  display: ReactNode
  searchPlaceholder?: string
}) {
  const [open, setOpen] = useState(false)
  return (
    <div className="flex flex-col gap-3">
      <button id={id} type="button" aria-expanded={open} onClick={() => setOpen((o) => !o)} className={triggerClass}>
        <span className="min-w-0 flex-1 truncate">{display}</span>
        <ChevronDown className={cn("size-6 shrink-0", open && "rotate-180")} aria-hidden />
      </button>
      {open && (
        <PickerList
          groups={groups}
          value={value}
          autoFocus
          searchPlaceholder={searchPlaceholder}
          onSelect={(v) => {
            onChange(v)
            setOpen(false)
          }}
        />
      )}
    </div>
  )
}

/** Selector en un panel desde abajo (para filtros fuera de formularios). */
export function DrawerPicker({
  title,
  groups,
  value,
  onChange,
  display,
  searchPlaceholder,
  ariaLabel,
  size = "default",
}: {
  title: string
  groups: PickerGroup[]
  value: string | null
  onChange: (value: string | null) => void
  display: ReactNode
  searchPlaceholder?: string
  ariaLabel?: string
  size?: "default" | "sm"
}) {
  const [open, setOpen] = useState(false)
  return (
    <Drawer open={open} onOpenChange={setOpen} repositionInputs={false}>
      <button
        type="button"
        aria-label={ariaLabel}
        aria-haspopup="dialog"
        onClick={() => setOpen(true)}
        className={cn(triggerClass, size === "sm" && "h-10")}
      >
        <span className="min-w-0 flex-1 truncate">{display}</span>
        <ChevronDown className="size-6 shrink-0" aria-hidden />
      </button>
      <DrawerContent
        onOpenAutoFocus={(e) => {
          if (!hasFinePointer()) e.preventDefault()
        }}
      >
        <DrawerHeader>
          <DrawerTitle>{title}</DrawerTitle>
          <DrawerDescription className="sr-only">Buscá y elegí una opción.</DrawerDescription>
        </DrawerHeader>
        <div className="px-5 pt-1 pb-8">
          {open && (
            <PickerList
              groups={groups}
              value={value}
              autoFocus
              searchPlaceholder={searchPlaceholder}
              onSelect={(v) => {
                onChange(v)
                setOpen(false)
              }}
            />
          )}
        </div>
      </DrawerContent>
    </Drawer>
  )
}
