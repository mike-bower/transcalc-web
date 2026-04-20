const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v))
const fv = (v: number, d = 1) => (Number.isFinite(v) && v > 0 ? v.toFixed(d) : '?')

type Props = {
  load: number
  width: number
  depth: number
  length: number
  unitSystem: 'SI' | 'US'
}

export default function SquareColumnDiagram({ load, width, depth, length, unitSystem }: Props) {
  const lu = unitSystem === 'SI' ? 'mm' : 'in'
  const fu = unitSystem === 'SI' ? 'N' : 'lbf'

  const W = 500, H = 220
  const dc = '#44556a'
  const gc = '#c03030'
  const bc = '#dce8f5'
  const bs = '#3a4a6b'

  // column geometry — aspect from length/width
  const aspect = (Number.isFinite(length) && Number.isFinite(width) && width > 0)
    ? length / width : 4
  const colW = clamp(60 + (Number.isFinite(depth) && Number.isFinite(width) && width > 0 ? (depth / width - 1) * 10 : 0), 50, 100)
  const colH = clamp(aspect * colW * 0.22, 80, 160)

  const colX = (W - colW) / 2
  const colY = 30
  const colBot = colY + colH
  const midX = W / 2

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

  // gage pad at mid-height
  const gageY = colY + colH / 2
  const gagePx = clamp(colW * 0.4, 6, 28)

  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" style={{ display: 'block' }} aria-hidden="true">

      {/* Load arrow (downward at top) */}
      <line x1={midX} y1={colY - 36} x2={midX} y2={colY - 2} stroke={gc} strokeWidth={2.2} />
      <polygon points={`${midX},${colY} ${midX - 5},${colY - 12} ${midX + 5},${colY - 12}`} fill={gc} />
      <text x={midX + 9} y={colY - 20} fontSize={11} fill={gc} fontWeight="600">P</text>
      <text x={midX + 9} y={colY - 6} fontSize={9} fill={gc}>{fv(load, 0)} {fu}</text>

      {/* Column body */}
      <rect x={colX} y={colY} width={colW} height={colH}
        fill={bc} stroke={bs} strokeWidth={1.5} rx={2} />

      {/* Base plate */}
      <rect x={colX - colW * 0.3} y={colBot} width={colW * 1.6} height={colH * 0.06}
        fill="#7a8fa0" stroke={bs} strokeWidth={1} rx={1} />
      {/* Base hatching */}
      {Array.from({ length: 6 }, (_, i) => (
        <line key={i}
          x1={colX - colW * 0.3 + i * (colW * 0.28)} y1={colBot + colH * 0.06 + 1}
          x2={colX - colW * 0.3 + i * (colW * 0.28) - 8} y2={colBot + colH * 0.06 + 9}
          stroke={dc} strokeWidth={0.8} />
      ))}

      {/* Gage A — axial, left face at mid-height */}
      <rect x={colX - 5} y={gageY - gagePx / 2} width={5} height={gagePx} rx={1} fill={gc} opacity={0.85} />
      <text x={colX - 14} y={gageY - gagePx / 2 - 3} fontSize={9} fill={gc} fontWeight="700">A</text>

      {/* Gage B — transverse, front face at mid-height (shown as top edge marker) */}
      <rect x={midX - gagePx / 2} y={colY - 5} width={gagePx} height={5} rx={1} fill="#2070c0" opacity={0.85} />
      <text x={midX + gagePx / 2 + 3} y={colY + 2} fontSize={9} fill="#2070c0" fontWeight="700">B</text>

      {/* Centerline */}
      <line x1={midX} y1={colY + 6} x2={midX} y2={colBot - 6}
        stroke={dc} strokeWidth={0.8} strokeDasharray="6,4" opacity={0.5} />

      {/* Dimension: W */}
      <line x1={colX} y1={colBot + 14} x2={colX} y2={colBot + 28} stroke={dc} strokeWidth={0.8} />
      <line x1={colX + colW} y1={colBot + 14} x2={colX + colW} y2={colBot + 28} stroke={dc} strokeWidth={0.8} />
      <HDim x1={colX} x2={colX + colW} y={colBot + 25} label={`W=${fv(width, 1)} ${lu}`} />

      {/* Dimension: L (height) */}
      <line x1={colX - 4} y1={colY} x2={colX - 32} y2={colY} stroke={dc} strokeWidth={0.8} />
      <line x1={colX - 4} y1={colBot} x2={colX - 32} y2={colBot} stroke={dc} strokeWidth={0.8} />
      <VDim x={colX - 30} y1={colY} y2={colBot} label={`L=${fv(length, 0)} ${lu}`} />

    </svg>
  )
}
