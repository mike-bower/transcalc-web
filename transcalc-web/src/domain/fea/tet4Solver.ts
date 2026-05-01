import type { Tet4Mesh } from './paramMesh'
import { CsrMatrix, pcgSolve } from './sparseMatrix'

const DENSE_DOF_LIMIT = 3000  // use Gaussian below this, PCG above

export interface Tet4SolveParams {
  mesh:        Tet4Mesh
  E:           number   // Young's modulus (Pa)
  nu:          number   // Poisson's ratio
  fixedGroup:  string   // faceGroup name → all 3 DOF fixed
  loadGroup:   string   // faceGroup name → distributed total force
  loadVector:  [number, number, number]  // total force (N)
}

export interface StrainTensor3D {
  exx: number; eyy: number; ezz: number
  exy: number; eyz: number; exz: number
  ePrincipal1: number; ePrincipal2: number; ePrincipal3: number
}

export interface Tet4Result {
  displacements:   Float64Array
  elementStrains:  StrainTensor3D[]
  nodalStrains:    StrainTensor3D[]
  vonMisesStress:  Float64Array
  maxDisplacement: number
  tipDeflection:   number
}

// ── Constitutive matrix D (6×6 isotropic, engineering shear strains) ──────────
function buildD(E: number, nu: number): number[][] {
  const c = E / ((1 + nu) * (1 - 2 * nu))
  const a = c * (1 - nu)
  const b = c * nu
  const g = E / (2 * (1 + nu))
  return [
    [a, b, b, 0, 0, 0],
    [b, a, b, 0, 0, 0],
    [b, b, a, 0, 0, 0],
    [0, 0, 0, g, 0, 0],
    [0, 0, 0, 0, g, 0],
    [0, 0, 0, 0, 0, g],
  ]
}

// ── T4 B matrix (6×12) and volume ─────────────────────────────────────────────
function buildBV(
  nodes: Float64Array,
  n0: number, n1: number, n2: number, n3: number,
): { B: number[][]; V: number } {
  const x = (n: number) => nodes[n * 3]
  const y = (n: number) => nodes[n * 3 + 1]
  const z = (n: number) => nodes[n * 3 + 2]

  // Jacobian J = [p1-p0 | p2-p0 | p3-p0] (columns = edge vectors)
  const J = [
    [x(n1)-x(n0), x(n2)-x(n0), x(n3)-x(n0)],
    [y(n1)-y(n0), y(n2)-y(n0), y(n3)-y(n0)],
    [z(n1)-z(n0), z(n2)-z(n0), z(n3)-z(n0)],
  ]

  const detJ =
      J[0][0]*(J[1][1]*J[2][2] - J[1][2]*J[2][1])
    - J[0][1]*(J[1][0]*J[2][2] - J[1][2]*J[2][0])
    + J[0][2]*(J[1][0]*J[2][1] - J[1][1]*J[2][0])

  const V = Math.abs(detJ) / 6
  if (V < 1e-30) throw new Error('Degenerate T4 element (zero volume)')

  const id = 1 / detJ
  // J^{-1} rows
  const Jinv = [
    [(J[1][1]*J[2][2]-J[1][2]*J[2][1])*id, (J[0][2]*J[2][1]-J[0][1]*J[2][2])*id, (J[0][1]*J[1][2]-J[0][2]*J[1][1])*id],
    [(J[1][2]*J[2][0]-J[1][0]*J[2][2])*id, (J[0][0]*J[2][2]-J[0][2]*J[2][0])*id, (J[0][2]*J[1][0]-J[0][0]*J[1][2])*id],
    [(J[1][0]*J[2][1]-J[1][1]*J[2][0])*id, (J[0][1]*J[2][0]-J[0][0]*J[2][1])*id, (J[0][0]*J[1][1]-J[0][1]*J[1][0])*id],
  ]

  // Shape function physical gradients: dN[axis][node]
  // N0=1-ξ-η-ζ, N1=ξ, N2=η, N3=ζ
  // ∂N_k/∂x_axis = (J^{-T})_{axis,k} = Jinv[k][axis]  (column of Jinv)
  const dN = [
    [-(Jinv[0][0]+Jinv[1][0]+Jinv[2][0]), Jinv[0][0], Jinv[1][0], Jinv[2][0]],
    [-(Jinv[0][1]+Jinv[1][1]+Jinv[2][1]), Jinv[0][1], Jinv[1][1], Jinv[2][1]],
    [-(Jinv[0][2]+Jinv[1][2]+Jinv[2][2]), Jinv[0][2], Jinv[1][2], Jinv[2][2]],
  ]

  // B 6×12: rows = [exx,eyy,ezz,γxy,γyz,γxz], cols = [ux0,uy0,uz0, ux1,...]
  const B: number[][] = Array.from({length:6}, () => new Array(12).fill(0))
  for (let n = 0; n < 4; n++) {
    const c = n * 3
    B[0][c]   = dN[0][n]              // exx = ∂ux/∂x
    B[1][c+1] = dN[1][n]              // eyy = ∂uy/∂y
    B[2][c+2] = dN[2][n]              // ezz = ∂uz/∂z
    B[3][c]   = dN[1][n]              // γxy: ∂ux/∂y
    B[3][c+1] = dN[0][n]              //     +∂uy/∂x
    B[4][c+1] = dN[2][n]              // γyz: ∂uy/∂z
    B[4][c+2] = dN[1][n]              //     +∂uz/∂y
    B[5][c]   = dN[2][n]              // γxz: ∂ux/∂z
    B[5][c+2] = dN[0][n]              //     +∂uz/∂x
  }

  return { B, V }
}

