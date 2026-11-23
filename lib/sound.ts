"use client"

/**
 * Sonidos chiptune originales, generados con WebAudio (sin archivos).
 * Apagados por defecto; se activan en Más → Perfil.
 */
const KEY = "hogar:sonido"
let ctx: AudioContext | null = null

export function soundEnabled() {
  return typeof window !== "undefined" && window.localStorage.getItem(KEY) === "1"
}

export function setSoundEnabled(on: boolean) {
  window.localStorage.setItem(KEY, on ? "1" : "0")
}

function tone(freq: number, start: number, duration: number, type: OscillatorType = "square", gain = 0.06) {
  if (!ctx) return
  const osc = ctx.createOscillator()
  const g = ctx.createGain()
  osc.type = type
  osc.frequency.setValueAtTime(freq, ctx.currentTime + start)
  g.gain.setValueAtTime(gain, ctx.currentTime + start)
  g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + start + duration)
  osc.connect(g).connect(ctx.destination)
  osc.start(ctx.currentTime + start)
  osc.stop(ctx.currentTime + start + duration)
}

export function playSound(kind: "coin" | "check" | "error") {
  if (!soundEnabled()) return
  try {
    ctx ??= new AudioContext()
    if (kind === "coin") {
      tone(988, 0, 0.08) // si
      tone(1319, 0.07, 0.25) // mi
    } else if (kind === "check") {
      tone(660, 0, 0.06)
      tone(880, 0.05, 0.1)
    } else {
      tone(220, 0, 0.12, "triangle", 0.08)
      tone(165, 0.1, 0.18, "triangle", 0.08)
    }
  } catch {
    // Sin audio disponible: no pasa nada.
  }
}
