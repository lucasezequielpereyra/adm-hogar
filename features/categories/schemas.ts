import { z } from "zod"
import { CATEGORY_ICON_KEYS } from "@/lib/icons"
import { PALETTE_KEYS } from "@/lib/palette"

export const categorySchema = z.object({
  name: z.string().trim().min(1, "Poné un nombre.").max(40, "Máximo 40 caracteres."),
  icon: z.enum(CATEGORY_ICON_KEYS as [string, ...string[]]),
  color: z.enum(PALETTE_KEYS),
  description: z.string().trim().max(300, "Máximo 300 caracteres."),
})

export type CategoryValues = z.infer<typeof categorySchema>
