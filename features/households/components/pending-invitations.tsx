"use client"

import { useRouter } from "next/navigation"
import { useTransition } from "react"
import { toast } from "sonner"
import { MichiFace } from "@/components/pixel/michi"
import { Button } from "@/components/ui/button"
import { acceptInvitationInline, declineInvitation } from "../actions"
import type { MyInvitation } from "../queries"

/** Invitaciones que te mandaron a tu usuario: unirte o rechazar. */
export function PendingInvitations({ invitations }: { invitations: MyInvitation[] }) {
  const [pending, startTransition] = useTransition()
  const router = useRouter()
  if (invitations.length === 0) return null

  return (
    <ul className="flex flex-col gap-4" aria-label="Invitaciones para vos">
      {invitations.map((inv) => (
        <li key={inv.code} className="mx-[3px] flex flex-col gap-3 bg-panel p-4 text-foreground pixel-box [--pixel-outline:var(--uva)]">
          <p className="flex items-center gap-2">
            <MichiFace color="negro" size={24} />
            <span>
              <strong>{inv.invited_by}</strong>
              {inv.invited_by_username && <span className="text-muted-foreground"> @{inv.invited_by_username}</span>} te invitó a{" "}
              <strong>{inv.household_name}</strong>
              {inv.role === "admin" ? " como admin" : ""}.
            </span>
          </p>
          <div className="flex gap-3">
            <Button
              size="sm"
              disabled={pending}
              onClick={() =>
                startTransition(async () => {
                  const res = await acceptInvitationInline(inv.code)
                  if (res.ok) {
                    toast.success(`¡Bienvenida/o a ${inv.household_name}!`)
                    router.push("/")
                  } else toast.error(res.error)
                })
              }
            >
              Unirme
            </Button>
            <Button
              size="sm"
              variant="outline"
              disabled={pending}
              onClick={() =>
                startTransition(async () => {
                  const res = await declineInvitation(inv.code)
                  if (res.ok) toast.success("Invitación rechazada")
                  else toast.error(res.error)
                })
              }
            >
              Rechazar
            </Button>
          </div>
        </li>
      ))}
    </ul>
  )
}
