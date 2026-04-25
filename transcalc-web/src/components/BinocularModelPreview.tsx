import React, { useEffect, useMemo, useRef, useState } from 'react'
import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { buildBinocularGeometry, type BinocularRawParams } from '../domain/binocularGeometry'
import { createAxesGizmo } from './sceneHelpers'

type Props = {
  params: BinocularRawParams
  us?: boolean
}

type CameraPreset = 'iso' | 'front' | 'top' | 'side' | 'gage'

function makeTextSprite(text: string): THREE.Sprite {
  const canvas = document.createElement('canvas')
  canvas.width = 512
  canvas.height = 128
  const ctx = canvas.getContext('2d')
  if (ctx) {
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    ctx.fillStyle = '#16324f'
    ctx.font = 'bold 34px Segoe UI, sans-serif'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText(text, canvas.width / 2, canvas.height / 2)
  }
  const texture = new THREE.CanvasTexture(canvas)
  const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: texture, transparent: true }))
  sprite.scale.set(0.78, 0.2, 1)
  return sprite
}

function addDimensionLine(
  group: THREE.Group,
  from: THREE.Vector3,
  to: THREE.Vector3,
  text: string,
  normal: THREE.Vector3
) {
  const material = new THREE.LineBasicMaterial({ color: 0x35516e, transparent: true, opacity: 0.9 })
  const main = new THREE.Line(
    new THREE.BufferGeometry().setFromPoints([from, to]),
    material
  )
  group.add(main)

  const tick = normal.clone().normalize().multiplyScalar(0.035)
  ;[from, to].forEach((pt) => {
    const tickLine = new THREE.Line(
      new THREE.BufferGeometry().setFromPoints([pt.clone().sub(tick), pt.clone().add(tick)]),
      material
    )
    group.add(tickLine)
  })

  const label = makeTextSprite(text)
  label.position.copy(from.clone().add(to).multiplyScalar(0.5).add(normal.clone().multiplyScalar(0.08)))
  group.add(label)
}

function applyCameraPreset(
  preset: CameraPreset,
  camera: THREE.PerspectiveCamera,
  controls: OrbitControls,
  geometry: ReturnType<typeof buildBinocularGeometry>
) {
  const maxLength = Math.max(geometry.totalLength, geometry.beamHeight, geometry.beamDepth)
  const distance = maxLength / 10
  const gageFocus = new THREE.Vector3((geometry.leftActiveX + geometry.rightActiveX) / 2 / 60, 0, 0)

  switch (preset) {
    case 'front':
      camera.position.set(0, 0, distance * 2.4)
      controls.target.set(0, 0, 0)
      break
    case 'top':
      camera.position.set(0, distance * 2.6, 0.001)
      controls.target.set(0, 0, 0)
      break
    case 'side':
      camera.position.set(distance * 2.6, 0, 0)
      controls.target.set(0, 0, 0)
      break
    case 'gage':
      camera.position.set(gageFocus.x + distance * 1.1, distance * 0.45, distance * 0.9)
      controls.target.copy(gageFocus)
      break
    default:
      camera.position.set(distance * 1.8, distance * 1.25, distance * 2.3)
      controls.target.set(0, 0, 0)
      break
  }
  camera.lookAt(controls.target)
  controls.update()
}

