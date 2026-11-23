import { z } from "zod"
import { optionalAmountField } from "@/lib/domain/money"
import { SHOPPING_CATEGORY_KEYS, UNIT_KEYS } from "./constants"

export const shoppingItemSchema = z.object({
  name: z.string().trim().min(1, "Poné qué hay que comprar.").max(80, "Máximo 80 caracteres."),
  quantity: z.string().refine((s) => {
    const n = Number(s.replace(",", "."))
    return Number.isFinite(n) && n > 0
  }, "Cantidad inválida."),
  unit: z.enum(UNIT_KEYS),
  category: z.enum(SHOPPING_CATEGORY_KEYS),
  estimated_price: optionalAmountField(),
  actual_price: optionalAmountField(),
  is_purchased: z.boolean(),
})

export type ShoppingItemValues = z.infer<typeof shoppingItemSchema>

export const quickItemSchema = shoppingItemSchema.pick({ name: true, category: true })
