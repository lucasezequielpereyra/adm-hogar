"use client"

import { MoreVertical } from "pixelarticons/react"
import { useTransition } from "react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { removeMember, setMemberRole } from "../actions"

export function MemberActions({ memberId, name, role }: { memberId: string; name: string; role: string }) {
  const [pending, startTransition] = useTransition()
  const run = (fn: () => Promise<{ ok: boolean; error?: string }>, okMsg: string) =>
    startTransition(async () => {
      const res = await fn()
      if (res.ok) toast.success(okMsg)
      else toast.error(res.error ?? "No se pudo completar.")
    })

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon-sm" aria-label={`Acciones para ${name}`} disabled={pending}>
          <MoreVertical aria-hidden />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {role === "admin" ? (
          <DropdownMenuItem onSelect={() => run(() => setMemberRole(memberId, "member"), `${name} ya no es admin`)}>
            Quitar admin
          </DropdownMenuItem>
        ) : (
          <DropdownMenuItem onSelect={() => run(() => setMemberRole(memberId, "admin"), `${name} ahora es admin`)}>
            Hacer admin
          </DropdownMenuItem>
        )}
        <DropdownMenuItem
          className="text-ladrillo"
          onSelect={() => run(() => removeMember(memberId), `${name} salió del hogar`)}
        >
          Quitar del hogar
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
