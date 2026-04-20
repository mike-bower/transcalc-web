import { useEffect, useMemo, useRef, useState } from 'react'
import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'

/**
 * 3D parametric model viewer for the Round Solid Torque Shaft.
 *
 * Geometry: a solid cylindrical shaft under pure torsion.
 * Four strain gages at ±45° to the shaft axis, evenly spaced
 * at 90° intervals around the circumference at mid-span.
 * The 45° alignment captures the maximum principal strain = γ / 2
 * where γ = τ / G = (T·r/J) / G.
 */

type Props = { params: Record<string, number>; us?: boolean }

function p(params: Record<string, number>, key: string, fallback: number): number {
  const v = params[key]; return Number.isFinite(v) && v > 0 ? v : fallback
}
function clamp(v: number, lo: number, hi: number) { return Math.min(hi, Math.max(lo, v)) }

function makeTextSprite(text: string): THREE.Sprite {
  const canvas = document.createElement('canvas')
  canvas.width = 512; canvas.height = 128
  const ctx = canvas.getContext('2d')
  if (ctx) {
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    ctx.fillStyle = '#1f3f5c'; ctx.font = 'bold 32px Barlow, sans-serif'
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
    ctx.fillText(text, canvas.width / 2, canvas.height / 2)
  }
  const mat = new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(canvas), transparent: true })
  const sprite = new THREE.Sprite(mat); sprite.scale.set(0.65, 0.17, 1); return sprite
}

function addDimensionLine(
  group: THREE.Group, from: THREE.Vector3, to: THREE.Vector3,
  text: string, normal: THREE.Vector3,
) {
  const mat = new THREE.LineBasicMaterial({ color: 0x3e5a73, transparent: true, opacity: 0.8 })
  group.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints([from, to]), mat))
  const n = normal.clone().normalize().multiplyScalar(0.03)
  group.add(
    new THREE.Line(new THREE.BufferGeometry().setFromPoints([from.clone().sub(n), from.clone().add(n)]), mat),
    new THREE.Line(new THREE.BufferGeometry().setFromPoints([to.clone().sub(n), to.clone().add(n)]), mat),
  )
  const label = makeTextSprite(text)
  label.position.copy(from.clone().add(to).multiplyScalar(0.5).add(normal.clone().normalize().multiplyScalar(0.08)))
  group.add(label)
}

function addTorqueArrow(group: THREE.Group, xPos: number, R: number, clockwise: boolean) {
  const color = 0x1f2f3f
  const nPts = 48
  const sweep = Math.PI * 1.5
  const startA = clockwise ? 0 : Math.PI
  const pts: THREE.Vector3[] = []
  for (let i = 0; i <= nPts; i++) {
    const a = startA + (clockwise ? 1 : -1) * (i / nPts) * sweep
    pts.push(new THREE.Vector3(xPos, R * Math.cos(a), R * Math.sin(a)))
  }
  const curve = new THREE.CatmullRomCurve3(pts)
  group.add(new THREE.Mesh(
    new THREE.TubeGeometry(curve, nPts, R * 0.04, 6, false),
    new THREE.MeshStandardMaterial({ color, roughness: 0.4 }),
  ))
  const tip = pts[pts.length - 1]
  const dir = tip.clone().sub(pts[pts.length - 3]).normalize()
  const cone = new THREE.Mesh(
    new THREE.ConeGeometry(R * 0.11, R * 0.28, 8),
    new THREE.MeshStandardMaterial({ color, roughness: 0.4 }),
  )
  cone.position.copy(tip)
  cone.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir)
  group.add(cone)
}

