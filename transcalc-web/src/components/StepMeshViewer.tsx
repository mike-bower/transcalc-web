import { useEffect, useMemo, useRef } from 'react'
import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import {
  buildCantileverStructuredMesh,
  type CantileverStepExportOptions,
} from '../domain/fea/stepExport'
import type { CantileverFeaInput } from '../domain/fea/cantilever'
import type { CantileverFeaSolution } from '../domain/fea/cantileverSolver'

type StepMeshViewerProps = {
  input: CantileverFeaInput
  solution: CantileverFeaSolution
  meshOptions?: CantileverStepExportOptions
}

export default function StepMeshViewer({ input, solution, meshOptions }: StepMeshViewerProps) {
  const rootRef = useRef<HTMLDivElement | null>(null)
  const contourRange = useMemo(() => {
    const L = input.loadPointToGageClLengthMm
    const W = input.beamWidthMm
    const T = input.thicknessMm
    const nx = 24
    const ny = 10
    const nz = 10
    const values: number[] = []

    // Top and bottom
    for (let i = 0; i <= nx; i += 1) {
      const xMm = (L * i) / nx
      values.push(solution.sampleStrainTensorMicrostrain(xMm, T / 2).exx)
      values.push(solution.sampleStrainTensorMicrostrain(xMm, -T / 2).exx)
    }

    // Front/back sides
    for (let i = 0; i <= nx; i += 1) {
      const xMm = (L * i) / nx
      for (let j = 0; j <= ny; j += 1) {
        const yMm = -T / 2 + (T * j) / ny
        values.push(solution.sampleStrainTensorMicrostrain(xMm, yMm).exx)
      }
    }

    // Fixed/free end faces
    for (let k = 0; k <= nz; k += 1) {
      const xFixed = 0
      const xFree = L
      for (let j = 0; j <= ny; j += 1) {
        const yMm = -T / 2 + (T * j) / ny
        values.push(solution.sampleStrainTensorMicrostrain(xFixed, yMm).exx)
        values.push(solution.sampleStrainTensorMicrostrain(xFree, yMm).exx)
      }
    }

    if (values.length === 0) return { minExx: 0, maxExx: 0 }
    return {
      minExx: Math.min(...values),
      maxExx: Math.max(...values),
    }
  }, [input.loadPointToGageClLengthMm, input.beamWidthMm, input.thicknessMm, solution])

  const toRgb = (tRaw: number): string => {
    const t = Math.max(0, Math.min(1, tRaw))
    const stops = [
      [52, 152, 255],  // bright blue
      [58, 214, 236],  // bright cyan
      [126, 229, 121], // bright green
      [255, 224, 102], // warm yellow
      [255, 120, 92],  // bright red-orange
    ]
    const n = stops.length - 1
    const scaled = t * n
    const i = Math.min(n - 1, Math.floor(scaled))
    const local = scaled - i
    const a = stops[i]
    const b = stops[i + 1]
    const r = Math.round(a[0] + (b[0] - a[0]) * local)
    const g = Math.round(a[1] + (b[1] - a[1]) * local)
    const bch = Math.round(a[2] + (b[2] - a[2]) * local)
    return `rgb(${r},${g},${bch})`
  }

  const toThreeColor = (value: number, min: number, max: number): THREE.Color => {
    const span = max - min || 1
    const t = (value - min) / span
    return new THREE.Color(toRgb(t))
  }

  const makeTextSprite = (text: string): THREE.Sprite => {
    const canvas = document.createElement('canvas')
    canvas.width = 512
    canvas.height = 128
    const ctx = canvas.getContext('2d')
    if (ctx) {
      ctx.fillStyle = 'rgba(246,251,255,0.86)'
      ctx.fillRect(0, 0, canvas.width, canvas.height)
      ctx.fillStyle = '#1f3f5c'
      ctx.font = 'bold 44px Barlow, sans-serif'
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillText(text, canvas.width / 2, canvas.height / 2)
    }
    const texture = new THREE.CanvasTexture(canvas)
    const material = new THREE.SpriteMaterial({ map: texture, transparent: true })
    const sprite = new THREE.Sprite(material)
    sprite.scale.set(26, 6.5, 1)
    return sprite
  }

  const addDimension = (
    scene: THREE.Scene,
    from: THREE.Vector3,
    to: THREE.Vector3,
    text: string
  ) => {
    const mat = new THREE.LineBasicMaterial({ color: '#455f75' })
    const lineGeom = new THREE.BufferGeometry().setFromPoints([from, to])
    scene.add(new THREE.Line(lineGeom, mat))

    const direction = new THREE.Vector3().subVectors(to, from).normalize()
    const normal = new THREE.Vector3(0, 1, 0).cross(direction).normalize().multiplyScalar(3.2)
    scene.add(new THREE.Line(
      new THREE.BufferGeometry().setFromPoints([from.clone().add(normal), from.clone().sub(normal)]),
      mat
    ))
    scene.add(new THREE.Line(
      new THREE.BufferGeometry().setFromPoints([to.clone().add(normal), to.clone().sub(normal)]),
      mat
    ))

    const label = makeTextSprite(text)
    label.position.copy(from.clone().add(to).multiplyScalar(0.5).add(normal.clone().multiplyScalar(1.6)))
    scene.add(label)
  }

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
    controls.target.set(0, 0, 0)
    controls.update()

    const lightA = new THREE.DirectionalLight('#ffffff', 0.9)
    lightA.position.set(180, 220, 140)
    scene.add(lightA)
    scene.add(new THREE.AmbientLight('#9db9d3', 0.8))

    const grid = new THREE.GridHelper(420, 14, '#b6c7d8', '#dbe7f1')
    grid.position.set(0, -30, 0)
    scene.add(grid)
    scene.add(new THREE.AxesHelper(70))

    const xOffset = input.loadPointToGageClLengthMm / 2
    const L = input.loadPointToGageClLengthMm
    const W = input.beamWidthMm
    const T = input.thicknessMm

    // Fixed-end constraint plate with hatch lines.
    const clampPlate = new THREE.Mesh(
      new THREE.BoxGeometry(4, T * 1.35, W * 1.35),
      new THREE.MeshPhongMaterial({ color: '#6f8599', transparent: true, opacity: 0.86 })
    )
    // Place right face of clamp plate flush with fixed beam face at x = -xOffset.
    clampPlate.position.set(-xOffset - 2, 0, 0)
    scene.add(clampPlate)

    for (let i = -5; i <= 5; i += 1) {
      const z = (i / 5) * (W * 0.65)
      const hatch = new THREE.Line(
        new THREE.BufferGeometry().setFromPoints([
          new THREE.Vector3(-xOffset - 2, -T * 0.68, z - 4),
          new THREE.Vector3(-xOffset - 2, T * 0.68, z + 4),
        ]),
        new THREE.LineBasicMaterial({ color: '#455f75' })
      )
      scene.add(hatch)
    }

    // Load arrows at free end.
    const loadArrowColor = new THREE.Color('#cc412f')
    const arrowLength = Math.max(12, T * 2.6)
    ;[-0.3, 0, 0.3].forEach((zScale) => {
      const arrow = new THREE.ArrowHelper(
        new THREE.Vector3(0, -1, 0),
        new THREE.Vector3(xOffset, T * 0.95, zScale * W),
        arrowLength,
        loadArrowColor.getHex(),
        arrowLength * 0.26,
        arrowLength * 0.16
      )
      scene.add(arrow)
    })

    const minExx = contourRange.minExx
    const maxExx = contourRange.maxExx
    const contourMaterial = new THREE.MeshPhongMaterial({
      side: THREE.DoubleSide,
      vertexColors: true,
      transparent: true,
      opacity: 0.92,
    })

    const contourGeometries: THREE.BufferGeometry[] = []

    const addSurface = (
      nu: number,
      nv: number,
      samplePoint: (iu: number, iv: number) => { x: number; y: number; z: number; xMm: number; yMm: number }
    ) => {
      const positions: number[] = []
      const colors: number[] = []
      const indices: number[] = []

      for (let iu = 0; iu <= nu; iu += 1) {
        for (let iv = 0; iv <= nv; iv += 1) {
          const p = samplePoint(iu, iv)
          positions.push(p.x, p.y, p.z)
          const exx = solution.sampleStrainTensorMicrostrain(p.xMm, p.yMm).exx
          const c = toThreeColor(exx, minExx, maxExx)
          colors.push(c.r, c.g, c.b)
        }
      }

      for (let iu = 0; iu < nu; iu += 1) {
        for (let iv = 0; iv < nv; iv += 1) {
          const a = iu * (nv + 1) + iv
          const b = a + 1
          const c = (iu + 1) * (nv + 1) + iv
          const d = c + 1
          indices.push(a, c, b)
          indices.push(b, c, d)
        }
      }

      const geometry = new THREE.BufferGeometry()
      geometry.setIndex(indices)
      geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
      geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3))
      geometry.computeVertexNormals()
      contourGeometries.push(geometry)
      const mesh = new THREE.Mesh(geometry, contourMaterial)
      scene.add(mesh)
    }

    const nx = 30
    const ny = 12
    const nz = 12
    const eps = 0.12

    // Top
    addSurface(nx, nz, (iu, iv) => {
      const xLocal = -xOffset + (L * iu) / nx
      const xMm = xLocal + xOffset
      const z = -W / 2 + (W * iv) / nz
      return { x: xLocal, y: T / 2 + eps, z, xMm, yMm: T / 2 }
    })
    // Bottom
    addSurface(nx, nz, (iu, iv) => {
      const xLocal = -xOffset + (L * iu) / nx
      const xMm = xLocal + xOffset
      const z = -W / 2 + (W * iv) / nz
      return { x: xLocal, y: -T / 2 - eps, z, xMm, yMm: -T / 2 }
    })
    // Front (z+)
    addSurface(nx, ny, (iu, iv) => {
      const xLocal = -xOffset + (L * iu) / nx
      const xMm = xLocal + xOffset
      const y = -T / 2 + (T * iv) / ny
      return { x: xLocal, y, z: W / 2 + eps, xMm, yMm: y }
    })
    // Back (z-)
    addSurface(nx, ny, (iu, iv) => {
      const xLocal = -xOffset + (L * iu) / nx
      const xMm = xLocal + xOffset
      const y = -T / 2 + (T * iv) / ny
      return { x: xLocal, y, z: -W / 2 - eps, xMm, yMm: y }
    })
    // Fixed end (x=0)
    addSurface(nz, ny, (iu, iv) => {
      const z = -W / 2 + (W * iu) / nz
      const y = -T / 2 + (T * iv) / ny
      return { x: -xOffset - eps, y, z, xMm: 0, yMm: y }
    })
    // Free end (x=L)
    addSurface(nz, ny, (iu, iv) => {
      const z = -W / 2 + (W * iu) / nz
      const y = -T / 2 + (T * iv) / ny
      return { x: xOffset + eps, y, z, xMm: L, yMm: y }
    })

    const mesh = buildCantileverStructuredMesh(input, meshOptions)
    const linePositions: number[] = []

    mesh.edges.forEach((edge) => {
      const a = mesh.points[edge.a]
      const b = mesh.points[edge.b]
      linePositions.push(a.xMm - xOffset, a.yMm, a.zMm)
      linePositions.push(b.xMm - xOffset, b.yMm, b.zMm)
    })

    const lineGeometry = new THREE.BufferGeometry()
    lineGeometry.setAttribute('position', new THREE.Float32BufferAttribute(linePositions, 3))
    const lineMaterial = new THREE.LineBasicMaterial({ color: '#0f3f68', transparent: true, opacity: 0.55 })
    const lines = new THREE.LineSegments(lineGeometry, lineMaterial)
    scene.add(lines)

    addDimension(
      scene,
      new THREE.Vector3(-xOffset, -T / 2 - 14, 0),
      new THREE.Vector3(xOffset, -T / 2 - 14, 0),
      `L = ${L.toFixed(2)} mm`
    )
    addDimension(
      scene,
      new THREE.Vector3(0, T / 2 + 12, -W / 2),
      new THREE.Vector3(0, T / 2 + 12, W / 2),
      `w = ${W.toFixed(2)} mm`
    )
    addDimension(
      scene,
      new THREE.Vector3(-xOffset + L * 0.16, -T / 2, W / 2 + 10),
      new THREE.Vector3(-xOffset + L * 0.16, T / 2, W / 2 + 10),
      `t = ${T.toFixed(2)} mm`
    )

    const bbox = new THREE.Box3().setFromObject(lines)
    const center = bbox.getCenter(new THREE.Vector3())
    controls.target.copy(center)
    camera.lookAt(center)
    controls.update()

    const resize = () => {
      const width = host.clientWidth
      const height = Math.max(220, host.clientHeight)
      camera.aspect = width / height
      camera.updateProjectionMatrix()
      renderer.setSize(width, height)
    }
    resize()

    let raf = 0
    const animate = () => {
      controls.update()
      renderer.render(scene, camera)
      raf = window.requestAnimationFrame(animate)
    }
    animate()

    window.addEventListener('resize', resize)

    return () => {
      window.cancelAnimationFrame(raf)
      window.removeEventListener('resize', resize)
      controls.dispose()
      contourGeometries.forEach((g) => g.dispose())
      contourMaterial.dispose()
      lineGeometry.dispose()
      lineMaterial.dispose()
      renderer.dispose()
      if (renderer.domElement.parentElement === host) {
        host.removeChild(renderer.domElement)
      }
    }
  }, [input, meshOptions, contourRange.minExx, contourRange.maxExx, solution])

  return (
    <div className="step-viewer-wrap">
      <div className="step-viewer" ref={rootRef} />
      <div className="strain-legend">
        <span>Strain contour: εxx (µε)</span>
        <div className="strain-legend-bar" />
        <div className="strain-legend-scale">
          <small>{contourRange.minExx.toFixed(1)}</small>
          <small>{contourRange.maxExx.toFixed(1)}</small>
        </div>
      </div>
    </div>
  )
}
