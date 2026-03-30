import { useEffect, useRef } from 'react'
import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import type { TransducerType } from '../domain/orchestrator'

type Props = {
  designType: TransducerType
  params: Record<string, number>
}

function getParam(params: Record<string, number>, key: string, fallback: number): number {
  const v = params[key]
  return Number.isFinite(v) && v > 0 ? v : fallback
}

function makeMesh(geometry: THREE.BufferGeometry, color = 0x3c7db8): THREE.Mesh {
  return new THREE.Mesh(
    geometry,
    new THREE.MeshStandardMaterial({
      color,
      roughness: 0.45,
      metalness: 0.1,
    })
  )
}

function buildModel(designType: TransducerType, params: Record<string, number>): THREE.Group {
  const g = new THREE.Group()
  const dim = (mm: number) => Math.max(0.02, mm / 100)

  switch (designType) {
    case 'cantilever':
    case 'reverseBeam':
    case 'dualBeam': {
      const w = dim(getParam(params, 'width', 25))
      const t = dim(getParam(params, 'thickness', 2))
      const l = dim(getParam(params, 'momentArm', getParam(params, 'distGages', 100)))
      const beam = makeMesh(new THREE.BoxGeometry(l, t, w))
      beam.position.x = l * 0.5
      g.add(beam)
      break
    }
    case 'sBeam': {
      const w = dim(getParam(params, 'width', 40))
      const t = dim(getParam(params, 'thickness', 10))
      const l = dim(getParam(params, 'distGages', 50))
      const r = dim(getParam(params, 'holeRadius', 8))
      const body = makeMesh(new THREE.BoxGeometry(l, t, w))
      const holeA = makeMesh(new THREE.CylinderGeometry(r, r, w * 1.2, 24), 0xe0872d)
      holeA.rotation.x = Math.PI / 2
      holeA.position.x = -l * 0.25
      const holeB = holeA.clone()
      holeB.position.x = l * 0.25
      g.add(body, holeA, holeB)
      break
    }
    case 'binoBeam': {
      const w = dim(getParam(params, 'beamWidth', 25))
      const h = dim(getParam(params, 'beamHeight', 14))
      const d = dim(getParam(params, 'distHoles', 100))
      const r = dim(getParam(params, 'radius', 5))
      const beam = makeMesh(new THREE.BoxGeometry(d + 2 * r * 2.2, h, w))
      const holeA = makeMesh(new THREE.CylinderGeometry(r, r, w * 1.3, 24), 0xe0872d)
      holeA.rotation.x = Math.PI / 2
      holeA.position.x = -d * 0.5
      const holeB = holeA.clone()
      holeB.position.x = d * 0.5
      g.add(beam, holeA, holeB)
      break
    }
    case 'squareColumn': {
      const w = dim(getParam(params, 'width', 25))
      const d = dim(getParam(params, 'depth', 25))
      g.add(makeMesh(new THREE.BoxGeometry(w, d, w)))
      break
    }
    case 'roundSolidColumn': {
      const od = dim(getParam(params, 'diameter', 25))
      g.add(makeMesh(new THREE.CylinderGeometry(od * 0.5, od * 0.5, od * 1.4, 32)))
      break
    }
    case 'roundHollowColumn': {
      const od = dim(getParam(params, 'outerDiameter', 30))
      const id = dim(getParam(params, 'innerDiameter', 20))
      const outer = makeMesh(new THREE.CylinderGeometry(od * 0.5, od * 0.5, od * 1.4, 36))
      const inner = new THREE.Mesh(
        new THREE.CylinderGeometry(id * 0.5, id * 0.5, od * 1.45, 36),
        new THREE.MeshStandardMaterial({ color: 0x99b6d0, transparent: true, opacity: 0.45 })
      )
      g.add(outer, inner)
      break
    }
    case 'squareShear':
    case 'roundShear':
    case 'roundSBeamShear': {
      const w = dim(getParam(params, 'width', 30))
      const h = dim(getParam(params, 'height', 50))
      const holeD = dim(getParam(params, 'diameter', 30))
      const block = makeMesh(new THREE.BoxGeometry(h, w, w))
      const hole = makeMesh(new THREE.CylinderGeometry(holeD * 0.5, holeD * 0.5, w * 1.3, 24), 0xe0872d)
      hole.rotation.x = Math.PI / 2
      g.add(block, hole)
      break
    }
    case 'squareTorque': {
      const w = dim(getParam(params, 'width', 25))
      g.add(makeMesh(new THREE.BoxGeometry(w * 2, w, w)))
      break
    }
    case 'roundSolidTorque': {
      const d = dim(getParam(params, 'diameter', 25))
      g.add(makeMesh(new THREE.CylinderGeometry(d * 0.5, d * 0.5, d * 2.2, 32)))
      break
    }
    case 'roundHollowTorque': {
      const od = dim(getParam(params, 'outerDiameter', 30))
      const id = dim(getParam(params, 'innerDiameter', 20))
      const outer = makeMesh(new THREE.CylinderGeometry(od * 0.5, od * 0.5, od * 2.2, 36))
      const inner = new THREE.Mesh(
        new THREE.CylinderGeometry(id * 0.5, id * 0.5, od * 2.25, 36),
        new THREE.MeshStandardMaterial({ color: 0x99b6d0, transparent: true, opacity: 0.45 })
      )
      g.add(outer, inner)
      break
    }
    case 'pressure': {
      const dia = dim(getParam(params, 'diameter', 50))
      const thick = dim(getParam(params, 'thickness', 2))
      g.add(makeMesh(new THREE.CylinderGeometry(dia * 0.5, dia * 0.5, thick, 40), 0x4d87b6))
      break
    }
  }

  return g
}

