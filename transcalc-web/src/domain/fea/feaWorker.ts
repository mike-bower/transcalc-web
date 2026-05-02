/// <reference lib="webworker" />
import { generateRectTet10Mesh } from './paramMesh'
import { solveT10 } from './tet10Solver'

type MaskType = 'none' | 'binocular' | 'crossbeam' | 'sbeam' | 'threebeam' | 'round' | 'round-hollow' | 'dualbeam' | 'shearweb'

interface WorkerRequest {
  meshParams: {
    L: number; W: number; H: number
    nx: number; ny: number; nz: number
    maskType: MaskType
    binocular?:   { leftHoleX: number; rightHoleX: number; holeCy: number; r: number }
    crossbeam?:   { outerRadius: number; innerRadius: number; halfWidth: number }
    sbeam?:       { leftHoleX: number; leftHoleY: number; rightHoleX: number; rightHoleY: number; r: number }
    threebeam?:   { outerRadius: number; innerRadius: number; halfWidth: number }
    round?:       { r: number }
    roundHollow?: { outerR: number; innerR: number }
    dualbeam?:    { T: number; beamSep: number; blockW: number }
    shearweb?:    { voidH: number; webT: number }
  }
  solverParams: {
    E: number; nu: number
    fixedGroup: string; loadGroup: string
    loadVector: [number, number, number]
    torqueX?: number   // optional torsion about X-axis (N·m)
  }
}

// Density-based 1-D node grader. Builds nIntervals+1 positions in [0, total]
// with cells clustered near each value in clusterAt (spread controls gaussian width).
function gradePositions(nIntervals: number, total: number, clusterAt: number[], spread: number): Float64Array {
  const nNodes = nIntervals + 1
  const peak = 6        // density ratio at cluster point vs background
  const nQuad = 600     // quadrature points for cumulative integral

  const cumulative = new Float64Array(nQuad + 1)
  for (let i = 0; i < nQuad; i++) {
    const x = (i + 0.5) / nQuad * total
    let d = 1
    for (const c of clusterAt) d += peak * Math.exp(-0.5 * ((x - c) / spread) ** 2)
    cumulative[i + 1] = cumulative[i] + d
  }
  const totalD = cumulative[nQuad]

  const positions = new Float64Array(nNodes)
  positions[0] = 0
  positions[nNodes - 1] = total
  for (let i = 1; i < nNodes - 1; i++) {
    const target = (i / nIntervals) * totalD
    let lo = 0, hi = nQuad
    while (lo < hi - 1) {
      const mid = (lo + hi) >> 1
      if (cumulative[mid] < target) lo = mid; else hi = mid
    }
    const t = (target - cumulative[lo]) / (cumulative[hi] - cumulative[lo])
    positions[i] = ((lo + t) / nQuad) * total
  }
  return positions
}

