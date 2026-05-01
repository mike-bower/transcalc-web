export interface RectTetMeshParams {
  L: number   // physical length (x axis)
  W: number   // physical width  (y axis)
  H: number   // physical height (z axis)
  nx: number  // hex cell count along x
  ny: number  // hex cell count along y
  nz: number  // hex cell count along z
  maskFn?: (cx: number, cy: number, cz: number) => boolean
}

export interface Tet4Mesh {
  nodes:       Float64Array           // [x0,y0,z0, x1,y1,z1, ...] flattened
  tets:        Int32Array             // [n0,n1,n2,n3, ...] 4 nodes per tet
  surfaceTris: Int32Array             // [n0,n1,n2, ...] outer boundary triangles
  faceGroups:  Map<string, Set<number>> // node-index sets for BC assignment
  nodeCount:   number
  tetCount:    number
}

// Freudenthal partition of a hex into 5 tetrahedra.
// Hex nodes in VTK H8 order (right-hand rule):
//   bottom face: v0(0,0,0) v1(1,0,0) v2(1,1,0) v3(0,1,0)
//   top    face: v4(0,0,1) v5(1,0,1) v6(1,1,1) v7(0,1,1)
const FREUDENTHAL_TETS: [number, number, number, number][] = [
  [0, 1, 3, 4],
  [1, 2, 3, 6],
  [4, 5, 6, 1],
  [4, 6, 7, 3],
  [1, 3, 4, 6],
]

export function generateRectTetMesh(p: RectTetMeshParams): Tet4Mesh {
  const { L, W, H, nx, ny, nz, maskFn } = p

  // Build node grid (nx+1)(ny+1)(nz+1) nodes
  const NX = nx + 1, NY = ny + 1, NZ = nz + 1
  const totalNodes = NX * NY * NZ
  const nodes = new Float64Array(totalNodes * 3)
  const nodeIdx = (i: number, j: number, k: number) => (i * NY + j) * NZ + k

  for (let i = 0; i < NX; i++)
    for (let j = 0; j < NY; j++)
      for (let k = 0; k < NZ; k++) {
        const n = nodeIdx(i, j, k)
        nodes[n * 3]     = (i / nx) * L
        nodes[n * 3 + 1] = (j / ny) * W
        nodes[n * 3 + 2] = (k / nz) * H
      }

  // Build tet connectivity — only for active cells
  const tetList: number[] = []

  for (let i = 0; i < nx; i++) {
    for (let j = 0; j < ny; j++) {
      for (let k = 0; k < nz; k++) {
        // Cell centre
        const cx = ((i + 0.5) / nx) * L
        const cy = ((j + 0.5) / ny) * W
        const cz = ((k + 0.5) / nz) * H
        if (maskFn && !maskFn(cx, cy, cz)) continue

        // Hex node indices in VTK H8 order
        const v: number[] = [
          nodeIdx(i,   j,   k  ),  // 0
          nodeIdx(i+1, j,   k  ),  // 1
          nodeIdx(i+1, j+1, k  ),  // 2
          nodeIdx(i,   j+1, k  ),  // 3
          nodeIdx(i,   j,   k+1),  // 4
          nodeIdx(i+1, j,   k+1),  // 5
          nodeIdx(i+1, j+1, k+1),  // 6
          nodeIdx(i,   j+1, k+1),  // 7
        ]
        for (const [a, b, c, d] of FREUDENTHAL_TETS) {
          tetList.push(v[a], v[b], v[c], v[d])
        }
      }
    }
  }

  const tets = new Int32Array(tetList)

  // Extract surface triangles — count how many tets share each triangle face
  // A face (sorted triple) that appears exactly once is a surface face.
  const faceMap = new Map<string, { nodes: [number,number,number]; count: number }>()

  const tetFaces: [number, number, number][] = [
    [0, 2, 1], [0, 1, 3], [1, 2, 3], [0, 3, 2],
  ]

  for (let t = 0; t < tets.length; t += 4) {
    const tn = [tets[t], tets[t+1], tets[t+2], tets[t+3]]
    for (const [a, b, c] of tetFaces) {
      const tri: [number,number,number] = [tn[a], tn[b], tn[c]]
      const key = [...tri].sort((x, y) => x - y).join(',')
      if (faceMap.has(key)) {
        faceMap.get(key)!.count++
      } else {
        faceMap.set(key, { nodes: tri, count: 1 })
      }
    }
  }

  const surfList: number[] = []
  for (const { nodes: tri, count } of faceMap.values()) {
    if (count === 1) surfList.push(tri[0], tri[1], tri[2])
  }
  const surfaceTris = new Int32Array(surfList)

  // Build face groups from node coordinate proximity to bounding faces
  const eps = Math.min(L / nx, W / ny, H / nz) * 0.01
  const groups: Map<string, Set<number>> = new Map([
    ['x0', new Set()], ['xL', new Set()],
    ['y0', new Set()], ['yW', new Set()],
    ['z0', new Set()], ['zH', new Set()],
  ])

  // Only tag nodes that appear in surface triangles
  const surfNodeSet = new Set<number>()
  for (let i = 0; i < surfaceTris.length; i++) surfNodeSet.add(surfaceTris[i])

  for (const n of surfNodeSet) {
    const x = nodes[n * 3], y = nodes[n * 3 + 1], z = nodes[n * 3 + 2]
    if (x < eps)      groups.get('x0')!.add(n)
    if (x > L - eps)  groups.get('xL')!.add(n)
    if (y < eps)      groups.get('y0')!.add(n)
    if (y > W - eps)  groups.get('yW')!.add(n)
    if (z < eps)      groups.get('z0')!.add(n)
    if (z > H - eps)  groups.get('zH')!.add(n)
  }

  return {
    nodes,
    tets,
    surfaceTris,
    faceGroups: groups,
    nodeCount: totalNodes,
    tetCount: tets.length / 4,
  }
}

