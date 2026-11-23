import { GastosTabs } from "./tabs"

/** Sin consultas: las pestañas aparecen al instante y cada página carga lo suyo. */
export default function GastosLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-6">
      <GastosTabs />
      {children}
    </div>
  )
}
