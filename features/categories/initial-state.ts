import "server-only"

/**
 * Estado de categoría al crear un gasto.
 * - Si el usuario eligió categoría: queda asignada por el usuario.
 * - Si no: se guarda "categorizing" y la IA la asigna en background
 *   (ver scheduleCategorization). La carga nunca espera al LLM.
 */
export async function initialCategoryState(_householdId: string, categoryId: string | null) {
  if (categoryId) {
    return {
      category_id: categoryId,
      category_source: "user",
      ai_confidence: null,
      ai_reason: null,
      needs_review: false,
      categorization_status: "done",
    } as const
  }
  return {
    category_id: null,
    category_source: null,
    ai_confidence: null,
    ai_reason: null,
    needs_review: false,
    categorization_status: "categorizing",
  } as const
}
