import { describe, it, expect } from 'vitest'
import { calculateRoundShearSpan } from '../domain/shearweb'

describe('Round Shear Web Calculations', () => {
  it('calculates effective shear span (ported from shearrnd.pas)', () => {
    // Example: rectangular web with circular hole
    const load = 100 // N
    const youngsModulus = 200 // GPa
    const gaugeFactor = 2.05
    const poissonRatio = 0.3
    const height = 50 // mm
    const width = 25 // mm
    const thickness = 3 // mm
    const holeDia = 15 // mm

    const result = calculateRoundShearSpan(
      load,
      youngsModulus,
      gaugeFactor,
      poissonRatio,
      height,
      width,
      thickness,
      holeDia
    )

    // Result should be positive and reasonably scaled
    expect(result).toBeGreaterThan(0)
    // Scaled by 1000 compared to Pa result, so expect reasonable microstrain-like value
    expect(result).toBeLessThan(1e6)
  })

  it('throws on invalid geometry (zero area)', () => {
    // Hole diameter larger than web height (invalid geometry)
    expect(() =>
      calculateRoundShearSpan(100, 200, 2.05, 0.3, 30, 25, 3, 50)
    ).toThrow()
  })

  it('calculates different spans for different hole sizes', () => {
    const load = 100
    const youngsModulus = 200
    const gaugeFactor = 2.05
    const poissonRatio = 0.3
    const height = 50
    const width = 25
    const thickness = 3

    const spanSmallHole = calculateRoundShearSpan(
      load,
      youngsModulus,
      gaugeFactor,
      poissonRatio,
      height,
      width,
      thickness,
      10 // small hole: 10mm
    )

    const spanLargeHole = calculateRoundShearSpan(
      load,
      youngsModulus,
      gaugeFactor,
      poissonRatio,
      height,
      width,
      thickness,
      20 // larger hole: 20mm
    )

    // Larger hole should produce different (likely smaller) span
    expect(spanSmallHole).not.toEqual(spanLargeHole)
    expect(Math.abs(spanSmallHole - spanLargeHole)).toBeGreaterThan(0.001)
  })
})
