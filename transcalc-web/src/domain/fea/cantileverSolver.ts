import type { CantileverFeaInput, CantileverFeaMeshOptions, CantileverStrainTensorMicrostrain, StrainFieldRange } from './cantilever'

type Node2D = {
  xM: number
  yM: number
}

type Element2D = [number, number, number]

export type CantileverFeaSolution = {
  solver: 'linear-cst-2d'
  elementsAlongLength: number
  elementsThroughThickness: number
  nodes: Node2D[]
  elements: Element2D[]
  displacementsM: Array<{ ux: number; uy: number }>
  elementStrainsMicrostrain: CantileverStrainTensorMicrostrain[]
  nodalStrainsMicrostrain: CantileverStrainTensorMicrostrain[]
  range: StrainFieldRange
  sampleStrainTensorMicrostrain: (xMm: number, yMm: number) => CantileverStrainTensorMicrostrain
  modelLengthMm: number
}

export const getCantileverModelLengthMm = (input: CantileverFeaInput): number =>
  input.loadPointToGageClLengthMm + input.gageLengthMm / 2

const toPa = (modulusGPa: number): number => (modulusGPa < 1e6 ? modulusGPa * 1e9 : modulusGPa)

const clampMeshValue = (v: number | undefined, fallback: number): number => {
  if (!Number.isFinite(v)) return fallback
  return Math.max(1, Math.floor(v as number))
}

const solveDenseLinearSystem = (a: number[][], b: number[]): number[] => {
  const n = b.length
  const m = a.map((row) => row.slice())
  const rhs = b.slice()

  for (let k = 0; k < n; k += 1) {
    let pivotRow = k
    let pivotAbs = Math.abs(m[k][k])
    for (let r = k + 1; r < n; r += 1) {
      const v = Math.abs(m[r][k])
      if (v > pivotAbs) {
        pivotAbs = v
        pivotRow = r
      }
    }
    if (pivotAbs < 1e-14) {
      throw new Error('Singular stiffness matrix')
    }
    if (pivotRow !== k) {
      const tmpRow = m[k]
      m[k] = m[pivotRow]
      m[pivotRow] = tmpRow
      const tmpRhs = rhs[k]
      rhs[k] = rhs[pivotRow]
      rhs[pivotRow] = tmpRhs
    }

    for (let i = k + 1; i < n; i += 1) {
      const factor = m[i][k] / m[k][k]
      if (factor === 0) continue
      for (let j = k; j < n; j += 1) {
        m[i][j] -= factor * m[k][j]
      }
      rhs[i] -= factor * rhs[k]
    }
  }

  const x = new Array(n).fill(0)
  for (let i = n - 1; i >= 0; i -= 1) {
    let sum = rhs[i]
    for (let j = i + 1; j < n; j += 1) {
      sum -= m[i][j] * x[j]
    }
    x[i] = sum / m[i][i]
  }

  return x
}

