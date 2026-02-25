import { describe, expect, it } from 'vitest'
import {
  calculateRoundSBeamSpan,
  calculateSquareShearSpan,
  calculateRoundShearSpan,
} from '../domain/shearBeams'

// Base geometry used across most tests
const BASE = {
  load: 1000,
  width: 20,
  height: 12,
  diameter: 10,
  thickness: 2,
  modulus: 200e9,
  poisson: 0.3,
  gageFactor: 2.1,
}

// ---------------------------------------------------------------------------
// calculateRoundSBeamSpan
// ---------------------------------------------------------------------------
describe('calculateRoundSBeamSpan', () => {
  it('returns a positive, finite value for well-formed inputs', () => {
    const span = calculateRoundSBeamSpan(BASE)
    expect(Number.isFinite(span)).toBe(true)
    expect(span).toBeGreaterThan(0)
  })

  it('responds to gage factor change', () => {
    const span         = calculateRoundSBeamSpan(BASE)
    const spanAdjusted = calculateRoundSBeamSpan({ ...BASE, gageFactor: 2.0 })
    expect(spanAdjusted).not.toEqual(span)
  })

  it('scales linearly with load', () => {
    const r1 = calculateRoundSBeamSpan(BASE)
    const r2 = calculateRoundSBeamSpan({ ...BASE, load: 2000 })
    expect(r2).toBeCloseTo(r1 * 2, 8)
  })

  it('scales linearly with gage factor', () => {
    const r1 = calculateRoundSBeamSpan({ ...BASE, gageFactor: 2.0 })
    const r2 = calculateRoundSBeamSpan({ ...BASE, gageFactor: 4.0 })
    expect(r2).toBeCloseTo(r1 * 2, 8)
  })

  it('higher Poisson ratio → higher span', () => {
    const rLow  = calculateRoundSBeamSpan({ ...BASE, poisson: 0.1 })
    const rHigh = calculateRoundSBeamSpan({ ...BASE, poisson: 0.4 })
    expect(rHigh).toBeGreaterThan(rLow)
  })

  it('throws when modulus is zero', () => {
    expect(() => calculateRoundSBeamSpan({ ...BASE, modulus: 0 })).toThrow()
  })

  it('throws when thickness is zero', () => {
    expect(() => calculateRoundSBeamSpan({ ...BASE, thickness: 0 })).toThrow()
  })
})

// ---------------------------------------------------------------------------
// calculateSquareShearSpan
// ---------------------------------------------------------------------------
describe('calculateSquareShearSpan', () => {
  it('returns a positive, finite value for well-formed inputs', () => {
    const span = calculateSquareShearSpan(BASE)
    expect(Number.isFinite(span)).toBe(true)
    expect(span).toBeGreaterThan(0)
  })

  it('scales linearly with load', () => {
    const r1 = calculateSquareShearSpan(BASE)
    const r2 = calculateSquareShearSpan({ ...BASE, load: 3000 })
    expect(r2).toBeCloseTo(r1 * 3, 8)
  })

  it('scales linearly with gage factor', () => {
    const r1 = calculateSquareShearSpan({ ...BASE, gageFactor: 1.0 })
    const r2 = calculateSquareShearSpan({ ...BASE, gageFactor: 2.0 })
    expect(r2).toBeCloseTo(r1 * 2, 8)
  })

  it('differs from calculateRoundSBeamSpan (different flange factor formula)', () => {
    // Square: factor1 = flange × width × (d - flange/2)
    // RoundSBeam: factor1 = flange × width × (d - flange)
    // For flange > 0 these produce different spans (~9% difference for BASE geometry).
    const sq  = calculateSquareShearSpan(BASE)
    const rsb = calculateRoundSBeamSpan(BASE)
    expect(Math.abs(sq - rsb) / Math.max(sq, rsb)).toBeGreaterThan(0.05)
  })

  it('throws when modulus is zero', () => {
    expect(() => calculateSquareShearSpan({ ...BASE, modulus: 0 })).toThrow()
  })
})

// ---------------------------------------------------------------------------
// calculateRoundShearSpan
// ---------------------------------------------------------------------------
describe('calculateRoundShearSpan', () => {
  it('returns a positive, finite value for well-formed inputs', () => {
    const span = calculateRoundShearSpan(BASE)
    expect(Number.isFinite(span)).toBe(true)
    expect(span).toBeGreaterThan(0)
  })

  it('scales linearly with load', () => {
    const r1 = calculateRoundShearSpan(BASE)
    const r2 = calculateRoundShearSpan({ ...BASE, load: 500 })
    expect(r2).toBeCloseTo(r1 * 0.5, 8)
  })

  it('scales linearly with gage factor', () => {
    const r1 = calculateRoundShearSpan({ ...BASE, gageFactor: 2.0 })
    const r2 = calculateRoundShearSpan({ ...BASE, gageFactor: 2.1 })
    expect(r2 / r1).toBeCloseTo(2.1 / 2.0, 6)
  })

  it('throws when modulus is zero', () => {
    expect(() => calculateRoundShearSpan({ ...BASE, modulus: 0 })).toThrow()
  })
})
