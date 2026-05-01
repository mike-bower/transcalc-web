/**
 * Generic Wheatstone bridge wiring diagram.
 *
 * Arms ordered clockwise starting from upper-left:
 *   arm0: P+ → S+  (upper-left)
 *   arm1: S+ → P−  (lower-left)
 *   arm2: P− → S−  (lower-right)
 *   arm3: S− → P+  (upper-right)
 *
 * For max bridge output, adjacent arms should carry opposite-sign strains.
 */

type ArmRole = 'tension' | 'compression' | 'poisson' | 'resistor'

interface ArmDef {
  role: ArmRole
  label: string
  desc: string
}

export type BridgePreset =
  | 'cantilever'
  | 'cantQuarter'
  | 'cantPoissonHalf'
  | 'cantHalfTopBot'
  | 'cantFullBend'
  | 'cantFullPoisson'
  | 'bending'
  | 'column'
  | 'shear'
  | 'torque'
  | 'pressure'

type Props = {
  config: BridgePreset
  poissonRatio?: number
}

// ── Colors ────────────────────────────────────────────────────────────────────
const tensionC     = '#c04010'
const compressionC = '#2060b0'
const poissonC     = '#c07020'   // transverse / Poisson gages
const resistorC    = '#9aaabb'
const dc           = '#3a4a6b'

const redW   = '#cc1a1a'
const blackW = '#1a1a1a'
const greenW = '#1a7a3a'
const whiteW = '#888888'

// ── Predefined configs ────────────────────────────────────────────────────────
const CONFIGS: Record<BridgePreset, [ArmDef, ArmDef, ArmDef, ArmDef]> = {
  cantilever: [
    { role: 'tension',     label: 'A', desc: 'top · root (+)' },
    { role: 'resistor',    label: 'R', desc: '' },
    { role: 'resistor',    label: 'R', desc: '' },
    { role: 'compression', label: 'B', desc: 'bot · root (−)' },
  ],

  // ── Five explicit cantilever bridge types ──────────────────────────────────
  cantQuarter: [
    { role: 'resistor', label: 'R', desc: '' },
    { role: 'resistor', label: 'R', desc: '' },
    { role: 'resistor', label: 'R', desc: '' },
    { role: 'tension',  label: 'A', desc: 'top · 0° (+ε)' },
  ],
  cantPoissonHalf: [
    { role: 'resistor', label: 'R', desc: '' },
    { role: 'resistor', label: 'R', desc: '' },
    { role: 'poisson',  label: 'B', desc: 'top · 90° (−νε)' },
    { role: 'tension',  label: 'A', desc: 'top · 0° (+ε)' },
  ],
  cantHalfTopBot: [
    { role: 'resistor',    label: 'R', desc: '' },
    { role: 'resistor',    label: 'R', desc: '' },
    { role: 'compression', label: 'B', desc: 'bot · 0° (−ε)' },
    { role: 'tension',     label: 'A', desc: 'top · 0° (+ε)' },
  ],
  cantFullBend: [
    { role: 'compression', label: 'D', desc: 'bot · 0° (−ε)' },
    { role: 'tension',     label: 'C', desc: 'top · 0° (+ε)' },
    { role: 'compression', label: 'B', desc: 'bot · 0° (−ε)' },
    { role: 'tension',     label: 'A', desc: 'top · 0° (+ε)' },
  ],
  cantFullPoisson: [
    { role: 'poisson',  label: 'D', desc: 'top · 90° (−νε)' },
    { role: 'tension',  label: 'C', desc: 'top · 0° (+ε)' },
    { role: 'poisson',  label: 'B', desc: 'top · 90° (−νε)' },
    { role: 'tension',  label: 'A', desc: 'top · 0° (+ε)' },
  ],

  bending: [
    { role: 'tension',     label: 'A', desc: 'tension · L (+)' },
    { role: 'compression', label: 'B', desc: 'compress · L (−)' },
    { role: 'tension',     label: 'D', desc: 'tension · R (+)' },
    { role: 'compression', label: 'C', desc: 'compress · R (−)' },
  ],
  column: [
    { role: 'compression', label: 'A', desc: 'axial · +X (−)' },
    { role: 'tension',     label: 'B', desc: 'Poisson · +Z (+ν)' },
    { role: 'compression', label: 'C', desc: 'axial · −X (−)' },
    { role: 'tension',     label: 'D', desc: 'Poisson · −Z (+ν)' },
  ],
  shear: [
    { role: 'tension',     label: 'A', desc: '+45° · near (+)' },
    { role: 'compression', label: 'B', desc: '−45° · near (−)' },
    { role: 'tension',     label: 'C', desc: '+45° · far  (+)' },
    { role: 'compression', label: 'D', desc: '−45° · far  (−)' },
  ],
  torque: [
    { role: 'tension',     label: 'A', desc: '+45° · side 1 (+)' },
    { role: 'compression', label: 'B', desc: '−45° · side 1 (−)' },
    { role: 'tension',     label: 'C', desc: '+45° · side 2 (+)' },
    { role: 'compression', label: 'D', desc: '−45° · side 2 (−)' },
  ],
  pressure: [
    { role: 'tension',     label: 'A', desc: 'radial · ctr (+)' },
    { role: 'compression', label: 'B', desc: 'tang · edge (−)' },
    { role: 'tension',     label: 'C', desc: 'radial · ctr (+)' },
    { role: 'compression', label: 'D', desc: 'tang · edge (−)' },
  ],
}

