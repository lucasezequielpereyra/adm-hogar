import { Panel } from "@/components/pixel/panel"
import { PageHeader } from "@/components/shell/page-header"
import { ThemeToggle } from "@/components/shell/theme-toggle"
import { ProfileForm } from "@/features/households/components/profile-form"
import { getHouseholdContext } from "@/lib/session"

export const metadata = { title: "Perfil" }

export default async function PerfilPage() {
  const ctx = await getHouseholdContext()
  return (
    <div className="flex flex-col gap-8">
      <PageHeader title="Perfil" back="/mas" />
      <Panel title="Datos">
        <ProfileForm
          username={ctx.profile.username}
          defaults={{ display_name: ctx.profile.display_name, sound_enabled: ctx.profile.sound_enabled }}
        />
      </Panel>
      <Panel title="Tema" id="tema">
        <ThemeToggle />
      </Panel>
    </div>
  )
}
