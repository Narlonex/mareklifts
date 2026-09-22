import { useEffect, useRef, useState } from 'react'
import { useAppStore } from '../store/useAppStore'
import { haptics, playRestChime } from '../lib/feedback'

/**
 * Foreground training clock.
 *
 * Only time with the app actually open counts, so a phone in a pocket — or an
 * accidentally closed app — never inflates the workout duration. Seconds are
 * banked into the persisted store every 5s, so at most 5s is ever lost.
 */
export function useWorkoutClock(): number {
  const isActive = useAppStore((s) => s.activeWorkout !== null)
  const banked = useAppStore((s) => s.clockAccumulatedSec)
  const addClockSeconds = useAppStore((s) => s.addClockSeconds)
  const [local, setLocal] = useState(0)
  const pending = useRef(0)

  useEffect(() => {
    setLocal(0)
    pending.current = 0
  }, [isActive])

  useEffect(() => {
    if (!isActive) return
    const flush = () => {
      const whole = Math.floor(pending.current)
      if (whole > 0) {
        addClockSeconds(whole)
        pending.current -= whole
      }
    }
    let last = Date.now()
    const id = window.setInterval(() => {
      const now = Date.now()
      const delta = (now - last) / 1000
      last = now
      if (document.visibilityState !== 'visible') return
      setLocal((v) => v + delta)
      pending.current += delta
      if (pending.current >= 5) flush()
    }, 1000)

    const onVisibility = () => {
      if (document.visibilityState !== 'visible') {
        flush()
      } else {
        last = Date.now()
      }
    }
    const onHide = () => flush()
    document.addEventListener('visibilitychange', onVisibility)
    window.addEventListener('pagehide', onHide)
    window.addEventListener('beforeunload', onHide)
    return () => {
      window.clearInterval(id)
      document.removeEventListener('visibilitychange', onVisibility)
      window.removeEventListener('pagehide', onHide)
      window.removeEventListener('beforeunload', onHide)
      flush()
    }
  }, [isActive, addClockSeconds])

  return Math.floor(banked + local)
}

/** Milliseconds left on the rest timer, or null when no timer is running. */
export function useRestRemaining(): number | null {
  const restTimer = useAppStore((s) => s.restTimer)
  const [now, setNow] = useState(() => Date.now())

  useEffect(() => {
    if (!restTimer) return
    const id = window.setInterval(() => setNow(Date.now()), 250)
    return () => window.clearInterval(id)
  }, [restTimer])

  if (!restTimer) return null
  if (restTimer.pausedRemainingMs !== null) return restTimer.pausedRemainingMs
  return Math.max(0, restTimer.endsAt - now)
}

/**
 * Fires the chime + haptic exactly once when the countdown reaches zero, then
 * clears the timer a few seconds later so it doesn't linger all session.
 */
export function RestTimerAlert(): null {
  const restTimer = useAppStore((s) => s.restTimer)
  const skipRest = useAppStore((s) => s.skipRest)
  const remaining = useRestRemaining()
  const fired = useRef(false)

  useEffect(() => {
    if (!restTimer) {
      fired.current = false
      return
    }
    if (remaining === null) return
    if (remaining > 0) {
      fired.current = false
      return
    }
    if (fired.current) return
    fired.current = true
    playRestChime()
    haptics.restDone()
    const id = window.setTimeout(() => skipRest(), 6000)
    return () => window.clearTimeout(id)
  }, [restTimer, remaining, skipRest])

  return null
}

/** Re-renders on an interval — used for relative "x ago" labels. */
export function useTick(intervalMs: number): number {
  const [tick, setTick] = useState(0)
  useEffect(() => {
    const id = window.setInterval(() => setTick((t) => t + 1), intervalMs)
    return () => window.clearInterval(id)
  }, [intervalMs])
  return tick
}
