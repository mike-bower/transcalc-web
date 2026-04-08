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

    // Extract params (Mapping to WorkflowWizard's dp keys)
    const W_mm = p(params, 'beamWidth', 25)
    const H_mm = p(params, 'beamHeight', 50)
    const s_mm = p(params, 'distHoles', 60)
    const L_mm = p(params, 'totalLength', s_mm + 40) // Use totalLength if available, otherwise dist + margins
    const R_mm = p(params, 'radius', 12)
    const t_mm = p(params, 'minThick', 4)
    const cutH_mm = p(params, 'cutThick', 4) // Vertical height of the horizontal cut
    const loadN = p(params, 'load', 100)

    // Geometric Correction: R must be derived from H and t if the user defines minThick (t) as the remaining material.
    // However, in this UI, R and t are often both inputs. 
    // If t is the thickness from top surface to the hole top (H/2 - (y_hole + R)), 
    // then the vertical position of the hole centers MUST be at: +/- (H/2 - t - R)
    const holeCenterY = Math.max(0, H_mm / 2 - t_mm - R_mm)
    
    // Scene dimensions (scaled)
    const W = W_mm * mmToScene
    const H = H_mm * mmToScene
    const L = L_mm * mmToScene
    const R = R_mm * mmToScene
    const t = t_mm * mmToScene
    const s = s_mm * mmToScene
    const hY = holeCenterY * mmToScene
    const cutH = cutH_mm * mmToScene

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

    // 3. Binocular "Void" following the dog-bone [O=O] pattern
    const halfS = s / 2
    const binocularVoid = new THREE.Path()
    
    // Start at Top-Left of Left Circle (at hY)
    binocularVoid.moveTo(-halfS - R, hY)
    binocularVoid.absarc(-halfS, hY, R, Math.PI, 0, true)  // Top semi-circle
    
    // Drop down to central slot top
    binocularVoid.lineTo(-halfS + R, cutH / 2)

    // Bridge directly to Right Pill central slot top
    binocularVoid.lineTo(halfS - R, cutH / 2)

    // Up to Right Pill Top
    binocularVoid.lineTo(halfS - R, hY)
    binocularVoid.absarc(halfS, hY, R, Math.PI, 0, true)   // Top semi-circle
    
    // Down to Right Pill Bottom
    binocularVoid.lineTo(halfS + R, -hY)
    binocularVoid.absarc(halfS, -hY, R, 0, Math.PI, true)  // Bottom semi-circle
    
    // Up to central slot bottom
    binocularVoid.lineTo(halfS - R, -cutH / 2)

    // Bridge back to Left Pill central slot bottom
    binocularVoid.lineTo(-halfS + R, -cutH / 2)

    // Down to Left Pill Bottom
    binocularVoid.lineTo(-halfS + R, -hY)
    binocularVoid.absarc(-halfS, -hY, R, 0, Math.PI, true) // Bottom semi-circle
    
    binocularVoid.closePath()

    shape.holes.push(binocularVoid)

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

    // --- FIXTURE / MOUNTING BASE ---
    // Represents the rigid mounting surface the load cell is bolted to
    const fixtureMat = new THREE.MeshStandardMaterial({ 
      color: 0x475569, // Dark slate
      transparent: true,
      opacity: 0.6
    })
    const fixtureGeo = new THREE.BoxGeometry(0.6, H * 1.6, W * 1.6)
    const fixture = new THREE.Mesh(fixtureGeo, fixtureMat)
    fixture.position.set(-halfL - 0.3, 0, 0)
    g.add(fixture)

    const fixtureText = makeTextSprite("STATIONARY FIXTURE")
    fixtureText.position.set(-halfL - 0.3, halfH + 0.3, 0)
    g.add(fixtureText)

    const addGage = (x: number, y: number, z: number, top: boolean) => {
      const gWidth = gageWidth
      const gLen = gageLen
      const group = new THREE.Group()

      // Backing (Polyimide-like carrier)
      const carrierW = gWidth * 1.4
      const carrierL = gLen * 1.15
      const padThickness = 0.005

      const carrier = new THREE.Mesh(
        new THREE.BoxGeometry(carrierL, padThickness * 0.5, carrierW),
        new THREE.MeshStandardMaterial({ 
          color: 0xd4a017, // Polyimide/Gold
          transparent: true, 
          opacity: 0.75,
          roughness: 0.2,
          metalness: 0.1
        })
      )
      group.add(carrier)

      const gridMat = new THREE.MeshStandardMaterial({ 
        color: 0x111111, 
        roughness: 0.0, 
        metalness: 0.9 
      })

      const drawGrid = (xOff: number, zOff: number) => {
        const gridLineCount = 12
        const spacing = gWidth / (gridLineCount + 1)
        const thickness = gLen * 0.8
        
        // Grids - Linear gages (lines along the beam axis X)
        for (let i = 1; i <= gridLineCount; i++) {
          const line = new THREE.Mesh(
            new THREE.BoxGeometry(thickness, padThickness * 0.6, 0.002), // Long dimension along X
            gridMat
          )
          const offset = -(gWidth * 0.45) + (i * spacing)
          line.position.set(xOff, padThickness * 0.1, zOff + offset)
          group.add(line)
        }

        // Left/Right End Bars (the turns for linear gage)
        const barSize = 0.004
        const bar1 = new THREE.Mesh(
          new THREE.BoxGeometry(barSize, padThickness * 0.6, gWidth * 0.9),
          gridMat
        )
        const bar2 = new THREE.Mesh(
          new THREE.BoxGeometry(barSize, padThickness * 0.6, gWidth * 0.9),
          gridMat
        )
        bar1.position.set(xOff - thickness * 0.5, padThickness * 0.1, zOff)
        bar2.position.set(xOff + thickness * 0.5, padThickness * 0.1, zOff)
        group.add(bar1, bar2)
      }

      drawGrid(0, 0)

      // Solder Tabs
      const tabBaseMat = new THREE.MeshStandardMaterial({ color: 0xb87333, metalness: 0.8, roughness: 0.2 })
      const tabSolderMat = new THREE.MeshStandardMaterial({ color: 0xbdc3c7, metalness: 0.9, roughness: 0.1 })
      
      const addTab = (tx: number, tz: number) => {
        const tBase = new THREE.Mesh(new THREE.BoxGeometry(0.02, padThickness * 0.7, 0.02), tabBaseMat)
        tBase.position.set(tx, padThickness * 0.1, tz)
        const tSolder = new THREE.Mesh(new THREE.BoxGeometry(0.015, padThickness * 0.3, 0.015), tabSolderMat)
        tSolder.position.set(tx, padThickness * 0.35, tz)
        group.add(tBase, tSolder)
      }
      
      const tabX = carrierL * 0.4 
      addTab(tabX, -carrierW * 0.2)
      addTab(tabX, carrierW * 0.2)

      group.position.set(x, top ? y + padThickness * 0.5 : y - padThickness * 0.5, z)
      if (!top) group.rotation.x = Math.PI
      g.add(group)
    }

    const gageLenMm = p(params, 'gageLen', 5)
    const gageLen = gageLenMm * mmToScene
    const gageWidth = gageLen * 0.5

    // Position gages over the 4 hinges (top/bottom above/below each hole)
    const zOff = halfW * 0.4 // Position gages slightly offset from center for visibility or side-by-side if needed, but usually centered
    
    // Left Hole hinges
    addGage(-halfS, halfH, 0, true)  // Top Left
    addGage(-halfS, -halfH, 0, false) // Bottom Left

    // Right Hole hinges
    addGage(halfS, halfH, 0, true)   // Top Right
    addGage(halfS, -halfH, 0, false)  // Bottom Right

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
    const loadY = halfH

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

