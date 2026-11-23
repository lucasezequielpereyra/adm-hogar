import { cn } from "cn"

/** Moneda pixel (sprite de 10×10). */
export function Coin({ size = 20, spin = false, className }: { size?: number; spin?: boolean; className?: string }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src="/sprites/moneda.svg"
      alt=""
      width={size}
      height={size}
      className={cn("pixelated inline-block", spin && "animate-coin-spin", className)}
    />
  )
}
