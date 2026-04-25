import { useEffect, useMemo, useRef, useState } from 'react'
import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { createAxesGizmo } from './sceneHelpers'

/**
 * 3D parametric model viewer for the Round S-Beam Shear load cell.
 *
 * The S-beam uses the same I-section cross-section (round web opening) as
 * the round shear cantilever, but is mounted in an S-configuration:
 *   – Fixed at one end (top mounting hole)
 *   – Load applied at the opposite end (bottom mounting hole)
 * This creates an S-shaped deformation pattern, with the web at the
 * neutral axis still carrying the shear force (same analytical formula).
 */

type Props = { params: Record<string, number>; us?: boolean }

function p(params: Record<string, number>, key: string, fallback: number): number {
  const v = params[key]; return Number.isFinite(v) && v > 0 ? v : fallback
}
function clamp(v: number, lo: number, hi: number) { return Math.min(hi, Math.max(lo, v)) }

function makeTextSprite(text: string): THREE.Sprite {
  const canvas = document.createElement('canvas')
  canvas.width = 512; canvas.height = 128
  const ctx = canvas.getContext('2d')
  if (ctx) {
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    ctx.fillStyle = '#1f3f5c'; ctx.font = 'bold 32px Barlow, sans-serif'
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
    ctx.fillText(text, canvas.width / 2, canvas.height / 2)
  }
  const mat = new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(canvas), transparent: true })
  const sprite = new THREE.Sprite(mat); sprite.scale.set(0.65, 0.17, 1); return sprite
}

function addDimensionLine(
  group: THREE.Group, from: THREE.Vector3, to: THREE.Vector3,
  text: string, normal: THREE.Vector3, showTicks = true,
) {
  const mat = new THREE.LineBasicMaterial({ color: 0x3e5a73, transparent: true, opacity: 0.8 })
  group.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints([from, to]), mat))
  if (showTicks) {
    const n = normal.clone().normalize().multiplyScalar(0.03)
    group.add(
      new THREE.Line(new THREE.BufferGeometry().setFromPoints([from.clone().sub(n), from.clone().add(n)]), mat),
      new THREE.Line(new THREE.BufferGeometry().setFromPoints([to.clone().sub(n), to.clone().add(n)]), mat),
    )
  }
  const label = makeTextSprite(text)
  label.position.copy(from.clone().add(to).multiplyScalar(0.5).add(normal.clone().normalize().multiplyScalar(0.08)))
  group.add(label)
}

