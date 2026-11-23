"use client"

import { useTransition } from "react"
import { toast } from "sonner"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { Button } from "@/components/ui/button"
import { leaveHousehold } from "../actions"

export function LeaveHouseholdButton({ householdName, lastMember }: { householdName: string; lastMember: boolean }) {
  const [pending, startTransition] = useTransition()
  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button variant="destructive" className="w-full">
          Irme de este hogar
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>¿Irte de {householdName}?</AlertDialogTitle>
          <AlertDialogDescription>
            {lastMember
              ? "Sos la última persona del hogar: se van a borrar todos sus datos."
              : "Vas a dejar de ver sus tareas, compras y gastos. Para volver necesitás una invitación nueva."}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancelar</AlertDialogCancel>
          <AlertDialogAction
            disabled={pending}
            onClick={(e) => {
              e.preventDefault()
              startTransition(async () => {
                const res = await leaveHousehold()
                if (res && !res.ok) toast.error(res.error)
              })
            }}
          >
            Irme
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
