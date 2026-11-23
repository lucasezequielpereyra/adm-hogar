import Link from "next/link"
import { Plus } from "pixelarticons/react"
import { Panel } from "@/components/pixel/panel"
import { PageHeader } from "@/components/shell/page-header"
import { Button } from "@/components/ui/button"
import { HouseholdSettingsForm } from "@/features/households/components/household-settings-form"
import { HouseholdSwitcher } from "@/features/households/components/household-switcher"
import { LeaveHouseholdButton } from "@/features/households/components/leave-household-button"
import { PendingInvitations } from "@/features/households/components/pending-invitations"
import { getMyInvitations } from "@/features/households/queries"
import { getHouseholdContext } from "@/lib/session"

export const metadata = { title: "Hogar" }

export default async function HogarPage() {
  const ctx = await getHouseholdContext()
  const invitations = await getMyInvitations()
  return (
    <div className="flex flex-col gap-8">
      <PageHeader title="Hogar" back="/mas" />
      <PendingInvitations invitations={invitations} />
      <Panel title="Datos">
        {!ctx.isAdmin && <p className="mb-4 text-muted-foreground">Solo un admin puede cambiar estos datos.</p>}
        <HouseholdSettingsForm
          disabled={!ctx.isAdmin}
          defaults={{
            name: ctx.household.name,
            default_currency: ctx.household.default_currency as "ARS" | "USD",
          }}
        />
      </Panel>
      <Panel title="Tus hogares">
        <HouseholdSwitcher
          currentId={ctx.household.id}
          households={ctx.households.map((h) => ({ id: h.household.id, name: h.household.name, role: h.role }))}
        />
        <Button asChild variant="outline" className="mt-5 w-full">
          <Link href="/bienvenida?nuevo=1">
            <Plus aria-hidden /> Crear o unirme a otro hogar
          </Link>
        </Button>
      </Panel>
      <LeaveHouseholdButton householdName={ctx.household.name} lastMember={ctx.members.length === 1} />
    </div>
  )
}
