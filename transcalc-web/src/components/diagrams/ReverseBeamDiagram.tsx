/**
 * Reverse bending beam — C-frame side elevation.
 *
 * The beam is clamped inside rigid blocks at both ends. Load P is applied
 * downward at the centre of the span. The two-arm frame creates an
 * antisymmetric bending moment that peaks at both clamp faces (opposite sign)
 * and passes through zero at the midspan inflection line.
 *
 *   Gages A / C — top face of upper arm, symmetric about midspan.
 *   Gages B / D — bottom face of lower arm, symmetric about midspan.
 *   A and D are in tension; B and C are in compression (full-bridge sense).
 */

import { getActiveGages, type BridgeConfig } from '../../domain/reversebeam'

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v))
const fv = (v: number, d = 1) => (Number.isFinite(v) && v > 0 ? v.toFixed(d) : '?')

type Props = {
  load: number
  width: number
  thickness: number
  beamLength: number
  distBetweenGages: number
  gageLength: number
  unitSystem: 'SI' | 'US'
  bridgeConfig?: BridgeConfig
}

/** Fixed clamping block — hatched rectangle */
function FixedBlock({
  x, y, w, h, align,
}: { x: number; y: number; w: number; h: number; align: 'left' | 'right' }) {
  const n = 8
  return (
    <g>
      <rect x={x} y={y} width={w} height={h} fill="#8899aa" stroke="#445566" strokeWidth={1.2} />
      {Array.from({ length: n }, (_, i) => {
        const fy = y + (i + 0.5) * (h / n)
        return align === 'left'
          ? <line key={i} x1={x + w} y1={fy} x2={x + w + 10} y2={fy + 10} stroke="#334455" strokeWidth={0.9}/>
          : <line key={i} x1={x}     y1={fy} x2={x - 10}     y2={fy + 10} stroke="#334455" strokeWidth={0.9}/>
      })}
    </g>
  )
}

