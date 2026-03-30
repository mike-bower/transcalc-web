/**
 * FEA solver for reverse-bending beams.
 *
 * Models a simply-supported beam with:
 *   - Pinned support at x=0 (ux=0, uy=0)
 *   - Roller support at x=L (uy=0 only — prevents over-constraint)
 *   - Concentrated downward load at x=L/2, distributed across mid-face nodes
 *
 * The gages are located near the support points (x≈0 and x≈L) on the
 * tension/compression surfaces (y=±T/2), where bending moment is maximum.
 */

import { solveRectangularCst2D, type RectMeshOptions, type RectBcSpec } from './rectangularCstSolver'
import type { CantileverFeaSolution } from './cantileverSolver'

export type ReverseBeamFeaInput = {
  appliedForceN: number
  beamWidthMm: number
  thicknessMm: number
  spanMm: number          // distance between supports (= model length)
  modulusGPa: number
}

/** BC: pinned at x=0, roller at x=L, centre load at x=L/2 */
const reverseBeamBc: RectBcSpec = {
  fixedDofs(nodeIndex, nodes, _nx, ny, L, _T) {
    const fixed: number[] = []
    nodes.forEach((n, idx) => {
      if (Math.abs(n.xM) < 1e-12) {
        // Left support — pinned: fix both ux and uy
        fixed.push(idx * 2, idx * 2 + 1)
      } else if (Math.abs(n.xM - L) < 1e-12) {
        // Right support — roller: fix uy only
        fixed.push(idx * 2 + 1)
      }
    })
    return fixed
  },

  applyForces(F, nodeIndex, nodes, _nx, ny, L, _T, force) {
    const midNodes = nodes
      .map((n, idx) => ({ n, idx }))
      .filter(({ n }) => Math.abs(n.xM - L / 2) < 1e-9)
      .map(({ idx }) => idx)
    if (midNodes.length === 0) return
    const nodalFy = -force / midNodes.length
    midNodes.forEach(idx => { F[idx * 2 + 1] += nodalFy })
  },
}

/**
 * Run the reverse-beam FEA and return the full solution.
 * The returned solution's sampleStrainTensorMicrostrain can be queried
 * at any (xMm, yMm) to get the local strain tensor.
 */
export function solveReverseBeamFea(
  input: ReverseBeamFeaInput,
  meshOpts: RectMeshOptions = {},
): CantileverFeaSolution {
  return solveRectangularCst2D(
    input.spanMm,
    input.thicknessMm,
    input.beamWidthMm,
    input.modulusGPa,
    input.appliedForceN,
    reverseBeamBc,
    0.3,
    meshOpts,
  )
}

/**
 * Sample exx at the top surface near the left support —
 * the primary gage location for a reverse-bending beam.
 */
export function sampleReverseBeamGageStrain(
  solution: CantileverFeaSolution,
  gageCentreXFromLeftSupportMm: number,
  thicknessMm: number,
): number {
  return solution.sampleStrainTensorMicrostrain(
    gageCentreXFromLeftSupportMm,
    thicknessMm / 2,
  ).exx
}
