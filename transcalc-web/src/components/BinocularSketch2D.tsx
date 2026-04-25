import React from 'react'
import { buildBinocularGeometry, type BinocularRawParams } from '../domain/binocularGeometry'

type Props = {
  params: BinocularRawParams
  us?: boolean
}

const fd = (v: number, us: boolean | undefined, d = 2) => `${v.toFixed(d)} ${us ? 'in' : 'mm'}`
const ff = (v: number, us: boolean | undefined) => `${v.toFixed(us ? 1 : 0)} ${us ? 'lbf' : 'N'}`

export const BinocularSketch2D: React.FC<Props> = ({ params, us }) => {
  const g = buildBinocularGeometry(params)

  const W = 900, H = 440
  const sv = { x: 90, y: 88, w: 440, h: 264 }   // side view area
  const tv = { x: 642, y: 128, w: 198, h: 158 }  // top view area

  const scale = Math.min(sv.w / g.totalLength, sv.h / g.beamHeight)
  const toX = (x: number) => sv.x + (x - g.xMin) * scale
  const toY = (y: number) => sv.y + sv.h - (y - g.yMin) * scale

  const bL = toX(g.xMin)       // beam left px
  const bR = toX(g.xMax)       // beam right px
  const bT = toY(g.yMax)       // beam top px
  const bB = toY(g.yMin)       // beam bottom px
  const cY = toY(0)             // center y px

  const sT = toY(g.centerSlotHalfHeight)    // slot top px
  const sB = toY(-g.centerSlotHalfHeight)   // slot bottom px
  const rPx = g.radius * scale
  const lhx = toX(g.holeLeftX)
  const rhx = toX(g.holeRightX)
  const tdx = Math.sqrt(Math.max(0, rPx ** 2 - (cY - sT) ** 2))

  const tScale = tv.w / g.totalLength
  const tTop = tv.y + tv.h * 0.25
  const tH = Math.max(24, g.beamDepth * tScale)
  const ttX = (x: number) => tv.x + (x - g.xMin) * tScale

  // K2 = r + t_min: the reference plane used in the binocular beam bending formula
  // t_min is the vertical distance from the hole top (y=radius) to K2 (y=radius+minThickness)
  const K2y = toY(g.radius + g.minThickness)
  const holeTopy = toY(g.radius)

  const gL = Math.max(16, g.gageLength * scale)
  const gH = Math.max(8, g.minThickness * scale * 0.7)
  const gTopY = bT + 6
  const gBotY = bB - gH - 6

  const dc = '#475569'
  const lc = '#334155'

  return (
    <div style={{ display: 'block' }}>
      <svg width="100%" viewBox={`0 0 ${W} ${H}`} style={{ display: 'block' }} aria-hidden="true">
        <defs>
          <marker id="bsArrow" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
            <path d="M0,0 L0,6 L6,3 z" fill="#dc2626" />
          </marker>
          <pattern id="bsHatch" width="8" height="8" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
            <line x1="0" y1="0" x2="0" y2="8" stroke="#94a3b8" strokeWidth="2" />
          </pattern>
        </defs>

        {/* View labels */}
        <text x={sv.x} y={18} fontSize={11} fontWeight="700" fill={lc} letterSpacing="0.14em">SIDE VIEW</text>
        <text x={tv.x} y={18} fontSize={11} fontWeight="700" fill={lc} letterSpacing="0.14em">TOP VIEW</text>

        {/* Centerlines */}
        <line x1={bL - 14} y1={cY} x2={bR + 14} y2={cY} stroke="#cbd5e1" strokeDasharray="6 5" strokeWidth={1} />
        <line x1={lhx} y1={bT - 14} x2={lhx} y2={bB + 14} stroke="#cbd5e1" strokeDasharray="6 5" strokeWidth={1} />
        <line x1={rhx} y1={bT - 14} x2={rhx} y2={bB + 14} stroke="#cbd5e1" strokeDasharray="6 5" strokeWidth={1} />

        {/* Fixed wall hatch */}
        <rect x={bL - 27} y={bT - 4} width={23} height={bB - bT + 8} fill="url(#bsHatch)" stroke={dc} strokeWidth={1.5} />
        <text x={bL - 28} y={bT - 12} fontSize={9} fill={dc} textAnchor="start">Fixed</text>

        {/* Beam body */}
        <rect x={bL} y={bT} width={bR - bL} height={bB - bT} fill="#ffffff" stroke={lc} strokeWidth={2} />

        {/* Binocular holes: slot fill first, then full circles on top so both outlines are visible */}
        <rect x={lhx} y={sT} width={rhx - lhx} height={sB - sT} fill="#e2e8f0" stroke="none" />
        <circle cx={lhx} cy={cY} r={rPx} fill="#e2e8f0" stroke={lc} strokeWidth={2} />
        <circle cx={rhx} cy={cY} r={rPx} fill="#e2e8f0" stroke={lc} strokeWidth={2} />
        {/* Slot straight walls — only when g < r (tdx > 0); degenerate geometry skips these */}
        {tdx > 0 && (
          <>
            <line x1={lhx + tdx} y1={sT} x2={rhx - tdx} y2={sT} stroke={lc} strokeWidth={2} />
            <line x1={lhx + tdx} y1={sB} x2={rhx - tdx} y2={sB} stroke={lc} strokeWidth={2} />
          </>
        )}

        {/* Active gages */}
        <rect x={toX(g.leftActiveX) - gL / 2} y={gTopY} width={gL} height={gH} rx={2} fill="#f97316" opacity={0.9} />
        <rect x={toX(g.rightActiveX) - gL / 2} y={gBotY} width={gL} height={gH} rx={2} fill="#2563eb" opacity={0.9} />
        {/* Passive gages */}
        <rect x={toX(g.leftPassiveX) - gL / 2} y={gBotY} width={gL} height={gH} rx={2} fill="#94a3b8" opacity={0.85} />
        <rect x={toX(g.rightPassiveX) - gL / 2} y={gTopY} width={gL} height={gH} rx={2} fill="#94a3b8" opacity={0.85} />

        {/* Gage labels */}
        <text x={toX(g.leftActiveX)} y={gTopY - 5} textAnchor="middle" fontSize={10} fontWeight="700" fill="#c2410c">+ε</text>
        <text x={toX(g.rightActiveX)} y={bB + 16} textAnchor="middle" fontSize={10} fontWeight="700" fill="#1d4ed8">−ε</text>

        {/* Load arrow */}
        <line x1={bR - 22} y1={bT - 34} x2={bR - 22} y2={bT - 1} stroke="#dc2626" strokeWidth={2.5} markerEnd="url(#bsArrow)" />
        <text x={bR - 22} y={bT - 40} textAnchor="middle" fontSize={10} fontWeight="700" fill="#dc2626">P = {ff(g.load, us)}</text>

        {/* ── Dim: overall length (below beam) ── */}
        <line x1={bL} y1={bB + 6} x2={bL} y2={bB + 28} stroke={dc} strokeWidth={0.8} />
        <line x1={bR} y1={bB + 6} x2={bR} y2={bB + 28} stroke={dc} strokeWidth={0.8} />
        <line x1={bL} y1={bB + 26} x2={bR} y2={bB + 26} stroke={dc} strokeWidth={1} />
        <line x1={bL} y1={bB + 22} x2={bL} y2={bB + 30} stroke={dc} strokeWidth={1.2} />
        <line x1={bR} y1={bB + 22} x2={bR} y2={bB + 30} stroke={dc} strokeWidth={1.2} />
        <text x={(bL + bR) / 2} y={bB + 42} textAnchor="middle" fontSize={11} fill={dc}>L = {fd(g.totalLength, us)}</text>

        {/* ── Dim: beam height (left of beam) ── */}
        <line x1={bL - 4} y1={bT} x2={bL - 50} y2={bT} stroke={dc} strokeWidth={0.8} />
        <line x1={bL - 4} y1={bB} x2={bL - 50} y2={bB} stroke={dc} strokeWidth={0.8} />
        <line x1={bL - 48} y1={bT} x2={bL - 48} y2={bB} stroke={dc} strokeWidth={1} />
        <line x1={bL - 52} y1={bT} x2={bL - 44} y2={bT} stroke={dc} strokeWidth={1.2} />
        <line x1={bL - 52} y1={bB} x2={bL - 44} y2={bB} stroke={dc} strokeWidth={1.2} />
        <text
          x={bL - 58} y={(bT + bB) / 2}
          textAnchor="middle" fontSize={11} fill={dc}
          transform={`rotate(-90 ${bL - 58} ${(bT + bB) / 2})`}
        >H = {fd(g.beamHeight, us)}</text>

        {/* ── Dim: hole spacing (above beam) ── */}
        <line x1={lhx} y1={bT - 10} x2={lhx} y2={bT - 46} stroke={dc} strokeWidth={0.8} />
        <line x1={rhx} y1={bT - 10} x2={rhx} y2={bT - 46} stroke={dc} strokeWidth={0.8} />
        <line x1={lhx} y1={bT - 44} x2={rhx} y2={bT - 44} stroke={dc} strokeWidth={1} />
        <line x1={lhx} y1={bT - 48} x2={lhx} y2={bT - 40} stroke={dc} strokeWidth={1.2} />
        <line x1={rhx} y1={bT - 48} x2={rhx} y2={bT - 40} stroke={dc} strokeWidth={1.2} />
        <text x={(lhx + rhx) / 2} y={bT - 52} textAnchor="middle" fontSize={11} fill={dc}>S = {fd(g.holeSpacing, us)}</text>

        {/* ── Radius annotation (L-leader from right hole) ── */}
        <line x1={rhx + rPx + 14} y1={cY} x2={rhx + 14} y2={cY} stroke={dc} strokeWidth={1} />
        <line x1={rhx + 14} y1={cY} x2={rhx + 14} y2={sT} stroke={dc} strokeWidth={1} />
        <text x={rhx + rPx + 18} y={cY - 6} fontSize={10} fill={dc}>R = {fd(g.radius, us)}</text>

        {/* ── Min-thickness dim (vertical, right side: hole top → K2 reference) ── */}
        {/* t_min = K2 − r, where K2 = r + t_min is the reference used in the bending formula */}
        <line x1={bR + 6} y1={K2y} x2={bR + 42} y2={K2y} stroke={dc} strokeWidth={0.8} />
        <line x1={bR + 6} y1={holeTopy} x2={bR + 42} y2={holeTopy} stroke={dc} strokeWidth={0.8} />
        <line x1={bR + 40} y1={K2y} x2={bR + 40} y2={holeTopy} stroke={dc} strokeWidth={1} />
        <line x1={bR + 36} y1={K2y} x2={bR + 44} y2={K2y} stroke={dc} strokeWidth={1.2} />
        <line x1={bR + 36} y1={holeTopy} x2={bR + 44} y2={holeTopy} stroke={dc} strokeWidth={1.2} />
        <text x={bR + 50} y={(K2y + holeTopy) / 2 + 4} fontSize={10} fill={dc}>t = {fd(g.minThickness, us)}</text>

        {/* ── TOP VIEW ── */}
        <rect x={tv.x} y={tTop} width={g.totalLength * tScale} height={tH} fill="#ffffff" stroke={lc} strokeWidth={2} />
        {/* Active gages in top view */}
        <rect
          x={ttX(g.leftActiveX) - (g.gageLength * tScale) / 2} y={tTop + 4}
          width={g.gageLength * tScale} height={tH - 8}
          fill="#f97316" opacity={0.82}
        />
        <rect
          x={ttX(g.rightActiveX) - (g.gageLength * tScale) / 2} y={tTop + 4}
          width={g.gageLength * tScale} height={tH - 8}
          fill="#2563eb" opacity={0.82}
        />
        {/* Top view: depth dim (vertical, left of box) */}
        <line x1={tv.x - 6} y1={tTop} x2={tv.x - 24} y2={tTop} stroke={dc} strokeWidth={0.8} />
        <line x1={tv.x - 6} y1={tTop + tH} x2={tv.x - 24} y2={tTop + tH} stroke={dc} strokeWidth={0.8} />
        <line x1={tv.x - 22} y1={tTop} x2={tv.x - 22} y2={tTop + tH} stroke={dc} strokeWidth={1} />
        <line x1={tv.x - 26} y1={tTop} x2={tv.x - 18} y2={tTop} stroke={dc} strokeWidth={1.2} />
        <line x1={tv.x - 26} y1={tTop + tH} x2={tv.x - 18} y2={tTop + tH} stroke={dc} strokeWidth={1.2} />
        <text
          x={tv.x - 30} y={tTop + tH / 2}
          textAnchor="middle" fontSize={10} fill={dc}
          transform={`rotate(-90 ${tv.x - 30} ${tTop + tH / 2})`}
        >d = {fd(g.beamWidth, us)}</text>

        {/* ── Legend ── */}
        {([
          { x: sv.x, color: '#f97316', label: 'Active +ε' },
          { x: sv.x + 106, color: '#2563eb', label: 'Active −ε' },
          { x: sv.x + 212, color: '#94a3b8', label: 'Passive' },
        ] as const).map(({ x, color, label }) => (
          <g key={label}>
            <rect x={x} y={H - 22} width={14} height={10} rx={2} fill={color} opacity={0.9} />
            <text x={x + 18} y={H - 13} fontSize={10} fill={dc}>{label}</text>
          </g>
        ))}
      </svg>
    </div>
  )
}
