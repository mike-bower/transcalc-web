/**
 * FEA solver for square/rectangular columns under axial compression.
 *
 * Models a column as a 2D plane-stress problem:
 *   - x-axis = axial direction (load/height direction)
 *   - y-axis = cross-section width direction
 *   - out-of-plane (z) = cross-section depth direction
 *
 * Boundary conditions:
 *   - Bottom face (x=0): fully fixed (ux=0, uy=0) — clamped base
 *   - Top face (x=L):    uniform compressive load in -x direction
 *
 * This gives uniform axial strain exx = -P / (width × depth × E),
 * which matches the closed-form result and allows visualising the
 * transverse (eyy) and shear (exy) fields simultaneously.
 */

import { solveRectangularCst2D, type RectMeshOptions, type RectBcSpec } from './rectangularCstSolver'
import type { CantileverFeaSolution } from './cantileverSolver'

export type SquareColumnFeaInput = {
  appliedForceN: number
  /** Cross-section width — y-direction in model [mm] */
  widthMm: number
  /** Cross-section depth — out-of-plane in model [mm] */
  depthMm: number
  /** Column height (model length along x). Defaults to 3 × max(width, depth). */
  columnHeightMm?: number
  modulusGPa: number
  poissonRatio?: number
}

/** BC: clamped base, uniform axial compression at top */
const squareColumnBc: RectBcSpec = {
  fixedDofs(_nodeIndex, nodes) {
    const fixed: number[] = []
    nodes.forEach((n, idx) => {
      if (Math.abs(n.xM) < 1e-12) {
        // Bottom face — fully clamped
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
    const nodalFx = -force / topNodes.length   // compressive → negative x
    topNodes.forEach(idx => { F[idx * 2] += nodalFx })
  },
}

/**
 * Run the square-column FEA and return the full solution.
 * The model length defaults to 3 × max(width, depth) for a realistic
 * column aspect ratio; only widthMm and depthMm affect the cross-section.
 */
export function solveSquareColumnFea(
  input: SquareColumnFeaInput,
  meshOpts: RectMeshOptions = {},
): CantileverFeaSolution {
  const heightMm = input.columnHeightMm ?? 3 * Math.max(input.widthMm, input.depthMm)
  return solveRectangularCst2D(
    heightMm,
    input.widthMm,
    input.depthMm,
    input.modulusGPa,
    input.appliedForceN,
    squareColumnBc,
    input.poissonRatio ?? 0.3,
    meshOpts,
  )
}

/**
 * Sample exx at the mid-height of the column — the primary gage location.
 */
export function sampleSquareColumnAxialStrain(
  solution: CantileverFeaSolution,
  columnHeightMm: number,
): number {
  return solution.sampleStrainTensorMicrostrain(columnHeightMm / 2, 0).exx
}
