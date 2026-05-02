import { useEffect, useMemo, useRef, useState } from 'react'
import * as THREE from 'three'
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { createAxesGizmo } from './sceneHelpers'
import { makeBodyMaterial } from '../domain/materialAppearance'

interface Props {
  outerRadiusMm: number
  innerRadiusMm: number
  beamWidthMm: number
  beamThicknessMm: number
  gageDistFromOuterRingMm: number
  us?: boolean
  materialId?: string
}

function clamp(v: number, lo: number, hi: number) { return Math.min(hi, Math.max(lo, v)) }

function makeTextSprite(text: string): THREE.Sprite {
  const canvas = document.createElement('canvas')
  canvas.width = 512; canvas.height = 128
  const ctx = canvas.getContext('2d')
  if (ctx) {
    ctx.clearRect(0, 0, 512, 128)
    ctx.fillStyle = '#90c8f0'
    ctx.font = 'bold 30px Barlow, sans-serif'
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
    ctx.fillText(text, 256, 64)
  }
  const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(canvas), transparent: true }))
  sprite.scale.set(0.60, 0.16, 1)
  return sprite
}

function addDimLine(group: THREE.Group, from: THREE.Vector3, to: THREE.Vector3, text: string, offset: THREE.Vector3) {
  const mat = new THREE.LineBasicMaterial({ color: 0x5898c8, transparent: true, opacity: 0.9 })
  group.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints([from, to]), mat))
  const n = offset.clone().normalize().multiplyScalar(0.03)
  group.add(
    new THREE.Line(new THREE.BufferGeometry().setFromPoints([from.clone().sub(n), from.clone().add(n)]), mat),
    new THREE.Line(new THREE.BufferGeometry().setFromPoints([to.clone().sub(n), to.clone().add(n)]), mat),
  )
  const lbl = makeTextSprite(text)
  lbl.position.copy(from.clone().add(to).multiplyScalar(0.5).add(offset.clone().normalize().multiplyScalar(0.10)))
  group.add(lbl)
}

function makeLinearGageGroup(gLen: number, gW: number, gPad: number, carrierColor = 0xd07828): THREE.Group {
  const grp = new THREE.Group()
  const activeLen  = gLen * 0.65
  const carrierLen = gLen * 1.15
  const carrierW   = gW * 1.18
  const gridH      = gPad * 0.85
  const nLines     = 12
  const lineThick  = carrierW * 0.052
  const endBarT    = lineThick * 1.6

  const carrierMat = new THREE.MeshStandardMaterial({ color: carrierColor, roughness: 0.75, metalness: 0.0, transparent: true, opacity: 0.92 })
  const gridMat    = new THREE.MeshStandardMaterial({ color: 0x909088, roughness: 0.28, metalness: 0.6 })
  const tabMat     = new THREE.MeshStandardMaterial({ color: 0x282820, roughness: 0.5, metalness: 0.45 })

  grp.add(new THREE.Mesh(new THREE.BoxGeometry(carrierLen, gPad, carrierW), carrierMat))
  const shiftX = gLen * 0.04
  for (let i = 0; i < nLines; i++) {
    const zPos = (i / (nLines - 1) - 0.5) * carrierW * 0.72
    const line = new THREE.Mesh(new THREE.BoxGeometry(activeLen, gridH, lineThick), gridMat)
    line.position.set(shiftX, gPad * 0.5 + gridH * 0.5, zPos)
    grp.add(line)
  }
  for (const xSign of [1, -1]) {
    const bar = new THREE.Mesh(new THREE.BoxGeometry(endBarT, gridH, carrierW * 0.74), gridMat)
    bar.position.set(shiftX + xSign * activeLen * 0.5, gPad * 0.5 + gridH * 0.5, 0)
    grp.add(bar)
  }
  const tabSize = carrierW * 0.19
  const tabH    = gPad * 1.1
  for (const zSign of [1, -1]) {
    const tab = new THREE.Mesh(new THREE.BoxGeometry(tabSize, tabH, tabSize), tabMat)
    tab.position.set(-carrierLen * 0.5 + tabSize * 0.55, gPad * 0.5 + tabH * 0.5, zSign * carrierW * 0.27)
    grp.add(tab)
  }
  return grp
}

