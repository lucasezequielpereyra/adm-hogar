"use client"

import * as React from "react"
import { cn } from "cn"
import { Checkbox as CheckboxPrimitive } from "radix-ui"
import { Check } from "pixelarticons/react"

/** Checkbox pixel: un bloque que se pinta de verde con un tilde. */
function Checkbox({
  className,
  ...props
}: React.ComponentProps<typeof CheckboxPrimitive.Root>) {
  return (
    <CheckboxPrimitive.Root
      data-slot="checkbox"
      className={cn(
        "peer relative flex size-7 shrink-0 cursor-pointer items-center justify-center bg-panel pixel-inset outline-none after:absolute after:-inset-2 disabled:cursor-not-allowed disabled:opacity-50 data-[state=checked]:bg-pasto data-[state=checked]:text-tinta data-[state=checked]:pixel-frame",
        className
      )}
      {...props}
    >
      <CheckboxPrimitive.Indicator
        data-slot="checkbox-indicator"
        className="grid place-content-center text-current"
      >
        <Check className="size-6" aria-hidden />
      </CheckboxPrimitive.Indicator>
    </CheckboxPrimitive.Root>
  )
}

export { Checkbox }
