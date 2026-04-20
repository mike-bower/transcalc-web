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

export default function RoundShearDiagram({ load, width, height, diameter, thickness, unitSystem }: Props) {
  const lu = unitSystem === 'SI' ? 'mm' : 'in'
  const fu = unitSystem === 'SI' ? 'N' : 'lbf'

  const W = 500, H = 210
  const dc = '#44556a'
  const gc = '#c03030'
  const bc = '#dce8f5'
  const bs = '#3a4a6b'

  // round section — circular cross-section shown as circle
  const sectionR = clamp((Number.isFinite(height) ? height : 30) * 2.5, 40, 90)
  const secCx = W / 2
  const secCy = H / 2

  // web hole radius
  const dRatio = (Number.isFinite(diameter) && Number.isFinite(height) && height > 0)
    ? diameter / height : 0.55
  const rPx = clamp(dRatio * sectionR * 0.85, 6, sectionR * 0.55)

  const gageLen = clamp(rPx * 0.75, 8, 20)

  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" style={{ display: 'block' }} aria-hidden="true">

      {/* Shear load arrows */}
      <line x1={secCx - sectionR - 4} y1={secCy + 22} x2={secCx - sectionR - 4} y2={secCy - 16}
        stroke={gc} strokeWidth={2} />
      <polygon points={`${secCx - sectionR - 4},${secCy - 18} ${secCx - sectionR - 9},${secCy - 6} ${secCx - sectionR + 1},${secCy - 6}`}
        fill={gc} />
      <text x={secCx - sectionR - 18} y={secCy + 26} fontSize={9} fill={gc} fontWeight="600">{fv(load, 0)}</text>
      <text x={secCx - sectionR - 18} y={secCy + 36} fontSize={9} fill={gc}>{fu}</text>

      <line x1={secCx + sectionR + 4} y1={secCy - 22} x2={secCx + sectionR + 4} y2={secCy + 16}
        stroke={gc} strokeWidth={2} />
      <polygon points={`${secCx + sectionR + 4},${secCy + 18} ${secCx + sectionR - 1},${secCy + 6} ${secCx + sectionR + 9},${secCy + 6}`}
        fill={gc} />

      {/* Round section body */}
      <circle cx={secCx} cy={secCy} r={sectionR} fill={bc} stroke={bs} strokeWidth={1.5} />

      {/* Web opening (circular hole) */}
      <circle cx={secCx} cy={secCy} r={rPx} fill="white" stroke={bs} strokeWidth={1.2} />

      {/* 45° gages */}
      <line x1={secCx - rPx * 0.85 - gageLen * 0.7} y1={secCy - rPx * 0.85 - gageLen * 0.7}
        x2={secCx - rPx * 0.85 + gageLen * 0.3} y2={secCy - rPx * 0.85 + gageLen * 0.3}
        stroke={gc} strokeWidth={3} strokeLinecap="round" opacity={0.85} />
      <text x={secCx - rPx * 0.85 - gageLen * 0.7 - 10} y={secCy - rPx * 0.85 - gageLen * 0.7 - 3}
        fontSize={9} fill={gc} fontWeight="700">A</text>

      <line x1={secCx + rPx * 0.85 - gageLen * 0.3} y1={secCy + rPx * 0.85 - gageLen * 0.3}
        x2={secCx + rPx * 0.85 + gageLen * 0.7} y2={secCy + rPx * 0.85 + gageLen * 0.7}
        stroke="#2070c0" strokeWidth={3} strokeLinecap="round" opacity={0.85} />
      <text x={secCx + rPx * 0.85 + gageLen * 0.7 + 2} y={secCy + rPx * 0.85 + gageLen * 0.7 + 4}
        fontSize={9} fill="#2070c0" fontWeight="700">B</text>

      <line x1={secCx - rPx * 0.85 - gageLen * 0.3} y1={secCy + rPx * 0.85 - gageLen * 0.3}
        x2={secCx - rPx * 0.85 + gageLen * 0.7} y2={secCy + rPx * 0.85 + gageLen * 0.7}
        stroke={gc} strokeWidth={3} strokeLinecap="round" opacity={0.85} />
      <text x={secCx - rPx * 0.85 - gageLen * 0.3 - 10} y={secCy + rPx * 0.85 + gageLen * 0.7 + 4}
        fontSize={9} fill={gc} fontWeight="700">C</text>

      <line x1={secCx + rPx * 0.85 - gageLen * 0.7} y1={secCy - rPx * 0.85 - gageLen * 0.7}
        x2={secCx + rPx * 0.85 + gageLen * 0.3} y2={secCy - rPx * 0.85 + gageLen * 0.3}
        stroke="#2070c0" strokeWidth={3} strokeLinecap="round" opacity={0.85} />
      <text x={secCx + rPx * 0.85 + gageLen * 0.3 + 2} y={secCy - rPx * 0.85 - gageLen * 0.3 - 3}
        fontSize={9} fill="#2070c0" fontWeight="700">D</text>

      {/* Section diameter annotation */}
      <line x1={secCx - sectionR} y1={secCy} x2={secCx + sectionR} y2={secCy}
        stroke={dc} strokeWidth={0.8} strokeDasharray="4,3" opacity={0.6} />
      <text x={secCx + 4} y={secCy - 4} fontSize={9} fill={dc}>⌀h={fv(height, 1)} {lu}</text>

      {/* Hole diameter */}
      <line x1={secCx} y1={secCy} x2={secCx + rPx} y2={secCy}
        stroke={dc} strokeWidth={0.8} strokeDasharray="3,2" />
      <text x={secCx + rPx + 3} y={secCy + 10} fontSize={9} fill={dc}>⌀={fv(diameter, 1)} {lu}</text>

      {/* t note */}
      <text x={secCx - sectionR - 2} y={secCy + sectionR + 14} fontSize={9} fill={dc} textAnchor="middle">
        t={fv(thickness, 1)} {lu}
      </text>

    </svg>
  )
}