self.onmessage = (e: MessageEvent<WorkerRequest>) => {
  const { meshParams, solverParams } = e.data

  try {
    self.postMessage({ type: 'progress', phase: 'Generating mesh…', iter: 0, maxIter: 1 })

    let maskFn: ((cx: number, cy: number, cz: number) => boolean) | undefined
    let yPositions: Float64Array | undefined
    let zPositions: Float64Array | undefined

    if (meshParams.maskType === 'binocular' && meshParams.binocular) {
      const { leftHoleX, rightHoleX, holeCy, r } = meshParams.binocular
      maskFn = (cx, cy, _cz) => {
        if (Math.hypot(cx - leftHoleX, cy - holeCy) < r) return false
        if (Math.hypot(cx - rightHoleX, cy - holeCy) < r) return false
        // Connecting slot between holes: width = 2r (hole diameter)
        if (cx > leftHoleX && cx < rightHoleX && Math.abs(cy - holeCy) < r) return false
        return true
      }
    } else if (meshParams.maskType === 'crossbeam' && meshParams.crossbeam) {
      const { outerRadius, innerRadius, halfWidth } = meshParams.crossbeam
      const cxc = meshParams.L / 2
      const cyc = meshParams.W / 2
      maskFn = (cx, cy, _cz) => {
        const x = cx - cxc, y = cy - cyc
        const r = Math.hypot(x, y)
        return r <= innerRadius ||
               (Math.abs(y) <= halfWidth && r <= outerRadius) ||
               (Math.abs(x) <= halfWidth && r <= outerRadius)
      }
    } else if (meshParams.maskType === 'sbeam' && meshParams.sbeam) {
      const { leftHoleX, leftHoleY, rightHoleX, rightHoleY, r } = meshParams.sbeam
      maskFn = (cx, cy, _cz) => {
        if (Math.hypot(cx - leftHoleX, cy - leftHoleY) < r) return false
        if (Math.hypot(cx - rightHoleX, cy - rightHoleY) < r) return false
        return true
      }
    } else if (meshParams.maskType === 'threebeam' && meshParams.threebeam) {
      const { outerRadius, innerRadius, halfWidth } = meshParams.threebeam
      const cxc = meshParams.L / 2
      const cyc = meshParams.W / 2
      maskFn = (cx, cy, _cz) => {
        const dx = cx - cxc, dy = cy - cyc
        const dist = Math.hypot(dx, dy)
        if (dist <= innerRadius) return true
        if (dist > outerRadius) return false
        // Check three arms at 0°, 120°, 240°
        for (let k = 0; k < 3; k++) {
          const angle = (k * 2 * Math.PI) / 3
          const lx =  dx * Math.cos(angle) + dy * Math.sin(angle)
          const ly = -dx * Math.sin(angle) + dy * Math.cos(angle)
          if (lx >= 0 && Math.abs(ly) <= halfWidth) return true
        }
        return false
      }
    } else if (meshParams.maskType === 'round' && meshParams.round) {
      const { r } = meshParams.round
      const cy_c = meshParams.W / 2
      const cz_c = meshParams.H / 2
      maskFn = (_cx, cy, cz) => Math.hypot(cy - cy_c, cz - cz_c) <= r
      const spread = r * 0.4
      yPositions = gradePositions(meshParams.ny, meshParams.W, [cy_c - r, cy_c + r], spread)
      zPositions = gradePositions(meshParams.nz, meshParams.H, [cz_c - r, cz_c + r], spread)
    } else if (meshParams.maskType === 'round-hollow' && meshParams.roundHollow) {
      const { outerR, innerR } = meshParams.roundHollow
      const cy_c = meshParams.W / 2
      const cz_c = meshParams.H / 2
      maskFn = (_cx, cy, cz) => {
        const d = Math.hypot(cy - cy_c, cz - cz_c)
        return d > innerR && d <= outerR
      }
      const spread = Math.max((outerR - innerR) * 0.5, outerR * 0.1)
      yPositions = gradePositions(meshParams.ny, meshParams.W, [cy_c - outerR, cy_c - innerR, cy_c + innerR, cy_c + outerR], spread)
      zPositions = gradePositions(meshParams.nz, meshParams.H, [cz_c - outerR, cz_c - innerR, cz_c + innerR, cz_c + outerR], spread)
    } else if (meshParams.maskType === 'dualbeam' && meshParams.dualbeam) {
      const { T, beamSep, blockW } = meshParams.dualbeam
      // W = beamSep + T; lower beam occupies cy in [0, T], upper beam in [beamSep, W]
      maskFn = (cx, cy, _cz) => {
        if (cx <= blockW || cx >= meshParams.L - blockW) return true  // end blocks
        return cy <= T || cy >= beamSep                               // beam bands
      }
    } else if (meshParams.maskType === 'shearweb' && meshParams.shearweb) {
      const { voidH, webT } = meshParams.shearweb
      const cy_c = meshParams.W / 2
      const cz_c = meshParams.H / 2
      // I-section: keep flanges (outside void zone in Y) and web (inside webT in Z)
      maskFn = (_cx, cy, cz) => {
        const inVoidY = Math.abs(cy - cy_c) < voidH / 2
        const inVoidZ = Math.abs(cz - cz_c) > webT / 2
        return !(inVoidY && inVoidZ)
      }
    }

    const mesh = generateRectTet10Mesh({
      L: meshParams.L, W: meshParams.W, H: meshParams.H,
      nx: meshParams.nx, ny: meshParams.ny, nz: meshParams.nz,
      maskFn, yPositions, zPositions,
    })

    // For cross-beam: build composite fixed (outer ring) and hub load groups
    if (meshParams.maskType === 'crossbeam' && meshParams.crossbeam) {
      const { innerRadius } = meshParams.crossbeam
      const cxc = meshParams.L / 2
      const cyc = meshParams.W / 2
      const outerNodes = new Set<number>()
      for (const name of ['x0', 'xL', 'y0', 'yH']) {
        const g = mesh.faceGroups.get(name)
        if (g) for (const n of g) outerNodes.add(n)
      }
      mesh.faceGroups.set('crossbeam_outer', outerNodes)
      const hubNodes = new Set<number>()
      for (let n = 0; n < mesh.nodeCount; n++) {
        const x = mesh.nodes[n * 3] - cxc
        const y = mesh.nodes[n * 3 + 1] - cyc
        if (Math.hypot(x, y) < innerRadius * 1.2) hubNodes.add(n)
      }
      mesh.faceGroups.set('crossbeam_hub', hubNodes)
    }

    // For three-beam: build outer ring (fixed) and hub (load) face groups
    if (meshParams.maskType === 'threebeam' && meshParams.threebeam) {
      const { outerRadius, innerRadius } = meshParams.threebeam
      const cxc = meshParams.L / 2
      const cyc = meshParams.W / 2
      const outerNodes = new Set<number>()
      for (const name of ['x0', 'xL', 'y0', 'yH']) {
        const g = mesh.faceGroups.get(name)
        if (g) {
          for (const n of g) {
            const nx = mesh.nodes[n * 3] - cxc
            const ny = mesh.nodes[n * 3 + 1] - cyc
            if (Math.hypot(nx, ny) >= outerRadius * 0.9) outerNodes.add(n)
          }
        }
      }
      mesh.faceGroups.set('threebeam_outer', outerNodes)
      const hubNodes = new Set<number>()
      for (let n = 0; n < mesh.nodeCount; n++) {
        const nx = mesh.nodes[n * 3] - cxc
        const ny = mesh.nodes[n * 3 + 1] - cyc
        if (Math.hypot(nx, ny) < innerRadius * 1.2) hubNodes.add(n)
      }
      mesh.faceGroups.set('threebeam_hub', hubNodes)
    }

    self.postMessage({ type: 'progress', phase: 'Assembling K…', iter: 0, maxIter: 1 })

    // Build nodalForces for torsional loading if torqueX is specified
    let nodalForces: Float64Array | undefined
    if (solverParams.torqueX !== undefined && solverParams.torqueX !== 0) {
      const T = solverParams.torqueX
      const cy_c = meshParams.W / 2
      const cz_c = meshParams.H / 2
      const loadNodes = mesh.faceGroups.get(solverParams.loadGroup)
      if (loadNodes && loadNodes.size > 0) {
        // Compute polar moment sum for the load group nodes
        let J_nodes = 0
        for (const n of loadNodes) {
          const yn = mesh.nodes[n * 3 + 1] - cy_c
          const zn = mesh.nodes[n * 3 + 2] - cz_c
          J_nodes += yn * yn + zn * zn
        }
        if (J_nodes > 0) {
          nodalForces = new Float64Array(mesh.nodeCount * 3)
          for (const n of loadNodes) {
            const yn = mesh.nodes[n * 3 + 1] - cy_c
            const zn = mesh.nodes[n * 3 + 2] - cz_c
            nodalForces[n * 3 + 1] = -T * zn / J_nodes
            nodalForces[n * 3 + 2] =  T * yn / J_nodes
          }
        }
      }
    }

    const result = solveT10({
      mesh,
      E: solverParams.E,
      nu: solverParams.nu,
      fixedGroup: solverParams.fixedGroup,
      loadGroup:  solverParams.loadGroup,
      loadVector: solverParams.loadVector,
      nodalForces,
      onProgress: (iter, maxIter) => {
        self.postMessage({ type: 'progress', phase: 'PCG solver', iter, maxIter })
      },
    })

    // Serialize faceGroups (Map<string,Set<number>> → plain array for structured clone)
    const faceGroupsData: [string, number[]][] = []
    for (const [k, v] of mesh.faceGroups) faceGroupsData.push([k, Array.from(v)])

    // Transfer typed arrays zero-copy
    const transferables: Transferable[] = [
      mesh.nodes.buffer,
      mesh.tets.buffer,
      mesh.tets10.buffer,
      mesh.surfaceTris.buffer,
      result.displacements.buffer,
      result.vonMisesStress.buffer,
    ]

    self.postMessage({
      type: 'result',
      // mesh
      nodes:          mesh.nodes,
      tets:           mesh.tets,
      tets10:         mesh.tets10,
      surfaceTris:    mesh.surfaceTris,
      faceGroupsData,
      nodeCount:      mesh.nodeCount,
      tetCount:       mesh.tetCount,
      cornerCount:    mesh.cornerCount,
      // result
      displacements:   result.displacements,
      elementStrains:  result.elementStrains,
      nodalStrains:    result.nodalStrains,
      vonMisesStress:  result.vonMisesStress,
      maxDisplacement: result.maxDisplacement,
      tipDeflection:   result.tipDeflection,
    }, transferables)

  } catch (err) {
    self.postMessage({ type: 'error', message: String(err) })
  }
}
