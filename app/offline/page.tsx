import { Michis } from "@/components/pixel/michi"
import { TitleScreen } from "@/components/shell/title-screen"

export const metadata = { title: "Sin conexión" }

export default function OfflinePage() {
  return (
    <TitleScreen subtitle="Sin conexión">
      <div className="mx-[3px] flex flex-col items-center gap-4 bg-panel p-6 text-center text-foreground pixel-box">
        <Michis mood="durmiendo" size={96} />
        <p className="font-display text-[32px] leading-none">No hay internet</p>
        <p className="text-muted-foreground">Los datos del hogar se comparten en tiempo real, así que necesitás conexión. Probá de nuevo en un rato.</p>
      </div>
    </TitleScreen>
  )
}
