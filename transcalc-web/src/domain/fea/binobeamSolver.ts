export type BinobeamFeaUnitSystem = 'US' | 'SI'

export type BinobeamFeaInput = {
  unitSystem: BinobeamFeaUnitSystem
  appliedForce: number
  distanceBetweenGageCls: number
  radius: number
  beamWidth: number
  beamHeight: number
  minimumThickness: number
  modulus: number
  gageLength: number
  gageFactor: number
}

export type BinobeamFeaMeshOptions = {
  elementsAlongLength?: number
  elementsAlongHeight?: number
}

type Node2D = { xM: number; yM: number }
type Element2D = [number, number, number]

export type BinobeamFeaResult = {
  solver: 'linear-cst-2d-binobeam'
  nodes: number
  elements: number
  gaugeNominalStrainMicrostrain: number
  gaugeVariationPercent: number
  spanMvV: number
  gaugePointStrainsMicrostrain: number[]
  minExxMicrostrain: number
  maxExxMicrostrain: number
  meshNodes: Array<{ xM: number; yM: number }>
  meshElements: Array<[number, number, number]>
  nodalExxMicrostrain: number[]
  warnings: string[]
}

const N_PER_LBF = 4.4482216152605
const M_PER_IN = 0.0254
const M_PER_MM = 0.001
const PA_PER_MPSI = 6.8947572932e9
const PA_PER_GPA = 1e9

const clampMeshValue = (v: number | undefined, fallback: number): number => {
  if (!Number.isFinite(v)) return fallback
  return Math.max(4, Math.floor(v as number))
}

const pushUniqueSorted = (values: number[], eps: number): number[] => {
  const sorted = values.slice().sort((a, b) => a - b)
  const out: number[] = []
  sorted.forEach((v) => {
    if (out.length === 0 || Math.abs(v - out[out.length - 1]) > eps) out.push(v)
  })
  return out
}

const buildAxis = (
  min: number,
  max: number,
  keyPoints: number[],
  targetStep: number,
  minPerSpan: number
): number[] => {
  const eps = Math.max(1e-12, Math.abs(max - min) * 1e-12)
  const anchors = pushUniqueSorted(
    [min, max, ...keyPoints.filter((v) => v > min + eps && v < max - eps)],
    eps
  )
  const coords: number[] = [anchors[0]]
  for (let i = 0; i < anchors.length - 1; i += 1) {
    const a = anchors[i]
    const b = anchors[i + 1]
    const span = b - a
    const segments = Math.max(minPerSpan, Math.ceil(span / targetStep))
    for (let s = 1; s <= segments; s += 1) {
      coords.push(a + (span * s) / segments)
    }
  }
  return coords
}

const circleOffsets = (radius: number, samplesPerQuadrant: number): number[] => {
  const samples = Math.max(4, Math.floor(samplesPerQuadrant))
  const out: number[] = []
  for (let i = 0; i <= samples; i += 1) {
    const theta = (Math.PI / 2) * (i / samples)
    out.push(radius * Math.cos(theta))
    out.push(radius * Math.sin(theta))
    out.push(-radius * Math.cos(theta))
    out.push(-radius * Math.sin(theta))
  }
  return out
}

