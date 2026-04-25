/**
 * Reverse bending beam — single beam, fixed block left, load block right.
 *
 * One beam clamped in both end blocks. Load P applied downward on the right
 * block, producing an S-shaped moment diagram with zero moment at midspan.
 *
 *   Gage A — top face, left of centre  (tension)   orange
 *   Gage B — bottom face, left         (compression) blue
 *   Gage C — top face, right of centre (compression) blue
 *   Gage D — bottom face, right        (tension)   orange
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

export default function ReverseBeamDiagram({
  load, width, thickness, beamLength, distBetweenGages, gageLength, unitSystem, bridgeConfig,
}: Props) {
  const lu = unitSystem === 'SI' ? 'mm' : 'in'
  const fu = unitSystem === 'SI' ? 'N' : 'lbf'

  const SVG_W = 540, SVG_H = 210
  const blockW     = 40
  const leftBlockX = 40
  const rightBlockX = SVG_W - blockW - leftBlockX   // 460
  const beamLeft   = leftBlockX + blockW             // 80
  const beamRight  = rightBlockX                     // 460
  const spanPx     = beamRight - beamLeft            // 380
  const midX       = (beamLeft + beamRight) / 2

  // Beam thickness in pixels
  const tRatio = (Number.isFinite(thickness) && Number.isFinite(beamLength) && beamLength > 0)
    ? thickness / beamLength : 0.025
  const beamH = clamp(tRatio * spanPx * 1.5, 8, 40)

  const midY    = 90
  const beamTop = midY - beamH / 2
  const beamBot = midY + beamH / 2

  // Block spans the beam + padding
  const blockPad = 12
  const blockTop  = beamTop - blockPad
  const blockH    = beamH + blockPad * 2

  // Gage positions: symmetric about midspan at ±D/2
  const dRatio  = (Number.isFinite(distBetweenGages) && Number.isFinite(beamLength) && beamLength > 0)
    ? distBetweenGages / beamLength : 0.4
  const dHalfPx = clamp(dRatio * spanPx / 2, 14, spanPx * 0.44)
  const gageLeftX  = midX - dHalfPx
  const gageRightX = midX + dHalfPx

  const gRatio  = (Number.isFinite(gageLength) && Number.isFinite(beamLength) && beamLength > 0)
    ? gageLength / beamLength : 0.04
  const gagePx  = clamp(gRatio * spanPx, 4, dHalfPx * 0.6)

  const dc    = '#44556a'
  const tColL = '#c04010'   // A — top left, tension
  const cColL = '#2060b0'   // B — bottom left, compression
  const cColR = '#2060b0'   // C — top right, compression
  const tColR = '#c04010'   // D — bottom right, tension

  const active = getActiveGages(bridgeConfig ?? 'fullBridgeTopBot')

  const HDim = ({ x1, x2, y, label }: { x1: number; x2: number; y: number; label: string }) => (
    <g>
      <line x1={x1} y1={y - 4} x2={x1} y2={y + 4} stroke={dc} strokeWidth={1.2}/>
      <line x1={x2} y1={y - 4} x2={x2} y2={y + 4} stroke={dc} strokeWidth={1.2}/>
      <line x1={x1} y1={y}     x2={x2} y2={y}     stroke={dc} strokeWidth={1}/>
      <text x={(x1 + x2) / 2} y={y + 13} textAnchor="middle" fontSize={11} fill={dc}>{label}</text>
    </g>
  )

  const VDim = ({ x, y1, y2, label }: { x: number; y1: number; y2: number; label: string }) => (
    <g>
      <line x1={x - 4} y1={y1} x2={x + 4} y2={y1} stroke={dc} strokeWidth={1.2}/>
      <line x1={x - 4} y1={y2} x2={x + 4} y2={y2} stroke={dc} strokeWidth={1.2}/>
      <line x1={x}     y1={y1} x2={x}     y2={y2} stroke={dc} strokeWidth={1}/>
      <text x={x + 7} y={(y1 + y2) / 2 + 4} fontSize={10} fill={dc}>{label}</text>
    </g>
  )

  const loadX = rightBlockX + blockW / 2

  return (
    <svg viewBox={`0 0 ${SVG_W} ${SVG_H}`} width="100%" style={{ display: 'block' }} aria-hidden="true">
      <defs>
        <pattern id="rvHatch" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
          <line x1="0" y1="0" x2="0" y2="6" stroke="#8899aa" strokeWidth="1.5" />
        </pattern>
      </defs>

      {/* Left fixed block */}
      <rect x={leftBlockX} y={blockTop} width={blockW} height={blockH}
        fill="url(#rvHatch)" stroke="#3a4a6b" strokeWidth={1.5} rx={1}/>
      <text x={leftBlockX + blockW / 2} y={blockTop - 7}
        textAnchor="middle" fontSize={9} fill={dc} fontWeight="600">Fixed</text>

      {/* Right load block */}
      <rect x={rightBlockX} y={blockTop} width={blockW} height={blockH}
        fill="#dce8f5" stroke="#3a4a6b" strokeWidth={1.5} rx={1}/>

      {/* Single beam */}
      <rect x={beamLeft} y={beamTop} width={spanPx} height={beamH}
        fill="#dce8f5" stroke="#3a4a6b" strokeWidth={1.5} rx={1}/>

      {/* w label inside beam */}
      {beamH >= 14 && (
        <text x={midX} y={midY + 4} textAnchor="middle" fontSize={9} fill="#5a6278" fontStyle="italic">
          w = {fv(width, 1)} {lu}
        </text>
      )}

      {/* Zero-moment centreline at midspan */}
      <line x1={midX} y1={blockTop - 4} x2={midX} y2={beamBot + 4}
        stroke="#888" strokeWidth={0.9} strokeDasharray="4,3" opacity={0.6}/>
      <text x={midX + 4} y={blockTop - 6} fontSize={8} fill="#888" fontStyle="italic">M=0</text>

      {/* Gage CL dashed verticals */}
      <line x1={gageLeftX}  y1={beamTop - 14} x2={gageLeftX}  y2={beamBot + 14}
        stroke={dc} strokeWidth={0.7} strokeDasharray="3,3" opacity={0.5}/>
      <line x1={gageRightX} y1={beamTop - 14} x2={gageRightX} y2={beamBot + 14}
        stroke={dc} strokeWidth={0.7} strokeDasharray="3,3" opacity={0.5}/>

      {/* Gage A — top left, tension */}
      {active.includes('A') && <>
        <rect x={gageLeftX - gagePx / 2} y={beamTop - 5} width={gagePx} height={4}
          rx={1} fill={tColL} opacity={0.85}/>
        <text x={gageLeftX} y={beamTop - 8} textAnchor="middle" fontSize={9}
          fill={tColL} fontWeight="700">A</text>
      </>}

      {/* Gage B — bottom left, compression */}
      {active.includes('B') && <>
        <rect x={gageLeftX - gagePx / 2} y={beamBot + 1} width={gagePx} height={4}
          rx={1} fill={cColL} opacity={0.85}/>
        <text x={gageLeftX} y={beamBot + 16} textAnchor="middle" fontSize={9}
          fill={cColL} fontWeight="700">B</text>
      </>}

      {/* Gage C — top right, compression */}
      {active.includes('C') && <>
        <rect x={gageRightX - gagePx / 2} y={beamTop - 5} width={gagePx} height={4}
          rx={1} fill={cColR} opacity={0.85}/>
        <text x={gageRightX} y={beamTop - 8} textAnchor="middle" fontSize={9}
          fill={cColR} fontWeight="700">C</text>
      </>}

      {/* Gage D — bottom right, tension */}
      {active.includes('D') && <>
        <rect x={gageRightX - gagePx / 2} y={beamBot + 1} width={gagePx} height={4}
          rx={1} fill={tColR} opacity={0.85}/>
        <text x={gageRightX} y={beamBot + 16} textAnchor="middle" fontSize={9}
          fill={tColR} fontWeight="700">D</text>
      </>}

      {/* Load arrow P — downward at right block */}
      <line x1={loadX} y1={blockTop - 36} x2={loadX} y2={blockTop - 2}
        stroke="#c03030" strokeWidth={2.2}/>
      <polygon points={`${loadX},${blockTop} ${loadX - 5},${blockTop - 11} ${loadX + 5},${blockTop - 11}`}
        fill="#c03030"/>
      <text x={loadX - 16} y={blockTop - 22} fontSize={11} fill="#c03030" fontWeight="600">P</text>
      <text x={loadX - 12} y={blockTop - 8}  fontSize={9}  fill="#c03030">{fv(load, 0)} {fu}</text>

      {/* D dimension — gage-to-gage */}
      <line x1={gageLeftX}  y1={beamBot + 18} x2={gageLeftX}  y2={beamBot + 32} stroke={dc} strokeWidth={0.8}/>
      <line x1={gageRightX} y1={beamBot + 18} x2={gageRightX} y2={beamBot + 32} stroke={dc} strokeWidth={0.8}/>
      <HDim x1={gageLeftX} x2={gageRightX} y={beamBot + 30}
        label={`D = ${fv(distBetweenGages, 1)} ${lu}`}/>

      {/* L dimension — full span */}
      <line x1={beamLeft}  y1={beamBot + 46} x2={beamLeft}  y2={beamBot + 60} stroke={dc} strokeWidth={0.8}/>
      <line x1={beamRight} y1={beamBot + 46} x2={beamRight} y2={beamBot + 60} stroke={dc} strokeWidth={0.8}/>
      <HDim x1={beamLeft} x2={beamRight} y={beamBot + 58}
        label={`L = ${fv(beamLength, 1)} ${lu}`}/>

      {/* t dimension */}
      <line x1={rightBlockX + blockW + 4} y1={beamTop} x2={rightBlockX + blockW + 28} y2={beamTop}
        stroke={dc} strokeWidth={0.8}/>
      <line x1={rightBlockX + blockW + 4} y1={beamBot} x2={rightBlockX + blockW + 28} y2={beamBot}
        stroke={dc} strokeWidth={0.8}/>
      <VDim x={rightBlockX + blockW + 26} y1={beamTop} y2={beamBot}
        label={`t=${fv(thickness, 1)} ${lu}`}/>
    </svg>
  )
}
