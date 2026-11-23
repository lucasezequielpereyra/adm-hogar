import { Panel } from "@/components/pixel/panel"
import { PageHeader } from "@/components/shell/page-header"
import { TemplateManager } from "@/features/shopping/components/template-manager"
import { getTemplates } from "@/features/shopping/queries"
import { getHouseholdContext } from "@/lib/session"

export const metadata = { title: "Plantillas de compra" }

export default async function PlantillasPage() {
  const ctx = await getHouseholdContext()
  const templates = await getTemplates(ctx.household.id)
  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Plantillas" back="/mas" />
      <Panel>
        <p className="mb-4 text-muted-foreground">Listas base para arrancar la compra de cada mes.</p>
        <TemplateManager templates={templates} />
      </Panel>
    </div>
  )
}
