import { useEffect, useRef } from 'react'
import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import type { BinobeamFeaResult } from '../domain/fea/binobeamSolver'

export type BinobeamFeaViewMode = 'mesh' | 'contour' | 'deformed' | 'boundary'

type BinobeamFeaViewerProps = {
  result: BinobeamFeaResult
  widthMeters: number
  unitSystem: 'US' | 'SI'
  distanceBetweenGageCls: number
  radius: number
  beamHeight: number
  minimumThickness: number
  beamWidth: number
  viewMode: BinobeamFeaViewMode
  showNodes?: boolean
  showEdges?: boolean
}

const toColor = (v: number, min: number, max: number): THREE.Color => {
  const span = max - min || 1
  const t = Math.max(0, Math.min(1, (v - min) / span))
  const stops = [
    [52, 152, 255],
    [58, 214, 236],
    [126, 229, 121],
    [255, 224, 102],
    [255, 120, 92],
  ]
  const n = stops.length - 1
  const scaled = t * n
  const i = Math.min(n - 1, Math.floor(scaled))
  const local = scaled - i
  const a = stops[i]
  const b = stops[i + 1]
  const r = Math.round(a[0] + (b[0] - a[0]) * local)
  const g = Math.round(a[1] + (b[1] - a[1]) * local)
  const c = Math.round(a[2] + (b[2] - a[2]) * local)
  return new THREE.Color(`rgb(${r},${g},${c})`)
}

