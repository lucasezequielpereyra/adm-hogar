import { cn } from "cn"
import { paletteVar } from "@/lib/palette"

/** Inicial del miembro sobre su color. */
export function MemberAvatar({
  name,
  color,
  size = 32,
  className,
}: {
  name: string
  color: string
  size?: number
  className?: string
}) {
  return (
    <span
      aria-hidden
      className={cn("inline-flex shrink-0 items-center justify-center font-display leading-none text-tinta pixel-frame m-[3px]", className)}
      style={{ background: paletteVar(color), width: size, height: size, fontSize: Math.round(size * 0.7) }}
    >
      {name.trim().charAt(0).toUpperCase() || "?"}
    </span>
  )
}
