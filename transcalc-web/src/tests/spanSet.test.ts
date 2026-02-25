import { describe, expect, it } from 'vitest'
import { calculateSpanSetResistance } from '../domain/spanSet'

// Formula: ((measuredSpan × (bridgeResistance + totalRm)) / desiredSpan)
//           − (bridgeResistance + totalRm)

describe('calculateSpanSetResistance', () => {
  it('returns a finite value for valid inputs', () => {
    const result = calculateSpanSetResistance(2.5, 350, 10, 5)
    expect(Number.isFinite(result)).toBe(true)
  })

  it('throws on zero desired span', () => {
    expect(() => calculateSpanSetResistance(1, 350, 10, 0)).toThrow()
  })

  it('exact value: measuredSpan > desiredSpan → positive series resistance', () => {
    // (5 × 360) / 2.5 − 360 = 720 − 360 = 360 Ω
    expect(calculateSpanSetResistance(5, 350, 10, 2.5)).toBeCloseTo(360, 8)
  })

  it('exact value: measuredSpan < desiredSpan → negative result', () => {
    // (2.5 × 360) / 5 − 360 = 180 − 360 = -180
    expect(calculateSpanSetResistance(2.5, 350, 10, 5)).toBeCloseTo(-180, 8)
  })

  it('identity: measuredSpan === desiredSpan → zero resistance needed', () => {
    // (x × R) / x − R = 0
    expect(calculateSpanSetResistance(2.5, 350, 10, 2.5)).toBeCloseTo(0, 8)
    expect(calculateSpanSetResistance(5.0, 200, 50, 5.0)).toBeCloseTo(0, 8)
  })

  it('scales linearly with measuredSpan (desiredSpan held constant)', () => {
    const r1 = calculateSpanSetResistance(3.0, 350, 10, 2.0)
    const r2 = calculateSpanSetResistance(6.0, 350, 10, 2.0)
    // When measuredSpan doubles, totalR doubles → result scales accordingly:
    // result = totalR × (measured/desired − 1)
    // r1 = 360 × (3/2 − 1) = 360 × 0.5 = 180
    // r2 = 360 × (6/2 − 1) = 360 × 2.0 = 720 ≠ 2 × r1 (not pure linearity in measuredSpan)
    // Verify the formula directly:
    const totalR = 350 + 10
    expect(r1).toBeCloseTo(totalR * (3.0 / 2.0 - 1), 8)
    expect(r2).toBeCloseTo(totalR * (6.0 / 2.0 - 1), 8)
  })

  it('bridgeResistance and totalRm combine additively', () => {
    // (measuredSpan × (br + rm)) / desired − (br + rm)
    // Changing br and rm independently but keeping their sum equal should give the same result.
    const r1 = calculateSpanSetResistance(5, 300, 60, 2.5)
    const r2 = calculateSpanSetResistance(5, 200, 160, 2.5)
    expect(r1).toBeCloseTo(r2, 8)
  })
})
