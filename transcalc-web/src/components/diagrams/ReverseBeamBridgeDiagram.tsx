/**
 * Wheatstone bridge wiring diagram for the reverse bending beam.
 * Supports all five bridge configurations.
 *
 * Moment M(x) = P(x − L/2): negative left of midspan, positive right.
 *   A (top · left):  compression (−)    B (bot · left):  tension (+)
 *   C (top · right): tension     (+)    D (bot · right): compression (−)
 *
 * Arms are ordered clockwise from top: [P+→S+, S+→P−, P−→S−, S−→P+]
 */

import type { BridgeConfig } from '../../domain/reversebeam'

// ── Colors ───────────────────────────────────────────────────────────────────
const topC  = '#c04010'   // top-surface gages (A, C)
const botC  = '#2060b0'   // bottom-surface gages (B, D)
const transC = '#d06830'  // transverse Poisson gages (Full Bridge Top)
const resC  = '#9aaabb'   // fixed resistor arms
const dc    = '#3a4a6b'   // neutral label

const redW   = '#cc1a1a'
const blackW = '#1a1a1a'
const greenW = '#1a7a3a'
const whiteW = '#888888'

// ── Arm definition ───────────────────────────────────────────────────────────
type ArmKind = 'gage-top' | 'gage-bot' | 'gage-trans' | 'resistor'
interface ArmDef { kind: ArmKind; label: string; desc: string }

// arms[0]=P+→S+  arms[1]=S+→P−  arms[2]=P−→S−  arms[3]=S−→P+
const ARM_DEFS: Record<BridgeConfig, [ArmDef, ArmDef, ArmDef, ArmDef]> = {
  halfBridgeTop: [
    { kind: 'gage-top', label: 'A', desc: 'top · L (−)' },
    { kind: 'gage-top', label: 'C', desc: 'top · R (+)' },
    { kind: 'resistor', label: 'R', desc: '' },
    { kind: 'resistor', label: 'R', desc: '' },
  ],
  halfBridgeBottom: [
    { kind: 'resistor',  label: 'R', desc: '' },
    { kind: 'gage-bot',  label: 'D', desc: 'bot · R (−)' },
    { kind: 'gage-bot',  label: 'B', desc: 'bot · L (+)' },
    { kind: 'resistor',  label: 'R', desc: '' },
  ],
  halfBridgeTopBot: [
    { kind: 'gage-top', label: 'A', desc: 'top · L (−)' },
    { kind: 'gage-bot', label: 'B', desc: 'bot · L (+)' },
    { kind: 'resistor', label: 'R', desc: '' },
    { kind: 'resistor', label: 'R', desc: '' },
  ],
  fullBridgeTop: [
    { kind: 'gage-top',   label: 'C',  desc: 'top · R (+)' },
    { kind: 'gage-trans', label: 'C⊥', desc: 'transv · R (−ν)' },
    { kind: 'gage-trans', label: 'A⊥', desc: 'transv · L (+ν)' },
    { kind: 'gage-top',   label: 'A',  desc: 'top · L (−)' },
  ],
  fullBridgeTopBot: [
    { kind: 'gage-top', label: 'A', desc: 'top · L (−)' },
    { kind: 'gage-bot', label: 'B', desc: 'bot · L (+)' },
    { kind: 'gage-bot', label: 'D', desc: 'bot · R (−)' },
    { kind: 'gage-top', label: 'C', desc: 'top · R (+)' },
  ],
}

const FOOTER: Record<BridgeConfig, string> = {
  halfBridgeTop:    'Half bridge · output = GF·ε / 2',
  halfBridgeBottom: 'Half bridge · output = GF·ε / 2',
  halfBridgeTopBot: 'Half bridge · output = GF·ε / 2',
  fullBridgeTop:    'Full bridge top · output = GF·ε·(1+ν) / 2',
  fullBridgeTopBot: 'Full bridge · output = GF·ε',
}

function armColor(kind: ArmKind): string {
  if (kind === 'gage-top')   return topC
  if (kind === 'gage-bot')   return botC
  if (kind === 'gage-trans') return transC
  return resC
}

// ── Sub-components ───────────────────────────────────────────────────────────
type SegProps = { x1: number; y1: number; x2: number; y2: number; arm: ArmDef }

function BridgeArm({ x1, y1, x2, y2, arm }: SegProps) {
  const mx = (x1 + x2) / 2, my = (y1 + y2) / 2
  const dx = x2 - x1, dy = y2 - y1
  const len = Math.sqrt(dx * dx + dy * dy)
  const ux = dx / len, uy = dy / len
  const rw = 28, rh = 9
  const angle = Math.atan2(dy, dx) * 180 / Math.PI
  const lx1 = mx - ux * rw / 2, ly1 = my - uy * rw / 2
  const lx2 = mx + ux * rw / 2, ly2 = my + uy * rw / 2
  const col = armColor(arm.kind)
  const isRes = arm.kind === 'resistor'

  return (
    <g>
      <line x1={x1} y1={y1} x2={lx1} y2={ly1}
        stroke={col} strokeWidth={isRes ? 1.5 : 2}
        strokeDasharray={isRes ? '4,3' : undefined} />
      <rect
        x={mx - rw / 2} y={my - rh / 2}
        width={rw} height={rh}
        fill={isRes ? '#eef0f2' : 'white'}
        stroke={col} strokeWidth={isRes ? 1.5 : 2} rx={1.5}
        transform={`rotate(${angle}, ${mx}, ${my})`}
      />
      {/* Label inside the rect box */}
      <text x={mx} y={my + 4} textAnchor="middle" fontSize={isRes ? 9 : 8}
        fill={col} fontWeight="700"
        transform={`rotate(${angle}, ${mx}, ${my})`}>
        {arm.label}
      </text>
      <line x1={lx2} y1={ly2} x2={x2} y2={y2}
        stroke={col} strokeWidth={isRes ? 1.5 : 2}
        strokeDasharray={isRes ? '4,3' : undefined} />
    </g>
  )
}

