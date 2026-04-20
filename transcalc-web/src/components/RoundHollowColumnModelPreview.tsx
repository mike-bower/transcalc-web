import { useEffect, useMemo, useRef, useState } from 'react'
import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'

/**
 * 3D parametric model viewer for the Round Hollow Column load cell.
 *
 * Geometry: a hollow (annular) cylinder under axial compression.
 * Four strain gages at mid-height:
 *   – Two axial gages on opposite sides (+Y and -Y faces)
 *   – Two transverse (Poisson) gages on ±Z sides
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
  showTicks = true,
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

function RoundHollowColumn3D({ params, us }: { params: Record<string, number>; us?: boolean }) {
  const hostRef = useRef<HTMLDivElement | null>(null)
  const rootRef = useRef<THREE.Group | null>(null)
  const [showDimensions, setShowDimensions] = useState(true)

  const model = useMemo(() => {
    const g = new THREE.Group()
    const mmToScene = 1 / 80

    const loadN = p(params, 'load', 5000)
    const odMm = p(params, 'outerDiameter', 30)
    const idMm = Math.min(p(params, 'innerDiameter', 20), odMm * 0.9)
    const specLengthMm = params['length']
    const colHeightMm = Number.isFinite(specLengthMm) && specLengthMm > 0
      ? specLengthMm
      : 3 * odMm

    const fmt = (v: number) => us ? (v / 25.4).toFixed(3) : v.toFixed(1)
    const uLabel = us ? 'in' : 'mm'
    const forceStr = us ? `${(loadN / 4.44822).toFixed(1)} lbf` : `${loadN.toFixed(0)} N`
    const H = clamp(colHeightMm * mmToScene, 0.8, 4.5)
    const Ro = clamp((odMm / 2) * mmToScene, 0.04, 0.6)
    const Ri = clamp((idMm / 2) * mmToScene, 0.02, Ro * 0.9)

    // ── Hollow cylinder body ──────────────────────────────────────────────────
    // Outer open-ended shell
    const bodyMat = new THREE.MeshStandardMaterial({
      color: 0x4a88b8, roughness: 0.45, metalness: 0.1,
      side: THREE.DoubleSide,
    })
    const outerShell = new THREE.Mesh(
      new THREE.CylinderGeometry(Ro, Ro, H, 32, 1, true),
      bodyMat,
    )
    outerShell.rotation.z = Math.PI / 2
    g.add(outerShell)

    // Inner bore surface
    const boreMat = new THREE.MeshStandardMaterial({
      color: 0x2a4f6a, roughness: 0.6, metalness: 0.05,
      side: THREE.BackSide,
    })
    const innerBore = new THREE.Mesh(
      new THREE.CylinderGeometry(Ri, Ri, H, 32, 1, false),
      boreMat,
    )
    innerBore.rotation.z = Math.PI / 2
    g.add(innerBore)

    // Annular end caps — show the wall cross-section at both ends
    const capMat = new THREE.MeshStandardMaterial({ color: 0x3d7aaa, roughness: 0.5, metalness: 0.1 })
    for (const sign of [-1, 1]) {
      const cap = new THREE.Mesh(new THREE.RingGeometry(Ri, Ro, 32), capMat)
      cap.rotation.y = Math.PI / 2
      cap.position.set(sign * H / 2, 0, 0)
      g.add(cap)
    }

    // ── Base plate (clamped) ──────────────────────────────────────────────────
    const plateMat = new THREE.MeshStandardMaterial({ color: 0x3a6888, roughness: 0.55, metalness: 0.15 })
    const plateH = H * 0.07
    const plateR = Ro * 1.6
    const basePlate = new THREE.Mesh(new THREE.CylinderGeometry(plateR, plateR, plateH, 32), plateMat)
    basePlate.rotation.z = Math.PI / 2
    basePlate.position.set(-H / 2 - plateH / 2, 0, 0)
    g.add(basePlate)

    // Hatch lines below base plate
    const hatchMat = new THREE.LineBasicMaterial({ color: 0x1a2535, transparent: true, opacity: 0.6 })
    const hatchX = -H / 2 - plateH - 0.003
    for (let i = -2; i <= 2; i++) {
      const hy = i * plateR * 0.35
      g.add(new THREE.Line(
        new THREE.BufferGeometry().setFromPoints([
          new THREE.Vector3(hatchX, hy - 0.04, -plateR * 0.55),
          new THREE.Vector3(hatchX, hy + 0.04, plateR * 0.55),
        ]),
        hatchMat,
      ))
    }

    // ── Gage pads at mid-height ───────────────────────────────────────────────
    const padT = 0.008
    const gageLen = clamp(Ro * 1.0, 0.04, 0.20)
    const gageWid = gageLen * 0.6
    const axialMat = new THREE.MeshStandardMaterial({ color: 0xf0a451, roughness: 0.5, metalness: 0.06 })
    const transMat = new THREE.MeshStandardMaterial({ color: 0x51a4f0, roughness: 0.5, metalness: 0.06 })

    // Axial gage: along X (load axis), pad on outer ±Y surface
    const axialGeom = new THREE.BoxGeometry(gageLen, padT, gageWid)
    // Transverse gage: pad on ±Z surface
    const transGeom = new THREE.BoxGeometry(gageLen, gageWid, padT)

    // +Y face (axial — Compression under compressive load)
    const gA = new THREE.Mesh(axialGeom, axialMat)
    gA.position.set(0, Ro + padT / 2, 0)
    g.add(gA)
    const lblA = makeTextSprite('C (axial)')
    lblA.position.set(0, Ro + 0.14, gageLen * 0.5)
    lblA.scale.set(0.32, 0.10, 1)
    g.add(lblA)

    // -Y face (axial — Compression)
    const gB = new THREE.Mesh(axialGeom, axialMat)
    gB.position.set(0, -Ro - padT / 2, 0)
    g.add(gB)
    const lblB = makeTextSprite('C')
    lblB.position.set(0, -Ro - 0.14, gageLen * 0.5)
    lblB.scale.set(0.18, 0.10, 1)
    g.add(lblB)

    // +Z face (transverse — Tension from Poisson expansion)
    const gC = new THREE.Mesh(transGeom, transMat)
    gC.position.set(0, 0, Ro + padT / 2)
    g.add(gC)
    const lblC = makeTextSprite('T (Poisson)')
    lblC.position.set(0, gageLen * 0.5, Ro + 0.17)
    lblC.scale.set(0.32, 0.10, 1)
    g.add(lblC)

    // -Z face (transverse — Tension)
    const gD = new THREE.Mesh(transGeom, transMat)
    gD.position.set(0, 0, -Ro - padT / 2)
    g.add(gD)
    const lblD = makeTextSprite('T')
    lblD.position.set(0, gageLen * 0.5, -Ro - 0.14)
    lblD.scale.set(0.18, 0.10, 1)
    g.add(lblD)

    // ── Load arrow at top ─────────────────────────────────────────────────────
    const arrowLen = clamp(0.18 + Math.log10(Math.max(loadN, 1)) * 0.09, 0.20, 0.50)
    g.add(new THREE.ArrowHelper(
      new THREE.Vector3(-1, 0, 0),
      new THREE.Vector3(H / 2 + arrowLen, 0, 0),
      arrowLen, 0x1f2f3f,
      Math.min(0.13, arrowLen * 0.30), Math.min(0.09, arrowLen * 0.22),
    ))

    // ── Dimension lines ───────────────────────────────────────────────────────
    const dim = new THREE.Group()

    // Column height (top side)
    const hLabel = Number.isFinite(specLengthMm) && specLengthMm > 0 ? `L=${fmt(colHeightMm)} ${uLabel}` : `H=${fmt(colHeightMm)} ${uLabel}`
    addDimensionLine(dim,
      new THREE.Vector3(-H / 2, Ro + 0.18, 0),
      new THREE.Vector3(H / 2, Ro + 0.18, 0),
      hLabel,
      new THREE.Vector3(0, 1, 0),
    )

    // Outer diameter (front face)
    addDimensionLine(dim,
      new THREE.Vector3(0, -Ro, Ro + 0.14),
      new THREE.Vector3(0, Ro, Ro + 0.14),
      `OD=${fmt(odMm)} ${uLabel}`,
      new THREE.Vector3(0, 0, 1),
    )

    // Inner diameter (front face, offset inward)
    addDimensionLine(dim,
      new THREE.Vector3(H / 2 - gageLen * 0.5, -Ri, Ro + 0.26),
      new THREE.Vector3(H / 2 - gageLen * 0.5, Ri, Ro + 0.26),
      `ID=${fmt(idMm)} ${uLabel}`,
      new THREE.Vector3(0, 0, 1),
    )

    // Load label
    const fLabel = makeTextSprite(forceStr)
    fLabel.position.set(H / 2 + arrowLen + 0.14, 0, 0)
    dim.add(fLabel)

    dim.visible = showDimensions
    g.add(dim)
    return g
  }, [params, showDimensions, us])

  useEffect(() => {
    if (!hostRef.current) return
    const host = hostRef.current
    const scene = new THREE.Scene()
    scene.background = new THREE.Color(0xffffff)

    const camera = new THREE.PerspectiveCamera(45, host.clientWidth / Math.max(1, host.clientHeight), 0.1, 100)
    camera.position.set(1.8, 1.4, 2.6)

    const renderer = new THREE.WebGLRenderer({ antialias: true })
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    renderer.setSize(host.clientWidth, host.clientHeight)
    host.appendChild(renderer.domElement)

    const controls = new OrbitControls(camera, renderer.domElement)
    controls.enableDamping = true
    controls.dampingFactor = 0.08
    controls.target.set(0, 0, 0)
    controls.update()

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
        <input
          type="checkbox" id="rndhlwc-dims"
          checked={showDimensions} onChange={e => setShowDimensions(e.target.checked)}
          style={{ margin: 0 }}
        />
        <label htmlFor="rndhlwc-dims" style={{ cursor: 'pointer', margin: 0, fontWeight: 500 }}>Dimensions</label>
      </div>
    </div>
  )
}

export default function RoundHollowColumnModelPreview({ params, us }: Props) {
  return (
    <div className="transducer-svg-wrap" style={{ height: '400px' }}>
      <RoundHollowColumn3D params={params} us={us} />
    </div>
  )
}
