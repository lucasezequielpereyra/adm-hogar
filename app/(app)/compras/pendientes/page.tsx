import { EmptyState } from "@/components/pixel/empty-state"
import { Sparkles } from "pixelarticons/react"
import { FilterChips, ToggleChip } from "@/components/shell/filter-chips"
import { getCategories } from "@/features/categories/queries"
import { PendingList } from "@/features/pending/components/pending-list"
import { getPendingPurchases } from "@/features/pending/queries"
import { memberOptions } from "@/features/tasks/page-data"
import { getHouseholdContext } from "@/lib/session"

export const metadata = { title: "Compras pendientes" }

export default async function PendientesPage({
  searchParams,
}: {
  searchParams: Promise<{ estado?: string; tipo?: string; revisar?: string }>
}) {
  const sp = await searchParams
  const ctx = await getHouseholdContext()
  const purchasedView = sp.estado === "compradas"
  const [items, categories] = await Promise.all([
    getPendingPurchases(ctx.household.id, {
      status: purchasedView ? "purchased" : "pending",
      kind: sp.tipo,
      review: sp.revisar === "1",
    }),
    getCategories(ctx.household.id),
  ])

  return (
    <div className="flex flex-col gap-5">
      <FilterChips
        param="estado"
        label="Estado"
        options={[
          { value: null, label: "Pendientes" },
          { value: "compradas", label: "Compradas" },
        ]}
      />
      <FilterChips
        param="tipo"
        label="Tipo"
        options={[
          { value: null, label: "Todas" },
          { value: "hogar", label: "Hogar" },
          { value: "personal", label: "Personal" },
          { value: "otro", label: "Otro" },
        ]}
        extra={
          <ToggleChip
            param="revisar"
            label={
              <>
                <Sparkles className="size-4" aria-hidden /> A revisar
              </>
            }
          />
        }
      />
      <PendingList
        items={items}
        members={memberOptions(ctx)}
        categories={categories}
        currentUserId={ctx.user.id}
        defaultCurrency={ctx.household.default_currency as "ARS" | "USD"}
        purchasedView={purchasedView}
      />
      {items.length === 0 && (
        <EmptyState
          title={purchasedView ? "Todavía no compraron nada" : "No hay compras pendientes"}
          description={purchasedView ? "Lo que marquen como comprado aparece acá." : "Anotá lo que haga falta comprar para la casa o para vos."}
        />
      )}
    </div>
  )
}
