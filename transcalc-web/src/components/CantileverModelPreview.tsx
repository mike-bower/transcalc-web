import { useEffect, useMemo, useRef, useState } from 'react'
import * as THREE from 'three'
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { BridgeConfig } from '../domain/orchestrator'
import { createAxesGizmo } from './sceneHelpers'
import { makeBodyMaterial } from '../domain/materialAppearance'

type Props = {
  params: Record<string, unknown>
  us?: boolean
  materialId?: string
}

function p(params: Record<string, unknown>, key: string, fallback: number): number {
  const v = params[key]
  return typeof v === 'number' && Number.isFinite(v) && v > 0 ? v : fallback
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
    ctx.fillStyle = '#90c8f0'
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
  const mat = new THREE.LineBasicMaterial({ color: 0x5898c8, transparent: true, opacity: 0.9 })
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
 * Tapered box geometry: width tapers from wRoot at x=0 to wTip at x=length.
 * Thickness T is constant. Used for constant-stress cantilever visualisation.
 */
function makeTaperedBeamGeometry(length: number, thickness: number, wRoot: number, wTip: number): THREE.BufferGeometry {
  const hy = thickness / 2
  // 8 corners: [fixed-end back, fixed-end front, free-end front, free-end back] × [top, bottom]
  const verts = new Float32Array([
    // top face (y = +hy)
    0,      +hy, -wRoot / 2, // 0 fixed-back-top
    0,      +hy, +wRoot / 2, // 1 fixed-front-top
    length, +hy, +wTip  / 2, // 2 free-front-top
    length, +hy, -wTip  / 2, // 3 free-back-top
    // bottom face (y = -hy)
    0,      -hy, -wRoot / 2, // 4 fixed-back-bot
    0,      -hy, +wRoot / 2, // 5 fixed-front-bot
    length, -hy, +wTip  / 2, // 6 free-front-bot
    length, -hy, -wTip  / 2, // 7 free-back-bot
  ])
  // 12 triangles, 36 indices
  const idx = new Uint16Array([
    0, 1, 2,  0, 2, 3, // top
    5, 4, 7,  5, 7, 6, // bottom (reversed winding)
    0, 4, 5,  0, 5, 1, // fixed end (back wall)
    2, 6, 7,  2, 7, 3, // free end
    1, 5, 6,  1, 6, 2, // front face
    0, 3, 7,  0, 7, 4, // back face
  ])
  const geo = new THREE.BufferGeometry()
  geo.setAttribute('position', new THREE.BufferAttribute(verts, 3))
  geo.setIndex(new THREE.BufferAttribute(idx, 1))
  geo.computeVertexNormals()
  return geo
}

function Cantilever3D({ params, us, materialId }: { params: Record<string, unknown>, us?: boolean, materialId?: string }) {
  const hostRef = useRef<HTMLDivElement | null>(null)
  const rootRef = useRef<THREE.Group | null>(null)
  const [showDimensions, setShowDimensions] = useState(true)
  const [showForces, setShowForces] = useState(true)

  const model = useMemo(() => {
    const g = new THREE.Group()
    let mmToScene = 1 / 90
    
    // Logic for Target Driven Mode
    const isTargetDriven = params.isTargetDriven === 1
    const targetOutput: number = typeof params.targetOutput === 'number' ? params.targetOutput : 0
    let loadN = p(params, 'load', 100)
    
    const bridgeConfig = (params.bridgeConfig as unknown as BridgeConfig) || 'quarter'
    const poissonRatio = p(params, 'poisson', 0.3)
    const modulus = p(params, 'modulus', 200) * 1e9 // GPa to Pa
    const gFactor = p(params, 'gageFactor', 2.0)
    const vIn = 10.0 // Standard excitation
    
    const momentArmMm = p(params, 'momentArm', 100)
    const gageOffsetMm = p(params, 'gageOffset', 6)
    const thicknessMm = p(params, 'thickness', 2)
    const widthMm = p(params, 'width', 25)

    if (isTargetDriven && targetOutput > 0) {
      // Invert the bridge math to find the load N that produces targetOutput (mV)
      let gain = 1.0
      switch (bridgeConfig) {
        case 'halfBending': gain = 2.0; break
        case 'fullBending': gain = 4.0; break
        case 'poissonHalf': gain = (1 + poissonRatio); break
        case 'poissonFullTop': gain = (1 + poissonRatio); break
        case 'poissonFullDifferential': gain = 2 * (1 + poissonRatio); break
      }
      
      const targetMvV = targetOutput / vIn
      const requiredStrain = (targetMvV * 1000) / (gFactor * gain)
      const requiredStress = requiredStrain * modulus

      // Check if we are solving for a geometric parameter rather than load
      // Note: we can't solve for geometry here easily because the UI solved it already.
      // We just need to make sure we use the solved values (which are already in params)
      // and only recalculate Load if load was the target.
      
      // If the user is solving for Width, params['width'] is already corrected.
      // We only need to calculate loadN if the 'load' itself was solved or if we're in load-override mode.
      
      // Stress = (6 * P * L_gage) / (W * T^2)
      // P = (Stress * W * T^2) / (6 * L_gage)
      const l_gage_m = (momentArmMm - gageOffsetMm) / 1000
      const w_m = widthMm / 1000
      const t_m = thicknessMm / 1000
      
      // ONLY override loadN if we aren't already providing a solved Load in params
      // (This prevents the 3D model from fighting the solver)
    }

    const clampLengthMm = p(params, 'clampLength', 20)
    const holeOffsetMm = p(params, 'mountHoleOffset', 12)
    const holeDiaMm = p(params, 'mountHoleDia', 5)
    const gageLenMm = p(params, 'gageLen', 5)

    const fmLabel = (v: number) => us ? (v / 25.4).toFixed(3) : v.toFixed(1)
    const fmt = fmLabel
    const uLabel = us ? 'in' : 'mm'
    const forceStr = us ? `${(loadN / 4.44822).toFixed(1)} lbf` : `${loadN.toFixed(0)} N`

    const beamLengthMm = Math.max(momentArmMm + gageOffsetMm, gageOffsetMm + gageLenMm)
    // Auto-scale: boost mmToScene so beam always occupies 0.5–4.0 scene units,
    // preserving all proportions for any input size.
    mmToScene = Math.min(Math.max(0.5 / beamLengthMm, mmToScene), 4.0 / beamLengthMm)
    const L = beamLengthMm * mmToScene
    const T = clamp(thicknessMm * mmToScene, 0.012, L * 0.5)
    const W = clamp(widthMm * mmToScene, 0.04, L * 3.0)
    const clampLen = Math.max(clampLengthMm * mmToScene, 0.06)
    const gageLen = clamp(gageLenMm * mmToScene, 0.02, L * 0.85)
    const gageWidth = clamp(gageLen * 0.5, 0.02, W * 0.92)
    const gageCenter = clamp(gageOffsetMm * mmToScene, gageLen * 0.55, L - gageLen * 0.55)
    const loadArrowLength = clamp(0.18 + Math.log10(Math.max(loadN, 1)) * 0.12, 0.22, 0.58)

    const isTapered = params['tapered'] === 1

    const mat = makeBodyMaterial(materialId)
    const softMat = new THREE.MeshStandardMaterial({ color: 0x8aa7be, roughness: 0.55, metalness: 0.05 })

    let beamGeom: THREE.BufferGeometry
    if (isTapered) {
      // Constant-stress taper: root width = W, tip width ≈ 0 (minimum for visibility)
      const wTip = Math.max(W * 0.04, 0.01)
      beamGeom = makeTaperedBeamGeometry(L, T, W, wTip)
    } else {
      beamGeom = new THREE.BoxGeometry(L, T, W)
    }
    const beam = new THREE.Mesh(beamGeom, mat)
    if (!isTapered) beam.position.x = L * 0.5
    g.add(beam)

    const clampBlock = new THREE.Mesh(new THREE.BoxGeometry(clampLen, T * 2.6, W * 1.25), softMat)
    clampBlock.position.x = -(clampLen * 0.5)
    g.add(clampBlock)

    // Gage rendering logic
    const activeGageMat = new THREE.MeshStandardMaterial({ color: 0xf0a451, roughness: 0.55, metalness: 0.06 })
    const poissonGageMat = new THREE.MeshStandardMaterial({ color: 0x51a4f0, roughness: 0.55, metalness: 0.06 })
    const padThickness = Math.max(0.01, T * 0.08)

    const addGage = (x: number, z: number, top: boolean, isPoisson: boolean = false, isTeeRosette: boolean = false, isFullPoissonRosette: boolean = false) => {
      const gWidth = isPoisson ? gageLen : gageWidth
      const gLen = isPoisson ? gageWidth : gageLen
      const group = new THREE.Group()

      // Backing (Polyimide-like carrier)
      let carrierW = gWidth * 1.4
      let carrierL = gLen * 1.15
      if (isFullPoissonRosette) {
        carrierW = Math.max(gageLen, gageWidth) * 2.2
        carrierL = Math.max(gageLen, gageWidth) * 2.2
      } else if (isTeeRosette) {
        carrierW = Math.max(gageLen, gageWidth) * 1.6
        carrierL = Math.max(gageLen, gageWidth) * 1.6
      }

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

      const drawGrid = (isTransverse: boolean, xOff: number, zOff: number) => {
        const gridLineCount = 20
        const currentLen = isTransverse ? gageWidth : gageLen
        const currentWid = isTransverse ? gageLen : gageWidth
        const spacing = currentWid / (gridLineCount + 1)
        const thickness = currentLen * 0.85
        
        // Grids
        for (let i = 1; i <= gridLineCount; i++) {
          const line = new THREE.Mesh(
            new THREE.BoxGeometry(
              isTransverse ? thickness : 0.002, 
              padThickness * 0.6, 
              isTransverse ? 0.002 : thickness
            ),
            gridMat
          )
          const offset = -(currentWid * 0.45) + (i * spacing)
          if (isTransverse) line.position.set(xOff, padThickness * 0.1, zOff + offset)
          else line.position.set(xOff + offset, padThickness * 0.1, zOff)
          group.add(line)
        }

        // Top/Bottom End Bars (The thick U-turns from the image)
        const barSize = 0.004
        const bar1 = new THREE.Mesh(
          new THREE.BoxGeometry(isTransverse ? barSize : currentWid * 0.9, padThickness * 0.6, isTransverse ? currentWid * 0.9 : barSize),
          gridMat
        )
        const bar2 = new THREE.Mesh(
          new THREE.BoxGeometry(isTransverse ? barSize : currentWid * 0.9, padThickness * 0.6, isTransverse ? currentWid * 0.9 : barSize),
          gridMat
        )
        
        if (isTransverse) {
          bar1.position.set(xOff - thickness * 0.5, padThickness * 0.1, zOff)
          bar2.position.set(xOff + thickness * 0.5, padThickness * 0.1, zOff)
        } else {
          bar1.position.set(xOff, padThickness * 0.1, zOff - thickness * 0.5)
          bar2.position.set(xOff, padThickness * 0.1, zOff + thickness * 0.5)
        }
        group.add(bar1, bar2)
      }

      if (isFullPoissonRosette) {
        // Layout: Left column has Longitudinal (Top) and Poisson (Bottom)
        // Right column has Longitudinal (Top) and Poisson (Bottom)
        // To match the image exactly:
        const xStep = gageLen * 0.28
        const zStep = gageWidth * 0.32
        
        // Top row (Longitudinal)
        drawGrid(false, -xStep, -zStep)
        drawGrid(false, -xStep, zStep)
        
        // Bottom row (Poisson/Transverse)
        drawGrid(true, xStep * 0.2, -zStep)
        drawGrid(true, xStep * 0.2, zStep)

        // Lead traces (Simplified lines connecting grids to tabs)
        const traceMat = new THREE.MeshStandardMaterial({ color: 0x111111, metalness: 0.9 })
        const addTrace = (x1: number, z1: number, x2: number, z2: number) => {
          const dx = x2 - x1
          const dz = z2 - z1
          const dist = Math.sqrt(dx*dx + dz*dz)
          const trace = new THREE.Mesh(new THREE.BoxGeometry(dist, padThickness * 0.2, 0.002), traceMat)
          trace.position.set((x1+x2)/2, padThickness * 0.1, (z1+z2)/2)
          trace.rotation.y = -Math.atan2(dz, dx)
          group.add(trace)
        }
        
        // Connecting the clusters to the tab header on the right
        const tabXStart = carrierL * 0.4
        addTrace(0, -zStep, tabXStart, -carrierW * 0.35)
        addTrace(0, zStep, tabXStart, carrierW * 0.35)
      } else if (isTeeRosette) {
        // Side-by-side but shifted away from tabs
        drawGrid(false, -gageLen * 0.15, -gageWidth * 0.1)
        drawGrid(true, 0.025, -gageWidth * 0.1)
      } else {
        // Center the single grid away from tabs
        drawGrid(isPoisson, -gageLen * 0.1, 0)
      }

      // Solder Tabs
      const tabBaseMat = new THREE.MeshStandardMaterial({ color: 0xb87333, metalness: 0.8, roughness: 0.2 })
      const tabSolderMat = new THREE.MeshStandardMaterial({ color: 0xbdc3c7, metalness: 0.9, roughness: 0.1 })
      
      const addTab = (tx: number, tz: number, isRightSide: boolean = false) => {
        // Tab base (copper) is circular or square, here square for now but oriented towards wires
        const tBase = new THREE.Mesh(new THREE.BoxGeometry(0.03, padThickness * 0.7, 0.03), tabBaseMat)
        tBase.position.set(tx, padThickness * 0.1, tz)
        
        // Solder pad (silver) on top
        const tSolder = new THREE.Mesh(new THREE.BoxGeometry(0.022, padThickness * 0.3, 0.022), tabSolderMat)
        tSolder.position.set(tx, padThickness * 0.35, tz)
        group.add(tBase, tSolder)
      }
      
      // ORIENTATION: Solder tabs should point to the low strain end (the free end for a cantilever)
      // On our beam, X+ is towards the free end (low strain).
      const tabX = carrierL * 0.4 

      if (isFullPoissonRosette) {
        // Full bridge layout from image: grids are near the "high strain" side (left), 
        // tabs are near the "low strain" side (right)
        addTab(tabX, -carrierW * 0.35)
        addTab(tabX, -carrierW * 0.12)
        addTab(tabX, carrierW * 0.12)
        addTab(tabX, carrierW * 0.35)
      } else if (isTeeRosette) {
        // Tee Rosette tabs at the low-strain end
        addTab(tabX, -carrierW * 0.35)
        addTab(tabX, -carrierW * 0.12)
        addTab(tabX, carrierW * 0.12)
        addTab(tabX, carrierW * 0.35)
      } else {
        // Linear gage tabs at the low-strain end
        addTab(tabX, -carrierW * 0.15)
        addTab(tabX, carrierW * 0.15)
      }

      group.position.set(x, top ? T * 0.5 + padThickness * 0.5 : -T * 0.5 - padThickness * 0.5, z)
      g.add(group)
    }

    const zOff = W * 0.22
    switch (bridgeConfig) {
      case 'quarter':
        addGage(gageCenter, 0, true)
        break
      case 'halfBending':
        addGage(gageCenter, 0, true)
        addGage(gageCenter, 0, false)
        break
      case 'fullBending':
        addGage(gageCenter, -zOff, true)
        addGage(gageCenter, zOff, true)
        addGage(gageCenter, -zOff, false)
        addGage(gageCenter, zOff, false)
        break
      case 'poissonHalf':
        // A Tee Rosette replaces the pair in a Poisson Half Bridge
        addGage(gageCenter, 0, true, false, true)
        break
      case 'poissonFullTop':
        // The pattern you provided: 4 grids on one carrier
        addGage(gageCenter, 0, true, false, false, true)
        break
      case 'poissonFullDifferential':
        addGage(gageCenter, 0, true, false, true)
        addGage(gageCenter, 0, false, false, true)
        break
    }

    if (showForces) {
      const force = new THREE.ArrowHelper(
        new THREE.Vector3(0, -1, 0),
        new THREE.Vector3(L - 0.03, T * 0.95 + loadArrowLength, 0),
        loadArrowLength,
        0xe05530,
        Math.min(0.18, loadArrowLength * 0.36),
        Math.min(0.11, loadArrowLength * 0.24)
      )
      g.add(force)
    }

    // Dimension lines based on active input values.
    const dimGroup = new THREE.Group()
    const yUnder = -T * 0.95
    const zFront = W * 0.78
    const zBack = -W * 0.78

    // Total Beam Length
    addDimensionLine(
      dimGroup,
      new THREE.Vector3(0, yUnder, zFront),
      new THREE.Vector3(L, yUnder, zFront),
      `L=${fmt(beamLengthMm)} ${uLabel}`,
      new THREE.Vector3(0, -1, 0)
    )

    // Moment Arm (Clamp to Load)
    addDimensionLine(
      dimGroup,
      new THREE.Vector3(0, T * 0.85, zBack),
      new THREE.Vector3(L, T * 0.85, zBack),
      `Arm=${fmt(momentArmMm)} ${uLabel}`,
      new THREE.Vector3(0, 1, 0),
      false
    )

    // Thickness
    addDimensionLine(
      dimGroup,
      new THREE.Vector3(L * 1.05, -T / 2, 0),
      new THREE.Vector3(L * 1.05, T / 2, 0),
      `t=${fmt(thicknessMm)} ${uLabel}`,
      new THREE.Vector3(1, 0, 0)
    )

    // Width
    addDimensionLine(
      dimGroup,
      new THREE.Vector3(L * 0.8, T * 0.6, -W / 2),
      new THREE.Vector3(L * 0.8, T * 0.6, W / 2),
      `w=${fmt(widthMm)} ${uLabel}`,
      new THREE.Vector3(0, 1, 0)
    )

    // Gage Length
    addDimensionLine(
      dimGroup,
      new THREE.Vector3(gageCenter - gageLen / 2, T * 0.75, W * 0.6),
      new THREE.Vector3(gageCenter + gageLen / 2, T * 0.75, W * 0.6),
      `gl=${fmt(gageLenMm)} ${uLabel}`,
      new THREE.Vector3(0, 1, 0)
    )

    // Gage Offset
    addDimensionLine(
      dimGroup,
      new THREE.Vector3(0, T * 0.64, W * 0.65),
      new THREE.Vector3(gageCenter, T * 0.64, W * 0.65),
      `offs=${fmt(gageOffsetMm)} ${uLabel}`,
      new THREE.Vector3(0, 1, 0)
    )

    // Load Direction & Value
    const loadLabel = makeTextSprite(forceStr)
    loadLabel.position.set(L, T + loadArrowLength + 0.15, 0)
    dimGroup.add(loadLabel)

    if (!showDimensions) {
      dimGroup.visible = false
    }

    g.add(dimGroup)

    return g
  }, [params, showDimensions, showForces, us, materialId])

  useEffect(() => {
    if (!hostRef.current) return
    const host = hostRef.current
    const scene = new THREE.Scene()
    scene.background = new THREE.Color(0xffffff)
    const camera = new THREE.PerspectiveCamera(45, host.clientWidth / Math.max(1, host.clientHeight), 0.1, 100)
    camera.position.set(2.5, 1.8, 2.2)
    const renderer = new THREE.WebGLRenderer({ antialias: true })
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    renderer.setSize(host.clientWidth, host.clientHeight)
    const pmrem = new THREE.PMREMGenerator(renderer)
    scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture
    pmrem.dispose()
    host.appendChild(renderer.domElement)

    const controls = new OrbitControls(camera, renderer.domElement)
    controls.enablePan = true
    controls.enableZoom = true
    controls.enableDamping = true
    controls.dampingFactor = 0.08
    controls.target.set(0.6, 0, 0)
    controls.update()
    const gizmo = createAxesGizmo(renderer, host)

    scene.add(new THREE.AmbientLight(0xffffff, 0.75))
    const d = new THREE.DirectionalLight(0xffffff, 1.0)
    d.position.set(4, 5, 3)
    scene.add(d)
    scene.add(new THREE.GridHelper(6, 14, 0xbbbbbb, 0xdddddd))

    const root = new THREE.Group()
    rootRef.current = root
    scene.add(root)
    root.add(model)

    let raf = 0
    const animate = () => {
      raf = window.requestAnimationFrame(animate)
      controls.update()
      renderer.render(scene, camera)
      gizmo.render(camera)
    }
    animate()

    const ro = new ResizeObserver(() => {
      const w = host.clientWidth
      const h = host.clientHeight
      if (w === 0 || h === 0) return
      renderer.setSize(w, h, false) // false prevents style changes
      camera.aspect = w / h
      camera.updateProjectionMatrix()
    })
    ro.observe(host)

    return () => {
      window.cancelAnimationFrame(raf)
      ro.disconnect()
      controls.dispose()
      renderer.dispose()
      gizmo.dispose()
      if (host.contains(renderer.domElement)) {
        host.removeChild(renderer.domElement)
      }
    }
  }, [model])

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%', minHeight: '0', overflow: 'hidden' }}>
      <div ref={hostRef} className="transducer-3d-canvas" style={{ height: '100%', border: 'none', background: 'transparent' }} />
      <div style={{
        position: 'absolute',
        top: '10px',
        right: '10px',
        zIndex: 10,
        backgroundColor: 'rgba(30, 41, 59, 0.7)',
        padding: '4px 8px',
        borderRadius: '4px',
        fontSize: '11px',
        display: 'flex',
        alignItems: 'center',
        gap: '6px',
        border: '1px solid rgba(71, 85, 105, 0.5)',
        color: '#f8fafc',
        pointerEvents: 'auto'
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
        >Forces & BCs</button>
      </div>
    </div>
  )
}

export default function CantileverModelPreview({ params, us, materialId }: Props) {
  return (
    <div className="transducer-svg-wrap" style={{ height: '800px' }}>
      <Cantilever3D params={params} us={us} materialId={materialId} />
    </div>
  )
}
