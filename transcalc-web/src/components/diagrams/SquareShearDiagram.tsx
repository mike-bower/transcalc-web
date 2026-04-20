const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v))
const fv = (v: number, d = 1) => (Number.isFinite(v) && v > 0 ? v.toFixed(d) : '?')

type Props = {
  load: number
  width: number
  height: number
  diameter: number
  thickness: number
  unitSystem: 'SI' | 'US'
}

export default function SquareShearDiagram({ load, width, height, diameter, thickness, unitSystem }: Props) {
  const lu = unitSystem === 'SI' ? 'mm' : 'in'
  const fu = unitSystem === 'SI' ? 'N' : 'lbf'

  const W = 500, H = 210
  const dc = '#44556a'
  const gc = '#c03030'
  const bc = '#dce8f5'
  const bs = '#3a4a6b'

  // web section centred
  const webH = clamp((Number.isFinite(height) ? height : 30) / (Number.isFinite(width) && width > 0 ? width : 20) * 60, 60, 140)
  const webW = clamp((Number.isFinite(width) ? width : 20) * 3.5, 60, 140)
  const secX = (W - webW) / 2
  const secY = (H - webH) / 2
  const secBot = secY + webH
  const midX = W / 2
  const midY = H / 2

  // hole radius in pixels
  const dRatio = (Number.isFinite(diameter) && Number.isFinite(height) && height > 0)
    ? diameter / height : 0.5
  const rPx = clamp(dRatio * webH / 2, 6, webH * 0.38)

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

  // 45° gage marks in web area
  const gageLen = clamp(rPx * 0.8, 8, 22)

  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" style={{ display: 'block' }} aria-hidden="true">

      {/* Shear load arrows — left side down, right side up */}
      {/* Left: upward force */}
      <line x1={secX - 4} y1={midY + 24} x2={secX - 4} y2={midY - 18} stroke={gc} strokeWidth={2} />
      <polygon points={`${secX - 4},${midY - 20} ${secX - 9},${midY - 8} ${secX + 1},${midY - 8}`} fill={gc} />
      <text x={secX - 16} y={midY + 28} fontSize={9} fill={gc} fontWeight="600">{fv(load, 0)}</text>
      <text x={secX - 16} y={midY + 38} fontSize={9} fill={gc}>{fu}</text>

      {/* Right: downward force */}
      <line x1={secX + webW + 4} y1={midY - 24} x2={secX + webW + 4} y2={midY + 18} stroke={gc} strokeWidth={2} />
      <polygon points={`${secX + webW + 4},${midY + 20} ${secX + webW - 1},${midY + 8} ${secX + webW + 9},${midY + 8}`} fill={gc} />

      {/* Web section */}
      <rect x={secX} y={secY} width={webW} height={webH}
        fill={bc} stroke={bs} strokeWidth={1.5} rx={2} />

      {/* Circular hole */}
      <circle cx={midX} cy={midY} r={rPx} fill="white" stroke={bs} strokeWidth={1.2} />

      {/* Gage A — 45° upper-left */}
      <line x1={midX - rPx * 0.85 - gageLen * 0.7} y1={midY - rPx * 0.85 - gageLen * 0.7}
        x2={midX - rPx * 0.85 + gageLen * 0.3} y2={midY - rPx * 0.85 + gageLen * 0.3}
        stroke={gc} strokeWidth={3} strokeLinecap="round" opacity={0.85} />
      <text x={midX - rPx * 0.85 - gageLen * 0.7 - 12} y={midY - rPx * 0.85 - gageLen * 0.7 - 3}
        fontSize={9} fill={gc} fontWeight="700">A</text>

      {/* Gage B — 45° lower-right */}
      <line x1={midX + rPx * 0.85 - gageLen * 0.3} y1={midY + rPx * 0.85 - gageLen * 0.3}
        x2={midX + rPx * 0.85 + gageLen * 0.7} y2={midY + rPx * 0.85 + gageLen * 0.7}
        stroke="#2070c0" strokeWidth={3} strokeLinecap="round" opacity={0.85} />
      <text x={midX + rPx * 0.85 + gageLen * 0.7 + 2} y={midY + rPx * 0.85 + gageLen * 0.7 + 4}
        fontSize={9} fill="#2070c0" fontWeight="700">B</text>

      {/* Gage C — 45° lower-left */}
      <line x1={midX - rPx * 0.85 - gageLen * 0.3} y1={midY + rPx * 0.85 - gageLen * 0.3}
        x2={midX - rPx * 0.85 + gageLen * 0.7} y2={midY + rPx * 0.85 + gageLen * 0.7}
        stroke={gc} strokeWidth={3} strokeLinecap="round" opacity={0.85} />
      <text x={midX - rPx * 0.85 - gageLen * 0.3 - 12} y={midY + rPx * 0.85 + gageLen * 0.7 + 4}
        fontSize={9} fill={gc} fontWeight="700">C</text>

      {/* Gage D — 45° upper-right */}
      <line x1={midX + rPx * 0.85 - gageLen * 0.7} y1={midY - rPx * 0.85 - gageLen * 0.7}
        x2={midX + rPx * 0.85 + gageLen * 0.3} y2={midY - rPx * 0.85 + gageLen * 0.3}
        stroke="#2070c0" strokeWidth={3} strokeLinecap="round" opacity={0.85} />
      <text x={midX + rPx * 0.85 + gageLen * 0.3 + 2} y={midY - rPx * 0.85 - gageLen * 0.3 - 3}
        fontSize={9} fill="#2070c0" fontWeight="700">D</text>

      {/* Hole diameter */}
      <line x1={midX} y1={midY} x2={midX + rPx} y2={midY}
        stroke={dc} strokeWidth={0.9} strokeDasharray="3,2" />
      <text x={midX + rPx + 3} y={midY - 3} fontSize={9} fill={dc}>⌀={fv(diameter, 1)} {lu}</text>

      {/* h dimension */}
      <line x1={secX + webW + 4} y1={secY} x2={secX + webW + 32} y2={secY} stroke={dc} strokeWidth={0.8} />
      <line x1={secX + webW + 4} y1={secBot} x2={secX + webW + 32} y2={secBot} stroke={dc} strokeWidth={0.8} />
      <VDim x={secX + webW + 30} y1={secY} y2={secBot} label={`h=${fv(height, 1)} ${lu}`} />

      {/* w dimension */}
      <line x1={secX} y1={secY - 14} x2={secX} y2={secY - 28} stroke={dc} strokeWidth={0.8} />
      <line x1={secX + webW} y1={secY - 14} x2={secX + webW} y2={secY - 28} stroke={dc} strokeWidth={0.8} />
      <HDim x1={secX} x2={secX + webW} y={secY - 25} label={`w=${fv(width, 1)} ${lu}`} />

      {/* t note */}
      <text x={secX + webW + 4} y={secY + 12} fontSize={9} fill={dc}>t={fv(thickness, 1)} {lu}</text>

    </svg>
  )
}
