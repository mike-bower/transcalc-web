import { useEffect, useMemo, useRef, useState } from 'react'
import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { getActiveGages, type BridgeConfig } from '../domain/reversebeam'

/**
 * 3D parametric model for the reverse bending beam.
 *
 * Right end: fully fixed (clamped wall).
 * Left end: guided — constrained horizontally and rotationally, free to slide
 *           vertically. Force P applied downward here.
 *
 * The beam bends in an S-shape; zero moment at midspan.
 * Four gages symmetric about the midspan zero-moment point:
 *   A (top) + B (bottom)  at  -D/2 from centre  (left pair)
 *   C (top) + D (bottom)  at  +D/2 from centre  (right pair)
 *
 *  P↓
 *  [guided]══[A/B]══════════════[C/D]══[fixed wall]
 *            ←D/2→      0      ←D/2→
 *  ←────────────── L ──────────────────────────────→
 */

type Props = {
  load: number
  width: number
  thickness: number
  beamLength: number
  distBetweenGages: number
  gageLength: number
  unitSystem: 'SI' | 'US'
  bridgeConfig?: BridgeConfig
}

function clamp(v: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, v))
}

function makeTextSprite(text: string, color = '#1f3f5c'): THREE.Sprite {
  const canvas = document.createElement('canvas')
  canvas.width = 512
  canvas.height = 128
  const ctx = canvas.getContext('2d')
  if (ctx) {
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    ctx.fillStyle = color
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
  normal: THREE.Vector3
) {
  const mat = new THREE.LineBasicMaterial({ color: 0x3e5a73, transparent: true, opacity: 0.8 })
  group.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints([from, to]), mat))
  const n = normal.clone().normalize().multiplyScalar(0.03)
  group.add(
    new THREE.Line(new THREE.BufferGeometry().setFromPoints([from.clone().sub(n), from.clone().add(n)]), mat),
    new THREE.Line(new THREE.BufferGeometry().setFromPoints([to.clone().sub(n), to.clone().add(n)]), mat)
  )
  const label = makeTextSprite(text)
  label.position.copy(from.clone().add(to).multiplyScalar(0.5).add(normal.clone().normalize().multiplyScalar(0.10)))
  group.add(label)
}

