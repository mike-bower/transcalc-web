import { useEffect, useMemo, useRef, useState } from 'react'
import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'

/**
 * 3D parametric model viewer for the Square Torque Shaft.
 *
 * Geometry: a square cross-section shaft under torsion.
 * Four strain gages at ±45° on the four flat faces at mid-span.
 * At 45° to the shaft axis the gage aligns with the maximum
 * principal strain = γ / 2 (from Saint-Venant torsion).
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

/** Curved torsion arrow in the YZ plane at x=xPos, radius R, sweeping 270° */
function addTorqueArrow(group: THREE.Group, xPos: number, R: number, clockwise: boolean) {
  const color = 0x1f2f3f
  const nPts = 48
  const sweep = Math.PI * 1.5  // 270°
  const pts: THREE.Vector3[] = []
  const startA = clockwise ? 0 : Math.PI
  for (let i = 0; i <= nPts; i++) {
    const a = startA + (clockwise ? 1 : -1) * (i / nPts) * sweep
    pts.push(new THREE.Vector3(xPos, R * Math.cos(a), R * Math.sin(a)))
  }
  const curve = new THREE.CatmullRomCurve3(pts)
  const tube = new THREE.Mesh(
    new THREE.TubeGeometry(curve, nPts, R * 0.04, 6, false),
    new THREE.MeshStandardMaterial({ color, roughness: 0.4 }),
  )
  group.add(tube)

  // Arrowhead cone at tip
  const tip = pts[pts.length - 1]
  const near = pts[pts.length - 3]
  const dir = tip.clone().sub(near).normalize()
  const cone = new THREE.Mesh(
    new THREE.ConeGeometry(R * 0.11, R * 0.28, 8),
    new THREE.MeshStandardMaterial({ color, roughness: 0.4 }),
  )
  cone.position.copy(tip)
  cone.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir)
  group.add(cone)
}

function SquareTorque3D({ params, us }: { params: Record<string, number>; us?: boolean }) {
  const hostRef = useRef<HTMLDivElement | null>(null)
  const [showDimensions, setShowDimensions] = useState(true)

  const model = useMemo(() => {
    const g = new THREE.Group()
    const mmToScene = 1 / 60

    const torqueNmm = p(params, 'torque', 1000)
    const widthMm = p(params, 'width', 25)
    const gageLenMm = p(params, 'gageLength', 5)

    const fmt = (v: number) => us ? (v / 25.4).toFixed(3) : v.toFixed(1)
    const uLabel = us ? 'in' : 'mm'
    const torqueStr = us ? `${(torqueNmm / 112.985).toFixed(2)} in·lb` : `${torqueNmm.toFixed(0)} N·mm`

    const W = clamp(widthMm * mmToScene, 0.10, 0.60)
    const L = clamp(3 * widthMm * mmToScene, 0.50, 3.0)
    const GL = clamp(gageLenMm * mmToScene, 0.03, W * 0.6)

    // ── Shaft body ────────────────────────────────────────────────────────
    const bodyMat = new THREE.MeshStandardMaterial({ color: 0x4a88b8, roughness: 0.45, metalness: 0.1 })
    g.add(new THREE.Mesh(new THREE.BoxGeometry(L, W, W), bodyMat))

    // ── Fixed support (left wall) ─────────────────────────────────────────
    const wallMat = new THREE.MeshStandardMaterial({ color: 0x3a6888, roughness: 0.55, metalness: 0.15 })
    const wallT = L * 0.07
    g.add(Object.assign(new THREE.Mesh(new THREE.BoxGeometry(wallT, W * 2, W * 2), wallMat), {
      position: new THREE.Vector3(-L / 2 - wallT / 2, 0, 0),
    }))
    const hatchMat = new THREE.LineBasicMaterial({ color: 0x1a2535, transparent: true, opacity: 0.6 })
    const hX = -L / 2 - wallT - 0.003
    for (let i = -2; i <= 2; i++) {
      g.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(hX, -W * 0.8, i * W * 0.35 - 0.03),
        new THREE.Vector3(hX, W * 0.8, i * W * 0.35 + 0.03),
      ]), hatchMat))
    }

    // ── Gage pads at ±45° on each flat face ───────────────────────────────
    const padT = 0.007
    const gageMat = new THREE.MeshStandardMaterial({ color: 0xf0a451, roughness: 0.5, metalness: 0.06 })
    const gageGeom = new THREE.BoxGeometry(GL, GL, padT)

    // +Z face and -Z face (gages at ±45°)
    for (const zSign of [-1, 1]) {
      for (const rot of [Math.PI / 4, -Math.PI / 4]) {
        const pad = new THREE.Mesh(gageGeom, gageMat)
        pad.position.set(0, 0, zSign * (W / 2 + padT / 2)); pad.rotation.z = rot; g.add(pad)
      }
    }
    // +Y face and -Y face
    const gageGeomY = new THREE.BoxGeometry(GL, padT, GL)
    for (const ySign of [-1, 1]) {
      for (const rot of [Math.PI / 4, -Math.PI / 4]) {
        const pad = new THREE.Mesh(gageGeomY, gageMat)
        pad.position.set(0, ySign * (W / 2 + padT / 2), 0); pad.rotation.y = rot; g.add(pad)
      }
    }

    const lbl = makeTextSprite('45° gages')
    lbl.scale.set(0.30, 0.10, 1); lbl.position.set(0, W / 2 + 0.13, W / 2 + 0.08); g.add(lbl)

    // ── Torsion arrow at right end ────────────────────────────────────────
    addTorqueArrow(g, L / 2 + 0.07, W * 0.85, true)

    // ── Dimension lines ───────────────────────────────────────────────────
    const dim = new THREE.Group()
    addDimensionLine(dim,
      new THREE.Vector3(-L / 2, W / 2 + 0.12, 0), new THREE.Vector3(L / 2, W / 2 + 0.12, 0),
      `L=3W`, new THREE.Vector3(0, 1, 0),
    )
    addDimensionLine(dim,
      new THREE.Vector3(0, W / 2 + 0.12, -W / 2), new THREE.Vector3(0, W / 2 + 0.12, W / 2),
      `W=${fmt(widthMm)} ${uLabel}`, new THREE.Vector3(0, 1, 0),
    )
    const tLabel = makeTextSprite(torqueStr)
    tLabel.position.set(L / 2 + W * 1.3, W * 0.85, 0); dim.add(tLabel)
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
        <input type="checkbox" id="sqrtor-dims" checked={showDimensions} onChange={e => setShowDimensions(e.target.checked)} style={{ margin: 0 }} />
        <label htmlFor="sqrtor-dims" style={{ cursor: 'pointer', margin: 0, fontWeight: 500 }}>Dimensions</label>
      </div>
    </div>
  )
}

export default function SquareTorqueModelPreview({ params, us }: Props) {
  return (
    <div className="transducer-svg-wrap" style={{ height: '400px' }}>
      <SquareTorque3D params={params} us={us} />
    </div>
  )
}
