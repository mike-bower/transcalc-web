import { useEffect, useMemo, useRef, useState } from 'react'
import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { createAxesGizmo } from './sceneHelpers'

/**
 * 3D parametric model viewer for the S-Beam (S-type) load cell.
 *
 * Geometry: a rectangular section bar with two circular through-holes drilled in
 * alternating X-offsets. The holes create four high-stress necks; gages A–D
 * are bonded at those necks.
 *
 *   Cross-section (X-Y plane):
 *
 *   ┌──────────────────────┐  ← top attachment flange  ↑ F (compression / tension)
 *   │  ┌───────────────┐   │
 *   │  │  hole (top)   │   │  ← upper hole, offset toward +X
 *   │  └───────────────┘   │
 *   │  NECK A (top of hole)│  ← gage A (top, right side)
 *   │  NECK B (bot of hole)│  ← gage B (bottom, right side)
 *   │   ┌───────────────┐  │
 *   │   │  hole (bot)   │  │  ← lower hole, offset toward −X
 *   │   └───────────────┘  │
 *   └──────────────────────┘  ← bottom attachment flange
 *
 * Key params (all in mm / N):
 *   holeRadius   – R: hole radius
 *   thickness    – T: neck material width (R must be ≤ T)
 *   width        – W: beam depth (into screen)
 *   distBetweenGages – D: gage-centre to gage-centre vertical distance
 *   load         – applied force (N)
 */

type Props = {
  params: Record<string, number>
  us?: boolean
}

function p(params: Record<string, number>, key: string, fallback: number): number {
  const v = params[key]
  return Number.isFinite(v) && v > 0 ? v : fallback
}

function clamp(v: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, v))
}

function makeTextSprite(text: string): THREE.Sprite {
  const canvas = document.createElement('canvas')
  canvas.width = 512
  canvas.height = 128
  const ctx = canvas.getContext('2d')
  if (ctx) {
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    ctx.fillStyle = '#1f3f5c'
    ctx.font = 'bold 32px Barlow, sans-serif'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText(text, canvas.width / 2, canvas.height / 2)
  }
  const texture = new THREE.CanvasTexture(canvas)
  const mat = new THREE.SpriteMaterial({ map: texture, transparent: true })
  const sprite = new THREE.Sprite(mat)
  sprite.scale.set(0.65, 0.17, 1)
  return sprite
}

function addDimensionLine(
  group: THREE.Group,
  from: THREE.Vector3,
  to: THREE.Vector3,
  text: string,
  normal: THREE.Vector3,
  showTicks = true
) {
  const mat = new THREE.LineBasicMaterial({ color: 0x3e5a73, transparent: true, opacity: 0.8 })
  group.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints([from, to]), mat))
  if (showTicks) {
    const n = normal.clone().normalize().multiplyScalar(0.03)
    group.add(
      new THREE.Line(new THREE.BufferGeometry().setFromPoints([from.clone().sub(n), from.clone().add(n)]), mat),
      new THREE.Line(new THREE.BufferGeometry().setFromPoints([to.clone().sub(n), to.clone().add(n)]), mat)
    )
  }
  const label = makeTextSprite(text)
  label.position.copy(from.clone().add(to).multiplyScalar(0.5).add(normal.clone().normalize().multiplyScalar(0.08)))
  group.add(label)
}