function buildScene(
  params: { L: number; T: number; W: number; GL: number; D: number },
  fmt: (v: number) => string,
  uLabel: string,
  forceStr: string,
  showDimensions: boolean,
  activeGageLabels: string[]
): THREE.Group {
  const { L, T, W, GL, D } = params
  const g = new THREE.Group()

  // ── Beam body ──────────────────────────────────────────────────────────────
  const beamMat = new THREE.MeshStandardMaterial({ color: 0x4a88b8, roughness: 0.4, metalness: 0.08 })
  g.add(new THREE.Mesh(new THREE.BoxGeometry(L, T, W), beamMat))

  const supportMat = new THREE.MeshStandardMaterial({ color: 0x607080, roughness: 0.55, metalness: 0.15 })

  // ── RIGHT end: fixed wall ─────────────────────────────────────────────────
  const wallW = L * 0.12
  const wallH = T * 3.0
  const wallD = W * 1.5
  const wallR = new THREE.Mesh(new THREE.BoxGeometry(wallW, wallH, wallD), supportMat)
  wallR.position.set(L / 2 + wallW / 2, 0, 0)
  g.add(wallR)

  // Hatch lines on outer face of right wall
  const hatchMat = new THREE.LineBasicMaterial({ color: 0x1a2535, transparent: true, opacity: 0.55 })
  const nHatch = 7
  for (let i = 0; i < nHatch; i++) {
    const y = -wallH / 2 + i * (wallH / (nHatch - 1))
    const xR = L / 2 + wallW + 0.004
    g.add(new THREE.Line(
      new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(xR, y - 0.04, -wallD * 0.5),
        new THREE.Vector3(xR, y + 0.04, wallD * 0.5),
      ]),
      hatchMat
    ))
  }

  // ── LEFT end: guided support (two plates — top and bottom — allow vertical slide) ──
  const plateThk = T * 0.35
  const plateW   = L * 0.08
  const plateD   = W * 1.3
  const gap      = T * 0.15  // clearance above/below beam to show sliding freedom

  const plateGeom = new THREE.BoxGeometry(plateW, plateThk, plateD)
  // Plates centred on beam end face (x = -L/2) so they straddle the beam end
  const topPlate = new THREE.Mesh(plateGeom, supportMat)
  topPlate.position.set(-L / 2, T / 2 + gap + plateThk / 2, 0)
  g.add(topPlate)

  const botPlate = new THREE.Mesh(plateGeom, supportMat)
  botPlate.position.set(-L / 2, -(T / 2 + gap + plateThk / 2), 0)
  g.add(botPlate)

  // Vertical guide rails connecting the two plates, centred on beam end
  const railR = 0.012
  const railH = T + 2 * gap + 2 * plateThk
  const railGeom = new THREE.CylinderGeometry(railR, railR, railH, 8)
  const railMat = new THREE.MeshStandardMaterial({ color: 0x445566, roughness: 0.5, metalness: 0.3 })
  for (const dz of [-plateD * 0.35, plateD * 0.35]) {
    const rail = new THREE.Mesh(railGeom, railMat)
    rail.position.set(-L / 2, 0, dz)
    g.add(rail)
  }

  // Double-headed vertical arrow outside the guide to indicate sliding freedom
  const slideArrowLen = T * 0.9
  const slideColor = 0x4070a0
  g.add(new THREE.ArrowHelper(
    new THREE.Vector3(0, 1, 0),
    new THREE.Vector3(-L / 2 - plateW / 2 - 0.08, -slideArrowLen / 2, 0),
    slideArrowLen, slideColor, slideArrowLen * 0.22, slideArrowLen * 0.15
  ))
  g.add(new THREE.ArrowHelper(
    new THREE.Vector3(0, -1, 0),
    new THREE.Vector3(-L / 2 - plateW / 2 - 0.08, slideArrowLen / 2, 0),
    slideArrowLen, slideColor, slideArrowLen * 0.22, slideArrowLen * 0.15
  ))

  // ── Load arrow P (downward) at left guided end ─────────────────────────────
  const arrowLen = clamp(0.22 + Math.log10(Math.max(1, L)) * 0.06, 0.22, 0.50)
  const leftX = -L / 2
  g.add(new THREE.ArrowHelper(
    new THREE.Vector3(0, -1, 0),
    new THREE.Vector3(leftX, T / 2 + arrowLen, 0),
    arrowLen, 0x1a2f3f,
    Math.min(0.12, arrowLen * 0.28),
    Math.min(0.08, arrowLen * 0.20)
  ))

  // ── Four gage pads ─────────────────────────────────────────────────────────
  const gagePadT = 0.007
  const topGageMat = new THREE.MeshStandardMaterial({ color: 0xf07030, roughness: 0.4, metalness: 0.05 })
  const botGageMat = new THREE.MeshStandardMaterial({ color: 0x4090e0, roughness: 0.4, metalness: 0.05 })
  const gageGeom = new THREE.BoxGeometry(GL, gagePadT, GL * 0.7)

  const gagePositions: Array<{ x: number; ySign: 1 | -1; mat: THREE.MeshStandardMaterial; label: string; color: string }> = [
    { x: -D / 2, ySign:  1, mat: topGageMat, label: 'A', color: '#c04010' },
    { x: -D / 2, ySign: -1, mat: botGageMat, label: 'B', color: '#2060b0' },
    { x:  D / 2, ySign:  1, mat: topGageMat, label: 'C', color: '#c04010' },
    { x:  D / 2, ySign: -1, mat: botGageMat, label: 'D', color: '#2060b0' },
  ]

  for (const { x, ySign, mat, label, color } of gagePositions.filter(g => activeGageLabels.includes(g.label))) {
    const pad = new THREE.Mesh(gageGeom, mat)
    pad.position.set(x, ySign * (T / 2 + gagePadT / 2), 0)
    g.add(pad)
    const lbl = makeTextSprite(label, color)
    lbl.scale.set(0.22, 0.10, 1)
    lbl.position.set(x, ySign * (T / 2 + 0.14), 0)
    g.add(lbl)
  }

  // ── Dimension lines ────────────────────────────────────────────────────────
  if (showDimensions) {
    const dim = new THREE.Group()
    g.add(dim)

    // Beam length L (below)
    addDimensionLine(dim,
      new THREE.Vector3(-L / 2, -T / 2 - 0.28, W / 2 + 0.06),
      new THREE.Vector3(L / 2, -T / 2 - 0.28, W / 2 + 0.06),
      `L = ${fmt(params.L)} ${uLabel}`,
      new THREE.Vector3(0, -0.14, 0)
    )

    // Gage spacing D
    addDimensionLine(dim,
      new THREE.Vector3(-D / 2, -T / 2 - 0.14, W / 2 + 0.06),
      new THREE.Vector3(D / 2, -T / 2 - 0.14, W / 2 + 0.06),
      `D = ${fmt(params.D)} ${uLabel}`,
      new THREE.Vector3(0, -0.14, 0)
    )

    // Thickness t (right side)
    addDimensionLine(dim,
      new THREE.Vector3(L / 2 + wallW + 0.20, -T / 2, 0),
      new THREE.Vector3(L / 2 + wallW + 0.20, T / 2, 0),
      `t = ${fmt(params.T)} ${uLabel}`,
      new THREE.Vector3(1, 0, 0)
    )

    // Width w (depth into screen)
    addDimensionLine(dim,
      new THREE.Vector3(L / 2, -T / 2 - 0.10, -W / 2),
      new THREE.Vector3(L / 2, -T / 2 - 0.10, W / 2),
      `w = ${fmt(params.W)} ${uLabel}`,
      new THREE.Vector3(0, -0.12, 0)
    )

    // Force label
    const fLabel = makeTextSprite(forceStr)
    fLabel.position.set(leftX + 0.18, T / 2 + arrowLen + 0.15, 0)
    dim.add(fLabel)
  }

  return g
}

