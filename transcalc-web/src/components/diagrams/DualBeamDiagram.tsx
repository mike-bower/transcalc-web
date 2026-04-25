const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v))
const fv = (v: number, d = 1) => (Number.isFinite(v) && v > 0 ? v.toFixed(d) : '?')

type Props = {
  load: number
  width: number
  thickness: number
  distBetweenGages: number
  gageLength: number
  unitSystem: 'SI' | 'US'
}

export default function DualBeamDiagram({ load, width, thickness, distBetweenGages, gageLength, unitSystem }: Props) {
  const lu = unitSystem === 'SI' ? 'mm' : 'in'
  const fu = unitSystem === 'SI' ? 'N' : 'lbf'

  const W = 520, H = 280

  // End block geometry
  const blockW = 38
  const leftBlockX = 40
  const rightBlockX = 418

  // Beam extent between block faces
  const beamLeft = leftBlockX + blockW
  const beamRight = rightBlockX
  const spanPx = beamRight - beamLeft  // 340 px

  // Beam thickness in pixels
  const tRatio = (Number.isFinite(thickness) && Number.isFinite(distBetweenGages) && distBetweenGages > 0)
    ? thickness / distBetweenGages : 0.05
  const tPx = clamp(tRatio * spanPx * 0.7, 6, 32)

  // Vertical positions: two beams separated by beamSep px (center to center)
  const beamSep = Math.max(tPx * 3.2, 60)
  const midY = 130
  const upperCY = midY - beamSep / 2
  const lowerCY = midY + beamSep / 2

  const upperTop = upperCY - tPx / 2
  const upperBot = upperCY + tPx / 2
  const lowerTop = lowerCY - tPx / 2
  const lowerBot = lowerCY + tPx / 2

  // End blocks span both beams with padding
  const blockPad = 10
  const blockTop = upperTop - blockPad
  const blockBot = lowerBot + blockPad
  const blockH = blockBot - blockTop

  // Gage size and positions (near each block face)
  const gRatio = (Number.isFinite(gageLength) && Number.isFinite(distBetweenGages) && distBetweenGages > 0)
    ? gageLength / distBetweenGages : 0.08
  const gPx = clamp(gRatio * spanPx * 0.75, 5, 56)
  const gInset = spanPx * 0.12
  const leftGageCX = beamLeft + gInset
  const rightGageCX = beamRight - gInset

  const dc = '#44556a'
  const tCol = '#c03030'  // tension — red
  const cCol = '#2070c0'  // compression — blue

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

  const loadX = rightBlockX + blockW / 2

  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" style={{ display: 'block' }} aria-hidden="true">
      <defs>
        <pattern id="dbHatch" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
          <line x1="0" y1="0" x2="0" y2="6" stroke="#8899aa" strokeWidth="1.5" />
        </pattern>
      </defs>

      {/* ── Left fixed block ── */}
      <rect x={leftBlockX} y={blockTop} width={blockW} height={blockH}
        fill="url(#dbHatch)" stroke="#3a4a6b" strokeWidth={1.5} rx={1} />
      <text x={leftBlockX + blockW / 2} y={blockTop - 7}
        textAnchor="middle" fontSize={9} fill={dc} fontWeight="600">Fixed</text>

      {/* ── Right load block ── */}
      <rect x={rightBlockX} y={blockTop} width={blockW} height={blockH}
        fill="#dce8f5" stroke="#3a4a6b" strokeWidth={1.5} rx={1} />

      {/* ── Upper beam ── */}
      <rect x={beamLeft} y={upperTop} width={spanPx} height={tPx}
        fill="#dce8f5" stroke="#3a4a6b" strokeWidth={1.5} rx={1} />

      {/* ── Lower beam ── */}
      <rect x={beamLeft} y={lowerTop} width={spanPx} height={tPx}
        fill="#dce8f5" stroke="#3a4a6b" strokeWidth={1.5} rx={1} />

      {/* ── Gage A: top of upper beam, left — TENSION ── */}
      <rect x={leftGageCX - gPx / 2} y={upperTop - 5} width={gPx} height={5}
        rx={1} fill={tCol} opacity={0.85} />
      <text x={leftGageCX} y={upperTop - 8}
        textAnchor="middle" fontSize={9} fill={tCol} fontWeight="700">A</text>

      {/* ── Gage B: bottom of lower beam, left — COMPRESSION ── */}
      <rect x={leftGageCX - gPx / 2} y={lowerBot} width={gPx} height={5}
        rx={1} fill={cCol} opacity={0.85} />
      <text x={leftGageCX} y={lowerBot + 15}
        textAnchor="middle" fontSize={9} fill={cCol} fontWeight="700">B</text>

      {/* ── Gage C: top of upper beam, right — COMPRESSION ── */}
      <rect x={rightGageCX - gPx / 2} y={upperTop - 5} width={gPx} height={5}
        rx={1} fill={cCol} opacity={0.85} />
      <text x={rightGageCX} y={upperTop - 8}
        textAnchor="middle" fontSize={9} fill={cCol} fontWeight="700">C</text>

      {/* ── Gage D: bottom of lower beam, right — TENSION ── */}
      <rect x={rightGageCX - gPx / 2} y={lowerBot} width={gPx} height={5}
        rx={1} fill={tCol} opacity={0.85} />
      <text x={rightGageCX} y={lowerBot + 15}
        textAnchor="middle" fontSize={9} fill={tCol} fontWeight="700">D</text>

      {/* ── Load arrow at top of right block, pointing down ── */}
      <line x1={loadX} y1={blockTop - 38} x2={loadX} y2={blockTop - 2}
        stroke="#dc2626" strokeWidth={2.5} />
      <polygon
        points={`${loadX},${blockTop} ${loadX - 6},${blockTop - 14} ${loadX + 6},${blockTop - 14}`}
        fill="#dc2626" />
      <text x={loadX} y={blockTop - 42}
        textAnchor="middle" fontSize={11} fill="#dc2626" fontWeight="600">P</text>
      <text x={loadX + 30} y={blockTop - 26}
        fontSize={9} fill="#dc2626">{fv(load, 0)} {fu}</text>

      {/* ── w label inside upper beam ── */}
      {tPx >= 13 && (
        <text x={(beamLeft + beamRight) / 2} y={upperCY + 4}
          textAnchor="middle" fontSize={9} fill="#5a6278" fontStyle="italic">
          w = {fv(width, 1)} {lu}
        </text>
      )}

      {/* ── D dimension: block face to block face ── */}
      <line x1={beamLeft} y1={lowerBot + 18} x2={beamLeft} y2={lowerBot + 34} stroke={dc} strokeWidth={0.8} />
      <line x1={beamRight} y1={lowerBot + 18} x2={beamRight} y2={lowerBot + 34} stroke={dc} strokeWidth={0.8} />
      <HDim x1={beamLeft} x2={beamRight} y={lowerBot + 32}
        label={`D = ${fv(distBetweenGages, 1)} ${lu}`} />

      {/* ── t dimension: beam thickness ── */}
      <line x1={rightBlockX + blockW + 4} y1={upperTop} x2={rightBlockX + blockW + 32} y2={upperTop}
        stroke={dc} strokeWidth={0.8} />
      <line x1={rightBlockX + blockW + 4} y1={upperBot} x2={rightBlockX + blockW + 32} y2={upperBot}
        stroke={dc} strokeWidth={0.8} />
      <VDim x={rightBlockX + blockW + 30} y1={upperTop} y2={upperBot}
        label={`t=${fv(thickness, 1)} ${lu}`} />
    </svg>
  )
}
