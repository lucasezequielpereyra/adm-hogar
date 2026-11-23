"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import { useTransition } from "react"
import { useForm } from "react-hook-form"
import { FormField } from "@/components/form/form-field"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { createHousehold, joinHousehold } from "./actions"
import { householdNameSchema, joinSchema, type HouseholdNameValues, type JoinValues } from "./schemas"

export function CreateHouseholdForm({ defaultName = "" }: { defaultName?: string }) {
  const [pending, startTransition] = useTransition()
  const form = useForm<HouseholdNameValues>({
    resolver: zodResolver(householdNameSchema),
    defaultValues: { name: defaultName },
  })
  const { errors } = form.formState
  return (
    <form
      noValidate
      className="flex flex-col gap-4"
      onSubmit={form.handleSubmit((v) =>
        startTransition(async () => {
          const res = await createHousehold(v)
          if (res && !res.ok) form.setError("name", { message: res.error })
        }),
      )}
    >
      <FormField id="household-name" label="Nombre del hogar" error={errors.name?.message} hint="Por ejemplo: Casa de Palermo.">
        <Input id="household-name" autoComplete="off" aria-invalid={!!errors.name} {...form.register("name")} />
      </FormField>
      <Button type="submit" disabled={pending} className="w-full">
        {pending ? "Creando…" : "Crear hogar"}
      </Button>
    </form>
  )
}

export function JoinHouseholdForm({ defaultCode = "" }: { defaultCode?: string }) {
  const [pending, startTransition] = useTransition()
  const form = useForm<JoinValues>({
    resolver: zodResolver(joinSchema),
    defaultValues: { code: defaultCode },
  })
  const { errors } = form.formState
  return (
    <form
      noValidate
      className="flex flex-col gap-4"
      onSubmit={form.handleSubmit((v) =>
        startTransition(async () => {
          const res = await joinHousehold(v)
          if (res && !res.ok) form.setError("code", { message: res.error })
        }),
      )}
    >
      <FormField id="join-code" label="Código de invitación" error={errors.code?.message}>
        <Input
          id="join-code"
          autoComplete="off"
          autoCapitalize="characters"
          maxLength={8}
          className="font-display text-2xl tracking-[0.2em] uppercase"
          aria-invalid={!!errors.code}
          {...form.register("code")}
        />
      </FormField>
      <Button type="submit" variant="secondary" disabled={pending} className="w-full">
        {pending ? "Uniéndote…" : "Unirme"}
      </Button>
    </form>
  )
}

export function AcceptInvitationButton({ code, householdName }: { code: string; householdName: string }) {
  const [pending, startTransition] = useTransition()
  const form = useForm()
  return (
    <div className="flex flex-col gap-3">
      <Button
        size="lg"
        className="w-full"
        disabled={pending}
        onClick={() =>
          startTransition(async () => {
            const res = await joinHousehold({ code })
            if (res && !res.ok) form.setError("root", { message: res.error })
          })
        }
      >
        {pending ? "Uniéndote…" : `Unirme a ${householdName}`}
      </Button>
      {form.formState.errors.root?.message && (
        <p role="alert" className="text-ladrillo">
          {form.formState.errors.root.message}
        </p>
      )}
    </div>
  )
}
