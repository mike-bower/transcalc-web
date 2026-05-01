import { useCallback, useEffect, useRef, useState } from 'react'
import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import type { Tet4Mesh } from '../domain/fea/paramMesh'
import type { Tet4Result } from '../domain/fea/tet4Solver'

type ScalarKey = 'vonMises' | 'exx' | 'eyy' | 'ezz' | 'exy'
type DeformScale = 'auto' | '1x' | '10x' | '100x' | '1000x'

interface Props {
  mesh: Tet4Mesh
  result: Tet4Result
  height?: number
}

const SCALAR_LABELS: { key: ScalarKey; label: string }[] = [
  { key: 'vonMises', label: 'Von Mises' },
  { key: 'exx',      label: 'ε_xx' },
  { key: 'eyy',      label: 'ε_yy' },
  { key: 'ezz',      label: 'ε_zz' },
  { key: 'exy',      label: 'γ_xy' },
]

const DEFORM_OPTIONS: { key: DeformScale; label: string; mult: number | null }[] = [
  { key: 'auto',   label: 'Auto',  mult: null },
  { key: '1x',    label: '1×',   mult: 1 },
  { key: '10x',   label: '10×',  mult: 10 },
  { key: '100x',  label: '100×', mult: 100 },
  { key: '1000x', label: '1000×',mult: 1000 },
]

function jetColor(t: number): [number, number, number] {
  t = Math.max(0, Math.min(1, t))
  let r: number, g: number, b: number
  if (t < 0.25)      { r = 0;              g = t * 4;            b = 1 }
  else if (t < 0.5)  { r = 0;              g = 1;                b = 1 - (t - 0.25) * 4 }
  else if (t < 0.75) { r = (t - 0.5) * 4; g = 1;                b = 0 }
  else               { r = 1;              g = 1 - (t - 0.75)*4; b = 0 }
  return [r, g, b]
}

function getNodeScalar(n: number, key: ScalarKey, result: Tet4Result): number {
  if (key === 'vonMises') return result.vonMisesStress[n]
  return result.nodalStrains[n][key]
}

function computeDeformMult(mesh: Tet4Mesh, result: Tet4Result, deformScale: DeformScale): number {
  const opt = DEFORM_OPTIONS.find(o => o.key === deformScale)!
  if (opt.mult !== null) return opt.mult
  const n = mesh.nodeCount
  let xMin = Infinity, xMax = -Infinity, yMin = Infinity, yMax = -Infinity, zMin = Infinity, zMax = -Infinity
  for (let i = 0; i < n; i++) {
    const x = mesh.nodes[i*3], y = mesh.nodes[i*3+1], z = mesh.nodes[i*3+2]
    if (x < xMin) xMin = x; if (x > xMax) xMax = x
    if (y < yMin) yMin = y; if (y > yMax) yMax = y
    if (z < zMin) zMin = z; if (z > zMax) zMax = z
  }
  const diag = Math.sqrt((xMax-xMin)**2 + (yMax-yMin)**2 + (zMax-zMin)**2)
  return result.maxDisplacement > 1e-30 ? 0.20 * diag / result.maxDisplacement : 1
}

function buildPositionsAndColors(
  mesh: Tet4Mesh,
  result: Tet4Result,
  scalarKey: ScalarKey,
  deformMult: number,
): { positions: Float32Array; colors: Float32Array; normals: Float32Array; minVal: number; maxVal: number } {
  const { nodes, surfaceTris } = mesh
  const nTris = surfaceTris.length / 3
  const positions = new Float32Array(nTris * 9)
  const colors    = new Float32Array(nTris * 9)
  const normals   = new Float32Array(nTris * 9)

  // Collect scalar range across surface nodes
  const surfaceNodes = new Set<number>()
  for (let i = 0; i < surfaceTris.length; i++) surfaceNodes.add(surfaceTris[i])
  let minVal = Infinity, maxVal = -Infinity
  for (const n of surfaceNodes) {
    const v = getNodeScalar(n, scalarKey, result)
    if (v < minVal) minVal = v
    if (v > maxVal) maxVal = v
  }
  const range = maxVal - minVal || 1

  const v3 = new THREE.Vector3()
  for (let t = 0; t < nTris; t++) {
    const verts: [number, number, number][] = []
    for (let k = 0; k < 3; k++) {
      const n = surfaceTris[t * 3 + k]
      const bx = nodes[n * 3]     + result.displacements[n * 3]     * deformMult
      const by = nodes[n * 3 + 1] + result.displacements[n * 3 + 1] * deformMult
      const bz = nodes[n * 3 + 2] + result.displacements[n * 3 + 2] * deformMult
      verts.push([bx, by, bz])
      positions[(t * 3 + k) * 3]     = bx
      positions[(t * 3 + k) * 3 + 1] = by
      positions[(t * 3 + k) * 3 + 2] = bz
      const [r, g, b] = jetColor((getNodeScalar(n, scalarKey, result) - minVal) / range)
      colors[(t * 3 + k) * 3]     = r
      colors[(t * 3 + k) * 3 + 1] = g
      colors[(t * 3 + k) * 3 + 2] = b
    }
    const ax = verts[1][0]-verts[0][0], ay = verts[1][1]-verts[0][1], az = verts[1][2]-verts[0][2]
    const bx2 = verts[2][0]-verts[0][0], by2 = verts[2][1]-verts[0][1], bz2 = verts[2][2]-verts[0][2]
    v3.set(ay*bz2-az*by2, az*bx2-ax*bz2, ax*by2-ay*bx2).normalize()
    for (let k = 0; k < 3; k++) {
      normals[(t * 3 + k) * 3]     = v3.x
      normals[(t * 3 + k) * 3 + 1] = v3.y
      normals[(t * 3 + k) * 3 + 2] = v3.z
    }
  }
  return { positions, colors, normals, minVal, maxVal }
}

