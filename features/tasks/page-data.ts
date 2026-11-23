import "server-only"
import { memberName, type HouseholdContext } from "@/lib/session"
import type { MemberOption, TaskCategoryNode, TaskCategoryRow } from "./types"

export function memberOptions(ctx: HouseholdContext): MemberOption[] {
  return ctx.members.map((m) => ({ user_id: m.user_id, name: memberName(m), color: m.color }))
}

export function categoryMap(tree: TaskCategoryNode[]): Map<string, TaskCategoryRow> {
  const map = new Map<string, TaskCategoryRow>()
  for (const root of tree) {
    map.set(root.id, root)
    for (const c of root.children) map.set(c.id, c)
  }
  return map
}

/** Ids a filtrar: una raíz incluye sus subcategorías. */
export function categoryFilterIds(tree: TaskCategoryNode[], id: string | undefined): string[] | null {
  if (!id) return null
  const root = tree.find((r) => r.id === id)
  return root ? [root.id, ...root.children.map((c) => c.id)] : [id]
}
