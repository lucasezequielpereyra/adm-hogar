"use client"

import { cn } from "cn"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { MemberAvatar } from "@/components/pixel/member-chip"
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from "@/components/ui/select"
import type { MemberOption, TaskCategoryNode } from "../types"

const ALL = "__all__"

export function TaskFilters({
  members,
  categories,
  showMembers,
}: {
  members: MemberOption[]
  categories: TaskCategoryNode[]
  showMembers: boolean
}) {
  const router = useRouter()
  const pathname = usePathname()
  const params = useSearchParams()
  const member = params.get("miembro")
  const category = params.get("cat") ?? ALL

  function set(key: string, value: string | null) {
    const next = new URLSearchParams(params)
    if (value) next.set(key, value)
    else next.delete(key)
    router.replace(next.size ? `${pathname}?${next}` : pathname, { scroll: false })
  }

  const chip = (active: boolean) =>
    cn(
      "inline-flex h-10 shrink-0 items-center gap-1.5 px-3 text-sm font-semibold pixel-frame",
      active ? "bg-moneda text-tinta" : "bg-panel",
    )

  return (
    <div className="flex flex-col gap-4">
      {showMembers && (
        <div className="-mx-4 flex gap-3 overflow-x-auto px-[19px] py-[3px]" role="group" aria-label="Filtrar por miembro">
          <button type="button" className={chip(!member)} aria-pressed={!member} onClick={() => set("miembro", null)}>
            Todos
          </button>
          {members.map((m) => (
            <button
              key={m.user_id}
              type="button"
              className={chip(member === m.user_id)}
              aria-pressed={member === m.user_id}
              onClick={() => set("miembro", m.user_id)}
            >
              <MemberAvatar name={m.name} color={m.color} size={20} className="m-0 shadow-none" />
              {m.name}
            </button>
          ))}
          <button
            type="button"
            className={chip(member === "sin-asignar")}
            aria-pressed={member === "sin-asignar"}
            onClick={() => set("miembro", "sin-asignar")}
          >
            Sin asignar
          </button>
        </div>
      )}
      <Select value={category} onValueChange={(v) => set("cat", v === ALL ? null : v)}>
        <SelectTrigger aria-label="Filtrar por categoría" size="sm">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL}>Todas las categorías</SelectItem>
          {categories.map((root) => (
            <SelectGroup key={root.id}>
              <SelectLabel>{root.name}</SelectLabel>
              <SelectItem value={root.id}>Todo {root.name}</SelectItem>
              {root.children.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {root.name} › {c.name}
                </SelectItem>
              ))}
            </SelectGroup>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}
