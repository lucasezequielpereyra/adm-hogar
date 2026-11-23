import { z } from "zod"
import { amountField } from "@/lib/domain/money"
import { PALETTE_KEYS } from "@/lib/palette"

const day = z.number({ message: "Elegí un día." }).int().min(1, "Entre 1 y 31.").max(31, "Entre 1 y 31.")

export const cardSchema = z.object({
  name: z.string().trim().min(1, "Poné un nombre.").max(40, "Máximo 40 caracteres."),
  bank: z.string().trim().max(40, "Máximo 40 caracteres."),
  holder_id: z.uuid().nullable(),
  closing_day: day,
  due_day: day,
  color: z.enum(PALETTE_KEYS),
  last4: z.string().trim().refine((s) => s === "" || /^\d{4}$/.test(s), "Son 4 números."),
  is_active: z.boolean(),
})

export type CardValues = z.infer<typeof cardSchema>

export const cardExpenseSchema = z.object({
  description: z.string().trim().min(1, "Poné una descripción.").max(140, "Máximo 140 caracteres."),
  amount: amountField(),
  currency: z.enum(["ARS", "USD"]),
  purchase_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Fecha inválida."),
  card_id: z.uuid({ message: "Elegí una tarjeta." }),
  installments_count: z.number({ message: "Cuotas inválidas." }).int().min(1, "Entre 1 y 60.").max(60, "Entre 1 y 60."),
  category_id: z.uuid().nullable(),
  is_private: z.boolean(),
  notes: z.string().trim().max(500, "Máximo 500 caracteres."),
})

export type CardExpenseValues = z.infer<typeof cardExpenseSchema>

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Fecha inválida.")

/** Fechas reales de un resumen (mismas reglas que los CHECK de card_statements). */
export const statementDatesSchema = z
  .object({
    period: z.string().regex(/^\d{4}-\d{2}-01$/, "Período inválido."),
    closing_date: isoDate,
    due_date: isoDate,
  })
  .superRefine((v, ctx) => {
    const p = new Date(`${v.period}T00:00:00Z`)
    const min = new Date(p)
    min.setUTCDate(min.getUTCDate() - 15)
    const max = new Date(Date.UTC(p.getUTCFullYear(), p.getUTCMonth() + 1, 1))
    max.setUTCDate(max.getUTCDate() + 15)
    const closing = new Date(`${v.closing_date}T00:00:00Z`)
    if (closing < min || closing >= max) {
      ctx.addIssue({ code: "custom", path: ["closing_date"], message: "El cierre tiene que caer cerca del mes del resumen." })
    }
    const due = new Date(`${v.due_date}T00:00:00Z`)
    const days = (due.getTime() - closing.getTime()) / 86_400_000
    if (days <= 0) ctx.addIssue({ code: "custom", path: ["due_date"], message: "El vencimiento tiene que ser después del cierre." })
    else if (days > 45) ctx.addIssue({ code: "custom", path: ["due_date"], message: "El vencimiento no puede ser más de 45 días después del cierre." })
  })

export type StatementDatesValues = z.infer<typeof statementDatesSchema>
