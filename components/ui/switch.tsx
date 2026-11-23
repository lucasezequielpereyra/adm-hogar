"use client"

import * as React from "react"
import { cn } from "cn"
import { Switch as SwitchPrimitive } from "radix-ui"

/** Interruptor pixel: una ranura con un bloque que salta de lado. */
function Switch({
  className,
  ...props
}: React.ComponentProps<typeof SwitchPrimitive.Root>) {
  return (
    <SwitchPrimitive.Root
      data-slot="switch"
      className={cn(
        "peer group/switch relative inline-flex h-8 w-14 shrink-0 cursor-pointer items-center bg-muted p-1 pixel-inset outline-none disabled:cursor-not-allowed disabled:opacity-50 data-[state=checked]:bg-pasto",
        className
      )}
      {...props}
    >
      <SwitchPrimitive.Thumb
        data-slot="switch-thumb"
        className="pointer-events-none block size-6 bg-panel pixel-frame data-[state=checked]:translate-x-6 data-[state=checked]:bg-moneda"
      />
    </SwitchPrimitive.Root>
  )
}

export { Switch }
