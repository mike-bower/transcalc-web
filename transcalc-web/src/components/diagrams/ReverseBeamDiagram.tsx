/**
 * Parametric side-view diagram for the reverse bending beam.
 *
 * Left end: guided constraint — no rotation, free vertical translation.
 *           Force P applied downward here.
 * Right end: fully fixed (clamped wall).
 *
 * Four gages in two pairs symmetric about the midspan zero-moment point:
 *   A (top) + B (bottom) at D/2 left of centre
 *   C (top) + D (bottom) at D/2 right of centre
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

/** Right fixed wall — clamped */
function FixedWall({ x, beamTop, beamBot }: { x: number; beamTop: number; beamBot: number }) {
  const wallH = (beamBot - beamTop) * 3.5
  const wallTop = (beamTop + beamBot) / 2 - wallH / 2
  const wallW = 16
  const nHatch = 8
  return (
    <g>
      <rect x={x} y={wallTop} width={wallW} height={wallH} fill="#8899aa" stroke="#445566" strokeWidth={1.2} />
      {Array.from({ length: nHatch }, (_, i) => {
        const y = wallTop + i * (wallH / (nHatch - 1))
        return (
          <line key={i}
            x1={x + wallW} y1={y}
            x2={x + wallW + 8} y2={y + 8}
            stroke="#334455" strokeWidth={0.9} />
        )
      })}
    </g>
  )
}

/**
 * Left guided support — no rotation, vertical slide allowed.
 * Shown as two horizontal guide plates above and below the beam end, with
 * a double-headed arrow indicating the free vertical direction.
 */
function GuidedSupport({ x, beamTop, beamBot }: { x: number; beamTop: number; beamBot: number }) {
  const yCtr = (beamTop + beamBot) / 2
  const tPx  = beamBot - beamTop
  const plateH = 5
  const plateW = 20
  const gap    = 3   // clearance between plate and beam face
  const topPlateY = beamTop - gap - plateH
  const botPlateY = beamBot + gap

  return (
    <g>
      {/* top guide plate — centred on beam end face */}
      <rect x={x - plateW / 2} y={topPlateY} width={plateW} height={plateH}
        fill="#8899aa" stroke="#445566" strokeWidth={1.2} />
      {/* bottom guide plate — centred on beam end face */}
      <rect x={x - plateW / 2} y={botPlateY} width={plateW} height={plateH}
        fill="#8899aa" stroke="#445566" strokeWidth={1.2} />
      {/* vertical guide rails spanning both plates */}
      <line x1={x - plateW / 2 + 4} y1={topPlateY} x2={x - plateW / 2 + 4} y2={botPlateY + plateH} stroke="#445566" strokeWidth={1.2} />
      <line x1={x + plateW / 2 - 4} y1={topPlateY} x2={x + plateW / 2 - 4} y2={botPlateY + plateH} stroke="#445566" strokeWidth={1.2} />
      {/* double-headed arrow showing free vertical slide */}
      <line x1={x - plateW / 2 - 10} y1={yCtr - tPx * 0.55} x2={x - plateW / 2 - 10} y2={yCtr + tPx * 0.55}
        stroke="#4070a0" strokeWidth={1.5} />
      <polygon points={`${x - plateW / 2 - 10},${yCtr - tPx * 0.55} ${x - plateW / 2 - 14},${yCtr - tPx * 0.35} ${x - plateW / 2 - 6},${yCtr - tPx * 0.35}`}
        fill="#4070a0" />
      <polygon points={`${x - plateW / 2 - 10},${yCtr + tPx * 0.55} ${x - plateW / 2 - 14},${yCtr + tPx * 0.35} ${x - plateW / 2 - 6},${yCtr + tPx * 0.35}`}
        fill="#4070a0" />
    </g>
  )
}

