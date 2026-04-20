const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v))
const fv = (v: number, d = 1) => (Number.isFinite(v) && v > 0 ? v.toFixed(d) : '?')

type Props = {
  load: number
  outerDiameter: number
  innerDiameter: number
  length: number
  unitSystem: 'SI' | 'US'
}

export default function RoundHollowColumnDiagram({ load, outerDiameter, innerDiameter, length, unitSystem }: Props) {
  const lu = unitSystem === 'SI' ? 'mm' : 'in'
  const fu = unitSystem === 'SI' ? 'N' : 'lbf'

  const W = 500, H = 220
  const dc = '#44556a'
  const gc = '#c03030'
  const bc = '#dce8f5'
  const bs = '#3a4a6b'

  const aspect = (Number.isFinite(length) && Number.isFinite(outerDiameter) && outerDiameter > 0)
    ? length / outerDiameter : 5
  const colW = 70
  const colH = clamp(aspect * colW * 0.20, 80, 160)

  const colX = (W - colW) / 2
  const colY = 30
  const colBot = colY + colH
  const midX = W / 2
  const rx = colW / 2
  const ry = Math.min(rx * 0.3, 12)

  // inner radius fraction
  const wallFrac = (Number.isFinite(innerDiameter) && Number.isFinite(outerDiameter) && outerDiameter > 0 && innerDiameter < outerDiameter)
    ? innerDiameter / outerDiameter : 0.6
  const innerRx = rx * wallFrac
  const innerRy = ry * wallFrac

  const VDim = ({ x, y1, y2, label }: { x: number; y1: number; y2: number; label: string }) => (
    <g>
      <line x1={x - 4} y1={y1} x2={x + 4} y2={y1} stroke={dc} strokeWidth={1.2} />
      <line x1={x - 4} y1={y2} x2={x + 4} y2={y2} stroke={dc} strokeWidth={1.2} />
      <line x1={x} y1={y1} x2={x} y2={y2} stroke={dc} strokeWidth={1} />
      <text x={x + 7} y={(y1 + y2) / 2 + 4} fontSize={10} fill={dc}>{label}</text>
    </g>
  )

  const gageY = colY + colH / 2
  const gagePx = clamp(colW * 0.35, 6, 24)

  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" style={{ display: 'block' }} aria-hidden="true">

      {/* Load arrow */}
      <line x1={midX} y1={colY - 36} x2={midX} y2={colY - 2} stroke={gc} strokeWidth={2.2} />
      <polygon points={`${midX},${colY} ${midX - 5},${colY - 12} ${midX + 5},${colY - 12}`} fill={gc} />
      <text x={midX + 9} y={colY - 20} fontSize={11} fill={gc} fontWeight="600">P</text>
      <text x={midX + 9} y={colY - 6} fontSize={9} fill={gc}>{fv(load, 0)} {fu}</text>

      {/* Outer column body */}
      <rect x={colX} y={colY} width={colW} height={colH} fill={bc} stroke={bs} strokeWidth={1.5} />

      {/* Inner hollow — two vertical stripes */}
      <rect x={midX - innerRx} y={colY + ry + 2} width={innerRx * 2} height={colH - ry * 2 - 4}
        fill="white" stroke="none" />

      {/* Top ellipse (outer) */}
      <ellipse cx={midX} cy={colY} rx={rx} ry={ry}
        fill="#e8f2fb" stroke={bs} strokeWidth={1.2} />
      {/* Top ellipse (inner bore) */}
      <ellipse cx={midX} cy={colY} rx={innerRx} ry={innerRy}
        fill="#c0d0e0" stroke={bs} strokeWidth={1} />

      {/* Bottom ellipse (outer) */}
      <ellipse cx={midX} cy={colBot} rx={rx} ry={ry}
        fill="#c8d8ea" stroke={bs} strokeWidth={1.2} />
      {/* Bottom ellipse (inner bore) */}
      <ellipse cx={midX} cy={colBot} rx={innerRx} ry={innerRy}
        fill="#a8b8c8" stroke={bs} strokeWidth={1} />

      {/* Base plate */}
      <rect x={colX - colW * 0.3} y={colBot + ry - 1} width={colW * 1.6} height={colH * 0.05}
        fill="#7a8fa0" stroke={bs} strokeWidth={1} rx={1} />
      {Array.from({ length: 6 }, (_, i) => (
        <line key={i}
          x1={colX - colW * 0.3 + i * (colW * 0.28)} y1={colBot + ry + colH * 0.05 + 1}
          x2={colX - colW * 0.3 + i * (colW * 0.28) - 8} y2={colBot + ry + colH * 0.05 + 9}
          stroke={dc} strokeWidth={0.8} />
      ))}

      {/* Gage A — axial, left face */}
      <rect x={colX - 5} y={gageY - gagePx / 2} width={5} height={gagePx} rx={1} fill={gc} opacity={0.85} />
      <text x={colX - 14} y={gageY - gagePx / 2 - 3} fontSize={9} fill={gc} fontWeight="700">A</text>

      {/* Gage B — transverse */}
      <rect x={midX - gagePx / 2} y={colY - 5} width={gagePx} height={5} rx={1} fill="#2070c0" opacity={0.85} />
      <text x={midX + gagePx / 2 + 3} y={colY + 2} fontSize={9} fill="#2070c0" fontWeight="700">B</text>

      {/* Centerline */}
      <line x1={midX} y1={colY + 8} x2={midX} y2={colBot - 8}
        stroke={dc} strokeWidth={0.8} strokeDasharray="6,4" opacity={0.5} />

      {/* Outer diameter arrow */}
      <line x1={colX - 4} y1={gageY} x2={colX + colW + 4} y2={gageY}
        stroke={dc} strokeWidth={0.8} strokeDasharray="3,2" />
      <text x={midX} y={gageY - 5} textAnchor="middle" fontSize={9} fill={dc}>
        ⌀o {fv(outerDiameter, 1)} / ⌀i {fv(innerDiameter, 1)} {lu}
      </text>

      {/* Height dimension */}
      <line x1={colX - 4} y1={colY} x2={colX - 32} y2={colY} stroke={dc} strokeWidth={0.8} />
      <line x1={colX - 4} y1={colBot} x2={colX - 32} y2={colBot} stroke={dc} strokeWidth={0.8} />
      <VDim x={colX - 30} y1={colY} y2={colBot} label={`L=${fv(length, 0)} ${lu}`} />

    </svg>
  )
}
