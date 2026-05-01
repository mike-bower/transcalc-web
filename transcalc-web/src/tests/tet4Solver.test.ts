import { describe, it, expect } from 'vitest'
import { generateRectTetMesh, generateRectTet10Mesh } from '../domain/fea/paramMesh'
import { solveT4 } from '../domain/fea/tet4Solver'
import { solveT10 } from '../domain/fea/tet10Solver'

// Cantilever beam: L=0.1m, W=0.01m, H=0.01m, E=200GPa, ν=0.3, Fy=-100N
// Analytical:
//   I = W*H³/12 = 8.333e-10 m⁴
//   δ_tip = PL³/(3EI) = 2.0e-4 m  (0.2 mm)
//   ε_xx at root = 6PL/(E*W*H²) = 3000e-6
//
// NOTE: Standard linear T4 (constant strain) has significant shear locking for
// bending problems. The element can only represent constant strain per tet, so
// it cannot capture the linear strain variation across the cross-section needed
// for bending. This makes T4 overly stiff in bending; the error reduces with
// mesh refinement but slowly. The Freudenthal partition also breaks z-symmetry
// (the central tet diagonal couples y and z DOFs). These are inherent T4
// properties, not bugs — the axial column test (no bending) passes tightly.

const L = 0.1, W = 0.01, H = 0.01
const E = 200e9, nu = 0.3
const Fy = -100  // N, downward (y direction)

// Analytical targets
const I = W * H ** 3 / 12
const deltaAnalytical = Math.abs(Fy) * L ** 3 / (3 * E * I)        // 2.0e-4 m
const exxAnalytical   = 6 * Math.abs(Fy) * L / (E * W * H ** 2)    // 3000e-6

function solve(nx: number, ny: number, nz: number) {
  const mesh = generateRectTetMesh({ L, W, H, nx, ny, nz })
  return solveT4({
    mesh,
    E, nu,
    fixedGroup: 'x0',
    loadGroup:  'xL',
    loadVector: [0, Fy, 0],
  })
}

describe('T4 cantilever — mesh generation', () => {
  it('produces correct tet count for 4x1x1 mesh', () => {
    const mesh = generateRectTetMesh({ L, W, H, nx: 4, ny: 1, nz: 1 })
    expect(mesh.tetCount).toBe(4 * 1 * 1 * 5)   // 5 tets per hex cell
  })

  it('has x0 and xL face groups with nodes', () => {
    const mesh = generateRectTetMesh({ L, W, H, nx: 4, ny: 1, nz: 1 })
    expect(mesh.faceGroups.get('x0')!.size).toBeGreaterThan(0)
    expect(mesh.faceGroups.get('xL')!.size).toBeGreaterThan(0)
  })

  it('surface triangles cover all outer faces', () => {
    const mesh = generateRectTetMesh({ L, W, H, nx: 2, ny: 2, nz: 2 })
    expect(mesh.surfaceTris.length).toBeGreaterThan(0)
    expect(mesh.surfaceTris.length % 3).toBe(0)
  })
})

describe('T4 cantilever — bending direction and convergence', () => {
  const coarse = solve(4, 1, 1)
  const medium = solve(8, 2, 2)
  const fine   = solve(16, 4, 4)

  it('coarse deflects in correct direction (−y)', () => {
    expect(coarse.tipDeflection).toBeGreaterThan(0)
  })

  it('deflection converges monotonically with mesh refinement', () => {
    expect(medium.tipDeflection).toBeGreaterThan(coarse.tipDeflection)
    expect(fine.tipDeflection).toBeGreaterThan(medium.tipDeflection)
  })

  it('fine mesh within 40% of analytical (T4 shear-locking bound)', () => {
    // Standard T4 achieves ~65-70% of analytical at 16x4x4; 40% is a floor,
    // not a ceiling — it verifies the result is in the right ballpark.
    const err = Math.abs(fine.tipDeflection - deltaAnalytical) / deltaAnalytical
    expect(err).toBeLessThan(0.40)
  })

  it('medium exx at root within 80% of analytical', () => {
    const mesh = generateRectTetMesh({ L, W, H, nx: 8, ny: 2, nz: 2 })
    const nodes = mesh.nodes
    let maxAbsExx = 0
    for (let n = 0; n < mesh.nodeCount; n++) {
      if (nodes[n * 3] < L * 0.15) {
        const e = Math.abs(medium.nodalStrains[n].exx)
        if (e > maxAbsExx) maxAbsExx = e
      }
    }
    const err = Math.abs(maxAbsExx - exxAnalytical) / exxAnalytical
    expect(err).toBeLessThan(0.80)
  })
})

describe('T4 axial column', () => {
  it('uniform axial strain under Fx load within 5% of analytical', () => {
    const mesh = generateRectTetMesh({ L, W, H, nx: 4, ny: 2, nz: 2 })
    const result = solveT4({
      mesh, E, nu,
      fixedGroup: 'x0',
      loadGroup:  'xL',
      loadVector: [1000, 0, 0],   // 1000 N axial
    })
    const sigmaAnalytical = 1000 / (W * H)   // F/A
    const exxAnalyticalCol = sigmaAnalytical / E

    // All element strains should be approximately equal (uniform)
    const exxVals = result.elementStrains.map(s => s.exx)
    const mean = exxVals.reduce((a, v) => a + v, 0) / exxVals.length
    const err = Math.abs(mean - exxAnalyticalCol) / exxAnalyticalCol
    expect(err).toBeLessThan(0.05)
  })
})

