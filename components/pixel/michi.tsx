import { cn } from "cn"

export type MichiColor = "naranja" | "negro"
export type MichiPose = "sentado" | "durmiendo"

const SRC: Record<MichiColor, Record<MichiPose, string>> = {
  naranja: { sentado: "/sprites/michi.svg", durmiendo: "/sprites/michi-durmiendo.svg" },
  negro: { sentado: "/sprites/michi-negro.svg", durmiendo: "/sprites/michi-negro-durmiendo.svg" },
}

/** Un michi: la mascota pixel de la app (naranja o negrito). */
export function Michi({
  color = "naranja",
  pose = "sentado",
  size = 96,
  flip = false,
  zzz = true,
  className,
}: {
  color?: MichiColor
  pose?: MichiPose
  size?: number
  /** Mirar hacia el otro lado. */
  flip?: boolean
  /** Mostrar la "z" animada cuando duerme. */
  zzz?: boolean
  className?: string
}) {
  const height = pose === "sentado" ? size : Math.round((size * 10) / 16)
  return (
    <span className={cn("relative inline-block shrink-0", className)} style={{ width: size, height }}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={SRC[color][pose]}
        alt=""
        width={size}
        height={height}
        className={cn("pixelated dark:drop-shadow-[0_0_2px_rgb(234_242_255/0.45)]", flip && "-scale-x-100")}
      />
      {pose === "durmiendo" && zzz && (
        <span
          aria-hidden
          className="animate-zzz absolute -top-2 right-1 font-display text-2xl leading-none text-muted-foreground"
        >
          z
        </span>
      )}
    </span>
  )
}

/**
 * Los dos michis juntos: el naranja y el negrito.
 * Variantes de pose para los distintos lugares de la app.
 */
export function Michis({
  size = 80,
  mood = "sentados",
  className,
}: {
  size?: number
  /** sentados | durmiendo | mixto (naranja sentado, negro durmiendo) */
  mood?: "sentados" | "durmiendo" | "mixto"
  className?: string
}) {
  const orange: MichiPose = mood === "durmiendo" ? "durmiendo" : "sentado"
  const black: MichiPose = mood === "sentados" ? "sentado" : "durmiendo"
  return (
    <span className={cn("inline-flex items-end gap-1", className)} role="img" aria-label="Los michis de la casa">
      <Michi color="naranja" pose={orange} size={size} />
      <Michi color="negro" pose={black} size={size} flip />
    </span>
  )
}

/** Carita de michi (10×8), para íconos chicos. */
export function MichiFace({ color = "naranja", size = 20, className }: { color?: MichiColor; size?: number; className?: string }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={color === "naranja" ? "/sprites/carita-naranja.svg" : "/sprites/carita-negro.svg"}
      alt=""
      width={size}
      height={Math.round((size * 8) / 10)}
      className={cn("pixelated inline-block", className)}
    />
  )
}
