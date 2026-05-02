import { useEffect, useMemo, useRef, useState } from 'react'
import * as THREE from 'three'
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { createAxesGizmo } from './sceneHelpers'
import { makeBodyMaterial } from '../domain/materialAppearance'

interface Props {
  topRingRadiusMm: number
  bottomRingRadiusMm: number
  platformHeightMm: number
  strutDiameterMm: number
  strutSpreadDeg?: number
  topAnglesOffsetDeg?: number
  us?: boolean
  materialId?: string
}

type Vec3 = [number, number, number]

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
  // Local frame: carrier flat in XZ plane, sensing axis = +X, tabs at -X end
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

/**
 * Place a linear gage on the outer surface of a strut at its midpoint.
 * Sensing axis aligns with the strut axis; carrier normal faces radially outward.
 */
function addStrutGage(g: THREE.Group, from: Vec3, to: Vec3, strutR: number, gLen: number, gW: number, gPad: number) {
  const fv = new THREE.Vector3(...from)
  const tv = new THREE.Vector3(...to)
  const strutAxis = tv.clone().sub(fv).normalize()
  const mid = fv.clone().add(tv).multiplyScalar(0.5)

  // Outward direction: XZ projection of strut midpoint, then subtract strut-axis component
  const outXZ = new THREE.Vector3(mid.x, 0, mid.z)
  if (outXZ.length() < 1e-6) return
  outXZ.normalize()
  const outPerp = outXZ.clone().sub(strutAxis.clone().multiplyScalar(outXZ.dot(strutAxis)))
  if (outPerp.length() < 0.01) return
  outPerp.normalize()

  const zVec = strutAxis.clone().cross(outPerp).normalize()

  const pivot = new THREE.Group()
  // Sit on strut surface: offset outward by strut radius + gage pad half-thickness
  pivot.position.copy(mid.clone().add(outPerp.clone().multiplyScalar(strutR + gPad * 0.5 + 0.001)))
  // X = strut axis (sensing), Y = outward (carrier normal), Z = X×Y
  pivot.setRotationFromMatrix(new THREE.Matrix4().makeBasis(strutAxis, outPerp, zVec))

  pivot.add(makeLinearGageGroup(gLen, gW, gPad))
  g.add(pivot)
}

/** Orient a cylinder mesh from `from` to `to` in scene space. */
function makeCylinder(from: Vec3, to: Vec3, radius: number, mat: THREE.Material): THREE.Mesh {
  const fv = new THREE.Vector3(...from)
  const tv = new THREE.Vector3(...to)
  const length = fv.distanceTo(tv)
  const mesh = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius, length, 8), mat)
  mesh.position.copy(fv.clone().add(tv).multiplyScalar(0.5))
  const dir = tv.clone().sub(fv).normalize()
  mesh.setRotationFromQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir))
  return mesh
}

/**
 * Compute 3 top + 6 bottom attachment point positions (scene units).
 * Domain convention: Z is axial/up; mapped to scene Y.
 * Domain X → scene X, domain Y → scene Z.
 */
function computeAttachPoints(p: Props, S: number): { top: Vec3[]; bot: Vec3[] } {
  const DEG = Math.PI / 180
  const R_t = p.topRingRadiusMm * S
  const R_b = p.bottomRingRadiusMm * S
  const H   = p.platformHeightMm * S
  const topOff = (p.topAnglesOffsetDeg ?? 0) * DEG
  const spread = (p.strutSpreadDeg ?? 15) * DEG

  const top: Vec3[] = []
  const bot: Vec3[] = []

  for (let k = 0; k < 3; k++) {
    const aTop = topOff + k * (2 * Math.PI / 3)
    // Domain X = cos, domain Y = sin → scene X = cos, scene Z = sin, scene Y = domain Z
    top.push([R_t * Math.cos(aTop), H / 2, R_t * Math.sin(aTop)])

    const aCenter = k * (2 * Math.PI / 3) + Math.PI / 3
    for (const sSign of [-1, 1]) {
      const aBot = aCenter + sSign * spread
      bot.push([R_b * Math.cos(aBot), -H / 2, R_b * Math.sin(aBot)])
    }
  }
  return { top, bot }
}

