import { BottomNav } from "@/components/shell/bottom-nav"
import { Fab } from "@/components/shell/fab"
import { Hud } from "@/components/shell/hud"
import { RealtimeProvider } from "@/components/shell/realtime-provider"
import { SoundPreference } from "@/components/shell/sound-preference"
import { getWeeklyCoins } from "@/features/tasks/queries"
import { todayISO } from "@/lib/domain/dates"
import { getHouseholdContext } from "@/lib/session"

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const ctx = await getHouseholdContext()
  const today = todayISO(ctx.household.timezone)
  const coins = await getWeeklyCoins(ctx.household.id, ctx.user.id)

  return (
    <>
      <RealtimeProvider householdId={ctx.household.id} />
      <SoundPreference enabled={ctx.profile.sound_enabled} />
      <Hud householdName={ctx.household.name} todayIso={today} coins={coins} />
      <main className="mx-auto max-w-xl px-4 pt-5 pb-[calc(96px+env(safe-area-inset-bottom)+104px)]">
        {children}
      </main>
      <Fab />
      <BottomNav />
    </>
  )
}
