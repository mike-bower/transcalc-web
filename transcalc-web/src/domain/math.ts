/**
 * Math utility functions for engineering calculations
 * Includes polynomial solvers and common mathematical operations
 */

/**
 * Calculate the cube of a number
 * @param v Input value
 * @returns v³
 */
export function cube(v: number): number {
  return v * v * v
}

/**
 * Solve cubic equation: Ax³ + Bx² + Cx + D = 0
 * Uses Cardano's formula for depressed cubic after normalization
 * 
 * @param A Coefficient of x³ (leading coefficient)
 * @param B Coefficient of x²
 * @param C Coefficient of x
 * @param D Constant term
 * @returns Object with real roots array (1 or 3 roots) and success flag
 * @example
 * // Solve x³ - 1 = 0 (roots: 1, complex conjugates)
 * const result = solveCubic(1, 0, 0, -1)
 * // result.roots will contain the real root(s)
 */
export function solveCubic(A: number, B: number, C: number, D: number): { roots: number[]; ok: boolean } {
  if (Math.abs(A) < Number.EPSILON) {
    // degenerate to quadratic: B x^2 + C x + D = 0
    const a = B
    const b = C
    const c = D
    if (Math.abs(a) < Number.EPSILON) {
      // linear: bx + c = 0
      if (Math.abs(b) < Number.EPSILON) return { roots: [], ok: false }
      return { roots: [ -c / b ], ok: true }
    }
    const disc = b * b - 4 * a * c
    if (disc < 0) return { roots: [], ok: false }
    if (disc === 0) return { roots: [ -b / (2 * a) ], ok: true }
    const sqrtD = Math.sqrt(disc)
    return { roots: [ (-b + sqrtD) / (2 * a), (-b - sqrtD) / (2 * a) ], ok: true }
  }

  // normalize
  const a = B / A
  const b = C / A
  const c = D / A

  // depressed cubic t^3 + p t + q = 0 where x = t - a/3
  const a_over_3 = a / 3
  const p = b - a * a_over_3
  const q = 2 * a_over_3 * a_over_3 * a_over_3 - a_over_3 * b + c

  const discriminant = (q * q) / 4 + (p * p * p) / 27

  if (Math.abs(discriminant) <= 1e-14) {
    // multiple roots; treat as zero
    if (Math.abs(q) <= 1e-14) {
      // triple root
      const root = -a_over_3
      return { roots: [root, root, root], ok: true }
    }
    // one single and one double root
    const u = Math.cbrt(-q / 2)
    const t1 = 2 * u
    const t2 = -u
    return { roots: [t1 - a_over_3, t2 - a_over_3, t2 - a_over_3], ok: true }
  }

  if (discriminant > 0) {
    // one real root
    const sqrtDisc = Math.sqrt(discriminant)
    const u = Math.cbrt(-q / 2 + sqrtDisc)
    const v = Math.cbrt(-q / 2 - sqrtDisc)
    const t = u + v
    return { roots: [t - a_over_3], ok: true }
  }

  // three real roots (discriminant < 0)
  const rho = Math.sqrt(-(p * p * p) / 27)
  const phi = Math.acos((-q / 2) / rho)
  const m = 2 * Math.cbrt(rho)
  const t1 = m * Math.cos(phi / 3)
  const t2 = m * Math.cos((phi + 2 * Math.PI) / 3)
  const t3 = m * Math.cos((phi + 4 * Math.PI) / 3)
  return { roots: [t1 - a_over_3, t2 - a_over_3, t3 - a_over_3], ok: true }
}
