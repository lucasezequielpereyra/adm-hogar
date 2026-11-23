import { redirect } from "next/navigation"
import { Panel } from "@/components/pixel/panel"
import { PageHeader } from "@/components/shell/page-header"
import { InviteCreator } from "@/features/households/components/invite-creator"
import { RevokeInvitationButton } from "@/features/households/components/revoke-invitation-button"
import { shortDate } from "@/lib/domain/format"
import { getHouseholdContext } from "@/lib/session"
import { createClient } from "@/lib/supabase/server"

export const metadata = { title: "Invitaciones" }

export default async function InvitacionesPage() {
  const ctx = await getHouseholdContext()
  if (!ctx.isAdmin) redirect("/mas")
  const supabase = await createClient()
  const { data: all } = await supabase
    .from("invitations")
    .select("id, code, role, expires_at, uses_count, max_uses, invited_username")
    .eq("household_id", ctx.household.id)
    .is("revoked_at", null)
    .gt("expires_at", new Date().toISOString())
    .order("created_at", { ascending: false })
  // Las que ya agotaron sus usos no están activas.
  const invitations = (all ?? []).filter((i) => i.max_uses === null || i.uses_count < i.max_uses)

  return (
    <div className="flex flex-col gap-8">
      <PageHeader title="Invitaciones" back="/mas" />
      <Panel title="Invitar a alguien">
        <InviteCreator householdName={ctx.household.name} />
      </Panel>
      <Panel title="Activas">
        {invitations && invitations.length > 0 ? (
          <ul className="flex flex-col divide-y-[3px] divide-tinta/10 dark:divide-white/10">
            {invitations.map((inv) => (
              <li key={inv.id} className="flex items-center gap-3 py-3">
                <span className="font-display text-2xl leading-none tracking-[0.1em]">{inv.code}</span>
                <span className="min-w-0 flex-1 text-sm text-muted-foreground">
                  {inv.invited_username && <span className="block truncate font-semibold text-foreground">@{inv.invited_username}</span>}
                  {inv.role === "admin" ? "Admin" : "Miembro"} · vence {shortDate(inv.expires_at.slice(0, 10))}
                  {inv.uses_count > 0 && ` · usada ${inv.uses_count} ${inv.uses_count === 1 ? "vez" : "veces"}`}
                </span>
                <RevokeInvitationButton id={inv.id} />
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-muted-foreground">No hay invitaciones activas.</p>
        )}
      </Panel>
    </div>
  )
}