function makeShearGageGroup(size: number, gPad: number): THREE.Group {
  const grp = new THREE.Group()
  const gridH     = gPad * 0.85
  const lineLen   = size * 0.62
  const lineThick = size * 0.048
  const nLines    = 7

  const carrierMat = new THREE.MeshStandardMaterial({ color: 0x1a9870, roughness: 0.75, metalness: 0.0, transparent: true, opacity: 0.92 })
  const gridMat    = new THREE.MeshStandardMaterial({ color: 0x909088, roughness: 0.28, metalness: 0.6 })
  const tabMat     = new THREE.MeshStandardMaterial({ color: 0x282820, roughness: 0.5, metalness: 0.45 })

  grp.add(new THREE.Mesh(new THREE.BoxGeometry(size * 1.12, gPad, size * 1.12), carrierMat))
  for (const rotY of [Math.PI / 4, -Math.PI / 4]) {
    for (let i = 0; i < nLines; i++) {
      const t = (i / (nLines - 1) - 0.5) * size * 0.60
      const line = new THREE.Mesh(new THREE.BoxGeometry(lineLen, gridH, lineThick), gridMat)
      line.rotation.y = rotY
      line.position.set(Math.sin(rotY) * t, gPad * 0.5 + gridH * 0.5, Math.cos(rotY) * t)
      grp.add(line)
    }
  }
  const tabSize = size * 0.16
  const tabH    = gPad * 1.2
  for (let i = 0; i < 2; i++) {
    const tab = new THREE.Mesh(new THREE.BoxGeometry(tabSize, tabH, tabSize), tabMat)
    tab.position.set(-size * 0.40 + i * tabSize * 1.5, gPad * 0.5 + tabH * 0.5, -size * 0.40)
    grp.add(tab)
  }
  return grp
}

// ARM_ANGLES: 3 arms at 0°, 120°, 240° (measured from +Z axis in XZ plane)
const ARM_ANGLES = [0, (2 * Math.PI) / 3, (4 * Math.PI) / 3]

