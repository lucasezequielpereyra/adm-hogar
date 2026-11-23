import { cn } from "cn"

/**
 * Barra segmentada tipo "energía". Pinta `segments` bloques y llena
 * proporcionalmente a value/max.
 */
export function SegmentedBar({
  value,
  max,
  segments = 10,
  color = "var(--pasto)",
  label,
  className,
}: {
  value: number
  max: number
  segments?: number
  color?: string
  label: string
  className?: string
}) {
  const ratio = max > 0 ? Math.min(1, Math.max(0, value / max)) : 0
  const filled = ratio === 1 ? segments : Math.floor(ratio * segments)
  return (
    <div
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={max}
      aria-valuenow={value}
      className={cn("mx-[3px] flex h-6 gap-[3px] bg-tinta p-[3px]", className)}
    >
      {Array.from({ length: segments }, (_, i) => (
        <span
          key={i}
          className="h-full flex-1"
          style={{ background: i < filled ? color : "var(--muted)" }}
        />
      ))}
    </div>
  )
}
