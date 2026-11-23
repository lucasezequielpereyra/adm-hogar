import { LinkTabs } from "@/components/shell/link-tabs"

/** Pestañas de la pantalla de título: Ingresar / Crear cuenta. */
export function AuthTabs({ active, next }: { active: "ingresar" | "registrarse"; next?: string }) {
  const qs = next ? `?next=${encodeURIComponent(next)}` : ""
  return (
    <div className="mb-5">
      <LinkTabs
        active={active}
        tabs={[
          { key: "ingresar", label: "Ingresar", href: `/ingresar${qs}` },
          { key: "registrarse", label: "Crear cuenta", href: `/registrarse${qs}` },
        ]}
      />
    </div>
  )
}
