import { Michi } from "./michi"

/**
 * Pantalla de carga: los dos michis saltando de a uno, sobre una franja
 * de pasto, y el texto con puntitos que titilan.
 */
export function CatsLoading({ label = "Cargando…" }: { label?: string }) {
  const text = label.replace(/…$/, "")
  return (
    <div role="status" aria-live="polite" className="flex min-h-[50dvh] flex-col items-center justify-center gap-5 py-10">
      <div className="flex flex-col items-center">
        <div className="flex items-end gap-4">
          <span className="animate-cat-hop inline-block">
            <Michi color="naranja" size={72} />
          </span>
          <span className="animate-cat-hop inline-block [animation-delay:350ms]">
            <Michi color="negro" size={72} flip />
          </span>
        </div>
        <div
          aria-hidden
          className="h-4 w-52"
          style={{ background: "var(--suelo) repeat-x 0 0 / 32px 20px", imageRendering: "pixelated" }}
        />
      </div>
      <p className="font-display text-[28px] leading-none">
        {text}
        <span className="animate-blink-3" aria-hidden>
          …
        </span>
      </p>
    </div>
  )
}
