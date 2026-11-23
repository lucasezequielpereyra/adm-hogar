"use client"

import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "cn"
import { Toggle as TogglePrimitive } from "radix-ui"

const toggleVariants = cva(
  "group/toggle inline-flex cursor-pointer items-center justify-center gap-2 bg-panel font-semibold whitespace-nowrap text-foreground pixel-block outline-none disabled:pointer-events-none disabled:opacity-50 data-[state=on]:bg-moneda data-[state=on]:text-tinta data-[state=on]:pixel-pressed [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-5",
  {
    variants: {
      variant: {
        default: "",
        outline: "",
      },
      size: {
        default: "h-11 min-w-11 px-3 text-base",
        sm: "h-9 min-w-9 px-2 text-sm",
        lg: "h-12 min-w-12 px-4 text-base",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

function Toggle({
  className,
  variant = "default",
  size = "default",
  ...props
}: React.ComponentProps<typeof TogglePrimitive.Root> &
  VariantProps<typeof toggleVariants>) {
  return (
    <TogglePrimitive.Root
      data-slot="toggle"
      className={cn(toggleVariants({ variant, size, className }))}
      {...props}
    />
  )
}

export { Toggle, toggleVariants }
