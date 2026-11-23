"use client"

import { toast } from "sonner"
import { useCoinPop } from "@/components/pixel/coin-pop"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

export function StyleGuideInteractive() {
  const { pop, node } = useCoinPop()

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-2">
        <Label>Categoría</Label>
        <Select defaultValue="super">
          <SelectTrigger>
            <SelectValue placeholder="Elegí una categoría" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="super">Supermercado</SelectItem>
            <SelectItem value="delivery">Delivery y comida</SelectItem>
            <SelectItem value="servicios">Servicios</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="relative flex items-center gap-3">
        {node}
        <Checkbox id="c1" onCheckedChange={(v) => v && pop()} />
        <Label htmlFor="c1">Lavar platos (marcá para ver la moneda)</Label>
      </div>

      <div className="flex items-center gap-3">
        <Switch id="s1" />
        <Label htmlFor="s1">Personal (solo lo ves vos)</Label>
      </div>

      <RadioGroup defaultValue="media" className="flex gap-5">
        {["baja", "media", "alta"].map((p) => (
          <div key={p} className="flex items-center gap-2">
            <RadioGroupItem value={p} id={`p-${p}`} />
            <Label htmlFor={`p-${p}`}>{p.charAt(0).toUpperCase() + p.slice(1)}</Label>
          </div>
        ))}
      </RadioGroup>

      <Tabs defaultValue="mias">
        <TabsList>
          <TabsTrigger value="mias">Mis tareas</TabsTrigger>
          <TabsTrigger value="todas">Todas</TabsTrigger>
        </TabsList>
        <TabsContent value="mias">Contenido de mis tareas.</TabsContent>
        <TabsContent value="todas">Contenido de todas.</TabsContent>
      </Tabs>

      <div className="flex flex-wrap gap-4">
        <Button onClick={() => toast.success("¡Tarea hecha! +1", { action: { label: "Deshacer", onClick: () => {} } })}>
          Toast de éxito
        </Button>
        <Button variant="outline" onClick={() => toast.error("No se pudo guardar. Revisá tu conexión.")}>
          Toast de error
        </Button>
      </div>
    </div>
  )
}