function buildHexapodScene(p: Props, showDims: boolean, showForces: boolean): THREE.Group {
  const g = new THREE.Group()
  const S = 0.75 / Math.max(p.bottomRingRadiusMm, p.topRingRadiusMm, 10)

  const R_t  = p.topRingRadiusMm * S
  const R_b  = p.bottomRingRadiusMm * S
  const H    = clamp(p.platformHeightMm * S, 0.15, 1.5)
  const dStr = clamp(p.strutDiameterMm * S * 0.5, 0.008, 0.045)

  // -- Materials
  const topDiskMat = makeBodyMaterial(p.materialId)
  const botRingMat = makeBodyMaterial(p.materialId)
  const strutMat   = makeBodyMaterial(p.materialId)
  const topAttMat  = new THREE.MeshStandardMaterial({ color: 0xf07030, roughness: 0.35, metalness: 0.05 }) // amber
  const botAttMat  = new THREE.MeshStandardMaterial({ color: 0x20a880, roughness: 0.35, metalness: 0.05 }) // teal
  const dimMat     = new THREE.LineBasicMaterial({ color: 0x3e5a73, transparent: true, opacity: 0.8 })

  const diskT = clamp(H * 0.10, 0.015, 0.06)

  // -- Top platform disk
  g.add(new THREE.Mesh(new THREE.CylinderGeometry(R_t, R_t, diskT, 40), topDiskMat).translateY(H / 2))

  // -- Bottom ring (thicker, slightly larger)
  g.add(new THREE.Mesh(new THREE.CylinderGeometry(R_b, R_b, diskT * 1.5, 40), botRingMat).translateY(-H / 2))

  // -- Struts
  const { top, bot } = computeAttachPoints(p, S)

  for (let k = 0; k < 3; k++) {
    const tp = top[k]
    for (let s = 0; s < 2; s++) {
      const bp = bot[k * 2 + s]
      g.add(makeCylinder(bp, tp, dStr, strutMat))
    }
  }

  // -- Attachment point spheres
  const attR = clamp(dStr * 2.2, 0.014, 0.055)
  const topSphGeom = new THREE.SphereGeometry(attR, 12, 8)
  const botSphGeom = new THREE.SphereGeometry(attR * 0.85, 10, 7)

  for (const tp of top) {
    const sph = new THREE.Mesh(topSphGeom, topAttMat)
    sph.position.set(...tp); g.add(sph)
  }
  for (const bp of bot) {
    const sph = new THREE.Mesh(botSphGeom, botAttMat)
    sph.position.set(...bp); g.add(sph)
  }

  // -- Axial gages (linear, amber): one per strut, mid-span, facing outward radially
  const strutVec = new THREE.Vector3(...top[0]).sub(new THREE.Vector3(...bot[0]))
  const strutLen = strutVec.length()
  const gLen = clamp(strutLen * 0.18, 0.016, 0.10)
  const gW   = clamp(dStr * 2.4, 0.012, 0.07)
  const gPad = 0.004

  for (let k = 0; k < 3; k++) {
    const tp = top[k]
    for (let s = 0; s < 2; s++) {
      addStrutGage(g, bot[k * 2 + s], tp, dStr, gLen, gW, gPad)
    }
  }

  // -- Load arrow (Fz downward into top platform)
  const arrowLen = clamp(R_t * 0.6, 0.20, 0.52)
  if (showForces) {
    g.add(new THREE.ArrowHelper(
      new THREE.Vector3(0, -1, 0),
      new THREE.Vector3(0, H / 2 + arrowLen, 0),
      arrowLen, 0xe05530, arrowLen * 0.24, arrowLen * 0.16,
    ))
    // Fx arrow
    const fSmall = arrowLen * 0.6
    g.add(new THREE.ArrowHelper(
      new THREE.Vector3(1, 0, 0),
      new THREE.Vector3(-fSmall * 0.5, H / 2 + arrowLen * 0.3, 0),
      fSmall, 0xe05530, fSmall * 0.24, fSmall * 0.16,
    ))
    // Fy arrow (+Z)
    g.add(new THREE.ArrowHelper(
      new THREE.Vector3(0, 0, 1),
      new THREE.Vector3(0, H / 2 + arrowLen * 0.3, -fSmall * 0.5),
      fSmall, 0xe05530, fSmall * 0.24, fSmall * 0.16,
    ))
    // Bottom platform hatch lines (green) indicating ground constraint
    const hatchMatHex = new THREE.LineBasicMaterial({ color: 0x22c55e })
    const nHatchHex = 8
    for (let i = 0; i < nHatchHex; i++) {
      const a = (i / nHatchHex) * Math.PI * 2
      const hr = R_b * 0.85
      g.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(Math.cos(a) * hr, -H / 2 - diskT * 1.5, Math.sin(a) * hr),
        new THREE.Vector3(Math.cos(a) * hr * 1.3, -H / 2 - diskT * 1.5 - 0.08, Math.sin(a) * hr * 1.3),
      ]), hatchMatHex))
    }
  }

  // -- Height dashed line (vertical, at edge)
  const xEdge = R_t + 0.12
  const hLine = new THREE.Line(
    new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(xEdge, -H / 2, 0),
      new THREE.Vector3(xEdge, H / 2, 0),
    ]),
    dimMat
  )
  g.add(hLine)

  // -- Dimension lines
  if (showDims) {
    const dim = new THREE.Group()
    g.add(dim)
    const yBot = -H / 2 - diskT - 0.10
    const yTop = H / 2 + diskT + 0.08

    const fmt = (mm: number) => p.us ? `${(mm / 25.4).toFixed(3)}"` : `${mm.toFixed(1)}mm`

    // Bottom ring radius
    addDimLine(dim,
      new THREE.Vector3(0, yBot, 0), new THREE.Vector3(R_b, yBot, 0),
      `Rb=${fmt(p.bottomRingRadiusMm)}`, new THREE.Vector3(0, -1, 0))

    // Top ring radius
    addDimLine(dim,
      new THREE.Vector3(0, yTop, 0), new THREE.Vector3(R_t, yTop, 0),
      `Rt=${fmt(p.topRingRadiusMm)}`, new THREE.Vector3(0, 1, 0))

    // Platform height (vertical at side)
    addDimLine(dim,
      new THREE.Vector3(xEdge + 0.10, -H / 2, 0), new THREE.Vector3(xEdge + 0.10, H / 2, 0),
      `h=${fmt(p.platformHeightMm)}`, new THREE.Vector3(1, 0, 0))
  }

  return g
}

