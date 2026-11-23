import { after } from "next/server"
import { sweepStaleCategorizations } from "@/lib/ai/run"
import { getHouseholdContext } from "@/lib/session"
import { GastosTabs } from "./tabs"

export default async function GastosLayout({ children }: { children: React.ReactNode }) {
  const ctx = await getHouseholdContext()
  // Reencola categorizaciones trabadas (si un after() anterior se cortó).
  after(() => sweepStaleCategorizations(ctx.household.id).catch((e) => console.error("[ai] sweep", e)))
  return (
    <div className="flex flex-col gap-6">
      <GastosTabs />
      {children}
    </div>
  )
}
