/**
 * FEA solver for shear-web load cells under transverse loading.
 *
 * All three shear variants (Square, Round, Round S-Beam) share the same
 * I-section geometry:
 *   – Two full-width flanges at top/bottom
 *   – A thin web (thickness = t) carrying the shear force
 *   – A rectangular/circular opening of diameter D in the web
 *
 * Cross-section inertia (analytical):
 *   I = W·H³/12 − (W−t)·D³/12
 * Shear stress at neutral axis:
 *   τ = V·Q / (I·t)  where Q = first moment of area above NA
 *
 * ── FEA model ──────────────────────────────────────────────────────────────
 * The full geometry cannot be represented by a rectangular mesh.  We instead
 * model the **web panel only** as a 2D plane-stress shear panel:
 *
 *   lengthMm    (x-axis)  = heightMm   — beam span / section height
 *   thicknessMm (y-axis)  = diameterMm — web opening height (gage zone)
 *   widthMm (out-of-plane)= thicknessMm — web wall thickness (scales force)
 *
 * BCs:
 *   x = 0  : fully clamped (fixed support end)
 *   x = L  : uniform transverse force Fy = −appliedForce  (shear load)
 *
 * The shear strain field (exy) from this model qualitatively represents the
 * shear distribution in the web.  The magnitude is approximate because the
 * flanges (and the cutout geometry) are not included; expect ±20 % vs the
 * closed-form result.
 *
 * Gage location: sample exy at x = L/2, y = 0 (web neutral axis, mid-span).
 */

import { solveRectangularCst2D, type RectMeshOptions, type RectBcSpec } from './rectangularCstSolver'
import type { CantileverFeaSolution } from './cantileverSolver'

export type ShearWebFeaInput = {
  appliedForceN: number
  /** Overall section width (flange width) [mm] */
  widthMm: number
  /** Overall section height [mm] */
  heightMm: number
  /** Web opening diameter/height [mm] — must be < heightMm */
  diameterMm: number
  /** Web wall thickness [mm] — total width at neutral axis (both sides combined) */
  thicknessMm: number
  modulusGPa: number
  poissonRatio?: number
}

/** Clamped at x=0; transverse (Fy) shear load at x=L */
const shearWebBc: RectBcSpec = {
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
    // Transverse force in −y direction (downward shear)
    const nodalFy = -force / topNodes.length
    topNodes.forEach(idx => { F[idx * 2 + 1] += nodalFy })
  },
}

/**
 * Solve the shear-web FEA.  Returns the full solution; sample `exy` for the
 * shear strain (tensor notation: exy = γ_xy / 2) at the gage location.
 */
export function solveShearWebFea(
  input: ShearWebFeaInput,
  meshOpts: RectMeshOptions = {},
): CantileverFeaSolution {
  if (input.diameterMm >= input.heightMm) {
    throw new Error('Web opening diameter must be less than section height')
  }
  if (input.thicknessMm <= 0) {
    throw new Error('Web thickness must be positive')
  }
  return solveRectangularCst2D(
    input.heightMm,    // model length  (x) = section height
    input.diameterMm,  // model thickness (y) = web opening zone
    input.thicknessMm, // out-of-plane   = web wall thickness
    input.modulusGPa,
    input.appliedForceN,
    shearWebBc,
    input.poissonRatio ?? 0.3,
    meshOpts,
  )
}

/**
 * Sample the shear strain (exy in µε) at mid-span, neutral axis —
 * the primary gage location for shear web load cells.
 *
 * The maximum principal strain at a 45° gage equals |exy| in tensor notation.
 */
export function sampleShearWebStrain(
  solution: CantileverFeaSolution,
  heightMm: number,
): number {
  return solution.sampleStrainTensorMicrostrain(heightMm / 2, 0).exy
}
