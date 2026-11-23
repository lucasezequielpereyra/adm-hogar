import { z } from "zod"
import { amountField } from "@/lib/domain/money"

export const PAYMENT_METHODS = {
  debito: "Débito automático",
  tarjeta: "Tarjeta",
  transferencia: "Transferencia",
  efectivo: "Efectivo",
  otro: "Otro",
} as const

export const fixedSchema = z.object({
  name: z.string().trim().min(1, "Poné un nombre.").max(80, "Máximo 80 caracteres."),
  amount: amountField(),
  currency: z.enum(["ARS", "USD"]),
  due_day: z.number({ message: "Elegí un día." }).int().min(1, "Entre 1 y 31.").max(31, "Entre 1 y 31."),
  payment_method: z.enum(Object.keys(PAYMENT_METHODS) as [keyof typeof PAYMENT_METHODS, ...(keyof typeof PAYMENT_METHODS)[]]),
  responsible_id: z.uuid().nullable(),
  category_id: z.uuid().nullable(),
  is_active: z.boolean(),
  is_private: z.boolean(),
  notes: z.string().trim().max(500, "Máximo 500 caracteres."),
})

export type FixedValues = z.infer<typeof fixedSchema>

export const paymentSchema = z.object({
  amount: amountField(),
  paid_at: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Fecha inválida."),
  notes: z.string().trim().max(300, "Máximo 300 caracteres."),
})

export type PaymentValues = z.infer<typeof paymentSchema>
