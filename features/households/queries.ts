import "server-only"
import { createClient } from "@/lib/supabase/server"

export type MyInvitation = {
  code: string
  household_name: string
  role: string
  invited_by: string
  invited_by_username: string | null
  expires_at: string
}

/** Invitaciones pendientes dirigidas a mi usuario. */
export async function getMyInvitations(): Promise<MyInvitation[]> {
  const supabase = await createClient()
  const { data } = await supabase.rpc("get_my_invitations")
  return data ?? []
}
