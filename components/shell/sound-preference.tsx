"use client"

import { useEffect } from "react"
import { setSoundEnabled } from "@/lib/sound"

/** Sincroniza la preferencia de sonido del perfil con el navegador. */
export function SoundPreference({ enabled }: { enabled: boolean }) {
  useEffect(() => setSoundEnabled(enabled), [enabled])
  return null
}
