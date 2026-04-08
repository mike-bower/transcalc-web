import { useEffect, useMemo, useRef, useState } from 'react'
import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'

type Props = {
  load: number
  width: number
  thickness: number
  distBetweenGages: number
  gageLength: number
  unitSystem: 'SI' | 'US'
}

function clamp(v: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, v))
}

function makeTextSprite(text: string): THREE.Sprite {
  const canvas = document.createElement('canvas')
  const ctx = canvas.getContext('2d')
  if (ctx) {
    canvas.width = 512
    canvas.height = 128
    ctx.fillStyle = 'rgba(255, 255, 255, 0)'
    ctx.fillRect(0, 0, canvas.width, canvas.height)
    ctx.font = 'bold 32px "Inter", "Segoe UI", sans-serif'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillStyle = '#475569' // Slate 600
    ctx.fillText(text, canvas.width / 2, canvas.height / 2)
  }
  const texture = new THREE.CanvasTexture(canvas)
  const material = new THREE.SpriteMaterial({ map: texture, transparent: true })
  const sprite = new THREE.Sprite(material)
  sprite.scale.set(0.6, 0.15, 1)
  return sprite
}

function addDimensionLine(
  group: THREE.Group,
  from: THREE.Vector3,
  to: THREE.Vector3,
  text: string,
  normal: THREE.Vector3,
  showTicks: boolean = true
) {
  const mat = new THREE.LineBasicMaterial({ color: 0x94a3b8, transparent: true, opacity: 0.8 }) // Slate 400
  const line = new THREE.Line(
    new THREE.BufferGeometry().setFromPoints([from, to]),
    mat
  )
  group.add(line)

  if (showTicks) {
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
  }

  const label = makeTextSprite(text)
  label.position.copy(from.clone().add(to).multiplyScalar(0.5).add(normal.clone().normalize().multiplyScalar(0.12)))
  group.add(label)
}

