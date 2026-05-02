import { useEffect, useMemo, useRef, useState } from 'react'
import * as THREE from 'three'
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { createAxesGizmo } from './sceneHelpers'
import { makeBodyMaterial } from '../domain/materialAppearance'

/**
 * S-Beam 3D viewer.
 *
 * Geometry: rectangular bar with two circular through-holes (perpendicular to Z/width).
 * Upper hole: offset toward +X (right), leaving thin neck T on the right face.
 * Lower hole: offset toward -X (left), leaving thin neck T on the left face.
 * Gages A/B on the +X face (right) at upper hole; C/D on the -X face (left) at lower hole.
 * Holes represented by dark discs on the ±Z faces (opaque body strategy).
 */

type Props = { params: Record<string, number>; us?: boolean; materialId?: string }

function p(params: Record<string, number>, key: string, fallback: number) {
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

function addDimLine(group: THREE.Group, from: THREE.Vector3, to: THREE.Vector3, text: string, offset: THREE.Vector3) {
  const mat = new THREE.LineBasicMaterial({ color: 0x3e5a73, transparent: true, opacity: 0.8 })
  group.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints([from, to]), mat))
  const n = offset.clone().normalize().multiplyScalar(0.025)
  group.add(
    new THREE.Line(new THREE.BufferGeometry().setFromPoints([from.clone().sub(n), from.clone().add(n)]), mat),
    new THREE.Line(new THREE.BufferGeometry().setFromPoints([to.clone().sub(n), to.clone().add(n)]), mat),
  )
  const lbl = makeTextSprite(text)
  lbl.position.copy(from.clone().add(to).multiplyScalar(0.5).add(offset.clone().normalize().multiplyScalar(0.09)))
  group.add(lbl)
}

