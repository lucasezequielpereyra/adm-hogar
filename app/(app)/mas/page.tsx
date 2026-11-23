import { Home, Logout, Mail, Sliders, User, Users } from "pixelarticons/react"
import { MenuLink } from "@/components/pixel/menu-link"
import { PageHeader } from "@/components/shell/page-header"
import { Button } from "@/components/ui/button"
import { signOut } from "@/features/auth/actions"
import { getHouseholdContext } from "@/lib/session"
import { moreMenuExtras } from "./menu-extras"

export const metadata = { title: "Más" }

export default async function MasPage() {
  const ctx = await getHouseholdContext()
  return (
    <div className="flex flex-col gap-8">
      <PageHeader title="Más" />
      <section className="flex flex-col gap-4" aria-labelledby="mas-hogar">
        <h2 id="mas-hogar" className="font-display text-[28px] leading-none">
          {ctx.household.name}
        </h2>
        <MenuLink href="/mas/hogar" icon={Home} title="Hogar" description="Nombre, moneda y tus otros hogares" />
        <MenuLink href="/mas/miembros" icon={Users} title="Miembros" description={`${ctx.members.length} en este hogar`} />
        {ctx.isAdmin && (
          <MenuLink href="/mas/invitaciones" icon={Mail} title="Invitaciones" description="Sumá gente con un link o código" />
        )}
        {moreMenuExtras(ctx.isAdmin)}
      </section>
      <section className="flex flex-col gap-4" aria-labelledby="mas-vos">
        <h2 id="mas-vos" className="font-display text-[28px] leading-none">
          Vos
        </h2>
        <MenuLink href="/mas/perfil" icon={User} title="Perfil" description="Nombre, tema y sonidos" />
        <MenuLink href="/mas/perfil#tema" icon={Sliders} title="Tema" description="Día, noche o automático" />
      </section>
      <form action={signOut}>
        <Button type="submit" variant="outline" className="w-full">
          <Logout aria-hidden /> Cerrar sesión
        </Button>
      </form>
    </div>
  )
}
