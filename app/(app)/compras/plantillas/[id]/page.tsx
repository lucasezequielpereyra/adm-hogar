import { notFound } from "next/navigation"
import { PageHeader } from "@/components/shell/page-header"
import { ShoppingListView } from "@/features/shopping/components/shopping-list-view"
import { getItems, getListById, listTotals } from "@/features/shopping/queries"
import { getHouseholdContext } from "@/lib/session"

export const metadata = { title: "Plantilla" }

export default async function PlantillaPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const ctx = await getHouseholdContext()
  const list = await getListById(ctx.household.id, id)
  if (!list || !list.is_template) notFound()
  const items = await getItems(list.id)
  return (
    <div className="flex flex-col gap-6">
      <PageHeader title={list.name} back="/mas/plantillas" />
      <p className="text-muted-foreground">Los ítems de esta plantilla se copian al crear la lista de un mes.</p>
      <ShoppingListView list={list} items={items} totals={listTotals(items)} isTemplate />
    </div>
  )
}
