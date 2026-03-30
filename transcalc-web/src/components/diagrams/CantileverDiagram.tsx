/**
 * Parametric side-view diagram for the cantilever bending beam.
 *
 * Fixed wall at left → beam → downward load P at free end.
 * Gage A shown on the top surface near the fixed end.
 * All dimension labels reflect current input values.
 */

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v))
const fv = (v: number, d = 1) => (Number.isFinite(v) && v > 0 ? v.toFixed(d) : '?')

type Props = {
  load: number
  width: number
  thickness: number
  momentArm: number
  gageLength: number
  unitSystem: 'SI' | 'US'
}

export default function CantileverDiagram({ load, width, thickness, momentArm, gageLength, unitSystem }: Props) {
  const lu = unitSystem === 'SI' ? 'mm' : 'in'
  const fu = unitSystem === 'SI' ? 'N' : 'lbf'

  // ── layout constants ──────────────────────────────────────────────────────
  const W = 500, H = 188
  const wallX = 2, wallW = 26
  const beamX0 = wallX + wallW       // 28
  const beamX1 = 388                  // beam free end
  const beamLen = beamX1 - beamX0   // 360
  const yMid = 82

  // Proportional thickness (bounded for readability)
  const tRatio = (Number.isFinite(thickness) && Number.isFinite(momentArm) && momentArm > 0)
    ? thickness / momentArm : 0.025
  const tPx = clamp(tRatio * beamLen * 1.6, 11, 52)
  const beamTop = yMid - tPx / 2
  const beamBot = yMid + tPx / 2

  // Gage region on top surface
  const gRatio = (Number.isFinite(gageLength) && Number.isFinite(momentArm) && momentArm > 0)
    ? gageLength / momentArm : 0.05
  const gagePx = clamp(gRatio * beamLen, 4, beamLen * 0.35)

  // colours
  const dc = '#44556a'   // dimension annotation
  const gc = '#c03030'   // gage + load
  const bc = '#dce8f5'   // beam fill
  const bs = '#3a4a6b'   // beam stroke

  // ── dimension helper: horizontal ─────────────────────────────────────────
  const HDim = ({ x1, x2, y, label }: { x1: number; x2: number; y: number; label: string }) => (
    <g>
      <line x1={x1} y1={y - 4} x2={x1} y2={y + 4} stroke={dc} strokeWidth={1.2} />
      <line x1={x2} y1={y - 4} x2={x2} y2={y + 4} stroke={dc} strokeWidth={1.2} />
      <line x1={x1} y1={y} x2={x2} y2={y} stroke={dc} strokeWidth={1} />
      <text x={(x1 + x2) / 2} y={y + 13} textAnchor="middle" fontSize={11} fill={dc}>{label}</text>
    </g>
  )

  // ── dimension helper: vertical ────────────────────────────────────────────
  const VDim = ({ x, y1, y2, label }: { x: number; y1: number; y2: number; label: string }) => (
    <g>
      <line x1={x - 4} y1={y1} x2={x + 4} y2={y1} stroke={dc} strokeWidth={1.2} />
      <line x1={x - 4} y1={y2} x2={x + 4} y2={y2} stroke={dc} strokeWidth={1.2} />
      <line x1={x} y1={y1} x2={x} y2={y2} stroke={dc} strokeWidth={1} />
      <text x={x + 7} y={(y1 + y2) / 2 + 4} fontSize={10} fill={dc}>{label}</text>
    </g>
  )

  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" style={{ display: 'block' }} aria-hidden="true">

      {/* Fixed wall */}
      <rect x={wallX} y={yMid - 62} width={wallW} height={124} fill="#b4bac8" stroke="#3a3f4a" strokeWidth={1.5} />
      {Array.from({ length: 10 }, (_, i) => (
        <line key={i}
          x1={wallX} y1={yMid - 56 + i * 11.2}
          x2={wallX + wallW} y2={yMid - 56 + i * 11.2 - 9}
          stroke="#6a7080" strokeWidth={0.8} />
      ))}

      {/* Beam body */}
      <rect x={beamX0} y={beamTop} width={beamLen} height={tPx}
        fill={bc} stroke={bs} strokeWidth={1.5} rx={1} />

      {/* Gage A — on top surface */}
      <rect x={beamX0} y={beamTop - 4} width={gagePx} height={4} rx={1} fill={gc} opacity={0.85} />
      <text x={beamX0 + gagePx / 2} y={beamTop - 7}
        textAnchor="middle" fontSize={9} fill={gc} fontWeight="700">A</text>

      {/* w label inside beam (only if tall enough) */}
      {tPx >= 18 && (
        <text x={beamX0 + beamLen * 0.55} y={yMid + 4}
          textAnchor="middle" fontSize={9.5} fill="#5a6278" fontStyle="italic">
          w = {fv(width, 1)} {lu}
        </text>
      )}

      {/* Load arrow P at free end */}
      <line x1={beamX1} y1={beamTop - 36} x2={beamX1} y2={beamTop - 2} stroke={gc} strokeWidth={2.2} />
      <polygon points={`${beamX1},${beamTop} ${beamX1 - 5},${beamTop - 12} ${beamX1 + 5},${beamTop - 12}`} fill={gc} />
      <text x={beamX1 + 9} y={beamTop - 20} fontSize={11} fill={gc} fontWeight="600">P</text>
      <text x={beamX1 + 9} y={beamTop - 6} fontSize={9} fill={gc}>{fv(load, 0)} {fu}</text>

      {/* Extension lines for L */}
      <line x1={beamX0} y1={beamBot + 5} x2={beamX0} y2={beamBot + 24} stroke={dc} strokeWidth={0.8} />
      <line x1={beamX1} y1={beamBot + 5} x2={beamX1} y2={beamBot + 24} stroke={dc} strokeWidth={0.8} />
      <HDim x1={beamX0} x2={beamX1} y={beamBot + 21} label={`L = ${fv(momentArm, 1)} ${lu}`} />

      {/* Extension lines for t */}
      <line x1={beamX1 + 4} y1={beamTop} x2={beamX1 + 36} y2={beamTop} stroke={dc} strokeWidth={0.8} />
      <line x1={beamX1 + 4} y1={beamBot} x2={beamX1 + 36} y2={beamBot} stroke={dc} strokeWidth={0.8} />
      <VDim x={beamX1 + 34} y1={beamTop} y2={beamBot} label={`t=${fv(thickness, 1)} ${lu}`} />

    </svg>
  )
}
