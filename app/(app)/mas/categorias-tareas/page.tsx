import { PageHeader } from "@/components/shell/page-header"
import { TaskCategoryManager } from "@/features/tasks/components/task-category-manager"
import { getTaskCategories } from "@/features/tasks/queries"
import { getHouseholdContext } from "@/lib/session"

export const metadata = { title: "Categorías de tareas" }

export default async function CategoriasTareasPage() {
  const ctx = await getHouseholdContext()
  const tree = await getTaskCategories(ctx.household.id)
  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Categorías de tareas" back="/mas" />
      <TaskCategoryManager tree={tree} />
    </div>
  )
}
