import { ComprasTabs } from "./tabs"

export default function ComprasLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-6">
      <ComprasTabs />
      {children}
    </div>
  )
}