export default function ReverseBeamModelPreview({ load, width, thickness, distBetweenGages, gageLength, unitSystem }: Props) {
  const hostRef = useRef<HTMLDivElement | null>(null)
  const [showDimensions] = useState(true)
  const isUS = unitSystem === 'US'

  const sceneParams = useMemo(() => {
    const mmToScene = 1 / 100
    
    // Scale inputs to scene units
    const spanMm = distBetweenGages || 100
    const tMm = thickness || 5
    const wMm = width || 25
    const gLenMm = gageLength || 6

    // Clamping for visualization stability
    const L = clamp(spanMm * mmToScene, 0.5, 4.0)
    const T = clamp(tMm * mmToScene, 0.02, 0.4)
    const W = clamp(wMm * mmToScene, 0.1, 1.2)
    const GL = clamp(gLenMm * mmToScene, 0.04, 0.3)

    return { L, T, W, GL, spanMm, tMm, wMm, gLenMm, mmToScene }
  }, [distBetweenGages, thickness, width, gageLength])

  useEffect(() => {
    if (!hostRef.current) return

    const w = hostRef.current.clientWidth
    const h = hostRef.current.clientHeight
    const scene = new THREE.Scene()
    scene.background = new THREE.Color(0xf8fafc) // Slate 50

    const camera = new THREE.PerspectiveCamera(35, w / h, 0.1, 1000)
    camera.position.set(3, 2, 4)

    const renderer = new THREE.WebGLRenderer({ antialias: true })
    renderer.setSize(w, h)
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    hostRef.current.appendChild(renderer.domElement)

    const controls = new OrbitControls(camera, renderer.domElement)
    controls.enableDamping = true
    controls.dampingFactor = 0.08
    controls.minDistance = 1
    controls.maxDistance = 20

    // Lights
    scene.add(new THREE.AmbientLight(0xffffff, 0.7))
    const dirLight = new THREE.DirectionalLight(0xffffff, 0.8)
    dirLight.position.set(5, 10, 7.5)
    scene.add(dirLight)

    const root = new THREE.Group()
    scene.add(root)

    const { L, T, W, GL } = sceneParams
    const mat = new THREE.MeshStandardMaterial({ color: 0x3b82f6, roughness: 0.3, metalness: 0.1 }) // Blue 500
    
    // Main Beam body
    const beamGeom = new THREE.BoxGeometry(L, T, W)
    const beam = new THREE.Mesh(beamGeom, mat)
    root.add(beam)

    // Support Pyramids
    const supportMat = new THREE.MeshStandardMaterial({ color: 0x64748b, roughness: 0.5 }) 
    const supportGeom = new THREE.ConeGeometry(0.12, 0.2, 4)
    supportGeom.rotateY(Math.PI / 4) 
    
    const s1 = new THREE.Mesh(supportGeom, supportMat)
    s1.position.set(-L/2, -T/2 - 0.1, 0)
    root.add(s1)

    const s2 = new THREE.Mesh(supportGeom, supportMat)
    s2.position.set(L/2, -T/2 - 0.1, 0)
    root.add(s2)

    // Gages (on top)
    const gageMat = new THREE.MeshStandardMaterial({ color: 0xef4444, roughness: 0.3 }) // Red 500
    const gageGeom = new THREE.BoxGeometry(GL, 0.01, GL * 0.7)
    
    const gage1 = new THREE.Mesh(gageGeom, gageMat)
    gage1.position.set(-L/2 + GL * 0.8, T/2 + 0.005, 0)
    root.add(gage1)

    const gage2 = new THREE.Mesh(gageGeom, gageMat)
    gage2.position.set(L/2 - GL * 0.8, T/2 + 0.005, 0)
    root.add(gage2)

    // Load Arrow (Middle)
    const arrow = new THREE.ArrowHelper(
      new THREE.Vector3(0, -1, 0),
      new THREE.Vector3(0, T/2 + 0.4, 0),
      0.35,
      0xef4444,
      0.12,
      0.08
    )
    root.add(arrow)

    if (showDimensions) {
      const dim = new THREE.Group()
      root.add(dim)

      const fmt = (v: number) => isUS ? (v / 25.4).toFixed(3) : v.toFixed(1)
      const u = isUS ? 'in' : 'mm'
      const fUnit = isUS ? 'lbf' : 'N'
      const fVal = isUS ? (load / 4.448) : load
      const fStr = `${fVal.toFixed(1)} ${fUnit}`

      // Span D
      addDimensionLine(dim, 
        new THREE.Vector3(-L/2, -T/2-0.2, W/2+0.1), 
        new THREE.Vector3(L/2, -T/2-0.2, W/2+0.1),
        `D = ${fmt(sceneParams.spanMm)}${u}`,
        new THREE.Vector3(0, -0.3, 0)
      )

      // Thickness
      addDimensionLine(dim,
        new THREE.Vector3(L/2+0.2, -T/2, W/2),
        new THREE.Vector3(L/2+0.2, T/2, W/2),
        `t = ${fmt(sceneParams.tMm)}${u}`,
        new THREE.Vector3(0.3, 0, 0)
      )

      // Width
      addDimensionLine(dim,
        new THREE.Vector3(L/2, -T/2, -W/2),
        new THREE.Vector3(L/2, -T/2, W/2),
        `w = ${fmt(sceneParams.wMm)}${u}`,
        new THREE.Vector3(0.4, -0.1, 0)
      )

      // Load label
      const flabel = makeTextSprite(fStr)
      flabel.position.set(0, T/2 + 0.5, 0)
      dim.add(flabel)
    }

    let frameId: number
    const animate = () => {
      frameId = requestAnimationFrame(animate)
      controls.update()
      renderer.render(scene, camera)
    }
    animate()

    const handleResize = () => {
      if (!hostRef.current) return
      const w2 = hostRef.current.clientWidth
      const h2 = hostRef.current.clientHeight
      renderer.setSize(w2, h2)
      camera.aspect = w2 / h2
      camera.updateProjectionMatrix()
    }
    window.addEventListener('resize', handleResize)

    return () => {
      window.removeEventListener('resize', handleResize)
      cancelAnimationFrame(frameId)
      renderer.dispose()
      if (hostRef.current) {
        hostRef.current.removeChild(renderer.domElement)
      }
    }
  }, [sceneParams, load, showDimensions, isUS])

  return (
    <div ref={hostRef} style={{ width: '100%', height: '100%', minHeight: '300px' }} />
  )
}
