/** Small formatting helpers. Deliberately dependency-free (no date-fns). */

import type { Unit } from '../types'
import { formatWeight } from './units'

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

/** 3725 -> "1h 2m", 185 -> "3m 5s", 45 -> "0:45" */
export function formatDuration(totalSeconds: number): string {
  const s = Math.max(0, Math.round(totalSeconds))
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  const sec = s % 60
  if (h > 0) return `${h}h ${m}m`
  if (m > 0) return `${m}m ${sec.toString().padStart(2, '0')}s`
  return `${sec}s`
}

/** 3725 -> "1:02:05", 185 -> "3:05" — used for the live workout clock. */
export function formatClock(totalSeconds: number): string {
  const s = Math.max(0, Math.floor(totalSeconds))
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  const sec = s % 60
  const mm = h > 0 ? m.toString().padStart(2, '0') : String(m)
  return h > 0 ? `${h}:${mm}:${sec.toString().padStart(2, '0')}` : `${mm}:${sec.toString().padStart(2, '0')}`
}

/** "2:00" — countdown label for the rest timer. */
export function formatCountdown(ms: number): string {
  const total = Math.max(0, Math.ceil(ms / 1000))
  const m = Math.floor(total / 60)
  const s = total % 60
  return `${m}:${s.toString().padStart(2, '0')}`
}

export function startOfDay(ts: number): number {
  const d = new Date(ts)
  d.setHours(0, 0, 0, 0)
  return d.getTime()
}

export function isSameDay(a: number, b: number): boolean {
  return startOfDay(a) === startOfDay(b)
}

/** "Today", "Yesterday", "Mon, 14 Sep", or "14 Sep 2025" for other years. */
export function formatDate(ts: number, now = Date.now()): string {
  const day = startOfDay(ts)
  const today = startOfDay(now)
  const dayMs = 86400000
  if (day === today) return 'Today'
  if (day === today - dayMs) return 'Yesterday'
  const d = new Date(ts)
  const withinWeek = day > today - dayMs * 6
  const label = `${d.getDate()} ${MONTHS[d.getMonth()]}`
  if (withinWeek) return `${WEEKDAYS[d.getDay()]}, ${label}`
  if (d.getFullYear() === new Date(now).getFullYear()) return label
  return `${label} ${d.getFullYear()}`
}

/** "14 Sep" — compact axis label for charts. */
export function formatShortDate(ts: number): string {
  const d = new Date(ts)
  return `${d.getDate()} ${MONTHS[d.getMonth()]}`
}

/** "Mon 14 Sep, 18:32" */
export function formatDateTime(ts: number): string {
  const d = new Date(ts)
  const time = `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`
  return `${WEEKDAYS[d.getDay()]} ${d.getDate()} ${MONTHS[d.getMonth()]}, ${time}`
}

/** Week label like "Mon 8 Sep" for history grouping headers. */
export function formatWeekLabel(weekStartTs: number): string {
  const d = new Date(weekStartTs)
  return `Week of ${d.getDate()} ${MONTHS[d.getMonth()]}`
}

/** Monday 00:00 of the week containing ts. */
export function startOfWeek(ts: number): number {
  const d = new Date(startOfDay(ts))
  const dow = (d.getDay() + 6) % 7 // Monday = 0
  d.setDate(d.getDate() - dow)
  return d.getTime()
}

export function daysBetween(a: number, b: number): number {
  return Math.round((startOfDay(b) - startOfDay(a)) / 86400000)
}

/** "+2.5 kg" / "-5 kg" / "—" for deltas between sessions. */
export function formatWeightDelta(deltaKg: number, unit: Unit): string {
  if (Math.abs(deltaKg) < 0.01) return '—'
  const sign = deltaKg > 0 ? '+' : '-'
  return `${sign}${formatWeight(Math.abs(deltaKg), unit)} ${unit}`
}

/** 12480 -> "12.5t", 940 -> "940 kg" — compact volume for tight layouts. */
export function formatVolume(volumeKg: number, unit: Unit): string {
  if (unit === 'lb') {
    const lb = volumeKg * 2.2046226218487757
    return lb >= 10000 ? `${(lb / 1000).toFixed(1)}k lb` : `${Math.round(lb)} lb`
  }
  return volumeKg >= 10000 ? `${(volumeKg / 1000).toFixed(1)}t` : `${Math.round(volumeKg)} kg`
}

/** Plain number rendering for big stat tiles. */
export function formatNumber(n: number, decimals = 0): string {
  return n.toLocaleString(undefined, {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  })
}

export function pluralize(count: number, singular: string, plural = `${singular}s`): string {
  return `${count} ${count === 1 ? singular : plural}`
}

/** "2h ago", "in 3 days" — relative phrasing for PR banners. */
export function formatRelative(ts: number, now = Date.now()): string {
  const diff = now - ts
  const dayMs = 86400000
  if (isSameDay(ts, now)) return 'today'
  if (Math.abs(diff) < dayMs * 2) return diff > 0 ? 'yesterday' : 'tomorrow'
  const days = Math.round(diff / dayMs)
  if (days > 0) return `${days} days ago`
  return `in ${Math.abs(days)} days`
}
