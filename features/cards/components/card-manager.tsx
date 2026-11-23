"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import { Pencil, Plus, Trash } from "pixelarticons/react"
import { useState, useTransition } from "react"
import { Controller, useForm } from "react-hook-form"
import { toast } from "sonner"
import { ColorPicker } from "@/components/form/color-picker"
import { FormField } from "@/components/form/form-field"
import { Button } from "@/components/ui/button"
import { Drawer, DrawerContent, DrawerDescription, DrawerHeader, DrawerTitle } from "@/components/ui/drawer"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import type { MemberOption } from "@/features/tasks/types"
import { isPaletteKey, paletteVar } from "@/lib/palette"
import { deleteCard, saveCard } from "../actions"
import { cardSchema, type CardValues } from "../schemas"
import type { Card } from "../types"

const NONE = "__none__"

export function CardManager({ cards, members, currentUserId }: { cards: Card[]; members: MemberOption[]; currentUserId: string }) {
  const [editing, setEditing] = useState<{ card: Card | null } | null>(null)
  const membersById = new Map(members.map((m) => [m.user_id, m]))
  return (
    <div className="flex flex-col gap-5">
      <Button className="self-start" onClick={() => setEditing({ card: null })}>
        <Plus aria-hidden /> Nueva tarjeta
      </Button>
      <ul className="flex flex-col gap-4">
        {cards.map((c) => (
          <li key={c.id}>
            <button
              type="button"
              onClick={() => setEditing({ card: c })}
              className="mx-[3px] flex w-[calc(100%-6px)] items-center gap-3 bg-panel p-4 text-left pixel-block active:pixel-pressed"
            >
              <span className="h-10 w-3 shrink-0" style={{ background: paletteVar(c.color) }} aria-hidden />
              <span className="flex min-w-0 flex-1 flex-col">
                <span className="font-semibold">
                  {c.name} {c.bank} {c.last4 && <span className="text-muted-foreground">·{c.last4}</span>}
                  {!c.is_active && <span className="text-muted-foreground"> (inactiva)</span>}
                </span>
                <span className="text-sm text-muted-foreground">
                  Cierra el {c.closing_day} · vence el {c.due_day}
                  {c.holder_id && ` · ${membersById.get(c.holder_id)?.name ?? ""}`}
                </span>
              </span>
              <Pencil className="size-5" aria-hidden />
            </button>
          </li>
        ))}
      </ul>
      <Drawer open={!!editing} onOpenChange={(o) => !o && setEditing(null)} repositionInputs={false}>
        <DrawerContent>
          <DrawerHeader>
            <DrawerTitle>{editing?.card ? "Editar tarjeta" : "Nueva tarjeta"}</DrawerTitle>
            <DrawerDescription>El día de cierre define en qué resumen cae cada gasto.</DrawerDescription>
          </DrawerHeader>
          <div className="overflow-y-auto px-5 pt-1 pb-8">
            {editing && (
              <CardForm key={editing.card?.id ?? "nueva"} card={editing.card} members={members} currentUserId={currentUserId} onDone={() => setEditing(null)} />
            )}
          </div>
        </DrawerContent>
      </Drawer>
    </div>
  )
}

function CardForm({ card, members, currentUserId, onDone }: { card: Card | null; members: MemberOption[]; currentUserId: string; onDone: () => void }) {
  const [pending, startTransition] = useTransition()
  const form = useForm<CardValues>({
    resolver: zodResolver(cardSchema),
    defaultValues: card
      ? {
          name: card.name,
          bank: card.bank ?? "",
          holder_id: card.holder_id,
          closing_day: card.closing_day,
          due_day: card.due_day,
          color: isPaletteKey(card.color) ? card.color : "azul",
          last4: card.last4 ?? "",
          is_active: card.is_active,
        }
      : { name: "", bank: "", holder_id: currentUserId, closing_day: 25, due_day: 5, color: "azul", last4: "", is_active: true },
  })
  const { errors } = form.formState
  const dayInput = (name: "closing_day" | "due_day", id: string) => (
    <Controller
      control={form.control}
      name={name}
      render={({ field }) => (
        <Input
          id={id}
          type="number"
          inputMode="numeric"
          min={1}
          max={31}
          value={Number.isNaN(field.value) ? "" : field.value}
          onChange={(e) => field.onChange(e.target.value === "" ? Number.NaN : Number(e.target.value))}
          aria-invalid={!!errors[name]}
        />
      )}
    />
  )
  return (
    <form
      noValidate
      className="flex flex-col gap-5"
      onSubmit={form.handleSubmit((v) =>
        startTransition(async () => {
          const res = await saveCard(card?.id ?? null, v)
          if (res.ok) {
            toast.success("Tarjeta guardada")
            onDone()
          } else toast.error(res.error)
        }),
      )}
    >
      <div className="grid grid-cols-2 gap-4">
        <FormField id="card-name" label="Nombre" error={errors.name?.message}>
          <Input id="card-name" placeholder="Visa" aria-invalid={!!errors.name} {...form.register("name")} />
        </FormField>
        <FormField id="card-bank" label="Banco" error={errors.bank?.message}>
          <Input id="card-bank" placeholder="Opcional" {...form.register("bank")} />
        </FormField>
      </div>
      <div className="grid grid-cols-3 gap-4">
        <FormField id="card-closing" label="Cierre" error={errors.closing_day?.message}>
          {dayInput("closing_day", "card-closing")}
        </FormField>
        <FormField id="card-due" label="Vence" error={errors.due_day?.message}>
          {dayInput("due_day", "card-due")}
        </FormField>
        <FormField id="card-last4" label="Últimos 4" error={errors.last4?.message}>
          <Input id="card-last4" inputMode="numeric" maxLength={4} {...form.register("last4")} />
        </FormField>
      </div>
      {card && <p className="text-sm text-muted-foreground">Cambiar el cierre no mueve los gastos ya cargados.</p>}
      <FormField id="card-holder" label="Titular">
        <Controller
          control={form.control}
          name="holder_id"
          render={({ field }) => (
            <Select value={field.value ?? NONE} onValueChange={(v) => field.onChange(v === NONE ? null : v)}>
              <SelectTrigger id="card-holder">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NONE}>Sin titular</SelectItem>
                {members.map((m) => (
                  <SelectItem key={m.user_id} value={m.user_id}>
                    {m.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        />
      </FormField>
      <div className="flex flex-col gap-3">
        <Label>Color</Label>
        <Controller control={form.control} name="color" render={({ field }) => <ColorPicker value={field.value} onChange={field.onChange} />} />
      </div>
      <div className="flex items-center gap-3">
        <Controller control={form.control} name="is_active" render={({ field }) => <Switch id="card-active" checked={field.value} onCheckedChange={field.onChange} />} />
        <Label htmlFor="card-active">Activa</Label>
      </div>
      <div className="flex gap-4">
        <Button type="submit" disabled={pending} className="flex-1">
          {pending ? "Guardando…" : "Guardar"}
        </Button>
        {card && (
          <Button
            type="button"
            variant="destructive"
            size="icon"
            aria-label="Borrar tarjeta"
            disabled={pending}
            onClick={() => {
              if (!window.confirm(`¿Borrar ${card.name}? Se borran también todos sus gastos y cuotas. Si solo dejaste de usarla, marcala como inactiva.`)) return
              startTransition(async () => {
                const res = await deleteCard(card.id)
                if (res.ok) {
                  toast.success("Tarjeta borrada")
                  onDone()
                } else toast.error(res.error)
              })
            }}
          >
            <Trash aria-hidden />
          </Button>
        )}
      </div>
    </form>
  )
}
