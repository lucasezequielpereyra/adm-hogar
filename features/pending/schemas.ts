import { z } from "zod"
import { optionalAmountField } from "@/lib/domain/money"

export const pendingSchema = z.object({
  name: z.string().trim().min(1, "Poné qué hay que comprar.").max(120, "Máximo 120 caracteres."),
  kind: z.enum(["hogar", "personal", "otro"]),
  priority: z.enum(["low", "medium", "high"]),
  estimated_price: optionalAmountField(),
  currency: z.enum(["ARS", "USD"]),
  url: z
    .string()
    .trim()
    .max(500)
    .refine((s) => s === "" || /^https?:\/\/\S+$/i.test(s), "Pegá un link que empiece con http:// o https://"),
  notes: z.string().trim().max(1000, "Máximo 1000 caracteres."),
  requested_by: z.uuid().nullable(),
  category_id: z.uuid().nullable(),
  is_private: z.boolean(),
})

export type PendingValues = z.infer<typeof pendingSchema>

export const KIND_LABEL = { hogar: "Hogar", personal: "Personal", otro: "Otro" } as const
