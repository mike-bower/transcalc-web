import { useEffect, useMemo, useRef, useState } from 'react'
import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'

type Props = {
  params: Record<string, number>
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
    ctx.fillStyle = 'rgba(244,248,252,0.9)'
    ctx.fillRect(0, 0, canvas.width, canvas.height)
    ctx.fillStyle = '#1f3f5c'
    ctx.font = 'bold 40px Barlow, sans-serif'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText(text, canvas.width / 2, canvas.height / 2)
  }
  const texture = new THREE.CanvasTexture(canvas)
  const material = new THREE.SpriteMaterial({ map: texture, transparent: true })
  const sprite = new THREE.Sprite(material)
  sprite.scale.set(0.85, 0.22, 1)
  return sprite
}

function addDimensionLine(
  group: THREE.Group,
  from: THREE.Vector3,
  to: THREE.Vector3,
  text: string,
  normal: THREE.Vector3
) {
  const mat = new THREE.LineBasicMaterial({ color: 0x3e5a73 })
  const line = new THREE.Line(
    new THREE.BufferGeometry().setFromPoints([from, to]),
    mat
  )
  group.add(line)

  const tickHalf = 0.03
  const n = normal.clone().normalize().multiplyScalar(tickHalf)
  const tickA = new THREE.Line(
    new THREE.BufferGeometry().setFromPoints([from.clone().sub(n), from.clone().add(n)]),
    mat
  )
  const tickB = new THREE.Line(
    new THREE.BufferGeometry().setFromPoints([to.clone().sub(n), to.clone().add(n)]),
    mat
  )
  group.add(tickA, tickB)

  const label = makeTextSprite(text)
  label.position.copy(from.clone().add(to).multiplyScalar(0.5).add(normal.clone().multiplyScalar(0.06)))
  group.add(label)
}

