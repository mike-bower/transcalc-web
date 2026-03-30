import { useMemo, useRef, useState } from 'react'
import type { PointerEvent as ReactPointerEvent, WheelEvent as ReactWheelEvent } from 'react'
import type { TransducerType } from '../domain/orchestrator'

type Props = {
  designType: TransducerType
  params: Record<string, number>
}

const BASE_W = 420
const BASE_H = 240

function getP(params: Record<string, number>, key: string, fallback: number): number {
  const v = params[key]
  return Number.isFinite(v) && v > 0 ? v : fallback
}

function clamp(v: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, v))
}

function scale(v: number, mmPerPx = 1.5): number {
  return clamp(v / mmPerPx, 6, 260)
}

function beamAndHole(designType: TransducerType, params: Record<string, number>) {
  const width = scale(getP(params, 'beamWidth', getP(params, 'width', 25)))
  const thickness = scale(getP(params, 'thickness', 2))
  const len = scale(getP(params, 'momentArm', getP(params, 'distGages', getP(params, 'distHoles', 100))), 1.1)
  const r = scale(getP(params, 'radius', getP(params, 'holeRadius', 8)), 2.2)
  const cx = BASE_W / 2
  const cy = BASE_H / 2

  const shapes: JSX.Element[] = [
    <rect key="beam" x={cx - len / 2} y={cy - thickness / 2} width={len} height={thickness} rx={4} className="svg-part" />,
  ]

  if (designType === 'binoBeam' || designType === 'sBeam') {
    const pitch = scale(getP(params, 'distHoles', getP(params, 'distGages', 80)), 1.8) / 2
    shapes.push(
      <circle key="h1" cx={cx - pitch} cy={cy} r={r} className="svg-hole" />,
      <circle key="h2" cx={cx + pitch} cy={cy} r={r} className="svg-hole" />
    )
  }

  return shapes
}

function columnShapes(designType: TransducerType, params: Record<string, number>) {
  const cx = BASE_W / 2
  const cy = BASE_H / 2
  if (designType === 'squareColumn') {
    const w = scale(getP(params, 'width', 25), 1.2)
    const d = scale(getP(params, 'depth', 25), 1.2)
    return [<rect key="sq" x={cx - w / 2} y={cy - d / 2} width={w} height={d} className="svg-part" />]
  }
  if (designType === 'roundSolidColumn') {
    const d = scale(getP(params, 'diameter', 25), 1.2)
    return [<circle key="rd" cx={cx} cy={cy} r={d / 2} className="svg-part" />]
  }
  if (designType === 'roundHollowColumn') {
    const od = scale(getP(params, 'outerDiameter', 30), 1.2)
    const id = scale(getP(params, 'innerDiameter', 20), 1.2)
    return [
      <circle key="od" cx={cx} cy={cy} r={od / 2} className="svg-part" />,
      <circle key="id" cx={cx} cy={cy} r={id / 2} className="svg-hole" />,
    ]
  }
  return []
}

function shearShapes(params: Record<string, number>) {
  const cx = BASE_W / 2
  const cy = BASE_H / 2
  const w = scale(getP(params, 'width', 30), 1.2)
  const h = scale(getP(params, 'height', 50), 1.2)
  const d = scale(getP(params, 'diameter', 30), 1.8)
  return [
    <rect key="body" x={cx - h / 2} y={cy - w / 2} width={h} height={w} className="svg-part" />,
    <circle key="hole" cx={cx} cy={cy} r={d / 2} className="svg-hole" />,
  ]
}

function torqueShapes(designType: TransducerType, params: Record<string, number>) {
  const cx = BASE_W / 2
  const cy = BASE_H / 2
  if (designType === 'squareTorque') {
    const w = scale(getP(params, 'width', 25), 1.2)
    return [<rect key="sq" x={cx - w} y={cy - w / 2} width={w * 2} height={w} className="svg-part" />]
  }
  if (designType === 'roundSolidTorque') {
    const d = scale(getP(params, 'diameter', 25), 1.2)
    return [<rect key="shaft" x={cx - d} y={cy - d / 2} width={d * 2} height={d} rx={d / 2} className="svg-part" />]
  }
  if (designType === 'roundHollowTorque') {
    const od = scale(getP(params, 'outerDiameter', 30), 1.2)
    const id = scale(getP(params, 'innerDiameter', 20), 1.2)
    return [
      <rect key="outer" x={cx - od} y={cy - od / 2} width={od * 2} height={od} rx={od / 2} className="svg-part" />,
      <rect key="inner" x={cx - id} y={cy - id / 2} width={id * 2} height={id} rx={id / 2} className="svg-hole" />,
    ]
  }
  return []
}

