import Link from "next/link"
import { Panel } from "@/components/pixel/panel"
import { TitleScreen } from "@/components/shell/title-screen"
import { Button } from "@/components/ui/button"
import { AcceptInvitationButton } from "@/features/households/onboarding-forms"
import { getUser } from "@/lib/session"
import { createClient } from "@/lib/supabase/server"

export const metadata = { title: "Unirme a un hogar" }

export default async function UnirsePage({ params }: { params: Promise<{ code: string }> }) {
  const { code: rawCode } = await params
  const code = decodeURIComponent(rawCode).toUpperCase()
  const user = await getUser()
  const next = `/unirse/${code}`

  if (!user) {
    return (
      <TitleScreen subtitle="Te invitaron a un hogar.">
        <Panel title="Primero, ingresá">
          <p className="mb-5">Para unirte necesitás una cuenta. Es gratis y tarda un minuto.</p>
          <div className="flex flex-col gap-4">
            <Button asChild size="lg" className="w-full">
              <Link href={`/registrarse?next=${encodeURIComponent(next)}`}>Crear cuenta</Link>
            </Button>
            <Button asChild variant="outline" className="w-full">
              <Link href={`/ingresar?next=${encodeURIComponent(next)}`}>Ya tengo cuenta</Link>
            </Button>
          </div>
        </Panel>
      </TitleScreen>
    )
  }

  const supabase = await createClient()
  const { data } = await supabase.rpc("get_invitation_preview", { p_code: code })
  const preview = data?.[0]

  return (
    <TitleScreen subtitle="Te invitaron a un hogar.">
      {preview?.valid && preview.for_other_user ? (
        <Panel title="Esta invitación es para otra cuenta" tone="alerta">
          <p className="mb-5">Se la mandaron a otro usuario. Ingresá con esa cuenta o pedile a quien te invitó un link nuevo.</p>
          <Button asChild variant="outline" className="w-full">
            <Link href="/bienvenida">Ir al inicio</Link>
          </Button>
        </Panel>
      ) : preview?.valid ? (
        <Panel title={preview.household_name}>
          <p className="mb-5">Vas a ver y compartir las tareas, compras y gastos de este hogar.</p>
          <AcceptInvitationButton code={code} householdName={preview.household_name} />
        </Panel>
      ) : (
        <Panel title="Invitación vencida" tone="alerta">
          <p className="mb-5">Este link no es válido o ya venció. Pedile uno nuevo a quien te invitó.</p>
          <Button asChild variant="outline" className="w-full">
            <Link href="/bienvenida">Ir al inicio</Link>
          </Button>
        </Panel>
      )}
    </TitleScreen>
  )
}
