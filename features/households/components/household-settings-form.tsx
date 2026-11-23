"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import { useTransition } from "react"
import { Controller, useForm } from "react-hook-form"
import { toast } from "sonner"
import { FormField } from "@/components/form/form-field"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import { updateHousehold } from "../actions"
import { householdSettingsSchema, type HouseholdSettingsValues } from "../schemas"

export function HouseholdSettingsForm({ defaults, disabled }: { defaults: HouseholdSettingsValues; disabled: boolean }) {
  const [pending, startTransition] = useTransition()
  const form = useForm<HouseholdSettingsValues>({
    resolver: zodResolver(householdSettingsSchema),
    defaultValues: defaults,
  })
  const { errors } = form.formState
  return (
    <form
      noValidate
      className="flex flex-col gap-5"
      onSubmit={form.handleSubmit((v) =>
        startTransition(async () => {
          const res = await updateHousehold(v)
          if (res.ok) toast.success("Hogar actualizado")
          else toast.error(res.error)
        }),
      )}
    >
      <FormField id="hh-name" label="Nombre" error={errors.name?.message}>
        <Input id="hh-name" disabled={disabled} aria-invalid={!!errors.name} {...form.register("name")} />
      </FormField>
      <FormField id="hh-currency" label="Moneda por defecto" hint="Se usa al cargar gastos nuevos.">
        <Controller
          control={form.control}
          name="default_currency"
          render={({ field }) => (
            <ToggleGroup
              id="hh-currency"
              type="single"
              value={field.value}
              onValueChange={(v) => v && field.onChange(v)}
              disabled={disabled}
            >
              <ToggleGroupItem value="ARS">Pesos (ARS)</ToggleGroupItem>
              <ToggleGroupItem value="USD">Dólares (USD)</ToggleGroupItem>
            </ToggleGroup>
          )}
        />
      </FormField>
      {!disabled && (
        <Button type="submit" disabled={pending} className="self-start">
          {pending ? "Guardando…" : "Guardar cambios"}
        </Button>
      )}
    </form>
  )
}
