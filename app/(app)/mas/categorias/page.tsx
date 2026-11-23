import { PageHeader } from "@/components/shell/page-header"
import { CategoryManager } from "@/features/categories/components/category-manager"
import { getCategories } from "@/features/categories/queries"
import { getHouseholdContext } from "@/lib/session"

export const metadata = { title: "Categorías de gastos" }

export default async function CategoriasPage() {
  const ctx = await getHouseholdContext()
  const categories = await getCategories(ctx.household.id)
  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Categorías" back="/mas" />
      <CategoryManager categories={categories} />
    </div>
  )
}
