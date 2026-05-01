import React from 'react'
import { buildBinocularGeometry, type BinocularRawParams } from '../domain/binocularGeometry'

type Props = {
  params: BinocularRawParams
  us?: boolean
}

const fd = (v: number, us: boolean | undefined, d = 2) => `${v.toFixed(d)} ${us ? 'in' : 'mm'}`
const ff = (v: number, us: boolean | undefined) => `${v.toFixed(us ? 1 : 0)} ${us ? 'lbf' : 'N'}`

export const BinocularSketch2D: React.FC<Props> = ({ params, us }) => {
  const geo = buildBinocularGeometry(params)

  const W = 900, H = 440
  const sv = { x: 90, y: 88, w: 440, h: 264 }   // side view area
  const tv = { x: 642, y: 128, w: 198, h: 158 }  // top view area

  const scale = Math.min(sv.w / geo.totalLength, sv.h / geo.beamHeight)
  const toX = (x: number) => sv.x + (x - geo.xMin) * scale
  const toY = (y: number) => sv.y + sv.h - (y - geo.yMin) * scale

  const bL = toX(geo.xMin)
  const bR = toX(geo.xMax)
  const bT = toY(geo.yMax)
  const bB = toY(geo.yMin)
  const cY = toY(0)

  const rPx = geo.radius * scale
  const lhx = toX(geo.holeLeftX)
  const rhx = toX(geo.holeRightX)

  const tScale = tv.w / geo.totalLength
  const tTop = tv.y + tv.h * 0.25
  const tH = Math.max(24, geo.beamDepth * tScale)
  const ttX = (x: number) => tv.x + (x - geo.xMin) * tScale

  const gL = Math.max(16, geo.gageLength * scale)
  const gH = Math.max(8, geo.minThickness * scale * 0.7)
  const gTopY = bT + 6
  const gBotY = bB - gH - 6

  const dc = '#475569'
  const lc = '#334155'

  // ── 2-arm: slot bounds (slotHH = R so sT/sB = top/bottom of holes) ──────────
  const slotHH = geo.centerSlotHalfHeight * scale   // = rPx for 2-arm
  const sT = cY - slotHH
  const sB = cY + slotHH

  // ── 4-arm: geometry in pixels ─────────────────────────────────────────────────
  const upperHolePxY = cY - geo.holeCenterY * scale
  const lowerHolePxY = cY + geo.holeCenterY * scale
  const innerSlotHH = geo.innerSlotHalfHeight * scale // center slot half-height in px

  // ── K2 / t_min annotation ─────────────────────────────────────────────────────
  // K2 reference: top of upper hole → beam top face
  const holeTopyPx = geo.isFourArm
    ? cY - (geo.holeCenterY + geo.radius) * scale   // top of upper holes
    : cY - rPx                                       // top of 2-arm holes (at Y=0)
  const K2yPx = bT  // beam top face

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
        {geo.isFourArm && (
          <text x={sv.x} y={32} fontSize={9} fill="#7c3aed">4-arm configuration</text>
        )}

        {/* Centerlines */}
        <line x1={bL - 14} y1={cY} x2={bR + 14} y2={cY} stroke="#cbd5e1" strokeDasharray="6 5" strokeWidth={1} />
        <line x1={lhx} y1={bT - 14} x2={lhx} y2={bB + 14} stroke="#cbd5e1" strokeDasharray="6 5" strokeWidth={1} />
        <line x1={rhx} y1={bT - 14} x2={rhx} y2={bB + 14} stroke="#cbd5e1" strokeDasharray="6 5" strokeWidth={1} />

        {/* Fixed wall hatch */}
        <rect x={bL - 27} y={bT - 4} width={23} height={bB - bT + 8} fill="url(#bsHatch)" stroke={dc} strokeWidth={1.5} />
        <text x={bL - 28} y={bT - 12} fontSize={9} fill={dc} textAnchor="start">Fixed</text>

        {/* Beam body */}
        <rect x={bL} y={bT} width={bR - bL} height={bB - bT} fill="#ffffff" stroke={lc} strokeWidth={2} />

        {geo.isFourArm ? (
          // ── 4-arm: 4 holes + vertical arm cuts (width=2R) + horizontal center slot ──
          <>
            {/* Vertical arm cuts: from hole center to top/bottom edge, width = 2R */}
            {[lhx, rhx].map(hx => (
              <React.Fragment key={hx}>
                <rect x={hx - rPx} y={bT} width={rPx * 2} height={upperHolePxY - bT}
                  fill="#e2e8f0" stroke="none" />
                <rect x={hx - rPx} y={lowerHolePxY} width={rPx * 2} height={bB - lowerHolePxY}
                  fill="#e2e8f0" stroke="none" />
              </React.Fragment>
            ))}

            {/* Center horizontal slot */}
            {innerSlotHH > 0 && (
              <rect x={lhx} y={cY - innerSlotHH} width={rhx - lhx} height={innerSlotHH * 2}
                fill="#e2e8f0" stroke="none" />
            )}

            {/* 4 holes */}
            <circle cx={lhx} cy={upperHolePxY} r={rPx} fill="#e2e8f0" stroke={lc} strokeWidth={2} />
            <circle cx={rhx} cy={upperHolePxY} r={rPx} fill="#e2e8f0" stroke={lc} strokeWidth={2} />
            <circle cx={lhx} cy={lowerHolePxY} r={rPx} fill="#e2e8f0" stroke={lc} strokeWidth={2} />
            <circle cx={rhx} cy={lowerHolePxY} r={rPx} fill="#e2e8f0" stroke={lc} strokeWidth={2} />

            {/* Outline edges for vertical arm cuts */}
            {[lhx, rhx].map(hx => (
              <React.Fragment key={`edge-${hx}`}>
                <line x1={hx - rPx} y1={bT} x2={hx - rPx} y2={upperHolePxY} stroke={lc} strokeWidth={1.5} />
                <line x1={hx + rPx} y1={bT} x2={hx + rPx} y2={upperHolePxY} stroke={lc} strokeWidth={1.5} />
                <line x1={hx - rPx} y1={lowerHolePxY} x2={hx - rPx} y2={bB} stroke={lc} strokeWidth={1.5} />
                <line x1={hx + rPx} y1={lowerHolePxY} x2={hx + rPx} y2={bB} stroke={lc} strokeWidth={1.5} />
              </React.Fragment>
            ))}

            {/* Center slot outline edges */}
            {innerSlotHH > 0 && (
              <>
                <line x1={lhx} y1={cY - innerSlotHH} x2={rhx} y2={cY - innerSlotHH} stroke={lc} strokeWidth={1.5} />
                <line x1={lhx} y1={cY + innerSlotHH} x2={rhx} y2={cY + innerSlotHH} stroke={lc} strokeWidth={1.5} />
              </>
            )}

            {/* Hole CL marker lines for upper/lower pair */}
            <line x1={lhx - rPx - 8} y1={upperHolePxY} x2={lhx + rPx + 8} y2={upperHolePxY}
              stroke="#cbd5e1" strokeDasharray="4 3" strokeWidth={0.8} />
            <line x1={lhx - rPx - 8} y1={lowerHolePxY} x2={lhx + rPx + 8} y2={lowerHolePxY}
              stroke="#cbd5e1" strokeDasharray="4 3" strokeWidth={0.8} />
            <line x1={rhx - rPx - 8} y1={upperHolePxY} x2={rhx + rPx + 8} y2={upperHolePxY}
              stroke="#cbd5e1" strokeDasharray="4 3" strokeWidth={0.8} />
            <line x1={rhx - rPx - 8} y1={lowerHolePxY} x2={rhx + rPx + 8} y2={lowerHolePxY}
              stroke="#cbd5e1" strokeDasharray="4 3" strokeWidth={0.8} />
          </>
        ) : (
          // ── 2-arm: stadium cutout — holes at Y=0, slot height = 2R (hole diameter) ──
          <>
            <rect x={lhx} y={sT} width={rhx - lhx} height={sB - sT} fill="#e2e8f0" stroke="none" />
            <circle cx={lhx} cy={cY} r={rPx} fill="#e2e8f0" stroke={lc} strokeWidth={2} />
            <circle cx={rhx} cy={cY} r={rPx} fill="#e2e8f0" stroke={lc} strokeWidth={2} />
            <line x1={lhx} y1={sT} x2={rhx} y2={sT} stroke={lc} strokeWidth={2} />
            <line x1={lhx} y1={sB} x2={rhx} y2={sB} stroke={lc} strokeWidth={2} />
          </>
        )}

        {/* Active gages: top face at left hole CL (+ε), bottom face at right hole CL (−ε) */}
        <rect x={toX(geo.leftActiveX) - gL / 2} y={gTopY} width={gL} height={gH} rx={2} fill="#f97316" opacity={0.9} />
        <rect x={toX(geo.rightActiveX) - gL / 2} y={gBotY} width={gL} height={gH} rx={2} fill="#2563eb" opacity={0.9} />
        {/* Passive gages */}
        <rect x={toX(geo.leftPassiveX) - gL / 2} y={gBotY} width={gL} height={gH} rx={2} fill="#94a3b8" opacity={0.85} />
        <rect x={toX(geo.rightPassiveX) - gL / 2} y={gTopY} width={gL} height={gH} rx={2} fill="#94a3b8" opacity={0.85} />

        {/* Gage labels */}
        <text x={toX(geo.leftActiveX)} y={gTopY - 5} textAnchor="middle" fontSize={10} fontWeight="700" fill="#c2410c">+ε</text>
        <text x={toX(geo.rightActiveX)} y={bB + 16} textAnchor="middle" fontSize={10} fontWeight="700" fill="#1d4ed8">−ε</text>

        {/* Load arrow */}
        <line x1={bR - 22} y1={bT - 34} x2={bR - 22} y2={bT - 1} stroke="#dc2626" strokeWidth={2.5} markerEnd="url(#bsArrow)" />
        <text x={bR - 22} y={bT - 40} textAnchor="middle" fontSize={10} fontWeight="700" fill="#dc2626">P = {ff(geo.load, us)}</text>

        {/* ── Dim: overall length (below beam) ── */}
        <line x1={bL} y1={bB + 6} x2={bL} y2={bB + 28} stroke={dc} strokeWidth={0.8} />
        <line x1={bR} y1={bB + 6} x2={bR} y2={bB + 28} stroke={dc} strokeWidth={0.8} />
        <line x1={bL} y1={bB + 26} x2={bR} y2={bB + 26} stroke={dc} strokeWidth={1} />
        <line x1={bL} y1={bB + 22} x2={bL} y2={bB + 30} stroke={dc} strokeWidth={1.2} />
        <line x1={bR} y1={bB + 22} x2={bR} y2={bB + 30} stroke={dc} strokeWidth={1.2} />
        <text x={(bL + bR) / 2} y={bB + 42} textAnchor="middle" fontSize={11} fill={dc}>L = {fd(geo.totalLength, us)}</text>

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
        >H = {fd(geo.beamHeight, us)}</text>

        {/* ── Dim: hole spacing (above beam) ── */}
        <line x1={lhx} y1={bT - 10} x2={lhx} y2={bT - 46} stroke={dc} strokeWidth={0.8} />
        <line x1={rhx} y1={bT - 10} x2={rhx} y2={bT - 46} stroke={dc} strokeWidth={0.8} />
        <line x1={lhx} y1={bT - 44} x2={rhx} y2={bT - 44} stroke={dc} strokeWidth={1} />
        <line x1={lhx} y1={bT - 48} x2={lhx} y2={bT - 40} stroke={dc} strokeWidth={1.2} />
        <line x1={rhx} y1={bT - 48} x2={rhx} y2={bT - 40} stroke={dc} strokeWidth={1.2} />
        <text x={(lhx + rhx) / 2} y={bT - 52} textAnchor="middle" fontSize={11} fill={dc}>S = {fd(geo.holeSpacing, us)}</text>

        {/* ── Radius annotation (L-leader from right hole) ── */}
        {geo.isFourArm ? (
          // For 4-arm: point to upper-right hole
          <>
            <line x1={rhx + rPx + 14} y1={upperHolePxY} x2={rhx + 14} y2={upperHolePxY} stroke={dc} strokeWidth={1} />
            <line x1={rhx + 14} y1={upperHolePxY} x2={rhx + 14} y2={holeTopyPx} stroke={dc} strokeWidth={1} />
            <text x={rhx + rPx + 18} y={upperHolePxY - 6} fontSize={10} fill={dc}>R = {fd(geo.radius, us)}</text>
          </>
        ) : (
          <>
            <line x1={rhx + rPx + 14} y1={cY} x2={rhx + 14} y2={cY} stroke={dc} strokeWidth={1} />
            <line x1={rhx + 14} y1={cY} x2={rhx + 14} y2={sT} stroke={dc} strokeWidth={1} />
            <text x={rhx + rPx + 18} y={cY - 6} fontSize={10} fill={dc}>R = {fd(geo.radius, us)}</text>
          </>
        )}

        {/* ── Min-thickness dim: hole top → beam top face ── */}
        <line x1={bR + 6} y1={K2yPx} x2={bR + 42} y2={K2yPx} stroke={dc} strokeWidth={0.8} />
        <line x1={bR + 6} y1={holeTopyPx} x2={bR + 42} y2={holeTopyPx} stroke={dc} strokeWidth={0.8} />
        <line x1={bR + 40} y1={K2yPx} x2={bR + 40} y2={holeTopyPx} stroke={dc} strokeWidth={1} />
        <line x1={bR + 36} y1={K2yPx} x2={bR + 44} y2={K2yPx} stroke={dc} strokeWidth={1.2} />
        <line x1={bR + 36} y1={holeTopyPx} x2={bR + 44} y2={holeTopyPx} stroke={dc} strokeWidth={1.2} />
        <text x={bR + 50} y={(K2yPx + holeTopyPx) / 2 + 4} fontSize={10} fill={dc}>t = {fd(geo.minThickness, us)}</text>

        {/* ── TOP VIEW ── */}
        <rect x={tv.x} y={tTop} width={geo.totalLength * tScale} height={tH} fill="#ffffff" stroke={lc} strokeWidth={2} />
        {/* Active gages in top view */}
        <rect
          x={ttX(geo.leftActiveX) - (geo.gageLength * tScale) / 2} y={tTop + 4}
          width={geo.gageLength * tScale} height={tH - 8}
          fill="#f97316" opacity={0.82}
        />
        <rect
          x={ttX(geo.rightActiveX) - (geo.gageLength * tScale) / 2} y={tTop + 4}
          width={geo.gageLength * tScale} height={tH - 8}
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
        >d = {fd(geo.beamDepth, us)}</text>

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