function RoundSBeam3D({ params, us }: { params: Record<string, number>; us?: boolean }) {
  const hostRef = useRef<HTMLDivElement | null>(null)
  const [showDimensions, setShowDimensions] = useState(true)
  const [showForces, setShowForces] = useState(true)

  const model = useMemo(() => {
    const g = new THREE.Group()
    const mmToScene = 1 / 60

    const loadN = p(params, 'load', 1000)
    const Wmm = p(params, 'width', 20)
    const Hmm = p(params, 'height', 30)
    const Dmm = Math.min(p(params, 'diameter', 20), Hmm * 0.85)
    const tmm = Math.min(p(params, 'thickness', 3), Wmm * 0.9)

    const fmt = (v: number) => us ? (v / 25.4).toFixed(3) : v.toFixed(1)
    const uLabel = us ? 'in' : 'mm'
    const forceStr = us ? `${(loadN / 4.44822).toFixed(1)} lbf` : `${loadN.toFixed(0)} N`

    const beamLen = clamp(2.5 * Hmm * mmToScene, 0.6, 3.5)
    const H = clamp(Hmm * mmToScene, 0.2, 1.2)
    const W = clamp(Wmm * mmToScene, 0.15, 1.0)
    const D = clamp(Dmm * mmToScene, 0.05, H * 0.85)
    const t = clamp(tmm * mmToScene, 0.01, W * 0.9)

    const flangeH = (H - D) / 2
    const bodyMat = new THREE.MeshStandardMaterial({ color: 0x4a88b8, roughness: 0.45, metalness: 0.1 })
    const webMat = new THREE.MeshStandardMaterial({ color: 0x3d7aaa, roughness: 0.5, metalness: 0.08 })

    // ── I-section body ────────────────────────────────────────────────────
    const topFlange = new THREE.Mesh(new THREE.BoxGeometry(beamLen, flangeH, W), bodyMat)
    topFlange.position.set(0, D / 2 + flangeH / 2, 0); g.add(topFlange)
    const botFlange = new THREE.Mesh(new THREE.BoxGeometry(beamLen, flangeH, W), bodyMat)
    botFlange.position.set(0, -(D / 2 + flangeH / 2), 0); g.add(botFlange)

    for (const sign of [-1, 1]) {
      const strip = new THREE.Mesh(new THREE.BoxGeometry(beamLen, D, t / 2), webMat)
      strip.position.set(0, 0, sign * (W / 2 - t / 4)); g.add(strip)
    }

    // Circular bore outlines
    const circMat = new THREE.LineBasicMaterial({ color: 0x1a3550, transparent: true, opacity: 0.9 })
    const circPts: THREE.Vector3[] = []
    for (let i = 0; i <= 48; i++) {
      const a = (i / 48) * Math.PI * 2
      circPts.push(new THREE.Vector3(Math.cos(a) * D / 2 * 0.85, Math.sin(a) * D / 2, 0))
    }
    for (const zSign of [-1, 1]) {
      const pts = circPts.map(pp => new THREE.Vector3(pp.x, pp.y, zSign * (W / 2 + 0.001)))
      g.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), circMat))
    }
    const discMat = new THREE.MeshBasicMaterial({ color: 0x1a2535, side: THREE.DoubleSide })
    const disc = new THREE.Mesh(new THREE.CircleGeometry(D / 2, 48), discMat)
    disc.rotation.y = Math.PI / 2; g.add(disc)

    // ── Gage pads (45°) on web outer faces ────────────────────────────────
    const isBendingNull = params['bendingNull'] === 1
    const padSize = clamp(D * 0.35, 0.03, 0.14)
    const padT = 0.006
    const tensionMat = new THREE.MeshStandardMaterial({ color: 0xf0a451, roughness: 0.5, metalness: 0.06 })
    const comprMat = new THREE.MeshStandardMaterial({ color: 0x51a4f0, roughness: 0.5, metalness: 0.06 })
    const gageGeom = new THREE.BoxGeometry(padSize, padSize, padT)
    for (const zSign of [-1, 1]) {
      const zPos = zSign * (W / 2 + padT / 2)
      const frontFace = zSign === 1
      const [matPos, matNeg] = (!isBendingNull || frontFace)
        ? [tensionMat, comprMat]
        : [comprMat, tensionMat]

      const padPos = new THREE.Mesh(gageGeom, matPos)
      padPos.position.set(0, 0, zPos); padPos.rotation.z = Math.PI / 4; g.add(padPos)
      const padNeg = new THREE.Mesh(gageGeom, matNeg)
      padNeg.position.set(0, 0, zPos); padNeg.rotation.z = -Math.PI / 4; g.add(padNeg)

      if (frontFace) {
        const lblT = makeTextSprite('T (+45°)')
        lblT.scale.set(0.30, 0.10, 1)
        lblT.position.set(padSize * 0.8, D / 2 + 0.11, zPos + 0.04); g.add(lblT)
        const lblC = makeTextSprite('C (−45°)')
        lblC.scale.set(0.30, 0.10, 1)
        lblC.position.set(-padSize * 0.8, D / 2 + 0.11, zPos + 0.04); g.add(lblC)
      }
    }

    // ── S-beam mounting: top bracket (right end), bottom bracket (left end) ──
    const bracketMat = new THREE.MeshStandardMaterial({ color: 0x3a6888, roughness: 0.55, metalness: 0.15 })
    const bW = beamLen * 0.08, bH = H * 0.7, bD = W * 1.3

    // Top mounting bracket (right end, fixed/upper)
    const topBracket = new THREE.Mesh(new THREE.BoxGeometry(bW, bH, bD), bracketMat)
    topBracket.position.set(beamLen / 2 + bW / 2, H / 4, 0); g.add(topBracket)

    // Bottom bracket (left end, load)
    const botBracket = new THREE.Mesh(new THREE.BoxGeometry(bW, bH, bD), bracketMat)
    botBracket.position.set(-beamLen / 2 - bW / 2, -H / 4, 0); g.add(botBracket)

    // Mounting holes — represented as dark circles on bracket faces
    const holeMat = new THREE.MeshBasicMaterial({ color: 0x1a2535 })
    const holeR = bH * 0.18
    for (const [xSign, yOffset] of [[1, H / 4], [-1, -H / 4]] as [number, number][]) {
      const hole = new THREE.Mesh(new THREE.CircleGeometry(holeR, 24), holeMat)
      hole.rotation.y = Math.PI / 2
      hole.position.set(xSign * (beamLen / 2 + bW + 0.001), yOffset, 0)
      g.add(hole)
    }

    // Hatch marks on brackets for wall indication
    if (showForces) {
      const hatchMat = new THREE.LineBasicMaterial({ color: 0x1a2535, transparent: true, opacity: 0.6 })
      const topBracketX = beamLen / 2 + bW + 0.003
      for (let i = -1; i <= 1; i++) {
        const hz = i * bD * 0.25
        g.add(new THREE.Line(
          new THREE.BufferGeometry().setFromPoints([
            new THREE.Vector3(topBracketX, H / 4 - bH / 2 + 0.02, hz - 0.04),
            new THREE.Vector3(topBracketX, H / 4 + bH / 2 - 0.02, hz + 0.04),
          ]), hatchMat,
        ))
      }
    }

    // ── Load arrow (upward at bottom bracket) ─────────────────────────────
    const arrowLen = clamp(0.15 + Math.log10(Math.max(loadN, 1)) * 0.07, 0.15, 0.40)
    if (showForces) {
      g.add(new THREE.ArrowHelper(
        new THREE.Vector3(0, 1, 0),
        new THREE.Vector3(-beamLen / 2, -H / 2 - arrowLen, 0),
        arrowLen, 0xe05530,
        Math.min(0.11, arrowLen * 0.30), Math.min(0.08, arrowLen * 0.22),
      ))
    }

    // ── Dimension lines ────────────────────────────────────────────────────
    const dim = new THREE.Group()
    addDimensionLine(dim,
      new THREE.Vector3(beamLen / 2 + bW + 0.22, -H / 2, 0),
      new THREE.Vector3(beamLen / 2 + bW + 0.22, H / 2, 0),
      `H=${fmt(Hmm)} ${uLabel}`, new THREE.Vector3(1, 0, 0),
    )
    addDimensionLine(dim,
      new THREE.Vector3(0, H / 2 + 0.12, -W / 2),
      new THREE.Vector3(0, H / 2 + 0.12, W / 2),
      `W=${fmt(Wmm)} ${uLabel}`, new THREE.Vector3(0, 1, 0),
    )
    addDimensionLine(dim,
      new THREE.Vector3(beamLen / 2 + bW + 0.32, -D / 2, 0),
      new THREE.Vector3(beamLen / 2 + bW + 0.32, D / 2, 0),
      `⌀${fmt(Dmm)} ${uLabel}`, new THREE.Vector3(1, 0, 0),
    )
    const fLabel = makeTextSprite(forceStr)
    fLabel.position.set(-beamLen / 2, -H / 2 - arrowLen - 0.12, 0); dim.add(fLabel)
    dim.visible = showDimensions; g.add(dim)
    return g
  }, [params, us, showDimensions, showForces])

  useEffect(() => {
    if (!hostRef.current) return
    const host = hostRef.current
    const scene = new THREE.Scene(); scene.background = new THREE.Color(0xffffff)
    const camera = new THREE.PerspectiveCamera(45, host.clientWidth / Math.max(1, host.clientHeight), 0.1, 100)
    camera.position.set(2.0, 1.2, 2.8)
    const renderer = new THREE.WebGLRenderer({ antialias: true })
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    renderer.setSize(host.clientWidth, host.clientHeight); host.appendChild(renderer.domElement)
    const controls = new OrbitControls(camera, renderer.domElement)
    controls.enableDamping = true; controls.dampingFactor = 0.08
    controls.target.set(0, 0, 0); controls.update()
    const gizmo = createAxesGizmo(renderer, host)
    scene.add(new THREE.AmbientLight(0xffffff, 0.75))
    const dl = new THREE.DirectionalLight(0xffffff, 1.0); dl.position.set(4, 5, 3); scene.add(dl)
    scene.add(new THREE.GridHelper(6, 14, 0xcccccc, 0xeeeeee))
    const root = new THREE.Group(); scene.add(root); root.add(model)
    let raf = 0
    const animate = () => { raf = requestAnimationFrame(animate); controls.update(); renderer.render(scene, camera); gizmo.render(camera) }
    animate()
    const ro = new ResizeObserver(() => {
      const w = host.clientWidth, h = host.clientHeight
      if (w === 0 || h === 0) return
      renderer.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix()
    })
    ro.observe(host)
    return () => {
      cancelAnimationFrame(raf); ro.disconnect(); controls.dispose(); renderer.dispose(); gizmo.dispose()
      if (host.contains(renderer.domElement)) host.removeChild(renderer.domElement)
    }
  }, [model])

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%', minHeight: '0', overflow: 'hidden' }}>
      <div ref={hostRef} className="transducer-3d-canvas" style={{ height: '100%', border: 'none', background: 'transparent' }} />
      <div style={{
        position: 'absolute', top: '10px', right: '10px', zIndex: 10,
        backgroundColor: 'rgba(30,41,59,0.7)', padding: '4px 8px', borderRadius: '4px',
        fontSize: '11px', display: 'flex', alignItems: 'center', gap: '6px',
        border: '1px solid rgba(71,85,105,0.5)', color: '#f8fafc', pointerEvents: 'auto',
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

export default function RoundSBeamShearModelPreview({ params, us }: Props) {
  return (
    <div className="transducer-svg-wrap" style={{ height: '400px' }}>
      <RoundSBeam3D params={params} us={us} />
    </div>
  )
}
