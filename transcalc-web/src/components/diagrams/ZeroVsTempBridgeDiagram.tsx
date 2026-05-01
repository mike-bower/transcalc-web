/**
 * Wheatstone bridge diagram for Zero vs Temperature compensation.
 *
 * All four arms carry active gages (A–D). The computed compensation arm
 * is highlighted in amber with the series compensation resistor (Rc) shown
 * inline within that arm.
 *
 * 'plus-s-minus'  → arm1 (S+→P−, lower-left)
 * 'minus-s-minus' → arm2 (P−→S−, lower-right)
 */

type Props = {
  bridgeArm: 'minus-s-minus' | 'plus-s-minus' | null
  resistance: number | null
}

const gageC  = '#4a88b8'   // inactive arms
const compC  = '#c07020'   // highlighted arm + comp resistor
const dc     = '#3a4a6b'   // labels / dimension lines
const redW   = '#cc1a1a'
const blackW = '#1a1a1a'
const greenW = '#1a7a3a'
const whiteW = '#888888'

const GAGE_LABELS = ['A', 'B', 'C', 'D']

function ArmWithGage({
  x1, y1, x2, y2, label, color, compR,
}: {
  x1: number; y1: number; x2: number; y2: number
  label: string; color: string; compR?: string
}) {
  const dx = x2 - x1, dy = y2 - y1
  const len = Math.sqrt(dx * dx + dy * dy)
  const ux = dx / len, uy = dy / len
  const angle = Math.atan2(dy, dx) * 180 / Math.PI
  const rw = 26, rh = 9

  if (!compR) {
    // Standard arm: gage at midpoint
    const mx = (x1 + x2) / 2, my = (y1 + y2) / 2
    const lx1 = mx - ux * rw / 2, ly1 = my - uy * rw / 2
    const lx2 = mx + ux * rw / 2, ly2 = my + uy * rw / 2
    return (
      <g>
        <line x1={x1} y1={y1} x2={lx1} y2={ly1} stroke={color} strokeWidth={2} />
        <rect x={mx - rw / 2} y={my - rh / 2} width={rw} height={rh}
          fill="white" stroke={color} strokeWidth={2} rx={1.5}
          transform={`rotate(${angle}, ${mx}, ${my})`} />
        <text x={mx} y={my + 4} textAnchor="middle" fontSize={8}
          fill={color} fontWeight="700"
          transform={`rotate(${angle}, ${mx}, ${my})`}>
          {label}
        </text>
        <line x1={lx2} y1={ly2} x2={x2} y2={y2} stroke={color} strokeWidth={2} />
      </g>
    )
  }

  // Compensation arm: gage at 33%, Rc at 66%
  const crw = 20, crh = 9
  const gPos = len * 0.33
  const cPos = len * 0.67

  const gx = x1 + ux * gPos, gy = y1 + uy * gPos
  const rx = x1 + ux * cPos, ry = y1 + uy * cPos

  const gl1x = gx - ux * rw / 2, gl1y = gy - uy * rw / 2
  const gl2x = gx + ux * rw / 2, gl2y = gy + uy * rw / 2
  const rl1x = rx - ux * crw / 2, rl1y = ry - uy * crw / 2
  const rl2x = rx + ux * crw / 2, rl2y = ry + uy * crw / 2

  return (
    <g>
      <line x1={x1} y1={y1} x2={gl1x} y2={gl1y} stroke={color} strokeWidth={2.2} />
      <rect x={gx - rw / 2} y={gy - rh / 2} width={rw} height={rh}
        fill="white" stroke={color} strokeWidth={2} rx={1.5}
        transform={`rotate(${angle}, ${gx}, ${gy})`} />
      <text x={gx} y={gy + 4} textAnchor="middle" fontSize={8}
        fill={color} fontWeight="700"
        transform={`rotate(${angle}, ${gx}, ${gy})`}>
        {label}
      </text>
      <line x1={gl2x} y1={gl2y} x2={rl1x} y2={rl1y} stroke={color} strokeWidth={2.2} />
      <rect x={rx - crw / 2} y={ry - crh / 2} width={crw} height={crh}
        fill="#fff8e4" stroke={color} strokeWidth={2} rx={1.5}
        transform={`rotate(${angle}, ${rx}, ${ry})`} />
      <text x={rx} y={ry + 4} textAnchor="middle" fontSize={7.5}
        fill={color} fontWeight="700"
        transform={`rotate(${angle}, ${rx}, ${ry})`}>
        Rc
      </text>
      <line x1={rl2x} y1={rl2y} x2={x2} y2={y2} stroke={color} strokeWidth={2.2} />
    </g>
  )
}

