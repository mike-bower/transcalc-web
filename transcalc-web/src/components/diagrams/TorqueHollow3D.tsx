import { useEffect, useRef } from "react"
import * as THREE from "three"
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js"

interface TorqueHollow3DProps {
  outerDiameter: number;
  innerDiameter: number;
  appliedTorque: number;
  us: boolean;
}

export function TorqueHollow3D({ outerDiameter, innerDiameter, appliedTorque, us }: TorqueHollow3DProps) {
  const hostRef = useRef<HTMLDivElement | null>(null)
  
  useEffect(() => {
    if (!hostRef.current) return

    const width = hostRef.current.clientWidth || 500
    const height = 400
    
    const scene = new THREE.Scene()
    scene.background = new THREE.Color(0xffffff)

    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000)
    camera.position.set(8, 6, 8)

    const renderer = new THREE.WebGLRenderer({ 
      antialias: true, 
      alpha: true,
      powerPreference: "high-performance" 
    })
    renderer.setSize(width, height)
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    hostRef.current.appendChild(renderer.domElement)

    const controls = new OrbitControls(camera, renderer.domElement)
    controls.enableDamping = true
    controls.dampingFactor = 0.05

    const ambientLight = new THREE.AmbientLight(0xffffff, 0.7)
    scene.add(ambientLight)

    const dirLight = new THREE.DirectionalLight(0xffffff, 0.8)
    dirLight.position.set(5, 10, 7)
    scene.add(dirLight)

    const unitScale = us ? 1 : 1/25.4
    const rOut = Math.max(0.1, (outerDiameter * unitScale) || 0.5) * 0.8
    const rIn = Math.max(0.05, Math.min(rOut - 0.02, (innerDiameter * unitScale) || 0.25)) * 0.8
    const length = 5

    // Shaft Geometry
    const shape = new THREE.Shape()
    shape.absarc(0, 0, rOut, 0, Math.PI * 2, false)
    const holePath = new THREE.Path()
    holePath.absarc(0, 0, rIn, 0, Math.PI * 2, true)
    shape.holes.push(holePath)

    const shaftGeo = new THREE.ExtrudeGeometry(shape, { 
      depth: length, 
      bevelEnabled: false, 
      curveSegments: 48 
    })
    const shaftMat = new THREE.MeshStandardMaterial({ 
      color: 0x94a3b8, 
      metalness: 0.6, 
      roughness: 0.2, 
      side: THREE.DoubleSide 
    })
    const shaft = new THREE.Mesh(shaftGeo, shaftMat)
    shaft.rotation.x = -Math.PI / 2
    shaft.position.y = -length / 2
    scene.add(shaft)

    const createTorsionIndicator = (radius: number, color: number, y: number, isClockwise: boolean) => {
        const group = new THREE.Group()
        
        // Arc: 270 degrees (1.5 * PI)
        const torusGeo = new THREE.TorusGeometry(radius + 0.3, 0.03, 8, 48, Math.PI * 1.5)
        const torusMat = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.9 })
        const torus = new THREE.Mesh(torusGeo, torusMat)
        torus.rotation.x = Math.PI/2
        
        // Logic for Arc Orientation:
        // isClockwise: Start 0 (+X), End 270 front/side.
        // !isClockwise: Start 180 (-X), End 90 front/side.
        torus.rotation.y = isClockwise ? 0 : Math.PI
        group.add(torus)

        group.position.y = y
        return group
    }

    const topInd = createTorsionIndicator(rOut, 0x3b82f6, length/2 + 0.5, true)
    const botInd = createTorsionIndicator(rOut, 0xef4444, -length/2 - 0.5, false)
    scene.add(topInd, botInd)

    const lineMat = new THREE.LineBasicMaterial({ color: 0x475569, transparent: true, opacity: 0.2 })
    for (let i = 0; i < 8; i++) {
        const theta = (i / 8) * Math.PI * 2
        const pts = [
            new THREE.Vector3(Math.cos(theta) * rOut, -length/2, Math.sin(theta) * rOut),
            new THREE.Vector3(Math.cos(theta) * rOut, length/2, Math.sin(theta) * rOut)
        ]
        const lineGeo = new THREE.BufferGeometry().setFromPoints(pts)
        scene.add(new THREE.Line(lineGeo, lineMat))
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
      const w = hostRef.current.clientWidth
      renderer.setSize(w, height)
      camera.aspect = w / height
      camera.updateProjectionMatrix()
    }
    window.addEventListener("resize", handleResize)

    return () => {
      window.removeEventListener("resize", handleResize)
      cancelAnimationFrame(frameId)
      scene.traverse((object: any) => {
        if (object.geometry) object.geometry.dispose()
        if (object.material) {
          if (Array.isArray(object.material)) {
            object.material.forEach((mat: any) => mat.dispose())
          } else {
            object.material.dispose()
          }
        }
      })
      renderer.dispose()
      if (hostRef.current && renderer.domElement) {
        if (hostRef.current.contains(renderer.domElement)) {
          hostRef.current.removeChild(renderer.domElement)
        }
      }
    }
  }, [outerDiameter, innerDiameter, appliedTorque, us])

  return (
    <div className="relative w-full h-[400px] border border-slate-200 rounded-xl bg-white shadow-inner overflow-hidden">
      <div ref={hostRef} className="w-full h-full" />
      <div className="absolute top-4 left-4 pointer-events-none select-none">
        <div className="bg-white/90 px-3 py-2 rounded border shadow-sm">
           <div className="text-xs font-bold text-slate-500 uppercase">Torsion Analysis</div>
           <div className="text-lg font-mono text-blue-600 font-bold">
            {appliedTorque} {us ? "in-lb" : "N-m"}
           </div>
           <div className="text-[10px] text-slate-400 mt-1">
             OD: {outerDiameter}{us ? "\"" : "mm"} | ID: {innerDiameter}{us ? "\"" : "mm"}
           </div>
        </div>
      </div>
    </div>
  )
}