export default function ReverseBeamDiagram({ load, width, thickness, beamLength, distBetweenGages, gageLength, unitSystem, bridgeConfig }: Props) {
  const lu = unitSystem === 'SI' ? 'mm' : 'in'
  const fu = unitSystem === 'SI' ? 'N' : 'lbf'

  // ── layout ──────────────────────────────────────────────────────────────────
  const SVG_W = 540, SVG_H = 215
  const beamXL = 62              // beam left edge (guided end)
  const beamXR = 490             // beam right edge (where fixed wall starts)
  const spanPx = beamXR - beamXL
  const yCtr   = 80              // vertical centre of beam

  const tRatio = (Number.isFinite(thickness) && Number.isFinite(beamLength) && beamLength > 0)
    ? thickness / beamLength : 0.018
  const tPx = clamp(tRatio * spanPx * 1.8, 10, 48)
  const beamTop = yCtr - tPx / 2
  const beamBot = yCtr + tPx / 2

  const dRatio = (Number.isFinite(distBetweenGages) && Number.isFinite(beamLength) && beamLength > 0)
    ? distBetweenGages / beamLength : 0.5
  const dHalfPx = clamp(dRatio * spanPx / 2, 12, spanPx * 0.42)

  const gRatio = (Number.isFinite(gageLength) && Number.isFinite(beamLength) && beamLength > 0)
    ? gageLength / beamLength : 0.04
  const gagePx = clamp(gRatio * spanPx, 4, dHalfPx * 0.6)

  const midX = (beamXL + beamXR) / 2
  const gageLeftX  = midX - dHalfPx
  const gageRightX = midX + dHalfPx

  const dc   = '#44556a'
  const topC = '#c04010'
  const botC = '#2060b0'

  const HDim = ({ x1, x2, y, label }: { x1: number; x2: number; y: number; label: string }) => (
    <g>
      <line x1={x1} y1={y - 4} x2={x1} y2={y + 4} stroke={dc} strokeWidth={1.2} />
      <line x1={x2} y1={y - 4} x2={x2} y2={y + 4} stroke={dc} strokeWidth={1.2} />
      <line x1={x1} y1={y} x2={x2} y2={y} stroke={dc} strokeWidth={1} />
      <text x={(x1 + x2) / 2} y={y + 13} textAnchor="middle" fontSize={11} fill={dc}>{label}</text>
    </g>
  )

  const VDim = ({ x, y1, y2, label }: { x: number; y1: number; y2: number; label: string }) => (
    <g>
      <line x1={x - 4} y1={y1} x2={x + 4} y2={y1} stroke={dc} strokeWidth={1.2} />
      <line x1={x - 4} y1={y2} x2={x + 4} y2={y2} stroke={dc} strokeWidth={1.2} />
      <line x1={x} y1={y1} x2={x} y2={y2} stroke={dc} strokeWidth={1} />
      <text x={x + 7} y={(y1 + y2) / 2 + 4} fontSize={10} fill={dc}>{label}</text>
    </g>
  )

  const active = getActiveGages(bridgeConfig ?? 'fullBridgeTopBot')

  const GagePair = ({ cx, topLabel, botLabel }: { cx: number; topLabel: 'A' | 'C'; botLabel: 'B' | 'D' }) => (
    <g>
      {active.includes(topLabel) && <>
        <rect x={cx - gagePx / 2} y={beamTop - 5} width={gagePx} height={4} rx={1} fill={topC} opacity={0.85} />
        <text x={cx} y={beamTop - 8} textAnchor="middle" fontSize={9} fill={topC} fontWeight="700">{topLabel}</text>
      </>}
      {active.includes(botLabel) && <>
        <rect x={cx - gagePx / 2} y={beamBot + 1} width={gagePx} height={4} rx={1} fill={botC} opacity={0.85} />
        <text x={cx} y={beamBot + 16} textAnchor="middle" fontSize={9} fill={botC} fontWeight="700">{botLabel}</text>
      </>}
    </g>
  )

  return (
    <svg viewBox={`0 0 ${SVG_W} ${SVG_H}`} width="100%" style={{ display: 'block' }} aria-hidden="true">

      {/* Beam body */}
      <rect x={beamXL} y={beamTop} width={spanPx} height={tPx}
        fill="#dce8f5" stroke="#3a4a6b" strokeWidth={1.5} rx={1} />

      {/* Left: guided support */}
      <GuidedSupport x={beamXL} beamTop={beamTop} beamBot={beamBot} />

      {/* Right: fixed wall */}
      <FixedWall x={beamXR} beamTop={beamTop} beamBot={beamBot} />

      {/* Gage pairs — only active gages shown */}
      <GagePair cx={gageLeftX}  topLabel="A" botLabel="B" />
      <GagePair cx={gageRightX} topLabel="C" botLabel="D" />

      {/* Gage CL dashed verticals */}
      <line x1={gageLeftX}  y1={beamTop - 18} x2={gageLeftX}  y2={beamBot + 22} stroke={dc} strokeWidth={0.7} strokeDasharray="3,3" opacity={0.5} />
      <line x1={gageRightX} y1={beamTop - 18} x2={gageRightX} y2={beamBot + 22} stroke={dc} strokeWidth={0.7} strokeDasharray="3,3" opacity={0.5} />

      {/* Zero-moment centreline */}
      <line x1={midX} y1={beamTop - 6} x2={midX} y2={beamBot + 6}
        stroke="#888" strokeWidth={0.8} strokeDasharray="4,4" opacity={0.6} />
      <text x={midX + 4} y={beamTop - 8} fontSize={8} fill="#888" fontStyle="italic">M=0</text>

      {/* w label inside beam */}
      {tPx >= 18 && (
        <text x={midX} y={yCtr + 4} textAnchor="middle" fontSize={9.5} fill="#5a6278" fontStyle="italic">
          w = {fv(width, 1)} {lu}
        </text>
      )}

      {/* Load arrow P — downward at left (guided) end */}
      <line x1={beamXL} y1={beamTop - 36} x2={beamXL} y2={beamTop - 2} stroke="#c03030" strokeWidth={2.2} />
      <polygon points={`${beamXL},${beamTop} ${beamXL - 5},${beamTop - 11} ${beamXL + 5},${beamTop - 11}`} fill="#c03030" />
      <text x={beamXL + 9} y={beamTop - 22} fontSize={11} fill="#c03030" fontWeight="600">P</text>
      <text x={beamXL + 9} y={beamTop - 8}  fontSize={9}  fill="#c03030">{fv(load, 0)} {fu}</text>

      {/* D dimension — gage-to-gage */}
      <line x1={gageLeftX}  y1={beamBot + 22} x2={gageLeftX}  y2={beamBot + 37} stroke={dc} strokeWidth={0.8} />
      <line x1={gageRightX} y1={beamBot + 22} x2={gageRightX} y2={beamBot + 37} stroke={dc} strokeWidth={0.8} />
      <HDim x1={gageLeftX} x2={gageRightX} y={beamBot + 35}
        label={`D = ${fv(distBetweenGages, 1)} ${lu}`} />

      {/* L dimension — full beam */}
      <line x1={beamXL} y1={beamBot + 50} x2={beamXL} y2={beamBot + 65} stroke={dc} strokeWidth={0.8} />
      <line x1={beamXR} y1={beamBot + 50} x2={beamXR} y2={beamBot + 65} stroke={dc} strokeWidth={0.8} />
      <HDim x1={beamXL} x2={beamXR} y={beamBot + 62}
        label={`L = ${fv(beamLength, 1)} ${lu}`} />

      {/* t dimension */}
      <line x1={beamXR + 4}  y1={beamTop} x2={beamXR + 32} y2={beamTop} stroke={dc} strokeWidth={0.8} />
      <line x1={beamXR + 4}  y1={beamBot} x2={beamXR + 32} y2={beamBot} stroke={dc} strokeWidth={0.8} />
      <VDim x={beamXR + 30} y1={beamTop} y2={beamBot} label={`t=${fv(thickness, 1)} ${lu}`} />

    </svg>
  )
}
