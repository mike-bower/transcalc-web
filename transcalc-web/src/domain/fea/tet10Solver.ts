import type { Tet10Mesh } from './paramMesh'
import type { Tet4Result, StrainTensor3D } from './tet4Solver'
import { CsrMatrix, pcgSolve } from './sparseMatrix'

export type { Tet4Result, StrainTensor3D }

export interface Tet10SolveParams {
  mesh:          Tet10Mesh
  E:             number
  nu:            number
  fixedGroup:    string
  loadGroup:     string
  loadVector:    [number, number, number]
  nodalForces?:  Float64Array   // optional: full pre-built global force vector (bypasses loadVector distribution)
  onProgress?:   (iter: number, maxIter: number) => void
}

// 4-point symmetric Gauss quadrature for the unit tet.
// ∫_tet f dV ≈ Σ w_i f(ξ_i,η_i,ζ_i)   [weights sum to 1/6 = vol of ref tet]
const GP_A = (5 - Math.sqrt(5)) / 20   // ≈ 0.13819660
const GP_B = (5 + 3 * Math.sqrt(5)) / 20  // ≈ 0.58541020
// Each point (ξ,η,ζ): L1=1-ξ-η-ζ, L2=ξ, L3=η, L4=ζ
const GAUSS_PTS: [number, number, number][] = [
  [GP_A, GP_A, GP_A],  // L1=b,a,a,a
  [GP_B, GP_A, GP_A],  // L1=a,b,a,a
  [GP_A, GP_B, GP_A],
  [GP_A, GP_A, GP_B],
]
const GAUSS_W = 1 / 24  // weight for each of the 4 points

// ── Constitutive matrix D (6×6 isotropic) ────────────────────────────────────
function buildD(E: number, nu: number): number[][] {
  const c = E / ((1 + nu) * (1 - 2 * nu))
  const a = c * (1 - nu), b = c * nu, g = E / (2 * (1 + nu))
  return [
    [a, b, b, 0, 0, 0],
    [b, a, b, 0, 0, 0],
    [b, b, a, 0, 0, 0],
    [0, 0, 0, g, 0, 0],
    [0, 0, 0, 0, g, 0],
    [0, 0, 0, 0, 0, g],
  ]
}

// ── T10 shape function reference-space gradients at (ξ,η,ζ) ──────────────────
// Returns dN[10][3]: dN[k][j] = ∂N_k/∂ξ_j  (j: 0=ξ, 1=η, 2=ζ)
// Connectivity order matches tets10: [n0,n1,n2,n3, m01,m02,m03,m12,m13,m23]
// Shape fns: corners N_i = L_i(2L_i-1); midsides N_4..9 = 4*L_a*L_b
function shapeDeriv10(xi: number, eta: number, zeta: number): [number,number,number][] {
  const L1 = 1 - xi - eta - zeta
  const L2 = xi, L3 = eta, L4 = zeta
  return [
    // Corners
    [-(4*L1-1), -(4*L1-1), -(4*L1-1)],  // N0 = L1(2L1-1)
    [ 4*L2-1,   0,          0         ],  // N1 = L2(2L2-1)
    [ 0,        4*L3-1,     0         ],  // N2 = L3(2L3-1)
    [ 0,        0,          4*L4-1    ],  // N3 = L4(2L4-1)
    // Midsides: edge pairs (0-1),(0-2),(0-3),(1-2),(1-3),(2-3)
    [ 4*(L1-L2), -4*L2,      -4*L2      ],  // N4 = 4*L1*L2  (m01)
    [-4*L3,       4*(L1-L3), -4*L3      ],  // N5 = 4*L1*L3  (m02)
    [-4*L4,      -4*L4,       4*(L1-L4) ],  // N6 = 4*L1*L4  (m03)
    [ 4*L3,       4*L2,       0         ],  // N7 = 4*L2*L3  (m12)
    [ 4*L4,       0,          4*L2      ],  // N8 = 4*L2*L4  (m13)
    [ 0,          4*L4,       4*L3      ],  // N9 = 4*L3*L4  (m23)
  ]
}

