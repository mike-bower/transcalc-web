import { describe, it, expect } from 'vitest'
import { computeCantileverStress } from '../domain/core'

// stress = 6 × load × momentArm / (width × thickness²)

describe('computeCantileverStress', () => {
  it('computes expected stress for a simple case', () => {
    const stress = computeCantileverStress(100, 25, 2, 100)
    // moment = 100×100 = 10000 N·mm; Z = (25×4)/6 = 16.6667 mm³; stress = 600 N/mm² = 600 MPa
    expect(stress).toBeCloseTo(600, 3)
  })

  it('zero load → zero stress', () => {
    expect(computeCantileverStress(0, 25, 2, 100)).toBe(0)
  })

  it('zero moment arm → zero stress', () => {
    expect(computeCantileverStress(100, 25, 2, 0)).toBe(0)
  })

  it('scales linearly with applied load', () => {
    const r1 = computeCantileverStress(100, 20, 5, 50)
    const r2 = computeCantileverStress(200, 20, 5, 50)
    expect(r2).toBeCloseTo(r1 * 2, 9)
  })

  it('scales linearly with moment arm', () => {
    const r1 = computeCantileverStress(100, 20, 5, 50)
    const r2 = computeCantileverStress(100, 20, 5, 100)
    expect(r2).toBeCloseTo(r1 * 2, 9)
  })

  it('scales inversely with beam width', () => {
    const r1 = computeCantileverStress(100, 20, 5, 50)
    const r2 = computeCantileverStress(100, 40, 5, 50)
    expect(r2).toBeCloseTo(r1 / 2, 9)
  })

  it('scales inversely with thickness squared (doubling t → ¼ stress)', () => {
    const r1 = computeCantileverStress(100, 20, 5, 50)
    const r2 = computeCantileverStress(100, 20, 10, 50)
    expect(r2).toBeCloseTo(r1 / 4, 9)
  })

  it('matches explicit formula: stress = 6FL / (bh²)', () => {
    const [F, b, h, L] = [150, 30, 4, 80]
    const expected = (6 * F * L) / (b * h * h)
    expect(computeCantileverStress(F, b, h, L)).toBeCloseTo(expected, 9)
  })

  it('handles fractional dimensions', () => {
    const stress = computeCantileverStress(10, 5.5, 1.2, 20.0)
    const expected = (6 * 10 * 20.0) / (5.5 * 1.2 * 1.2)
    expect(stress).toBeCloseTo(expected, 6)
  })
})
