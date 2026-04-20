import { useEffect, useMemo, useRef, useState } from 'react'
import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'

/**
 * 3D parametric model viewer for the Dual Bending Beam transducer.
 *
 * Geometry: simply-supported rectangular beam, centre load, two gage pairs
 * symmetrically placed at ±gageOffset from the midspan.
 *   A – top face, left position   (tension)
 *   B – bottom face, left         (compression)
 *   C – top face, right position  (tension)
 *   D – bottom face, right        (compression)
 *
 * Key dimension: distBetweenGages (D) = centre-to-centre span between gage pairs.
 * Beam total length is extended to 1.25×D to show the support overhang.
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
  const material = new THREE.SpriteMaterial({ map: texture, transparent: true })
  const sprite = new THREE.Sprite(material)
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

function DualBeam3D({ params, us }: { params: Record<string, number>; us?: boolean }) {
  const hostRef = useRef<HTMLDivElement | null>(null)
  const rootRef = useRef<THREE.Group | null>(null)
  const [showDimensions, setShowDimensions] = useState(true)

  const model = useMemo(() => {
    const g = new THREE.Group()
    const mmToScene = 1 / 90

    const loadN = p(params, 'load', 100)
    const thicknessMm = p(params, 'thickness', 3)
    const widthMm = p(params, 'width', 25)
    const distMm = p(params, 'distBetweenGages', 60)       // D — gage pair separation
    const gageLenMm = p(params, 'gageLen', 5)
    const distLoadMm = params['distLoadToCL'] ?? 0         // usually 0

    const fmt = (v: number) => us ? (v / 25.4).toFixed(3) : v.toFixed(1)
    const uLabel = us ? 'in' : 'mm'
    const forceStr = us ? `${(loadN / 4.44822).toFixed(1)} lbf` : `${loadN.toFixed(0)} N`

    // Total beam length = 1.25 × D (gives visible overhang past supports)
    const beamLengthMm = distMm * 1.25

    // Scene-space dimensions
    const L = clamp(beamLengthMm * mmToScene, 0.6, 4.5)
    const T = clamp(thicknessMm * mmToScene, 0.05, 0.45)
    const W = clamp(widthMm * mmToScene, 0.12, 1.2)
    const GL = clamp(gageLenMm * mmToScene, 0.04, 0.25)

    // The two supports sit at ±D/2 × scale from centre of beam
    const supportHalfSpan = clamp((distMm / 2) * mmToScene, 0.1, L * 0.48)
    // Load application offset from beam centre (usually 0)
    const loadOffsetX = clamp(distLoadMm * mmToScene, -L * 0.45, L * 0.45)

    // Beam: centred at origin along X
    const beamMat = new THREE.MeshStandardMaterial({ color: 0x4a88b8, roughness: 0.45, metalness: 0.1 })
    g.add(Object.assign(new THREE.Mesh(new THREE.BoxGeometry(L, T, W), beamMat)))

    // Support triangles (pin left, roller right)
    const supMat = new THREE.MeshStandardMaterial({ color: 0x5a6a7a, roughness: 0.5 })
    const supGeom = new THREE.ConeGeometry(0.10, 0.18, 4)
    supGeom.rotateY(Math.PI / 4)
    const supL = new THREE.Mesh(supGeom, supMat)
    supL.position.set(-supportHalfSpan, -T / 2 - 0.09, 0)
    g.add(supL)
    const supR = new THREE.Mesh(supGeom, supMat)
    supR.position.set(supportHalfSpan, -T / 2 - 0.09, 0)
    g.add(supR)

    // Roller disc underneath right support (distinguishes roller from pin)
    const rollerGeom = new THREE.CylinderGeometry(0.07, 0.07, W * 0.55, 16)
    rollerGeom.rotateX(Math.PI / 2)
    const roller = new THREE.Mesh(rollerGeom, supMat)
    roller.position.set(supportHalfSpan, -T / 2 - 0.19, 0)
    g.add(roller)

    // Gage pad geometry
    const padT = Math.max(0.008, T * 0.08)
    const gageGeom = new THREE.BoxGeometry(GL, padT, GL * 0.65)
    const gageMats = {
      topTension: new THREE.MeshStandardMaterial({ color: 0xf0a451, roughness: 0.5, metalness: 0.06 }),      // orange
      botCompression: new THREE.MeshStandardMaterial({ color: 0x51a4f0, roughness: 0.5, metalness: 0.06 }),  // blue
    }

    // Gage half-separation in scene units
    const gOff = clamp((distMm / 2) * mmToScene, GL * 0.8, L * 0.4)

    // A: top-left, B: bottom-left, C: top-right, D: bottom-right
    const gages: Array<[number, boolean, THREE.MeshStandardMaterial, string]> = [
      [-gOff, true, gageMats.topTension, 'A'],
      [-gOff, false, gageMats.botCompression, 'B'],
      [gOff, true, gageMats.topTension, 'C'],
      [gOff, false, gageMats.botCompression, 'D'],
    ]
    for (const [xPos, top, mat, label] of gages) {
      const gage = new THREE.Mesh(gageGeom, mat)
      gage.position.set(xPos, top ? T / 2 + padT / 2 : -T / 2 - padT / 2, 0)
      g.add(gage)
      const lbl = makeTextSprite(label)
      lbl.position.set(xPos, top ? T / 2 + padT + 0.12 : -T / 2 - padT - 0.12, W * 0.6)
      lbl.scale.set(0.22, 0.10, 1)
      g.add(lbl)
    }

    // Load arrow at centre (+ optional offset)
    const arrowLen = clamp(0.20 + Math.log10(Math.max(loadN, 1)) * 0.1, 0.22, 0.55)
    g.add(new THREE.ArrowHelper(
      new THREE.Vector3(0, -1, 0),
      new THREE.Vector3(loadOffsetX, T / 2 + arrowLen, 0),
      arrowLen,
      0x1f2f3f,
      Math.min(0.15, arrowLen * 0.3),
      Math.min(0.10, arrowLen * 0.22)
    ))

    // Dimension lines
    const dim = new THREE.Group()
    const yUnder = -T * 0.95
    const zFront = W * 0.78

    // Total beam length (below)
    addDimensionLine(dim,
      new THREE.Vector3(-L / 2, yUnder - 0.15, zFront),
      new THREE.Vector3(L / 2, yUnder - 0.15, zFront),
      `L=${fmt(beamLengthMm)} ${uLabel}`,
      new THREE.Vector3(0, -1, 0)
    )

    // Gage pair span D
    addDimensionLine(dim,
      new THREE.Vector3(-gOff, yUnder, zFront),
      new THREE.Vector3(gOff, yUnder, zFront),
      `D=${fmt(distMm)} ${uLabel}`,
      new THREE.Vector3(0, -1, 0)
    )

    // Thickness
    addDimensionLine(dim,
      new THREE.Vector3(L / 2 + 0.12, -T / 2, 0),
      new THREE.Vector3(L / 2 + 0.12, T / 2, 0),
      `t=${fmt(thicknessMm)} ${uLabel}`,
      new THREE.Vector3(1, 0, 0)
    )

    // Width
    addDimensionLine(dim,
      new THREE.Vector3(L * 0.5, T * 0.6, -W / 2),
      new THREE.Vector3(L * 0.5, T * 0.6, W / 2),
      `w=${fmt(widthMm)} ${uLabel}`,
      new THREE.Vector3(0, 1, 0)
    )

    // Load label
    const fLabel = makeTextSprite(forceStr)
    fLabel.position.set(loadOffsetX, T / 2 + arrowLen + 0.14, 0)
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
    camera.position.set(2.2, 1.6, 2.4)

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
        border: '1px solid rgba(71,85,105,0.5)', color: '#f8fafc', pointerEvents: 'auto'
      }}>
        <input
          type="checkbox" id="dualbeam-dims"
          checked={showDimensions} onChange={e => setShowDimensions(e.target.checked)}
          style={{ margin: 0 }}
        />
        <label htmlFor="dualbeam-dims" style={{ cursor: 'pointer', margin: 0, fontWeight: 500 }}>Dimensions</label>
      </div>
    </div>
  )
}

export default function DualBeamModelPreview({ params, us }: Props) {
  return (
    <div className="transducer-svg-wrap" style={{ height: '400px' }}>
      <DualBeam3D params={params} us={us} />
    </div>
  )
}