// ── Jacobian (constant for straight-edged T10) and its inverse ───────────────
// Uses only the 4 corner nodes (sub-parametric: geometry mapped by T4).
function buildJacobianAndInv(
  nodes: Float64Array,
  n0: number, n1: number, n2: number, n3: number,
): { Jinv: number[][]; V: number } {
  const x = (n: number) => nodes[n * 3]
  const y = (n: number) => nodes[n * 3 + 1]
  const z = (n: number) => nodes[n * 3 + 2]

  const J = [
    [x(n1)-x(n0), x(n2)-x(n0), x(n3)-x(n0)],
    [y(n1)-y(n0), y(n2)-y(n0), y(n3)-y(n0)],
    [z(n1)-z(n0), z(n2)-z(n0), z(n3)-z(n0)],
  ]
  const detJ =
      J[0][0]*(J[1][1]*J[2][2] - J[1][2]*J[2][1])
    - J[0][1]*(J[1][0]*J[2][2] - J[1][2]*J[2][0])
    + J[0][2]*(J[1][0]*J[2][1] - J[1][1]*J[2][0])

  if (Math.abs(detJ) < 1e-30) throw new Error('Degenerate T10 element')
  const V = Math.abs(detJ) / 6
  const id = 1 / detJ
  const Jinv = [
    [(J[1][1]*J[2][2]-J[1][2]*J[2][1])*id, (J[0][2]*J[2][1]-J[0][1]*J[2][2])*id, (J[0][1]*J[1][2]-J[0][2]*J[1][1])*id],
    [(J[1][2]*J[2][0]-J[1][0]*J[2][2])*id, (J[0][0]*J[2][2]-J[0][2]*J[2][0])*id, (J[0][2]*J[1][0]-J[0][0]*J[1][2])*id],
    [(J[1][0]*J[2][1]-J[1][1]*J[2][0])*id, (J[0][1]*J[2][0]-J[0][0]*J[2][1])*id, (J[0][0]*J[1][1]-J[0][1]*J[1][0])*id],
  ]
  return { Jinv, V }
}

// ── Build 6×30 B matrix at a Gauss point ────────────────────────────────────
function buildB10(
  dNref: [number,number,number][],
  Jinv: number[][],
): number[][] {
  // Physical gradients: dN_phys[k][i] = Σ_j dNref[k][j] * Jinv[j][i]
  const B: number[][] = Array.from({length: 6}, () => new Array(30).fill(0))
  for (let k = 0; k < 10; k++) {
    const c = k * 3
    const dNx = dNref[k][0]*Jinv[0][0] + dNref[k][1]*Jinv[1][0] + dNref[k][2]*Jinv[2][0]
    const dNy = dNref[k][0]*Jinv[0][1] + dNref[k][1]*Jinv[1][1] + dNref[k][2]*Jinv[2][1]
    const dNz = dNref[k][0]*Jinv[0][2] + dNref[k][1]*Jinv[1][2] + dNref[k][2]*Jinv[2][2]
    B[0][c]   = dNx;  B[1][c+1] = dNy;  B[2][c+2] = dNz
    B[3][c]   = dNy;  B[3][c+1] = dNx
    B[4][c+1] = dNz;  B[4][c+2] = dNy
    B[5][c]   = dNz;  B[5][c+2] = dNx
  }
  return B
}

// ── Principal strains (copied from tet4Solver) ───────────────────────────────
function principalStrains(
  exx: number, eyy: number, ezz: number,
  exy: number, eyz: number, exz: number,
): { ePrincipal1: number; ePrincipal2: number; ePrincipal3: number } {
  const I1 = exx + eyy + ezz
  const I2 = exx*eyy + eyy*ezz + ezz*exx - exy*exy - eyz*eyz - exz*exz
  const I3 = exx*(eyy*ezz - eyz*eyz) - exy*(exy*ezz - eyz*exz) + exz*(exy*eyz - eyy*exz)
  const p  = I1*I1/3 - I2
  const q  = 2*I1*I1*I1/27 - I1*I2/3 + I3
  const r  = p > 0 ? Math.sqrt(p/3) : 0
  const phi = r !== 0 ? Math.acos(Math.max(-1, Math.min(1, -q/(2*r*r*r)))) / 3 : 0
  const e1 = I1/3 + 2*r*Math.cos(phi)
  const e2 = I1/3 + 2*r*Math.cos(phi + 2*Math.PI/3)
  const e3 = I1/3 + 2*r*Math.cos(phi + 4*Math.PI/3)
  const s = [e1, e2, e3].sort((a, b) => b - a)
  return { ePrincipal1: s[0], ePrincipal2: s[1], ePrincipal3: s[2] }
}

