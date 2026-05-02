import { useEffect, useMemo, useRef, useState } from 'react'
import * as THREE from 'three'
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { getActiveGages, type BridgeConfig } from '../domain/reversebeam'
import { createAxesGizmo } from './sceneHelpers'
import { makeBodyMaterial } from '../domain/materialAppearance'

/**
 * 3D parametric model for the reverse bending beam.
 *
 * Single beam clamped in a left fixed block and a right load block.
 * Load P applied downward on the right block. The beam bends in an S-shape;
 * zero moment at midspan.
 *
 *   A (orange) — top face, left of centre  (tension)
 *   B (blue)   — bottom face, left         (compression)
 *   C (blue)   — top face, right of centre (compression)
 *   D (orange) — bottom face, right        (tension)
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
  materialId?: string
}

function clamp(v: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, v))
}

function makeTextSprite(text: string, color = '#90c8f0'): THREE.Sprite {
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
  const mat = new THREE.LineBasicMaterial({ color: 0x5898c8, transparent: true, opacity: 0.9 })
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
  params: { L: number; T: number; W: number; GL: number; D: number; blockW: number },
  fmt: (v: number) => string,
  uLabel: string,
  forceStr: string,
  showDimensions: boolean,
  activeGageLabels: string[],
  showForces: boolean,
  materialId?: string
): THREE.Group {
  const { L, T, W, GL, D, blockW } = params
  const g = new THREE.Group()

  const beamMat      = makeBodyMaterial(materialId)
  const fixedMat     = new THREE.MeshStandardMaterial({ color: 0x3a4a6b, roughness: 0.7 })
  const loadBlockMat = new THREE.MeshStandardMaterial({ color: 0x7a8fa3, roughness: 0.55 })

  const blockPad  = T * 1.0
  const blockHalfH = T / 2 + blockPad

  // ── Single beam ──
  g.add(new THREE.Mesh(new THREE.BoxGeometry(L, T, W), beamMat))

  // ── Left fixed block ──
  const leftBlock = new THREE.Mesh(
    new THREE.BoxGeometry(blockW * 2, blockHalfH * 2, W * 1.15),
    fixedMat
  )
  leftBlock.position.set(-L / 2 - blockW, 0, 0)
  g.add(leftBlock)

  // Diagonal hatch lines on outer face to indicate fixed wall
  const hatchMat = new THREE.LineBasicMaterial({ color: 0x1e2d3d, opacity: 0.6, transparent: true })
  const lx = -L / 2 - blockW * 2
  for (let i = 0; i <= 6; i++) {
    const frac = i / 6
    const y0 = -blockHalfH + frac * blockHalfH * 2
    g.add(new THREE.Line(
      new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(lx, y0, -W * 0.57),
        new THREE.Vector3(lx, y0 - blockHalfH * 0.35, W * 0.57),
      ]),
      hatchMat
    ))
  }

  // ── Right load block ──
  const rightBlock = new THREE.Mesh(
    new THREE.BoxGeometry(blockW * 2, blockHalfH * 2, W * 1.15),
    loadBlockMat
  )
  rightBlock.position.set(L / 2 + blockW, 0, 0)
  g.add(rightBlock)

  // ── Gage pads ──
  const padT    = Math.max(0.007, T * 0.09)
  const gageGeom = new THREE.BoxGeometry(GL, padT, GL * 0.7)
  const gageXL  = -D / 2   // left gage centre (left of midspan)
  const gageXR  =  D / 2   // right gage centre

  const tensionMat     = new THREE.MeshStandardMaterial({ color: 0xf07030, roughness: 0.4, metalness: 0.05 })
  const compressionMat = new THREE.MeshStandardMaterial({ color: 0x4090e0, roughness: 0.4, metalness: 0.05 })

  const gageDefs: Array<[number, number, THREE.MeshStandardMaterial, string, string]> = [
    [gageXL,  T / 2 + padT / 2, tensionMat,     'A', '#f08050'],  // top-left, tension
    [gageXL, -T / 2 - padT / 2, compressionMat, 'B', '#60a8f0'],  // bot-left, compression
    [gageXR,  T / 2 + padT / 2, compressionMat, 'C', '#60a8f0'],  // top-right, compression
    [gageXR, -T / 2 - padT / 2, tensionMat,     'D', '#f08050'],  // bot-right, tension
  ]

  for (const [x, y, mat, label, color] of gageDefs.filter(d => activeGageLabels.includes(d[3]))) {
    const pad = new THREE.Mesh(gageGeom, mat)
    pad.position.set(x, y, 0)
    g.add(pad)
    const lbl = makeTextSprite(label, color)
    lbl.scale.set(0.22, 0.10, 1)
    lbl.position.set(x, y > 0 ? y + padT + 0.11 : y - padT - 0.11, W * 0.62)
    g.add(lbl)
  }

  // ── Load arrow — points DOWN onto top of right block ──
  if (showForces) {
    const arrowLen = clamp(0.22 + Math.log10(Math.max(1, L)) * 0.06, 0.22, 0.50)
    const topOfBlock = blockHalfH
    g.add(new THREE.ArrowHelper(
      new THREE.Vector3(0, -1, 0),
      new THREE.Vector3(L / 2 + blockW, topOfBlock + arrowLen, 0),
      arrowLen, 0xe05530,
      Math.min(0.12, arrowLen * 0.28),
      Math.min(0.08, arrowLen * 0.20)
    ))
    const fLabel = makeTextSprite(forceStr)
    fLabel.position.set(L / 2 + blockW + 0.22, topOfBlock + arrowLen + 0.10, 0)
    fLabel.scale.set(0.55, 0.14, 1)
    g.add(fLabel)
  }

  // ── Dimension lines ──
  if (showDimensions) {
    const dim = new THREE.Group()
    g.add(dim)
    const zFront = W * 0.8
    const yUnder = -blockHalfH - 0.10

    // Beam length L
    addDimensionLine(dim,
      new THREE.Vector3(-L / 2, yUnder, zFront),
      new THREE.Vector3( L / 2, yUnder, zFront),
      `L = ${fmt(L)} ${uLabel}`,
      new THREE.Vector3(0, -1, 0)
    )

    // Gage spacing D
    addDimensionLine(dim,
      new THREE.Vector3(-D / 2, yUnder + 0.14, zFront),
      new THREE.Vector3( D / 2, yUnder + 0.14, zFront),
      `D = ${fmt(D)} ${uLabel}`,
      new THREE.Vector3(0, -1, 0)
    )

    // Thickness t
    addDimensionLine(dim,
      new THREE.Vector3(L / 2 + blockW * 2 + 0.10, -T / 2, 0),
      new THREE.Vector3(L / 2 + blockW * 2 + 0.10,  T / 2, 0),
      `t = ${fmt(T)} ${uLabel}`,
      new THREE.Vector3(1, 0, 0)
    )

    // Width w
    addDimensionLine(dim,
      new THREE.Vector3(0, blockHalfH + 0.12, -W / 2),
      new THREE.Vector3(0, blockHalfH + 0.12,  W / 2),
      `w = ${fmt(W)} ${uLabel}`,
      new THREE.Vector3(0, 1, 0)
    )
  }

  return g
}

export default function ReverseBeamModelPreview({ load, width, thickness, beamLength, distBetweenGages, gageLength, unitSystem, bridgeConfig, materialId }: Props) {
  const hostRef = useRef<HTMLDivElement | null>(null)
  const [showDimensions, setShowDimensions] = useState(true)
  const [showForces, setShowForces] = useState(true)
  const isUS = unitSystem === 'US'

  const sceneData = useMemo(() => {
    const mmToScene = 1 / 80
    const lMm    = Number.isFinite(beamLength)        && beamLength > 0        ? beamLength        : 150
    const dMm    = Number.isFinite(distBetweenGages)  && distBetweenGages > 0  ? distBetweenGages  : 60
    const tMm    = Number.isFinite(thickness)         && thickness > 0         ? thickness         : 5
    const wMm    = Number.isFinite(width)             && width > 0             ? width             : 25
    const gLenMm = Number.isFinite(gageLength)        && gageLength > 0        ? gageLength        : 6

    const L  = clamp(lMm * mmToScene, 0.5, 5.0)
    const D  = clamp(dMm * mmToScene, 0.1, L * 0.85)
    const T  = clamp(tMm * mmToScene, 0.02, 0.40)
    const W  = clamp(wMm * mmToScene, 0.10, 1.20)
    const GL = clamp(gLenMm * mmToScene, 0.04, 0.30)
    const BW = clamp(lMm * 0.10 * mmToScene, 0.08, 0.22)   // block half-width

    const fmt = (sceneVal: number) => {
      const mm = sceneVal / mmToScene
      return isUS ? (mm / 25.4).toFixed(3) : mm.toFixed(1)
    }
    const uLabel   = isUS ? 'in' : 'mm'
    const fVal     = isUS ? (load / 4.44822) : load
    const forceStr = Number.isFinite(fVal) ? `${fVal.toFixed(1)} ${isUS ? 'lbf' : 'N'}` : 'P'

    const activeGageLabels = getActiveGages(bridgeConfig ?? 'fullBridgeTopBot') as string[]
    return { params: { L, T, W, GL, D, blockW: BW }, fmt, uLabel, forceStr, activeGageLabels }
  }, [beamLength, distBetweenGages, thickness, width, gageLength, load, isUS, bridgeConfig])

  const model = useMemo(() =>
    buildScene(sceneData.params, sceneData.fmt, sceneData.uLabel, sceneData.forceStr, showDimensions, sceneData.activeGageLabels, showForces, materialId),
    [sceneData, showDimensions, showForces, materialId]
  )

  useEffect(() => {
    if (!hostRef.current) return
    const host = hostRef.current

    const scene = new THREE.Scene()
    scene.background = new THREE.Color(0xffffff)

    const camera = new THREE.PerspectiveCamera(40, host.clientWidth / Math.max(1, host.clientHeight), 0.1, 100)
    camera.position.set(2.5, 1.4, 2.8)

    const renderer = new THREE.WebGLRenderer({ antialias: true })
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    renderer.setSize(host.clientWidth, host.clientHeight)
    const pmrem = new THREE.PMREMGenerator(renderer)
    scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture
    pmrem.dispose()
    host.appendChild(renderer.domElement)

    const controls = new OrbitControls(camera, renderer.domElement)
    controls.enableDamping = true
    controls.dampingFactor = 0.08
    controls.target.set(0, 0, 0)
    controls.update()
    const gizmo = createAxesGizmo(renderer, host)

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
      gizmo.render(camera)
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
      gizmo.dispose()
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
        >Forces</button>
      </div>
    </div>
  )
}