const FORMULA: Record<BridgePreset, (nu?: number) => string> = {
  cantilever:      () => 'Half bridge · output ≈ GF·ε / 2',
  cantQuarter:     () => 'Quarter bridge · output = GF·ε / 4',
  cantPoissonHalf: (nu = 0.3) => `Poisson ½ bridge · output = GF·ε·(1+ν)/4  [ν=${nu.toFixed(2)} → ×${((1 + nu) / 4).toFixed(3)}·GF·ε]`,
  cantHalfTopBot:  () => 'Half bridge (top/bot) · output = GF·ε / 2',
  cantFullBend:    () => 'Full bridge (bending) · output = GF·ε',
  cantFullPoisson: (nu = 0.3) => `Full bridge (Poisson) · output = GF·ε·(1+ν)/2  [ν=${nu.toFixed(2)} → ×${((1 + nu) / 2).toFixed(3)}·GF·ε]`,
  bending:         () => 'Full bridge · output ≈ GF·ε',
  column:     (nu = 0.3) => `Full bridge · output ≈ GF·ε·(1+${nu.toFixed(2)}) ≈ ${(1 + nu).toFixed(2)}·GF·ε`,
  shear:      () => 'Full bridge · output ≈ GF·γ  (γ = shear strain)',
  torque:     () => 'Full bridge · output ≈ GF·γ  (γ = torsional shear strain)',
  pressure:   () => 'Full bridge · output ≈ GF·ε',
}

// ── Arm color ─────────────────────────────────────────────────────────────────
function armColor(role: ArmRole): string {
  if (role === 'tension')     return tensionC
  if (role === 'compression') return compressionC
  if (role === 'poisson')     return poissonC
  return resistorC
}

// ── BridgeArm sub-component ───────────────────────────────────────────────────
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
  const col = armColor(arm.role)
  const isRes = arm.role === 'resistor'
  const isActive = !isRes

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

// ── BridgeNode sub-component ──────────────────────────────────────────────────
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

// ── Label positions (outside diamond at each arm midpoint) ────────────────────
// Diamond: cx=240 cy=145 r=100 → nodes at (240,45)(340,145)(240,245)(140,145)
const LABEL_POS = [
  { x: 155, y: 70,  y2: 82,  anchor: 'end'   as const },  // arm0 upper-left
  { x: 155, y: 218, y2: 230, anchor: 'end'   as const },  // arm1 lower-left
  { x: 325, y: 218, y2: 230, anchor: 'start' as const },  // arm2 lower-right
  { x: 325, y: 70,  y2: 82,  anchor: 'start' as const },  // arm3 upper-right
]

// ── Main component ────────────────────────────────────────────────────────────
export default function WheatstoneBridgeDiagram({ config, poissonRatio = 0.3 }: Props) {
  const W = 480, H = 290
  const cx = 240, cy = 145, r = 100

  const top    = { x: cx,     y: cy - r }
  const right  = { x: cx + r, y: cy     }
  const bottom = { x: cx,     y: cy + r }
  const left   = { x: cx - r, y: cy     }

  // arms[0]=P+→S+ = top→left  arms[1]=S+→P− = left→bottom
  // arms[2]=P−→S− = bottom→right  arms[3]=S−→P+ = right→top
  const edges: [typeof top, typeof left][] = [
    [top, left], [left, bottom], [bottom, right], [right, top],
  ]

  const arms = CONFIGS[config]
  const formula = FORMULA[config](poissonRatio)

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
        if (arm.role === 'resistor') return (
          <text key={i} x={lp.x} y={lp.y} textAnchor={lp.anchor} fontSize={10} fill={resistorC} fontStyle="italic">fixed R</text>
        )
        const col = armColor(arm.role)
        return (
          <g key={i}>
            <text x={lp.x} y={lp.y}  textAnchor={lp.anchor} fontSize={12} fontWeight="700" fill={col}>{arm.label}</text>
            <text x={lp.x} y={lp.y2} textAnchor={lp.anchor} fontSize={9}  fill={col}>{arm.desc}</text>
          </g>
        )
      })}

      {/* Footer */}
      <text x={W / 2} y={H - 5} textAnchor="middle" fontSize={9} fill={dc} opacity={0.65} fontStyle="italic">
        {formula}
      </text>
    </svg>
  )
}