function Hexapod3D(p: Props) {
  const hostRef = useRef<HTMLDivElement | null>(null)
  const [showDims, setShowDims] = useState(true)
  const [showForces, setShowForces] = useState(true)
  const model = useMemo(() => buildHexapodScene(p, showDims, showForces), [p, showDims, showForces])

  useEffect(() => {
    if (!hostRef.current) return
    const host = hostRef.current

    const scene = new THREE.Scene()
    scene.background = new THREE.Color(0x000000)

    const camera = new THREE.PerspectiveCamera(40, host.clientWidth / Math.max(1, host.clientHeight), 0.1, 100)
    camera.position.set(1.8, 1.6, 2.4)

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
      </div>
      <div style={{
        position: 'absolute', bottom: 10, left: 10, zIndex: 10,
        fontSize: 10, color: '#94a3b8', pointerEvents: 'none', lineHeight: 1.6,
      }}>
        <span style={{ display: 'inline-block', width: 8, height: 8, background: '#d07828', borderRadius: 1, marginRight: 4 }} />axial gage (1 per strut)
        {'  '}
        <span style={{ display: 'inline-block', width: 8, height: 8, background: '#f07030', borderRadius: '50%', marginRight: 4, marginLeft: 8 }} />top attach pts
        {'  '}
        <span style={{ display: 'inline-block', width: 8, height: 8, background: '#20a880', borderRadius: '50%', marginRight: 4, marginLeft: 8 }} />bottom attach pts
      </div>
    </div>
  )
}

export default function HexapodModelPreview(props: Props) {
  return (
    <div className="transducer-svg-wrap" style={{ height: '800px' }}>
      <Hexapod3D {...props} />
    </div>
  )
}
