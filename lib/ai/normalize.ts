/**
 * Prefijos de procesadores de pago que aparecen en los resúmenes antes del
 * comercio real ("MERPAGO*RAPPI" → "RAPPI"). Solo se sacan si van seguidos
 * de "*".
 */
const PROCESSOR_PREFIXES = [
  "merpago",
  "mercadopago",
  "mercpago",
  "mp",
  "dlo",
  "dlocal",
  "payu",
  "paypal",
  "pp",
  "sq",
  "tst",
  "stripe",
  "google",
  "apple",
]

const PREFIX_RE = new RegExp(`^(?:${PROCESSOR_PREFIXES.join("|")})\\s*\\*\\s*`)

/** Marcas de cuota: "02/03", "C.02/06", "cuota 3 de 6", "cuota 3/6". */
const INSTALLMENT_RES = [/\bcuota\s*\d{1,2}\s*(?:de|\/)\s*\d{1,2}\b/g, /\bc\.?\s*\d{1,2}\s*\/\s*\d{1,2}\b/g, /\b\d{1,2}\s*\/\s*\d{1,2}\b/g]

/**
 * Normaliza la descripción de un gasto para buscar reglas:
 * minúsculas, sin tildes, sin prefijo de procesador, sin cuotas, sin
 * números ni caracteres especiales, espacios colapsados.
 *   "MERPAGO*RAPPI 02/03" → "rappi"
 */
export function normalizeDescription(input: string | null | undefined): string {
  if (!input) return ""
  let s = input.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim()
  // Puede haber más de un prefijo encadenado ("dlo*google *youtube").
  for (let i = 0; i < 3 && PREFIX_RE.test(s); i++) s = s.replace(PREFIX_RE, "")
  for (const re of INSTALLMENT_RES) s = s.replace(re, " ")
  s = s.replace(/\d+/g, " ").replace(/[^a-z\s]/g, " ").replace(/\s+/g, " ").trim()
  return s
}

/** Largo mínimo de una descripción normalizada para crear una regla. */
export const MIN_RULE_LENGTH = 3