export default function ReverseBeamDiagram({
  load, width, thickness, beamLength, distBetweenGages, gageLength, unitSystem, bridgeConfig,
}: Props) {
  const lu = unitSystem === 'SI' ? 'mm' : 'in'
  const fu = unitSystem === 'SI' ? 'N' : 'lbf'

  // ── layout ──────────────────────────────────────────────────────────────────
  const SVG_W = 540, SVG_H = 230
  const blockW  = 54
  const beamXL  = blockW
  const beamXR  = SVG_W - blockW
  const spanPx  = beamXR - beamXL
  const midX    = (beamXL + beamXR) / 2

  const tRatio = (Number.isFinite(thickness) && Number.isFinite(beamLength) && beamLength > 0)
    ? thickness / beamLength : 0.022
  const beamH = clamp(tRatio * spanPx * 1.6, 8, 36)   // each arm height
  const gapH  = clamp(beamH * 0.55, 4, 16)             // slot between arms

  const yCtr     = 88
  const upperTop = yCtr - gapH / 2 - beamH
  const upperBot = yCtr - gapH / 2
  const lowerTop = yCtr + gapH / 2
  const lowerBot = yCtr + gapH / 2 + beamH

  const blockTop = upperTop - 18
  const blockBot = lowerBot + 18

  // Gage spacing
  const dRatio   = (Number.isFinite(distBetweenGages) && Number.isFinite(beamLength) && beamLength > 0)
    ? distBetweenGages / beamLength : 0.4
  const dHalfPx  = clamp(dRatio * spanPx / 2, 14, spanPx * 0.44)

  const gRatio   = (Number.isFinite(gageLength) && Number.isFinite(beamLength) && beamLength > 0)
    ? gageLength / beamLength : 0.04
  const gagePx   = clamp(gRatio * spanPx, 4, dHalfPx * 0.55)

  const gageLeftX  = midX - dHalfPx
  const gageRightX = midX + dHalfPx

  const dc   = '#44556a'
  const topC = '#c04010'   // A / C — top face
  const botC = '#2060b0'   // B / D — bottom face

  const active = getActiveGages(bridgeConfig ?? 'fullBridgeTopBot')

  // Horizontal dimension line helper
  const HDim = ({ x1, x2, y, label }: { x1: number; x2: number; y: number; label: string }) => (
    <g>
      <line x1={x1} y1={y - 4} x2={x1} y2={y + 4} stroke={dc} strokeWidth={1.2}/>
      <line x1={x2} y1={y - 4} x2={x2} y2={y + 4} stroke={dc} strokeWidth={1.2}/>
      <line x1={x1} y1={y}     x2={x2} y2={y}     stroke={dc} strokeWidth={1}/>
      <text x={(x1 + x2) / 2} y={y + 13} textAnchor="middle" fontSize={11} fill={dc}>{label}</text>
    </g>
  )

  // Vertical dimension line helper
  const VDim = ({ x, y1, y2, label }: { x: number; y1: number; y2: number; label: string }) => (
    <g>
      <line x1={x - 4} y1={y1} x2={x + 4} y2={y1} stroke={dc} strokeWidth={1.2}/>
      <line x1={x - 4} y1={y2} x2={x + 4} y2={y2} stroke={dc} strokeWidth={1.2}/>
      <line x1={x}     y1={y1} x2={x}     y2={y2} stroke={dc} strokeWidth={1}/>
      <text x={x + 7} y={(y1 + y2) / 2 + 4} fontSize={10} fill={dc}>{label}</text>
    </g>
  )

  // Gage pair: top face of upper arm, bottom face of lower arm
  const GagePair = ({ cx, topLabel, botLabel }: { cx: number; topLabel: 'A' | 'C'; botLabel: 'B' | 'D' }) => (
    <g>
      {active.includes(topLabel) && <>
        <rect x={cx - gagePx / 2} y={upperTop - 5} width={gagePx} height={4} rx={1} fill={topC} opacity={0.85}/>
        <text x={cx} y={upperTop - 8} textAnchor="middle" fontSize={9} fill={topC} fontWeight="700">{topLabel}</text>
      </>}
      {active.includes(botLabel) && <>
        <rect x={cx - gagePx / 2} y={lowerBot + 1} width={gagePx} height={4} rx={1} fill={botC} opacity={0.85}/>
        <text x={cx} y={lowerBot + 16} textAnchor="middle" fontSize={9} fill={botC} fontWeight="700">{botLabel}</text>
      </>}
    </g>
  )

  return (
    <svg viewBox={`0 0 ${SVG_W} ${SVG_H}`} width="100%" style={{ display: 'block' }} aria-hidden="true">

      {/* Left fixed block */}
      <FixedBlock x={0} y={blockTop} w={blockW} h={blockBot - blockTop} align="left"/>

      {/* Right fixed block */}
      <FixedBlock x={beamXR} y={blockTop} w={blockW} h={blockBot - blockTop} align="right"/>

      {/* Upper beam arm */}
      <rect x={beamXL} y={upperTop} width={spanPx} height={beamH}
        fill="#dce8f5" stroke="#3a4a6b" strokeWidth={1.5} rx={1}/>

      {/* Lower beam arm */}
      <rect x={beamXL} y={lowerTop} width={spanPx} height={beamH}
        fill="#dce8f5" stroke="#3a4a6b" strokeWidth={1.5} rx={1}/>

      {/* Slot label */}
      {gapH >= 7 && (
        <text x={beamXL + 10} y={yCtr + 4} fontSize={8} fill="#778899" fontStyle="italic">slot</text>
      )}

      {/* w label inside upper arm */}
      {beamH >= 14 && (
        <text x={midX} y={upperTop + beamH / 2 + 4} textAnchor="middle" fontSize={9} fill="#5a6278" fontStyle="italic">
          w = {fv(width, 1)} {lu}
        </text>
      )}

      {/* Zero-moment centreline at midspan */}
      <line x1={midX} y1={blockTop - 4} x2={midX} y2={blockBot + 4}
        stroke="#888" strokeWidth={0.9} strokeDasharray="4,3" opacity={0.6}/>
      <text x={midX + 4} y={blockTop - 6} fontSize={8} fill="#888" fontStyle="italic">M=0</text>

      {/* Gage CL dashed verticals */}
      <line x1={gageLeftX}  y1={upperTop - 18} x2={gageLeftX}  y2={lowerBot + 22} stroke={dc} strokeWidth={0.7} strokeDasharray="3,3" opacity={0.5}/>
      <line x1={gageRightX} y1={upperTop - 18} x2={gageRightX} y2={lowerBot + 22} stroke={dc} strokeWidth={0.7} strokeDasharray="3,3" opacity={0.5}/>

      {/* Gages */}
      <GagePair cx={gageLeftX}  topLabel="A" botLabel="B"/>
      <GagePair cx={gageRightX} topLabel="C" botLabel="D"/>

      {/* Load arrow P — downward at centre */}
      <line x1={midX} y1={blockTop - 36} x2={midX} y2={upperTop - 2}
        stroke="#c03030" strokeWidth={2.2}/>
      <polygon points={`${midX},${upperTop} ${midX - 5},${upperTop - 11} ${midX + 5},${upperTop - 11}`} fill="#c03030"/>
      <text x={midX + 9} y={blockTop - 22} fontSize={11} fill="#c03030" fontWeight="600">P</text>
      <text x={midX + 9} y={blockTop - 8}  fontSize={9}  fill="#c03030">{fv(load, 0)} {fu}</text>

      {/* D dimension — gage-to-gage */}
      <line x1={gageLeftX}  y1={lowerBot + 22} x2={gageLeftX}  y2={lowerBot + 36} stroke={dc} strokeWidth={0.8}/>
      <line x1={gageRightX} y1={lowerBot + 22} x2={gageRightX} y2={lowerBot + 36} stroke={dc} strokeWidth={0.8}/>
      <HDim x1={gageLeftX} x2={gageRightX} y={lowerBot + 34}
        label={`D = ${fv(distBetweenGages, 1)} ${lu}`}/>

      {/* L dimension — full span */}
      <line x1={beamXL} y1={lowerBot + 50} x2={beamXL} y2={lowerBot + 64} stroke={dc} strokeWidth={0.8}/>
      <line x1={beamXR} y1={lowerBot + 50} x2={beamXR} y2={lowerBot + 64} stroke={dc} strokeWidth={0.8}/>
      <HDim x1={beamXL} x2={beamXR} y={lowerBot + 62}
        label={`L = ${fv(beamLength, 1)} ${lu}`}/>

      {/* t dimension — arm thickness */}
      <line x1={beamXR + 4} y1={upperTop} x2={beamXR + 30} y2={upperTop} stroke={dc} strokeWidth={0.8}/>
      <line x1={beamXR + 4} y1={upperBot} x2={beamXR + 30} y2={upperBot} stroke={dc} strokeWidth={0.8}/>
      <VDim x={beamXR + 28} y1={upperTop} y2={upperBot}
        label={`t=${fv(thickness, 1)} ${lu}`}/>

    </svg>
  )
}
