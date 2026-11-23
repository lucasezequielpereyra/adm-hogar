import Link from "next/link"
import { Michis } from "@/components/pixel/michi"
import { TitleScreen } from "@/components/shell/title-screen"
import { Button } from "@/components/ui/button"

export default function NotFound() {
  return (
    <TitleScreen subtitle="Esta página no existe.">
      <div className="mx-[3px] flex flex-col items-center gap-4 bg-panel p-6 text-center text-foreground pixel-box">
        <Michis size={88} mood="sentados" />
        <p className="font-display text-[32px] leading-none">Los michis la buscaron por toda la casa</p>
        <p className="text-muted-foreground">Puede que el link esté mal o que lo hayan borrado.</p>
        <Button asChild>
          <Link href="/">Volver al inicio</Link>
        </Button>
      </div>
    </TitleScreen>
  )
}
