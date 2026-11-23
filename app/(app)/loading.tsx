import { Michis } from "@/components/pixel/michi"
import { Skeleton } from "@/components/ui/skeleton"

/** Mientras carga una pantalla: los michis esperan y los paneles parpadean. */
export default function Loading() {
  return (
    <div className="flex flex-col gap-6" aria-busy="true" aria-live="polite">
      <div className="flex items-end gap-3">
        <Michis size={48} mood="mixto" />
        <span className="animate-blink-3 pb-1 font-display text-2xl leading-none">Cargando…</span>
      </div>
      {[4, 3, 2].map((lines, i) => (
        <div key={i} className="mx-[3px] flex flex-col gap-3 bg-panel p-4 pixel-box">
          <Skeleton className="h-7 w-1/2" />
          {Array.from({ length: lines }, (_, j) => (
            <Skeleton key={j} className="h-6" style={{ width: `${90 - j * 15}%` }} />
          ))}
        </div>
      ))}
    </div>
  )
}