export const BinocularModelPreview: React.FC<Props> = ({ params, us }) => {
  const hostRef = useRef<HTMLDivElement | null>(null)
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null)
  const controlsRef = useRef<OrbitControls | null>(null)
  const [showDimensions, setShowDimensions] = useState(true)
  const [showGages, setShowGages] = useState(true)
  const [showHotspots, setShowHotspots] = useState(true)
  const [showForces, setShowForces] = useState(true)
  const [preset, setPreset] = useState<CameraPreset>('iso')

  const geometry = useMemo(() => buildBinocularGeometry(params), [params])

  const model = useMemo(() => {
    const group = new THREE.Group()
    const mmToScene = 1 / 60
    const length = geometry.totalLength * mmToScene
    const height = geometry.beamHeight * mmToScene
    const depth = geometry.beamDepth * mmToScene
    const radius = geometry.radius * mmToScene
    const spacing = geometry.holeSpacing * mmToScene
    const centerSlotHalfHeight = geometry.centerSlotHalfHeight * mmToScene
    const halfLength = length / 2
    const halfHeight = height / 2
    const halfDepth = depth / 2

    const bodyMaterial = new THREE.MeshStandardMaterial({
      color: 0x94a3b8,
      roughness: 0.45,
      metalness: 0.18,
    })

    const shape = new THREE.Shape()
    shape.moveTo(-halfLength, -halfHeight)
    shape.lineTo(halfLength, -halfHeight)
    shape.lineTo(halfLength, halfHeight)
    shape.lineTo(-halfLength, halfHeight)
    shape.closePath()

    const halfSpacing = spacing / 2
    const dx = Math.sqrt(Math.max(0, radius * radius - centerSlotHalfHeight * centerSlotHalfHeight))
    const alpha = centerSlotHalfHeight > 0 ? Math.asin(centerSlotHalfHeight / radius) : 0
    const cutout = new THREE.Path()
    cutout.moveTo(-halfSpacing + dx, centerSlotHalfHeight)
    cutout.lineTo(halfSpacing - dx, centerSlotHalfHeight)
    cutout.absarc(halfSpacing, 0, radius, Math.PI - alpha, alpha - Math.PI, true)
    cutout.lineTo(-halfSpacing + dx, -centerSlotHalfHeight)
    cutout.absarc(-halfSpacing, 0, radius, -alpha, alpha, true)
    cutout.closePath()
    shape.holes.push(cutout)

    const geometry3d = new THREE.ExtrudeGeometry(shape, {
      depth,
      bevelEnabled: true,
      bevelThickness: 0.012,
      bevelSize: 0.012,
      bevelSegments: 2,
    })
    geometry3d.center()
    group.add(new THREE.Mesh(geometry3d, bodyMaterial))

    const fixture = new THREE.Mesh(
      new THREE.BoxGeometry(0.62, height * 1.55, depth * 1.55),
      new THREE.MeshStandardMaterial({ color: 0x475569, transparent: true, opacity: 0.72 })
    )
    fixture.position.set(-halfLength - 0.31, 0, 0)
    group.add(fixture)

    const fixtureLabel = makeTextSprite('FIXTURE')
    fixtureLabel.position.set(-halfLength - 0.31, halfHeight + 0.26, 0)
    group.add(fixtureLabel)

    const gageLength = Math.max(geometry.gageLength * mmToScene, radius * 0.4)
    const gageWidth = Math.max(gageLength * 0.48, 0.04)
    const addSurfacePad = (
      x: number,
      y: number,
      top: boolean,
      state: 'activeTension' | 'activeCompression' | 'passive'
    ) => {
      const color =
        state === 'activeTension' ? 0xfb923c : state === 'activeCompression' ? 0x60a5fa : 0xd1d5db
      const opacity = state === 'passive' ? 0.72 : 0.9
      const pad = new THREE.Mesh(
        new THREE.BoxGeometry(gageLength, 0.008, gageWidth),
        new THREE.MeshStandardMaterial({ color, transparent: true, opacity })
      )
      pad.position.set(x, y + (top ? 0.006 : -0.006), 0)
      if (!top) pad.rotation.x = Math.PI
      group.add(pad)
    }

    if (showGages) {
      addSurfacePad(geometry.leftActiveX * mmToScene, halfHeight, true, 'activeTension')
      addSurfacePad(geometry.rightActiveX * mmToScene, -halfHeight, false, 'activeCompression')
      addSurfacePad(geometry.leftPassiveX * mmToScene, -halfHeight, false, 'passive')
      addSurfacePad(geometry.rightPassiveX * mmToScene, halfHeight, true, 'passive')
    }

    if (showHotspots) {
      const addHotspot = (x: number, y: number, color: number, label: string) => {
        ;[-1, 1].forEach((side) => {
          const mesh = new THREE.Mesh(
            new THREE.PlaneGeometry(gageLength * 1.15, Math.max(geometry.minThickness * mmToScene * 0.9, 0.05)),
            new THREE.MeshBasicMaterial({
              color,
              transparent: true,
              opacity: 0.22,
              side: THREE.DoubleSide,
              depthWrite: false,
            })
          )
          mesh.position.set(x, y, side * (halfDepth + 0.01))
          group.add(mesh)
        })
        const sprite = makeTextSprite(label)
        sprite.position.set(x, y + (y > 0 ? 0.18 : -0.18), halfDepth + 0.12)
        group.add(sprite)
      }

      addHotspot(geometry.leftActiveX * mmToScene, geometry.topLigamentY * mmToScene, 0xf97316, '+ε')
      addHotspot(geometry.rightActiveX * mmToScene, geometry.bottomLigamentY * mmToScene, 0x2563eb, '-ε')
    }

    if (showDimensions) {
      const dimensions = new THREE.Group()
      const unit = us ? 'in' : 'mm'
      const fmt = (value: number) => `${value.toFixed(us ? 3 : 1)} ${unit}`

      addDimensionLine(
        dimensions,
        new THREE.Vector3(-halfLength, -halfHeight - 0.2, -halfDepth),
        new THREE.Vector3(halfLength, -halfHeight - 0.2, -halfDepth),
        fmt(geometry.totalLength),
        new THREE.Vector3(0, -0.1, 0)
      )
      addDimensionLine(
        dimensions,
        new THREE.Vector3(-halfLength - 0.18, -halfHeight, -halfDepth),
        new THREE.Vector3(-halfLength - 0.18, halfHeight, -halfDepth),
        fmt(geometry.beamHeight),
        new THREE.Vector3(-0.08, 0, 0)
      )
      addDimensionLine(
        dimensions,
        new THREE.Vector3(-halfSpacing, 0, -halfDepth - 0.11),
        new THREE.Vector3(halfSpacing, 0, -halfDepth - 0.11),
        `CL ${fmt(geometry.holeSpacing)}`,
        new THREE.Vector3(0, 0.08, -0.05)
      )
      addDimensionLine(
        dimensions,
        new THREE.Vector3(-halfSpacing, radius, halfDepth + 0.1),
        new THREE.Vector3(-halfSpacing, halfHeight, halfDepth + 0.1),
        `t ${fmt(geometry.minThickness)}`,
        new THREE.Vector3(-0.05, 0, 0.05)
      )
      group.add(dimensions)
    }

    if (showForces) {
      const forceText = makeTextSprite(us ? `${geometry.load.toFixed(1)} lbf` : `${geometry.load.toFixed(0)} N`)
      forceText.position.set(halfLength - 0.16, halfHeight + 0.32, 0)
      const arrow = new THREE.ArrowHelper(
        new THREE.Vector3(0, -1, 0),
        new THREE.Vector3(halfLength - 0.16, halfHeight + 0.22, 0),
        0.35,
        0xe05530,
        0.08,
        0.05
      )
      group.add(forceText, arrow)
    }

    return group
  }, [geometry, showDimensions, showGages, showHotspots, showForces, us])

  useEffect(() => {
    if (!hostRef.current) return
    const host = hostRef.current
    const scene = new THREE.Scene()
    scene.background = new THREE.Color(0xf8fafc)

    const camera = new THREE.PerspectiveCamera(35, host.clientWidth / host.clientHeight, 0.1, 1000)
    const renderer = new THREE.WebGLRenderer({ antialias: true })
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    renderer.setSize(host.clientWidth, host.clientHeight)
    host.appendChild(renderer.domElement)

    const controls = new OrbitControls(camera, renderer.domElement)
    controls.enableDamping = true
    controls.dampingFactor = 0.08

    scene.add(new THREE.AmbientLight(0xffffff, 0.72))
    const key = new THREE.DirectionalLight(0xffffff, 0.7)
    key.position.set(5, 10, 8)
    scene.add(key)
    const fill = new THREE.DirectionalLight(0xdbeafe, 0.35)
    fill.position.set(-4, 2, 6)
    scene.add(fill)
    scene.add(new THREE.GridHelper(8, 16, 0xcbd5e1, 0xe2e8f0))
    scene.add(model)

    cameraRef.current = camera
    controlsRef.current = controls
    applyCameraPreset(preset, camera, controls, geometry)
    const gizmo = createAxesGizmo(renderer, host)

    let frame = 0
    const render = () => {
      controls.update()
      renderer.render(scene, camera)
      gizmo.render(camera)
      frame = requestAnimationFrame(render)
    }
    render()

    const handleResize = () => {
      camera.aspect = host.clientWidth / host.clientHeight
      camera.updateProjectionMatrix()
      renderer.setSize(host.clientWidth, host.clientHeight)
    }
    window.addEventListener('resize', handleResize)

    return () => {
      window.removeEventListener('resize', handleResize)
      cancelAnimationFrame(frame)
      controls.dispose()
      renderer.dispose()
      gizmo.dispose()
      if (renderer.domElement.parentElement === host) host.removeChild(renderer.domElement)
    }
  }, [geometry, model, preset])

  const setCamera = (next: CameraPreset) => {
    setPreset(next)
    if (cameraRef.current && controlsRef.current) {
      applyCameraPreset(next, cameraRef.current, controlsRef.current, geometry)
    }
  }

  return (
    <div className="model-preview-container">
      <div className="model-toolbar">
        <div className="model-toolbar-group">
          {(['iso', 'front', 'top', 'side', 'gage'] as const).map((key) => (
            <button
              key={key}
              className={`model-chip ${preset === key ? 'active' : ''}`}
              onClick={() => setCamera(key)}
            >
              {key}
            </button>
          ))}
        </div>
        <div className="model-toolbar-group">
          <button className={`model-chip ${showDimensions ? 'active' : ''}`} onClick={() => setShowDimensions((v) => !v)}>
            dimensions
          </button>
          <button className={`model-chip ${showGages ? 'active' : ''}`} onClick={() => setShowGages((v) => !v)}>
            gages
          </button>
          <button className={`model-chip ${showHotspots ? 'active' : ''}`} onClick={() => setShowHotspots((v) => !v)}>
            hotspots
          </button>
          <button className={`model-chip ${showForces ? 'active' : ''}`} onClick={() => setShowForces((v) => !v)}>
            forces & BCs
          </button>
        </div>
      </div>
      <div ref={hostRef} style={{ width: '100%', height: '420px', cursor: 'move' }} />
      <div className="model-footer">
        <span>Length {geometry.totalLength.toFixed(us ? 3 : 1)} {us ? 'in' : 'mm'}</span>
        <span>Height {geometry.beamHeight.toFixed(us ? 3 : 1)} {us ? 'in' : 'mm'}</span>
        <span>Active gage offset {geometry.gageOffsetX.toFixed(us ? 3 : 1)} {us ? 'in' : 'mm'}</span>
      </div>
    </div>
  )
}