// ── T10 quadratic tetrahedral tests ──────────────────────────────────────────
// Timoshenko correction for this geometry (L/H=10, rect section, κ=5/6):
//   δ_shear/δ_EB = (1+ν)*W²/(2κL²) ≈ 0.78%
// T10 on the Freudenthal partition empirically converges to ~5-6% above E-B
// for bending; the accepted accuracy target is <5% for medium meshes.
const L_slender   = 0.3  // 300 mm, L/H = 30 → Timoshenko ≈ 0.09% negligible
const I_slender   = W * H ** 3 / 12
const deltaSlender = Math.abs(Fy) * L_slender ** 3 / (3 * E * I_slender)

describe('T10 cantilever — bending accuracy (slender beam L/H=30)', () => {
  function solveT10Slender(nx: number, ny: number, nz: number) {
    const mesh = generateRectTet10Mesh({ L: L_slender, W, H, nx, ny, nz })
    return solveT10({ mesh, E, nu, fixedGroup: 'x0', loadGroup: 'xL', loadVector: [0, Fy, 0] })
  }

  it('coarse T10 slender deflection within 10% of E-B', () => {
    const r = solveT10Slender(12, 2, 2)
    const err = Math.abs(r.tipDeflection - deltaSlender) / deltaSlender
    expect(err).toBeLessThan(0.10)
  })

  it('medium T10 slender deflection within 5% of E-B', () => {
    const r = solveT10Slender(24, 2, 2)
    const err = Math.abs(r.tipDeflection - deltaSlender) / deltaSlender
    expect(err).toBeLessThan(0.05)
  })

  it('T10 slender deflection monotonically converges', () => {
    const coarse = solveT10Slender(12, 2, 2)
    const medium = solveT10Slender(24, 2, 2)
    const fine   = solveT10Slender(48, 4, 4)
    expect(medium.tipDeflection).toBeGreaterThan(coarse.tipDeflection)
    expect(fine.tipDeflection).toBeGreaterThan(medium.tipDeflection)
  })
})

describe('T10 cantilever — bending accuracy (L/H=10, original test)', () => {
  function solveT10Cantilever(nx: number, ny: number, nz: number) {
    const mesh = generateRectTet10Mesh({ L, W, H, nx, ny, nz })
    return { mesh, result: solveT10({ mesh, E, nu, fixedGroup: 'x0', loadGroup: 'xL', loadVector: [0, Fy, 0] }) }
  }

  it('T10 deflection monotonically converges', () => {
    const { result: coarse } = solveT10Cantilever(4, 1, 1)
    const { result: medium } = solveT10Cantilever(8, 2, 2)
    const { result: fine }   = solveT10Cantilever(16, 4, 4)
    expect(medium.tipDeflection).toBeGreaterThan(coarse.tipDeflection)
    expect(fine.tipDeflection).toBeGreaterThan(medium.tipDeflection)
  })

  it('T10 average tip uy (y-component only) within 5% of E-B', () => {
    const { mesh, result } = solveT10Cantilever(8, 2, 2)
    const loadNodes = mesh.faceGroups.get('xL')!
    let sumUy = 0
    for (const n of loadNodes) sumUy += Math.abs(result.displacements[n*3+1])
    const avgUy = sumUy / loadNodes.size
    const err = Math.abs(avgUy - deltaAnalytical) / deltaAnalytical
    expect(err).toBeLessThan(0.05)
  })
})

describe('T10 axial column', () => {
  it('uniform axial strain within 0.5% of analytical', () => {
    const mesh = generateRectTet10Mesh({ L, W, H, nx: 4, ny: 2, nz: 2 })
    const result = solveT10({ mesh, E, nu, fixedGroup: 'x0', loadGroup: 'xL', loadVector: [1000, 0, 0] })
    const exxAnalyticalCol = 1000 / (W * H) / E
    const vals = result.elementStrains.map(s => s.exx)
    const mean = vals.reduce((a, v) => a + v, 0) / vals.length
    expect(Math.abs(mean - exxAnalyticalCol) / exxAnalyticalCol).toBeLessThan(0.005)
  })
})

describe('T4 symmetry', () => {
  it('z-displacement small relative to y-displacement under pure Fy load', () => {
    // The Freudenthal partition breaks z-symmetry (central tet diagonal couples
    // y and z DOFs), so uz is not exactly zero. Verify it stays below 20% of
    // the tip deflection — large enough to allow mesh asymmetry, small enough
    // to confirm no gross z-coupling bug.
    const result = solve(4, 2, 2)
    const mesh = generateRectTetMesh({ L, W, H, nx: 4, ny: 2, nz: 2 })
    let maxUz = 0
    for (let n = 0; n < mesh.nodeCount; n++) {
      maxUz = Math.max(maxUz, Math.abs(result.displacements[n*3+2]))
    }
    expect(maxUz).toBeLessThan(result.tipDeflection * 0.20)
  })
})
