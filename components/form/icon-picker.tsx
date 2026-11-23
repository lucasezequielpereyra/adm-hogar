"use client"

import { RadioGroup as RadioGroupPrimitive } from "radix-ui"
import { CATEGORY_ICONS, type CategoryIconKey } from "@/lib/icons"

/** Grilla de íconos pixel para categorías. */
export function IconPicker({ value, onChange }: { value: string; onChange: (key: CategoryIconKey) => void }) {
  return (
    <RadioGroupPrimitive.Root
      value={value}
      onValueChange={(v) => onChange(v as CategoryIconKey)}
      aria-label="Ícono"
      className="mx-[3px] grid grid-cols-8 gap-2"
    >
      {Object.entries(CATEGORY_ICONS).map(([key, Icon]) => (
        <RadioGroupPrimitive.Item
          key={key}
          value={key}
          aria-label={key}
          className="flex aspect-square cursor-pointer items-center justify-center bg-panel outline-none data-[state=checked]:bg-moneda data-[state=checked]:text-tinta data-[state=checked]:pixel-frame"
        >
          <Icon className="size-6" aria-hidden />
        </RadioGroupPrimitive.Item>
      ))}
    </RadioGroupPrimitive.Root>
  )
}
