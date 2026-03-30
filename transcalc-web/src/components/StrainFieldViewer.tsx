/**
 * StrainFieldViewer — generic 2D canvas heatmap for a CantileverFeaSolution.
 *
 * Renders each CST element as a filled triangle coloured by the requested
 * strain component (exx, eyy, or exy).  The view is always stretched to fill
 * the canvas height so even very thin beams are readable.
 *
 * Colour scale: blue (min) → cyan → green → yellow → red (max).
 */

import { useEffect, useRef } from 'react'
import type { CantileverStrainTensorMicrostrain } from '../domain/fea/cantilever'
import type { CantileverFeaSolution } from '../domain/fea/cantileverSolver'

type StrainKey = 'exx' | 'eyy' | 'exy'

type Props = {
  solution: CantileverFeaSolution
  /** Which strain component to display */
  strainKey?: StrainKey
  /** Canvas width in px */
  width?: number
  /** Canvas height in px */
  height?: number
  /** Optional marker positions (mm from left) drawn as vertical dashed lines */
  gageMarkersMm?: number[]
  /** Optional label shown below the viewer */
  label?: string
}

// ── Colour mapping (blue → cyan → green → yellow → red) ──────────────────────

function heatColour(t: number): [number, number, number] {
  const clamp = (v: number) => Math.max(0, Math.min(255, Math.round(v)))
  const lerp = (a: number, b: number, f: number) => a + (b - a) * f

  const stops: [number, number, number][] = [
    [0,   0, 200],   // blue
    [0, 220, 255],   // cyan
    [0, 180,   0],   // green
    [255, 220, 0],   // yellow
    [220,   0,   0], // red
  ]
  const n = stops.length - 1
  const idx = Math.min(n - 1, Math.max(0, Math.floor(t * n)))
  const f = t * n - idx
  return [
    clamp(lerp(stops[idx][0], stops[idx + 1][0], f)),
    clamp(lerp(stops[idx][1], stops[idx + 1][1], f)),
    clamp(lerp(stops[idx][2], stops[idx + 1][2], f)),
  ]
}

function rgbStr(r: number, g: number, b: number) {
  return `rgb(${r},${g},${b})`
}

// ── Colourbar ─────────────────────────────────────────────────────────────────

function drawColorbar(
  ctx: CanvasRenderingContext2D,
  x: number, y: number,
  w: number, h: number,
  minVal: number, maxVal: number,
) {
  const steps = 200
  for (let i = 0; i < steps; i += 1) {
    const t = i / (steps - 1)
    const [r, g, b] = heatColour(t)
    ctx.fillStyle = rgbStr(r, g, b)
    ctx.fillRect(x + (i / steps) * w, y, w / steps + 1, h)
  }
  ctx.strokeStyle = '#888'
  ctx.lineWidth = 0.5
  ctx.strokeRect(x, y, w, h)

  ctx.fillStyle = '#333'
  ctx.font = `10px sans-serif`
  ctx.textAlign = 'left'
  ctx.fillText(`${minVal.toFixed(0)} µε`, x, y + h + 11)
  ctx.textAlign = 'right'
  ctx.fillText(`${maxVal.toFixed(0)} µε`, x + w, y + h + 11)
}

// ── Main component ─────────────────────────────────────────────────────────────

export default function StrainFieldViewer({
  solution,
  strainKey = 'exx',
  width = 500,
  height = 160,
  gageMarkersMm = [],
  label,
}: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const { nodes, elements, elementStrainsMicrostrain } = solution
    const L = solution.modelLengthMm
    // Derive thickness from node bounding box
    const yVals = nodes.map((n: { xM: number; yM: number }) => n.yM * 1000)  // mm
    const T = Math.max(...yVals) - Math.min(...yVals)  // mm
    const yMin = Math.min(...yVals)

    // Compute strain range for chosen component
    const strains = elementStrainsMicrostrain.map((s: CantileverStrainTensorMicrostrain) => s[strainKey as keyof CantileverStrainTensorMicrostrain] as number)
    const minS = Math.min(...strains)
    const maxS = Math.max(...strains)
    const range = maxS - minS || 1  // avoid div-by-zero

    // Layout constants
    const pad = { left: 8, right: 8, top: 8, bottom: 26 }  // bottom for colorbar
    const drawW = width - pad.left - pad.right
    const drawH = height - pad.top - pad.bottom

    canvas.width = width
    canvas.height = height

    ctx.clearRect(0, 0, width, height)

    // Map mesh coords → canvas px (stretched to fill drawW × drawH)
    const toX = (xMm: number) => pad.left + (xMm / L) * drawW
    const toY = (yMm: number) => pad.top + (1 - (yMm - yMin) / T) * drawH

    // Draw elements
    elements.forEach(([n1, n2, n3]: [number, number, number], eIdx: number) => {
      const s = strains[eIdx]
      const t = (s - minS) / range
      const [r, g, b] = heatColour(t)

      const p1 = nodes[n1], p2 = nodes[n2], p3 = nodes[n3]
      ctx.beginPath()
      ctx.moveTo(toX(p1.xM * 1000), toY(p1.yM * 1000))
      ctx.lineTo(toX(p2.xM * 1000), toY(p2.yM * 1000))
      ctx.lineTo(toX(p3.xM * 1000), toY(p3.yM * 1000))
      ctx.closePath()
      ctx.fillStyle = rgbStr(r, g, b)
      ctx.fill()
    })

    // Thin border around beam
    ctx.strokeStyle = '#555'
    ctx.lineWidth = 0.8
    ctx.strokeRect(pad.left, pad.top, drawW, drawH)

    // Gage marker lines
    gageMarkersMm.forEach(xMm => {
      if (xMm < 0 || xMm > L) return
      const cx = toX(xMm)
      ctx.setLineDash([3, 3])
      ctx.strokeStyle = 'rgba(0,0,0,0.65)'
      ctx.lineWidth = 1.2
      ctx.beginPath()
      ctx.moveTo(cx, pad.top)
      ctx.lineTo(cx, pad.top + drawH)
      ctx.stroke()
      ctx.setLineDash([])
    })

    // Colorbar
    drawColorbar(ctx, pad.left, pad.top + drawH + 4, drawW, 8, minS, maxS)
  }, [solution, strainKey, width, height, gageMarkersMm])

  return (
    <div className="strain-field-wrap">
      <canvas ref={canvasRef} style={{ display: 'block', width, height }} />
      {label && <p className="strain-field-label">{label}</p>}
    </div>
  )
}
