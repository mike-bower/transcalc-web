/**
 * FEA solver for dual bending beams.
 *
 * Models a simply-supported beam with a central load — the same mesh and
 * boundary conditions as the reverse-beam solver.  The "dual" refers to
 * the four-gage placement at symmetric positions A/B/C/D, not to the beam
 * topology itself.
 *
 *   - Pinned support at x=0  (ux=0, uy=0)
 *   - Roller support at x=L  (uy=0 only)
 *   - Concentrated downward load at x=L/2, distributed across mid-face nodes
 *
 * Gage layout (all on the tension/compression surface y=±T/2):
 *   A: x = L/2 - distanceBetweenGages/2,  y = +T/2  (tension surface)
 *   B: x = L/2 - distanceBetweenGages/2,  y = -T/2  (compression surface)
 *   C: x = L/2 + distanceBetweenGages/2,  y = +T/2
 *   D: x = L/2 + distanceBetweenGages/2,  y = -T/2
 */

import { solveRectangularCst2D, type RectMeshOptions, type RectBcSpec } from './rectangularCstSolver'
import type { CantileverFeaSolution } from './cantileverSolver'

export type DualBeamFeaInput = {
  appliedForceN: number
  beamWidthMm: number
  thicknessMm: number
  /** Distance between support points (= model span length) [mm] */
  spanMm: number
  /** Separation between the two gage pairs along the beam [mm] */
  distanceBetweenGagesMm: number
  modulusGPa: number
}

/** BC: same as reverse beam — pinned at x=0, roller at x=L, centre load */
const dualBeamBc: RectBcSpec = {
  fixedDofs(_nodeIndex, nodes, _nx, _ny, L) {
    const fixed: number[] = []
    nodes.forEach((n, idx) => {
      if (Math.abs(n.xM) < 1e-12) {
        fixed.push(idx * 2, idx * 2 + 1)   // pinned at x=0
      } else if (Math.abs(n.xM - L) < 1e-12) {
        fixed.push(idx * 2 + 1)             // roller at x=L (uy only)
      }
    })
    return fixed
  },

  applyForces(F, _nodeIndex, nodes, _nx, _ny, L, _T, force) {
    const midNodes = nodes
      .map((n, idx) => ({ n, idx }))
      .filter(({ n }) => Math.abs(n.xM - L / 2) < 1e-9)
      .map(({ idx }) => idx)
    if (midNodes.length === 0) return
    const nodalFy = -force / midNodes.length
    midNodes.forEach(idx => { F[idx * 2 + 1] += nodalFy })
  },
}

export function solveDualBeamFea(
  input: DualBeamFeaInput,
  meshOpts: RectMeshOptions = {},
): CantileverFeaSolution {
  return solveRectangularCst2D(
    input.spanMm,
    input.thicknessMm,
    input.beamWidthMm,
    input.modulusGPa,
    input.appliedForceN,
    dualBeamBc,
    0.3,
    meshOpts,
  )
}

export type DualBeamGageStrains = {
  /** Tension surface, left gage pair */
  strainA: number
  /** Compression surface, left gage pair */
  strainB: number
  /** Tension surface, right gage pair */
  strainC: number
  /** Compression surface, right gage pair */
  strainD: number
}

/**
 * Sample exx at the four gage positions (A/B/C/D) from the FEA solution.
 * Positive y = tension surface under centre load; negative y = compression.
 */
export function sampleDualBeamGageStrains(
  solution: CantileverFeaSolution,
  spanMm: number,
  distanceBetweenGagesMm: number,
  thicknessMm: number,
): DualBeamGageStrains {
  const xLeft  = spanMm / 2 - distanceBetweenGagesMm / 2
  const xRight = spanMm / 2 + distanceBetweenGagesMm / 2
  const yTop   =  thicknessMm / 2    // tension under centre load
  const yBot   = -thicknessMm / 2    // compression

  return {
    strainA: solution.sampleStrainTensorMicrostrain(xLeft,  yTop).exx,
    strainB: solution.sampleStrainTensorMicrostrain(xLeft,  yBot).exx,
    strainC: solution.sampleStrainTensorMicrostrain(xRight, yTop).exx,
    strainD: solution.sampleStrainTensorMicrostrain(xRight, yBot).exx,
  }
}
