const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v))
const fv = (v: number, d = 1) => (Number.isFinite(v) && v > 0 ? v.toFixed(d) : '?')

type Props = {
  load: number
  holeRadius: number
  width: number
  thickness: number
  distBetweenGages: number
  unitSystem: 'SI' | 'US'
}

export default function SBeamDiagram({ load, holeRadius, width, thickness, distBetweenGages, unitSystem }: Props) {
  const lu = unitSystem === 'SI' ? 'mm' : 'in'
  const fu = unitSystem === 'SI' ? 'N' : 'lbf'

  const W = 500, H = 220
  const dc = '#44556a'
  const gc = '#c03030'
  const gc2 = '#2070c0'
  const bc = '#dce8f5'
  const bs = '#3a4a6b'

  // beam block centred in canvas
  const blockX = 160
  const blockY = 20
  const blockW = 180

  // proportional height based on distBetweenGages vs thickness
  const ratio = (Number.isFinite(distBetweenGages) && Number.isFinite(thickness) && thickness > 0)
    ? distBetweenGages / thickness : 2.5
  const blockH = clamp(ratio * 40, 80, 160)

  const midX = blockX + blockW / 2
  const blockBot = blockY + blockH

  // hole radius in pixels
  const rRatio = (Number.isFinite(holeRadius) && Number.isFinite(width) && width > 0)
    ? holeRadius / width : 0.15
  const rPx = clamp(rRatio * blockW * 0.8, 6, blockW * 0.3)

  // upper hole — offset right
  const holeOffX = blockW * 0.12
  const hole1Cx = midX + holeOffX
  const hole1Cy = blockY + blockH * 0.3

  // lower hole — offset left
  const hole2Cx = midX - holeOffX
  const hole2Cy = blockY + blockH * 0.7

  // gage markers at neck regions
  const gagePx = clamp(rPx * 0.6, 4, 20)

  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" style={{ display: 'block' }} aria-hidden="true">

      {/* Load arrow (upward at top) */}
      <line x1={midX} y1={blockY - 38} x2={midX} y2={blockY - 2} stroke={gc} strokeWidth={2.2} />
      <polygon points={`${midX},${blockY} ${midX - 5},${blockY - 12} ${midX + 5},${blockY - 12}`} fill={gc} />
      <text x={midX + 9} y={blockY - 20} fontSize={11} fill={gc} fontWeight="600">P</text>
      <text x={midX + 9} y={blockY - 6} fontSize={9} fill={gc}>{fv(load, 0)} {fu}</text>

      {/* Reaction arrow (downward at bottom) */}
      <line x1={midX} y1={blockBot + 2} x2={midX} y2={blockBot + 36} stroke={gc} strokeWidth={2.2} />
      <polygon points={`${midX},${blockBot + 38} ${midX - 5},${blockBot + 26} ${midX + 5},${blockBot + 26}`} fill={gc} />

      {/* Beam block (clip for holes) */}
      <defs>
        <clipPath id="sbeam-clip">
          <rect x={blockX} y={blockY} width={blockW} height={blockH} />
        </clipPath>
      </defs>
      <rect x={blockX} y={blockY} width={blockW} height={blockH}
        fill={bc} stroke={bs} strokeWidth={1.5} rx={2} />

      {/* Upper hole */}
      <circle cx={hole1Cx} cy={hole1Cy} r={rPx}
        fill="white" stroke={bs} strokeWidth={1.2} />

      {/* Lower hole */}
      <circle cx={hole2Cx} cy={hole2Cy} r={rPx}
        fill="white" stroke={bs} strokeWidth={1.2} />

      {/* Gage A — above upper hole (tension neck) */}
      <rect x={hole1Cx - gagePx / 2} y={blockY + 2} width={gagePx} height={4} rx={1} fill={gc} opacity={0.85} />
      <text x={hole1Cx - gagePx / 2 - 10} y={blockY + 10} fontSize={9} fill={gc} fontWeight="700">A</text>

      {/* Gage B — below upper hole (compression neck) */}
      <rect x={hole1Cx - gagePx / 2} y={hole1Cy + rPx + 2} width={gagePx} height={4} rx={1} fill={gc2} opacity={0.85} />
      <text x={hole1Cx - gagePx / 2 - 10} y={hole1Cy + rPx + 10} fontSize={9} fill={gc2} fontWeight="700">B</text>

      {/* Gage C — above lower hole */}
      <rect x={hole2Cx - gagePx / 2} y={hole2Cy - rPx - 6} width={gagePx} height={4} rx={1} fill={gc2} opacity={0.85} />
      <text x={hole2Cx - gagePx / 2 - 10} y={hole2Cy - rPx + 2} fontSize={9} fill={gc2} fontWeight="700">C</text>

      {/* Gage D — below lower hole */}
      <rect x={hole2Cx - gagePx / 2} y={blockBot - 6} width={gagePx} height={4} rx={1} fill={gc} opacity={0.85} />
      <text x={hole2Cx - gagePx / 2 - 10} y={blockBot - 6} fontSize={9} fill={gc} fontWeight="700">D</text>

      {/* Dimension: R (hole radius) */}
      <line x1={hole1Cx} y1={hole1Cy} x2={hole1Cx + rPx} y2={hole1Cy} stroke={dc} strokeWidth={0.9} strokeDasharray="3,2" />
      <text x={hole1Cx + rPx + 4} y={hole1Cy + 4} fontSize={9} fill={dc}>R={fv(holeRadius, 1)} {lu}</text>

      {/* Dimension: D between gages */}
      <line x1={blockX - 16} y1={blockY + blockH * 0.3} x2={blockX - 16} y2={blockY + blockH * 0.7}
        stroke={dc} strokeWidth={1} />
      <line x1={blockX - 20} y1={blockY + blockH * 0.3} x2={blockX - 12} y2={blockY + blockH * 0.3}
        stroke={dc} strokeWidth={1.2} />
      <line x1={blockX - 20} y1={blockY + blockH * 0.7} x2={blockX - 12} y2={blockY + blockH * 0.7}
        stroke={dc} strokeWidth={1.2} />
      <text x={blockX - 40} y={(blockY + blockH * 0.5) + 4} fontSize={9} fill={dc} textAnchor="middle">
        D={fv(distBetweenGages, 1)}
      </text>
      <text x={blockX - 40} y={(blockY + blockH * 0.5) + 14} fontSize={9} fill={dc} textAnchor="middle">
        {lu}
      </text>

      {/* Dimension: width (into page note) */}
      <text x={blockX + blockW + 8} y={blockY + blockH / 2} fontSize={9} fill={dc}>
        t={fv(thickness, 1)} {lu}
      </text>

    </svg>
  )
}