function Cantilever3D({ params }: { params: Record<string, number> }) {
  const hostRef = useRef<HTMLDivElement | null>(null)
  const rootRef = useRef<THREE.Group | null>(null)

  const model = useMemo(() => {
    const g = new THREE.Group()
    const mmToScene = 1 / 90
    const loadN = p(params, 'load', 100)
    const momentArmMm = p(params, 'momentArm', 100)
    const gageOffsetMm = p(params, 'gageOffset', 6)
    const thicknessMm = p(params, 'thickness', 2)
    const widthMm = p(params, 'width', 25)
    const clampLengthMm = p(params, 'clampLength', 20)
    const holeOffsetMm = p(params, 'mountHoleOffset', 12)
    const holeDiaMm = p(params, 'mountHoleDia', 5)
    const gageLenMm = p(params, 'gageLen', 5)

    const beamLengthMm = Math.max(momentArmMm + gageOffsetMm, gageOffsetMm + gageLenMm)
    const L = clamp(beamLengthMm * mmToScene, 0.5, 4.2)
    const T = clamp(thicknessMm * mmToScene, 0.05, 0.45)
    const W = clamp(widthMm * mmToScene, 0.14, 1.2)
    const clampLen = clamp(clampLengthMm * mmToScene, 0.12, 1.2)
    const holeRadius = clamp((holeDiaMm * 0.5) * mmToScene, 0.015, W * 0.42)
    const holeX = clamp(holeOffsetMm * mmToScene, holeRadius + 0.03, L * 0.6)
    const gageLen = clamp(gageLenMm * mmToScene, 0.05, L * 0.65)
    const gageWidth = clamp(gageLen * 0.5, 0.04, W * 0.92)
    const gageCenter = clamp(gageOffsetMm * mmToScene, gageLen * 0.55, L - gageLen * 0.55)
    const loadArrowLength = clamp(0.18 + Math.log10(Math.max(loadN, 1)) * 0.12, 0.22, 0.58)

    const mat = new THREE.MeshStandardMaterial({ color: 0x4a88b8, roughness: 0.45, metalness: 0.1 })
    const softMat = new THREE.MeshStandardMaterial({ color: 0x8aa7be, roughness: 0.55, metalness: 0.05 })
    const beam = new THREE.Mesh(new THREE.BoxGeometry(L, T, W), mat)
    beam.position.x = L * 0.5
    g.add(beam)

    const clampBlock = new THREE.Mesh(new THREE.BoxGeometry(clampLen, T * 2.6, W * 1.25), softMat)
    clampBlock.position.x = -(clampLen * 0.5)
    g.add(clampBlock)

    const boltMat = new THREE.MeshStandardMaterial({ color: 0x5d6977, roughness: 0.3, metalness: 0.4 })
    const boltRadius = clamp(T * 0.2, 0.015, 0.045)
    const boltA = new THREE.Mesh(new THREE.CylinderGeometry(boltRadius, boltRadius, W * 0.92, 16), boltMat)
    boltA.rotation.x = Math.PI / 2
    boltA.position.set(0, T * 1.14, -W * 0.22)
    const boltB = boltA.clone()
    boltB.position.z = W * 0.18
    g.add(boltA, boltB)

    const hole = new THREE.Mesh(
      new THREE.CylinderGeometry(holeRadius, holeRadius, T * 1.45, 18),
      new THREE.MeshStandardMaterial({ color: 0xd8e5ef, transparent: true, opacity: 0.7 })
    )
    hole.rotation.x = Math.PI / 2
    hole.position.set(holeX, 0, 0)
    g.add(hole)

    const gagePad = new THREE.Mesh(
      new THREE.BoxGeometry(gageLen, Math.max(0.01, T * 0.08), gageWidth),
      new THREE.MeshStandardMaterial({ color: 0xf0a451, roughness: 0.55, metalness: 0.06 })
    )
    gagePad.position.set(gageCenter, T * 0.54, 0)
    g.add(gagePad)

    const force = new THREE.ArrowHelper(
      new THREE.Vector3(0, -1, 0),
      new THREE.Vector3(L - 0.03, T * 0.95 + loadArrowLength, 0),
      loadArrowLength,
      0x1f2f3f,
      Math.min(0.18, loadArrowLength * 0.36),
      Math.min(0.11, loadArrowLength * 0.24)
    )
    g.add(force)

    // Dimension lines based on active input values.
    const dimGroup = new THREE.Group()
    const yUnder = -T * 0.9
    const zFront = W * 0.75

    addDimensionLine(
      dimGroup,
      new THREE.Vector3(0, yUnder, zFront),
      new THREE.Vector3(L, yUnder, zFront),
      `L=${beamLengthMm.toFixed(1)} mm`,
      new THREE.Vector3(0, -1, 0)
    )
    addDimensionLine(
      dimGroup,
      new THREE.Vector3(L * 0.16, -T / 2, zFront),
      new THREE.Vector3(L * 0.16, T / 2, zFront),
      `t=${thicknessMm.toFixed(2)} mm`,
      new THREE.Vector3(1, 0, 0)
    )
    addDimensionLine(
      dimGroup,
      new THREE.Vector3(L * 0.62, T * 0.9, -W / 2),
      new THREE.Vector3(L * 0.62, T * 0.9, W / 2),
      `w=${widthMm.toFixed(2)} mm`,
      new THREE.Vector3(0, 1, 0)
    )
    addDimensionLine(
      dimGroup,
      new THREE.Vector3(gageCenter - gageLen / 2, T * 0.72, W * 0.55),
      new THREE.Vector3(gageCenter + gageLen / 2, T * 0.72, W * 0.55),
      `gage=${gageLenMm.toFixed(2)} mm`,
      new THREE.Vector3(0, 1, 0)
    )
    addDimensionLine(
      dimGroup,
      new THREE.Vector3(0, T * 0.64, W * 0.63),
      new THREE.Vector3(gageCenter, T * 0.64, W * 0.63),
      `offset=${gageOffsetMm.toFixed(2)} mm`,
      new THREE.Vector3(0, 1, 0)
    )
    addDimensionLine(
      dimGroup,
      new THREE.Vector3(0, -T * 0.64, -W * 0.63),
      new THREE.Vector3(holeX, -T * 0.64, -W * 0.63),
      `hole x=${holeOffsetMm.toFixed(2)} mm`,
      new THREE.Vector3(0, -1, 0)
    )

    g.add(dimGroup)

    return g
  }, [params])

  useEffect(() => {
    if (!hostRef.current) return
    const host = hostRef.current
    const scene = new THREE.Scene()
    scene.background = new THREE.Color(0xf4f8fc)
    const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 100)
    camera.position.set(2.5, 1.8, 2.2)
    const renderer = new THREE.WebGLRenderer({ antialias: true })
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    renderer.setSize(host.clientWidth, host.clientHeight)
    host.appendChild(renderer.domElement)

    const controls = new OrbitControls(camera, renderer.domElement)
    controls.enablePan = true
    controls.enableZoom = true
    controls.enableDamping = true
    controls.dampingFactor = 0.08
    controls.target.set(0.6, 0, 0)
    controls.update()

    scene.add(new THREE.AmbientLight(0xffffff, 0.65))
    const d = new THREE.DirectionalLight(0xffffff, 0.95)
    d.position.set(4, 5, 3)
    scene.add(d)
    scene.add(new THREE.GridHelper(6, 14, 0xbfd3e5, 0xdbe7f2))

    const root = new THREE.Group()
    rootRef.current = root
    scene.add(root)
    root.add(model)

    let raf = 0
    const animate = () => {
      raf = window.requestAnimationFrame(animate)
      controls.update()
      renderer.render(scene, camera)
    }
    animate()

    const ro = new ResizeObserver(() => {
      const w = host.clientWidth
      const h = host.clientHeight
      renderer.setSize(w, h)
      camera.aspect = w / Math.max(1, h)
      camera.updateProjectionMatrix()
    })
    ro.observe(host)

    return () => {
      window.cancelAnimationFrame(raf)
      ro.disconnect()
      controls.dispose()
      renderer.dispose()
      host.removeChild(renderer.domElement)
    }
  }, [model])

  return <div ref={hostRef} className="transducer-3d-canvas" />
}

export default function CantileverModelPreview({ params }: Props) {
  const [mode, setMode] = useState<'step' | '3d'>('step')

  return (
    <div className="transducer-svg-wrap">
      <div className="transducer-svg-toolbar">
        <button className={`export-btn${mode === 'step' ? ' active-preview' : ''}`} onClick={() => setMode('step')}>STEP</button>
        <button className={`export-btn${mode === '3d' ? ' active-preview' : ''}`} onClick={() => setMode('3d')}>3D</button>
      </div>
      <Cantilever3D params={params} />
      <p className="strain-field-label">
        {mode === 'step'
          ? 'STEP rendering preview.'
          : 'Interactive cantilever 3D model driven by current design inputs.'}
      </p>
    </div>
  )
}
