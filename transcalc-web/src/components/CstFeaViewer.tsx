import { useEffect, useRef } from 'react'
import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import type { CantileverFeaSolution } from '../domain/fea/cantileverSolver'

export type CstFeaViewMode = 'mesh' | 'contour' | 'deformed' | 'boundary'
export type CstFeaStrainKey = 'exx' | 'eyy' | 'exy'
export type CstFeaBcType = 'cantilever' | 'simply-supported' | 'axial' | 'shear-web'

type CstFeaViewerProps = {
  solution: CantileverFeaSolution
  depthMm: number
  viewMode: CstFeaViewMode
  strainKey?: CstFeaStrainKey
  bcType?: CstFeaBcType
  unitSystem: 'SI' | 'US'
  showNodes?: boolean
  showEdges?: boolean
  dimLabels?: Array<{ label: string; value: number }>
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
  ] as const
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

export default function CstFeaViewer({
  solution,
  depthMm,
  viewMode,
  strainKey = 'exx',
  bcType = 'cantilever',
  unitSystem,
  showNodes = false,
  showEdges = true,
  dimLabels = [],
}: CstFeaViewerProps) {
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

    const zTop = depthMm / 2
    const zBot = -zTop

    // Compute strain range from nodal strains for the chosen key
    const nodalStrains = solution.nodalStrainsMicrostrain.map((t) => t[strainKey])
    const minStrain = Math.min(...nodalStrains)
    const maxStrain = Math.max(...nodalStrains)

    // Center the mesh in X
    const nodeXs = solution.nodes.map((n) => n.xM * 1000)
    const nodeYs = solution.nodes.map((n) => n.yM * 1000)
    const xOffset = (Math.min(...nodeXs) + Math.max(...nodeXs)) / 2
    const minX = Math.min(...nodeXs) - xOffset
    const maxX = Math.max(...nodeXs) - xOffset
    const minY = Math.min(...nodeYs)
    const maxY = Math.max(...nodeYs)

    // Compute displacement scale for deformed mode so max displacement = ~8% of model extent
    let dispScale = 0
    if (viewMode === 'deformed' && solution.displacementsM.length > 0) {
      const modelSpan = Math.max(maxX - minX, maxY - minY, 1)
      const maxDispM = Math.max(...solution.displacementsM.map((d) => Math.sqrt(d.ux * d.ux + d.uy * d.uy)))
      dispScale = maxDispM > 1e-12 ? (modelSpan * 0.08) / (maxDispM * 1000) : 0
    }

    const displaced = solution.nodes.map((node, idx) => {
      const x = node.xM * 1000 - xOffset
      const y = node.yM * 1000
      if (viewMode === 'deformed' && solution.displacementsM[idx]) {
        const d = solution.displacementsM[idx]
        return { x: x + d.ux * 1000 * dispScale, y: y + d.uy * 1000 * dispScale }
      }
      return { x, y }
    })

    const surfaceOpacity =
      viewMode === 'mesh' ? 0.18 : viewMode === 'boundary' ? 0.28 : 0.94

    const addSurface = (z: number) => {
      const positions: number[] = []
      const colors: number[] = []
      const indices: number[] = []

      displaced.forEach((node, idx) => {
        positions.push(node.x, node.y, z)
        const color =
          viewMode === 'mesh'
            ? new THREE.Color('#d9e7f5')
            : viewMode === 'boundary'
              ? new THREE.Color('#dbeafe')
              : toColor(nodalStrains[idx], minStrain, maxStrain)
        colors.push(color.r, color.g, color.b)
      })
      solution.elements.forEach(([a, b, c]) => {
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
      solution.elements.forEach(([a, b, c]) => {
        const pa = displaced[a], pb = displaced[b], pc = displaced[c]
        ;[[pa, pb], [pb, pc], [pc, pa]].forEach(([p, q]) => {
          linePos.push(p.x, p.y, zTop, q.x, q.y, zTop)
          linePos.push(p.x, p.y, zBot, q.x, q.y, zBot)
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
      const nodePositions = displaced.flatMap((node) => [node.x, node.y, 0])
      const nodeGeom = new THREE.BufferGeometry()
      nodeGeom.setAttribute('position', new THREE.Float32BufferAttribute(nodePositions, 3))
      scene.add(new THREE.Points(nodeGeom, new THREE.PointsMaterial({
        color: '#0f172a', size: viewMode === 'mesh' ? 2.8 : 2.2,
        transparent: true, opacity: 0.55,
      })))
    }

    // Boundary condition annotations
    if (viewMode === 'boundary' || viewMode === 'deformed') {
      const clampW = (maxY - minY) * 0.15
      const clampH = maxY - minY + 8
      const zSpan = depthMm * 1.3

      if (bcType === 'cantilever') {
        const clamp = new THREE.Mesh(
          new THREE.BoxGeometry(clampW, clampH, zSpan),
          new THREE.MeshPhongMaterial({ color: '#6f8599', transparent: true, opacity: 0.8 })
        )
        clamp.position.set(minX - clampW / 2, (minY + maxY) / 2, 0)
        scene.add(clamp)
        ;[-0.3, 0, 0.3].forEach((zs) => {
          scene.add(new THREE.ArrowHelper(
            new THREE.Vector3(0, -1, 0),
            new THREE.Vector3(maxX, (minY + maxY) / 2 + clampH * 0.3, zs * depthMm),
            (maxY - minY) * 0.35, 0xcc412f
          ))
        })
      } else if (bcType === 'simply-supported') {
        // Pin at left, roller at right, arrows pointing down at center
        const pinSize = (maxY - minY) * 0.12
        ;[[minX, 'pin'], [maxX, 'roller']].forEach(([px]) => {
          const pin = new THREE.Mesh(
            new THREE.CylinderGeometry(pinSize, pinSize, zSpan * 0.8, 8),
            new THREE.MeshPhongMaterial({ color: '#6f8599', transparent: true, opacity: 0.8 })
          )
          pin.rotation.x = Math.PI / 2
          pin.position.set(px as number, minY - pinSize, 0)
          scene.add(pin)
        })
        ;[-0.3, 0, 0.3].forEach((zs) => {
          scene.add(new THREE.ArrowHelper(
            new THREE.Vector3(0, -1, 0),
            new THREE.Vector3((minX + maxX) / 2, maxY + (maxY - minY) * 0.4, zs * depthMm),
            (maxY - minY) * 0.35, 0xcc412f
          ))
        })
      } else if (bcType === 'axial') {
        // Clamped base plate, downward arrows at top
        const baseH = (maxY - minY) * 0.08
        const base = new THREE.Mesh(
          new THREE.BoxGeometry((maxX - minX) * 1.15, baseH, zSpan),
          new THREE.MeshPhongMaterial({ color: '#6f8599', transparent: true, opacity: 0.8 })
        )
        base.position.set((minX + maxX) / 2, minY - baseH / 2, 0)
        scene.add(base)
        ;[-0.3, 0, 0.3].forEach((zs) => {
          scene.add(new THREE.ArrowHelper(
            new THREE.Vector3(0, -1, 0),
            new THREE.Vector3((minX + maxX) / 2 + zs * (maxX - minX) * 0.3, maxY + (maxY - minY) * 0.4, zs * depthMm),
            (maxY - minY) * 0.35, 0xcc412f
          ))
        })
      } else if (bcType === 'shear-web') {
        // Pin supports at corners, horizontal transverse arrows
        const pinSize = (maxY - minY) * 0.08
        ;[minX, maxX].forEach((px) => {
          ;[minY, maxY].forEach((py) => {
            const pin = new THREE.Mesh(
              new THREE.SphereGeometry(pinSize, 8, 6),
              new THREE.MeshPhongMaterial({ color: '#6f8599', transparent: true, opacity: 0.8 })
            )
            pin.position.set(px, py, 0)
            scene.add(pin)
          })
        })
        ;[-0.3, 0, 0.3].forEach((zs) => {
          scene.add(new THREE.ArrowHelper(
            new THREE.Vector3(1, 0, 0),
            new THREE.Vector3(minX - (maxX - minX) * 0.25, (minY + maxY) / 2, zs * depthMm),
            (maxX - minX) * 0.2, 0xcc412f
          ))
        })
      }
    }

    // Outline border
    const outlinePoints = [
      [minX, minY, zTop], [maxX, minY, zTop], [maxX, maxY, zTop],
      [minX, maxY, zTop], [minX, minY, zTop],
    ]
    const outlineGeom = new THREE.BufferGeometry()
    outlineGeom.setAttribute('position', new THREE.Float32BufferAttribute(outlinePoints.flat(), 3))
    scene.add(new THREE.Line(outlineGeom, new THREE.LineBasicMaterial({ color: '#0f172a', transparent: true, opacity: 0.35 })))

    const bbox = new THREE.Box3().setFromObject(scene)
    const center = bbox.getCenter(new THREE.Vector3())
    controls.target.copy(center)
    camera.lookAt(center)

    const resize = () => {
      const w = host.clientWidth
      const h = Math.max(260, host.clientHeight)
      camera.aspect = w / h
      camera.updateProjectionMatrix()
      renderer.setSize(w, h)
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
      outlineGeom.dispose()
      renderer.dispose()
      if (renderer.domElement.parentElement === host) host.removeChild(renderer.domElement)
    }
  }, [solution, depthMm, viewMode, strainKey, bcType, showNodes, showEdges])

  const lenUnit = unitSystem === 'SI' ? 'mm' : 'in'
  const strainLabel = strainKey === 'exx' ? 'ε_xx' : strainKey === 'eyy' ? 'ε_yy' : 'ε_xy'
  const modeLabel =
    viewMode === 'mesh' ? 'Mesh' : viewMode === 'contour' ? 'Contour' : viewMode === 'deformed' ? 'Deformed' : 'Boundary'

  const nodalStrains = solution.nodalStrainsMicrostrain.map((t) => t[strainKey])
  const minStrain = Math.min(...nodalStrains)
  const maxStrain = Math.max(...nodalStrains)

  return (
    <div className="step-viewer-wrap">
      <div className="step-viewer" ref={rootRef} />
      <div className="fea-dimensions">
        <span>{modeLabel} · {strainLabel}</span>
        {dimLabels.map(({ label, value }) => (
          <span key={label}>{label}: {value.toFixed(2)} {lenUnit}</span>
        ))}
      </div>
      {viewMode !== 'mesh' && (
        <div className="strain-legend">
          <span>Contour: {strainLabel} (µε)</span>
          <div className="strain-legend-bar" />
          <div className="strain-legend-scale">
            <small>{minStrain.toFixed(1)}</small>
            <small>{maxStrain.toFixed(1)}</small>
          </div>
        </div>
      )}
    </div>
  )
}
