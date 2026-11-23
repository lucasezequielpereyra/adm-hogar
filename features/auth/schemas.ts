import { z } from "zod"
import { isValidUsername, normalizeUsername } from "@/lib/auth/username"

const username = z
  .string()
  .transform(normalizeUsername)
  .refine(isValidUsername, "De 3 a 20 caracteres: letras, números, punto, guion o guion bajo.")

export const loginSchema = z.object({
  username: z.string().transform(normalizeUsername).refine((s) => s.length > 0, "Ingresá tu usuario."),
  password: z.string().min(1, "Ingresá tu contraseña."),
})

export const signupSchema = z
  .object({
    name: z.string().trim().min(1, "Contanos cómo te llamás.").max(60, "Máximo 60 caracteres."),
    username,
    password: z.string().min(8, "Usá al menos 8 caracteres."),
    confirm: z.string(),
  })
  .refine((v) => v.password === v.confirm, { path: ["confirm"], message: "Las contraseñas no coinciden." })

export type LoginValues = z.input<typeof loginSchema>
export type SignupValues = z.input<typeof signupSchema>
