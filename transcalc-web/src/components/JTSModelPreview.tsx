import { useEffect, useMemo, useRef, useState } from 'react'
import * as THREE from 'three'
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { createAxesGizmo } from './sceneHelpers'
import { makeBodyMaterial } from '../domain/materialAppearance'

interface Props {
  outerRadiusMm: number
  innerRadiusMm: number
  spokeWidthMm: number
  spokeThicknessMm: number
  spokeCount: number
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
  // Local frame: carrier flat in XZ plane, sensing axis = +X, tabs at -X end (low-strain end)
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

function buildJTSScene(p: Props, showDims: boolean, showForces: boolean): THREE.Group {
  const g = new THREE.Group()
  const S = 0.75 / Math.max(p.outerRadiusMm, 10)

  const R_o  = clamp(p.outerRadiusMm * S, 0.25, 2.0)
  const R_i  = clamp(p.innerRadiusMm * S, 0.06, R_o * 0.75)
  const W    = clamp(p.spokeWidthMm * S, 0.04, (R_o - R_i) * 0.65)  // tangential width
  const T    = clamp(p.spokeThicknessMm * S, 0.015, R_o * 0.18)      // axial thickness (scene Y)
  const N    = Math.max(1, Math.round(p.spokeCount))
  const spokeLen = R_o - R_i

  // -- Materials
  const beamMat  = makeBodyMaterial(p.materialId)
  const hubMat   = makeBodyMaterial(p.materialId)
  const ringMat  = makeBodyMaterial(p.materialId)

  // -- Outer ring: rectangular cross-section annulus (spoke tips connect at inner face R_o)
  const ringWall = clamp(W * 0.70, 0.03, 0.14)
  const jtsRingShape = new THREE.Shape()
  jtsRingShape.absarc(0, 0, R_o + ringWall, 0, Math.PI * 2, false)
  const jtsRingHole = new THREE.Path()
  jtsRingHole.absarc(0, 0, R_o, 0, Math.PI * 2, true)
  jtsRingShape.holes.push(jtsRingHole)
  const jtsRingGeom = new THREE.ExtrudeGeometry(jtsRingShape, { depth: T, bevelEnabled: false, curveSegments: 56 })
  const outerRing = new THREE.Mesh(jtsRingGeom, ringMat)
  outerRing.rotation.x = -Math.PI / 2
  outerRing.position.y = -T / 2
  g.add(outerRing)

  // -- Inner hub cylinder
  g.add(new THREE.Mesh(new THREE.CylinderGeometry(R_i, R_i, T * 1.15, 32), hubMat))

  // -- Spokes (radiate along XZ plane from hub to outer ring)
  const spokeMidR = R_i + spokeLen * 0.5
  const spokeGeom = new THREE.BoxGeometry(W, T, spokeLen)  // X=width, Y=thickness, Z=length

  for (let i = 0; i < N; i++) {
    const angle = (i / N) * 2 * Math.PI
    const spoke = new THREE.Mesh(spokeGeom, beamMat)
    spoke.position.set(Math.sin(angle) * spokeMidR, 0, Math.cos(angle) * spokeMidR)
    spoke.rotation.y = -angle
    g.add(spoke)
  }

  // -- Bending gages at spoke roots (linear, near hub junction, top + bottom)
  // rotY = angle - π/2 aligns local +X with spoke direction (sinα, 0, cosα); tabs point toward hub
  const gLen = clamp(spokeLen * 0.22, 0.018, 0.12)
  const gW   = clamp(W * 0.65, 0.014, 0.08)
  const gPad = 0.006

  for (let i = 0; i < N; i++) {
    const angle = (i / N) * 2 * Math.PI
    const gageR = R_i + gLen * 0.7
    const gx = Math.sin(angle) * gageR
    const gz = Math.cos(angle) * gageR
    const rotY = angle - Math.PI / 2

    const pivot = new THREE.Group()
    pivot.rotation.y = rotY
    pivot.position.set(gx, T / 2 + gPad * 0.5 + 0.001, gz)
    pivot.add(makeLinearGageGroup(gLen, gW, gPad))
    g.add(pivot)
  }

  // -- Inner hub constraint indicator (fixed/grounded hub — always visible as a BC marker)
  const hubConstraintMat = new THREE.MeshStandardMaterial({ color: 0x22c55e, roughness: 0.5, metalness: 0.05, transparent: true, opacity: 0.75 })
  const hubIndicator = new THREE.Mesh(new THREE.CylinderGeometry(R_i * 0.82, R_i * 0.82, T * 0.18, 32), hubConstraintMat)
  hubIndicator.position.y = -T / 2 - T * 0.09
  g.add(hubIndicator)
  // Radial hatch lines from hub indicating fixed support
  const hubHatchMat = new THREE.LineBasicMaterial({ color: 0x22c55e, transparent: true, opacity: 0.7 })
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2
    const hx = Math.sin(a), hz = Math.cos(a)
    g.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(hx * R_i * 0.55, -T / 2 - T * 0.18 - 0.003, hz * R_i * 0.55),
      new THREE.Vector3(hx * R_i * 0.95, -T / 2 - T * 0.18 - 0.003, hz * R_i * 0.95),
    ]), hubHatchMat))
  }

  // -- Torque arrow (curved tangential arc at outer ring, single ArrowHelper hint)
  const tqArrowR = R_o + ringWall + 0.10
  const tqArcPts: THREE.Vector3[] = []
  const arcStart = -Math.PI * 0.35
  const arcEnd   =  Math.PI * 0.35
  for (let i = 0; i <= 20; i++) {
    const a = arcStart + (i / 20) * (arcEnd - arcStart)
    tqArcPts.push(new THREE.Vector3(Math.sin(a) * tqArrowR, 0, Math.cos(a) * tqArrowR))
  }
  if (showForces) {
    g.add(new THREE.Line(
      new THREE.BufferGeometry().setFromPoints(tqArcPts),
      new THREE.LineBasicMaterial({ color: 0xe05530, transparent: true, opacity: 0.85 })
    ))
    // Arrowhead at end of arc
    const arcTip = tqArcPts[tqArcPts.length - 1]
    const prevPt = tqArcPts[tqArcPts.length - 2]
    const arcDir = arcTip.clone().sub(prevPt).normalize()
    g.add(new THREE.ArrowHelper(arcDir, prevPt, arcDir.length() * 0.01, 0xe05530, 0.06, 0.04))
  }

  // -- Dimension lines
  if (showDims) {
    const dim = new THREE.Group()
    g.add(dim)
    const fmt = (mm: number) => p.us ? `${(mm / 25.4).toFixed(3)}"` : `${mm.toFixed(1)}mm`
    const yD  = -T / 2 - 0.12
    const yD2 = yD - 0.12
    const yAb = T / 2 + 0.07

    // Outer radius (along +X direction)
    addDimLine(dim,
      new THREE.Vector3(0, yD, 0), new THREE.Vector3(R_o, yD, 0),
      `Ro=${fmt(p.outerRadiusMm)}`, new THREE.Vector3(0, -1, 0))

    // Inner radius
    addDimLine(dim,
      new THREE.Vector3(0, yD2, 0), new THREE.Vector3(R_i, yD2, 0),
      `Ri=${fmt(p.innerRadiusMm)}`, new THREE.Vector3(0, -1, 0))

    // Spoke width (tangential, on the +Z spoke if one exists at 0° = along +Z)
    if (N > 0) {
      const spokeMidScene = R_i + (R_o - R_i) * 0.5  // along +Z
      addDimLine(dim,
        new THREE.Vector3(-W / 2, yAb, spokeMidScene), new THREE.Vector3(W / 2, yAb, spokeMidScene),
        `w=${fmt(p.spokeWidthMm)}`, new THREE.Vector3(0, 1, 0))
    }

    // Spoke thickness (axial, at outer edge of one spoke)
    addDimLine(dim,
      new THREE.Vector3(R_o + 0.12, -T / 2, 0), new THREE.Vector3(R_o + 0.12, T / 2, 0),
      `t=${fmt(p.spokeThicknessMm)}`, new THREE.Vector3(1, 0, 0))
  }

  return g
}

function JTS3D(p: Props) {
  const hostRef = useRef<HTMLDivElement | null>(null)
  const [showDims, setShowDims] = useState(true)
  const [showForces, setShowForces] = useState(true)
  const model = useMemo(() => buildJTSScene(p, showDims, showForces), [p, showDims, showForces])

  useEffect(() => {
    if (!hostRef.current) return
    const host = hostRef.current

    const scene = new THREE.Scene()
    scene.background = new THREE.Color(0x000000)

    const camera = new THREE.PerspectiveCamera(42, host.clientWidth / Math.max(1, host.clientHeight), 0.1, 100)
    camera.position.set(1.5, 1.9, 2.0)

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
        fontSize: 10, color: '#94a3b8', pointerEvents: 'none', lineHeight: 1.4,
      }}>
        <span style={{ display: 'inline-block', width: 8, height: 8, background: '#f07030', borderRadius: 1, marginRight: 4 }} />linear quarter-bridge per spoke (top face)
      </div>
    </div>
  )
}

export default function JTSModelPreview(props: Props) {
  return (
    <div className="transducer-svg-wrap" style={{ height: '800px' }}>
      <JTS3D {...props} />
    </div>
  )
}
