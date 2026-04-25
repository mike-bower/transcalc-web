import { useEffect, useMemo, useRef, useState } from 'react'
import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { createAxesGizmo } from './sceneHelpers'

/**
 * 3D parametric model viewer for the Square Shear load cell.
 *
 * Geometry: a short cantilever I-section beam with a rectangular web opening.
 *   – Flanges (full width W) at top/bottom, height = (H−D)/2 each
 *   – Web strips (thickness t/2 each) on the outer Z edges, height = D
 *   – Rectangular slot (width W−t, height D) through the web centre
 * Four shear gages at 45° on the outer web face (±Z), at mid-span, y=0.
 */

type Props = { params: Record<string, number>; us?: boolean }

function p(params: Record<string, number>, key: string, fallback: number): number {
  const v = params[key]
  return Number.isFinite(v) && v > 0 ? v : fallback
}

function clamp(v: number, lo: number, hi: number) { return Math.min(hi, Math.max(lo, v)) }

function makeTextSprite(text: string): THREE.Sprite {
  const canvas = document.createElement('canvas')
  canvas.width = 512; canvas.height = 128
  const ctx = canvas.getContext('2d')
  if (ctx) {
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    ctx.fillStyle = '#1f3f5c'
    ctx.font = 'bold 32px Barlow, sans-serif'
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
    ctx.fillText(text, canvas.width / 2, canvas.height / 2)
  }
  const mat = new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(canvas), transparent: true })
  const sprite = new THREE.Sprite(mat)
  sprite.scale.set(0.65, 0.17, 1)
  return sprite
}

function addDimensionLine(
  group: THREE.Group, from: THREE.Vector3, to: THREE.Vector3,
  text: string, normal: THREE.Vector3, showTicks = true,
) {
  const mat = new THREE.LineBasicMaterial({ color: 0x3e5a73, transparent: true, opacity: 0.8 })
  group.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints([from, to]), mat))
  if (showTicks) {
    const n = normal.clone().normalize().multiplyScalar(0.03)
    group.add(
      new THREE.Line(new THREE.BufferGeometry().setFromPoints([from.clone().sub(n), from.clone().add(n)]), mat),
      new THREE.Line(new THREE.BufferGeometry().setFromPoints([to.clone().sub(n), to.clone().add(n)]), mat),
    )
  }
  const label = makeTextSprite(text)
  label.position.copy(from.clone().add(to).multiplyScalar(0.5).add(normal.clone().normalize().multiplyScalar(0.08)))
  group.add(label)
}

