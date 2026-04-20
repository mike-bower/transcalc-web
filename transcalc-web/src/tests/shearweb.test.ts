import { describe, it, expect } from 'vitest'
import { calculateRoundShearSpan } from '../domain/shearweb'

// Base geometry used across all tests
const BASE = {
  load: 100,            // N
  modulus: 200,         // GPa (auto-detected)
  gf: 2.05,
  nu: 0.3,
  height: 50,           // mm
  width: 25,            // mm
  thickness: 3,         // mm
  holeDia: 15,          // mm
}

function span(overrides: Partial<typeof BASE> = {}): number {
  const p = { ...BASE, ...overrides }
  return calculateRoundShearSpan(p.load, p.modulus, p.gf, p.nu, p.height, p.width, p.thickness, p.holeDia)
}

// ---------------------------------------------------------------------------
// Basic validity
// ---------------------------------------------------------------------------
describe('calculateRoundShearSpan — basic validity', () => {
  it('returns a positive, finite value for well-formed inputs', () => {
    const result = span()
    expect(Number.isFinite(result)).toBe(true)
    expect(result).toBeGreaterThan(0)
  })

  it('result is bounded to a reasonable microstrain-scale range', () => {
    expect(span()).toBeLessThan(1e6)
  })
})

// ---------------------------------------------------------------------------
// Linearity / scaling
// ---------------------------------------------------------------------------
describe('calculateRoundShearSpan — linearity', () => {
  it('scales linearly with load', () => {
    const r1 = span({ load: 100 })
    const r2 = span({ load: 200 })
    expect(r2).toBeCloseTo(r1 * 2, 6)
  })

  it('scales linearly with gage factor', () => {
    const r1 = span({ gf: 2.0 })
    const r2 = span({ gf: 4.0 })
    expect(r2).toBeCloseTo(r1 * 2, 6)
  })

  it('scales inversely with modulus', () => {
    const r1 = span({ modulus: 200 })   // 200 GPa
    const r2 = span({ modulus: 100 })   // 100 GPa
    expect(r2).toBeCloseTo(r1 * 2, 6)
  })

  it('scales linearly with (1 + Poisson ratio) when all else fixed', () => {
    // term1 = GF × F × (1+ν) / (A₀ × E); term2 depends only on geometry ratios
    const nu1 = 0.3, nu2 = 0.5
    const r1 = span({ nu: nu1 })
    const r2 = span({ nu: nu2 })
    expect(r2 / r1).toBeCloseTo((1 + nu2) / (1 + nu1), 6)
  })
})

// ---------------------------------------------------------------------------
// Geometry variation
// ---------------------------------------------------------------------------
describe('calculateRoundShearSpan — geometry variation', () => {
  it('different hole diameters produce different spans', () => {
    const small = span({ holeDia: 10 })
    const large = span({ holeDia: 20 })
    expect(small).not.toBeCloseTo(large, 3)
  })

  it('auto-detects GPa modulus (value < 1e6 treated as GPa)', () => {
    // 200 GPa passed as 200 (auto-detected) vs 200e9 (explicit Pa)
    const rGpa = span({ modulus: 200 })
    const rPa  = span({ modulus: 200e9 })
    expect(rGpa).toBeCloseTo(rPa, 6)
  })
})

// ---------------------------------------------------------------------------
// Error cases
// ---------------------------------------------------------------------------
describe('calculateRoundShearSpan — error cases', () => {
  it('throws when hole diameter ≥ web height', () => {
    expect(() => span({ holeDia: 50, height: 50 })).toThrow()
    expect(() => span({ holeDia: 60, height: 50 })).toThrow()
  })

  it('throws when hole diameter equals web height', () => {
    // Boundary: D = H → dM >= hM guard triggers
    expect(() => span({ holeDia: 50, height: 50 })).toThrow()
  })
})
