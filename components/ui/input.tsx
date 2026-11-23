import * as React from "react"
import { cn } from "cn"

function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        "h-12 w-full min-w-0 bg-panel px-3 text-base text-foreground pixel-inset outline-none placeholder:text-muted-foreground disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:bg-ladrillo/10 aria-invalid:[--pixel-outline:var(--ladrillo)] file:mr-2 file:border-0 file:bg-transparent file:font-semibold",
        className
      )}
      {...props}
    />
  )
}

export { Input }
