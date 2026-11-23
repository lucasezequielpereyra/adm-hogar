import * as React from "react"
import { cn } from "cn"

function Textarea({ className, ...props }: React.ComponentProps<"textarea">) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(
        "flex field-sizing-content min-h-24 w-full bg-panel px-3 py-2 text-base text-foreground pixel-inset outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:bg-ladrillo/10 aria-invalid:[--pixel-outline:var(--ladrillo)]",
        className
      )}
      {...props}
    />
  )
}

export { Textarea }
