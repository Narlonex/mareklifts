import { useEffect, useState } from 'react'
import { useAppStore } from '../store/useAppStore'

const QUERY = '(prefers-color-scheme: dark)'

function systemPrefersDark(): boolean {
  if (typeof window === 'undefined' || !window.matchMedia) return false
  return window.matchMedia(QUERY).matches
}

/** Tracks the OS dark-mode preference. */
export function useSystemDark(): boolean {
  const [dark, setDark] = useState(systemPrefersDark)
  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return
    const mq = window.matchMedia(QUERY)
    const handler = () => setDark(mq.matches)
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [])
  return dark
}

/** Resolves the user's theme preference against the OS setting. */
export function useIsDark(): boolean {
  const theme = useAppStore((s) => s.user.theme)
  const systemDark = useSystemDark()
  return theme === 'dark' || (theme === 'system' && systemDark)
}

/** Applies the resolved theme to <html> and keeps the browser chrome in sync. */
export function useApplyTheme(): void {
  const isDark = useIsDark()
  useEffect(() => {
    const root = document.documentElement
    root.classList.toggle('dark', isDark)
    const meta = document.querySelector('meta[name="theme-color"]')
    meta?.setAttribute('content', isDark ? '#0b0f14' : '#2563eb')
  }, [isDark])
}

/** Chart palettes, resolved per theme (recharts needs concrete colours). */
export function useChartColors() {
  const isDark = useIsDark()
  return isDark
    ? {
        line: '#60a5fa',
        area: '#1e3a8a',
        grid: '#242d38',
        axis: '#6b7a8d',
        accent: '#3b82f6',
        bar: '#60a5fa',
        surface: '#141a21',
        text: '#eef2f7',
      }
    : {
        line: '#2563eb',
        area: '#bfdbfe',
        grid: '#e7ebf0',
        axis: '#94a3b8',
        accent: '#2563eb',
        bar: '#2563eb',
        surface: '#ffffff',
        text: '#0f172a',
      }
}