export function solveCantileverCst2D(
  input: CantileverFeaInput,
  meshOptions: CantileverFeaMeshOptions = {}
): CantileverFeaSolution {
  const nx = clampMeshValue(meshOptions.elementsAlongLength, 40)
  const ny = clampMeshValue(meshOptions.elementsThroughThickness, 8)
  const L = getCantileverModelLengthMm(input) / 1000
  const T = input.thicknessMm / 1000
  const thicknessOutOfPlane = input.beamWidthMm / 1000
  const E = toPa(input.modulusGPa)
  const nu = 0.3

  if (!Number.isFinite(L) || !Number.isFinite(T) || !Number.isFinite(thicknessOutOfPlane) || L <= 0 || T <= 0 || thicknessOutOfPlane <= 0) {
    throw new Error('Invalid geometry for FEA solve')
  }
  if (!Number.isFinite(E) || E <= 0) {
    throw new Error('Invalid modulus for FEA solve')
  }

  const nodes: Node2D[] = []
  for (let i = 0; i <= nx; i += 1) {
    for (let j = 0; j <= ny; j += 1) {
      nodes.push({
        xM: (L * i) / nx,
        yM: -T / 2 + (T * j) / ny,
      })
    }
  }

  const nodeIndex = (i: number, j: number): number => i * (ny + 1) + j
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

  const dof = nodes.length * 2
  const K: number[][] = Array.from({ length: dof }, () => new Array(dof).fill(0))
  const F = new Array(dof).fill(0)

  const c = E / (1 - nu * nu)
  const D = [
    [c, c * nu, 0],
    [c * nu, c, 0],
    [0, 0, c * (1 - nu) / 2],
  ]

  const elementStrainsMicrostrain: CantileverStrainTensorMicrostrain[] = []
  const elementB: number[][][] = []
  const elementAreas: number[] = []

  for (const [n1, n2, n3] of elements) {
    const p1 = nodes[n1]
    const p2 = nodes[n2]
    const p3 = nodes[n3]

    const area2 = (p2.xM - p1.xM) * (p3.yM - p1.yM) - (p3.xM - p1.xM) * (p2.yM - p1.yM)
    const area = Math.abs(area2) / 2
    if (area <= 1e-20) {
      throw new Error('Degenerate element detected')
    }

    const b1 = p2.yM - p3.yM
    const b2 = p3.yM - p1.yM
    const b3 = p1.yM - p2.yM
    const c1 = p3.xM - p2.xM
    const c2 = p1.xM - p3.xM
    const c3 = p2.xM - p1.xM
    const inv2A = 1 / (2 * area)

    const B = [
      [b1 * inv2A, 0, b2 * inv2A, 0, b3 * inv2A, 0],
      [0, c1 * inv2A, 0, c2 * inv2A, 0, c3 * inv2A],
      [c1 * inv2A, b1 * inv2A, c2 * inv2A, b2 * inv2A, c3 * inv2A, b3 * inv2A],
    ]
    elementB.push(B)
    elementAreas.push(area)

    const BtD: number[][] = Array.from({ length: 6 }, () => [0, 0, 0])
    for (let i = 0; i < 6; i += 1) {
      for (let j = 0; j < 3; j += 1) {
        for (let k = 0; k < 3; k += 1) {
          BtD[i][j] += B[k][i] * D[k][j]
        }
      }
    }

    const ke: number[][] = Array.from({ length: 6 }, () => new Array(6).fill(0))
    for (let i = 0; i < 6; i += 1) {
      for (let j = 0; j < 6; j += 1) {
        for (let k = 0; k < 3; k += 1) {
          ke[i][j] += BtD[i][k] * B[k][j]
        }
        ke[i][j] *= thicknessOutOfPlane * area
      }
    }

    const map = [n1 * 2, n1 * 2 + 1, n2 * 2, n2 * 2 + 1, n3 * 2, n3 * 2 + 1]
    for (let i = 0; i < 6; i += 1) {
      for (let j = 0; j < 6; j += 1) {
        K[map[i]][map[j]] += ke[i][j]
      }
    }
  }

  const freeEndNodes = nodes
    .map((n, idx) => ({ n, idx }))
    .filter(({ n }) => Math.abs(n.xM - L) < 1e-12)
    .map(({ idx }) => idx)
  if (freeEndNodes.length === 0) {
    throw new Error('No nodes found on free end')
  }
  const nodalFy = -input.appliedForceN / freeEndNodes.length
  freeEndNodes.forEach((idx) => {
    F[idx * 2 + 1] += nodalFy
  })

  const fixedDofs: number[] = []
  nodes.forEach((n, idx) => {
    if (Math.abs(n.xM) < 1e-12) {
      fixedDofs.push(idx * 2, idx * 2 + 1)
    }
  })
  const fixedSet = new Set(fixedDofs)
  const freeDofs = Array.from({ length: dof }, (_, i) => i).filter((i) => !fixedSet.has(i))

  const Kred: number[][] = freeDofs.map((i) => freeDofs.map((j) => K[i][j]))
  const Fred = freeDofs.map((i) => F[i])
  const ured = solveDenseLinearSystem(Kred, Fred)

  const U = new Array(dof).fill(0)
  freeDofs.forEach((dofIndex, i) => {
    U[dofIndex] = ured[i]
  })

  elements.forEach(([n1, n2, n3], eIdx) => {
    const B = elementB[eIdx]
    const ue = [
      U[n1 * 2], U[n1 * 2 + 1],
      U[n2 * 2], U[n2 * 2 + 1],
      U[n3 * 2], U[n3 * 2 + 1],
    ]
    const eps = [0, 0, 0]
    for (let i = 0; i < 3; i += 1) {
      for (let j = 0; j < 6; j += 1) {
        eps[i] += B[i][j] * ue[j]
      }
    }
    elementStrainsMicrostrain.push({
      exx: eps[0] * 1e6,
      eyy: eps[1] * 1e6,
      ezz: -nu * (eps[0] + eps[1]) * 1e6,
      exy: eps[2] * 1e6,
      exz: 0,
      eyz: 0,
    })
  })

  const nodalAccum = nodes.map(() => ({ exx: 0, eyy: 0, ezz: 0, exy: 0, exz: 0, eyz: 0, w: 0 }))
  elements.forEach(([n1, n2, n3], eIdx) => {
    const strain = elementStrainsMicrostrain[eIdx]
    const w = elementAreas[eIdx]
    ;[n1, n2, n3].forEach((n) => {
      const a = nodalAccum[n]
      a.exx += strain.exx * w
      a.eyy += strain.eyy * w
      a.ezz += strain.ezz * w
      a.exy += strain.exy * w
      a.exz += strain.exz * w
      a.eyz += strain.eyz * w
      a.w += w
    })
  })
  const nodalStrainsMicrostrain: CantileverStrainTensorMicrostrain[] = nodalAccum.map((a) => {
    const inv = a.w > 0 ? 1 / a.w : 0
    return {
      exx: a.exx * inv,
      eyy: a.eyy * inv,
      ezz: a.ezz * inv,
      exy: a.exy * inv,
      exz: a.exz * inv,
      eyz: a.eyz * inv,
    }
  })

  const dx = L / nx
  const dy = T / ny
  const clamp = (v: number, lo: number, hi: number): number => Math.max(lo, Math.min(hi, v))
  const sampleStrainTensorMicrostrain = (xMm: number, yMm: number): CantileverStrainTensorMicrostrain => {
    const x = clamp(xMm / 1000, 0, L)
    const y = clamp(yMm / 1000, -T / 2, T / 2)
    const i = Math.min(nx - 1, Math.max(0, Math.floor(x / dx)))
    const j = Math.min(ny - 1, Math.max(0, Math.floor((y + T / 2) / dy)))
    const x0 = i * dx
    const y0 = -T / 2 + j * dy
    const tx = clamp((x - x0) / dx, 0, 1)
    const ty = clamp((y - y0) / dy, 0, 1)

    const n00 = nodeIndex(i, j)
    const n10 = nodeIndex(i + 1, j)
    const n01 = nodeIndex(i, j + 1)
    const n11 = nodeIndex(i + 1, j + 1)
    const a = nodalStrainsMicrostrain[n00]
    const b = nodalStrainsMicrostrain[n10]
    const cN = nodalStrainsMicrostrain[n01]
    const d = nodalStrainsMicrostrain[n11]

    const interp = (p00: number, p10: number, p01: number, p11: number): number =>
      p00 * (1 - tx) * (1 - ty) + p10 * tx * (1 - ty) + p01 * (1 - tx) * ty + p11 * tx * ty

    return {
      exx: interp(a.exx, b.exx, cN.exx, d.exx),
      eyy: interp(a.eyy, b.eyy, cN.eyy, d.eyy),
      ezz: interp(a.ezz, b.ezz, cN.ezz, d.ezz),
      exy: interp(a.exy, b.exy, cN.exy, d.exy),
      exz: 0,
      eyz: 0,
    }
  }

  const exxValues = nodalStrainsMicrostrain.map((s) => s.exx)
  const range: StrainFieldRange = {
    minExx: Math.min(...exxValues),
    maxExx: Math.max(...exxValues),
  }

  return {
    solver: 'linear-cst-2d',
    elementsAlongLength: nx,
    elementsThroughThickness: ny,
    nodes,
    elements,
    displacementsM: nodes.map((_, idx) => ({ ux: U[idx * 2], uy: U[idx * 2 + 1] })),
    elementStrainsMicrostrain,
    nodalStrainsMicrostrain,
    range,
    sampleStrainTensorMicrostrain,
    modelLengthMm: L * 1000,
  }
}
