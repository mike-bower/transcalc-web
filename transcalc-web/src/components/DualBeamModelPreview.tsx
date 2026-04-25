import { useEffect, useMemo, useRef, useState } from 'react'
import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { createAxesGizmo } from './sceneHelpers'

/**
 * 3D parametric model viewer for the Dual Bending Beam transducer.
 *
 * Geometry: two parallel cantilever beams fixed in a left block, with a
 * right load block that carries the applied downward force P.
 *
 * Gage positions (matching the 2D diagram and domain formula):
 *   A – top of upper beam, left (tension, orange)
 *   B – bottom of lower beam, left (compression, blue)
 *   C – top of upper beam, right (compression, blue)
 *   D – bottom of lower beam, right (tension, orange)
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

function DualBeam3D({ params, us }: { params: Record<string, number>; us?: boolean }) {
  const hostRef = useRef<HTMLDivElement | null>(null)
  const [showDimensions, setShowDimensions] = useState(true)
  const [showForces, setShowForces] = useState(true)

  const model = useMemo(() => {
    const g = new THREE.Group()
    const mmToScene = 1 / 90

    const loadN      = p(params, 'load', 100)
    const thicknessMm = p(params, 'thickness', 3)
    const widthMm    = p(params, 'width', 25)
    const spanMm     = p(params, 'distBetweenGages', 60)   // block-face to block-face
    const gageLenMm  = p(params, 'gageLen', 5)

    const fmt = (v: number) => us ? (v / 25.4).toFixed(3) : v.toFixed(1)
    const uLabel  = us ? 'in' : 'mm'
    const forceStr = us ? `${(loadN / 4.44822).toFixed(1)} lbf` : `${loadN.toFixed(0)} N`

    // Scene-space dimensions
    const L   = clamp(spanMm * mmToScene, 0.5, 3.5)          // beam span
    const T   = clamp(thicknessMm * mmToScene, 0.04, 0.35)   // beam thickness
    const W   = clamp(widthMm * mmToScene, 0.10, 1.0)         // beam depth (Z)
    const GL  = clamp(gageLenMm * mmToScene, 0.03, 0.22)      // gage length

    // Block dimensions
    const blockW = clamp(spanMm * 0.12 * mmToScene, 0.08, 0.25)
    const beamSep = Math.max(T * 3.5, 0.28)                   // center-to-center beam separation
    const blockPad = T * 1.0
    const blockHalfH = beamSep / 2 + T / 2 + blockPad

    // Materials
    const beamMat      = new THREE.MeshStandardMaterial({ color: 0x4a88b8, roughness: 0.4, metalness: 0.1 })
    const fixedMat     = new THREE.MeshStandardMaterial({ color: 0x3a4a6b, roughness: 0.7 })
    const loadBlockMat = new THREE.MeshStandardMaterial({ color: 0x8090a8, roughness: 0.55 })

    // ── Upper beam ──
    const upperBeam = new THREE.Mesh(new THREE.BoxGeometry(L, T, W), beamMat)
    upperBeam.position.set(0, beamSep / 2, 0)
    g.add(upperBeam)

    // ── Lower beam ──
    const lowerBeam = new THREE.Mesh(new THREE.BoxGeometry(L, T, W), beamMat)
    lowerBeam.position.set(0, -beamSep / 2, 0)
    g.add(lowerBeam)

    // ── Left fixed block ──
    const leftBlock = new THREE.Mesh(
      new THREE.BoxGeometry(blockW * 2, blockHalfH * 2, W * 1.15),
      fixedMat
    )
    leftBlock.position.set(-L / 2 - blockW, 0, 0)
    g.add(leftBlock)

    // Diagonal hatch lines on left face to indicate fixed wall
    const hatchMat = new THREE.LineBasicMaterial({ color: 0x1e2d3d, opacity: 0.6, transparent: true })
    const lx = -L / 2 - blockW * 2
    const hatchCount = 6
    for (let i = 0; i <= hatchCount; i++) {
      const frac = i / hatchCount
      const y0 = -blockHalfH + frac * blockHalfH * 2
      const pts = [
        new THREE.Vector3(lx, y0, -W * 0.57),
        new THREE.Vector3(lx, y0 - blockHalfH * 0.35, W * 0.57),
      ]
      g.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), hatchMat))
    }

    // ── Right load block ──
    const rightBlock = new THREE.Mesh(
      new THREE.BoxGeometry(blockW * 2, blockHalfH * 2, W * 1.15),
      loadBlockMat
    )
    rightBlock.position.set(L / 2 + blockW, 0, 0)
    g.add(rightBlock)

    // ── Gage pads ──
    const padT = Math.max(0.007, T * 0.09)
    const gageGeom = new THREE.BoxGeometry(GL, padT, GL * 0.7)
    // Gage inset from block face: GL/2 + 10% of span
    const gageXInset = GL / 2 + L * 0.10
    const gageXL = -L / 2 + gageXInset   // left gage X
    const gageXR =  L / 2 - gageXInset   // right gage X

    const tensionMat     = new THREE.MeshStandardMaterial({ color: 0xf0a451, roughness: 0.5, metalness: 0.06 })
    const compressionMat = new THREE.MeshStandardMaterial({ color: 0x51a4f0, roughness: 0.5, metalness: 0.06 })

    const gageDefs: Array<[number, number, THREE.MeshStandardMaterial, string]> = [
      // [x, y (beam center + offset to surface), material, label]
      [gageXL,  beamSep / 2 + T / 2 + padT / 2, tensionMat,     'A'],  // top upper, left
      [gageXL, -beamSep / 2 - T / 2 - padT / 2, compressionMat, 'B'],  // bot lower, left
      [gageXR,  beamSep / 2 + T / 2 + padT / 2, compressionMat, 'C'],  // top upper, right
      [gageXR, -beamSep / 2 - T / 2 - padT / 2, tensionMat,     'D'],  // bot lower, right
    ]
    for (const [x, y, mat, label] of gageDefs) {
      const gage = new THREE.Mesh(gageGeom, mat)
      gage.position.set(x, y, 0)
      g.add(gage)
      const lbl = makeTextSprite(label)
      const lblY = y > 0 ? y + padT + 0.11 : y - padT - 0.11
      lbl.position.set(x, lblY, W * 0.62)
      lbl.scale.set(0.22, 0.10, 1)
      g.add(lbl)
    }

    // ── Load arrow — points DOWN onto top of right block ──
    if (showForces) {
      const arrowLen = clamp(0.22 + Math.log10(Math.max(loadN, 1)) * 0.08, 0.22, 0.50)
      const topOfBlock = blockHalfH
      g.add(new THREE.ArrowHelper(
        new THREE.Vector3(0, -1, 0),
        new THREE.Vector3(L / 2 + blockW, topOfBlock + arrowLen, 0),
        arrowLen,
        0xe05530,
        Math.min(0.13, arrowLen * 0.28),
        Math.min(0.09, arrowLen * 0.20)
      ))
      const fLabel = makeTextSprite(forceStr)
      fLabel.position.set(L / 2 + blockW + 0.25, topOfBlock + arrowLen + 0.10, 0)
      fLabel.scale.set(0.55, 0.14, 1)
      g.add(fLabel)
    }

    // ── Dimension lines ──
    const dim = new THREE.Group()
    const zFront = W * 0.8
    const yUnder = -blockHalfH - 0.10

    // Span D (block-face to block-face)
    addDimensionLine(dim,
      new THREE.Vector3(-L / 2, yUnder, zFront),
      new THREE.Vector3( L / 2, yUnder, zFront),
      `D=${fmt(spanMm)} ${uLabel}`,
      new THREE.Vector3(0, -1, 0)
    )

    // Beam thickness t
    addDimensionLine(dim,
      new THREE.Vector3(L / 2 + blockW * 2 + 0.10, beamSep / 2 - T / 2, 0),
      new THREE.Vector3(L / 2 + blockW * 2 + 0.10, beamSep / 2 + T / 2, 0),
      `t=${fmt(thicknessMm)} ${uLabel}`,
      new THREE.Vector3(1, 0, 0)
    )

    // Beam width w
    addDimensionLine(dim,
      new THREE.Vector3(0, blockHalfH + 0.12, -W / 2),
      new THREE.Vector3(0, blockHalfH + 0.12,  W / 2),
      `w=${fmt(widthMm)} ${uLabel}`,
      new THREE.Vector3(0, 1, 0)
    )

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
    camera.position.set(2.5, 1.4, 2.8)

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
        >Forces</button>
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
