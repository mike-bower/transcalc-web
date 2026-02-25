import { describe, it, expect } from 'vitest'
import { cube, solveCubic } from '../domain/math'

// ---------------------------------------------------------------------------
// cube
// ---------------------------------------------------------------------------
describe('cube', () => {
  it('cube(3) = 27', () => {
    expect(cube(3)).toBe(27)
  })

  it('cube(0) = 0', () => {
    expect(cube(0)).toBe(0)
  })

  it('cube(-2) = -8', () => {
    expect(cube(-2)).toBe(-8)
  })

  it('cube(1) = 1', () => {
    expect(cube(1)).toBe(1)
  })

  it('cube(0.5) = 0.125', () => {
    expect(cube(0.5)).toBeCloseTo(0.125, 10)
  })
})

// ---------------------------------------------------------------------------
// solveCubic — helper: verify a root by substitution
// ---------------------------------------------------------------------------
function evaluate(A: number, B: number, C: number, D: number, x: number): number {
  return A * x * x * x + B * x * x + C * x + D
}

// ---------------------------------------------------------------------------
// solveCubic — three real roots (discriminant < 0)
// ---------------------------------------------------------------------------
describe('solveCubic — three real roots', () => {
  it('(x-1)(x-2)(x-3) = x³-6x²+11x-6 → roots {1, 2, 3}', () => {
    const { roots, ok } = solveCubic(1, -6, 11, -6)
    expect(ok).toBe(true)
    const sorted = roots.slice().sort((a, b) => a - b)
    expect(sorted).toHaveLength(3)
    expect(sorted[0]).toBeCloseTo(1, 5)
    expect(sorted[1]).toBeCloseTo(2, 5)
    expect(sorted[2]).toBeCloseTo(3, 5)
  })

  it('roots satisfy polynomial when substituted back', () => {
    const [A, B, C, D] = [1, -6, 11, -6]
    const { roots } = solveCubic(A, B, C, D)
    for (const r of roots) {
      expect(evaluate(A, B, C, D, r)).toBeCloseTo(0, 6)
    }
  })

  it('(x+1)(x-2)(x-4) = x³-5x²+2x+8 → roots {-1, 2, 4}', () => {
    const { roots, ok } = solveCubic(1, -5, 2, 8)
    expect(ok).toBe(true)
    const sorted = roots.slice().sort((a, b) => a - b)
    expect(sorted[0]).toBeCloseTo(-1, 4)
    expect(sorted[1]).toBeCloseTo(2, 4)
    expect(sorted[2]).toBeCloseTo(4, 4)
  })
})

// ---------------------------------------------------------------------------
// solveCubic — one real root (discriminant > 0)
// ---------------------------------------------------------------------------
describe('solveCubic — one real root', () => {
  it('x³ - 2 = 0 → single root ∛2 ≈ 1.2599', () => {
    const { roots, ok } = solveCubic(1, 0, 0, -2)
    expect(ok).toBe(true)
    expect(roots).toHaveLength(1)
    expect(roots[0]).toBeCloseTo(Math.cbrt(2), 8)
  })

  it('root satisfies x³ - 2 = 0', () => {
    const { roots } = solveCubic(1, 0, 0, -2)
    expect(evaluate(1, 0, 0, -2, roots[0])).toBeCloseTo(0, 8)
  })

  it('x³ + x + 1 = 0 → root ≈ -0.6824', () => {
    // discriminant > 0 → one real root
    const { roots, ok } = solveCubic(1, 0, 1, 1)
    expect(ok).toBe(true)
    expect(roots).toHaveLength(1)
    expect(evaluate(1, 0, 1, 1, roots[0])).toBeCloseTo(0, 8)
  })
})

// ---------------------------------------------------------------------------
// solveCubic — triple root (discriminant ≈ 0)
// ---------------------------------------------------------------------------
describe('solveCubic — triple root', () => {
  it('(x-2)³ = x³-6x²+12x-8 → triple root at 2', () => {
    const { roots, ok } = solveCubic(1, -6, 12, -8)
    expect(ok).toBe(true)
    for (const r of roots) {
      expect(r).toBeCloseTo(2, 5)
    }
  })
})

// ---------------------------------------------------------------------------
// solveCubic — degenerate to quadratic (A = 0)
// ---------------------------------------------------------------------------
describe('solveCubic — A=0 (quadratic fallback)', () => {
  it('0·x³ + x² - 5x + 6 = 0 → roots {2, 3}', () => {
    const { roots, ok } = solveCubic(0, 1, -5, 6)
    expect(ok).toBe(true)
    const sorted = roots.slice().sort((a, b) => a - b)
    expect(sorted).toHaveLength(2)
    expect(sorted[0]).toBeCloseTo(2, 8)
    expect(sorted[1]).toBeCloseTo(3, 8)
  })

  it('quadratic with negative discriminant → ok=false', () => {
    // x² + 1 = 0 has no real roots
    const { ok } = solveCubic(0, 1, 0, 1)
    expect(ok).toBe(false)
  })

  it('repeated quadratic root: x² - 4x + 4 = 0 → root {2}', () => {
    const { roots, ok } = solveCubic(0, 1, -4, 4)
    expect(ok).toBe(true)
    expect(roots[0]).toBeCloseTo(2, 8)
  })
})

// ---------------------------------------------------------------------------
// solveCubic — degenerate to linear (A = 0, B = 0)
// ---------------------------------------------------------------------------
describe('solveCubic — A=0, B=0 (linear fallback)', () => {
  it('2x - 6 = 0 → root {3}', () => {
    const { roots, ok } = solveCubic(0, 0, 2, -6)
    expect(ok).toBe(true)
    expect(roots).toHaveLength(1)
    expect(roots[0]).toBeCloseTo(3, 8)
  })

  it('all-zero coefficients (0 = 0) → ok=false', () => {
    const { ok } = solveCubic(0, 0, 0, 0)
    expect(ok).toBe(false)
  })
})
