import "server-only"
import { after } from "next/server"
import type { EntityType } from "@/lib/ai/entities"
import { recordCorrection } from "@/lib/ai/learn"
import { runCategorization } from "@/lib/ai/run"

/** Categoriza en background, después de responder (Vercel: waitUntil). */
export function scheduleCategorization(entityType: EntityType, entityId: string, opts: { force?: boolean; userId?: string } = {}) {
  after(async () => {
    try {
      await runCategorization(entityType, entityId, { force: opts.force, triggeredBy: opts.userId })
    } catch (err) {
      console.error("[ai] categorización en background falló", err)
    }
  })
}

/** Aprende de una corrección manual, en background. */
export function scheduleLearning(opts: Parameters<typeof recordCorrection>[0]) {
  if (opts.fromCategoryId === opts.toCategoryId) return
  after(async () => {
    try {
      await recordCorrection(opts)
    } catch (err) {
      console.error("[ai] no se pudo registrar la corrección", err)
    }
  })
}
