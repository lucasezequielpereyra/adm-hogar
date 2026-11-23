"use client"

import { useRouter } from "next/navigation"
import { useEffect } from "react"
import { createClient } from "@/lib/supabase/client"

/**
 * Escucha el canal privado del hogar. Cada señal ({table, op}) dispara un
 * router.refresh() con debounce: los Server Components vuelven a leer con RLS.
 * También refresca al volver a la app (PWA en segundo plano).
 */
export function RealtimeProvider({ householdId }: { householdId: string }) {
  const router = useRouter()

  useEffect(() => {
    const supabase = createClient()
    let timer: ReturnType<typeof setTimeout> | undefined
    let cancelled = false
    let channel: ReturnType<typeof supabase.channel> | undefined

    const refresh = () => {
      clearTimeout(timer)
      timer = setTimeout(() => router.refresh(), 250)
    }

    ;(async () => {
      await supabase.realtime.setAuth()
      if (cancelled) return
      channel = supabase
        .channel(`household:${householdId}`, { config: { private: true } })
        .on("broadcast", { event: "change" }, refresh)
        .subscribe()
    })()

    const onVisible = () => {
      if (document.visibilityState === "visible") refresh()
    }
    document.addEventListener("visibilitychange", onVisible)

    return () => {
      cancelled = true
      clearTimeout(timer)
      document.removeEventListener("visibilitychange", onVisible)
      if (channel) supabase.removeChannel(channel)
    }
  }, [householdId, router])

  return null
}
