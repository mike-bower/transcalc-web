/**
 * Cubic equation solver — shared between the JS path and the WASM fallback.
 * Solves: a·x³ + b·x² + c·x + d = 0
 * Returns all real roots found (0–3 values).
 */
export function solveCubicJs(a: number, b: number, c: number, d: number): number[] {
  if (a === 0) {
    return []
  }

  // Shift variable: x = t - p eliminates the x² term
  const p = b / (3 * a)
  const q = c / a
  const r = d / a

  // Depressed cubic coefficients (for internal intermediate values)
  const A = q - (b * b) / (3 * a * a)
  const B = r + (2 * b * b * b) / (27 * a * a * a) - (b * q) / (3 * a * a)

  const cbrt = (x: number) => (x >= 0 ? Math.pow(x, 1 / 3) : -Math.pow(-x, 1 / 3))

  const roots: number[] = []

  try {
    // Cardano's method via Q/R formulation
    const Q = (3 * A) / 9
    const R = (9 * A * B - 27 * B - 2 * B * B * B) / 54

    const D = Q * Q * Q + R * R

    let S: number, T: number

    if (D >= 0) {
      const sqrtD = Math.sqrt(D)
      S = cbrt(R + sqrtD)
      T = cbrt(R - sqrtD)
    } else {
      // Three real roots
      const theta = Math.acos(R / Math.sqrt(-Q * Q * Q))
      S = 2 * Math.sqrt(-Q) * Math.cos(theta / 3)
      T = 2 * Math.sqrt(-Q) * Math.cos((theta + 2 * Math.PI) / 3)

      const third = 2 * Math.sqrt(-Q) * Math.cos((theta + 4 * Math.PI) / 3) - p
      roots.push(third)
    }

    if (Math.abs(S + T) > 1e-10) {
      roots.push(S + T - p)
    } else if (S !== 0) {
      roots.push(S - p)
    }

    if (Math.abs(T) > 1e-10) {
      const omega1 = -0.5 + Math.sqrt(3) / 2
      roots.push(omega1 * (S + T) - p)
    }
  } catch {
    // Numerical failure — return whatever was collected
  }

  return roots.filter((root) => Number.isFinite(root) && !isNaN(root))
}
