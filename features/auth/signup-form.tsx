"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import { useTransition } from "react"
import { useForm } from "react-hook-form"
import { FormField } from "@/components/form/form-field"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { signUp } from "./actions"
import { signupSchema, type SignupValues } from "./schemas"

export function SignupForm({ next }: { next?: string }) {
  const [pending, startTransition] = useTransition()
  const form = useForm<SignupValues>({
    resolver: zodResolver(signupSchema),
    defaultValues: { name: "", username: "", password: "", confirm: "" },
  })
  const { errors } = form.formState

  const onSubmit = form.handleSubmit((values) =>
    startTransition(async () => {
      const res = await signUp(values, next)
      if (res && !res.ok) {
        form.setError("root", { message: res.error })
        Object.entries(res.fieldErrors ?? {}).forEach(([k, m]) => form.setError(k as keyof SignupValues, { message: m }))
      }
    }),
  )

  return (
    <div className="mx-[3px] flex flex-col gap-5 bg-panel p-5 text-foreground pixel-box">
      <form onSubmit={onSubmit} className="flex flex-col gap-4" noValidate>
        <FormField id="name" label="Tu nombre" error={errors.name?.message}>
          <Input id="name" autoComplete="given-name" aria-invalid={!!errors.name} {...form.register("name")} />
        </FormField>
        <FormField
          id="username"
          label="Usuario"
          error={errors.username?.message}
          hint="Con esto vas a ingresar y te van a poder invitar. No se puede cambiar."
        >
          <Input
            id="username"
            autoComplete="username"
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            placeholder="ej: ana.gomez"
            aria-invalid={!!errors.username}
            {...form.register("username")}
          />
        </FormField>
        <FormField id="password" label="Contraseña" error={errors.password?.message} hint="Al menos 8 caracteres.">
          <Input id="password" type="password" autoComplete="new-password" aria-invalid={!!errors.password} {...form.register("password")} />
        </FormField>
        <FormField id="confirm" label="Repetí la contraseña" error={errors.confirm?.message}>
          <Input id="confirm" type="password" autoComplete="new-password" aria-invalid={!!errors.confirm} {...form.register("confirm")} />
        </FormField>
        {errors.root?.message && (
          <p role="alert" className="text-ladrillo">
            {errors.root.message}
          </p>
        )}
        <Button type="submit" size="lg" disabled={pending} className="mt-1 w-full">
          {pending ? "Creando cuenta…" : "Crear cuenta"}
        </Button>
      </form>
    </div>
  )
}