// ── Gaussian elimination with partial pivoting ────────────────────────────────
function gaussSolve(A: number[][], b: number[]): number[] {
  const n = b.length
  const m = A.map(r => r.slice())
  const rhs = b.slice()

  for (let k = 0; k < n; k++) {
    let pivRow = k, pivAbs = Math.abs(m[k][k])
    for (let r = k+1; r < n; r++) {
      const v = Math.abs(m[r][k])
      if (v > pivAbs) { pivAbs = v; pivRow = r }
    }
    if (pivAbs < 1e-20) throw new Error('Singular stiffness matrix (underconstrained)')
    if (pivRow !== k) {
      ;[m[k], m[pivRow]] = [m[pivRow], m[k]]
      ;[rhs[k], rhs[pivRow]] = [rhs[pivRow], rhs[k]]
    }
    for (let i = k+1; i < n; i++) {
      const f = m[i][k] / m[k][k]
      if (f === 0) continue
      for (let j = k; j < n; j++) m[i][j] -= f * m[k][j]
      rhs[i] -= f * rhs[k]
    }
  }

  const x = new Array(n).fill(0)
  for (let i = n-1; i >= 0; i--) {
    let s = rhs[i]
    for (let j = i+1; j < n; j++) s -= m[i][j] * x[j]
    x[i] = s / m[i][i]
  }
  return x
}

// ── 3×3 symmetric eigenvalues (principal strains) ────────────────────────────
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

