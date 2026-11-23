import { cn } from "cn"

/** Bloque que parpadea en 3 pasos (sin shimmer suave). */
function Skeleton({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="skeleton"
      aria-hidden
      className={cn("animate-blink-3 bg-muted dark:bg-[#3b4784]", className)}
      {...props}
    />
  )
}

export { Skeleton }