function RoundSolidTorque3D({ params, us }: { params: Record<string, number>; us?: boolean }) {
  const hostRef = useRef<HTMLDivElement | null>(null)
  const [showDimensions, setShowDimensions] = useState(true)

  const model = useMemo(() => {
    const g = new THREE.Group()
    const mmToScene = 1 / 60

    const torqueNmm = p(params, 'torque', 1000)
    const diamMm = p(params, 'diameter', 25)

    const fmt = (v: number) => us ? (v / 25.4).toFixed(3) : v.toFixed(1)
    const uLabel = us ? 'in' : 'mm'
    const torqueStr = us ? `${(torqueNmm / 112.985).toFixed(2)} in·lb` : `${torqueNmm.toFixed(0)} N·mm`

    const R = clamp((diamMm / 2) * mmToScene, 0.06, 0.50)
    const L = clamp(3 * diamMm * mmToScene, 0.50, 3.0)

    // ── Shaft body ────────────────────────────────────────────────────────
    const bodyMat = new THREE.MeshStandardMaterial({ color: 0x4a88b8, roughness: 0.45, metalness: 0.1 })
    const shaft = new THREE.Mesh(new THREE.CylinderGeometry(R, R, L, 32), bodyMat)
    shaft.rotation.z = Math.PI / 2; g.add(shaft)

    // ── Fixed support (left wall, circular) ───────────────────────────────
    const wallMat = new THREE.MeshStandardMaterial({ color: 0x3a6888, roughness: 0.55, metalness: 0.15 })
    const wallT = L * 0.07
    const wall = new THREE.Mesh(new THREE.CylinderGeometry(R * 1.8, R * 1.8, wallT, 32), wallMat)
    wall.rotation.z = Math.PI / 2; wall.position.set(-L / 2 - wallT / 2, 0, 0); g.add(wall)
    const hatchMat = new THREE.LineBasicMaterial({ color: 0x1a2535, transparent: true, opacity: 0.6 })
    const hX = -L / 2 - wallT - 0.003
    for (let i = -2; i <= 2; i++) {
      g.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(hX, -R * 1.4, i * R * 0.55 - 0.03),
        new THREE.Vector3(hX, R * 1.4, i * R * 0.55 + 0.03),
      ]), hatchMat))
    }

    // ── Gage pads at 45° — four positions around circumference ────────────
    const padSize = clamp(R * 0.8, 0.04, 0.18)
    const padT = 0.007
    const gageMat = new THREE.MeshStandardMaterial({ color: 0xf0a451, roughness: 0.5, metalness: 0.06 })

    for (let i = 0; i < 4; i++) {
      const angle = (i / 4) * Math.PI * 2
      const py = R * Math.cos(angle)
      const pz = R * Math.sin(angle)
      // Surface normal at this position points in (0, cos, sin) direction
      // Pad is tangent to the surface, aligned at 45° to shaft axis
      const pad = new THREE.Mesh(new THREE.BoxGeometry(padSize, padSize, padT), gageMat)
      pad.position.set(0, py + Math.cos(angle) * padT / 2, pz + Math.sin(angle) * padT / 2)
      // First align the pad's Z normal to the surface normal
      pad.quaternion.setFromUnitVectors(
        new THREE.Vector3(0, 0, 1),
        new THREE.Vector3(0, Math.cos(angle), Math.sin(angle)),
      )
      // Then rotate 45° about the surface normal (shaft axis direction)
      const rotAxis = new THREE.Vector3(0, Math.cos(angle), Math.sin(angle)).normalize()
      pad.rotateOnAxis(rotAxis, Math.PI / 4)
      g.add(pad)
    }

    const lbl = makeTextSprite('45° gages')
    lbl.scale.set(0.30, 0.10, 1); lbl.position.set(0, R + 0.14, R + 0.06); g.add(lbl)

    // ── Torsion arrow at right end ────────────────────────────────────────
    addTorqueArrow(g, L / 2 + 0.06, R * 1.3, true)

    // ── Dimension lines ───────────────────────────────────────────────────
    const dim = new THREE.Group()
    addDimensionLine(dim,
      new THREE.Vector3(0, -R, R + 0.14), new THREE.Vector3(0, R, R + 0.14),
      `D=${fmt(diamMm)} ${uLabel}`, new THREE.Vector3(0, 0, 1),
    )
    const tLabel = makeTextSprite(torqueStr)
    tLabel.position.set(L / 2 + R * 1.8, R * 1.3, 0); dim.add(tLabel)
    dim.visible = showDimensions; g.add(dim)
    return g
  }, [params, us, showDimensions])

  useEffect(() => {
    if (!hostRef.current) return
    const host = hostRef.current
    const scene = new THREE.Scene(); scene.background = new THREE.Color(0xffffff)
    const camera = new THREE.PerspectiveCamera(45, host.clientWidth / Math.max(1, host.clientHeight), 0.1, 100)
    camera.position.set(1.8, 1.4, 2.6)
    const renderer = new THREE.WebGLRenderer({ antialias: true })
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    renderer.setSize(host.clientWidth, host.clientHeight); host.appendChild(renderer.domElement)
    const controls = new OrbitControls(camera, renderer.domElement)
    controls.enableDamping = true; controls.dampingFactor = 0.08
    controls.target.set(0, 0, 0); controls.update()
    scene.add(new THREE.AmbientLight(0xffffff, 0.75))
    const dl = new THREE.DirectionalLight(0xffffff, 1.0); dl.position.set(4, 5, 3); scene.add(dl)
    scene.add(new THREE.GridHelper(6, 14, 0xcccccc, 0xeeeeee))
    const root = new THREE.Group(); scene.add(root); root.add(model)
    let raf = 0
    const animate = () => { raf = requestAnimationFrame(animate); controls.update(); renderer.render(scene, camera) }
    animate()
    const ro = new ResizeObserver(() => {
      const w = host.clientWidth, h = host.clientHeight
      if (w === 0 || h === 0) return
      renderer.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix()
    })
    ro.observe(host)
    return () => {
      cancelAnimationFrame(raf); ro.disconnect(); controls.dispose(); renderer.dispose()
      if (host.contains(renderer.domElement)) host.removeChild(renderer.domElement)
    }
  }, [model])

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%', minHeight: '0', overflow: 'hidden' }}>
      <div ref={hostRef} className="transducer-3d-canvas" style={{ height: '100%', border: 'none', background: 'transparent' }} />
      <div style={{
        position: 'absolute', top: '10px', right: '10px', zIndex: 10,
        backgroundColor: 'rgba(30,41,59,0.7)', padding: '4px 8px', borderRadius: '4px',
        fontSize: '11px', display: 'flex', alignItems: 'center', gap: '6px',
        border: '1px solid rgba(71,85,105,0.5)', color: '#f8fafc', pointerEvents: 'auto',
      }}>
        <input type="checkbox" id="rsldtq-dims" checked={showDimensions} onChange={e => setShowDimensions(e.target.checked)} style={{ margin: 0 }} />
        <label htmlFor="rsldtq-dims" style={{ cursor: 'pointer', margin: 0, fontWeight: 500 }}>Dimensions</label>
      </div>
    </div>
  )
}

export default function RoundSolidTorqueModelPreview({ params, us }: Props) {
  return (
    <div className="transducer-svg-wrap" style={{ height: '400px' }}>
      <RoundSolidTorque3D params={params} us={us} />
    </div>
  )
}