function BridgeNode({
  x, y, fill, label, colorName, anchor, dx, dy, cdy,
}: {
  x: number; y: number; fill: string; label: string; colorName: string
  anchor: 'middle' | 'start' | 'end'; dx: number; dy: number; cdy: number
}) {
  const isGrey = fill === whiteW
  return (
    <g>
      <circle cx={x} cy={y} r={8}
        fill={isGrey ? '#f4f4f4' : fill}
        stroke={isGrey ? '#aaa' : fill}
        strokeWidth={isGrey ? 1.5 : 0} />
      <text x={x + dx} y={y + dy}  textAnchor={anchor} fontSize={11} fontWeight="700" fill={dc}>{label}</text>
      <text x={x + dx} y={y + cdy} textAnchor={anchor} fontSize={9}  fontWeight="600" fill={fill === whiteW ? '#888' : fill}>{colorName}</text>
    </g>
  )
}

export default function ZeroVsTempBridgeDiagram({ bridgeArm, resistance }: Props) {
  const W = 480, H = 310
  const cx = 240, cy = 140, r = 100

  const top    = { x: cx,     y: cy - r }   // P+
  const left   = { x: cx - r, y: cy     }   // S+
  const bottom = { x: cx,     y: cy + r }   // P−
  const right  = { x: cx + r, y: cy     }   // S−

  // arm0: top→left (P+→S+)
  // arm1: left→bottom (S+→P−)  ← 'plus-s-minus'
  // arm2: bottom→right (P−→S−) ← 'minus-s-minus'
  // arm3: right→top (S−→P+)
  const edges = [
    [top, left], [left, bottom], [bottom, right], [right, top],
  ] as const

  const compArmIdx = bridgeArm === 'plus-s-minus' ? 1 : bridgeArm === 'minus-s-minus' ? 2 : -1

  // Label positions outside diamond at each arm midpoint
  const LABEL_POS = [
    { x: 155, y: 70,  y2: 82,  anchor: 'end'   as const },
    { x: 155, y: 218, y2: 230, anchor: 'end'   as const },
    { x: 325, y: 218, y2: 230, anchor: 'start' as const },
    { x: 325, y: 70,  y2: 82,  anchor: 'start' as const },
  ]

  const compLabel = compArmIdx === 1 ? '+S / −  arm' : compArmIdx === 2 ? '−S / −  arm' : null
  const resStr = resistance != null && resistance > 0 ? `Rc = ${resistance.toFixed(3)} Ω` : null

  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" style={{ display: 'block' }} aria-hidden="true">

      {/* Arms */}
      {edges.map(([p1, p2], i) => {
        const isComp = i === compArmIdx
        const col = isComp ? compC : gageC
        return (
          <ArmWithGage
            key={i}
            x1={p1.x} y1={p1.y} x2={p2.x} y2={p2.y}
            label={GAGE_LABELS[i]}
            color={col}
            compR={isComp && resStr ? resStr : undefined}
          />
        )
      })}

      {/* Nodes */}
      <BridgeNode x={top.x}    y={top.y}
        fill={redW}   label="P+" colorName="Red"
        anchor="middle" dx={0}   dy={-20} cdy={-9} />
      <BridgeNode x={left.x}   y={left.y}
        fill={greenW} label="S+" colorName="Green"
        anchor="end"    dx={-14} dy={4}   cdy={15} />
      <BridgeNode x={bottom.x} y={bottom.y}
        fill={blackW} label="P−" colorName="Black"
        anchor="middle" dx={0}   dy={21}  cdy={32} />
      <BridgeNode x={right.x}  y={right.y}
        fill={whiteW} label="S−" colorName="White"
        anchor="start"  dx={14}  dy={4}   cdy={15} />

      {/* Arm labels outside diamond */}
      {LABEL_POS.map((lp, i) => {
        const isComp = i === compArmIdx
        const col = isComp ? compC : gageC
        return (
          <g key={i}>
            <text x={lp.x} y={lp.y}  textAnchor={lp.anchor} fontSize={12} fontWeight="700" fill={col}>
              {GAGE_LABELS[i]}
            </text>
            {isComp && compLabel && (
              <text x={lp.x} y={lp.y2} textAnchor={lp.anchor} fontSize={9} fill={col} fontWeight="600">
                {compLabel}
              </text>
            )}
          </g>
        )
      })}

      {/* Footer */}
      <text x={W / 2} y={H - 12} textAnchor="middle" fontSize={9.5} fill={dc} fontStyle="italic">
        {resStr
          ? `Series compensation: ${resStr} in ${compLabel ?? '?'}`
          : 'Enter inputs above to compute compensation resistor placement'}
      </text>
    </svg>
  )
}
