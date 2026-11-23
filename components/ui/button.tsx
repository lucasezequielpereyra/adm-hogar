import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "cn"
import { Slot } from "radix-ui"

/**
 * Botón "bloque": contorno pixel, bisel interno y sombra dura.
 * Al presionarlo baja 3px y pierde la sombra.
 */
const buttonVariants = cva(
  "group/button relative inline-flex shrink-0 cursor-pointer items-center justify-center gap-2 whitespace-nowrap font-sans font-semibold select-none outline-none transition-none disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-6",
  {
    variants: {
      variant: {
        default:
          "bg-primary text-primary-foreground pixel-block active:pixel-pressed hover:brightness-105",
        secondary:
          "bg-secondary text-secondary-foreground pixel-block active:pixel-pressed hover:brightness-105",
        outline:
          "bg-panel text-foreground pixel-block active:pixel-pressed hover:bg-accent",
        destructive:
          "bg-destructive text-white pixel-block active:pixel-pressed hover:brightness-105 dark:text-tinta",
        success:
          "bg-pasto text-tinta pixel-block active:pixel-pressed hover:brightness-105",
        ghost:
          "text-foreground hover:bg-muted active:translate-y-[2px]",
        link: "text-foreground underline decoration-2 underline-offset-4 hover:decoration-moneda",
      },
      size: {
        default: "h-12 px-5 text-base",
        sm: "h-10 px-3 text-base",
        xs: "h-8 gap-1 px-2 text-sm [&_svg:not([class*='size-'])]:size-4",
        lg: "h-14 px-6 text-lg",
        icon: "size-12",
        "icon-sm": "size-10",
        "icon-xs": "size-8 [&_svg:not([class*='size-'])]:size-4",
        "icon-lg": "size-14",
      },
    },
    compoundVariants: [
      { variant: "ghost", className: "px-2" },
      { variant: "link", className: "h-auto px-0" },
    ],
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

function Button({
  className,
  variant = "default",
  size = "default",
  asChild = false,
  ...props
}: React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean
  }) {
  const Comp = asChild ? Slot.Root : "button"

  return (
    <Comp
      data-slot="button"
      data-variant={variant}
      data-size={size}
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  )
}

export { Button, buttonVariants }
