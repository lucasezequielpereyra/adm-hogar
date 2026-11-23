import Link from "next/link"
import { MemberAvatar } from "@/components/pixel/member-chip"
import { Panel } from "@/components/pixel/panel"
import { PageHeader } from "@/components/shell/page-header"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { MemberActions } from "@/features/households/components/member-actions"
import { MyMembershipForm } from "@/features/households/components/my-membership-form"
import { isPaletteKey } from "@/lib/palette"
import { getHouseholdContext, memberName } from "@/lib/session"

export const metadata = { title: "Miembros" }

export default async function MiembrosPage() {
  const ctx = await getHouseholdContext()
  const me = ctx.members.find((m) => m.user_id === ctx.user.id)!
  return (
    <div className="flex flex-col gap-8">
      <PageHeader title="Miembros" back="/mas" />
      <Panel>
        <ul className="flex flex-col divide-y-[3px] divide-tinta/10 dark:divide-white/10">
          {ctx.members.map((m) => {
            const name = memberName(m)
            const isMe = m.user_id === ctx.user.id
            return (
              <li key={m.id} className="flex min-h-16 items-center gap-3 py-2">
                <MemberAvatar name={name} color={m.color} size={36} />
                <div className="flex min-w-0 flex-1 flex-col">
                  <span className="truncate font-semibold">
                    {name}
                    {isMe && <span className="font-normal text-muted-foreground"> (vos)</span>}
                  </span>
                  <span className="truncate text-sm text-muted-foreground">
                    {m.profile?.username && `@${m.profile.username}`}
                    {m.nickname && m.profile?.display_name && ` · ${m.profile.display_name}`}
                  </span>
                </div>
                {m.role === "admin" && <Badge variant="secondary">Admin</Badge>}
                {ctx.isAdmin && !isMe && <MemberActions memberId={m.id} name={name} role={m.role} />}
              </li>
            )
          })}
        </ul>
        {ctx.isAdmin && (
          <Button asChild variant="outline" className="mt-4 w-full">
            <Link href="/mas/invitaciones">Invitar a alguien</Link>
          </Button>
        )}
      </Panel>
      <Panel title="Cómo te ven">
        <MyMembershipForm
          defaults={{ nickname: me.nickname ?? "", color: isPaletteKey(me.color) ? me.color : "azul" }}
          takenColors={ctx.members.filter((m) => m.user_id !== ctx.user.id).map((m) => m.color)}
        />
      </Panel>
    </div>
  )
}
