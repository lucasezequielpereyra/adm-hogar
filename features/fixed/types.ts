import type { Database } from "@/lib/supabase/database.types"

export type FixedExpense = Database["public"]["Tables"]["fixed_expenses"]["Row"]
export type FixedPayment = Database["public"]["Tables"]["fixed_expense_payments"]["Row"]
export type FixedWithPayment = FixedExpense & { payment: FixedPayment | null; dueDate: string }
