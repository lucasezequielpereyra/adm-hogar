"use client"

import { cn } from "cn"
import { useEffect, useRef, useState } from "react"
import { Michi } from "@/components/pixel/michi"

/** Cuánto hay que tirar (ya con resistencia) para que recargue. */
const THRESHOLD = 72
const MAX = 120
/** Movimiento mínimo antes de decidir si es un tirón vertical. */
const SLOP = 8

/** Hay algo abierto encima (drawer, diálogo, menú): no se recarga. */
function overlayOpen() {
  return !!document.querySelector('[role="dialog"], [role="alertdialog"], [role="menu"], [data-vaul-drawer]')
}

/** El dedo empezó dentro de algo que tiene su propio scroll y no está arriba de todo. */
function insideScrolled(target: EventTarget | null) {
  let el = target instanceof Element ? target : null
  while (el && el !== document.body && el !== document.documentElement) {
    if (el.scrollTop > 0) return true
    el = el.parentElement
  }
  return false
}

function pageScrollTop() {
  return (document.scrollingElement ?? document.documentElement).scrollTop
}

/**
 * Tirar hacia abajo desde arriba de todo recarga la página (también trae la
 * versión nueva si hubo un deploy). En la PWA instalada no existe el gesto
 * nativo; en el navegador, el nativo se apaga con overscroll-behavior.
 */
export function PullToRefresh() {
  const [pull, setPull] = useState(0)
  const [refreshing, setRefreshing] = useState(false)
  const refreshingRef = useRef(false)

  useEffect(() => {
    let tracking = false
    let active = false
    let startX = 0
    let startY = 0
    let dist = 0

    const reset = () => {
      tracking = false
      active = false
      dist = 0
    }

    const onStart = (e: TouchEvent) => {
      if (refreshingRef.current || e.touches.length !== 1) return
      if (pageScrollTop() > 0 || overlayOpen() || insideScrolled(e.target)) return
      tracking = true
      active = false
      startX = e.touches[0].clientX
      startY = e.touches[0].clientY
      dist = 0
    }

    const onMove = (e: TouchEvent) => {
      if (!tracking) return
      const dx = e.touches[0].clientX - startX
      const dy = e.touches[0].clientY - startY
      if (!active) {
        // Horizontal (filas de chips) o hacia arriba: no es un tirón.
        if (Math.abs(dx) > SLOP && Math.abs(dx) >= Math.abs(dy)) return reset()
        if (dy < -SLOP) return reset()
        if (dy < SLOP) return
        if (pageScrollTop() > 0) return reset()
        active = true
      }
      dist = Math.max(0, Math.min(MAX, (dy - SLOP) * 0.5))
      if (e.cancelable) e.preventDefault()
      setPull(dist)
    }

    const onEnd = () => {
      if (!tracking) return
      const go = active && dist >= THRESHOLD
      reset()
      if (go) {
        refreshingRef.current = true
        setRefreshing(true)
        setPull(THRESHOLD)
        window.location.reload()
      } else {
        setPull(0)
      }
    }

    window.addEventListener("touchstart", onStart, { passive: true })
    window.addEventListener("touchmove", onMove, { passive: false })
    window.addEventListener("touchend", onEnd)
    window.addEventListener("touchcancel", onEnd)
    return () => {
      window.removeEventListener("touchstart", onStart)
      window.removeEventListener("touchmove", onMove)
      window.removeEventListener("touchend", onEnd)
      window.removeEventListener("touchcancel", onEnd)
    }
  }, [])

  const ready = pull >= THRESHOLD
  const visible = pull > 0 || refreshing

  return (
    <div
      aria-hidden={!refreshing}
      role="status"
      className={cn(
        "pointer-events-none fixed inset-x-0 top-[env(safe-area-inset-top)] z-50 flex justify-center",
        !visible && "invisible",
        pull === 0 && "transition-transform duration-150",
      )}
      style={{ transform: `translateY(${Math.round(pull) - 64}px)` }}
    >
      <div className="mt-2 flex items-center gap-2 bg-panel px-3 py-1.5 pixel-frame">
        <span className={cn("inline-block", refreshing && "animate-cat-hop")}>
          <Michi color="naranja" size={32} />
        </span>
        <span className="text-sm font-semibold">
          {refreshing ? "Actualizando…" : ready ? "Soltá para actualizar" : "Tirá para actualizar"}
        </span>
      </div>
    </div>
  )
}