// ── Main solver ───────────────────────────────────────────────────────────────
export function solveT4(params: Tet4SolveParams): Tet4Result {
  const { mesh, E, nu, fixedGroup, loadGroup, loadVector } = params
  const { nodes, tets, nodeCount } = mesh
  const nDof = nodeCount * 3
  const D = buildD(E, nu)

  const f = new Float64Array(nDof)

  // Store B and V per element for strain recovery
  const Bstore: number[][][] = []
  const Vstore: number[] = []

  // Fixed DOF elimination (Dirichlet BCs)
  const fixedNodes = mesh.faceGroups.get(fixedGroup) ?? new Set<number>()
  const fixedDofs = new Set<number>()
  for (const n of fixedNodes)
    for (let d = 0; d < 3; d++) fixedDofs.add(n*3 + d)
  const freeDofs = Array.from({length: nDof}, (_, i) => i).filter(i => !fixedDofs.has(i))
  const freeMap  = new Int32Array(nDof).fill(-1)
  freeDofs.forEach((dof, r) => { freeMap[dof] = r })
  const nFree = freeDofs.length

  // Apply distributed load to load-face nodes
  const loadNodes = mesh.faceGroups.get(loadGroup)
  if (loadNodes && loadNodes.size > 0) {
    const fn = 1 / loadNodes.size
    for (const n of loadNodes) {
      f[n*3]   += loadVector[0] * fn
      f[n*3+1] += loadVector[1] * fn
      f[n*3+2] += loadVector[2] * fn
    }
  }

  const u = new Float64Array(nDof)

  if (nFree <= DENSE_DOF_LIMIT) {
    // ── Dense Gaussian for small systems ──────────────────────────────────────
    const K: number[][] = Array.from({length: nFree}, () => new Array(nFree).fill(0))

    for (let t = 0; t < tets.length; t += 4) {
      const ns = [tets[t], tets[t+1], tets[t+2], tets[t+3]]
      const { B, V } = buildBV(nodes, ns[0], ns[1], ns[2], ns[3])
      Bstore.push(B)
      Vstore.push(V)

      const BtD: number[][] = Array.from({length:12}, () => new Array(6).fill(0))
      for (let i = 0; i < 12; i++)
        for (let j = 0; j < 6; j++)
          for (let k = 0; k < 6; k++)
            BtD[i][j] += B[k][i] * D[k][j]

      const map = ns.flatMap(n => [n*3, n*3+1, n*3+2])
      for (let i = 0; i < 12; i++) {
        const ri = freeMap[map[i]]; if (ri < 0) continue
        for (let j = 0; j < 12; j++) {
          const cj = freeMap[map[j]]; if (cj < 0) continue
          let v = 0
          for (let k = 0; k < 6; k++) v += BtD[i][k] * B[k][j]
          K[ri][cj] += v * V
        }
      }
    }

    const Fred = freeDofs.map(i => f[i])
    const ured = gaussSolve(K, Fred)
    freeDofs.forEach((dof, i) => { u[dof] = ured[i] })

  } else {
    // ── Sparse PCG for large systems ──────────────────────────────────────────
    const Kcsr = new CsrMatrix(nFree)

    for (let t = 0; t < tets.length; t += 4) {
      const ns = [tets[t], tets[t+1], tets[t+2], tets[t+3]]
      const { B, V } = buildBV(nodes, ns[0], ns[1], ns[2], ns[3])
      Bstore.push(B)
      Vstore.push(V)

      const BtD: number[][] = Array.from({length:12}, () => new Array(6).fill(0))
      for (let i = 0; i < 12; i++)
        for (let j = 0; j < 6; j++)
          for (let k = 0; k < 6; k++)
            BtD[i][j] += B[k][i] * D[k][j]

      const map = ns.flatMap(n => [n*3, n*3+1, n*3+2])
      for (let i = 0; i < 12; i++) {
        const ri = freeMap[map[i]]; if (ri < 0) continue
        for (let j = 0; j < 12; j++) {
          const cj = freeMap[map[j]]; if (cj < 0) continue
          let v = 0
          for (let k = 0; k < 6; k++) v += BtD[i][k] * B[k][j]
          Kcsr.add(ri, cj, v * V)
        }
      }
    }

    const Fred = new Float64Array(nFree)
    freeDofs.forEach((dof, r) => { Fred[r] = f[dof] })
    const ured = pcgSolve(Kcsr, Fred)
    freeDofs.forEach((dof, i) => { u[dof] = ured[i] })
  }

  // Element strains
  const nTets = tets.length / 4
  const elementStrains: StrainTensor3D[] = []
  for (let t = 0; t < nTets; t++) {
    const ns = [tets[t*4], tets[t*4+1], tets[t*4+2], tets[t*4+3]]
    const B = Bstore[t]
    const ue = ns.flatMap(n => [u[n*3], u[n*3+1], u[n*3+2]])
    const eps = new Array(6).fill(0)
    for (let i = 0; i < 6; i++)
      for (let j = 0; j < 12; j++)
        eps[i] += B[i][j] * ue[j]
    elementStrains.push({
      exx: eps[0], eyy: eps[1], ezz: eps[2],
      exy: eps[3], eyz: eps[4], exz: eps[5],
      ...principalStrains(eps[0], eps[1], eps[2], eps[3], eps[4], eps[5]),
    })
  }

  // Nodal strains (volume-weighted average)
  const acc = Array.from({length: nodeCount},
    () => ({ exx:0, eyy:0, ezz:0, exy:0, eyz:0, exz:0, w:0 }))
  for (let t = 0; t < nTets; t++) {
    const s = elementStrains[t]
    const V = Vstore[t]
    for (let k = 0; k < 4; k++) {
      const n = tets[t*4 + k]
      const a = acc[n]
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
  const c1 = E / ((1+nu) * (1-2*nu))
  const G  = E / (2*(1+nu))
  for (let n = 0; n < nodeCount; n++) {
    const { exx, eyy, ezz, exy, eyz, exz } = nodalStrains[n]
    const sxx = c1*((1-nu)*exx + nu*(eyy+ezz))
    const syy = c1*((1-nu)*eyy + nu*(exx+ezz))
    const szz = c1*((1-nu)*ezz + nu*(exx+eyy))
    const sxy = G * exy, syz = G * eyz, sxz = G * exz
    vonMisesStress[n] = Math.sqrt(0.5*(
      (sxx-syy)**2 + (syy-szz)**2 + (szz-sxx)**2 +
      6*(sxy**2 + syz**2 + sxz**2)))
  }

  // Summary values
  let maxDisplacement = 0
  for (let n = 0; n < nodeCount; n++)
    maxDisplacement = Math.max(maxDisplacement,
      Math.sqrt(u[n*3]**2 + u[n*3+1]**2 + u[n*3+2]**2))

  let tipDeflection = 0
  if (loadNodes && loadNodes.size > 0) {
    let sum = 0
    for (const n of loadNodes)
      sum += Math.sqrt(u[n*3]**2 + u[n*3+1]**2 + u[n*3+2]**2)
    tipDeflection = sum / loadNodes.size
  }

  return { displacements: u, elementStrains, nodalStrains, vonMisesStress, maxDisplacement, tipDeflection }
}