function SBeam3D({ params, us, materialId }: { params: Record<string, number>; us?: boolean; materialId?: string }) {
  const hostRef = useRef<HTMLDivElement | null>(null)
  const [showDimensions, setShowDimensions] = useState(true)
  const [showForces, setShowForces] = useState(true)

  const model = useMemo(() => {
    const g = new THREE.Group()
    const s = 1 / 70   // mm → scene units

    const loadN    = p(params, 'load', 100)
    const Rmm      = p(params, 'holeRadius', 8)
    const Tmm      = p(params, 'thickness', 12)
    const Wmm      = p(params, 'width', 25)
    const Dmm      = p(params, 'distBetweenGages', 25)
    const GLmm     = p(params, 'gageLen', 5)

    const fmt = (v: number) => us ? (v / 25.4).toFixed(3) : v.toFixed(1)
    const ul = us ? 'in' : 'mm'
    const forceStr = us ? `${(loadN / 4.44822).toFixed(1)} lbf` : `${loadN.toFixed(0)} N`

    // Scene dimensions
    const R  = clamp(Rmm * s, 0.03, 0.35)
    const T  = clamp(Tmm * s, 0.02, 0.40)
    const W  = clamp(Wmm * s, 0.12, 0.80)  // Z extent (width)
    const D  = clamp(Dmm * s, R * 2.4, 2.0) // hole centre separation (Y)
    const GL = clamp(GLmm * s, 0.03, 0.20)

    // Total body height (Y): D + top section + bottom section
    //   Each arm section height = 2*(T + R): T below hole + 2R hole + T above hole...
    //   Simplified: one T above top hole and one T below bottom hole
    const armH = T + R   // half-arm height above/below hole centre
    const H = D + 2 * armH  // total body height

    // Body half-extents
    const hX = (T + 2 * R) / 2  // body half-width (X) — should contain T + 2R + T, use W for flexibility
    const bodyHalfX = clamp((Tmm + 2 * Rmm) * s / 2, R + T * 0.5, 0.6)

    // Hole centre X offsets (alternate sides for S-shape)
    // Upper hole: offset toward +X so right neck = T
    const holeXoff = bodyHalfX - T - R  // centre offset from body centreline
    const upperHoleX = clamp(holeXoff, 0, bodyHalfX - R * 0.8)
    const lowerHoleX = -upperHoleX

    // Hole Y centres
    const upperHoleY = D / 2
    const lowerHoleY = -D / 2

    // ── Body (opaque) ─────────────────────────────────────────────────────
    const bodyMat = makeBodyMaterial(materialId)
    const body = new THREE.Mesh(new THREE.BoxGeometry(bodyHalfX * 2, H, W), bodyMat)
    g.add(body)

    // ── Flanges ───────────────────────────────────────────────────────────
    const flangeMat = makeBodyMaterial(materialId)
    const flangeH = H * 0.08
    const topFlange = new THREE.Mesh(new THREE.BoxGeometry(bodyHalfX * 2.3, flangeH, W * 1.3), flangeMat)
    topFlange.position.set(0, H / 2 + flangeH / 2, 0)
    g.add(topFlange)
    const botFlange = new THREE.Mesh(new THREE.BoxGeometry(bodyHalfX * 2.3, flangeH, W * 1.3), flangeMat)
    botFlange.position.set(0, -H / 2 - flangeH / 2, 0)
    g.add(botFlange)

    // ── Hole face discs (dark circles on ±Z faces, represent through-holes) ──
    const holeMat = new THREE.MeshStandardMaterial({ color: 0x1a2535, roughness: 0.7 })
    const makeHoleDisc = (cx: number, cy: number, side: number) => {
      const disc = new THREE.Mesh(new THREE.CircleGeometry(R, 32), holeMat)
      disc.position.set(cx, cy, side * (W / 2 + 0.001))
      if (side < 0) disc.rotation.y = Math.PI
      g.add(disc)
    }
    makeHoleDisc(upperHoleX, upperHoleY, +1)
    makeHoleDisc(upperHoleX, upperHoleY, -1)
    makeHoleDisc(lowerHoleX, lowerHoleY, +1)
    makeHoleDisc(lowerHoleX, lowerHoleY, -1)

    // ── Hole rim rings (visible edges of holes on body face) ──────────────
    const rimMat = new THREE.MeshStandardMaterial({ color: 0x2a3545, roughness: 0.5 })
    const makeRim = (cx: number, cy: number) => {
      const tube = new THREE.Mesh(
        new THREE.CylinderGeometry(R, R, W, 32, 1, true),
        rimMat
      )
      tube.rotation.x = Math.PI / 2
      tube.position.set(cx, cy, 0)
      g.add(tube)
    }
    makeRim(upperHoleX, upperHoleY)
    makeRim(lowerHoleX, lowerHoleY)

    // ── Gage pads on the +Z face at ±45° around each hole ────────────────
    // Gages are flat pads on the beam face, positioned at ±45° on each hole
    // circumference (thin-neck side), oriented at ±45° to the load axis.
    const padDepth = 0.007
    const S45 = Math.SQRT1_2   // sin/cos 45°
    const gageMat_ten = new THREE.MeshStandardMaterial({ color: 0xf0a451, roughness: 0.5 })
    const gageMat_cmp = new THREE.MeshStandardMaterial({ color: 0x51a4f0, roughness: 0.5 })
    // Gage pad: long axis along gage, thin in Z
    const gagePadGeom = new THREE.BoxGeometry(GL, GL * 0.5, padDepth)

    const addFaceGage = (
      hcx: number, hcy: number,
      angSign: number,          // +1 = upper-right/left, -1 = lower-right/left
      xSign: number,            // +1 = right side of hole, -1 = left side
      mat: THREE.MeshStandardMaterial,
      label: string,
    ) => {
      const px = hcx + xSign * R * S45
      const py = hcy - angSign * R * S45   // SVG y is flipped vs 3D Y
      const pad = new THREE.Mesh(gagePadGeom, mat)
      pad.position.set(px, py, W / 2 + padDepth / 2)
      pad.rotation.z = -xSign * angSign * Math.PI / 4   // ±45° orientation
      g.add(pad)
      const lbl = makeTextSprite(label)
      lbl.scale.set(0.18, 0.08, 1)
      lbl.position.set(px + xSign * 0.10, py + angSign * 0.08, W / 2 + 0.04)
      g.add(lbl)
    }

    // Upper hole (right-offset):  A=upper-right (+45°, tension), B=lower-right (−45°, compress)
    addFaceGage(upperHoleX, upperHoleY, +1, +1, gageMat_ten, 'A')
    addFaceGage(upperHoleX, upperHoleY, -1, +1, gageMat_cmp, 'B')
    // Lower hole (left-offset):   C=upper-left (+45°, compress),  D=lower-left (−45°, tension)
    addFaceGage(lowerHoleX, lowerHoleY, +1, -1, gageMat_cmp, 'C')
    addFaceGage(lowerHoleX, lowerHoleY, -1, -1, gageMat_ten, 'D')

    // ── Force arrows ──────────────────────────────────────────────────────
    if (showForces) {
      const arrowLen = clamp(0.18 + Math.log10(Math.max(loadN, 1)) * 0.08, 0.18, 0.45)
      const aH = Math.min(0.12, arrowLen * 0.28)
      const aR = Math.min(0.08, arrowLen * 0.20)
      g.add(new THREE.ArrowHelper(
        new THREE.Vector3(0, -1, 0),
        new THREE.Vector3(0, H / 2 + flangeH + arrowLen, 0),
        arrowLen, 0xe05530, aH, aR,
      ))
      g.add(new THREE.ArrowHelper(
        new THREE.Vector3(0, 1, 0),
        new THREE.Vector3(0, -H / 2 - flangeH - arrowLen, 0),
        arrowLen, 0xe05530, aH, aR,
      ))
    }

    // ── Dimension lines ───────────────────────────────────────────────────
    const dim = new THREE.Group()
    const xR = bodyHalfX + 0.18
    const zF = W / 2 + 0.05

    addDimLine(dim,
      new THREE.Vector3(xR + 0.1, -H / 2, zF),
      new THREE.Vector3(xR + 0.1, H / 2, zF),
      `H=${fmt(H / s)} ${ul}`, new THREE.Vector3(1, 0, 0),
    )
    addDimLine(dim,
      new THREE.Vector3(xR, lowerHoleY, zF),
      new THREE.Vector3(xR, upperHoleY, zF),
      `D=${fmt(Dmm)} ${ul}`, new THREE.Vector3(1, 0, 0),
    )
    addDimLine(dim,
      new THREE.Vector3(0, H * 0.54, -W / 2),
      new THREE.Vector3(0, H * 0.54, W / 2),
      `W=${fmt(Wmm)} ${ul}`, new THREE.Vector3(0, 1, 0),
    )

    const fLbl = makeTextSprite(forceStr)
    fLbl.position.set(0, H / 2 + flangeH + 0.38, 0)
    dim.add(fLbl)

    dim.visible = showDimensions
    g.add(dim)
    return g
  }, [params, us, showDimensions, showForces, materialId])

  useEffect(() => {
    if (!hostRef.current) return
    const host = hostRef.current
    const scene = new THREE.Scene(); scene.background = new THREE.Color(0xffffff)
    const camera = new THREE.PerspectiveCamera(45, host.clientWidth / Math.max(1, host.clientHeight), 0.1, 100)
    camera.position.set(1.8, 1.2, 2.4)
    const renderer = new THREE.WebGLRenderer({ antialias: true })
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    renderer.setSize(host.clientWidth, host.clientHeight)
    const pmrem = new THREE.PMREMGenerator(renderer)
    scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture
    pmrem.dispose()
    host.appendChild(renderer.domElement)
    const controls = new OrbitControls(camera, renderer.domElement)
    controls.enableDamping = true; controls.dampingFactor = 0.08
    controls.target.set(0, 0, 0); controls.update()
    const gizmo = createAxesGizmo(renderer, host)
    scene.add(new THREE.AmbientLight(0xffffff, 0.75))
    const dl = new THREE.DirectionalLight(0xffffff, 1.0); dl.position.set(4, 5, 3); scene.add(dl)
    scene.add(new THREE.GridHelper(6, 14, 0xcccccc, 0xeeeeee))
    const root = new THREE.Group(); scene.add(root); root.add(model)
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
        <button onClick={() => setShowDimensions(v => !v)} style={{
          padding: '2px 8px', borderRadius: 3, cursor: 'pointer', fontSize: 11, fontWeight: 500, lineHeight: 1.5,
          border: showDimensions ? '1px solid rgba(96,165,250,0.7)' : '1px solid rgba(71,85,105,0.4)',
          background: showDimensions ? 'rgba(37,99,235,0.55)' : 'rgba(51,65,85,0.35)', color: '#f8fafc',
        }}>Dimensions</button>
        <button onClick={() => setShowForces(v => !v)} style={{
          padding: '2px 8px', borderRadius: 3, cursor: 'pointer', fontSize: 11, fontWeight: 500, lineHeight: 1.5,
          border: showForces ? '1px solid rgba(96,165,250,0.7)' : '1px solid rgba(71,85,105,0.4)',
          background: showForces ? 'rgba(37,99,235,0.55)' : 'rgba(51,65,85,0.35)', color: '#f8fafc',
        }}>Forces & BCs</button>
      </div>
    </div>
  )
}

export default function SBeamModelPreview({ params, us, materialId }: Props) {
  return (
    <div className="transducer-svg-wrap" style={{ height: '800px' }}>
      <SBeam3D params={params} us={us} materialId={materialId} />
    </div>
  )
}
