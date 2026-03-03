/**
 * Generic 2D plane-stress CST (Constant Strain Triangle) solver
 * for rectangular meshes with parameterized boundary conditions.
 *
 * The mesh uses the same node/element layout as cantileverSolver.ts:
 *   x ∈ [0, L]      — along the primary axis (length)
 *   y ∈ [-T/2, T/2] — through the secondary axis (thickness)
 *
 * BCs and loading are injected via the `bc` parameter, making this
 * function usable for cantilever bending, simply-supported beams,
 * axial compression, and shear loading without code duplication.
 */

import type {
  CantileverFeaSolution,
  CantileverStrainTensorMicrostrain,
  StrainFieldRange,
} from './cantilever'

type Node2D = { xM: number; yM: number }
type Element2D = [number, number, number]

export type RectMeshOptions = {
  elementsAlongLength?: number
  elementsThroughThickness?: number
}

/**
 * Boundary-condition specification passed to `solveRectangularCst2D`.
 *
 * Both callbacks receive the fully-built node array, the mesh
 * dimensions (nx, ny), and the model dimensions in metres (L, T).
 */
export type RectBcSpec = {
  /** Return DOF indices to clamp to zero displacement. */
  fixedDofs: (
    nodeIndex: (i: number, j: number) => number,
    nodes: Node2D[],
    nx: number,
    ny: number,
    L: number,
    T: number,
  ) => number[]

  /** Populate the global force vector F in-place. */
  applyForces: (
    F: number[],
    nodeIndex: (i: number, j: number) => number,
    nodes: Node2D[],
    nx: number,
    ny: number,
    L: number,
    T: number,
    appliedForce: number,
  ) => void
}

// ── Gaussian elimination (same algorithm as cantileverSolver.ts) ────────────

function solveDenseLinearSystem(a: number[][], b: number[]): number[] {
  const n = b.length
  const m = a.map((row) => row.slice())
  const rhs = b.slice()

  for (let k = 0; k < n; k += 1) {
    let pivotRow = k
    let pivotAbs = Math.abs(m[k][k])
    for (let r = k + 1; r < n; r += 1) {
      const v = Math.abs(m[r][k])
      if (v > pivotAbs) { pivotAbs = v; pivotRow = r }
    }
    if (pivotAbs < 1e-14) throw new Error('Singular stiffness matrix')
    if (pivotRow !== k) {
      ;[m[k], m[pivotRow]] = [m[pivotRow], m[k]]
      ;[rhs[k], rhs[pivotRow]] = [rhs[pivotRow], rhs[k]]
    }
    for (let i = k + 1; i < n; i += 1) {
      const factor = m[i][k] / m[k][k]
      if (factor === 0) continue
      for (let j = k; j < n; j += 1) m[i][j] -= factor * m[k][j]
      rhs[i] -= factor * rhs[k]
    }
  }

  const x = new Array(n).fill(0)
  for (let i = n - 1; i >= 0; i -= 1) {
    let sum = rhs[i]
    for (let j = i + 1; j < n; j += 1) sum -= m[i][j] * x[j]
    x[i] = sum / m[i][i]
  }
  return x
}

// ── Main solver ──────────────────────────────────────────────────────────────

const toPa = (g: number) => (g < 1e6 ? g * 1e9 : g)
const clampMesh = (v: number | undefined, fb: number) =>
  !Number.isFinite(v) ? fb : Math.max(1, Math.floor(v as number))
const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v))

/**
 * Solve the 2D plane-stress CST problem on a structured rectangular mesh.
 *
 * @param lengthMm   Model length along x [mm]
 * @param thicknessMm Model thickness along y [mm]
 * @param widthMm    Out-of-plane beam width [mm]
 * @param modulusGPa Young's modulus [GPa]  (auto-detected if already in Pa)
 * @param appliedForceN Applied force magnitude [N]
 * @param bc         Boundary-condition and loading specification
 * @param nu         Poisson's ratio (default 0.3)
 * @param meshOpts   Optional mesh refinement
 */