function buildThreeBeamScene(p: Props, showDims: boolean, showForces: boolean): THREE.Group {
  const g = new THREE.Group()
  const S = 0.75 / Math.max(p.outerRadiusMm, 10)

  const R_o   = clamp(p.outerRadiusMm * S, 0.25, 2.0)
  const R_i   = clamp(p.innerRadiusMm * S, 0.06, R_o * 0.85)
  const B     = clamp(p.beamWidthMm * S, 0.05, R_o * 0.55)
  const T     = clamp(p.beamThicknessMm * S, 0.02, R_o * 0.35)
  const gD    = clamp(p.gageDistFromOuterRingMm * S, 0, (R_o - R_i) * 0.85)
  const armLen = R_o - R_i
  const armMidR = R_i + armLen * 0.5
  const gageR   = R_o - gD

  const beamMat = makeBodyMaterial(p.materialId)
  const hubMat  = makeBodyMaterial(p.materialId)
  const ringMat = makeBodyMaterial(p.materialId)

  // Outer ring
  const ringWall = clamp(B * 0.65, 0.03, 0.14)
  const ringShape = new THREE.Shape()
  ringShape.absarc(0, 0, R_o + ringWall, 0, Math.PI * 2, false)
  const ringHole = new THREE.Path()
  ringHole.absarc(0, 0, R_o, 0, Math.PI * 2, true)
  ringShape.holes.push(ringHole)
  const ring = new THREE.Mesh(
    new THREE.ExtrudeGeometry(ringShape, { depth: T, bevelEnabled: false, curveSegments: 56 }),
    ringMat,
  )
  ring.rotation.x = -Math.PI / 2
  ring.position.y = -T / 2
  g.add(ring)

  // Hub cylinder
  g.add(new THREE.Mesh(new THREE.CylinderGeometry(R_i, R_i, T * 1.15, 32), hubMat))

  // 3 beam arms at 120° intervals.
  // BoxGeometry(armLen, T, B): armLen along local +X, B along local +Z.
  // rotation.y = angle - π/2 maps local +X → world radial direction (sin θ, 0, cos θ).
  const armGeom = new THREE.BoxGeometry(armLen, T, B)
  for (const angle of ARM_ANGLES) {
    const arm = new THREE.Mesh(armGeom, beamMat)
    arm.position.set(Math.sin(angle) * armMidR, 0, Math.cos(angle) * armMidR)
    arm.rotation.y = angle - Math.PI / 2
    g.add(arm)
  }

  // Bending gages (linear, amber): top + bottom face at gageR from center, sensing axis = arm axis
  const gLen = clamp(armLen * 0.22, 0.018, 0.12)
  const gW   = clamp(B * 0.62, 0.016, 0.090)
  const gPad = 0.006

  for (const angle of ARM_ANGLES) {
    for (const ySign of [1, -1]) {
      const pivot = new THREE.Group()
      pivot.rotation.y = angle - Math.PI / 2
      pivot.position.set(Math.sin(angle) * gageR, ySign * (T / 2 + gPad * 0.5 + 0.001), Math.cos(angle) * gageR)
      const gage = makeLinearGageGroup(gLen, gW, gPad)
      if (ySign < 0) gage.rotation.x = Math.PI
      pivot.add(gage)
      g.add(pivot)
    }
  }

  // Shear gages (±45° chevron, teal): top + bottom face at mid-arm, same rotation convention as bending
  const sSize = clamp(B * 0.72, 0.022, 0.10)
  for (const angle of ARM_ANGLES) {
    for (const ySign of [1, -1]) {
      const pivot = new THREE.Group()
      pivot.rotation.y = angle - Math.PI / 2
      pivot.position.set(Math.sin(angle) * armMidR, ySign * (T / 2 + gPad * 0.5 + 0.001), Math.cos(angle) * armMidR)
      const gage = makeShearGageGroup(sSize, gPad)
      if (ySign < 0) gage.rotation.x = Math.PI
      pivot.add(gage)
      g.add(pivot)
    }
  }

  // Fz load arrow
  const arrowLen = clamp(R_o * 0.5, 0.22, 0.55)
  if (showForces) {
    g.add(new THREE.ArrowHelper(
      new THREE.Vector3(0, -1, 0),
      new THREE.Vector3(0, T / 2 + arrowLen, 0),
      arrowLen, 0xe05530, arrowLen * 0.24, arrowLen * 0.16,
    ))
    // Fx arrow (+X)
    const fSmall = arrowLen * 0.6
    g.add(new THREE.ArrowHelper(
      new THREE.Vector3(1, 0, 0),
      new THREE.Vector3(-fSmall * 0.5, T / 2 + arrowLen * 0.3, 0),
      fSmall, 0xe05530, fSmall * 0.24, fSmall * 0.16,
    ))
    // Fy arrow (+Z)
    g.add(new THREE.ArrowHelper(
      new THREE.Vector3(0, 0, 1),
      new THREE.Vector3(0, T / 2 + arrowLen * 0.3, -fSmall * 0.5),
      fSmall, 0xe05530, fSmall * 0.24, fSmall * 0.16,
    ))
    // Outer ring hatch lines (green) indicating fixed ring
    const hatchMat3 = new THREE.LineBasicMaterial({ color: 0x22c55e })
    const ringWall3 = clamp(B * 0.65, 0.03, 0.14)
    const nHatch3 = 8
    for (let i = 0; i < nHatch3; i++) {
      const a = (i / nHatch3) * Math.PI * 2
      const rx = Math.cos(a) * (R_o + ringWall3)
      const rz = Math.sin(a) * (R_o + ringWall3)
      g.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(rx, -T / 2, rz),
        new THREE.Vector3(rx * 1.35, -T / 2 - 0.08, rz * 1.35),
      ]), hatchMat3))
    }
  }

  // Dimension lines
  if (showDims) {
    const dim = new THREE.Group()
    g.add(dim)
    const yD  = -T / 2 - 0.10
    const yD2 = yD - 0.12
    const yAb = T / 2 + 0.06
    const fmt = (mm: number) => p.us ? `${(mm / 25.4).toFixed(3)}"` : `${mm.toFixed(1)}mm`

    addDimLine(dim,
      new THREE.Vector3(0, yD, 0), new THREE.Vector3(R_o, yD, 0),
      `Ro=${fmt(p.outerRadiusMm)}`, new THREE.Vector3(0, -1, 0))
    addDimLine(dim,
      new THREE.Vector3(0, yD2, 0), new THREE.Vector3(R_i, yD2, 0),
      `Ri=${fmt(p.innerRadiusMm)}`, new THREE.Vector3(0, -1, 0))

    // Beam width shown on +Z arm (angle = 0)
    addDimLine(dim,
      new THREE.Vector3(-B / 2, yAb, armMidR), new THREE.Vector3(B / 2, yAb, armMidR),
      `w=${fmt(p.beamWidthMm)}`, new THREE.Vector3(0, 1, 0))
    addDimLine(dim,
      new THREE.Vector3(armMidR * Math.sin(ARM_ANGLES[1]) + 0.12, -T / 2, armMidR * Math.cos(ARM_ANGLES[1])),
      new THREE.Vector3(armMidR * Math.sin(ARM_ANGLES[1]) + 0.12, T / 2, armMidR * Math.cos(ARM_ANGLES[1])),
      `t=${fmt(p.beamThicknessMm)}`, new THREE.Vector3(1, 0, 0))
  }

  return g
}

