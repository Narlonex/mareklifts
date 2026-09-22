import { describe, expect, it } from 'vitest'
import {
  cmToFeetInches,
  feetInchesToCm,
  formatWeight,
  formatWeightWithUnit,
  fromDisplayWeight,
  roundKg,
  toDisplayWeight,
  weightStep,
} from './units'

describe('kg and lb conversion', () => {
  it('round-trips what the user actually sees in pounds', () => {
    // The invariant that matters is that a displayed pound value survives a
    // conversion to kg and back (editing a set must never change the number).
    for (const lb of [2.5, 45, 121.3, 220.5, 300]) {
      expect(toDisplayWeight(fromDisplayWeight(lb, 'lb'), 'lb')).toBe(lb)
    }
  })

  it('keeps kilograms within a pound after a pound round-trip', () => {
    for (const kg of [2.5, 20, 55, 57.5, 100]) {
      expect(fromDisplayWeight(toDisplayWeight(kg, 'lb'), 'lb')).toBeCloseTo(kg, 1)
    }
  })

  it('keeps kilogram values exactly as entered', () => {
    expect(fromDisplayWeight(55, 'kg')).toBe(55)
    expect(fromDisplayWeight(2.5, 'kg')).toBe(2.5)
    expect(toDisplayWeight(60, 'kg')).toBe(60)
  })

  it('shows a familiar pound figure for a kilogram weight', () => {
    // 100 kg is the classic 220 lb gym reference point.
    expect(toDisplayWeight(100, 'lb')).toBeCloseTo(220.5, 1)
  })

  it('clamps precision so stored values stay tidy', () => {
    expect(roundKg(fromDisplayWeight(121.3, 'lb'))).toBe(55.021)
  })

  it('handles invalid input safely', () => {
    expect(fromDisplayWeight(Number.NaN, 'kg')).toBe(0)
    expect(fromDisplayWeight(Number.POSITIVE_INFINITY, 'kg')).toBe(0)
  })
})

describe('formatting', () => {
  it('drops trailing zeroes on weights', () => {
    expect(formatWeight(55, 'kg')).toBe('55')
    expect(formatWeight(57.5, 'kg')).toBe('57.5')
    expect(formatWeightWithUnit(55, 'kg')).toBe('55 kg')
    expect(formatWeightWithUnit(100, 'lb')).toBe('220.5 lb')
  })
})

describe('steps', () => {
  it('uses plate-friendly increments per unit', () => {
    expect(weightStep('kg')).toBe(2.5)
    expect(weightStep('lb')).toBe(5)
  })
})

describe('height helpers', () => {
  it('converts centimetres to feet and inches', () => {
    expect(cmToFeetInches(178)).toEqual({ feet: 5, inches: 10 })
    expect(feetInchesToCm(5, 10)).toBe(178)
  })
})
