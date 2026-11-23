import type { ReactNode } from "react"
import { Michi } from "@/components/pixel/michi"

/** "Pantalla de título": cielo, nombre grande, contenido y suelo con el michi. */
export function TitleScreen({ subtitle, children }: { subtitle?: ReactNode; children: ReactNode }) {
  return (
    <div
      className="relative flex min-h-dvh flex-col bg-cielo text-tinta dark:text-foreground"
      style={{
        backgroundImage: "var(--cielo-deco)",
        backgroundRepeat: "repeat-x",
        backgroundSize: "256px 48px",
        backgroundPosition: "0 calc(env(safe-area-inset-top) + 24px)",
        imageRendering: "pixelated",
      }}
    >
      <div className="mx-auto flex w-full max-w-md flex-1 flex-col px-5 pt-[calc(env(safe-area-inset-top)+64px)] pb-20">
        <header className="mb-8 text-center">
          <h1 className="font-display text-[80px] leading-[0.85]">Hogar</h1>
          <p className="mt-2 text-lg">{subtitle ?? "Tareas, compras y gastos de tu casa, en un solo lugar."}</p>
        </header>
        {children}
      </div>
      <div aria-hidden className="relative h-24">
        <Michi color="negro" size={64} flip className="absolute -top-[61px] left-8" />
        <Michi color="naranja" pose="durmiendo" size={72} className="absolute -top-[42px] right-8" />
        <div
          className="h-full"
          style={{
            background:
              "var(--suelo) repeat-x 0 0 / 64px 40px, var(--tierra-deco) repeat 0 40px / 64px 24px, var(--tierra)",
            imageRendering: "pixelated",
          }}
        />
      </div>
    </div>
  )
}