function ThreeBeam3D(p: Props) {
  const hostRef = useRef<HTMLDivElement | null>(null)
  const [showDims, setShowDims] = useState(true)
  const [showForces, setShowForces] = useState(true)
  const model = useMemo(() => buildThreeBeamScene(p, showDims, showForces), [p, showDims, showForces])

  useEffect(() => {
    if (!hostRef.current) return
    const host = hostRef.current

    const scene = new THREE.Scene()
    scene.background = new THREE.Color(0x000000)

    const camera = new THREE.PerspectiveCamera(42, host.clientWidth / Math.max(1, host.clientHeight), 0.1, 100)
    camera.position.set(1.6, 1.8, 2.0)

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
    scene.add(new THREE.GridHelper(6, 14, 0x333333, 0x1a1a1a))

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
          onClick={() => setShowDims(v => !v)}
          style={{
            padding: '2px 8px', borderRadius: 3, cursor: 'pointer',
            fontSize: 11, fontWeight: 500, lineHeight: 1.5,
            border: showDims ? '1px solid rgba(96,165,250,0.7)' : '1px solid rgba(71,85,105,0.4)',
            background: showDims ? 'rgba(37,99,235,0.55)' : 'rgba(51,65,85,0.35)',
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
      <div style={{
        position: 'absolute', bottom: 10, left: 10, zIndex: 10,
        fontSize: 10, color: '#94a3b8', pointerEvents: 'none', lineHeight: 1.6,
      }}>
        <span style={{ display: 'inline-block', width: 8, height: 8, background: '#f07030', borderRadius: 1, marginRight: 4 }} />bending gages (top face)
        {'  '}
        <span style={{ display: 'inline-block', width: 8, height: 8, background: '#20a880', borderRadius: 1, marginRight: 4, marginLeft: 8 }} />shear gages 45° (side face)
      </div>
    </div>
  )
}

export default function ThreeBeamModelPreview(props: Props) {
  return (
    <div className="transducer-svg-wrap" style={{ height: '800px' }}>
      <ThreeBeam3D {...props} />
    </div>
  )
}
