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

/**
 * S-Beam face-view diagram.
 *
 * The beam body is taller than wide (portrait). Two circular holes are bored
 * through the beam width (Z direction) and appear as circles in this view:
 *   - Upper hole: offset toward the RIGHT face (thin neck T on the right)
 *   - Lower hole: offset toward the LEFT face  (thin neck T on the left)
 *
 * Gages are placed on the flat face at ±45° angular positions around each hole,
 * on the thin-neck side — where the S-arm bending produces maximum principal strain:
 *   A (tension/red)     upper hole, upper-right  (+45° from neck direction)
 *   B (compress/blue)   upper hole, lower-right  (−45° from neck direction)
 *   C (compress/blue)   lower hole, upper-left   (+45° from neck direction)
 *   D (tension/red)     lower hole, lower-left   (−45° from neck direction)
 */
export default function SBeamDiagram({ load, holeRadius, width, thickness, distBetweenGages, unitSystem }: Props) {
  const lu = unitSystem === 'SI' ? 'mm' : 'in'
  const fu = unitSystem === 'SI' ? 'N' : 'lbf'

  // ── canvas ────────────────────────────────────────────────────────────────
  const svgW = 440, svgH = 340
  const blockW = 110
  const blockLeft = 130

  // scale to fit block width = beam width
  const sc = clamp(blockW / Math.max(width, 1), 1.5, 14)

  // geometry in pixels
  const R = clamp(holeRadius * sc, 5, blockW * 0.4)
  const T = clamp(thickness  * sc, 3, blockW * 0.45)
  const D = clamp(distBetweenGages * sc, R * 2.4, 160)

  // body height: hole separation + top/bottom arm sections
  const blockH = clamp(D + 2 * (T + R), 130, 240)
  const blockTop = (svgH - blockH) / 2

  // hole centres (Y): symmetrically around body mid
  const midY = blockTop + blockH / 2
  const uy = midY - D / 2   // upper hole Y
  const ly = midY + D / 2   // lower hole Y

  // hole centres (X): upper → right, lower → left (S-shape offset)
  const ux = blockLeft + blockW - T - R  // upper: thin right neck = T
  const lx = blockLeft + T + R           // lower: thin left neck  = T

  // ±45° gage positions on each hole (on the thin-neck side)
  const s45 = Math.SQRT1_2   // sin(45°) = cos(45°) = 0.7071

  // Upper hole gages (right-side neck → gages at right ±45°)
  const agx = ux + R * s45;  const agy = uy - R * s45   // A: upper-right (1:30)
  const bgx = ux + R * s45;  const bgy = uy + R * s45   // B: lower-right (4:30)

  // Lower hole gages (left-side neck → gages at left ±45°)
  const cgx = lx - R * s45;  const cgy = ly - R * s45   // C: upper-left  (10:30)
  const dgx = lx - R * s45;  const dgy = ly + R * s45   // D: lower-left  (7:30)

  const tenC = '#c03030'
  const cmpC = '#2070c0'
  const dim  = '#44556a'
  const bodyF = '#c5d9ee'
  const bodyS = '#3a4a6b'

  // gage pad: small rotated rectangle representing a ±45° gage
  const gL = clamp(R * 0.7, 6, 22)  // gage rect long side
  const gW = 4                        // gage rect short side
  const Gage = ({ cx, cy, angle, col, label, lx: labelX, ly: labelY }:
    { cx: number; cy: number; angle: number; col: string; label: string; lx: number; ly: number }) => (
    <g>
      <rect
        x={cx - gL / 2} y={cy - gW / 2} width={gL} height={gW} rx={1}
        fill={col} opacity={0.9}
        transform={`rotate(${angle} ${cx} ${cy})`}
      />
      <text x={labelX} y={labelY} fontSize={10} fill={col} fontWeight="700" textAnchor="middle">{label}</text>
    </g>
  )

  const arrowL = 28
  const topTip   = blockTop - 8
  const botTip   = blockTop + blockH + 8
  const cx = blockLeft + blockW / 2

  return (
    <svg viewBox={`0 0 ${svgW} ${svgH}`} width="100%" style={{ display: 'block' }} aria-hidden="true">

      {/* ── load arrow — downward at top ── */}
      <line x1={cx} y1={topTip - arrowL} x2={cx} y2={topTip} stroke={tenC} strokeWidth={2} />
      <polygon points={`${cx},${topTip} ${cx - 5},${topTip - 11} ${cx + 5},${topTip - 11}`} fill={tenC} />
      <text x={cx + 8} y={topTip - arrowL + 10} fontSize={10} fill={tenC} fontWeight="600">
        {fv(load, 0)} {fu}
      </text>

      {/* ── reaction arrow — upward at bottom ── */}
      <line x1={cx} y1={botTip} x2={cx} y2={botTip + arrowL} stroke={tenC} strokeWidth={2} />
      <polygon points={`${cx},${botTip} ${cx - 5},${botTip + 11} ${cx + 5},${botTip + 11}`} fill={tenC} />

      {/* ── beam body ── */}
      <rect x={blockLeft} y={blockTop} width={blockW} height={blockH}
        fill={bodyF} stroke={bodyS} strokeWidth={1.5} rx={2} />

      {/* ── upper hole (right-offset) ── */}
      <circle cx={ux} cy={uy} r={R} fill="white" stroke={bodyS} strokeWidth={1.2} />

      {/* ── lower hole (left-offset) ── */}
      <circle cx={lx} cy={ly} r={R} fill="white" stroke={bodyS} strokeWidth={1.2} />

      {/* ── thin-neck emphasis lines ── */}
      <line x1={ux + R} y1={uy - R * 0.55} x2={blockLeft + blockW} y2={uy - R * 0.55}
        stroke={bodyS} strokeWidth={0.6} strokeDasharray="3,2" opacity={0.45} />
      <line x1={ux + R} y1={uy + R * 0.55} x2={blockLeft + blockW} y2={uy + R * 0.55}
        stroke={bodyS} strokeWidth={0.6} strokeDasharray="3,2" opacity={0.45} />
      <line x1={blockLeft} y1={ly - R * 0.55} x2={lx - R} y2={ly - R * 0.55}
        stroke={bodyS} strokeWidth={0.6} strokeDasharray="3,2" opacity={0.45} />
      <line x1={blockLeft} y1={ly + R * 0.55} x2={lx - R} y2={ly + R * 0.55}
        stroke={bodyS} strokeWidth={0.6} strokeDasharray="3,2" opacity={0.45} />

      {/* ── gages at ±45° on each hole (thin-neck side) ── */}
      {/* A: upper hole, upper-right (+45°) — tension */}
      <Gage cx={agx} cy={agy} angle={-45} col={tenC} label="A"
        lx={agx + 16} ly={agy - 6} />
      {/* B: upper hole, lower-right (−45°) — compression */}
      <Gage cx={bgx} cy={bgy} angle={45} col={cmpC} label="B"
        lx={bgx + 16} ly={bgy + 12} />
      {/* C: lower hole, upper-left (+45°) — compression */}
      <Gage cx={cgx} cy={cgy} angle={45} col={cmpC} label="C"
        lx={cgx - 16} ly={cgy - 6} />
      {/* D: lower hole, lower-left (−45°) — tension */}
      <Gage cx={dgx} cy={dgy} angle={-45} col={tenC} label="D"
        lx={dgx - 16} ly={dgy + 12} />

      {/* ── radius dimension ── */}
      <line x1={ux} y1={uy} x2={ux + R} y2={uy} stroke={dim} strokeWidth={0.9} strokeDasharray="3,2" />
      <text x={ux + R / 2} y={uy - 4} fontSize={9} fill={dim} textAnchor="middle">
        R={fv(holeRadius, 1)} {lu}
      </text>

      {/* ── thin-neck T dimension (right of upper hole) ── */}
      {T > 6 && (
        <>
          <line x1={ux + R} y1={uy + R + 8} x2={blockLeft + blockW} y2={uy + R + 8}
            stroke={dim} strokeWidth={1} />
          <line x1={ux + R}          y1={uy + R + 5} x2={ux + R}          y2={uy + R + 11} stroke={dim} strokeWidth={1} />
          <line x1={blockLeft + blockW} y1={uy + R + 5} x2={blockLeft + blockW} y2={uy + R + 11} stroke={dim} strokeWidth={1} />
          <text x={(ux + R + blockLeft + blockW) / 2} y={uy + R + 19} fontSize={9} fill={dim} textAnchor="middle">
            t={fv(thickness, 1)} {lu}
          </text>
        </>
      )}

      {/* ── beam width W ── */}
      <line x1={blockLeft} y1={blockTop - 10} x2={blockLeft + blockW} y2={blockTop - 10} stroke={dim} strokeWidth={1} />
      <line x1={blockLeft}          y1={blockTop - 13} x2={blockLeft}          y2={blockTop - 7} stroke={dim} strokeWidth={1} />
      <line x1={blockLeft + blockW} y1={blockTop - 13} x2={blockLeft + blockW} y2={blockTop - 7} stroke={dim} strokeWidth={1} />
      <text x={blockLeft + blockW / 2} y={blockTop - 14} fontSize={9} fill={dim} textAnchor="middle">
        W={fv(width, 1)} {lu}
      </text>

      {/* ── hole-centre separation D ── */}
      <line x1={blockLeft - 22} y1={uy} x2={blockLeft - 22} y2={ly} stroke={dim} strokeWidth={1} />
      <line x1={blockLeft - 25} y1={uy} x2={blockLeft - 19} y2={uy} stroke={dim} strokeWidth={1} />
      <line x1={blockLeft - 25} y1={ly} x2={blockLeft - 19} y2={ly} stroke={dim} strokeWidth={1} />
      <text x={blockLeft - 34} y={(uy + ly) / 2 + 4}  fontSize={9} fill={dim} textAnchor="middle">D</text>
      <text x={blockLeft - 34} y={(uy + ly) / 2 + 14} fontSize={8} fill={dim} textAnchor="middle">
        {fv(distBetweenGages, 1)}
      </text>

      {/* ── legend ── */}
      <rect x={blockLeft + blockW + 28} y={blockTop + 8}  width={9} height={4} rx={1} fill={tenC} />
      <text x={blockLeft + blockW + 41} y={blockTop + 13} fontSize={9} fill={tenC}>tension (+)</text>
      <rect x={blockLeft + blockW + 28} y={blockTop + 22} width={9} height={4} rx={1} fill={cmpC} />
      <text x={blockLeft + blockW + 41} y={blockTop + 27} fontSize={9} fill={cmpC}>compress (−)</text>

    </svg>
  )
}
