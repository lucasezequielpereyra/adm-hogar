import "server-only"
import { redirect } from "next/navigation"
import { cache } from "react"
import { createClient } from "@/lib/supabase/server"
import type { Database } from "@/lib/supabase/database.types"

export type Household = Database["public"]["Tables"]["households"]["Row"]
export type Member = Database["public"]["Tables"]["household_members"]["Row"] & {
  profile: Pick<Database["public"]["Tables"]["profiles"]["Row"], "id" | "display_name" | "avatar_url" | "username"> | null
}
export type Profile = Database["public"]["Tables"]["profiles"]["Row"]

/** Usuario autenticado (o null). Cacheado por request. */
export const getUser = cache(async () => {
  const supabase = await createClient()
  const { data } = await supabase.auth.getUser()
  return data.user ?? null
})

export async function requireUser() {
  const user = await getUser()
  if (!user) redirect("/ingresar")
  return user
}

export const getProfile = cache(async (): Promise<Profile | null> => {
  const user = await getUser()
  if (!user) return null
  const supabase = await createClient()
  const { data } = await supabase.from("profiles").select("*").eq("id", user.id).maybeSingle()
  return data
})

/** Hogares del usuario, con su rol. */
export const getMyHouseholds = cache(async () => {
  const user = await getUser()
  if (!user) return []
  const supabase = await createClient()
  const { data } = await supabase
    .from("household_members")
    .select("role, household:households(*)")
    .eq("user_id", user.id)
    .order("created_at")
  return (data ?? [])
    .filter((m) => m.household)
    .map((m) => ({ role: m.role as "admin" | "member", household: m.household as Household }))
})

/**
 * Contexto del hogar actual: el de profiles.current_household_id o, si no
 * es válido, el primero. Si el usuario no tiene hogar, va a /bienvenida.
 */
export const getHouseholdContext = cache(async () => {
  const user = await requireUser()
  const [profile, households] = await Promise.all([getProfile(), getMyHouseholds()])
  if (households.length === 0) redirect("/bienvenida")

  const current =
    households.find((h) => h.household.id === profile?.current_household_id) ?? households[0]

  const supabase = await createClient()
  const { data: members } = await supabase
    .from("household_members")
    .select("*, profile:profiles!household_members_user_id_fkey(id, display_name, avatar_url, username)")
    .eq("household_id", current.household.id)
    .order("created_at")

  return {
    user,
    profile: profile!,
    household: current.household,
    role: current.role,
    isAdmin: current.role === "admin",
    households,
    members: (members ?? []) as Member[],
  }
})

export type HouseholdContext = Awaited<ReturnType<typeof getHouseholdContext>>

/** Nombre visible de un miembro (apodo > nombre de perfil). */
export function memberName(m: Pick<Member, "nickname" | "profile"> | undefined | null) {
  if (!m) return "Alguien"
  return m.nickname || m.profile?.display_name || "Sin nombre"
}