export default function ReverseBeamModelPreview({ load, width, thickness, beamLength, distBetweenGages, gageLength, unitSystem, bridgeConfig }: Props) {
  const hostRef = useRef<HTMLDivElement | null>(null)
  const [showDimensions, setShowDimensions] = useState(true)
  const isUS = unitSystem === 'US'

  const sceneData = useMemo(() => {
    const mmToScene = 1 / 80
    const lMm    = Number.isFinite(beamLength) && beamLength > 0 ? beamLength : 150
    const dMm    = Number.isFinite(distBetweenGages) && distBetweenGages > 0 ? distBetweenGages : 60
    const tMm    = Number.isFinite(thickness) && thickness > 0 ? thickness : 5
    const wMm    = Number.isFinite(width) && width > 0 ? width : 25
    const gLenMm = Number.isFinite(gageLength) && gageLength > 0 ? gageLength : 6

    const L  = clamp(lMm * mmToScene, 0.5, 5.0)
    const D  = clamp(dMm * mmToScene, 0.1, L * 0.85)
    const T  = clamp(tMm * mmToScene, 0.02, 0.40)
    const W  = clamp(wMm * mmToScene, 0.10, 1.20)
    const GL = clamp(gLenMm * mmToScene, 0.04, 0.30)

    const fmt = (sceneVal: number) => {
      const mm = sceneVal / mmToScene
      return isUS ? (mm / 25.4).toFixed(3) : mm.toFixed(1)
    }
    const uLabel = isUS ? 'in' : 'mm'
    const fVal = isUS ? (load / 4.44822) : load
    const forceStr = Number.isFinite(fVal) ? `${fVal.toFixed(1)} ${isUS ? 'lbf' : 'N'}` : 'P'

    const activeGageLabels = getActiveGages(bridgeConfig ?? 'fullBridgeTopBot') as string[]
    return { params: { L, T, W, GL, D }, fmt, uLabel, forceStr, activeGageLabels }
  }, [beamLength, distBetweenGages, thickness, width, gageLength, load, isUS, bridgeConfig])

  const model = useMemo(() =>
    buildScene(sceneData.params, sceneData.fmt, sceneData.uLabel, sceneData.forceStr, showDimensions, sceneData.activeGageLabels),
    [sceneData, showDimensions]
  )

  useEffect(() => {
    if (!hostRef.current) return
    const host = hostRef.current

    const scene = new THREE.Scene()
    scene.background = new THREE.Color(0xffffff)

    const camera = new THREE.PerspectiveCamera(40, host.clientWidth / Math.max(1, host.clientHeight), 0.1, 100)
    camera.position.set(2.2, 1.4, 3.2)

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
    d.position.set(4, 6, 4)
    scene.add(d)
    scene.add(new THREE.GridHelper(8, 16, 0xcccccc, 0xeeeeee))

    const root = new THREE.Group()
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
      const w = host.clientWidth, h = host.clientHeight
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
    <div style={{ position: 'relative', width: '100%', height: '100%', minHeight: 0, overflow: 'hidden' }}>
      <div ref={hostRef} style={{ width: '100%', height: '100%' }} />
      <div style={{
        position: 'absolute', top: 10, right: 10, zIndex: 10,
        backgroundColor: 'rgba(30,41,59,0.7)', padding: '4px 8px', borderRadius: 4,
        fontSize: 11, display: 'flex', alignItems: 'center', gap: 6,
        border: '1px solid rgba(71,85,105,0.5)', color: '#f8fafc', pointerEvents: 'auto',
      }}>
        <input type="checkbox" id="revbeam-dims" checked={showDimensions}
          onChange={e => setShowDimensions(e.target.checked)} style={{ margin: 0 }} />
        <label htmlFor="revbeam-dims" style={{ cursor: 'pointer', margin: 0, fontWeight: 500 }}>Dimensions</label>
      </div>
    </div>
  )
}
