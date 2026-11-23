"use client"

import { useTheme } from "next-themes"
import { useEffect, useState } from "react"
import { Moon, Sun } from "pixelarticons/react"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"

/** Selector de tema: Día / Noche / Automático. */
export function ThemeToggle() {
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])

  return (
    <ToggleGroup
      type="single"
      value={mounted ? theme : undefined}
      onValueChange={(v) => v && setTheme(v)}
      aria-label="Tema"
    >
      <ToggleGroupItem value="light">
        <Sun aria-hidden /> Día
      </ToggleGroupItem>
      <ToggleGroupItem value="dark">
        <Moon aria-hidden /> Noche
      </ToggleGroupItem>
      <ToggleGroupItem value="system">Automático</ToggleGroupItem>
    </ToggleGroup>
  )
}
