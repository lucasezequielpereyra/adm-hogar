"use server"

import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"
import { fail, fromDb, fromZod, ok, type ActionResult } from "@/lib/actions"
import { getHouseholdContext, requireUser } from "@/lib/session"
import { createClient } from "@/lib/supabase/server"
import {
  householdNameSchema,
  householdSettingsSchema,
  invitationSchema,
  joinSchema,
  memberSelfSchema,
  profileSchema,
  type HouseholdNameValues,
  type HouseholdSettingsValues,
  type InvitationValues,
  type JoinValues,
  type MemberSelfValues,
  type ProfileValues,
} from "./schemas"

export async function createHousehold(values: HouseholdNameValues): Promise<ActionResult> {
  await requireUser()
  const parsed = householdNameSchema.safeParse(values)
  if (!parsed.success) return fromZod(parsed.error)
  const supabase = await createClient()
  const { error } = await supabase.rpc("create_household", { p_name: parsed.data.name })
  if (error) return fromDb(error, "No se pudo crear el hogar.")
  revalidatePath("/", "layout")
  redirect("/")
}

export async function joinHousehold(values: JoinValues): Promise<ActionResult> {
  await requireUser()
  const parsed = joinSchema.safeParse(values)
  if (!parsed.success) return fromZod(parsed.error)
  const supabase = await createClient()
  const { error } = await supabase.rpc("accept_invitation", { p_code: parsed.data.code })
  if (error) return fromDb(error, "No pudimos unirte al hogar.")
  revalidatePath("/", "layout")
  redirect("/")
}

export async function switchHousehold(householdId: string): Promise<ActionResult> {
  const user = await requireUser()
  const supabase = await createClient()
  const { error } = await supabase
    .from("profiles")
    .update({ current_household_id: householdId })
    .eq("id", user.id)
  if (error) return fromDb(error, "No se pudo cambiar de hogar.")
  revalidatePath("/", "layout")
  return ok()
}

export async function updateHousehold(values: HouseholdSettingsValues): Promise<ActionResult> {
  const ctx = await getHouseholdContext()
  if (!ctx.isAdmin) return fail("Solo un admin puede editar el hogar.")
  const parsed = householdSettingsSchema.safeParse(values)
  if (!parsed.success) return fromZod(parsed.error)
  const supabase = await createClient()
  const { error } = await supabase.from("households").update(parsed.data).eq("id", ctx.household.id)
  if (error) return fromDb(error)
  revalidatePath("/", "layout")
  return ok()
}

export async function updateMyMembership(values: MemberSelfValues): Promise<ActionResult> {
  const ctx = await getHouseholdContext()
  const parsed = memberSelfSchema.safeParse(values)
  if (!parsed.success) return fromZod(parsed.error)
  const supabase = await createClient()
  const { error } = await supabase
    .from("household_members")
    .update({ nickname: parsed.data.nickname || null, color: parsed.data.color })
    .eq("household_id", ctx.household.id)
    .eq("user_id", ctx.user.id)
  if (error) {
    if (error.code === "23505") return fail("Ese color ya lo usa otra persona del hogar.")
    return fromDb(error)
  }
  revalidatePath("/", "layout")
  return ok()
}

export async function setMemberRole(memberId: string, role: "admin" | "member"): Promise<ActionResult> {
  const ctx = await getHouseholdContext()
  if (!ctx.isAdmin) return fail("Solo un admin puede cambiar roles.")
  const supabase = await createClient()
  const { error } = await supabase
    .from("household_members")
    .update({ role })
    .eq("id", memberId)
    .eq("household_id", ctx.household.id)
  if (error) return fromDb(error)
  revalidatePath("/mas/miembros")
  return ok()
}

export async function removeMember(memberId: string): Promise<ActionResult> {
  const ctx = await getHouseholdContext()
  const supabase = await createClient()
  const { error, count } = await supabase
    .from("household_members")
    .delete({ count: "exact" })
    .eq("id", memberId)
    .eq("household_id", ctx.household.id)
  if (error) return fromDb(error)
  if (!count) return fail("No tenés permiso para quitar a esa persona.")
  revalidatePath("/", "layout")
  return ok()
}

export async function leaveHousehold(): Promise<ActionResult> {
  const ctx = await getHouseholdContext()
  const supabase = await createClient()
  const { error } = await supabase
    .from("household_members")
    .delete()
    .eq("household_id", ctx.household.id)
    .eq("user_id", ctx.user.id)
  if (error) return fromDb(error)
  revalidatePath("/", "layout")
  redirect("/")
}

export async function createInvitation(values: InvitationValues): Promise<ActionResult<{ code: string }>> {
  const ctx = await getHouseholdContext()
  if (!ctx.isAdmin) return fail("Solo un admin puede invitar.")
  const parsed = invitationSchema.safeParse(values)
  if (!parsed.success) return fromZod(parsed.error)
  const supabase = await createClient()
  const expires = new Date(Date.now() + parsed.data.days * 86_400_000).toISOString()
  if (parsed.data.username) {
    const me = ctx.members.find((m) => m.user_id === ctx.user.id)
    if (parsed.data.username === me?.profile?.username) return fail("Ese sos vos.")
    const { data: code, error } = await supabase.rpc("invite_user", {
      p_household_id: ctx.household.id,
      p_username: parsed.data.username,
      p_role: parsed.data.role,
      p_days: parsed.data.days,
    })
    if (error) {
      const failure = fromDb(error, "No se pudo crear la invitación.")
      return { ...failure, fieldErrors: { username: failure.error } }
    }
    revalidatePath("/mas/invitaciones")
    return ok({ code })
  }
  const { data, error } = await supabase
    .from("invitations")
    .insert({ household_id: ctx.household.id, role: parsed.data.role, expires_at: expires, created_by: ctx.user.id })
    .select("code")
    .single()
  if (error) return fromDb(error, "No se pudo crear la invitación.")
  revalidatePath("/mas/invitaciones")
  return ok({ code: data.code })
}

export async function revokeInvitation(invitationId: string): Promise<ActionResult> {
  const ctx = await getHouseholdContext()
  const supabase = await createClient()
  const { error } = await supabase
    .from("invitations")
    .update({ revoked_at: new Date().toISOString() })
    .eq("id", invitationId)
    .eq("household_id", ctx.household.id)
  if (error) return fromDb(error)
  revalidatePath("/mas/invitaciones")
  return ok()
}

export async function updateProfile(values: ProfileValues): Promise<ActionResult> {
  const user = await requireUser()
  const parsed = profileSchema.safeParse(values)
  if (!parsed.success) return fromZod(parsed.error)
  const supabase = await createClient()
  const { error } = await supabase.from("profiles").update(parsed.data).eq("id", user.id)
  if (error) return fromDb(error)
  revalidatePath("/", "layout")
  return ok()
}

export async function declineInvitation(code: string): Promise<ActionResult> {
  await requireUser()
  const supabase = await createClient()
  const { error } = await supabase.rpc("decline_invitation", { p_code: code })
  if (error) return fromDb(error, "No se pudo rechazar la invitación.")
  revalidatePath("/", "layout")
  return ok()
}

/** Unirse desde la lista de invitaciones pendientes (sin redirigir). */
export async function acceptInvitationInline(code: string): Promise<ActionResult> {
  await requireUser()
  const supabase = await createClient()
  const { error } = await supabase.rpc("accept_invitation", { p_code: code })
  if (error) return fromDb(error, "No pudimos unirte al hogar.")
  revalidatePath("/", "layout")
  return ok()
}
