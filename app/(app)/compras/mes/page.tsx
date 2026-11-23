import { EmptyState } from "@/components/pixel/empty-state"
import { Panel } from "@/components/pixel/panel"
import { MonthNav, monthFromParam } from "@/components/shell/month-nav"
import { ShoppingListView } from "@/features/shopping/components/shopping-list-view"
import { StartList } from "@/features/shopping/components/start-list"
import { getItems, getListByMonth, getPreviousList, getTemplates, listTotals } from "@/features/shopping/queries"
import { monthOf, todayISO } from "@/lib/domain/dates"
import { monthLabel } from "@/lib/domain/format"
import { getHouseholdContext } from "@/lib/session"

export const metadata = { title: "Compra del mes" }

export default async function CompraMesPage({ searchParams }: { searchParams: Promise<{ mes?: string }> }) {
  const { mes } = await searchParams
  const ctx = await getHouseholdContext()
  const current = monthOf(todayISO(ctx.household.timezone))
  const month = monthFromParam(mes, current)
  const name = monthLabel(month)

  const list = await getListByMonth(ctx.household.id, month)

  return (
    <div className="flex flex-col gap-6">
      <MonthNav basePath="/compras/mes" month={month} current={current} />

      {list ? (
        <ListWithItems listId={list.id} list={list} />
      ) : (
        <Panel>
          <EmptyState
            title={`Todavía no hay lista de ${name.split(" ")[0].toLowerCase()}`}
            description="Arrancala copiando el mes anterior o una plantilla."
            pose="sentado"
          />
          <StartList
            month={month}
            monthName={name}
            previous={await getPreviousList(ctx.household.id, month)}
            templates={await getTemplates(ctx.household.id)}
          />
        </Panel>
      )}
    </div>
  )
}

async function ListWithItems({ listId, list }: { listId: string; list: NonNullable<Awaited<ReturnType<typeof getListByMonth>>> }) {
  const items = await getItems(listId)
  return <ShoppingListView list={list} items={items} totals={listTotals(items)} />
}