function pressureShapes(params: Record<string, number>) {
  const cx = BASE_W / 2
  const cy = BASE_H / 2
  const dia = scale(getP(params, 'diameter', 50), 1.6)
  const t = scale(getP(params, 'thickness', 2), 3.6)
  return [
    <ellipse key="top" cx={cx} cy={cy - t / 2} rx={dia / 2} ry={dia / 6} className="svg-part" />,
    <rect key="wall" x={cx - dia / 2} y={cy - t / 2} width={dia} height={t} className="svg-part-soft" />,
    <ellipse key="bot" cx={cx} cy={cy + t / 2} rx={dia / 2} ry={dia / 6} className="svg-part" />,
  ]
}

function buildSvg(designType: TransducerType, params: Record<string, number>): JSX.Element[] {
  if (designType === 'cantilever' || designType === 'reverseBeam' || designType === 'dualBeam' || designType === 'sBeam' || designType === 'binoBeam') {
    return beamAndHole(designType, params)
  }
  if (designType === 'squareColumn' || designType === 'roundSolidColumn' || designType === 'roundHollowColumn') {
    return columnShapes(designType, params)
  }
  if (designType === 'squareShear' || designType === 'roundShear' || designType === 'roundSBeamShear') {
    return shearShapes(params)
  }
  if (designType === 'squareTorque' || designType === 'roundSolidTorque' || designType === 'roundHollowTorque') {
    return torqueShapes(designType, params)
  }
  if (designType === 'pressure') {
    return pressureShapes(params)
  }
  return []
}

export default function TransducerSvgViewer({ designType, params }: Props) {
  const [zoom, setZoom] = useState(1)
  const [panX, setPanX] = useState(0)
  const [panY, setPanY] = useState(0)
  const dragRef = useRef<{ x: number; y: number; panX: number; panY: number } | null>(null)
  const shapes = useMemo(() => buildSvg(designType, params), [designType, params])

  const onWheel = (e: ReactWheelEvent<SVGSVGElement>) => {
    e.preventDefault()
    setZoom(z => clamp(z + (e.deltaY < 0 ? 0.08 : -0.08), 0.5, 3))
  }

  const onPointerDown = (e: ReactPointerEvent<SVGSVGElement>) => {
    dragRef.current = { x: e.clientX, y: e.clientY, panX, panY }
    ;(e.currentTarget as SVGSVGElement).setPointerCapture(e.pointerId)
  }

  const onPointerMove = (e: ReactPointerEvent<SVGSVGElement>) => {
    if (!dragRef.current) return
    const dx = e.clientX - dragRef.current.x
    const dy = e.clientY - dragRef.current.y
    setPanX(dragRef.current.panX + dx)
    setPanY(dragRef.current.panY + dy)
  }

  const onPointerUp = (e: ReactPointerEvent<SVGSVGElement>) => {
    dragRef.current = null
    ;(e.currentTarget as SVGSVGElement).releasePointerCapture(e.pointerId)
  }

  return (
    <div className="transducer-svg-wrap">
      <div className="transducer-svg-toolbar">
        <button className="export-btn" onClick={() => setZoom(z => clamp(z + 0.1, 0.5, 3))}>+</button>
        <button className="export-btn" onClick={() => setZoom(z => clamp(z - 0.1, 0.5, 3))}>-</button>
        <button className="export-btn" onClick={() => { setZoom(1); setPanX(0); setPanY(0) }}>Reset</button>
      </div>
      <svg
        className="transducer-svg-canvas"
        viewBox={`0 0 ${BASE_W} ${BASE_H}`}
        onWheel={onWheel}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
      >
        <rect x="0" y="0" width={BASE_W} height={BASE_H} className="svg-bg" />
        <g transform={`translate(${panX}, ${panY}) scale(${zoom})`} transform-origin={`${BASE_W / 2} ${BASE_H / 2}`}>
          {shapes}
        </g>
      </svg>
      <p className="strain-field-label">Interactive SVG preview: drag to pan, wheel to zoom.</p>
    </div>
  )
}
