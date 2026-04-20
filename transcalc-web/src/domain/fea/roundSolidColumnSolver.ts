/**
 * FEA solver for round solid (cylindrical) columns under axial compression.
 *
 * The circular cross-section cannot be represented directly by the 2D rectangular
 * CST solver, so an equivalent rectangular cross-section is used with the same
 * area as the circle:
 *
 *   A_circle = π × (D/2)²
 *   A_rect   = D  × (π × D / 4)
 *
 * → thicknessMm = diameterMm  (y-extent of 2D model)
 * → out-of-plane widthMm = π × D / 4
 *
 * This ensures the FEA axial strain matches the closed-form result:
 *   ε_xx = −P / (A × E)
 *
 * Boundary conditions (same as squareColumnSolver):
 *   - Bottom face (x = 0): fully clamped
 *   - Top face   (x = L): uniform compressive load in −x direction
 */

import { solveRectangularCst2D, type RectMeshOptions, type RectBcSpec } from './rectangularCstSolver'
import type { CantileverFeaSolution } from './cantileverSolver'

export type RoundSolidColumnFeaInput = {
  appliedForceN: number
  /** Outer diameter of the column [mm] */
  diameterMm: number
  /** Column height [mm]. Defaults to 3 × diameter. */
  columnHeightMm?: number
  modulusGPa: number
  poissonRatio?: number
}

/** Clamped base + uniform axial compression at top (identical to squareColumnSolver) */
const roundColumnBc: RectBcSpec = {
  fixedDofs(_nodeIndex, nodes) {
    const fixed: number[] = []
    nodes.forEach((n, idx) => {
      if (Math.abs(n.xM) < 1e-12) {
        fixed.push(idx * 2, idx * 2 + 1)
      }
    })
    return fixed
  },

  applyForces(F, _nodeIndex, nodes, _nx, _ny, L, _T, force) {
    const topNodes = nodes
      .map((n, idx) => ({ n, idx }))
      .filter(({ n }) => Math.abs(n.xM - L) < 1e-9)
      .map(({ idx }) => idx)
    if (topNodes.length === 0) return
    const nodalFx = -force / topNodes.length
    topNodes.forEach(idx => { F[idx * 2] += nodalFx })
  },
}

/**
 * Run the round-solid-column FEA and return the full solution.
 *
 * The 2D model uses an equivalent rectangular section whose area equals the
 * circular cross-section area, so the axial strain matches closed-form exactly.
 */
export function solveRoundSolidColumnFea(
  input: RoundSolidColumnFeaInput,
  meshOpts: RectMeshOptions = {},
): CantileverFeaSolution {
  const heightMm = input.columnHeightMm ?? 3 * input.diameterMm
  // Equivalent rectangular section: same area as π·(D/2)²
  const thicknessMm = input.diameterMm
  const equivWidthMm = (Math.PI * input.diameterMm) / 4
  return solveRectangularCst2D(
    heightMm,
    thicknessMm,
    equivWidthMm,
    input.modulusGPa,
    input.appliedForceN,
    roundColumnBc,
    input.poissonRatio ?? 0.3,
    meshOpts,
  )
}

/**
 * Sample exx at mid-height — the primary gage location for an axial column.
 */
export function sampleRoundSolidColumnAxialStrain(
  solution: CantileverFeaSolution,
  columnHeightMm: number,
): number {
  return solution.sampleStrainTensorMicrostrain(columnHeightMm / 2, 0).exx
}
