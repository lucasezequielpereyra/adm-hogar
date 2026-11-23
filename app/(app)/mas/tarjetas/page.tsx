import { PageHeader } from "@/components/shell/page-header"
import { CardManager } from "@/features/cards/components/card-manager"
import { getCards } from "@/features/cards/queries"
import { memberOptions } from "@/features/tasks/page-data"
import { getHouseholdContext } from "@/lib/session"

export const metadata = { title: "Tarjetas" }

export default async function TarjetasAdminPage() {
  const ctx = await getHouseholdContext()
  const cards = await getCards(ctx.household.id)
  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Tarjetas" back="/mas" />
      <CardManager cards={cards} members={memberOptions(ctx)} currentUserId={ctx.user.id} />
    </div>
  )
}
