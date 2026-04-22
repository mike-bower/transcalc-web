/**
 * HexapodSketch2D — engineering SVG of a hexapod F/T sensor.
 *
 * Left panel: top-view showing 3 top attachment points (amber) and
 * 6 bottom attachment points (teal) with projected strut lines.
 *
 * Right panel: side-elevation of one strut pair showing platform height,
 * tilt angle, and strut length.
 */

interface Props {
  topRingRadiusMm: number
  bottomRingRadiusMm: number
  platformHeightMm: number
  strutSpreadDeg: number
  topAnglesOffsetDeg?: number
  width?: number
  height?: number
}

const DEG = Math.PI / 180

export default function HexapodSketch2D({
  topRingRadiusMm,
  bottomRingRadiusMm,
  platformHeightMm,
  strutSpreadDeg,
  topAnglesOffsetDeg = 0,
  width = 480,
  height = 260,
}: Props) {

  // ── Layout ────────────────────────────────────────────────────────────────
  const topW  = width * 0.55          // top-view panel width
  const sideW = width - topW          // side-view panel width
  const margin = 30
  const cx = topW / 2
  const cy = height / 2

  const maxR  = Math.max(topRingRadiusMm, bottomRingRadiusMm)
  const scale = (Math.min(topW, height) / 2 - margin) / maxR

  const Rt = topRingRadiusMm * scale
  const Rb = bottomRingRadiusMm * scale
  const topOff    = topAnglesOffsetDeg * DEG
  const spreadRad = strutSpreadDeg * DEG

  // Colours
  const grey    = '#64748b'
  const blue    = '#2563eb'
  const amber   = '#d97706'
  const teal    = '#0891b2'
  const dimLine = '#94a3b8'
  const strutC  = '#64748b'

  // ── Top-view attachment points ────────────────────────────────────────────
  // 3 top points at 120° intervals
  const topPts = Array.from({ length: 3 }, (_, k) => {
    const a = topOff + k * (2 * Math.PI / 3)
    return { x: cx + Math.cos(a) * Rt, y: cy - Math.sin(a) * Rt }
  })

  // 6 bottom points (2 per top point, ±spread from 60° bisector)
  const botPts = Array.from({ length: 3 }, (_, k) => {
    const aCenter = k * (2 * Math.PI / 3) + Math.PI / 3
    return [
      { x: cx + Math.cos(aCenter - spreadRad) * Rb, y: cy - Math.sin(aCenter - spreadRad) * Rb },
      { x: cx + Math.cos(aCenter + spreadRad) * Rb, y: cy - Math.sin(aCenter + spreadRad) * Rb },
    ]
  }).flat()

  // Strut lines (projected): top[k] → botPts[2k] and top[k] → botPts[2k+1]
  const strutLines = Array.from({ length: 3 }, (_, k) => [
    { x1: topPts[k].x, y1: topPts[k].y, x2: botPts[2 * k].x, y2: botPts[2 * k].y },
    { x1: topPts[k].x, y1: topPts[k].y, x2: botPts[2 * k + 1].x, y2: botPts[2 * k + 1].y },
  ]).flat()

  // ── Side-view geometry (right panel) ────────────────────────────────────
  // Show strut 0 (top[0] → bot[0]) and strut 1 (top[0] → bot[1])
  const sxc = topW + sideW / 2
  const sMargin = 28
  const sScale  = (height - 2 * sMargin) / (platformHeightMm * 1.5)

  const halfH = (platformHeightMm / 2) * sScale
  const syTop = height / 2 - halfH
  const syBot = height / 2 + halfH

  // Top attachment (strut 0 and 1 share the same top point at x=0 in local frame)
  const sTx = sxc

  // Bottom attachment points in the side view — project radial position to horizontal offset
  // Strut k=0 at angle aCenter - spread, k=1 at angle aCenter + spread
  // The horizontal offset in side view = R_b × sin(lateral angle from Z axis projected)
  // Simplified: show as ±R_b*sin(spread) offset from top position in the top-view projection
  const aCenter0 = topOff + Math.PI / 3  // bisector direction
  // X-projection of bottom points relative to top point (in side view, show X-component difference)
  const bx0 = (bottomRingRadiusMm * Math.cos(aCenter0 - spreadRad) - topRingRadiusMm * Math.cos(topOff)) * sScale
  const bx1 = (bottomRingRadiusMm * Math.cos(aCenter0 + spreadRad) - topRingRadiusMm * Math.cos(topOff)) * sScale

  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} style={{ display: 'block' }}>

      {/* ── Panel divider ─────────────────────────────────────────────────── */}
      <line x1={topW} y1={0} x2={topW} y2={height} stroke="#e2e8f0" strokeWidth={1}/>

      {/* ── TOP VIEW ──────────────────────────────────────────────────────── */}

      {/* Centre cross-hairs */}
      <line x1={cx - Rt - 6} y1={cy} x2={cx + Rt + 6} y2={cy} stroke={dimLine} strokeWidth={0.8} strokeDasharray="5 3"/>
      <line x1={cx} y1={cy - Rt - 6} x2={cx} y2={cy + Rt + 6} stroke={dimLine} strokeWidth={0.8} strokeDasharray="5 3"/>

      {/* Top ring reference circle (dashed) */}
      <circle cx={cx} cy={cy} r={Rt} fill="none" stroke={amber} strokeWidth={1} strokeDasharray="6 3" opacity={0.7}/>
      {/* Bottom ring reference circle */}
      <circle cx={cx} cy={cy} r={Rb} fill="none" stroke={teal} strokeWidth={1} strokeDasharray="4 3" opacity={0.7}/>

      {/* Strut projections */}
      {strutLines.map((l, i) => (
        <line key={i} x1={l.x1} y1={l.y1} x2={l.x2} y2={l.y2}
          stroke={strutC} strokeWidth={1.4} opacity={0.7}/>
      ))}

      {/* Bottom attachment points */}
      {botPts.map((p, i) => (
        <circle key={`b${i}`} cx={p.x} cy={p.y} r={4}
          fill={teal} fillOpacity={0.9} stroke="#fff" strokeWidth={1}/>
      ))}

      {/* Top attachment points (on top) */}
      {topPts.map((p, i) => (
        <circle key={`t${i}`} cx={p.x} cy={p.y} r={5}
          fill={amber} fillOpacity={0.95} stroke="#fff" strokeWidth={1.2}/>
      ))}

      {/* Axis labels */}
      <text x={cx + Rt + 8} y={cy + 4}  fontSize={10} fill={blue} fontFamily="monospace" fontWeight="bold">+X</text>
      <text x={cx - 5}      y={cy - Rt - 6} fontSize={10} fill={blue} fontFamily="monospace" fontWeight="bold">+Y</text>

      {/* Top-view title */}
      <text x={cx} y={14} textAnchor="middle" fontSize={9} fill={grey} fontFamily="monospace">Top View</text>

      {/* Dimension: top ring radius */}
      <line x1={cx} y1={cy + 3} x2={cx + Rt} y2={cy + 3} stroke={dimLine} strokeWidth={0.9} strokeDasharray="3 2"
        markerEnd="url(#arrH)" markerStart="url(#arrH)"/>
      <text x={cx + Rt / 2} y={cy + 14} textAnchor="middle" fontSize={7.5} fill={amber} fontFamily="monospace">
        {`R_top ${topRingRadiusMm}`}
      </text>

      {/* Dimension: bottom ring radius (if different) */}
      {Math.abs(topRingRadiusMm - bottomRingRadiusMm) > 1 && (
        <>
          <line x1={cx} y1={cy - 3} x2={cx + Rb} y2={cy - 3} stroke={dimLine} strokeWidth={0.9}
            strokeDasharray="3 2" markerEnd="url(#arrH)" markerStart="url(#arrH)"/>
          <text x={cx + Rb / 2} y={cy - 6} textAnchor="middle" fontSize={7.5} fill={teal} fontFamily="monospace">
            {`R_bot ${bottomRingRadiusMm}`}
          </text>
        </>
      )}

      {/* ── SIDE VIEW ────────────────────────────────────────────────────── */}
      <text x={sxc} y={14} textAnchor="middle" fontSize={9} fill={grey} fontFamily="monospace">Side View (strut pair 0)</text>

      {/* Platform lines */}
      <line x1={topW + 6} y1={syTop} x2={topW + sideW - 6} y2={syTop}
        stroke={amber} strokeWidth={2} strokeLinecap="round"/>
      <line x1={topW + 6} y1={syBot} x2={topW + sideW - 6} y2={syBot}
        stroke={teal} strokeWidth={2} strokeLinecap="round"/>

      {/* Top attachment point */}
      <circle cx={sTx} cy={syTop} r={5} fill={amber} stroke="#fff" strokeWidth={1.2}/>

      {/* Strut lines (2 struts sharing top[0]) */}
      <line x1={sTx} y1={syTop} x2={sxc + bx0} y2={syBot} stroke={strutC} strokeWidth={1.8} opacity={0.85}/>
      <line x1={sTx} y1={syTop} x2={sxc + bx1} y2={syBot} stroke={strutC} strokeWidth={1.8} opacity={0.85}/>

      {/* Bottom attachment points */}
      <circle cx={sxc + bx0} cy={syBot} r={4} fill={teal} stroke="#fff" strokeWidth={1}/>
      <circle cx={sxc + bx1} cy={syBot} r={4} fill={teal} stroke="#fff" strokeWidth={1}/>

      {/* Height dimension */}
      <line x1={topW + sideW - 14} y1={syTop} x2={topW + sideW - 14} y2={syBot}
        stroke={dimLine} strokeWidth={0.9} strokeDasharray="3 2"
        markerEnd="url(#arrV)" markerStart="url(#arrV)"/>
      <text x={topW + sideW - 6} y={(syTop + syBot) / 2 + 4}
        fontSize={7.5} fill={dimLine} fontFamily="monospace">h={platformHeightMm}</text>

      {/* Spread angle arc label */}
      <text x={sxc + 8} y={syTop + 18} fontSize={7.5} fill={grey} fontFamily="monospace">
        ±{strutSpreadDeg}°
      </text>

      {/* ── Legend ────────────────────────────────────────────────────────── */}
      <circle cx={8} cy={height - 32} r={5} fill={amber}/>
      <text x={17} y={height - 29} fontSize={7.5} fill={amber} fontFamily="monospace">3 top attach pts (shared, 2 struts each)</text>
      <circle cx={8} cy={height - 16} r={4} fill={teal}/>
      <text x={17} y={height - 13} fontSize={7.5} fill={teal} fontFamily="monospace">6 bottom attach pts · spread ±{strutSpreadDeg}°</text>

      {/* Arrow markers */}
      <defs>
        <marker id="arrH" markerWidth="5" markerHeight="5" refX="2.5" refY="2.5" orient="auto-start-reverse">
          <path d="M0,0 L5,2.5 L0,5 Z" fill={dimLine}/>
        </marker>
        <marker id="arrV" markerWidth="5" markerHeight="5" refX="2.5" refY="2.5" orient="auto-start-reverse">
          <path d="M0,0 L5,2.5 L0,5 Z" fill={dimLine}/>
        </marker>
      </defs>
    </svg>
  )
}