export default function TransducerModelViewer({ designType, params }: Props) {
  const hostRef = useRef<HTMLDivElement | null>(null)
  const modelRef = useRef<THREE.Group | null>(null)
  const sceneRef = useRef<THREE.Scene | null>(null)
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null)
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null)
  const controlsRef = useRef<OrbitControls | null>(null)

  useEffect(() => {
    if (!hostRef.current) return
    const host = hostRef.current
    const scene = new THREE.Scene()
    scene.background = new THREE.Color(0xf4f8fc)
    const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 100)
    camera.position.set(2.4, 1.9, 2.3)
    camera.lookAt(0, 0, 0)
    const renderer = new THREE.WebGLRenderer({ antialias: true })
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    renderer.setSize(host.clientWidth, host.clientHeight)
    host.appendChild(renderer.domElement)

    const modelRoot = new THREE.Group()
    scene.add(modelRoot)

    scene.add(new THREE.AmbientLight(0xffffff, 0.65))
    const dir = new THREE.DirectionalLight(0xffffff, 0.95)
    dir.position.set(4, 5, 3)
    scene.add(dir)
    scene.add(new THREE.GridHelper(5, 12, 0xbfd3e5, 0xdbe7f2))

    const controls = new OrbitControls(camera, renderer.domElement)
    controls.enablePan = true
    controls.enableZoom = true
    controls.enableDamping = true
    controls.dampingFactor = 0.08
    controls.target.set(0, 0, 0)
    controls.update()

    let raf = 0
    const animate = () => {
      raf = window.requestAnimationFrame(animate)
      controls.update()
      renderer.render(scene, camera)
    }
    animate()

    const onResize = () => {
      if (!hostRef.current || !rendererRef.current || !cameraRef.current) return
      const w = hostRef.current.clientWidth
      const h = hostRef.current.clientHeight
      rendererRef.current.setSize(w, h)
      cameraRef.current.aspect = w / Math.max(h, 1)
      cameraRef.current.updateProjectionMatrix()
    }
    const ro = new ResizeObserver(onResize)
    ro.observe(host)

    modelRef.current = modelRoot
    sceneRef.current = scene
    rendererRef.current = renderer
    cameraRef.current = camera
    controlsRef.current = controls

    return () => {
      window.cancelAnimationFrame(raf)
      ro.disconnect()
      controls.dispose()
      renderer.dispose()
      host.removeChild(renderer.domElement)
    }
  }, [])

  useEffect(() => {
    const root = modelRef.current
    if (!root) return
    while (root.children.length) {
      const c = root.children[0]
      root.remove(c)
      if (c instanceof THREE.Mesh) {
        c.geometry.dispose()
        if (Array.isArray(c.material)) c.material.forEach(m => m.dispose())
        else c.material.dispose()
      }
    }
    root.add(buildModel(designType, params))
  }, [designType, params])

  return (
    <div className="transducer-3d-wrap">
      <div ref={hostRef} className="transducer-3d-canvas" />
      <p className="strain-field-label">Parameter-driven 3D spring element preview (no FEA)</p>
    </div>
  )
}