type NodeProps = {
  x: number; y: number; fill: string; borderFill: string
  label: string; colorName: string
  anchor: 'middle' | 'start' | 'end'; dx: number; dy: number; cdy: number
}
function BridgeNode({ x, y, fill, borderFill, label, colorName, anchor, dx, dy, cdy }: NodeProps) {
  const isGrey = fill === whiteW
  return (
    <g>
      <circle cx={x} cy={y} r={8}
        fill={isGrey ? '#f4f4f4' : fill}
        stroke={isGrey ? '#aaa' : fill}
        strokeWidth={isGrey ? 1.5 : 0} />
      <text x={x + dx} y={y + dy}  textAnchor={anchor} fontSize={11} fontWeight="700" fill={dc}>{label}</text>
      <text x={x + dx} y={y + cdy} textAnchor={anchor} fontSize={9}  fontWeight="600" fill={borderFill}>{colorName}</text>
    </g>
  )
}

// ── Label positions for each arm (outward from diamond centre at 45°) ────────
// Diamond: cx=240 cy=145 r=100 → nodes at (240,45)(340,145)(240,245)(140,145)
// Arm midpoints at (190,95) (190,195) (290,195) (290,95)
const LABEL_POS = [
  { x: 155, y: 70,  y2: 82,  anchor: 'end'   as const },  // arm0 upper-left
  { x: 155, y: 218, y2: 230, anchor: 'end'   as const },  // arm1 lower-left
  { x: 325, y: 218, y2: 230, anchor: 'start' as const },  // arm2 lower-right
  { x: 325, y: 70,  y2: 82,  anchor: 'start' as const },  // arm3 upper-right
]

// ── Main component ────────────────────────────────────────────────────────────
type Props = { bridgeConfig?: BridgeConfig; poissonRatio?: number }

export default function ReverseBeamBridgeDiagram({ bridgeConfig = 'fullBridgeTopBot', poissonRatio = 0.3 }: Props) {
  const W = 480, H = 290
  const cx = 240, cy = 145, r = 100

  const top    = { x: cx,     y: cy - r }
  const right  = { x: cx + r, y: cy     }
  const bottom = { x: cx,     y: cy + r }
  const left   = { x: cx - r, y: cy     }

  const nodeSeq = [top, left, bottom, right]  // P+, S+, P−, S−
  const arms = ARM_DEFS[bridgeConfig]

  // Diamond edges: top→left, left→bottom, bottom→right, right→top
  const edges: [typeof top, typeof left][] = [
    [top, left], [left, bottom], [bottom, right], [right, top],
  ]

  const footerText = bridgeConfig === 'fullBridgeTop'
    ? `Full bridge top · output = GF·ε·(1+${poissonRatio.toFixed(2)}) / 2 ≈ ${(0.5*(1+poissonRatio)).toFixed(3)} GF·ε`
    : FOOTER[bridgeConfig]

  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" style={{ display: 'block' }} aria-hidden="true">

      {/* Arms */}
      {edges.map(([p, q], i) => (
        <BridgeArm key={i} x1={p.x} y1={p.y} x2={q.x} y2={q.y} arm={arms[i]} />
      ))}

      {/* Nodes */}
      <BridgeNode x={top.x}    y={top.y}
        fill={redW}   borderFill={redW}   label="P+" colorName="Red"
        anchor="middle" dx={0}   dy={-20} cdy={-9} />
      <BridgeNode x={left.x}   y={left.y}
        fill={greenW} borderFill={greenW} label="S+" colorName="Green"
        anchor="end"    dx={-14} dy={4}   cdy={15} />
      <BridgeNode x={bottom.x} y={bottom.y}
        fill={blackW} borderFill={blackW} label="P−" colorName="Black"
        anchor="middle" dx={0}   dy={21}  cdy={32} />
      <BridgeNode x={right.x}  y={right.y}
        fill={whiteW} borderFill={whiteW} label="S−" colorName="White"
        anchor="start"  dx={14}  dy={4}   cdy={15} />

      {/* Gage / resistor labels outside diamond */}
      {arms.map((arm, i) => {
        const lp = LABEL_POS[i]
        if (arm.kind === 'resistor') return (
          <text key={i} x={lp.x} y={lp.y} textAnchor={lp.anchor} fontSize={10} fill={resC} fontStyle="italic">fixed R</text>
        )
        const col = armColor(arm.kind)
        return (
          <g key={i}>
            <text x={lp.x} y={lp.y}  textAnchor={lp.anchor} fontSize={12} fontWeight="700" fill={col}>{arm.label}</text>
            <text x={lp.x} y={lp.y2} textAnchor={lp.anchor} fontSize={9}  fill={col}>{arm.desc}</text>
          </g>
        )
      })}

      {/* Footer */}
      <text x={W / 2} y={H - 5} textAnchor="middle" fontSize={9} fill={dc} opacity={0.65} fontStyle="italic">
        {footerText}
      </text>
    </svg>
  )
}