function SBeam3D({ params, us }: { params: Record<string, number>; us?: boolean }) {
  const hostRef = useRef<HTMLDivElement | null>(null)
  const rootRef = useRef<THREE.Group | null>(null)
  const [showDimensions, setShowDimensions] = useState(true)
  const [showForces, setShowForces] = useState(true)

  const model = useMemo(() => {
    const g = new THREE.Group()
    const mmToScene = 1 / 80

    const loadN = p(params, 'load', 100)
    const Rmm = p(params, 'holeRadius', 8)
    const Tmm = p(params, 'thickness', 12)       // neck material (T ≥ R)
    const widthMm = p(params, 'width', 25)       // into screen (Z)
    const distMm = p(params, 'distBetweenGages', 25)
    const gageLenMm = p(params, 'gageLen', 5)

    const fmt = (v: number) => us ? (v / 25.4).toFixed(3) : v.toFixed(1)
    const uLabel = us ? 'in' : 'mm'
    const forceStr = us ? `${(loadN / 4.44822).toFixed(1)} lbf` : `${loadN.toFixed(0)} N`

    // Section cross-section height per S-arm: T + 2*R
    // (T material above hole, 2R hole diameter, T material below)
    // Actually: outer face → T (neck) → centre of hole at T+R → T back face
    // Total section depth (X) = 2*(T + R) — for a symmetric section
    const sectionDepthMm = 2 * (Tmm + Rmm)
    // Beam total height (Y) = D + 2*(T+R)  [holes centred at ±D/2]
    const beamHeightMm = distMm + sectionDepthMm

    const H = clamp(beamHeightMm * mmToScene, 0.6, 4.5)
    const Xs = clamp(sectionDepthMm * mmToScene, 0.15, 1.2)
    const W = clamp(widthMm * mmToScene, 0.12, 1.0)
    const R = clamp(Rmm * mmToScene, 0.03, Xs * 0.45)
    const GL = clamp(gageLenMm * mmToScene, 0.04, 0.22)

    // Hole Y centres (in scene space)
    const holeY = clamp((distMm / 2) * mmToScene, R * 1.5, H * 0.38)
    // Hole X offsets — alternate sides to form the S
    const holeXOffset = clamp((Tmm + Rmm - Xs / 2) * mmToScene, Xs * 0.05, Xs * 0.38)

    // ── Main body (solid) ──────────────────────────────────────────────────────
    const bodyMat = new THREE.MeshStandardMaterial({
      color: 0x4a88b8, roughness: 0.45, metalness: 0.1,
      transparent: true, opacity: 0.88,
    })
    g.add(Object.assign(new THREE.Mesh(new THREE.BoxGeometry(Xs, H, W), bodyMat)))

    // ── Holes (cylinders along Z, shown in a dark contrasting material) ────────
    const holeMat = new THREE.MeshStandardMaterial({ color: 0x1a2535, roughness: 0.6, metalness: 0.05 })
    const holeGeom = () => {
      const cyl = new THREE.CylinderGeometry(R, R, W * 1.02, 32)
      cyl.rotateX(Math.PI / 2)
      return cyl
    }
    // Upper hole: offset toward +X
    const upperHole = new THREE.Mesh(holeGeom(), holeMat)
    upperHole.position.set(holeXOffset, holeY, 0)
    g.add(upperHole)
    // Lower hole: offset toward −X
    const lowerHole = new THREE.Mesh(holeGeom(), holeMat)
    lowerHole.position.set(-holeXOffset, -holeY, 0)
    g.add(lowerHole)

    // ── Attachment flanges (top and bottom) ────────────────────────────────────
    const flangeMat = new THREE.MeshStandardMaterial({ color: 0x3a6888, roughness: 0.55, metalness: 0.15 })
    const flangeH = H * 0.09
    const topFlange = new THREE.Mesh(new THREE.BoxGeometry(Xs * 1.35, flangeH, W * 1.25), flangeMat)
    topFlange.position.set(0, H / 2 + flangeH / 2, 0)
    g.add(topFlange)
    const botFlange = new THREE.Mesh(new THREE.BoxGeometry(Xs * 1.35, flangeH, W * 1.25), flangeMat)
    botFlange.position.set(0, -H / 2 - flangeH / 2, 0)
    g.add(botFlange)

    // ── Gage pads at the four neck positions ────────────────────────────────────
    // A: top neck of upper hole (between hole top and body top)
    // B: bottom neck of upper hole (between hole bottom and body centre)
    // C: top neck of lower hole
    // D: bottom neck of lower hole
    const padT = 0.008
    const gagePadGeom = new THREE.BoxGeometry(GL, padT, GL * 0.65)
    const tensionMat = new THREE.MeshStandardMaterial({ color: 0xf0a451, roughness: 0.5, metalness: 0.06 })
    const compMat = new THREE.MeshStandardMaterial({ color: 0x51a4f0, roughness: 0.5, metalness: 0.06 })

    // Each gage rotated so it lies flat on the +X face of the body
    const addFlatGage = (xPos: number, yPos: number, mat: THREE.MeshStandardMaterial, label: string) => {
      const gage = new THREE.Mesh(gagePadGeom, mat)
      // Orient gage on the +X face (lay it in the Y-Z plane, stick out in +X)
      gage.rotation.z = Math.PI / 2
      gage.position.set(xPos, yPos, 0)
      g.add(gage)
      const lbl = makeTextSprite(label)
      lbl.position.set(xPos + Xs * 0.15, yPos, W * 0.68)
      lbl.scale.set(0.22, 0.10, 1)
      g.add(lbl)
    }

    // Upper hole neck positions (relative to hole centre)
    const neckTop = holeY + R + (H / 2 - holeY - R) / 2    // midpoint of top neck
    const neckBot = holeY - R - (holeY - R - 0) / 2        // midpoint of bottom neck (above centre)
    addFlatGage(Xs / 2 + padT, neckTop, tensionMat, 'A')
    addFlatGage(Xs / 2 + padT, neckBot, compMat, 'B')

    // Lower hole neck positions (mirrored)
    const neckTop2 = -neckBot   // above lower hole
    const neckBot2 = -neckTop   // below lower hole (near bottom)
    addFlatGage(-Xs / 2 - padT, neckTop2, tensionMat, 'C')
    addFlatGage(-Xs / 2 - padT, neckBot2, compMat, 'D')

    // ── Force arrows (axial: top ↓ and bottom ↑) ──────────────────────────────
    const arrowLen = clamp(0.18 + Math.log10(Math.max(loadN, 1)) * 0.09, 0.20, 0.50)
    if (showForces) {
      g.add(new THREE.ArrowHelper(
        new THREE.Vector3(0, -1, 0),
        new THREE.Vector3(0, H / 2 + flangeH + arrowLen, 0),
        arrowLen, 0xe05530,
        Math.min(0.13, arrowLen * 0.30), Math.min(0.09, arrowLen * 0.22)
      ))
      g.add(new THREE.ArrowHelper(
        new THREE.Vector3(0, 1, 0),
        new THREE.Vector3(0, -H / 2 - flangeH - arrowLen, 0),
        arrowLen, 0xe05530,
        Math.min(0.13, arrowLen * 0.30), Math.min(0.09, arrowLen * 0.22)
      ))
    }

    // ── Dimension lines ────────────────────────────────────────────────────────
    const dim = new THREE.Group()
    const xRight = Xs / 2 + 0.18
    const zFront = W / 2 + 0.06

    // Total height
    addDimensionLine(dim,
      new THREE.Vector3(xRight + 0.1, -H / 2, zFront),
      new THREE.Vector3(xRight + 0.1, H / 2, zFront),
      `H=${fmt(beamHeightMm)} ${uLabel}`,
      new THREE.Vector3(1, 0, 0)
    )

    // Gage separation D
    addDimensionLine(dim,
      new THREE.Vector3(xRight, -holeY, zFront),
      new THREE.Vector3(xRight, holeY, zFront),
      `D=${fmt(distMm)} ${uLabel}`,
      new THREE.Vector3(1, 0, 0)
    )

    // Section depth
    addDimensionLine(dim,
      new THREE.Vector3(-Xs / 2, H * 0.52, zFront),
      new THREE.Vector3(Xs / 2, H * 0.52, zFront),
      `d=${fmt(sectionDepthMm)} ${uLabel}`,
      new THREE.Vector3(0, 1, 0)
    )

    // Width (Z)
    addDimensionLine(dim,
      new THREE.Vector3(0, H * 0.52, -W / 2),
      new THREE.Vector3(0, H * 0.52, W / 2),
      `w=${fmt(widthMm)} ${uLabel}`,
      new THREE.Vector3(0, 1, 0)
    )

    // Force labels
    const fLblTop = makeTextSprite(forceStr)
    fLblTop.position.set(0, H / 2 + flangeH + arrowLen + 0.14, 0)
    dim.add(fLblTop)

    dim.visible = showDimensions
    g.add(dim)
    return g
  }, [params, showDimensions, showForces, us])

  useEffect(() => {
    if (!hostRef.current) return
    const host = hostRef.current
    const scene = new THREE.Scene()
    scene.background = new THREE.Color(0xffffff)

    const camera = new THREE.PerspectiveCamera(45, host.clientWidth / Math.max(1, host.clientHeight), 0.1, 100)
    camera.position.set(2.0, 1.2, 2.5)

    const renderer = new THREE.WebGLRenderer({ antialias: true })
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    renderer.setSize(host.clientWidth, host.clientHeight)
    host.appendChild(renderer.domElement)

    const controls = new OrbitControls(camera, renderer.domElement)
    controls.enableDamping = true
    controls.dampingFactor = 0.08
    controls.target.set(0, 0, 0)
    controls.update()
    const gizmo = createAxesGizmo(renderer, host)

    scene.add(new THREE.AmbientLight(0xffffff, 0.75))
    const d = new THREE.DirectionalLight(0xffffff, 1.0)
    d.position.set(4, 5, 3)
    scene.add(d)
    scene.add(new THREE.GridHelper(6, 14, 0xcccccc, 0xeeeeee))

    const root = new THREE.Group()
    rootRef.current = root
    scene.add(root)
    root.add(model)

    let raf = 0
    const animate = () => {
      raf = requestAnimationFrame(animate)
      controls.update()
      renderer.render(scene, camera)
      gizmo.render(camera)
    }
    animate()

    const ro = new ResizeObserver(() => {
      const w = host.clientWidth
      const h = host.clientHeight
      if (w === 0 || h === 0) return
      renderer.setSize(w, h, false)
      camera.aspect = w / h
      camera.updateProjectionMatrix()
    })
    ro.observe(host)

    return () => {
      cancelAnimationFrame(raf)
      ro.disconnect()
      controls.dispose()
      renderer.dispose()
      gizmo.dispose()
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
        border: '1px solid rgba(71,85,105,0.5)', color: '#f8fafc', pointerEvents: 'auto'
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

export default function SBeamModelPreview({ params, us }: Props) {
  return (
    <div className="transducer-svg-wrap" style={{ height: '400px' }}>
      <SBeam3D params={params} us={us} />
    </div>
  )
}