// ── Gaussian elimination (small dense systems) ───────────────────────────────
function gaussSolve(A: number[][], b: number[]): number[] {
  const n = b.length
  const m = A.map(r => r.slice()), rhs = b.slice()
  for (let k = 0; k < n; k++) {
    let pivRow = k, pivAbs = Math.abs(m[k][k])
    for (let r = k+1; r < n; r++) { const v = Math.abs(m[r][k]); if (v > pivAbs) { pivAbs = v; pivRow = r } }
    if (pivAbs < 1e-20) throw new Error('Singular stiffness matrix')
    if (pivRow !== k) { [m[k], m[pivRow]] = [m[pivRow], m[k]]; [rhs[k], rhs[pivRow]] = [rhs[pivRow], rhs[k]] }
    for (let i = k+1; i < n; i++) {
      const f = m[i][k] / m[k][k]; if (f === 0) continue
      for (let j = k; j < n; j++) m[i][j] -= f * m[k][j]; rhs[i] -= f * rhs[k]
    }
  }
  const x = new Array(n).fill(0)
  for (let i = n-1; i >= 0; i--) {
    let s = rhs[i]; for (let j = i+1; j < n; j++) s -= m[i][j] * x[j]; x[i] = s / m[i][i]
  }
  return x
}

const DENSE_DOF_LIMIT = 3000

