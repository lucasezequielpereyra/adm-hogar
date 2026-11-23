"use client"

import { useCallback, useState } from "react"
import { Coin } from "./coin"

/**
 * Moneda "+1" que salta desde un elemento. Uso:
 *   const { pop, node } = useCoinPop()
 *   <div className="relative">{node}<Checkbox onCheckedChange={() => pop()} /></div>
 */
export function useCoinPop() {
  const [pops, setPops] = useState<number[]>([])

  const pop = useCallback(() => {
    const id = Date.now() + Math.random()
    setPops((p) => [...p, id])
    window.setTimeout(() => setPops((p) => p.filter((x) => x !== id)), 700)
  }, [])

  const node = pops.map((id) => (
    <span
      key={id}
      aria-hidden
      className="pointer-events-none absolute -top-2 left-1/2 z-10 -translate-x-1/2"
    >
      <span className="animate-coin-pop flex items-center gap-1 font-display text-xl leading-none text-tinta dark:text-moneda">
        <Coin size={20} />
        +1
      </span>
    </span>
  ))

  return { pop, node }
}