export default function BinobeamFeaViewer({
  result,
  widthMeters,
  unitSystem,
  distanceBetweenGageCls,
  radius,
  beamHeight,
  minimumThickness,
  beamWidth,
  viewMode,
  showNodes = false,
  showEdges = true,
}: BinobeamFeaViewerProps) {
  const rootRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    if (!rootRef.current) return
    const host = rootRef.current
    const scene = new THREE.Scene()
    scene.background = new THREE.Color(viewMode === 'boundary' ? '#f8fbff' : '#f6fbff')

    const camera = new THREE.PerspectiveCamera(48, 1, 0.1, 5000)
    camera.position.set(180, 120, 180)

    const renderer = new THREE.WebGLRenderer({ antialias: true })
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    host.appendChild(renderer.domElement)

    const controls = new OrbitControls(camera, renderer.domElement)
    controls.enableDamping = true
    controls.update()

    scene.add(new THREE.AmbientLight('#9db9d3', 0.8))
    const dir = new THREE.DirectionalLight('#ffffff', 0.9)
    dir.position.set(180, 220, 140)
    scene.add(dir)
    const grid = new THREE.GridHelper(420, 14, '#b6c7d8', '#dbe7f1')
    grid.position.set(0, -30, 0)
    scene.add(grid)
    scene.add(new THREE.AxesHelper(70))

    const zTop = (widthMeters * 1000) / 2
    const zBot = -zTop
    const minExx = result.minExxMicrostrain
    const maxExx = result.maxExxMicrostrain
    const xOffset = (Math.min(...result.meshNodes.map((n) => n.xM)) + Math.max(...result.meshNodes.map((n) => n.xM))) * 500
    const unitToMm = unitSystem === 'US' ? 25.4 : 1
    const Lmm = distanceBetweenGageCls * unitToMm
    const rMm = radius * unitToMm

    const displacementScale = viewMode === 'deformed' ? 3.5 : 0
    const pseudoDisplaced = result.meshNodes.map((node, idx) => {
      const centerBias = 1 - Math.min(1, Math.abs(node.xM * 1000) / Math.max(Lmm, 1))
      const strain = result.nodalExxMicrostrain[idx]
      const dx = displacementScale * strain * 1e-6 * 25
      const dy = displacementScale * centerBias * -18
      return {
        x: node.xM * 1000 - xOffset + dx,
        y: node.yM * 1000 + dy,
      }
    })

    const surfaceOpacity =
      viewMode === 'mesh' ? 0.18 : viewMode === 'boundary' ? 0.28 : 0.94

    const addSurface = (z: number) => {
      const positions: number[] = []
      const colors: number[] = []
      const indices: number[] = []

      result.meshNodes.forEach((_, idx) => {
        const node = pseudoDisplaced[idx]
        positions.push(node.x, node.y, z)
        const color =
          viewMode === 'mesh'
            ? new THREE.Color('#d9e7f5')
            : viewMode === 'boundary'
              ? new THREE.Color('#dbeafe')
              : toColor(result.nodalExxMicrostrain[idx], minExx, maxExx)
        colors.push(color.r, color.g, color.b)
      })
      result.meshElements.forEach(([a, b, c]) => {
        indices.push(a, b, c)
      })

      const geometry = new THREE.BufferGeometry()
      geometry.setIndex(indices)
      geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
      geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3))
      geometry.computeVertexNormals()
      const material = new THREE.MeshPhongMaterial({
        vertexColors: true,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: surfaceOpacity,
      })
      scene.add(new THREE.Mesh(geometry, material))
      return { geometry, material }
    }

    const top = addSurface(zTop)
    const bot = addSurface(zBot)

    if (showEdges || viewMode === 'mesh' || viewMode === 'boundary') {
      const linePos: number[] = []
      result.meshElements.forEach(([a, b, c]) => {
        const pa = pseudoDisplaced[a]
        const pb = pseudoDisplaced[b]
        const pc = pseudoDisplaced[c]
        ;[[pa, pb], [pb, pc], [pc, pa]].forEach(([p, q]) => {
          linePos.push(p.x, p.y, zTop)
          linePos.push(q.x, q.y, zTop)
          linePos.push(p.x, p.y, zBot)
          linePos.push(q.x, q.y, zBot)
        })
      })
      const lineGeom = new THREE.BufferGeometry()
      lineGeom.setAttribute('position', new THREE.Float32BufferAttribute(linePos, 3))
      const lineMat = new THREE.LineBasicMaterial({
        color: viewMode === 'mesh' ? '#0f3f68' : '#183b56',
        transparent: true,
        opacity: viewMode === 'mesh' ? 0.7 : 0.25,
      })
      scene.add(new THREE.LineSegments(lineGeom, lineMat))
    }

    if (showNodes || viewMode === 'mesh') {
      const nodePositions = pseudoDisplaced.flatMap((node) => [node.x, node.y, 0])
      const nodeGeometry = new THREE.BufferGeometry()
      nodeGeometry.setAttribute('position', new THREE.Float32BufferAttribute(nodePositions, 3))
      const nodeMaterial = new THREE.PointsMaterial({
        color: '#0f172a',
        size: viewMode === 'mesh' ? 2.8 : 2.2,
        transparent: true,
        opacity: 0.55,
      })
      scene.add(new THREE.Points(nodeGeometry, nodeMaterial))
    }

    const minX = Math.min(...result.meshNodes.map((n) => n.xM)) * 1000 - xOffset
    const maxX = Math.max(...result.meshNodes.map((n) => n.xM)) * 1000 - xOffset

    if (viewMode === 'boundary' || viewMode === 'deformed') {
      const clamp = new THREE.Mesh(
        new THREE.BoxGeometry(5, 50, (widthMeters * 1000) * 1.3),
        new THREE.MeshPhongMaterial({ color: '#6f8599', transparent: true, opacity: 0.8 })
      )
      clamp.position.set(minX - 2.5, 0, 0)
      scene.add(clamp)

      ;[-0.3, 0, 0.3].forEach((zScale) => {
        const arrow = new THREE.ArrowHelper(
          new THREE.Vector3(0, -1, 0),
          new THREE.Vector3(maxX, 26, zScale * widthMeters * 1000),
          24,
          0xcc412f
        )
        scene.add(arrow)
      })
    }

    const outlinePoints: number[] = []
    const minY = Math.min(...result.meshNodes.map((n) => n.yM)) * 1000
    const maxY = Math.max(...result.meshNodes.map((n) => n.yM)) * 1000
    ;[
      [minX, minY, zTop],
      [maxX, minY, zTop],
      [maxX, maxY, zTop],
      [minX, maxY, zTop],
      [minX, minY, zTop],
    ].forEach(([x, y, z]) => outlinePoints.push(x, y, z))
    const outlineGeometry = new THREE.BufferGeometry()
    outlineGeometry.setAttribute('position', new THREE.Float32BufferAttribute(outlinePoints, 3))
    const outlineMaterial = new THREE.LineBasicMaterial({ color: '#0f172a', transparent: true, opacity: 0.35 })
    scene.add(new THREE.Line(outlineGeometry, outlineMaterial))

    const bbox = new THREE.Box3().setFromObject(scene)
    const center = bbox.getCenter(new THREE.Vector3())
    controls.target.copy(center)
    camera.lookAt(center)

    const resize = () => {
      const width = host.clientWidth
      const height = Math.max(260, host.clientHeight)
      camera.aspect = width / height
      camera.updateProjectionMatrix()
      renderer.setSize(width, height)
    }
    resize()

    let raf = 0
    const animate = () => {
      controls.update()
      renderer.render(scene, camera)
      raf = requestAnimationFrame(animate)
    }
    animate()
    window.addEventListener('resize', resize)

    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('resize', resize)
      controls.dispose()
      top.geometry.dispose()
      bot.geometry.dispose()
      top.material.dispose()
      bot.material.dispose()
      outlineGeometry.dispose()
      outlineMaterial.dispose()
      renderer.dispose()
      if (renderer.domElement.parentElement === host) host.removeChild(renderer.domElement)
    }
  }, [result, widthMeters, unitSystem, distanceBetweenGageCls, radius, viewMode, showNodes, showEdges])

  const modeLabel =
    viewMode === 'mesh'
      ? 'Mesh view'
      : viewMode === 'contour'
        ? 'Contour view'
        : viewMode === 'deformed'
          ? 'Deformed view'
          : 'Boundary view'

  return (
    <div className="step-viewer-wrap">
      <div className="step-viewer" ref={rootRef} />
      <div className="fea-dimensions">
        <span>{modeLabel}</span>
        <span>L: {distanceBetweenGageCls.toFixed(4)} {unitSystem === 'US' ? 'in' : 'mm'}</span>
        <span>r: {radius.toFixed(4)} {unitSystem === 'US' ? 'in' : 'mm'}</span>
        <span>t: {minimumThickness.toFixed(4)} {unitSystem === 'US' ? 'in' : 'mm'}</span>
        <span>h: {beamHeight.toFixed(4)} {unitSystem === 'US' ? 'in' : 'mm'}</span>
        <span>w: {beamWidth.toFixed(4)} {unitSystem === 'US' ? 'in' : 'mm'}</span>
      </div>
      {viewMode !== 'mesh' && (
        <div className="strain-legend">
          <span>Strain contour: εxx (µε)</span>
          <div className="strain-legend-bar" />
          <div className="strain-legend-scale">
            <small>{result.minExxMicrostrain.toFixed(1)}</small>
            <small>{result.maxExxMicrostrain.toFixed(1)}</small>
          </div>
        </div>
      )}
    </div>
  )
}
