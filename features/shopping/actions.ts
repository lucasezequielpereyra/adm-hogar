"use server"

import { revalidatePath } from "next/cache"
import { fail, fromDb, fromZod, ok, type ActionResult } from "@/lib/actions"
import { monthLabel } from "@/lib/domain/format"
import { parseAmount } from "@/lib/domain/money"
import { getHouseholdContext } from "@/lib/session"
import { createClient } from "@/lib/supabase/server"
import { shoppingItemSchema, type ShoppingItemValues } from "./schemas"

function revalidateShopping() {
  revalidatePath("/compras", "layout")
  revalidatePath("/")
}

export async function createMonthList(month: string, sourceListId: string | null): Promise<ActionResult> {
  const ctx = await getHouseholdContext()
  if (!/^\d{4}-\d{2}-01$/.test(month)) return fail("Mes inválido.")
  const supabase = await createClient()
  const { error } = await supabase.rpc("create_shopping_list", {
    p_household_id: ctx.household.id,
    p_name: monthLabel(month),
    p_month: month,
    p_is_template: false,
    p_source_list_id: sourceListId ?? undefined,
  })
  if (error) return fromDb(error, "No se pudo crear la lista.")
  revalidateShopping()
  return ok()
}

export async function saveAsTemplate(listId: string, name: string): Promise<ActionResult> {
  const ctx = await getHouseholdContext()
  const clean = name.trim()
  if (!clean || clean.length > 60) return fail("Poné un nombre de hasta 60 caracteres.")
  const supabase = await createClient()
  const { error } = await supabase.rpc("create_shopping_list", {
    p_household_id: ctx.household.id,
    p_name: clean,
    p_is_template: true,
    p_source_list_id: listId,
  })
  if (error) return fromDb(error, "No se pudo guardar la plantilla.")
  revalidatePath("/mas/plantillas")
  return ok()
}

export async function createEmptyTemplate(name: string): Promise<ActionResult<{ id: string }>> {
  const ctx = await getHouseholdContext()
  const clean = name.trim()
  if (!clean || clean.length > 60) return fail("Poné un nombre de hasta 60 caracteres.")
  const supabase = await createClient()
  const { data, error } = await supabase.rpc("create_shopping_list", {
    p_household_id: ctx.household.id,
    p_name: clean,
    p_is_template: true,
  })
  if (error) return fromDb(error, "No se pudo crear la plantilla.")
  revalidatePath("/mas/plantillas")
  return ok({ id: data })
}

export async function deleteList(listId: string): Promise<ActionResult> {
  const ctx = await getHouseholdContext()
  const supabase = await createClient()
  const { error } = await supabase.from("shopping_lists").delete().eq("id", listId).eq("household_id", ctx.household.id)
  if (error) return fromDb(error, "No se pudo borrar la lista.")
  revalidateShopping()
  revalidatePath("/mas/plantillas")
  return ok()
}

function toRow(v: ShoppingItemValues) {
  return {
    name: v.name,
    quantity: Number(v.quantity.replace(",", ".")),
    unit: v.unit,
    category: v.category,
    estimated_price: parseAmount(v.estimated_price),
    actual_price: v.is_purchased ? parseAmount(v.actual_price) : null,
    is_purchased: v.is_purchased,
  }
}

export async function saveItem(listId: string, id: string | null, values: ShoppingItemValues): Promise<ActionResult> {
  const ctx = await getHouseholdContext()
  const parsed = shoppingItemSchema.safeParse(values)
  if (!parsed.success) return fromZod(parsed.error)
  const row = toRow(parsed.data)
  const supabase = await createClient()
  const purchaseMeta = row.is_purchased
    ? { purchased_by: ctx.user.id, purchased_at: new Date().toISOString() }
    : { purchased_by: null, purchased_at: null }
  const { error } = id
    ? await supabase.from("shopping_items").update({ ...row, ...purchaseMeta }).eq("id", id).eq("household_id", ctx.household.id)
    : await supabase
        .from("shopping_items")
        .insert({ ...row, ...purchaseMeta, list_id: listId, household_id: ctx.household.id, created_by: ctx.user.id })
  if (error) return fromDb(error, "No se pudo guardar el ítem.")
  revalidateShopping()
  return ok()
}

export async function quickAddItem(listId: string, name: string, category: string): Promise<ActionResult> {
  return saveItem(listId, null, {
    name,
    category: category as ShoppingItemValues["category"],
    quantity: "1",
    unit: "u",
    estimated_price: "",
    actual_price: "",
    is_purchased: false,
  })
}

export async function setPurchased(id: string, purchased: boolean): Promise<ActionResult> {
  const ctx = await getHouseholdContext()
  const supabase = await createClient()
  const { error } = await supabase
    .from("shopping_items")
    .update(
      purchased
        ? { is_purchased: true, purchased_by: ctx.user.id, purchased_at: new Date().toISOString() }
        : { is_purchased: false, purchased_by: null, purchased_at: null, actual_price: null },
    )
    .eq("id", id)
    .eq("household_id", ctx.household.id)
  if (error) return fromDb(error, "No se pudo actualizar el ítem.")
  revalidateShopping()
  return ok()
}

export async function deleteItem(id: string): Promise<ActionResult> {
  const ctx = await getHouseholdContext()
  const supabase = await createClient()
  const { error } = await supabase.from("shopping_items").delete().eq("id", id).eq("household_id", ctx.household.id)
  if (error) return fromDb(error, "No se pudo borrar el ítem.")
  revalidateShopping()
  return ok()
}
