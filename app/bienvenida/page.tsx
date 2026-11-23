import { redirect } from "next/navigation"
import { Panel } from "@/components/pixel/panel"
import { TitleScreen } from "@/components/shell/title-screen"
import { Button } from "@/components/ui/button"
import { signOut } from "@/features/auth/actions"
import { PendingInvitations } from "@/features/households/components/pending-invitations"
import { CreateHouseholdForm, JoinHouseholdForm } from "@/features/households/onboarding-forms"
import { getMyInvitations } from "@/features/households/queries"
import { getMyHouseholds, getProfile, requireUser } from "@/lib/session"

export const metadata = { title: "Bienvenida" }

export default async function BienvenidaPage({ searchParams }: { searchParams: Promise<{ nuevo?: string }> }) {
  await requireUser()
  const [{ nuevo }, households, profile, invitations] = await Promise.all([
    searchParams,
    getMyHouseholds(),
    getProfile(),
    getMyInvitations(),
  ])
  // Si ya tiene hogar y no pidió crear otro, va directo a la app.
  if (households.length > 0 && !nuevo && invitations.length === 0) redirect("/")

  const firstName = profile?.display_name.split(" ")[0]

  return (
    <TitleScreen subtitle={firstName ? `¡Hola, ${firstName}! Armemos tu hogar.` : "Armemos tu hogar."}>
      <div className="flex flex-col gap-8">
        {invitations.length > 0 && (
          <section className="flex flex-col gap-4" aria-labelledby="inv-title">
            <h2 id="inv-title" className="font-display text-[32px] leading-none">
              Te invitaron
            </h2>
            <PendingInvitations invitations={invitations} />
          </section>
        )}
        <Panel title="Crear un hogar">
          <p className="mb-4 text-muted-foreground">Para tu grupo familiar o la gente con la que vivís. Después podés invitar al resto.</p>
          <CreateHouseholdForm />
        </Panel>
        <Panel title="Unirme a uno">
          <p className="mb-4 text-muted-foreground">Pedile el código o el link a alguien del hogar.</p>
          <JoinHouseholdForm />
        </Panel>
        <form action={signOut} className="text-center">
          <Button variant="link" type="submit">
            Cerrar sesión
          </Button>
        </form>
      </div>
    </TitleScreen>
  )
}
