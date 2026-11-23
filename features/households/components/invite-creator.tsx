"use client"

import { Copy, Share } from "pixelarticons/react"
import { useState, useTransition } from "react"
import { toast } from "sonner"
import { FormField } from "@/components/form/form-field"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import { createInvitation } from "../actions"

export function InviteCreator({ householdName }: { householdName: string }) {
  const [pending, startTransition] = useTransition()
  const [role, setRole] = useState<"member" | "admin">("member")
  const [days, setDays] = useState("7")
  const [username, setUsername] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [created, setCreated] = useState<{ code: string; username: string } | null>(null)

  const link = created ? `${window.location.origin}/unirse/${created.code}` : ""

  async function share() {
    if (!created) return
    const text = `Sumate a "${householdName}" en Hogar: ${link} (código ${created.code})`
    if (navigator.share) {
      try {
        await navigator.share({ title: "Invitación a Hogar", text, url: link })
        return
      } catch {
        // canceló: no pasa nada
      }
    }
    await navigator.clipboard.writeText(text)
    toast.success("Invitación copiada")
  }

  return (
    <div className="flex flex-col gap-5">
      <FormField
        id="invite-user"
        label="Usuario de la persona"
        error={error ?? undefined}
        hint="Si ya tiene cuenta, poné su usuario: va a ver la invitación al entrar. Si no, dejalo vacío y pasale el link."
      >
        <Input
          id="invite-user"
          autoComplete="off"
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
          placeholder="ej: bruno"
          value={username}
          aria-invalid={!!error}
          onChange={(e) => {
            setUsername(e.target.value)
            setError(null)
          }}
        />
      </FormField>
      <div className="flex flex-col gap-3">
        <Label>Rol</Label>
        <ToggleGroup type="single" value={role} onValueChange={(v) => v && setRole(v as "member" | "admin")}>
          <ToggleGroupItem value="member">Miembro</ToggleGroupItem>
          <ToggleGroupItem value="admin">Admin</ToggleGroupItem>
        </ToggleGroup>
      </div>
      <div className="flex flex-col gap-3">
        <Label>Vence en</Label>
        <ToggleGroup type="single" value={days} onValueChange={(v) => v && setDays(v)}>
          <ToggleGroupItem value="1">1 día</ToggleGroupItem>
          <ToggleGroupItem value="7">7 días</ToggleGroupItem>
          <ToggleGroupItem value="30">30 días</ToggleGroupItem>
        </ToggleGroup>
      </div>
      <Button
        disabled={pending}
        className="self-start"
        onClick={() =>
          startTransition(async () => {
            const res = await createInvitation({ role, days: Number(days), username })
            if (res.ok) {
              setCreated({ code: res.data.code, username: username.trim().replace(/^@/, "").toLowerCase() })
              setUsername("")
              toast.success(username ? "Invitación enviada" : "Invitación creada")
            } else {
              setError(res.fieldErrors?.username ?? null)
              if (!res.fieldErrors?.username) toast.error(res.error)
            }
          })
        }
      >
        {pending ? "Creando…" : username ? "Invitar" : "Crear link de invitación"}
      </Button>

      {created && (
        <div className="mx-[3px] flex flex-col items-center gap-3 bg-accent p-4 text-center pixel-frame">
          {created.username ? (
            <p className="text-sm">
              Listo: <strong>@{created.username}</strong> va a ver la invitación la próxima vez que entre a Hogar. También podés mandarle el link:
            </p>
          ) : (
            <span className="text-sm">Código</span>
          )}
          <span className="font-display text-5xl leading-none tracking-[0.15em]">{created.code}</span>
          <span className="w-full truncate text-sm text-muted-foreground">{link}</span>
          <div className="flex w-full gap-3">
            <Button className="flex-1" onClick={share}>
              <Share aria-hidden /> Compartir
            </Button>
            <Button
              variant="outline"
              className="flex-1"
              onClick={async () => {
                await navigator.clipboard.writeText(link)
                toast.success("Link copiado")
              }}
            >
              <Copy aria-hidden /> Copiar link
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