export function solveRectangularCst2D(
  lengthMm: number,
  thicknessMm: number,
  widthMm: number,
  modulusGPa: number,
  appliedForceN: number,
  bc: RectBcSpec,
  nu = 0.3,
  meshOpts: RectMeshOptions = {},
): CantileverFeaSolution {
  const nx = clampMesh(meshOpts.elementsAlongLength, 40)
  const ny = clampMesh(meshOpts.elementsThroughThickness, 8)
  const L = lengthMm / 1000
  const T = thicknessMm / 1000
  const w = widthMm / 1000
  const E = toPa(modulusGPa)

  if (!Number.isFinite(L) || L <= 0) throw new Error('Invalid length for FEA solve')
  if (!Number.isFinite(T) || T <= 0) throw new Error('Invalid thickness for FEA solve')
  if (!Number.isFinite(w) || w <= 0) throw new Error('Invalid width for FEA solve')
  if (!Number.isFinite(E) || E <= 0) throw new Error('Invalid modulus for FEA solve')

  // Nodes: (nx+1) × (ny+1), row-major over i (x) then j (y)
  const nodes: Node2D[] = []
  for (let i = 0; i <= nx; i += 1) {
    for (let j = 0; j <= ny; j += 1) {
      nodes.push({ xM: (L * i) / nx, yM: -T / 2 + (T * j) / ny })
    }
  }

  const nodeIndex = (i: number, j: number) => i * (ny + 1) + j

  // Elements: 2 triangles per quad
  const elements: Element2D[] = []
  for (let i = 0; i < nx; i += 1) {
    for (let j = 0; j < ny; j += 1) {
      const n00 = nodeIndex(i, j)
      const n10 = nodeIndex(i + 1, j)
      const n01 = nodeIndex(i, j + 1)
      const n11 = nodeIndex(i + 1, j + 1)
      elements.push([n00, n10, n11])
      elements.push([n00, n11, n01])
    }
  }

  // Material matrix D (plane stress)
  const c = E / (1 - nu * nu)
  const D = [
    [c,        c * nu,      0],
    [c * nu,   c,           0],
    [0,        0,   c * (1 - nu) / 2],
  ]

  const dof = nodes.length * 2
  const K: number[][] = Array.from({ length: dof }, () => new Array(dof).fill(0))
  const F = new Array(dof).fill(0)

  const elementStrainsMicrostrain: CantileverStrainTensorMicrostrain[] = []
  const elementB: number[][][] = []
  const elementAreas: number[] = []

  // Assemble global stiffness
  for (const [n1, n2, n3] of elements) {
    const p1 = nodes[n1]; const p2 = nodes[n2]; const p3 = nodes[n3]
    const area2 = (p2.xM - p1.xM) * (p3.yM - p1.yM) - (p3.xM - p1.xM) * (p2.yM - p1.yM)
    const area = Math.abs(area2) / 2
    if (area <= 1e-20) throw new Error('Degenerate element detected')

    const b1 = p2.yM - p3.yM; const b2 = p3.yM - p1.yM; const b3 = p1.yM - p2.yM
    const c1 = p3.xM - p2.xM; const c2 = p1.xM - p3.xM; const c3 = p2.xM - p1.xM
    const inv2A = 1 / (2 * area)

    const B = [
      [b1 * inv2A, 0, b2 * inv2A, 0, b3 * inv2A, 0],
      [0, c1 * inv2A, 0, c2 * inv2A, 0, c3 * inv2A],
      [c1 * inv2A, b1 * inv2A, c2 * inv2A, b2 * inv2A, c3 * inv2A, b3 * inv2A],
    ]
    elementB.push(B)
    elementAreas.push(area)

    // BᵀD
    const BtD: number[][] = Array.from({ length: 6 }, () => [0, 0, 0])
    for (let i = 0; i < 6; i += 1)
      for (let j = 0; j < 3; j += 1)
        for (let k = 0; k < 3; k += 1)
          BtD[i][j] += B[k][i] * D[k][j]

    // Element stiffness ke = BᵀDB × area × w
    const ke: number[][] = Array.from({ length: 6 }, () => new Array(6).fill(0))
    for (let i = 0; i < 6; i += 1)
      for (let j = 0; j < 6; j += 1) {
        for (let k = 0; k < 3; k += 1) ke[i][j] += BtD[i][k] * B[k][j]
        ke[i][j] *= w * area
      }

    const map = [n1 * 2, n1 * 2 + 1, n2 * 2, n2 * 2 + 1, n3 * 2, n3 * 2 + 1]
    for (let i = 0; i < 6; i += 1)
      for (let j = 0; j < 6; j += 1)
        K[map[i]][map[j]] += ke[i][j]
  }

  // Apply BCs and loading via injected callbacks
  bc.applyForces(F, nodeIndex, nodes, nx, ny, L, T, appliedForceN)
  const fixedSet = new Set(bc.fixedDofs(nodeIndex, nodes, nx, ny, L, T))
  const freeDofs = Array.from({ length: dof }, (_, i) => i).filter(i => !fixedSet.has(i))

  const Kred = freeDofs.map(i => freeDofs.map(j => K[i][j]))
  const Fred = freeDofs.map(i => F[i])
  const ured = solveDenseLinearSystem(Kred, Fred)

  const U = new Array(dof).fill(0)
  freeDofs.forEach((dofIdx, i) => { U[dofIdx] = ured[i] })

  // Element strains
  elements.forEach(([n1, n2, n3], eIdx) => {
    const B = elementB[eIdx]
    const ue = [U[n1*2], U[n1*2+1], U[n2*2], U[n2*2+1], U[n3*2], U[n3*2+1]]
    const eps = [0, 0, 0]
    for (let i = 0; i < 3; i += 1)
      for (let j = 0; j < 6; j += 1)
        eps[i] += B[i][j] * ue[j]
    elementStrainsMicrostrain.push({
      exx: eps[0] * 1e6,
      eyy: eps[1] * 1e6,
      ezz: -nu * (eps[0] + eps[1]) * 1e6,
      exy: eps[2] * 1e6,
      exz: 0, eyz: 0,
    })
  })

  // Nodal strains (area-weighted average of adjacent elements)
  const acc = nodes.map(() => ({ exx:0, eyy:0, ezz:0, exy:0, exz:0, eyz:0, w:0 }))
  elements.forEach(([n1, n2, n3], eIdx) => {
    const s = elementStrainsMicrostrain[eIdx]
    const wt = elementAreas[eIdx]
    ;[n1, n2, n3].forEach(n => {
      const a = acc[n]
      a.exx += s.exx * wt; a.eyy += s.eyy * wt; a.ezz += s.ezz * wt
      a.exy += s.exy * wt; a.exz += s.exz * wt; a.eyz += s.eyz * wt
      a.w += wt
    })
  })
  const nodalStrainsMicrostrain: CantileverStrainTensorMicrostrain[] = acc.map(a => {
    const inv = a.w > 0 ? 1 / a.w : 0
    return {
      exx: a.exx * inv, eyy: a.eyy * inv, ezz: a.ezz * inv,
      exy: a.exy * inv, exz: a.exz * inv, eyz: a.eyz * inv,
    }
  })

  // Strain field sampler (bilinear interpolation over structured grid)
  const dx = L / nx; const dy = T / ny
  const sampleStrainTensorMicrostrain = (xMm: number, yMm: number) => {
    const x = clamp(xMm / 1000, 0, L)
    const y = clamp(yMm / 1000, -T / 2, T / 2)
    const i = Math.min(nx - 1, Math.max(0, Math.floor(x / dx)))
    const j = Math.min(ny - 1, Math.max(0, Math.floor((y + T / 2) / dy)))
    const x0 = i * dx; const y0 = -T / 2 + j * dy
    const tx = clamp((x - x0) / dx, 0, 1)
    const ty = clamp((y - y0) / dy, 0, 1)
    const n00 = nodeIndex(i, j); const n10 = nodeIndex(i+1, j)
    const n01 = nodeIndex(i, j+1); const n11 = nodeIndex(i+1, j+1)
    const a = nodalStrainsMicrostrain[n00]; const b = nodalStrainsMicrostrain[n10]
    const cN = nodalStrainsMicrostrain[n01]; const d = nodalStrainsMicrostrain[n11]
    const lerp = (p00: number, p10: number, p01: number, p11: number) =>
      p00*(1-tx)*(1-ty) + p10*tx*(1-ty) + p01*(1-tx)*ty + p11*tx*ty
    return {
      exx: lerp(a.exx, b.exx, cN.exx, d.exx),
      eyy: lerp(a.eyy, b.eyy, cN.eyy, d.eyy),
      ezz: lerp(a.ezz, b.ezz, cN.ezz, d.ezz),
      exy: lerp(a.exy, b.exy, cN.exy, d.exy),
      exz: 0, eyz: 0,
    }
  }

  const exxValues = nodalStrainsMicrostrain.map(s => s.exx)
  const range: StrainFieldRange = { minExx: Math.min(...exxValues), maxExx: Math.max(...exxValues) }

  return {
    solver: 'linear-cst-2d',
    elementsAlongLength: nx,
    elementsThroughThickness: ny,
    nodes,
    elements,
    displacementsM: nodes.map((_, idx) => ({ ux: U[idx*2], uy: U[idx*2+1] })),
    elementStrainsMicrostrain,
    nodalStrainsMicrostrain,
    range,
    sampleStrainTensorMicrostrain,
    modelLengthMm: L * 1000,
  }
}
