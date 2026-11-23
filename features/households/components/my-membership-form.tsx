"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import { useTransition } from "react"
import { Controller, useForm } from "react-hook-form"
import { toast } from "sonner"
import { ColorPicker } from "@/components/form/color-picker"
import { FormField } from "@/components/form/form-field"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { updateMyMembership } from "../actions"
import { memberSelfSchema, type MemberSelfValues } from "../schemas"

export function MyMembershipForm({ defaults, takenColors }: { defaults: MemberSelfValues; takenColors: string[] }) {
  const [pending, startTransition] = useTransition()
  const form = useForm<MemberSelfValues>({ resolver: zodResolver(memberSelfSchema), defaultValues: defaults })
  const { errors } = form.formState
  return (
    <form
      noValidate
      className="flex flex-col gap-5"
      onSubmit={form.handleSubmit((v) =>
        startTransition(async () => {
          const res = await updateMyMembership(v)
          if (res.ok) toast.success("Listo, guardado")
          else toast.error(res.error)
        }),
      )}
    >
      <FormField id="nickname" label="Apodo en este hogar" error={errors.nickname?.message} hint="Opcional. Si lo dejás vacío se usa tu nombre.">
        <Input id="nickname" aria-invalid={!!errors.nickname} {...form.register("nickname")} />
      </FormField>
      <div className="flex flex-col gap-3">
        <Label>Tu color</Label>
        <Controller
          control={form.control}
          name="color"
          render={({ field }) => <ColorPicker value={field.value} onChange={field.onChange} taken={takenColors} label="Tu color" />}
        />
      </div>
      <Button type="submit" disabled={pending} className="self-start">
        {pending ? "Guardando…" : "Guardar"}
      </Button>
    </form>
  )
}
