import type { Unit } from '../types'

/** Exact international avoirdupois pound. */
export const LB_PER_KG = 2.2046226218487757

/** Canonical storage keeps 3 decimals of a kg — ample precision for plate jumps. */
export function roundKg(kg: number): number {
  return Math.round(kg * 1000) / 1000
}

export function kgToLb(kg: number): number {
  return kg * LB_PER_KG
}

export function lbToKg(lb: number): number {
  return lb / LB_PER_KG
}

/** kg -> the number shown in the weight field for the active unit. */
export function toDisplayWeight(kg: number, unit: Unit): number {
  const value = unit === 'kg' ? kg : kgToLb(kg)
  // One decimal is the finest granularity any gym user cares about, and it
  // makes kg -> lb -> kg round-trips land back on the original number.
  return Math.round(value * 10) / 10
}

/** A number typed in the active unit -> canonical kg for storage. */
export function fromDisplayWeight(value: number, unit: Unit): number {
  if (!Number.isFinite(value)) return 0
  return roundKg(unit === 'kg' ? value : lbToKg(value))
}

/** Weight formatted for a label, e.g. "55" or "121.3". */
export function formatWeight(kg: number, unit: Unit): string {
  const value = toDisplayWeight(kg, unit)
  return Number.isInteger(value) ? String(value) : value.toFixed(1).replace(/\.0$/, '')
}

/** Weight with its unit, e.g. "55 kg". */
export function formatWeightWithUnit(kg: number, unit: Unit): string {
  return `${formatWeight(kg, unit)} ${unit}`
}

/**
 * Sensible +/- step for the weight steppers, in display units: 2.5 kg is the
 * smallest common plate pair, 5 lb the smallest common fractional plate.
 */
export function weightStep(unit: Unit): number {
  return unit === 'kg' ? 2.5 : 5
}

export function cmToFeetInches(cm: number): { feet: number; inches: number } {
  const totalInches = cm / 2.54
  const feet = Math.floor(totalInches / 12)
  return { feet, inches: Math.round(totalInches - feet * 12) }
}

export function feetInchesToCm(feet: number, inches: number): number {
  return Math.round((feet * 12 + inches) * 2.54)
}