function buildShearIBeam(
  g: THREE.Group,
  params: Record<string, number>,
  us: boolean | undefined,
  showDimensions: boolean,
  slotShape: 'rect',
  showForces: boolean,
) {
  const mmToScene = 1 / 60

  const loadN = p(params, 'load', 1000)
  const Wmm = p(params, 'width', 20)
  const Hmm = p(params, 'height', 30)
  const Dmm = Math.min(p(params, 'diameter', 20), Hmm * 0.85)
  const tmm = Math.min(p(params, 'thickness', 3), Wmm * 0.9)

  const fmt = (v: number) => us ? (v / 25.4).toFixed(3) : v.toFixed(1)
  const uLabel = us ? 'in' : 'mm'
  const forceStr = us ? `${(loadN / 4.44822).toFixed(1)} lbf` : `${loadN.toFixed(0)} N`

  // Beam spans along X; cross-section in YZ plane
  const beamLen = clamp(2.5 * Hmm * mmToScene, 0.6, 3.5)
  const H = clamp(Hmm * mmToScene, 0.2, 1.2)
  const W = clamp(Wmm * mmToScene, 0.15, 1.0)
  const D = clamp(Dmm * mmToScene, 0.05, H * 0.85)
  const t = clamp(tmm * mmToScene, 0.01, W * 0.9)

  const flangeH = (H - D) / 2
  const bodyMat = new THREE.MeshStandardMaterial({ color: 0x4a88b8, roughness: 0.45, metalness: 0.1 })
  const webMat = new THREE.MeshStandardMaterial({ color: 0x3d7aaa, roughness: 0.5, metalness: 0.08 })

  // Top flange
  const topFlange = new THREE.Mesh(new THREE.BoxGeometry(beamLen, flangeH, W), bodyMat)
  topFlange.position.set(0, D / 2 + flangeH / 2, 0)
  g.add(topFlange)

  // Bottom flange
  const botFlange = new THREE.Mesh(new THREE.BoxGeometry(beamLen, flangeH, W), bodyMat)
  botFlange.position.set(0, -(D / 2 + flangeH / 2), 0)
  g.add(botFlange)

  // Web strips — two thin vertical strips at the outer Z edges of the cutout zone
  const webStripW = t / 2
  for (const sign of [-1, 1]) {
    const strip = new THREE.Mesh(new THREE.BoxGeometry(beamLen, D, webStripW), webMat)
    strip.position.set(0, 0, sign * (W / 2 - webStripW / 2))
    g.add(strip)
  }

  // Rectangular slot outline on front and back web faces (shows the opening)
  const slotMat = new THREE.LineBasicMaterial({ color: 0x1a3550, transparent: true, opacity: 0.9 })
  const halfSlotW = (W - t) / 2
  for (const zSign of [-1, 1]) {
    const zFace = zSign * (W / 2 + 0.001)
    const slotPts = [
      new THREE.Vector3(-beamLen / 2 * 0.85, -D / 2, zFace),
      new THREE.Vector3(beamLen / 2 * 0.85, -D / 2, zFace),
      new THREE.Vector3(beamLen / 2 * 0.85, D / 2, zFace),
      new THREE.Vector3(-beamLen / 2 * 0.85, D / 2, zFace),
      new THREE.Vector3(-beamLen / 2 * 0.85, -D / 2, zFace),
    ]
    g.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(slotPts), slotMat))
  }

  // Rectangular slot dark fill plane (shows void)
  const slotFillMat = new THREE.MeshBasicMaterial({ color: 0x1a2535, side: THREE.DoubleSide })
  const slotFill = new THREE.Mesh(new THREE.PlaneGeometry(beamLen * 0.85, D), slotFillMat)
  slotFill.position.set(0, 0, 0)
  slotFill.rotation.y = Math.PI / 2
  g.add(slotFill)

  // ── Gage pads (45° on web face) ───────────────────────────────────────────
  // bendingNull: front face +45°=T / -45°=C; back face uses opposite colour assignment
  const isBendingNull = params['bendingNull'] === 1
  const padSize = clamp(D * 0.35, 0.03, 0.14)
  const padT = 0.006
  const tensionMat = new THREE.MeshStandardMaterial({ color: 0xf0a451, roughness: 0.5, metalness: 0.06 })
  const comprMat = new THREE.MeshStandardMaterial({ color: 0x51a4f0, roughness: 0.5, metalness: 0.06 })
  const gageGeom = new THREE.BoxGeometry(padSize, padSize, padT)

  for (const zSign of [-1, 1]) {
    const zPos = zSign * (W / 2 + padT / 2)
    // +45° = tension (T), -45° = compression (C)
    // In bending-null arrangement back face colours are swapped
    const frontFace = zSign === 1
    const [matPos, matNeg] = (!isBendingNull || frontFace)
      ? [tensionMat, comprMat]
      : [comprMat, tensionMat]

    const padPos = new THREE.Mesh(gageGeom, matPos)
    padPos.position.set(0, 0, zPos); padPos.rotation.z = Math.PI / 4; g.add(padPos)
    const padNeg = new THREE.Mesh(gageGeom, matNeg)
    padNeg.position.set(0, 0, zPos); padNeg.rotation.z = -Math.PI / 4; g.add(padNeg)

    if (frontFace) {
      const lblT = makeTextSprite('T (+45°)')
      lblT.scale.set(0.30, 0.10, 1)
      lblT.position.set(padSize * 0.8, D / 2 + 0.11, zPos + 0.04); g.add(lblT)
      const lblC = makeTextSprite('C (−45°)')
      lblC.scale.set(0.30, 0.10, 1)
      lblC.position.set(-padSize * 0.8, D / 2 + 0.11, zPos + 0.04); g.add(lblC)
    }
  }

  // ── Fixed support (left end) ──────────────────────────────────────────────
  const wallMat = new THREE.MeshStandardMaterial({ color: 0x3a6888, roughness: 0.55, metalness: 0.15 })
  const wallT = beamLen * 0.06
  const wall = new THREE.Mesh(new THREE.BoxGeometry(wallT, H * 1.4, W * 1.4), wallMat)
  wall.position.set(-beamLen / 2 - wallT / 2, 0, 0)
  g.add(wall)

  // Hatch lines on support face
  if (showForces) {
    const hatchMat = new THREE.LineBasicMaterial({ color: 0x1a2535, transparent: true, opacity: 0.6 })
    const hX = -beamLen / 2 - wallT - 0.003
    for (let i = -2; i <= 2; i++) {
      const hz = i * W * 0.28
      g.add(new THREE.Line(
        new THREE.BufferGeometry().setFromPoints([
          new THREE.Vector3(hX, -H * 0.55, hz - 0.04),
          new THREE.Vector3(hX, H * 0.55, hz + 0.04),
        ]),
        hatchMat,
      ))
    }
  }

  // ── Load arrow (downward at free end) ─────────────────────────────────────
  const arrowLen = clamp(0.15 + Math.log10(Math.max(loadN, 1)) * 0.07, 0.15, 0.40)
  if (showForces) {
    g.add(new THREE.ArrowHelper(
      new THREE.Vector3(0, -1, 0),
      new THREE.Vector3(beamLen / 2, H / 2 + arrowLen, 0),
      arrowLen, 0xe05530,
      Math.min(0.11, arrowLen * 0.30), Math.min(0.08, arrowLen * 0.22),
    ))
  }

  // ── Dimension lines ───────────────────────────────────────────────────────
  const dim = new THREE.Group()

  // Beam height on right face
  addDimensionLine(dim,
    new THREE.Vector3(beamLen / 2 + 0.12, -H / 2, 0),
    new THREE.Vector3(beamLen / 2 + 0.12, H / 2, 0),
    `H=${fmt(Hmm)} ${uLabel}`, new THREE.Vector3(1, 0, 0),
  )

  // Beam width (Z) on top face
  addDimensionLine(dim,
    new THREE.Vector3(0, H / 2 + 0.12, -W / 2),
    new THREE.Vector3(0, H / 2 + 0.12, W / 2),
    `W=${fmt(Wmm)} ${uLabel}`, new THREE.Vector3(0, 1, 0),
  )

  // Web opening diameter
  addDimensionLine(dim,
    new THREE.Vector3(beamLen / 2 + 0.22, -D / 2, 0),
    new THREE.Vector3(beamLen / 2 + 0.22, D / 2, 0),
    `D=${fmt(Dmm)} ${uLabel}`, new THREE.Vector3(1, 0, 0),
  )

  // Load label
  const fLabel = makeTextSprite(forceStr)
  fLabel.position.set(beamLen / 2, H / 2 + arrowLen + 0.12, 0)
  dim.add(fLabel)

  dim.visible = showDimensions
  g.add(dim)
}

