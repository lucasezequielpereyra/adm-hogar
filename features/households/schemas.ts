import { z } from "zod"
import { isValidUsername, normalizeUsername } from "@/lib/auth/username"
import { PALETTE_KEYS } from "@/lib/palette"

export const householdNameSchema = z.object({
  name: z.string().trim().min(1, "Poné un nombre.").max(60, "Máximo 60 caracteres."),
})

export const householdSettingsSchema = householdNameSchema.extend({
  default_currency: z.enum(["ARS", "USD"]),
})

export const joinSchema = z.object({
  code: z
    .string()
    .trim()
    .toUpperCase()
    .regex(/^[A-Z0-9]{8}$/, "El código tiene 8 letras y números."),
})

export const memberSelfSchema = z.object({
  nickname: z.string().trim().max(30, "Máximo 30 caracteres.").optional().or(z.literal("")),
  color: z.enum(PALETTE_KEYS),
})

export const profileSchema = z.object({
  display_name: z.string().trim().min(1, "Contanos cómo te llamás.").max(60, "Máximo 60 caracteres."),
  sound_enabled: z.boolean(),
})

export const invitationSchema = z.object({
  role: z.enum(["admin", "member"]),
  days: z.coerce.number().int().min(1).max(30),
  /** Si se indica, solo ese usuario puede usarla y la ve al ingresar. */
  username: z
    .string()
    .transform(normalizeUsername)
    .refine((s) => s === "" || isValidUsername(s), "Ese no es un usuario válido."),
})

export type HouseholdNameValues = z.infer<typeof householdNameSchema>
export type HouseholdSettingsValues = z.infer<typeof householdSettingsSchema>
export type JoinValues = z.infer<typeof joinSchema>
export type MemberSelfValues = z.infer<typeof memberSelfSchema>
export type ProfileValues = z.infer<typeof profileSchema>
export type InvitationValues = z.input<typeof invitationSchema>
