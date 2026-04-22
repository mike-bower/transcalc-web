/**
 * Top-view SVG sketch of a spoke-flexure Joint Torque Sensor disk.
 * Shows outer ring, inner hub, N radial spokes, and gage locations at spoke roots.
 */

interface Props {
  outerRadiusMm: number
  innerRadiusMm: number
  spokeWidthMm: number
  spokeCount: number
  width?: number
  height?: number
}

const TAU = 2 * Math.PI

export default function JTSSketch2D({
  outerRadiusMm,
  innerRadiusMm,
  spokeWidthMm,
  spokeCount,
  width = 300,
  height = 300,
}: Props) {
  const Ls = outerRadiusMm - innerRadiusMm
  if (outerRadiusMm <= 0 || innerRadiusMm <= 0 || Ls <= 0 || spokeCount < 2) {
    return <svg width={width} height={height}><text x={10} y={20} fontSize={11} fill="#888">Invalid geometry</text></svg>
  }

  const pad = 28
  const scale = Math.min((width - pad * 2) / (outerRadiusMm * 2), (height - pad * 2) / (outerRadiusMm * 2))
  const cx = width / 2
  const cy = height / 2

  const Ro = outerRadiusMm * scale
  const Ri = innerRadiusMm * scale
  const hw = (spokeWidthMm / 2) * scale   // half-spoke-width in px

  // Clamp hw so it doesn't exceed inner ring visually
  const hwClamped = Math.min(hw, Ri * 0.85)

  // Build spoke paths
  const spokePaths: string[] = []
  for (let i = 0; i < spokeCount; i++) {
    const angle = (i * TAU) / spokeCount  // spoke centrelineangle
    const cos = Math.cos(angle)
    const sin = Math.sin(angle)
    // Perpendicular direction (spoke width)
    const perp_cos = -sin
    const perp_sin = cos

    // Four corners of the spoke rectangle (from inner to outer radius)
    const x1 = cx + cos * Ri + perp_cos * hwClamped
    const y1 = cy + sin * Ri + perp_sin * hwClamped
    const x2 = cx + cos * Ri - perp_cos * hwClamped
    const y2 = cy + sin * Ri - perp_sin * hwClamped
    const x3 = cx + cos * Ro - perp_cos * hwClamped
    const y3 = cy + sin * Ro - perp_sin * hwClamped
    const x4 = cx + cos * Ro + perp_cos * hwClamped
    const y4 = cy + sin * Ro + perp_sin * hwClamped

    spokePaths.push(`M${x1},${y1} L${x2},${y2} L${x3},${y3} L${x4},${y4} Z`)
  }

  // Gage markers — small rectangles at spoke roots (near outer ring)
  const gageOffset = 0.08 * Ro   // distance from outer ring inner edge
  const gageLen = Math.max(hwClamped * 0.7, 4)
  const gageH = Math.max(hwClamped * 0.35, 2.5)
  const gageMarkers: { x: number; y: number; angle: number }[] = []
  for (let i = 0; i < spokeCount; i++) {
    const angle = (i * TAU) / spokeCount
    const rg = Ro - gageOffset - gageLen / 2
    gageMarkers.push({
      x: cx + Math.cos(angle) * rg,
      y: cy + Math.sin(angle) * rg,
      angle: (angle * 180) / Math.PI,
    })
  }

  // Torque moment arrows (curved arrows around the hub)
  const arrowR = (Ri + Ro) / 2
  const arcSpan = 0.4   // radians
  const arrowStartAngle = Math.PI * 0.25
  const ax1 = cx + arrowR * Math.cos(arrowStartAngle)
  const ay1 = cy + arrowR * Math.sin(arrowStartAngle)
  const ax2 = cx + arrowR * Math.cos(arrowStartAngle + arcSpan)
  const ay2 = cy + arrowR * Math.sin(arrowStartAngle + arcSpan)

  // Dimension: outer radius
  const dimY = cy + Ro + 14
  const dimX1 = cx
  const dimX2 = cx + Ro

  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} style={{ display: 'block' }}>
      <defs>
        <marker id="jts-arrow" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">
          <path d="M0,0 L6,3 L0,6 Z" fill="#c8202f" />
        </marker>
        <marker id="jts-dim" markerWidth="6" markerHeight="6" refX="3" refY="3" orient="auto">
          <path d="M0,0 L6,3 L0,6 Z" fill="#64748b" />
        </marker>
      </defs>

      {/* Outer ring */}
      <circle cx={cx} cy={cy} r={Ro} fill="#e8eef5" stroke="#9bafc4" strokeWidth={1.5} />

      {/* Spokes */}
      {spokePaths.map((d, i) => (
        <path key={i} d={d} fill="#c8d8e8" stroke="#7a9ab5" strokeWidth={1} />
      ))}

      {/* Hub */}
      <circle cx={cx} cy={cy} r={Ri} fill="#dde5ef" stroke="#7a9ab5" strokeWidth={1.5} />
      <circle cx={cx} cy={cy} r={Ri * 0.3} fill="#c0cdd9" stroke="#7a9ab5" strokeWidth={1} />

      {/* Gage markers */}
      {gageMarkers.map((g, i) => (
        <rect
          key={i}
          x={g.x - gageLen / 2}
          y={g.y - gageH / 2}
          width={gageLen}
          height={gageH}
          fill="#f59e0b"
          stroke="#d97706"
          strokeWidth={0.8}
          rx={1}
          transform={`rotate(${g.angle},${g.x},${g.y})`}
        />
      ))}

      {/* Torque moment arc arrow */}
      <path
        d={`M${ax1},${ay1} A${arrowR},${arrowR} 0 0,1 ${ax2},${ay2}`}
        fill="none"
        stroke="#c8202f"
        strokeWidth={1.5}
        markerEnd="url(#jts-arrow)"
        strokeDasharray="4 2"
      />
      <text
        x={cx + arrowR * Math.cos(arrowStartAngle + arcSpan / 2) + 8}
        y={cy + arrowR * Math.sin(arrowStartAngle + arcSpan / 2) + 4}
        fontSize={9}
        fill="#c8202f"
        fontFamily="IBM Plex Mono, monospace"
      >T</text>

      {/* Centrelines */}
      {Array.from({ length: spokeCount }, (_, i) => {
        const angle = (i * TAU) / spokeCount
        return (
          <line
            key={i}
            x1={cx + Math.cos(angle) * (Ri - 4)}
            y1={cy + Math.sin(angle) * (Ri - 4)}
            x2={cx + Math.cos(angle) * (Ro + 4)}
            y2={cy + Math.sin(angle) * (Ro + 4)}
            stroke="#94a3b8"
            strokeWidth={0.5}
            strokeDasharray="3 3"
          />
        )
      })}

      {/* Outer radius dimension */}
      <line x1={dimX1} y1={dimY} x2={dimX2} y2={dimY} stroke="#64748b" strokeWidth={0.8} markerEnd="url(#jts-dim)" />
      <line x1={dimX1} y1={dimY - 4} x2={dimX1} y2={dimY + 4} stroke="#64748b" strokeWidth={0.8} />
      <text x={(dimX1 + dimX2) / 2} y={dimY + 10} textAnchor="middle" fontSize={9} fill="#64748b" fontFamily="IBM Plex Mono, monospace">
        Ro = {outerRadiusMm} mm
      </text>

      {/* Spoke count label */}
      <text x={cx} y={pad - 8} textAnchor="middle" fontSize={9} fill="#64748b" fontFamily="IBM Plex Mono, monospace">
        N = {spokeCount} spokes
      </text>

      {/* Legend */}
      <rect x={8} y={height - 22} width={10} height={7} fill="#f59e0b" stroke="#d97706" strokeWidth={0.7} rx={1} />
      <text x={22} y={height - 16} fontSize={8} fill="#64748b" fontFamily="IBM Plex Mono, monospace">gage location</text>
    </svg>
  )
}
