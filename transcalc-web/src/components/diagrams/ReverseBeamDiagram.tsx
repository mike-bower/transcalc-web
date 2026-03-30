/**
 * Parametric side-view diagram for the reverse bending beam.
 *
 * Simply-supported beam: pin left · roller right · downward load at centre.
 * Gages A and B shown on the top surface near each support.
 * All dimension labels reflect current input values.
 */

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v))
const fv = (v: number, d = 1) => (Number.isFinite(v) && v > 0 ? v.toFixed(d) : '?')

type Props = {
  load: number
  width: number
  thickness: number
  distBetweenGages: number   // span (support-to-support) [len units]
  gageLength: number
  unitSystem: 'SI' | 'US'
}

// ── support symbols ────────────────────────────────────────────────────────

function PinSupport({ x, y }: { x: number; y: number }) {
  const hw = 12, h = 13
  return (
    <g>
      <polygon points={`${x},${y} ${x - hw},${y + h} ${x + hw},${y + h}`}
        fill="#445566" stroke="#334455" strokeWidth={1} />
      <line x1={x - hw - 4} y1={y + h + 3} x2={x + hw + 4} y2={y + h + 3}
        stroke="#334455" strokeWidth={1.5} />
      {/* ground hatching */}
      {[-10, -3, 4, 11].map(dx => (
        <line key={dx}
          x1={x + dx} y1={y + h + 3}
          x2={x + dx - 6} y2={y + h + 9}
          stroke="#556677" strokeWidth={0.8} />
      ))}
    </g>
  )
}

function RollerSupport({ x, y }: { x: number; y: number }) {
  const hw = 12, h = 13
  return (
    <g>
      <polygon points={`${x},${y} ${x - hw},${y + h} ${x + hw},${y + h}`}
        fill="#445566" stroke="#334455" strokeWidth={1} />
      {[-8, 0, 8].map(dx => (
        <circle key={dx} cx={x + dx} cy={y + h + 5} r={4}
          fill="none" stroke="#334455" strokeWidth={1} />
      ))}
      <line x1={x - hw - 4} y1={y + h + 12} x2={x + hw + 4} y2={y + h + 12}
        stroke="#334455" strokeWidth={1.5} />
    </g>
  )
}

export default function ReverseBeamDiagram({ load, width, thickness, distBetweenGages, gageLength, unitSystem }: Props) {
  const lu = unitSystem === 'SI' ? 'mm' : 'in'
  const fu = unitSystem === 'SI' ? 'N' : 'lbf'

  // ── layout ─────────────────────────────────────────────────────────────────
  const W = 500, H = 200
  const supportX0 = 48              // left support x
  const supportX1 = 452             // right support x
  const spanPx = supportX1 - supportX0  // 404
  const yBeamBot = 88               // beam sits on top of supports
  const yMid = yBeamBot             // beam centred around yMid

  const tRatio = (Number.isFinite(thickness) && Number.isFinite(distBetweenGages) && distBetweenGages > 0)
    ? thickness / distBetweenGages : 0.02
  const tPx = clamp(tRatio * spanPx * 1.6, 11, 50)
  const beamTop = yMid - tPx
  const beamBot = yMid

  const gRatio = (Number.isFinite(gageLength) && Number.isFinite(distBetweenGages) && distBetweenGages > 0)
    ? gageLength / distBetweenGages : 0.05
  const gagePx = clamp(gRatio * spanPx, 4, spanPx * 0.25)

  const dc = '#44556a'
  const gc = '#c03030'

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

  const midX = (supportX0 + supportX1) / 2

  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" style={{ display: 'block' }} aria-hidden="true">

      {/* Beam body */}
      <rect x={supportX0} y={beamTop} width={spanPx} height={tPx}
        fill="#dce8f5" stroke="#3a4a6b" strokeWidth={1.5} rx={1} />

      {/* Gage A — left end, top surface */}
      <rect x={supportX0} y={beamTop - 4} width={gagePx} height={4} rx={1} fill={gc} opacity={0.85} />
      <text x={supportX0 + gagePx / 2} y={beamTop - 7}
        textAnchor="middle" fontSize={9} fill={gc} fontWeight="700">A</text>

      {/* Gage B — right end, top surface */}
      <rect x={supportX1 - gagePx} y={beamTop - 4} width={gagePx} height={4} rx={1} fill={gc} opacity={0.85} />
      <text x={supportX1 - gagePx / 2} y={beamTop - 7}
        textAnchor="middle" fontSize={9} fill={gc} fontWeight="700">B</text>

      {/* w label inside beam */}
      {tPx >= 18 && (
        <text x={midX} y={beamTop + tPx * 0.6 + 2}
          textAnchor="middle" fontSize={9.5} fill="#5a6278" fontStyle="italic">
          w = {fv(width, 1)} {lu}
        </text>
      )}

      {/* Load arrow at centre */}
      <line x1={midX} y1={beamTop - 36} x2={midX} y2={beamTop - 2} stroke={gc} strokeWidth={2.2} />
      <polygon points={`${midX},${beamTop} ${midX - 5},${beamTop - 12} ${midX + 5},${beamTop - 12}`} fill={gc} />
      <text x={midX + 9} y={beamTop - 20} fontSize={11} fill={gc} fontWeight="600">P</text>
      <text x={midX + 9} y={beamTop - 6} fontSize={9} fill={gc}>{fv(load, 0)} {fu}</text>

      {/* Supports */}
      <PinSupport x={supportX0} y={beamBot} />
      <RollerSupport x={supportX1} y={beamBot} />

      {/* D dimension (below supports) */}
      <line x1={supportX0} y1={beamBot + 30} x2={supportX0} y2={beamBot + 45} stroke={dc} strokeWidth={0.8} />
      <line x1={supportX1} y1={beamBot + 30} x2={supportX1} y2={beamBot + 45} stroke={dc} strokeWidth={0.8} />
      <HDim x1={supportX0} x2={supportX1} y={beamBot + 42}
        label={`D = ${fv(distBetweenGages, 1)} ${lu}`} />

      {/* t dimension (right of beam) */}
      <line x1={supportX1 + 4} y1={beamTop} x2={supportX1 + 36} y2={beamTop} stroke={dc} strokeWidth={0.8} />
      <line x1={supportX1 + 4} y1={beamBot} x2={supportX1 + 36} y2={beamBot} stroke={dc} strokeWidth={0.8} />
      <VDim x={supportX1 + 34} y1={beamTop} y2={beamBot} label={`t=${fv(thickness, 1)} ${lu}`} />

    </svg>
  )
}
