"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import { useTransition } from "react"
import { Controller, useForm } from "react-hook-form"
import { toast } from "sonner"
import { FormField } from "@/components/form/form-field"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { setSoundEnabled } from "@/lib/sound"
import { updateProfile } from "../actions"
import { profileSchema, type ProfileValues } from "../schemas"

export function ProfileForm({ defaults, username }: { defaults: ProfileValues; username: string }) {
  const [pending, startTransition] = useTransition()
  const form = useForm<ProfileValues>({ resolver: zodResolver(profileSchema), defaultValues: defaults })
  const { errors } = form.formState
  return (
    <form
      noValidate
      className="flex flex-col gap-5"
      onSubmit={form.handleSubmit((v) =>
        startTransition(async () => {
          const res = await updateProfile(v)
          if (res.ok) {
            setSoundEnabled(v.sound_enabled)
            toast.success("Perfil guardado")
          } else toast.error(res.error)
        }),
      )}
    >
      <FormField id="display_name" label="Tu nombre" error={errors.display_name?.message}>
        <Input id="display_name" autoComplete="name" aria-invalid={!!errors.display_name} {...form.register("display_name")} />
      </FormField>
      <p className="text-sm text-muted-foreground">Tu usuario: <strong>@{username}</strong></p>
      <div className="flex items-center gap-3">
        <Controller
          control={form.control}
          name="sound_enabled"
          render={({ field }) => <Switch id="sound" checked={field.value} onCheckedChange={field.onChange} />}
        />
        <Label htmlFor="sound">Sonidos al completar tareas</Label>
      </div>
      <Button type="submit" disabled={pending} className="self-start">
        {pending ? "Guardando…" : "Guardar"}
      </Button>
    </form>
  )
}