const toSI = (input: BinobeamFeaInput) => {
  if (input.unitSystem === 'US') {
    return {
      F: input.appliedForce * N_PER_LBF,
      L: input.distanceBetweenGageCls * M_PER_IN,
      r: input.radius * M_PER_IN,
      W: input.beamWidth * M_PER_IN,
      H: input.beamHeight * M_PER_IN,
      tMin: input.minimumThickness * M_PER_IN,
      E: input.modulus * PA_PER_MPSI,
      gageLength: input.gageLength * M_PER_IN,
      gageFactor: input.gageFactor,
    }
  }
  return {
    F: input.appliedForce,
    L: input.distanceBetweenGageCls * M_PER_MM,
    r: input.radius * M_PER_MM,
    W: input.beamWidth * M_PER_MM,
    H: input.beamHeight * M_PER_MM,
    tMin: input.minimumThickness * M_PER_MM,
    E: input.modulus * PA_PER_GPA,
    gageLength: input.gageLength * M_PER_MM,
    gageFactor: input.gageFactor,
  }
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
      throw new Error('Singular stiffness matrix in binocular FEA solve')
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

export function solveBinobeamFea(
  input: BinobeamFeaInput,
  options: BinobeamFeaMeshOptions = {}
): BinobeamFeaResult {
  const si = toSI(input)
  if (
    !Number.isFinite(si.F) || si.F <= 0 ||
    !Number.isFinite(si.L) || si.L <= 0 ||
    !Number.isFinite(si.r) || si.r <= 0 ||
    !Number.isFinite(si.W) || si.W <= 0 ||
    !Number.isFinite(si.H) || si.H <= 0 ||
    !Number.isFinite(si.tMin) || si.tMin <= 0 ||
    !Number.isFinite(si.E) || si.E <= 0 ||
    !Number.isFinite(si.gageLength) || si.gageLength <= 0 ||
    !Number.isFinite(si.gageFactor) || si.gageFactor <= 0
  ) {
    throw new Error('Invalid binocular FEA inputs')
  }

  const nx = clampMeshValue(options.elementsAlongLength, 24)
  const ny = clampMeshValue(options.elementsAlongHeight, 14)
  // Profile matches binocular drawing: two radius-r ends around hole centers
  // plus minimum edge ligament tMin at both outer ends.
  // Total length = L + 2 * (r + tMin)
  const halfLength = si.L / 2 + si.r + si.tMin
  const xMin = -halfLength
  const xMax = halfLength
  const yMin = -si.H / 2
  const yMax = si.H / 2

  const smallestFeature = Math.max(1e-6, Math.min(si.r, si.tMin, si.gageLength / 2))
  const baseStepX = (xMax - xMin) / nx
  const baseStepY = (yMax - yMin) / ny
  const targetStepX = Math.max(baseStepX, smallestFeature / 4)
  const targetStepY = Math.max(baseStepY, smallestFeature / 4)
  const curvatureSamples = Math.max(4, Math.ceil((nx + ny) / 10))
  const radialOffsets = circleOffsets(si.r, curvatureSamples)
  const holeCenterX = [-si.L / 2, si.L / 2]
  const circleXAnchors = holeCenterX.flatMap((cx) => radialOffsets.map((dx) => cx + dx))
  const circleYAnchors = radialOffsets.slice()

  const xCoords = buildAxis(
    xMin,
    xMax,
    [
      -si.L / 2 - si.r,
      -si.L / 2,
      -si.L / 2 + si.r,
      0,
      si.L / 2 - si.r,
      si.L / 2,
      si.L / 2 + si.r,
      ...circleXAnchors,
    ],
    targetStepX,
    2
  )
  const yCoords = buildAxis(
    yMin,
    yMax,
    [
      -si.r - si.tMin,
      -si.r,
      0,
      si.r,
      si.r + si.tMin,
      ...circleYAnchors,
    ],
    targetStepY,
    2
  )

  const holeCenters = [{ x: -si.L / 2, y: 0 }, { x: si.L / 2, y: 0 }]
  const holeRadius = si.r
  const insideEitherHole = (x: number, y: number): boolean =>
    holeCenters.some((c) => (x - c.x) ** 2 + (y - c.y) ** 2 < holeRadius ** 2)
  const insideCenterSlot = (x: number, y: number): boolean =>
    x > -si.L / 2 && x < si.L / 2 && Math.abs(y) < si.r
  const insideCutout = (x: number, y: number): boolean =>
    insideEitherHole(x, y) || insideCenterSlot(x, y)

  const gridNodes: Node2D[] = []
  const gridActive: boolean[] = []
  for (let i = 0; i < xCoords.length; i += 1) {
    for (let j = 0; j < yCoords.length; j += 1) {
      const x = xCoords[i]
      const y = yCoords[j]
      gridNodes.push({ xM: x, yM: y })
      gridActive.push(!insideCutout(x, y))
    }
  }
  const gx = xCoords.length
  const gy = yCoords.length
  const gridIndex = (i: number, j: number) => i * gy + j

  const mapToActive = new Map<number, number>()
  const nodes: Node2D[] = []
  gridNodes.forEach((node, idx) => {
    if (gridActive[idx]) {
      mapToActive.set(idx, nodes.length)
      nodes.push(node)
    }
  })

  const elements: Element2D[] = []
  for (let i = 0; i < gx - 1; i += 1) {
    for (let j = 0; j < gy - 1; j += 1) {
      const n00 = gridIndex(i, j)
      const n10 = gridIndex(i + 1, j)
      const n01 = gridIndex(i, j + 1)
      const n11 = gridIndex(i + 1, j + 1)
      const t1 = [n00, n10, n11] as const
      const t2 = [n00, n11, n01] as const

      ;[t1, t2].forEach((tri) => {
        if (!tri.every((n) => gridActive[n])) return
        const p1 = gridNodes[tri[0]]
        const p2 = gridNodes[tri[1]]
        const p3 = gridNodes[tri[2]]
        const cx = (p1.xM + p2.xM + p3.xM) / 3
        const cy = (p1.yM + p2.yM + p3.yM) / 3
        if (insideCutout(cx, cy)) return
        elements.push([
          mapToActive.get(tri[0])!,
          mapToActive.get(tri[1])!,
          mapToActive.get(tri[2])!,
        ])
      })
    }
  }

  if (nodes.length < 20 || elements.length < 20) {
    throw new Error('Mesh generation failed for binocular geometry')
  }

  const dof = nodes.length * 2
  const K: number[][] = Array.from({ length: dof }, () => new Array(dof).fill(0))
  const Fv = new Array(dof).fill(0)

  const nu = 0.3
  const c = si.E / (1 - nu * nu)
  const D = [
    [c, c * nu, 0],
    [c * nu, c, 0],
    [0, 0, c * (1 - nu) / 2],
  ]

  const elementStrainsExx: number[] = []
  const nodeExxAccum = nodes.map(() => ({ s: 0, w: 0 }))

  for (const [n1, n2, n3] of elements) {
    const p1 = nodes[n1]
    const p2 = nodes[n2]
    const p3 = nodes[n3]
    const area2 = (p2.xM - p1.xM) * (p3.yM - p1.yM) - (p3.xM - p1.xM) * (p2.yM - p1.yM)
    const area = Math.abs(area2) / 2
    if (area <= 1e-20) continue

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
        ke[i][j] *= si.W * area
      }
    }
    const map = [n1 * 2, n1 * 2 + 1, n2 * 2, n2 * 2 + 1, n3 * 2, n3 * 2 + 1]
    for (let i = 0; i < 6; i += 1) {
      for (let j = 0; j < 6; j += 1) {
        K[map[i]][map[j]] += ke[i][j]
      }
    }
    elementStrainsExx.push(0) // placeholder, filled after solve
  }

  const rightNodes = nodes
    .map((n, idx) => ({ n, idx }))
    .filter(({ n }) => Math.abs(n.xM - xMax) < 1e-12)
    .map(({ idx }) => idx)
  if (rightNodes.length === 0) {
    throw new Error('No right-boundary load nodes found in binocular FEA mesh')
  }
  const nodalFy = -si.F / rightNodes.length
  rightNodes.forEach((idx) => {
    Fv[idx * 2 + 1] += nodalFy
  })

  const fixedDofs: number[] = []
  nodes.forEach((n, idx) => {
    if (Math.abs(n.xM - xMin) < 1e-12) fixedDofs.push(idx * 2, idx * 2 + 1)
  })
  const fixedSet = new Set(fixedDofs)
  const freeDofs = Array.from({ length: dof }, (_, i) => i).filter((i) => !fixedSet.has(i))
  const Kred = freeDofs.map((i) => freeDofs.map((j) => K[i][j]))
  const Fred = freeDofs.map((i) => Fv[i])
  const uFree = solveDenseLinearSystem(Kred, Fred)
  const U = new Array(dof).fill(0)
  freeDofs.forEach((dofIndex, i) => { U[dofIndex] = uFree[i] })

  elements.forEach(([n1, n2, n3], eIdx) => {
    const p1 = nodes[n1]
    const p2 = nodes[n2]
    const p3 = nodes[n3]
    const area2 = (p2.xM - p1.xM) * (p3.yM - p1.yM) - (p3.xM - p1.xM) * (p2.yM - p1.yM)
    const area = Math.abs(area2) / 2
    if (area <= 1e-20) return
    const b1 = p2.yM - p3.yM
    const b2 = p3.yM - p1.yM
    const b3 = p1.yM - p2.yM
    const inv2A = 1 / (2 * area)
    const epsX = b1 * inv2A * U[n1 * 2] + b2 * inv2A * U[n2 * 2] + b3 * inv2A * U[n3 * 2]
    const exxMicro = epsX * 1e6
    elementStrainsExx[eIdx] = exxMicro
    ;[n1, n2, n3].forEach((n) => {
      nodeExxAccum[n].s += exxMicro * area
      nodeExxAccum[n].w += area
    })
  })

  const nodalExx = nodeExxAccum.map((v) => (v.w > 0 ? v.s / v.w : 0))
  const minExx = Math.min(...nodalExx)
  const maxExx = Math.max(...nodalExx)

  const sampleNodalExx = (x: number, y: number): number => {
    const nearest: Array<{ d2: number; value: number }> = []
    nodes.forEach((n, idx) => {
      const d2 = (n.xM - x) ** 2 + (n.yM - y) ** 2
      nearest.push({ d2, value: nodalExx[idx] })
    })
    nearest.sort((a, b) => a.d2 - b.d2)
    const k = Math.min(8, nearest.length)
    let wSum = 0
    let vSum = 0
    for (let i = 0; i < k; i += 1) {
      const item = nearest[i]
      if (item.d2 < 1e-20) return item.value
      const w = 1 / item.d2
      wSum += w
      vSum += w * item.value
    }
    return wSum > 0 ? vSum / wSum : 0
  }

  const gageYTop = si.r + si.tMin
  const gageYBottom = -gageYTop
  const gageXLeft = -si.L / 2
  const gageXRight = si.L / 2
  const sampleGageAverage = (centerX: number, centerY: number): number => {
    const segments = 24
    const startX = centerX - si.gageLength / 2
    const step = si.gageLength / segments
    let sum = 0
    for (let i = 0; i <= segments; i += 1) {
      const x = startX + i * step
      sum += Math.abs(sampleNodalExx(x, centerY))
    }
    return sum / (segments + 1)
  }
  const gaugePointStrains = [
    sampleGageAverage(gageXLeft, gageYTop),
    sampleGageAverage(gageXRight, gageYTop),
    sampleGageAverage(gageXLeft, gageYBottom),
    sampleGageAverage(gageXRight, gageYBottom),
  ]

  const gaugeNominal = gaugePointStrains.reduce((a, b) => a + b, 0) / gaugePointStrains.length
  const gaugeMin = Math.min(...gaugePointStrains)
  const gaugeMax = Math.max(...gaugePointStrains)
  const gaugeVariation = gaugeMax > 0 ? ((gaugeMax - gaugeMin) / gaugeMax) * 100 : 0
  const spanMvV = gaugeNominal * si.gageFactor * 1e-3

  return {
    solver: 'linear-cst-2d-binobeam',
    nodes: nodes.length,
    elements: elements.length,
    gaugeNominalStrainMicrostrain: gaugeNominal,
    gaugeVariationPercent: gaugeVariation,
    spanMvV,
    gaugePointStrainsMicrostrain: gaugePointStrains,
    minExxMicrostrain: minExx,
    maxExxMicrostrain: maxExx,
    meshNodes: nodes,
    meshElements: elements,
    nodalExxMicrostrain: nodalExx,
    warnings: [
      'Initial binocular FEA model uses left-edge fixed constraint and right-edge distributed load.',
      'Binocular mesh is parameter-driven and includes exact key geometry lines (hole centers/edges and slot bounds).',
      'Gauge extraction currently samples nearest nodal strains at four nominal gage points.',
    ],
  }
}
