/**
 * CrossBeamSketch2D — orthographic top-view SVG of a 4-arm cross-beam F/T sensor.
 *
 * Each arm carries two physical gage grids (a 2-element rosette):
 *
 *   Odd grids  (1,3,5,7) — amber rectangle, longitudinal (bending).
 *              Bridge combinations → Fz (sum all), Mx (±Y diff), My (±X diff).
 *
 *   Even grids (2,4,6,8) — teal diamond, 45° shear.
 *              Bridge combinations → Fx (±Y sum), Fy (±X sum), Mz (all diff).
 *
 * Grid numbering by arm:
 *   +X arm: 1 (bending)  2 (shear)
 *   +Y arm: 3 (bending)  4 (shear)
 *   −X arm: 5 (bending)  6 (shear)
 *   −Y arm: 7 (bending)  8 (shear)
 */

interface Props {
  outerRadiusMm: number
  innerRadiusMm: number
  beamWidthMm: number
  beamThicknessMm: number
  gageDistFromOuterRingMm: number
  width?: number
  height?: number
}

export default function CrossBeamSketch2D({
  outerRadiusMm,
  innerRadiusMm,
  beamWidthMm,
  beamThicknessMm,
  gageDistFromOuterRingMm,
  width = 320,
  height = 320,
}: Props) {
  const cx = width / 2
  const cy = height / 2
  const margin = 36
  const scale = (width / 2 - margin) / outerRadiusMm

  const Ro = outerRadiusMm * scale
  const Ri = innerRadiusMm * scale
  const bw = (beamWidthMm / 2) * scale
  const beamLen = (outerRadiusMm - innerRadiusMm) * scale
  const gageDist   = gageDistFromOuterRingMm * scale
  const gageAxialX = Ro - gageDist        // longitudinal gage, closer to outer ring
  const gageShearX = gageAxialX - 14     // shear gage, inward along arm

  const grey    = '#64748b'
  const blue    = '#2563eb'
  const amber   = '#d97706'
  const teal    = '#0891b2'
  const dimLine = '#94a3b8'

  /** Longitudinal (bending) gage — rectangle aligned with arm axis */
  function AxialGage({ angle }: { angle: number }) {
    const rad = angle * Math.PI / 180
    const px = cx + Math.cos(rad) * gageAxialX
    const py = cy - Math.sin(rad) * gageAxialX
    return (
      <rect x={px - 5} y={py - 3} width={10} height={6}
        fill={amber} fillOpacity={0.9} stroke={amber} strokeWidth={0.8}
        transform={`rotate(${-angle}, ${px}, ${py})`}/>
    )
  }

  /** Shear gage — diamond rotated 45° to arm axis, positioned inward */
  function ShearGage({ angle }: { angle: number }) {
    const rad = angle * Math.PI / 180
    const px = cx + Math.cos(rad) * gageShearX
    const py = cy - Math.sin(rad) * gageShearX
    const s = 5
    return (
      <polygon
        points={`${px},${py - s} ${px + s},${py} ${px},${py + s} ${px - s},${py}`}
        fill={teal} fillOpacity={0.9} stroke={teal} strokeWidth={0.8}
        transform={`rotate(${-angle}, ${px}, ${py})`}/>
    )
  }

  /**
   * Grid number labels for one arm.
   * Placed perpendicular to the arm, outside the beam cross-section.
   * dx/dy formula: sin(rad) and -cos(rad) give outward-perpendicular direction
   * such that labels appear "above" horizontal arms and "to the right" of vertical ones.
   */
  function GridLabels({ angle, longNum, shearNum }: { angle: number; longNum: number; shearNum: number }) {
    const rad = angle * Math.PI / 180
    const offset = bw + 11
    const dx = Math.sin(rad) * offset
    const dy = -Math.cos(rad) * offset

    const axPx = cx + Math.cos(rad) * gageAxialX
    const axPy = cy - Math.sin(rad) * gageAxialX
    const shPx = cx + Math.cos(rad) * gageShearX
    const shPy = cy - Math.sin(rad) * gageShearX

    return (
      <g>
        <text x={axPx + dx} y={axPy + dy + 3} textAnchor="middle"
          fontSize={8.5} fill={amber} fontWeight="700" fontFamily="monospace">
          {longNum}
        </text>
        <text x={shPx + dx} y={shPy + dy + 3} textAnchor="middle"
          fontSize={8.5} fill={teal} fontWeight="700" fontFamily="monospace">
          {shearNum}
        </text>
      </g>
    )
  }

  function DimLine({ x1, y1, x2, y2, label, labelOffset = [0, -8] }: {
    x1: number; y1: number; x2: number; y2: number; label: string
    labelOffset?: [number, number]
  }) {
    const mx = (x1 + x2) / 2 + labelOffset[0]
    const my = (y1 + y2) / 2 + labelOffset[1]
    return (
      <g>
        <line x1={x1} y1={y1} x2={x2} y2={y2}
          stroke={dimLine} strokeWidth={1}
          markerEnd="url(#arr)" markerStart="url(#arr)"
          strokeDasharray="3 2"/>
        <text x={mx} y={my} fontSize={8.5} fill={dimLine} textAnchor="middle" fontFamily="monospace">{label}</text>
      </g>
    )
  }

  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} style={{ display: 'block' }}>
      <defs>
        <marker id="arr" markerWidth="5" markerHeight="5" refX="2.5" refY="2.5" orient="auto-start-reverse">
          <path d="M0,0 L5,2.5 L0,5 Z" fill={dimLine}/>
        </marker>
      </defs>

      {/* Outer ring */}
      <circle cx={cx} cy={cy} r={Ro} fill="none" stroke={grey} strokeWidth={2.5}/>

      {/* 4 beam arms */}
      <rect x={cx + Ri} y={cy - bw} width={beamLen} height={bw * 2} fill="#e2e8f0" stroke={grey} strokeWidth={1.5}/>
      <rect x={cx - Ro} y={cy - bw} width={beamLen} height={bw * 2} fill="#e2e8f0" stroke={grey} strokeWidth={1.5}/>
      <rect x={cx - bw} y={cy - Ro} width={bw * 2} height={beamLen} fill="#e2e8f0" stroke={grey} strokeWidth={1.5}/>
      <rect x={cx - bw} y={cy + Ri} width={bw * 2} height={beamLen} fill="#e2e8f0" stroke={grey} strokeWidth={1.5}/>

      {/* Hub */}
      <circle cx={cx} cy={cy} r={Ri} fill="#cbd5e1" stroke={grey} strokeWidth={1.5}/>

      {/* Centrelines */}
      <line x1={cx - Ro - 6} y1={cy} x2={cx + Ro + 6} y2={cy}
        stroke={dimLine} strokeWidth={0.8} strokeDasharray="6 3"/>
      <line x1={cx} y1={cy - Ro - 6} x2={cx} y2={cy + Ro + 6}
        stroke={dimLine} strokeWidth={0.8} strokeDasharray="6 3"/>

      {/* Shear gages (behind axial) */}
      {[0, 90, 180, 270].map(a => <ShearGage key={`s${a}`} angle={a}/>)}
      {/* Axial gages */}
      {[0, 90, 180, 270].map(a => <AxialGage key={`a${a}`} angle={a}/>)}

      {/* Grid number labels */}
      <GridLabels angle={0}   longNum={1} shearNum={2}/>   {/* +X */}
      <GridLabels angle={90}  longNum={3} shearNum={4}/>   {/* +Y */}
      <GridLabels angle={180} longNum={5} shearNum={6}/>   {/* −X */}
      <GridLabels angle={270} longNum={7} shearNum={8}/>   {/* −Y */}

      {/* Axis labels */}
      <text x={cx + Ro + 10} y={cy + 4}  fontSize={11} fill={blue} fontFamily="monospace" fontWeight="bold">+X</text>
      <text x={cx - Ro - 26} y={cy + 4}  fontSize={11} fill={blue} fontFamily="monospace" fontWeight="bold">−X</text>
      <text x={cx - 8}       y={cy - Ro - 8}  fontSize={11} fill={blue} fontFamily="monospace" fontWeight="bold">+Y</text>
      <text x={cx - 10}      y={cy + Ro + 16} fontSize={11} fill={blue} fontFamily="monospace" fontWeight="bold">−Y</text>

      {/* Dimensions */}
      <DimLine x1={cx} y1={cy - 4} x2={cx + Ro} y2={cy - 4}
        label={`Ro ${outerRadiusMm}`} labelOffset={[0, -10]}/>
      <DimLine x1={cx} y1={cy + 6} x2={cx + Ri} y2={cy + 6}
        label={`Ri ${innerRadiusMm}`} labelOffset={[0, 14]}/>
      <DimLine
        x1={cx + Ro + 14} y1={cy - bw}
        x2={cx + Ro + 14} y2={cy + bw}
        label={`b ${beamWidthMm}`} labelOffset={[26, 0]}/>

      {/* Legend */}
      <rect   x={4} y={height - 52} width={10} height={6} fill={amber}/>
      <text   x={18} y={height - 44} fontSize={8} fill={amber} fontFamily="monospace">Odd (1,3,5,7) — longitudinal · Fz · Mx · My</text>
      <polygon points={`9,${height-34} 14,${height-29} 9,${height-24} 4,${height-29}`} fill={teal}/>
      <text   x={18} y={height - 26} fontSize={8} fill={teal}  fontFamily="monospace">Even (2,4,6,8) — 45° shear · Fx · Fy · Mz</text>
      <text   x={4}  y={height - 12} fontSize={7} fill={dimLine} fontFamily="monospace">
        {`4 arms × 2 grids = 8 channels → 6 DOF  |  t=${beamThicknessMm}mm  xg=${gageDistFromOuterRingMm}mm from root`}
      </text>
    </svg>
  )
}
