import { notFound } from "next/navigation"
import { Coin } from "@/components/pixel/coin"
import { EmptyState } from "@/components/pixel/empty-state"
import { Michi, MichiFace, Michis } from "@/components/pixel/michi"
import { Money } from "@/components/pixel/money"
import { Panel } from "@/components/pixel/panel"
import { SegmentedBar } from "@/components/pixel/segmented-bar"
import { Hud } from "@/components/shell/hud"
import { ThemeToggle } from "@/components/shell/theme-toggle"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Skeleton } from "@/components/ui/skeleton"
import { Textarea } from "@/components/ui/textarea"
import { CATEGORY_ICONS } from "@/lib/icons"
import { PALETTE, paletteVar } from "@/lib/palette"
import { StyleGuideInteractive } from "./interactive"

export const metadata = { title: "Guía de estilos" }

export default function EstilosPage() {
  if (process.env.NODE_ENV === "production") notFound()

  return (
    <>
      <Hud householdName="Casa de prueba" todayIso="2026-11-23" coins={7} />
      <main className="mx-auto flex max-w-xl flex-col gap-8 px-4 py-6">
        <Panel title="Tema">
          <ThemeToggle />
        </Panel>

        <Panel title="Tipografía">
          <p className="font-display text-5xl leading-none">
            <Money amount={1234567.89} />
          </p>
          <p className="mt-2 font-display text-[28px] leading-none">Compra de noviembre</p>
          <p className="mt-2">
            Pixelify Sans para el texto: ñandú, acción, ¿pagaste la luz? ¡Listo!
          </p>
          <p className="text-muted-foreground">Texto secundario con contraste suficiente.</p>
        </Panel>

        <Panel title="Botones">
          <div className="flex flex-wrap gap-4">
            <Button>Guardar</Button>
            <Button variant="secondary">Cancelar</Button>
            <Button variant="outline">Editar</Button>
            <Button variant="success">Marcar pagado</Button>
            <Button variant="destructive">Borrar</Button>
            <Button variant="ghost">Ver todo</Button>
            <Button variant="link">Deshacer</Button>
            <Button size="sm">Chico</Button>
            <Button disabled>Deshabilitado</Button>
          </div>
        </Panel>

        <Panel title="Formularios">
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="d">Descripción</Label>
              <Input id="d" placeholder="Ej: MERPAGO*RAPPI" />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="m">Monto</Label>
              <Input id="m" inputMode="decimal" defaultValue="12.500,00" aria-invalid />
              <p className="text-sm text-ladrillo">Ingresá un monto mayor a cero.</p>
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="n">Notas</Label>
              <Textarea id="n" placeholder="Opcional" />
            </div>
            <StyleGuideInteractive />
          </div>
        </Panel>

        <Panel title="Insignias">
          <div className="flex flex-wrap gap-3">
            <Badge>Pendiente</Badge>
            <Badge variant="success">Pagado</Badge>
            <Badge variant="destructive">Vencida</Badge>
            <Badge variant="ai">✨ IA</Badge>
            <Badge variant="outline">Revisar</Badge>
            <Badge variant="secondary">3/6</Badge>
          </div>
        </Panel>

        <Panel title="Barras">
          <div className="flex flex-col gap-3">
            <SegmentedBar value={14} max={20} label="Compra del mes: 14 de 20" />
            <SegmentedBar value={3} max={8} color="var(--moneda)" label="Fijos pagados: 3 de 8" />
            <SegmentedBar value={9} max={10} color="var(--ladrillo)" label="Gasto contra mes anterior" />
          </div>
        </Panel>

        <Panel title="Paleta de categorías">
          <ul className="grid grid-cols-4 gap-3">
            {PALETTE.map((p) => (
              <li
                key={p.key}
                className="mx-[3px] flex h-10 items-center justify-center text-sm font-semibold text-tinta pixel-frame"
                style={{ background: paletteVar(p.key) }}
              >
                {p.label}
              </li>
            ))}
          </ul>
        </Panel>

        <Panel title="Íconos">
          <ul className="grid grid-cols-8 gap-2">
            {Object.entries(CATEGORY_ICONS).map(([key, Icon]) => (
              <li key={key} title={key} className="flex justify-center">
                <Icon className="size-6" />
              </li>
            ))}
          </ul>
        </Panel>

        <Panel title="Sprites">
          <div className="flex flex-wrap items-end gap-6">
            <Michi size={80} />
            <Michi color="negro" size={80} flip />
            <Michis size={64} mood="durmiendo" />
            <MichiFace size={30} />
            <MichiFace color="negro" size={30} />
            <Coin size={40} spin />
          </div>
        </Panel>

        <Panel title="Paneles de estado" className="flex flex-col gap-6">
          <Panel tone="alerta" title="Vencida">
            Arena de los michis — venció ayer.
          </Panel>
          <Panel tone="ia" title="✨ A revisar">
            3 gastos con categoría de baja confianza.
          </Panel>
        </Panel>

        <Panel title="Cargando">
          <div className="flex flex-col gap-3">
            <Skeleton className="h-6 w-2/3" />
            <Skeleton className="h-6 w-1/2" />
            <Skeleton className="h-12 w-full" />
          </div>
        </Panel>

        <Panel>
          <EmptyState
            title="No hay tareas para hoy"
            description="Creá una tarea o revisá las de otros días."
            action={<Button>Crear tarea</Button>}
          />
        </Panel>
      </main>
    </>
  )
}
