import { describe, expect, it } from 'vitest'
import { calculateSpanWireLength, SPANWIRE_LIMITS } from '../domain/spanwire'

// ---------------------------------------------------------------------------
// calculateSpanWireLength
// ---------------------------------------------------------------------------
describe('calculateSpanWireLength — US units (ohms/ft → inches)', () => {
  it('returns a positive, finite value', () => {
    const length = calculateSpanWireLength({ resistance: 10, resistivity: 0.12, units: 'US' })
    expect(Number.isFinite(length)).toBe(true)
    expect(length).toBeGreaterThan(0)
  })

  it('exact value: R=10 Ω, resistivity=0.12 Ω/ft → 1000 inches', () => {
    // US formula: resistance / (resistivity / 12) = 10 / 0.01 = 1000 inches
    expect(calculateSpanWireLength({ resistance: 10, resistivity: 0.12, units: 'US' }))
      .toBeCloseTo(1000, 8)
  })

  it('scales linearly with resistance', () => {
    const r1 = calculateSpanWireLength({ resistance: 5, resistivity: 0.12, units: 'US' })
    const r2 = calculateSpanWireLength({ resistance: 10, resistivity: 0.12, units: 'US' })
    expect(r2).toBeCloseTo(r1 * 2, 8)
  })

  it('scales inversely with resistivity', () => {
    const r1 = calculateSpanWireLength({ resistance: 10, resistivity: 0.12, units: 'US' })
    const r2 = calculateSpanWireLength({ resistance: 10, resistivity: 0.24, units: 'US' })
    expect(r2).toBeCloseTo(r1 / 2, 8)
  })
})

describe('calculateSpanWireLength — SI units (ohms/m → mm)', () => {
  it('returns a positive, finite value', () => {
    const length = calculateSpanWireLength({ resistance: 10, resistivity: 0.4, units: 'SI' })
    expect(Number.isFinite(length)).toBe(true)
    expect(length).toBeGreaterThan(0)
  })

  it('exact value: R=10 Ω, resistivity=0.4 Ω/m → 25000 mm', () => {
    // SI formula: resistance / (resistivity / 1000) = 10 / 0.0004 = 25000 mm
    expect(calculateSpanWireLength({ resistance: 10, resistivity: 0.4, units: 'SI' }))
      .toBeCloseTo(25000, 8)
  })

  it('scales linearly with resistance', () => {
    const r1 = calculateSpanWireLength({ resistance: 5, resistivity: 0.4, units: 'SI' })
    const r2 = calculateSpanWireLength({ resistance: 10, resistivity: 0.4, units: 'SI' })
    expect(r2).toBeCloseTo(r1 * 2, 8)
  })
})

describe('calculateSpanWireLength — error cases', () => {
  it('throws on zero resistance', () => {
    expect(() =>
      calculateSpanWireLength({ resistance: 0, resistivity: 0.12, units: 'US' })
    ).toThrow()
  })

  it('throws on negative resistance', () => {
    expect(() =>
      calculateSpanWireLength({ resistance: -5, resistivity: 0.12, units: 'US' })
    ).toThrow()
  })

  it('throws on zero resistivity', () => {
    expect(() =>
      calculateSpanWireLength({ resistance: 10, resistivity: 0, units: 'US' })
    ).toThrow()
  })

  it('throws on negative resistivity', () => {
    expect(() =>
      calculateSpanWireLength({ resistance: 10, resistivity: -0.12, units: 'US' })
    ).toThrow()
  })
})

describe('calculateSpanWireLength — US vs SI give different lengths for same numbers', () => {
  it('US and SI formulas differ (US divides by 12, SI by 1000)', () => {
    const us = calculateSpanWireLength({ resistance: 10, resistivity: 0.12, units: 'US' })
    const si = calculateSpanWireLength({ resistance: 10, resistivity: 0.12, units: 'SI' })
    // SI result = 10 / (0.12/1000) = 83333 mm; US = 10 / (0.12/12) = 1000 in
    expect(us).not.toBeCloseTo(si, 0)
  })
})

// ---------------------------------------------------------------------------
// SPANWIRE_LIMITS — catalogue shape
// ---------------------------------------------------------------------------
describe('SPANWIRE_LIMITS', () => {
  it('exposes the expected limit keys', () => {
    expect(SPANWIRE_LIMITS.minLengthUs).toBeGreaterThan(0)
    expect(SPANWIRE_LIMITS.maxLengthUs).toBeGreaterThan(SPANWIRE_LIMITS.minLengthUs)
    expect(SPANWIRE_LIMITS.minResistance).toBeGreaterThan(0)
    expect(SPANWIRE_LIMITS.maxResistance).toBeGreaterThan(SPANWIRE_LIMITS.minResistance)
  })
})
