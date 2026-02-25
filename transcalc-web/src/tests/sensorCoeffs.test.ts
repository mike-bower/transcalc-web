import { describe, it, expect } from 'vitest'
import { Coefficient } from '../domain/sensorCoeffs'

// ---------------------------------------------------------------------------
// Coefficient — polynomial evaluator: c0 + c1·t + c2·t² + … + c6·t⁶
// ---------------------------------------------------------------------------
describe('Coefficient', () => {
  it('evaluates a 3-term polynomial correctly', () => {
    const coeff = new Coefficient(1, 2, 3)   // 1 + 2t + 3t²
    expect(coeff.getValue(0)).toBe(1)
    expect(coeff.getValue(1)).toBe(6)         // 1+2+3
    expect(coeff.getValue(2)).toBe(1 + 4 + 12) // 17
  })

  it('constant polynomial (c0 only): getValue always returns c0', () => {
    const coeff = new Coefficient(7)
    expect(coeff.getValue(0)).toBe(7)
    expect(coeff.getValue(5)).toBe(7)
    expect(coeff.getValue(-3)).toBe(7)
  })

  it('t=0 always returns c0 regardless of higher coefficients', () => {
    const coeff = new Coefficient(42, 100, 200, 300)
    expect(coeff.getValue(0)).toBe(42)
  })

  it('zero polynomial returns 0 for any t', () => {
    const coeff = new Coefficient(0, 0, 0, 0, 0, 0, 0)
    expect(coeff.getValue(0)).toBe(0)
    expect(coeff.getValue(100)).toBe(0)
  })

  it('evaluates a full 7-term polynomial at t=1 (sum of coefficients = 28)', () => {
    const coeff = new Coefficient(1, 2, 3, 4, 5, 6, 7)
    expect(coeff.getValue(1)).toBe(28)
  })

  it('evaluates a full 7-term polynomial at t=2', () => {
    // 1 + 2·2 + 3·4 + 4·8 + 5·16 + 6·32 + 7·64
    // = 1 + 4 + 12 + 32 + 80 + 192 + 448 = 769
    const coeff = new Coefficient(1, 2, 3, 4, 5, 6, 7)
    expect(coeff.getValue(2)).toBe(769)
  })

  it('linear coefficient: getValue is linear in t', () => {
    const coeff = new Coefficient(0, 3)   // p(t) = 3t
    expect(coeff.getValue(5)).toBeCloseTo(15, 10)
    expect(coeff.getValue(-2)).toBeCloseTo(-6, 10)
  })

  it('evaluates correctly for negative t', () => {
    const coeff = new Coefficient(1, 2)   // p(t) = 1 + 2t → p(-1) = -1
    expect(coeff.getValue(-1)).toBe(-1)
  })

  it('even-degree term is positive for negative t (t² ≥ 0)', () => {
    const coeff = new Coefficient(0, 0, 1)   // p(t) = t² → p(-3) = 9
    expect(coeff.getValue(-3)).toBeCloseTo(9, 10)
  })

  it('8th argument is silently ignored (only 7 coefficients stored)', () => {
    const coeff7 = new Coefficient(1, 0, 0, 0, 0, 0, 0)
    // The constructor slices at 7, so an 8th arg has no effect.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const coeff8 = new Coefficient(1, 0, 0, 0, 0, 0, 0, 999 as any)
    expect(coeff8.getValue(2)).toBeCloseTo(coeff7.getValue(2), 10)
  })
})
