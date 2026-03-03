import { useEffect, useRef } from 'react'
import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import type { BinobeamFeaResult } from '../domain/fea/binobeamSolver'

type BinobeamFeaViewerProps = {
  result: BinobeamFeaResult
  widthMeters: number
  unitSystem: 'US' | 'SI'
  distanceBetweenGageCls: number
  radius: number
  beamHeight: number
  minimumThickness: number
  beamWidth: number
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
}: BinobeamFeaViewerProps) {
  const rootRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    if (!rootRef.current) return
    const host = rootRef.current
    const scene = new THREE.Scene()
    scene.background = new THREE.Color('#f6fbff')

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

    const addSurface = (z: number) => {
      const positions: number[] = []
      const colors: number[] = []
      const indices: number[] = []

      result.meshNodes.forEach((n, idx) => {
        positions.push(n.xM * 1000 - xOffset, n.yM * 1000, z)
        const c = toColor(result.nodalExxMicrostrain[idx], minExx, maxExx)
        colors.push(c.r, c.g, c.b)
      })
      result.meshElements.forEach(([a, b, c]) => {
        indices.push(a, b, c)
      })

      const geom = new THREE.BufferGeometry()
      geom.setIndex(indices)
      geom.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
      geom.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3))
      geom.computeVertexNormals()
      const mat = new THREE.MeshPhongMaterial({
        vertexColors: true,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.92,
      })
      scene.add(new THREE.Mesh(geom, mat))
      return { geom, mat }
    }

    const top = addSurface(zTop)
    const bot = addSurface(zBot)

    const edgeCounts = new Map<string, { a: number; b: number; count: number }>()
    const addEdge = (a: number, b: number) => {
      const i = Math.min(a, b)
      const j = Math.max(a, b)
      const key = `${i}:${j}`
      const existing = edgeCounts.get(key)
      if (existing) {
        existing.count += 1
      } else {
        edgeCounts.set(key, { a: i, b: j, count: 1 })
      }
    }
    result.meshElements.forEach(([a, b, c]) => {
      addEdge(a, b)
      addEdge(b, c)
      addEdge(c, a)
    })
    const boundaryEdges = Array.from(edgeCounts.values()).filter((e) => e.count === 1)

    const sidePositions: number[] = []
    const sideColors: number[] = []
    const sideIndices: number[] = []
    boundaryEdges.forEach(({ a, b }) => {
      const pa = result.meshNodes[a]
      const pb = result.meshNodes[b]
      const ca = toColor(result.nodalExxMicrostrain[a], minExx, maxExx)
      const cb = toColor(result.nodalExxMicrostrain[b], minExx, maxExx)
      const base = sidePositions.length / 3

      sidePositions.push(pa.xM * 1000 - xOffset, pa.yM * 1000, zTop)
      sideColors.push(ca.r, ca.g, ca.b)
      sidePositions.push(pb.xM * 1000 - xOffset, pb.yM * 1000, zTop)
      sideColors.push(cb.r, cb.g, cb.b)
      sidePositions.push(pb.xM * 1000 - xOffset, pb.yM * 1000, zBot)
      sideColors.push(cb.r, cb.g, cb.b)
      sidePositions.push(pa.xM * 1000 - xOffset, pa.yM * 1000, zBot)
      sideColors.push(ca.r, ca.g, ca.b)

      sideIndices.push(base, base + 1, base + 2, base, base + 2, base + 3)
    })

    const sideGeom = new THREE.BufferGeometry()
    sideGeom.setIndex(sideIndices)
    sideGeom.setAttribute('position', new THREE.Float32BufferAttribute(sidePositions, 3))
    sideGeom.setAttribute('color', new THREE.Float32BufferAttribute(sideColors, 3))
    sideGeom.computeVertexNormals()
    const sideMat = new THREE.MeshPhongMaterial({
      vertexColors: true,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.9,
    })
    scene.add(new THREE.Mesh(sideGeom, sideMat))

    const linePos: number[] = []
    result.meshElements.forEach(([a, b, c]) => {
      const pa = result.meshNodes[a]
      const pb = result.meshNodes[b]
      const pc = result.meshNodes[c]
      ;[[pa, pb], [pb, pc], [pc, pa]].forEach(([p, q]) => {
        linePos.push(p.xM * 1000 - xOffset, p.yM * 1000, zTop)
        linePos.push(q.xM * 1000 - xOffset, q.yM * 1000, zTop)
        linePos.push(p.xM * 1000 - xOffset, p.yM * 1000, zBot)
        linePos.push(q.xM * 1000 - xOffset, q.yM * 1000, zBot)
      })
    })
    const lineGeom = new THREE.BufferGeometry()
    lineGeom.setAttribute('position', new THREE.Float32BufferAttribute(linePos, 3))
    const lineMat = new THREE.LineBasicMaterial({ color: '#0f3f68', transparent: true, opacity: 0.25 })
    scene.add(new THREE.LineSegments(lineGeom, lineMat))

    const makePolyline = (pts: Array<[number, number]>, z: number, color: string) => {
      const pos: number[] = []
      pts.forEach(([x, y]) => {
        pos.push(x - xOffset, y, z)
      })
      const geom = new THREE.BufferGeometry()
      geom.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3))
      const mat = new THREE.LineBasicMaterial({ color, transparent: true, opacity: 0.85 })
      scene.add(new THREE.Line(geom, mat))
      return { geom, mat }
    }

    const minXmm = Math.min(...result.meshNodes.map((n) => n.xM * 1000))
    const maxXmm = Math.max(...result.meshNodes.map((n) => n.xM * 1000))
    const minYmm = Math.min(...result.meshNodes.map((n) => n.yM * 1000))
    const maxYmm = Math.max(...result.meshNodes.map((n) => n.yM * 1000))
    const outerLoop: Array<[number, number]> = [
      [minXmm, minYmm],
      [maxXmm, minYmm],
      [maxXmm, maxYmm],
      [minXmm, maxYmm],
      [minXmm, minYmm],
    ]

    const cutoutPts: Array<[number, number]> = []
    const arcN = 36
    for (let i = 0; i <= arcN; i += 1) {
      const t = (-Math.PI / 2) + (Math.PI * i) / arcN
      cutoutPts.push([(-Lmm / 2) + rMm * Math.cos(t), rMm * Math.sin(t)])
    }
    for (let i = 0; i <= arcN; i += 1) {
      const t = (Math.PI / 2) - (Math.PI * i) / arcN
      cutoutPts.push([(Lmm / 2) + rMm * Math.cos(t), rMm * Math.sin(t)])
    }
    cutoutPts.push(cutoutPts[0])

    const outerTop = makePolyline(outerLoop, zTop, '#13283f')
    const outerBot = makePolyline(outerLoop, zBot, '#13283f')
    const cutTop = makePolyline(cutoutPts, zTop, '#091b2d')
    const cutBot = makePolyline(cutoutPts, zBot, '#091b2d')

    const nodes = result.meshNodes.map((n, idx) => ({ ...n, idx }))
    const minX = Math.min(...nodes.map((n) => n.xM))
    const maxX = Math.max(...nodes.map((n) => n.xM))

    const clamp = new THREE.Mesh(
      new THREE.BoxGeometry(5, 50, (widthMeters * 1000) * 1.3),
      new THREE.MeshPhongMaterial({ color: '#6f8599', transparent: true, opacity: 0.8 })
    )
    clamp.position.set(minX * 1000 - xOffset - 2.5, 0, 0)
    scene.add(clamp)

    ;[-0.3, 0, 0.3].forEach((zScale) => {
      const arrow = new THREE.ArrowHelper(
        new THREE.Vector3(0, -1, 0),
        new THREE.Vector3(maxX * 1000 - xOffset, 26, zScale * widthMeters * 1000),
        24,
        0xcc412f
      )
      scene.add(arrow)
    })

    const bbox = new THREE.Box3().setFromObject(scene)
    const center = bbox.getCenter(new THREE.Vector3())
    controls.target.copy(center)
    camera.lookAt(center)

    const resize = () => {
      const width = host.clientWidth
      const height = Math.max(240, host.clientHeight)
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
      top.geom.dispose()
      bot.geom.dispose()
      top.mat.dispose()
      bot.mat.dispose()
      sideGeom.dispose()
      sideMat.dispose()
      lineGeom.dispose()
      lineMat.dispose()
      outerTop.geom.dispose()
      outerTop.mat.dispose()
      outerBot.geom.dispose()
      outerBot.mat.dispose()
      cutTop.geom.dispose()
      cutTop.mat.dispose()
      cutBot.geom.dispose()
      cutBot.mat.dispose()
      renderer.dispose()
      if (renderer.domElement.parentElement === host) host.removeChild(renderer.domElement)
    }
  }, [result, widthMeters])

  return (
    <div className="step-viewer-wrap">
      <div className="step-viewer" ref={rootRef} />
      <div className="fea-dimensions">
        <span>L: {distanceBetweenGageCls.toFixed(4)} {unitSystem === 'US' ? 'in' : 'mm'}</span>
        <span>r: {radius.toFixed(4)} {unitSystem === 'US' ? 'in' : 'mm'}</span>
        <span>t: {minimumThickness.toFixed(4)} {unitSystem === 'US' ? 'in' : 'mm'}</span>
        <span>h: {beamHeight.toFixed(4)} {unitSystem === 'US' ? 'in' : 'mm'}</span>
        <span>w: {beamWidth.toFixed(4)} {unitSystem === 'US' ? 'in' : 'mm'}</span>
      </div>
      <div className="strain-legend">
        <span>Strain contour: εxx (µε)</span>
        <div className="strain-legend-bar" />
        <div className="strain-legend-scale">
          <small>{result.minExxMicrostrain.toFixed(1)}</small>
          <small>{result.maxExxMicrostrain.toFixed(1)}</small>
        </div>
      </div>
    </div>
  )
}
