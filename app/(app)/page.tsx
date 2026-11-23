import { after } from "next/server"
import { Suspense } from "react"
import {
  CardsSummary,
  FixedDueSoon,
  PanelSkeleton,
  ReviewCounter,
  ShoppingProgress,
  TodayTasks,
} from "@/features/home/sections"
import { PendingInvitations } from "@/features/households/components/pending-invitations"
import { getMyInvitations } from "@/features/households/queries"
import { sweepStaleCategorizations } from "@/lib/ai/run"
import { todayISO } from "@/lib/domain/dates"
import { getHouseholdContext } from "@/lib/session"

export default async function InicioPage() {
  const ctx = await getHouseholdContext()
  const today = todayISO(ctx.household.timezone)
  after(() => sweepStaleCategorizations(ctx.household.id).catch((e) => console.error("[ai] sweep", e)))

  const invitations = await getMyInvitations()

  return (
    <div className="flex flex-col gap-6">
      <h1 className="sr-only">Inicio</h1>
      <PendingInvitations invitations={invitations} />
      <Suspense fallback={<PanelSkeleton lines={4} />}>
        <TodayTasks ctx={ctx} today={today} />
      </Suspense>
      <Suspense fallback={<PanelSkeleton lines={2} />}>
        <ShoppingProgress ctx={ctx} today={today} />
      </Suspense>
      <Suspense fallback={<PanelSkeleton lines={3} />}>
        <FixedDueSoon ctx={ctx} today={today} />
      </Suspense>
      <Suspense fallback={<PanelSkeleton lines={4} />}>
        <CardsSummary ctx={ctx} today={today} />
      </Suspense>
      <Suspense fallback={null}>
        <ReviewCounter ctx={ctx} />
      </Suspense>
    </div>
  )
}