export default function FeaViewer3D({ mesh, result, height = 760 }: Props) {
  const hostRef = useRef<HTMLDivElement>(null)
  const axesRef = useRef<HTMLDivElement>(null)

  // Three.js objects that persist across re-renders
  const rendererRef  = useRef<THREE.WebGLRenderer | null>(null)
  const cameraRef    = useRef<THREE.PerspectiveCamera | null>(null)
  const controlsRef  = useRef<OrbitControls | null>(null)
  const surfMeshRef  = useRef<THREE.Mesh | null>(null)
  const wireMeshRef  = useRef<THREE.LineSegments | null>(null)
  const sceneRef     = useRef<THREE.Scene | null>(null)
  const animIdRef    = useRef<number>(0)
  const axesRendRef  = useRef<THREE.WebGLRenderer | null>(null)
  const axesCamRef   = useRef<THREE.PerspectiveCamera | null>(null)
  const axesSceneRef = useRef<THREE.Scene | null>(null)
  const centerRef    = useRef<THREE.Vector3>(new THREE.Vector3())
  const distRef      = useRef<number>(1)

  const [scalarKey,   setScalarKey]   = useState<ScalarKey>('vonMises')
  const [deformScale, setDeformScale] = useState<DeformScale>('auto')
  const [wireframe,   setWireframe]   = useState(false)
  const [range,       setRange]       = useState<{ min: number; max: number }>({ min: 0, max: 1 })

  // ── Scene setup: runs only when mesh/result change ──────────────────────────
  useEffect(() => {
    const host = hostRef.current
    if (!host) return

    // Dispose previous scene
    if (rendererRef.current) {
      cancelAnimationFrame(animIdRef.current)
      controlsRef.current?.dispose()
      rendererRef.current.dispose()
      if (host.contains(rendererRef.current.domElement)) host.removeChild(rendererRef.current.domElement)
      rendererRef.current = null
    }
    if (axesRendRef.current) {
      axesRendRef.current.dispose()
      const axHost = axesRef.current
      if (axHost && axHost.contains(axesRendRef.current.domElement)) axHost.removeChild(axesRendRef.current.domElement)
      axesRendRef.current = null
    }

    const W = Math.max(host.clientWidth, 100)
    const H = Math.max(host.clientHeight, 100)

    const renderer = new THREE.WebGLRenderer({ antialias: true })
    renderer.setPixelRatio(window.devicePixelRatio)
    renderer.setSize(W, H)
    renderer.shadowMap.enabled = false
    host.appendChild(renderer.domElement)
    rendererRef.current = renderer

    const scene = new THREE.Scene()
    scene.background = new THREE.Color(0xffffff)
    scene.add(new THREE.AmbientLight(0xffffff, 0.75))
    const dir = new THREE.DirectionalLight(0xffffff, 1.0)
    dir.position.set(4, 5, 3)
    scene.add(dir)
    sceneRef.current = scene

    // Build initial geometry
    const deformMult = computeDeformMult(mesh, result, deformScale)
    const { positions, colors, normals, minVal, maxVal } =
      buildPositionsAndColors(mesh, result, scalarKey, deformMult)
    setRange({ min: minVal, max: maxVal })

    const geo = new THREE.BufferGeometry()
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3))
    geo.setAttribute('color',    new THREE.BufferAttribute(colors, 3))
    geo.setAttribute('normal',   new THREE.BufferAttribute(normals, 3))

    const mat = new THREE.MeshLambertMaterial({ vertexColors: true, side: THREE.DoubleSide })
    const surfMesh = new THREE.Mesh(geo, mat)
    scene.add(surfMesh)
    surfMeshRef.current = surfMesh

    // Wireframe
    wireMeshRef.current = null
    if (wireframe) {
      const edges = new THREE.EdgesGeometry(geo)
      const wm = new THREE.LineSegments(edges, new THREE.LineBasicMaterial({ color: 0x444444, opacity: 0.3, transparent: true }))
      scene.add(wm)
      wireMeshRef.current = wm
    }

    // Fit camera to bounding box of deformed mesh
    const box = new THREE.Box3().setFromBufferAttribute(geo.attributes.position as THREE.BufferAttribute)
    const center = new THREE.Vector3()
    const size = new THREE.Vector3()
    box.getCenter(center)
    box.getSize(size)
    centerRef.current.copy(center)

    const maxDim = Math.max(size.x, size.y, size.z, 1e-6)
    const dist = maxDim * 2.8
    distRef.current = dist

    const camera = new THREE.PerspectiveCamera(45, W / H, dist * 0.001, dist * 200)
    camera.position.copy(center).addScaledVector(
      new THREE.Vector3(1, 0.8, 1).normalize(), dist
    )
    camera.lookAt(center)
    cameraRef.current = camera

    const controls = new OrbitControls(camera, renderer.domElement)
    controls.target.copy(center)
    controls.enableDamping = true
    controls.dampingFactor = 0.08
    controls.enablePan = true
    controls.enableZoom = true
    controls.update()
    controls.saveState()
    controlsRef.current = controls

    // Axes gizmo
    const axHost = axesRef.current
    if (axHost) {
      const axRend = new THREE.WebGLRenderer({ antialias: true, alpha: true })
      axRend.setPixelRatio(window.devicePixelRatio)
      axRend.setSize(80, 80)
      axRend.setClearColor(0x000000, 0)
      axHost.appendChild(axRend.domElement)
      axesRendRef.current = axRend
      const axScene = new THREE.Scene()
      axScene.add(new THREE.AxesHelper(0.8))
      axesSceneRef.current = axScene
      const axCam = new THREE.PerspectiveCamera(50, 1, 0.1, 10)
      axCam.position.set(0, 0, 2)
      axesCamRef.current = axCam
    }

    // Resize observer
    const obs = new ResizeObserver(() => {
      if (!host || !cameraRef.current || !rendererRef.current) return
      const w = host.clientWidth, h = host.clientHeight
      if (w === 0 || h === 0) return
      cameraRef.current.aspect = w / h
      cameraRef.current.updateProjectionMatrix()
      rendererRef.current.setSize(w, h)
    })
    obs.observe(host)

    // Animation loop
    function animate() {
      animIdRef.current = requestAnimationFrame(animate)
      controlsRef.current?.update()
      if (sceneRef.current && cameraRef.current) renderer.render(sceneRef.current, cameraRef.current)
      if (axesRendRef.current && axesSceneRef.current && axesCamRef.current && cameraRef.current) {
        axesCamRef.current.quaternion.copy(cameraRef.current.quaternion)
        axesRendRef.current.render(axesSceneRef.current, axesCamRef.current)
      }
    }
    animate()

    return () => {
      cancelAnimationFrame(animIdRef.current)
      obs.disconnect()
      controlsRef.current?.dispose()
      controlsRef.current = null
      renderer.dispose()
      geo.dispose()
      mat.dispose()
      if (host.contains(renderer.domElement)) host.removeChild(renderer.domElement)
      rendererRef.current = null
      if (axesRendRef.current) {
        axesRendRef.current.dispose()
        if (axHost && axHost.contains(axesRendRef.current.domElement)) axHost.removeChild(axesRendRef.current.domElement)
        axesRendRef.current = null
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mesh, result])

  // ── Visual update: runs when scalar/deform/wireframe change ─────────────────
  useEffect(() => {
    const surfMesh = surfMeshRef.current
    const scene = sceneRef.current
    if (!surfMesh || !scene) return

    const deformMult = computeDeformMult(mesh, result, deformScale)
    const { positions, colors, normals, minVal, maxVal } =
      buildPositionsAndColors(mesh, result, scalarKey, deformMult)
    setRange({ min: minVal, max: maxVal })

    const geo = surfMesh.geometry as THREE.BufferGeometry
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3))
    geo.setAttribute('color',    new THREE.BufferAttribute(colors, 3))
    geo.setAttribute('normal',   new THREE.BufferAttribute(normals, 3))
    geo.attributes.position.needsUpdate = true
    geo.attributes.color.needsUpdate    = true
    geo.attributes.normal.needsUpdate   = true
    geo.computeBoundingBox()

    // Wireframe
    if (wireMeshRef.current) { scene.remove(wireMeshRef.current); wireMeshRef.current.geometry.dispose(); wireMeshRef.current = null }
    if (wireframe) {
      const edges = new THREE.EdgesGeometry(geo)
      const wm = new THREE.LineSegments(edges, new THREE.LineBasicMaterial({ color: 0x444444, opacity: 0.3, transparent: true }))
      scene.add(wm)
      wireMeshRef.current = wm
    }
  }, [mesh, result, scalarKey, deformScale, wireframe])

  const resetView = useCallback(() => {
    const controls = controlsRef.current
    if (controls) controls.reset()
  }, [])

  const btnStyle = (active: boolean): React.CSSProperties => ({
    fontSize: '0.72rem', padding: '3px 7px',
    border: '1px solid', borderRadius: 3, cursor: 'pointer',
    background: active ? 'rgba(37,99,235,0.55)' : 'rgba(51,65,85,0.35)',
    borderColor: active ? 'rgba(96,165,250,0.7)' : 'rgba(71,85,105,0.4)',
    color: '#f8fafc',
  })

  const fmtVal = (v: number) => {
    const abs = Math.abs(v)
    if (abs === 0) return '0'
    if (abs < 1e-6) return v.toExponential(2)
    if (abs < 1e-3) return (v * 1e6).toFixed(1) + 'µ'
    return v.toPrecision(3)
  }

  return (
    <div style={{ position: 'relative', width: '100%', height, minHeight: 0, overflow: 'hidden' }}>
      <div ref={hostRef} style={{ height: '100%', border: 'none', background: 'transparent' }} />

      {/* Color scale bar — left side */}
      <div style={{ position: 'absolute', bottom: 106, left: 10, pointerEvents: 'none', userSelect: 'none' }}>
        <div style={{ fontSize: 9, color: '#cbd5e1', fontFamily: 'monospace', textAlign: 'center', marginBottom: 3, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
          {SCALAR_LABELS.find(s => s.key === scalarKey)?.label}
        </div>
        <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'stretch', gap: 4 }}>
          <div style={{ width: 14, height: 120, borderRadius: 3, flexShrink: 0, background: 'linear-gradient(to top, #0000ff 0%, #00ffff 25%, #00ff00 50%, #ffff00 75%, #ff0000 100%)', border: '1px solid rgba(255,255,255,0.25)', boxShadow: '0 1px 4px rgba(0,0,0,0.4)' }} />
          <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', color: '#e2e8f0', fontSize: 9, fontFamily: 'monospace', background: 'rgba(15,23,42,0.55)', padding: '2px 5px', borderRadius: 3, border: '1px solid rgba(71,85,105,0.4)', lineHeight: 1.2 }}>
            <span>{fmtVal(range.max)}</span>
            <span>{fmtVal((range.max + range.min) / 2)}</span>
            <span>{fmtVal(range.min)}</span>
          </div>
        </div>
      </div>

      {/* XYZ axes widget — bottom left */}
      <div style={{ position: 'absolute', bottom: 10, left: 10, pointerEvents: 'none' }}>
        <div ref={axesRef} style={{ width: 80, height: 80, borderRadius: 4, overflow: 'hidden', background: 'rgba(15,23,42,0.45)' }} />
        <div style={{ display: 'flex', gap: 8, justifyContent: 'center', marginTop: 2, fontSize: 10, fontWeight: 700, letterSpacing: '0.05em' }}>
          <span style={{ color: '#ef4444' }}>X</span>
          <span style={{ color: '#22c55e' }}>Y</span>
          <span style={{ color: '#60a5fa' }}>Z</span>
        </div>
      </div>

      {/* Controls overlay — top right */}
      <div style={{ position: 'absolute', top: 10, right: 10, zIndex: 10, backgroundColor: 'rgba(30,41,59,0.75)', padding: '6px 8px', borderRadius: 4, fontSize: 11, display: 'flex', flexDirection: 'column', gap: 5, border: '1px solid rgba(71,85,105,0.5)', color: '#f8fafc' }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 3 }}>
          {SCALAR_LABELS.map(({ key, label }) => (
            <button key={key} style={btnStyle(scalarKey === key)} onClick={() => setScalarKey(key)}>{label}</button>
          ))}
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 3 }}>
          {DEFORM_OPTIONS.map(({ key, label }) => (
            <button key={key} style={btnStyle(deformScale === key)} onClick={() => setDeformScale(key)}>{label}</button>
          ))}
          <button style={btnStyle(wireframe)} onClick={() => setWireframe(v => !v)}>Wire</button>
        </div>
        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <button style={{ ...btnStyle(false), fontSize: '0.70rem' }} onClick={resetView} title="Reset camera to fit model">⟳ Reset view</button>
        </div>
      </div>
    </div>
  )
}
