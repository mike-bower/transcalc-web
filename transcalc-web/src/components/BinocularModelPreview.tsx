import React, { useRef, useEffect, useMemo, useState } from 'react'
import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'

type Props = {
  params: Record<string, number>
  us?: boolean
}

// Helper for param retrieval
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
  showTicks: boolean = true
) {
  const mat = new THREE.LineBasicMaterial({ color: 0x3e5a73, transparent: true, opacity: 0.8 })
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
  label.position.copy(from.clone().add(to).multiplyScalar(0.5).add(normal.clone().multiplyScalar(0.08)))
  group.add(label)
}

/**
 * BinocularModelPreview — 3D interactive viewer for the H-pattern / Binocular flexure.
 */
export const BinocularModelPreview: React.FC<Props> = ({ params, us }) => {
  const hostRef = useRef<HTMLDivElement | null>(null)
  const [showDimensions, setShowDimensions] = useState(true)

  const model = useMemo(() => {
    const g = new THREE.Group()
    const mmToScene = 1 / 60 // Scale factor

    // Extract params
    const W_mm = p(params, 'width', 25)
    const H_mm = p(params, 'height', 50)
    const L_mm = p(params, 'length', 60)
    const R_mm = p(params, 'radius', 12)
    const t_mm = p(params, 'webThickness', 4)
    const s_mm = p(params, 'slotSpacing', 20)
    const loadN = p(params, 'load', 100)

    // Scene dimensions
    const W = W_mm * mmToScene
    const H = H_mm * mmToScene
    const L = L_mm * mmToScene
    const R = R_mm * mmToScene
    const t = t_mm * mmToScene
    const s = s_mm * mmToScene

    const halfL = L / 2
    const halfH = H / 2
    const halfW = W / 2

    // Material
    const bodyMat = new THREE.MeshStandardMaterial({
      color: 0x94a3b8,
      roughness: 0.4,
      metalness: 0.2
    })

    // 2. Profile Shape (Side view block)
    const shape = new THREE.Shape()
    shape.moveTo(-halfL, -halfH)
    shape.lineTo(halfL, -halfH)
    shape.lineTo(halfL, halfH)
    shape.lineTo(-halfL, halfH)
    shape.closePath()

    // 3. Binocular "Pill" Holes (Vertical Slots)
    // Left Pill
    const leftPill = new THREE.Path()
    leftPill.moveTo(-s / 2 - R, R)
    leftPill.absarc(-s / 2, R, R, Math.PI, 0, true)  // CW Top
    leftPill.lineTo(-s / 2 + R, -R)
    leftPill.absarc(-s / 2, -R, R, 0, Math.PI, true) // CW Bottom
    leftPill.lineTo(-s / 2 - R, R)
    leftPill.closePath()
    shape.holes.push(leftPill)

    // Right Pill
    const rightPill = new THREE.Path()
    rightPill.moveTo(s / 2 - R, R)
    rightPill.absarc(s / 2, R, R, Math.PI, 0, true)   // CW Top
    rightPill.lineTo(s / 2 + R, -R)
    rightPill.absarc(s / 2, -R, R, 0, Math.PI, true)  // CW Bottom
    rightPill.lineTo(s / 2 - R, R)
    rightPill.closePath()
    shape.holes.push(rightPill)

    // 4. Connecting Web (Central Horizontal Slot)
    const webH = t
    const webCutout = new THREE.Path()
    webCutout.moveTo(-s / 2 + R, webH / 2)
    webCutout.lineTo(s / 2 - R, webH / 2)
    webCutout.lineTo(s / 2 - R, -webH / 2)
    webCutout.lineTo(-s / 2 + R, -webH / 2)
    webCutout.closePath()
    shape.holes.push(webCutout)

    const extrudeSettings = {
      depth: W,
      bevelEnabled: true,
      bevelThickness: 0.015,
      bevelSize: 0.015,
      bevelSegments: 3
    }

    const geometry = new THREE.ExtrudeGeometry(shape, extrudeSettings)
    geometry.center()
    const mesh = new THREE.Mesh(geometry, bodyMat)
    g.add(mesh)

    // --- DIMENSIONS ---
    if (showDimensions) {
      const dimGroup = new THREE.Group()
      const fmt = (v: number) => us ? (v / 25.4).toFixed(3) : v.toFixed(1)
      const unit = us ? 'in' : 'mm'

      // Overall Length (L)
      addDimensionLine(dimGroup, 
        new THREE.Vector3(-halfL, -halfH - 0.2, -halfW),
        new THREE.Vector3(halfL, -halfH - 0.2, -halfW),
        `${fmt(L_mm)} ${unit}`,
        new THREE.Vector3(0, -0.1, 0)
      )

      // Overall Height (H)
      addDimensionLine(dimGroup, 
        new THREE.Vector3(-halfL - 0.2, -halfH, -halfW),
        new THREE.Vector3(-halfL - 0.2, halfH, -halfW),
        `${fmt(H_mm)} ${unit}`,
        new THREE.Vector3(-0.1, 0, 0)
      )

      // Overall Width (W)
      addDimensionLine(dimGroup, 
        new THREE.Vector3(halfL + 0.1, -halfH, -halfW),
        new THREE.Vector3(halfL + 0.1, -halfH, halfW),
        `${fmt(W_mm)} ${unit}`,
        new THREE.Vector3(0.05, -0.05, 0)
      )

      // Slot Spacing (s)
      addDimensionLine(dimGroup, 
        new THREE.Vector3(-s/2, 0, -halfW - 0.1),
        new THREE.Vector3(s/2, 0, -halfW - 0.1),
        `s=${fmt(s_mm)}`,
        new THREE.Vector3(0, 0.1, -0.05)
      )

      // Web Thickness (t) - shown at top
      addDimensionLine(dimGroup, 
        new THREE.Vector3(-s/2, halfH - t, halfW + 0.1),
        new THREE.Vector3(-s/2, halfH, halfW + 0.1),
        `t=${fmt(t_mm)}`,
        new THREE.Vector3(-0.05, 0, 0.05)
      )

      g.add(dimGroup)
    }

    // --- FORCE ARROWS ---
    const arrowLen = 0.4
    const supportY = -halfH
    const loadY = halfH

    // Fixed Support (Left Bottom)
    const supportArrow = new THREE.ArrowHelper(
      new THREE.Vector3(0, 1, 0),
      new THREE.Vector3(-halfL + 0.2, supportY - arrowLen, 0),
      arrowLen,
      0x22c55e,
      0.1, 0.06
    )
    g.add(supportArrow)

    // Load Arrow (Right Top or Bottom depending on setup, usually top for generic binocular)
    const loadForceStr = us ? `${(loadN / 4.44822).toFixed(1)} lbf` : `${loadN.toFixed(0)} N`
    const loadArrow = new THREE.ArrowHelper(
      new THREE.Vector3(0, -1, 0),
      new THREE.Vector3(halfL - 0.2, loadY + arrowLen, 0),
      arrowLen,
      0xef4444,
      0.1, 0.06
    )
    const loadLabel = makeTextSprite(loadForceStr)
    loadLabel.position.set(halfL - 0.2, loadY + arrowLen * 1.4, 0)
    g.add(loadArrow, loadLabel)

    return g
  }, [params, us, showDimensions])

  useEffect(() => {
    if (!hostRef.current) return
    const host = hostRef.current
    
    const scene = new THREE.Scene()
    scene.background = new THREE.Color(0xf8fafc)

    const camera = new THREE.PerspectiveCamera(35, host.clientWidth / host.clientHeight, 0.1, 1000)
    camera.position.set(4, 3, 6)

    const renderer = new THREE.WebGLRenderer({ antialias: true })
    renderer.setPixelRatio(window.devicePixelRatio)
    renderer.setSize(host.clientWidth, host.clientHeight)
    host.appendChild(renderer.domElement)

    const controls = new OrbitControls(camera, renderer.domElement)
    controls.enableDamping = true
    controls.dampingFactor = 0.1
    controls.target.set(0, 0, 0)

    scene.add(new THREE.AmbientLight(0xffffff, 0.7))
    const dLight = new THREE.DirectionalLight(0xffffff, 0.6)
    dLight.position.set(5, 10, 7.5)
    scene.add(dLight)

    scene.add(model)

    let frameId: number
    const animate = () => {
      frameId = requestAnimationFrame(animate)
      controls.update()
      renderer.render(scene, camera)
    }
    animate()

    const handleResize = () => {
      camera.aspect = host.clientWidth / host.clientHeight
      camera.updateProjectionMatrix()
      renderer.setSize(host.clientWidth, host.clientHeight)
    }
    window.addEventListener('resize', handleResize)

    return () => {
      window.removeEventListener('resize', handleResize)
      cancelAnimationFrame(frameId)
      host.removeChild(renderer.domElement)
      renderer.dispose()
    }
  }, [model])

  return (
    <div className="model-preview-container">
      <div ref={hostRef} style={{ width: '100%', height: '400px', cursor: 'move' }} />
      <div className="model-controls">
        <button 
          className={`dim-toggle ${showDimensions ? 'active' : ''}`}
          onClick={() => setShowDimensions(!showDimensions)}
        >
          {showDimensions ? 'Hide Dimensions' : 'Show Dimensions'}
        </button>
      </div>
    </div>
  )
}