function SquareShear3D({ params, us }: { params: Record<string, number>; us?: boolean }) {
  const hostRef = useRef<HTMLDivElement | null>(null)
  const [showDimensions, setShowDimensions] = useState(true)
  const [showForces, setShowForces] = useState(true)

  const model = useMemo(() => {
    const g = new THREE.Group()
    buildShearIBeam(g, params, us, showDimensions, 'rect', showForces)
    return g
  }, [params, us, showDimensions, showForces])

  useEffect(() => {
    if (!hostRef.current) return
    const host = hostRef.current
    const scene = new THREE.Scene()
    scene.background = new THREE.Color(0xffffff)
    const camera = new THREE.PerspectiveCamera(45, host.clientWidth / Math.max(1, host.clientHeight), 0.1, 100)
    camera.position.set(2.0, 1.2, 2.8)
    const renderer = new THREE.WebGLRenderer({ antialias: true })
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    renderer.setSize(host.clientWidth, host.clientHeight)
    host.appendChild(renderer.domElement)
    const controls = new OrbitControls(camera, renderer.domElement)
    controls.enableDamping = true; controls.dampingFactor = 0.08
    controls.target.set(0, 0, 0); controls.update()
    const gizmo = createAxesGizmo(renderer, host)
    scene.add(new THREE.AmbientLight(0xffffff, 0.75))
    const d = new THREE.DirectionalLight(0xffffff, 1.0)
    d.position.set(4, 5, 3); scene.add(d)
    scene.add(new THREE.GridHelper(6, 14, 0xcccccc, 0xeeeeee))
    const root = new THREE.Group()
    scene.add(root); root.add(model)
    let raf = 0
    const animate = () => { raf = requestAnimationFrame(animate); controls.update(); renderer.render(scene, camera); gizmo.render(camera) }
    animate()
    const ro = new ResizeObserver(() => {
      const w = host.clientWidth, h = host.clientHeight
      if (w === 0 || h === 0) return
      renderer.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix()
    })
    ro.observe(host)
    return () => {
      cancelAnimationFrame(raf); ro.disconnect(); controls.dispose(); renderer.dispose(); gizmo.dispose()
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
        <button
          onClick={() => setShowDimensions(v => !v)}
          style={{
            padding: '2px 8px', borderRadius: 3, cursor: 'pointer',
            fontSize: 11, fontWeight: 500, lineHeight: 1.5,
            border: showDimensions ? '1px solid rgba(96,165,250,0.7)' : '1px solid rgba(71,85,105,0.4)',
            background: showDimensions ? 'rgba(37,99,235,0.55)' : 'rgba(51,65,85,0.35)',
            color: '#f8fafc',
          }}
        >Dimensions</button>
        <button
          onClick={() => setShowForces(v => !v)}
          style={{
            padding: '2px 8px', borderRadius: 3, cursor: 'pointer',
            fontSize: 11, fontWeight: 500, lineHeight: 1.5,
            border: showForces ? '1px solid rgba(96,165,250,0.7)' : '1px solid rgba(71,85,105,0.4)',
            background: showForces ? 'rgba(37,99,235,0.55)' : 'rgba(51,65,85,0.35)',
            color: '#f8fafc',
          }}
        >Forces & BCs</button>
      </div>
    </div>
  )
}

export default function SquareShearModelPreview({ params, us }: Props) {
  return (
    <div className="transducer-svg-wrap" style={{ height: '400px' }}>
      <SquareShear3D params={params} us={us} />
    </div>
  )
}
