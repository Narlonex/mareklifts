/**
 * Physical feedback: haptics where supported, and a short synthesised chime for
 * the rest timer. No audio files, no assets, and everything degrades silently.
 */

export function vibrate(pattern: number | number[]): void {
  try {
    navigator.vibrate?.(pattern)
  } catch {
    /* unsupported — ignore */
  }
}

export const haptics = {
  /** Light confirmation when a set is completed. */
  set: () => vibrate(18),
  /** Distinct double-buzz when a personal record falls. */
  pr: () => vibrate([24, 60, 24, 60, 40]),
  /** Rest timer finished. */
  restDone: () => vibrate([180, 90, 180]),
  tap: () => vibrate(8),
}

let audioContext: AudioContext | null = null

function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null
  const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
  if (!Ctor) return null
  if (!audioContext) audioContext = new Ctor()
  return audioContext
}

/**
 * Unlock audio on the first user gesture. Browsers block audio until then, so
 * we prime the context when the user starts their first set.
 */
export function primeAudio(): void {
  const ctx = getAudioContext()
  if (!ctx) return
  if (ctx.state === 'suspended') void ctx.resume()
}

/** Two-tone chime for the rest timer. Silently no-ops if audio is unavailable. */
export function playRestChime(): void {
  const ctx = getAudioContext()
  if (!ctx) return
  if (ctx.state === 'suspended') void ctx.resume()
  const start = ctx.currentTime
  const tones = [
    { freq: 880, at: 0, dur: 0.16 },
    { freq: 1320, at: 0.2, dur: 0.22 },
  ]
  for (const tone of tones) {
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.type = 'sine'
    osc.frequency.value = tone.freq
    const t0 = start + tone.at
    gain.gain.setValueAtTime(0.0001, t0)
    gain.gain.exponentialRampToValueAtTime(0.22, t0 + 0.02)
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + tone.dur)
    osc.connect(gain).connect(ctx.destination)
    osc.start(t0)
    osc.stop(t0 + tone.dur + 0.02)
  }
}

let wakeLock: { release: () => Promise<void> } | null = null

/**
 * Keep the screen awake during an active workout — phones dim mid-set
 * otherwise. Silently no-ops where the API is missing or denied.
 */
export async function requestWakeLock(): Promise<void> {
  try {
    const nav = navigator as Navigator & { wakeLock?: { request: (t: string) => Promise<never> } }
    if (!nav.wakeLock) return
    wakeLock = (await nav.wakeLock.request('screen')) as unknown as { release: () => Promise<void> }
  } catch {
    /* denied or unsupported */
  }
}

export async function releaseWakeLock(): Promise<void> {
  try {
    await wakeLock?.release()
  } catch {
    /* already released */
  }
  wakeLock = null
}
