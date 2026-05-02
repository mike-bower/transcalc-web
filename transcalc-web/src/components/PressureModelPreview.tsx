import { useEffect, useMemo, useRef, useState } from 'react'
import * as THREE from 'three'
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { createAxesGizmo } from './sceneHelpers'
import { makeBodyMaterial } from '../domain/materialAppearance'

/**
 * 3D parametric model viewer for the Pressure Diaphragm load cell.
 *
 * Geometry: a thin circular diaphragm clamped at its perimeter.
 * Applied uniform pressure deflects the diaphragm, creating:
 *   – Radial compressive strain at the clamped edge (r = R)
 *   – Tangential tensile strain at the centre (r = 0)
 * Gage placement:
 *   – Two radial gages near the clamped edge (±X at r ≈ 0.85R)
 *   – Two tangential gages at the centre (±Z, r ≈ 0)
 */

type Props = { params: Record<string, number>; us?: boolean; materialId?: string }

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

function Pressure3D({ params, us, materialId }: { params: Record<string, number>; us?: boolean; materialId?: string }) {
  const hostRef = useRef<HTMLDivElement | null>(null)
  const [showDimensions, setShowDimensions] = useState(true)
  const [showForces, setShowForces] = useState(true)

  const model = useMemo(() => {
    const g = new THREE.Group()
    const mmToScene = 1 / 80

    const pressureKPa = p(params, 'pressure', 100)
    const thickMm = p(params, 'thickness', 2)
    const diamMm = p(params, 'diameter', 50)

    const fmt = (v: number) => us ? (v / 25.4).toFixed(3) : v.toFixed(1)
    const fmtP = (v: number) => us ? `${(v / 6.89476).toFixed(1)} PSI` : `${v.toFixed(0)} kPa`
    const uLabel = us ? 'in' : 'mm'

    const R = clamp((diamMm / 2) * mmToScene, 0.08, 0.80)
    const T = clamp(thickMm * mmToScene, 0.008, R * 0.25)
    const flangeR = R * 1.35
    const flangeT = T * 2.5

    // ── Mounting flange (ring + body) ─────────────────────────────────────
    const flangeMat = new THREE.MeshStandardMaterial({ color: 0x3a6888, roughness: 0.55, metalness: 0.15 })
    const flange = new THREE.Mesh(
      new THREE.CylinderGeometry(flangeR, flangeR, flangeT, 48),
      flangeMat,
    )
    flange.position.set(0, -T / 2 - flangeT / 2, 0); g.add(flange)

    // Flange bore (dark disc showing the opening)
    const boreMat = new THREE.MeshBasicMaterial({ color: 0x1a2535 })
    const bore = new THREE.Mesh(new THREE.CircleGeometry(R, 48), boreMat)
    bore.rotation.x = Math.PI / 2; bore.position.set(0, -T / 2 - flangeT, 0); g.add(bore)

    // Hatch marks on flange underside
    if (showForces) {
      const hatchMat = new THREE.LineBasicMaterial({ color: 0x1a2535, transparent: true, opacity: 0.6 })
      for (let i = -2; i <= 2; i++) {
        const hx = i * flangeR * 0.35
        g.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints([
          new THREE.Vector3(hx - 0.04, -T / 2 - flangeT - 0.003, -flangeR * 0.6),
          new THREE.Vector3(hx + 0.04, -T / 2 - flangeT - 0.003, flangeR * 0.6),
        ]), hatchMat))
      }
    }

    // ── Diaphragm disc ────────────────────────────────────────────────────
    const discMat = makeBodyMaterial(materialId)
    const disc = new THREE.Mesh(new THREE.CylinderGeometry(R, R, T, 48), discMat)
    g.add(disc)

    // ── Pressure arrows (pointing downward onto top face) ─────────────────
    const arrowLen = clamp(0.08 + Math.log10(Math.max(pressureKPa, 1)) * 0.04, 0.08, 0.28)
    const arrowColor = 0x3b82f6
    if (showForces) {
      const nArrows = 7
      for (let i = 0; i < nArrows; i++) {
        const angle = (i / nArrows) * Math.PI * 2
        const ar = R * 0.55
        const ax = Math.cos(angle) * ar, az = Math.sin(angle) * ar
        g.add(new THREE.ArrowHelper(
          new THREE.Vector3(0, -1, 0),
          new THREE.Vector3(ax, T / 2 + arrowLen, az),
          arrowLen, arrowColor,
          Math.min(0.06, arrowLen * 0.35), Math.min(0.04, arrowLen * 0.25),
        ))
      }
      // Centre arrow
      g.add(new THREE.ArrowHelper(
        new THREE.Vector3(0, -1, 0),
        new THREE.Vector3(0, T / 2 + arrowLen, 0),
        arrowLen, arrowColor,
        Math.min(0.06, arrowLen * 0.35), Math.min(0.04, arrowLen * 0.25),
      ))
    }

    // ── Strain gage pads ──────────────────────────────────────────────────
    const padT = 0.006
    const padLen = clamp(R * 0.22, 0.03, 0.12)
    // Radial (edge) gages: compressive under pressure → blue (C)
    const radialMat = new THREE.MeshStandardMaterial({ color: 0x51a4f0, roughness: 0.5, metalness: 0.06 })
    // Tangential (centre) gages: tensile under pressure → orange (T)
    const tangMat = new THREE.MeshStandardMaterial({ color: 0xf0a451, roughness: 0.5, metalness: 0.06 })

    // Radial gages: near edge at ±X (VMM-26: place at r ≈ 0.90R for correct formula)
    const rGagePos = R * 0.90
    const radGeom = new THREE.BoxGeometry(padLen, padT, padLen * 0.5)
    for (const sign of [-1, 1]) {
      const pad = new THREE.Mesh(radGeom, radialMat)
      pad.position.set(sign * rGagePos, T / 2 + padT / 2, 0); g.add(pad)
    }
    const lblR = makeTextSprite('C (radial, edge)')
    lblR.scale.set(0.38, 0.10, 1); lblR.position.set(rGagePos + 0.12, T / 2 + 0.12, 0); g.add(lblR)

    // Tangential gages: near centre at ±Z (oriented tangentially, i.e. along Z)
    const tGagePos = R * 0.25
    const tangGeom = new THREE.BoxGeometry(padLen * 0.5, padT, padLen)
    for (const sign of [-1, 1]) {
      const pad = new THREE.Mesh(tangGeom, tangMat)
      pad.position.set(0, T / 2 + padT / 2, sign * tGagePos); g.add(pad)
    }
    const lblT = makeTextSprite('T (tang., centre)')
    lblT.scale.set(0.38, 0.10, 1); lblT.position.set(0.12, T / 2 + 0.12, tGagePos + 0.12); g.add(lblT)

    // ── Dimension lines ───────────────────────────────────────────────────
    const dim = new THREE.Group()
    addDimensionLine(dim,
      new THREE.Vector3(-R, flangeR * 0.2, 0), new THREE.Vector3(R, flangeR * 0.2, 0),
      `D=${fmt(diamMm)} ${uLabel}`, new THREE.Vector3(0, 0, 1),
    )
    addDimensionLine(dim,
      new THREE.Vector3(flangeR + 0.10, -T / 2, 0), new THREE.Vector3(flangeR + 0.10, T / 2, 0),
      `t=${fmt(thickMm)} ${uLabel}`, new THREE.Vector3(1, 0, 0),
    )
    const pLabel = makeTextSprite(fmtP(pressureKPa))
    pLabel.position.set(0, T / 2 + arrowLen + 0.12, 0); dim.add(pLabel)
    dim.visible = showDimensions; g.add(dim)
    return g
  }, [params, us, showDimensions, showForces, materialId])

  useEffect(() => {
    if (!hostRef.current) return
    const host = hostRef.current
    const scene = new THREE.Scene(); scene.background = new THREE.Color(0xffffff)
    const camera = new THREE.PerspectiveCamera(45, host.clientWidth / Math.max(1, host.clientHeight), 0.1, 100)
    camera.position.set(1.4, 1.6, 1.8)
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

export default function PressureModelPreview({ params, us, materialId }: Props) {
  return (
    <div className="transducer-svg-wrap" style={{ height: '800px' }}>
      <Pressure3D params={params} us={us} materialId={materialId} />
    </div>
  )
}
