"use client"

import { cn } from "cn"
import { RadioGroup as RadioGroupPrimitive } from "radix-ui"
import { Check } from "pixelarticons/react"
import { PALETTE, paletteVar, type PaletteKey } from "@/lib/palette"

/** Selector de color de la paleta cerrada. `taken` deshabilita colores en uso. */
export function ColorPicker({
  value,
  onChange,
  taken = [],
  label = "Color",
}: {
  value: string
  onChange: (key: PaletteKey) => void
  taken?: string[]
  label?: string
}) {
  return (
    <RadioGroupPrimitive.Root
      value={value}
      onValueChange={(v) => onChange(v as PaletteKey)}
      aria-label={label}
      className="mx-[3px] grid grid-cols-8 gap-3"
    >
      {PALETTE.map((p) => {
        const disabled = taken.includes(p.key) && p.key !== value
        return (
          <RadioGroupPrimitive.Item
            key={p.key}
            value={p.key}
            disabled={disabled}
            aria-label={disabled ? `${p.label} (en uso)` : p.label}
            className={cn(
              "flex aspect-square cursor-pointer items-center justify-center text-tinta pixel-frame outline-none disabled:cursor-not-allowed disabled:opacity-25 data-[state=checked]:pixel-block",
            )}
            style={{ background: paletteVar(p.key) }}
          >
            <RadioGroupPrimitive.Indicator>
              <Check className="size-5" aria-hidden />
            </RadioGroupPrimitive.Indicator>
          </RadioGroupPrimitive.Item>
        )
      })}
    </RadioGroupPrimitive.Root>
  )
}