// ── T10 quadratic tetrahedral mesh ────────────────────────────────────────────
// Extends T4 by adding one midside node per edge (6 per tet).
// tets10: [n0,n1,n2,n3, m01,m02,m03,m12,m13,m23, ...] (10 entries per tet)
// midside ordering matches shape function numbering in tet10Solver.ts.
export interface Tet10Mesh extends Tet4Mesh {
  tets10:      Int32Array  // 10 entries per tet
  cornerCount: number      // original T4 corner node count
}

export function generateRectTet10Mesh(p: RectTetMeshParams): Tet10Mesh {
  const t4 = generateRectTetMesh(p)
  const { L, W, H, nx, ny, nz } = p
  const cornerCount = t4.nodeCount

  // Edge (lo < hi) encoded as a unique integer for fast Map lookup
  const edgeMap = new Map<number, number>()
  const midCoords: number[] = []
  let nextNode = cornerCount

  const edgeKey = (a: number, b: number) =>
    a < b ? a * (cornerCount + 1) + b : b * (cornerCount + 1) + a

  // 6 local edge pairs per tet (corner index pairs a,b within [0..3])
  // Order determines midside positions 4..9 in tets10 connectivity.
  const EP: [number, number][] = [[0,1],[0,2],[0,3],[1,2],[1,3],[2,3]]

  const nTets = t4.tetCount
  const tets10List = new Int32Array(nTets * 10)

  for (let t = 0; t < nTets; t++) {
    const c = [t4.tets[t*4], t4.tets[t*4+1], t4.tets[t*4+2], t4.tets[t*4+3]]
    tets10List[t*10]   = c[0]; tets10List[t*10+1] = c[1]
    tets10List[t*10+2] = c[2]; tets10List[t*10+3] = c[3]

    for (let e = 0; e < 6; e++) {
      const na = c[EP[e][0]], nb = c[EP[e][1]]
      const k = edgeKey(na, nb)
      let m = edgeMap.get(k)
      if (m === undefined) {
        m = nextNode++
        edgeMap.set(k, m)
        midCoords.push(
          (t4.nodes[na*3]   + t4.nodes[nb*3])   / 2,
          (t4.nodes[na*3+1] + t4.nodes[nb*3+1]) / 2,
          (t4.nodes[na*3+2] + t4.nodes[nb*3+2]) / 2,
        )
      }
      tets10List[t*10 + 4 + e] = m
    }
  }

  // Combine corner and midside coordinates
  const allNodes = new Float64Array(nextNode * 3)
  allNodes.set(t4.nodes)
  for (let i = 0; i < midCoords.length; i++) allNodes[cornerCount*3 + i] = midCoords[i]

  // Rebuild face groups over all nodes (corner + midside)
  const eps = Math.min(L / nx, W / ny, H / nz) * 0.01
  const groups: Map<string, Set<number>> = new Map([
    ['x0', new Set()], ['xL', new Set()],
    ['y0', new Set()], ['yW', new Set()],
    ['z0', new Set()], ['zH', new Set()],
  ])
  for (let n = 0; n < nextNode; n++) {
    const x = allNodes[n*3], y = allNodes[n*3+1], z = allNodes[n*3+2]
    if (x < eps)      groups.get('x0')!.add(n)
    if (x > L - eps)  groups.get('xL')!.add(n)
    if (y < eps)      groups.get('y0')!.add(n)
    if (y > W - eps)  groups.get('yW')!.add(n)
    if (z < eps)      groups.get('z0')!.add(n)
    if (z > H - eps)  groups.get('zH')!.add(n)
  }

  return {
    nodes:       allNodes,
    tets:        t4.tets,       // T4 corner connectivity (for surface extraction)
    tets10:      tets10List,
    surfaceTris: t4.surfaceTris,
    faceGroups:  groups,
    nodeCount:   nextNode,
    cornerCount,
    tetCount:    nTets,
  }
}