// ── Main T10 solver ───────────────────────────────────────────────────────────
export function solveT10(params: Tet10SolveParams): Tet4Result {
  const { mesh, E, nu, fixedGroup, loadGroup, loadVector, nodalForces, onProgress } = params
  const { nodes, tets10, nodeCount } = mesh
  const nDof = nodeCount * 3
  const D = buildD(E, nu)

  // Fixed DOF elimination
  const fixedNodes = mesh.faceGroups.get(fixedGroup) ?? new Set<number>()
  const fixedDofs = new Set<number>()
  for (const n of fixedNodes) for (let d = 0; d < 3; d++) fixedDofs.add(n*3 + d)
  const freeDofs = Array.from({length: nDof}, (_, i) => i).filter(i => !fixedDofs.has(i))
  const freeMap  = new Int32Array(nDof).fill(-1)
  freeDofs.forEach((dof, r) => { freeMap[dof] = r })
  const nFree = freeDofs.length

  // Build global force vector
  const f = new Float64Array(nDof)
  const loadNodes = mesh.faceGroups.get(loadGroup)
  if (nodalForces && nodalForces.length >= nDof) {
    // Use pre-built nodal force vector directly (e.g. torsional loading)
    for (let i = 0; i < nDof; i++) f[i] = nodalForces[i]
  } else {
    // Distributed load on load-face nodes (corner + midside nodes on xL face)
    if (loadNodes && loadNodes.size > 0) {
      const fn = 1 / loadNodes.size
      for (const n of loadNodes) {
        f[n*3]   += loadVector[0] * fn
        f[n*3+1] += loadVector[1] * fn
        f[n*3+2] += loadVector[2] * fn
      }
    }
  }

  const u = new Float64Array(nDof)
  const nTets = tets10.length / 10

  // Per-element: store B at centroid and V for strain recovery
  const BcenterStore: number[][][] = []
  const Vstore: number[] = []

  const assembleKe = (ns: number[]): { Ke: number[], map: number[] } => {
    const { Jinv, V } = buildJacobianAndInv(nodes, ns[0], ns[1], ns[2], ns[3])
    Vstore.push(V)

    // K_e = V/4 * Σ_{4 gp} B^T D B  (exact for quadratic elements on straight-edged tet)
    // Flat 30×30 upper-triangular accumulator
    const Ke = new Array(900).fill(0)  // 30*30 flattened, row-major

    for (const [xi, eta, zeta] of GAUSS_PTS) {
      const dNref = shapeDeriv10(xi, eta, zeta)
      const B = buildB10(dNref, Jinv)
      // B^T D B: 30×30
      for (let i = 0; i < 30; i++) {
        for (let j = 0; j < 30; j++) {
          let v = 0
          for (let k = 0; k < 6; k++) {
            let db = 0
            for (let l = 0; l < 6; l++) db += D[k][l] * B[l][j]
            v += B[k][i] * db
          }
          Ke[i*30+j] += v
        }
      }
    }
    // Scale by V/4
    const scale = V / 4
    for (let i = 0; i < 900; i++) Ke[i] *= scale

    // Store B at centroid (ξ=η=ζ=1/4) for strain recovery
    const dNcen = shapeDeriv10(0.25, 0.25, 0.25)
    BcenterStore.push(buildB10(dNcen, Jinv))

    const map = ns.flatMap(n => [n*3, n*3+1, n*3+2])
    return { Ke, map }
  }

  if (nFree <= DENSE_DOF_LIMIT) {
    const K: number[][] = Array.from({length: nFree}, () => new Array(nFree).fill(0))
    for (let t = 0; t < nTets; t++) {
      const ns = Array.from({length: 10}, (_, k) => tets10[t*10+k])
      const { Ke, map } = assembleKe(ns)
      for (let i = 0; i < 30; i++) {
        const ri = freeMap[map[i]]; if (ri < 0) continue
        for (let j = 0; j < 30; j++) {
          const cj = freeMap[map[j]]; if (cj < 0) continue
          K[ri][cj] += Ke[i*30+j]
        }
      }
    }
    const Fred = freeDofs.map(i => f[i])
    const ured = gaussSolve(K, Fred)
    freeDofs.forEach((dof, i) => { u[dof] = ured[i] })

  } else {
    const Kcsr = new CsrMatrix(nFree)
    for (let t = 0; t < nTets; t++) {
      const ns = Array.from({length: 10}, (_, k) => tets10[t*10+k])
      const { Ke, map } = assembleKe(ns)
      for (let i = 0; i < 30; i++) {
        const ri = freeMap[map[i]]; if (ri < 0) continue
        for (let j = 0; j < 30; j++) {
          const cj = freeMap[map[j]]; if (cj < 0) continue
          Kcsr.add(ri, cj, Ke[i*30+j])
        }
      }
    }
    const Fred = new Float64Array(nFree)
    freeDofs.forEach((dof, r) => { Fred[r] = f[dof] })
    const ured = pcgSolve(Kcsr, Fred, 1e-8, 20000, onProgress)
    freeDofs.forEach((dof, i) => { u[dof] = ured[i] })
  }

  // Element strains at centroid
  const elementStrains: StrainTensor3D[] = []
  for (let t = 0; t < nTets; t++) {
    const ns = Array.from({length: 10}, (_, k) => tets10[t*10+k])
    const B = BcenterStore[t]
    const ue = ns.flatMap(n => [u[n*3], u[n*3+1], u[n*3+2]])
    const eps = new Array(6).fill(0)
    for (let i = 0; i < 6; i++) for (let j = 0; j < 30; j++) eps[i] += B[i][j] * ue[j]
    elementStrains.push({
      exx: eps[0], eyy: eps[1], ezz: eps[2],
      exy: eps[3], eyz: eps[4], exz: eps[5],
      ...principalStrains(eps[0], eps[1], eps[2], eps[3], eps[4], eps[5]),
    })
  }

  // Nodal strains: volume-weighted average from connected elements
  const acc = Array.from({length: nodeCount}, () => ({ exx:0, eyy:0, ezz:0, exy:0, eyz:0, exz:0, w:0 }))
  for (let t = 0; t < nTets; t++) {
    const s = elementStrains[t], V = Vstore[t]
    for (let k = 0; k < 10; k++) {
      const n = tets10[t*10+k], a = acc[n]
      a.exx += s.exx*V; a.eyy += s.eyy*V; a.ezz += s.ezz*V
      a.exy += s.exy*V; a.eyz += s.eyz*V; a.exz += s.exz*V
      a.w += V
    }
  }
  const nodalStrains: StrainTensor3D[] = acc.map(a => {
    const inv = a.w > 0 ? 1/a.w : 0
    const exx = a.exx*inv, eyy = a.eyy*inv, ezz = a.ezz*inv
    const exy = a.exy*inv, eyz = a.eyz*inv, exz = a.exz*inv
    return { exx, eyy, ezz, exy, eyz, exz, ...principalStrains(exx, eyy, ezz, exy, eyz, exz) }
  })

  // Von Mises stress per node
  const vonMisesStress = new Float64Array(nodeCount)
  const c1 = E / ((1+nu) * (1-2*nu)), G = E / (2*(1+nu))
  for (let n = 0; n < nodeCount; n++) {
    const { exx, eyy, ezz, exy, eyz, exz } = nodalStrains[n]
    const sxx = c1*((1-nu)*exx + nu*(eyy+ezz))
    const syy = c1*((1-nu)*eyy + nu*(exx+ezz))
    const szz = c1*((1-nu)*ezz + nu*(exx+eyy))
    const sxy = G*exy, syz = G*eyz, sxz = G*exz
    vonMisesStress[n] = Math.sqrt(0.5*(
      (sxx-syy)**2 + (syy-szz)**2 + (szz-sxx)**2 + 6*(sxy**2+syz**2+sxz**2)))
  }

  // Summary
  let maxDisplacement = 0
  for (let n = 0; n < nodeCount; n++)
    maxDisplacement = Math.max(maxDisplacement, Math.sqrt(u[n*3]**2 + u[n*3+1]**2 + u[n*3+2]**2))

  let tipDeflection = 0
  if (loadNodes && loadNodes.size > 0) {
    let sum = 0
    for (const n of loadNodes) sum += Math.sqrt(u[n*3]**2 + u[n*3+1]**2 + u[n*3+2]**2)
    tipDeflection = sum / loadNodes.size
  }

  return { displacements: u, elementStrains, nodalStrains, vonMisesStress, maxDisplacement, tipDeflection }
}
