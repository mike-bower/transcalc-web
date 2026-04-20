/**
 * FEA solver for round hollow (annular) columns under axial compression.
 *
 * The annular cross-section is represented as an equivalent rectangular section
 * with the same area as the ring:
 *
 *   A_ring = π × (Ro² − Ri²)
 *   A_rect = OD × [π × (Ro² − Ri²) / OD]
 *
 * → thicknessMm     = outerDiameterMm  (y-extent of 2D model)
 * → out-of-plane widthMm = π × (Ro² − Ri²) / OD
 *
 * This ensures ε_xx = −P / (A × E) matches the closed-form result.
 *
 * Boundary conditions (same as squareColumnSolver):
 *   - Bottom face (x = 0): fully clamped
 *   - Top face   (x = L): uniform compressive load in −x direction
 */

import { solveRectangularCst2D, type RectMeshOptions, type RectBcSpec } from './rectangularCstSolver'
import type { CantileverFeaSolution } from './cantileverSolver'

export type RoundHollowColumnFeaInput = {
  appliedForceN: number
  /** Outer diameter [mm] */
  outerDiameterMm: number
  /** Inner diameter [mm] — must be < outerDiameterMm */
  innerDiameterMm: number
  /** Column height [mm]. Defaults to 3 × outerDiameter. */
  columnHeightMm?: number
  modulusGPa: number
  poissonRatio?: number
}

/** Clamped base + uniform axial compression at top (identical to squareColumnSolver) */
const roundHollowColumnBc: RectBcSpec = {
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
 * Run the round-hollow-column FEA and return the full solution.
 *
 * The 2D model uses an equivalent rectangular section whose area equals the
 * annular cross-section area, so the axial strain matches closed-form exactly.
 */
export function solveRoundHollowColumnFea(
  input: RoundHollowColumnFeaInput,
  meshOpts: RectMeshOptions = {},
): CantileverFeaSolution {
  const heightMm = input.columnHeightMm ?? 3 * input.outerDiameterMm
  const Ro = input.outerDiameterMm / 2
  const Ri = input.innerDiameterMm / 2
  if (Ri >= Ro) throw new Error('Inner diameter must be less than outer diameter')
  // Equivalent rectangular section: same area as π·(Ro²−Ri²)
  const thicknessMm = input.outerDiameterMm
  const equivWidthMm = (Math.PI * (Ro * Ro - Ri * Ri)) / input.outerDiameterMm
  return solveRectangularCst2D(
    heightMm,
    thicknessMm,
    equivWidthMm,
    input.modulusGPa,
    input.appliedForceN,
    roundHollowColumnBc,
    input.poissonRatio ?? 0.3,
    meshOpts,
  )
}

/**
 * Sample exx at mid-height — the primary gage location for an axial column.
 */
export function sampleRoundHollowColumnAxialStrain(
  solution: CantileverFeaSolution,
  columnHeightMm: number,
): number {
  return solution.sampleStrainTensorMicrostrain(columnHeightMm / 2, 0).exx
}
