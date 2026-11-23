"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import { useTransition } from "react"
import { useForm } from "react-hook-form"
import { FormField } from "@/components/form/form-field"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { signInWithPassword } from "./actions"
import { loginSchema, type LoginValues } from "./schemas"

export function LoginForm({ next, initialError }: { next?: string; initialError?: string }) {
  const [pending, startTransition] = useTransition()
  const form = useForm<LoginValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { username: "", password: "" },
  })
  const { errors } = form.formState

  const onSubmit = form.handleSubmit((values) =>
    startTransition(async () => {
      const res = await signInWithPassword(values, next)
      if (res && !res.ok) form.setError("root", { message: res.error })
    }),
  )

  const rootError = errors.root?.message ?? initialError

  return (
    <div className="mx-[3px] flex flex-col gap-5 bg-panel p-5 text-foreground pixel-box">
      <form onSubmit={onSubmit} className="flex flex-col gap-4" noValidate>
        <FormField id="username" label="Usuario" error={errors.username?.message}>
          <Input
            id="username"
            autoComplete="username"
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            aria-invalid={!!errors.username}
            {...form.register("username")}
          />
        </FormField>
        <FormField id="password" label="Contraseña" error={errors.password?.message}>
          <Input id="password" type="password" autoComplete="current-password" aria-invalid={!!errors.password} {...form.register("password")} />
        </FormField>
        {rootError && (
          <p role="alert" className="text-ladrillo">
            {rootError}
          </p>
        )}
        <Button type="submit" size="lg" disabled={pending} className="mt-1 w-full">
          {pending ? "Ingresando…" : "Ingresar"}
        </Button>
      </form>
    </div>
  )
}
