"use client"

import { useTransition } from "react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { revokeInvitation } from "../actions"

export function RevokeInvitationButton({ id }: { id: string }) {
  const [pending, startTransition] = useTransition()
  return (
    <Button
      variant="ghost"
      size="sm"
      disabled={pending}
      onClick={() =>
        startTransition(async () => {
          const res = await revokeInvitation(id)
          if (res.ok) toast.success("Invitación anulada")
          else toast.error(res.error)
        })
      }
    >
      Anular
    </Button>
  )
}
