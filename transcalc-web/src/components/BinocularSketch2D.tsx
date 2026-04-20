import React from 'react'
import { buildBinocularGeometry, type BinocularRawParams } from '../domain/binocularGeometry'

type Props = {
  params: BinocularRawParams
  us?: boolean
}

function formatDimension(value: number, us: boolean | undefined, digits: number = 2): string {
  return `${value.toFixed(digits)} ${us ? 'in' : 'mm'}`
}

function formatForce(value: number, us: boolean | undefined): string {
  return `${value.toFixed(us ? 1 : 0)} ${us ? 'lbf' : 'N'}`
}

export const BinocularSketch2D: React.FC<Props> = ({ params, us }) => {
  const geometry = buildBinocularGeometry(params)
  const width = 880
  const height = 420
  const sideView = { x: 56, y: 58, w: 470, h: 280 }
  const topView = { x: 590, y: 92, w: 220, h: 240 }
  const detailView = { x: 590, y: 28, w: 220, h: 52 }

  const scale = Math.min(sideView.w / geometry.totalLength, sideView.h / geometry.beamHeight)
  const toX = (x: number) => sideView.x + (x - geometry.xMin) * scale
  const toY = (y: number) => sideView.y + sideView.h - (y - geometry.yMin) * scale

  const beamLeft = toX(geometry.xMin)
  const beamRight = toX(geometry.xMax)
  const beamTop = toY(geometry.yMax)
  const beamBottom = toY(geometry.yMin)
  const centerY = toY(0)

  const slotTop = toY(geometry.centerSlotHalfHeight)
  const slotBottom = toY(-geometry.centerSlotHalfHeight)
  const holeRadiusPx = geometry.radius * scale
  const leftHoleX = toX(geometry.holeLeftX)
  const rightHoleX = toX(geometry.holeRightX)
  const tangentDx = Math.sqrt(
    Math.max(0, holeRadiusPx * holeRadiusPx - (centerY - slotTop) * (centerY - slotTop))
  )

  const topScale = topView.w / geometry.totalLength
  const topLeft = topView.x
  const topTop = topView.y + topView.h * 0.2
  const topHeight = Math.max(28, geometry.beamDepth * topScale)
  const topToX = (x: number) => topLeft + (x - geometry.xMin) * topScale

  const gageLengthPx = Math.max(16, geometry.gageLength * scale)
  const gageHeightPx = Math.max(10, geometry.minThickness * scale * 0.85)
  const activeTopY = beamTop + 8
  const activeBottomY = beamBottom - gageHeightPx - 8

  return (
    <div className="flex flex-col items-center bg-white p-4 rounded-xl shadow-sm border border-slate-200">
      <div className="w-full flex items-center justify-between mb-3">
        <div>
          <h4 className="text-sm font-black text-slate-800 uppercase tracking-wider">Binocular Beam Engineering Sketch</h4>
          <p className="text-[11px] text-slate-500">Shared geometry reference for sketch, model, mesh, and result overlays</p>
        </div>
        <div className="text-right text-[10px] font-mono text-slate-500">
          <div>Spacing: {formatDimension(geometry.holeSpacing, us)}</div>
          <div>Hole radius: {formatDimension(geometry.radius, us)}</div>
          <div>Load: {formatForce(geometry.load, us)}</div>
        </div>
      </div>

      <svg width="100%" viewBox={`0 0 ${width} ${height}`} className="bg-slate-50 border border-slate-200 rounded-lg">
        <defs>
          <marker id="binocularArrow" markerWidth="10" markerHeight="10" refX="6" refY="3" orient="auto">
            <path d="M0,0 L0,6 L6,3 z" fill="#dc2626" />
          </marker>
          <pattern id="binocularHatch" width="8" height="8" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
            <line x1="0" y1="0" x2="0" y2="8" stroke="#94a3b8" strokeWidth="2" />
          </pattern>
        </defs>

        <text x={sideView.x} y={30} fontSize="12" fontWeight="800" fill="#0f172a" letterSpacing="0.18em">
          SIDE VIEW
        </text>
        <text x={topView.x} y={30} fontSize="12" fontWeight="800" fill="#0f172a" letterSpacing="0.18em">
          TOP VIEW
        </text>

        <line x1={beamLeft - 20} y1={centerY} x2={beamRight + 20} y2={centerY} stroke="#cbd5e1" strokeDasharray="6 6" />
        <line x1={leftHoleX} y1={beamTop - 18} x2={leftHoleX} y2={beamBottom + 18} stroke="#cbd5e1" strokeDasharray="6 6" />
        <line x1={rightHoleX} y1={beamTop - 18} x2={rightHoleX} y2={beamBottom + 18} stroke="#cbd5e1" strokeDasharray="6 6" />

        <rect x={beamLeft} y={beamTop} width={beamRight - beamLeft} height={beamBottom - beamTop} fill="#ffffff" stroke="#334155" strokeWidth="2" />
        <path
          d={[
            `M ${leftHoleX + tangentDx} ${slotTop}`,
            `L ${rightHoleX - tangentDx} ${slotTop}`,
            `A ${holeRadiusPx} ${holeRadiusPx} 0 1 1 ${rightHoleX - tangentDx} ${slotBottom}`,
            `L ${leftHoleX + tangentDx} ${slotBottom}`,
            `A ${holeRadiusPx} ${holeRadiusPx} 0 1 0 ${leftHoleX + tangentDx} ${slotTop}`,
            'Z',
          ].join(' ')}
          fill="#e2e8f0"
          stroke="#0f172a"
          strokeWidth="2"
        />

        <rect
          x={toX(geometry.leftActiveX) - gageLengthPx / 2}
          y={activeTopY}
          width={gageLengthPx}
          height={gageHeightPx}
          rx="2"
          fill="#f97316"
          opacity="0.85"
        />
        <rect
          x={toX(geometry.rightActiveX) - gageLengthPx / 2}
          y={activeBottomY}
          width={gageLengthPx}
          height={gageHeightPx}
          rx="2"
          fill="#2563eb"
          opacity="0.85"
        />
        <rect
          x={toX(geometry.leftPassiveX) - gageLengthPx / 2}
          y={activeBottomY}
          width={gageLengthPx}
          height={gageHeightPx}
          rx="2"
          fill="#cbd5e1"
          opacity="0.9"
        />
        <rect
          x={toX(geometry.rightPassiveX) - gageLengthPx / 2}
          y={activeTopY}
          width={gageLengthPx}
          height={gageHeightPx}
          rx="2"
          fill="#cbd5e1"
          opacity="0.9"
        />

        <rect x={beamLeft - 32} y={beamTop - 6} width="24" height={beamBottom - beamTop + 12} fill="url(#binocularHatch)" stroke="#475569" strokeWidth="1.5" />
        <line x1={beamRight - 24} y1={beamTop - 28} x2={beamRight - 24} y2={beamTop + 22} stroke="#dc2626" strokeWidth="2.5" markerEnd="url(#binocularArrow)" />

        <text x={beamLeft - 34} y={beamTop - 14} fontSize="10" fontWeight="700" fill="#475569">Fixed support</text>
        <text x={beamRight - 24} y={beamTop - 36} textAnchor="middle" fontSize="10" fontWeight="700" fill="#dc2626">Load</text>
        <text x={toX(geometry.leftActiveX)} y={activeTopY - 6} textAnchor="middle" fontSize="10" fontWeight="800" fill="#c2410c">Active +ε</text>
        <text x={toX(geometry.rightActiveX)} y={beamBottom + 20} textAnchor="middle" fontSize="10" fontWeight="800" fill="#1d4ed8">Active -ε</text>

        <line x1={beamLeft} y1={beamBottom + 34} x2={beamRight} y2={beamBottom + 34} stroke="#475569" strokeWidth="1.5" />
        <line x1={beamLeft} y1={beamBottom + 26} x2={beamLeft} y2={beamBottom + 42} stroke="#475569" strokeWidth="1.5" />
        <line x1={beamRight} y1={beamBottom + 26} x2={beamRight} y2={beamBottom + 42} stroke="#475569" strokeWidth="1.5" />
        <text x={(beamLeft + beamRight) / 2} y={beamBottom + 52} textAnchor="middle" fontSize="11" fontWeight="700" fill="#0f172a">
          Overall length = {formatDimension(geometry.totalLength, us)}
        </text>

        <line x1={beamLeft - 42} y1={beamTop} x2={beamLeft - 42} y2={beamBottom} stroke="#475569" strokeWidth="1.5" />
        <line x1={beamLeft - 50} y1={beamTop} x2={beamLeft - 34} y2={beamTop} stroke="#475569" strokeWidth="1.5" />
        <line x1={beamLeft - 50} y1={beamBottom} x2={beamLeft - 34} y2={beamBottom} stroke="#475569" strokeWidth="1.5" />
        <text x={beamLeft - 56} y={(beamTop + beamBottom) / 2} textAnchor="middle" fontSize="11" fontWeight="700" fill="#0f172a" transform={`rotate(-90 ${beamLeft - 56} ${(beamTop + beamBottom) / 2})`}>
          Height = {formatDimension(geometry.beamHeight, us)}
        </text>

        <line x1={leftHoleX} y1={beamTop - 48} x2={rightHoleX} y2={beamTop - 48} stroke="#475569" strokeWidth="1.5" />
        <line x1={leftHoleX} y1={beamTop - 56} x2={leftHoleX} y2={beamTop - 40} stroke="#475569" strokeWidth="1.5" />
        <line x1={rightHoleX} y1={beamTop - 56} x2={rightHoleX} y2={beamTop - 40} stroke="#475569" strokeWidth="1.5" />
        <text x={(leftHoleX + rightHoleX) / 2} y={beamTop - 58} textAnchor="middle" fontSize="11" fontWeight="700" fill="#0f172a">
          Hole spacing = {formatDimension(geometry.holeSpacing, us)}
        </text>

        <line x1={rightHoleX + holeRadiusPx + 20} y1={centerY} x2={rightHoleX + 20} y2={centerY} stroke="#475569" strokeWidth="1.5" />
        <line x1={rightHoleX + 20} y1={centerY} x2={rightHoleX + 20} y2={slotTop} stroke="#475569" strokeWidth="1.5" />
        <text x={rightHoleX + holeRadiusPx + 22} y={centerY - 8} fontSize="11" fontWeight="700" fill="#0f172a">
          R = {formatDimension(geometry.radius, us)}
        </text>

        <line x1={leftHoleX - holeRadiusPx - 28} y1={slotTop} x2={leftHoleX - holeRadiusPx - 28} y2={beamTop} stroke="#475569" strokeWidth="1.5" />
        <line x1={leftHoleX - holeRadiusPx - 36} y1={slotTop} x2={leftHoleX - holeRadiusPx - 20} y2={slotTop} stroke="#475569" strokeWidth="1.5" />
        <line x1={leftHoleX - holeRadiusPx - 36} y1={beamTop} x2={leftHoleX - holeRadiusPx - 20} y2={beamTop} stroke="#475569" strokeWidth="1.5" />
        <text x={leftHoleX - holeRadiusPx - 42} y={(slotTop + beamTop) / 2} textAnchor="middle" fontSize="11" fontWeight="700" fill="#0f172a" transform={`rotate(-90 ${leftHoleX - holeRadiusPx - 42} ${(slotTop + beamTop) / 2})`}>
          t = {formatDimension(geometry.minThickness, us)}
        </text>

        <rect x={topLeft} y={topTop} width={geometry.totalLength * topScale} height={topHeight} fill="#ffffff" stroke="#334155" strokeWidth="2" />
        <rect
          x={topToX(geometry.leftActiveX) - (geometry.gageLength * topScale) / 2}
          y={topTop + 5}
          width={geometry.gageLength * topScale}
          height={topHeight - 10}
          fill="#f97316"
          opacity="0.78"
        />
        <rect
          x={topToX(geometry.rightActiveX) - (geometry.gageLength * topScale) / 2}
          y={topTop + 5}
          width={geometry.gageLength * topScale}
          height={topHeight - 10}
          fill="#2563eb"
          opacity="0.78"
        />
        <line x1={topToX(geometry.xMin)} y1={topTop + topHeight + 26} x2={topToX(geometry.xMax)} y2={topTop + topHeight + 26} stroke="#475569" strokeWidth="1.5" />
        <line x1={topToX(geometry.xMin)} y1={topTop + topHeight + 18} x2={topToX(geometry.xMin)} y2={topTop + topHeight + 34} stroke="#475569" strokeWidth="1.5" />
        <line x1={topToX(geometry.xMax)} y1={topTop + topHeight + 18} x2={topToX(geometry.xMax)} y2={topTop + topHeight + 34} stroke="#475569" strokeWidth="1.5" />
        <text x={topView.x + topView.w / 2} y={topTop + topHeight + 44} textAnchor="middle" fontSize="11" fontWeight="700" fill="#0f172a">
          Width = {formatDimension(geometry.beamWidth, us)}
        </text>

        <rect x={detailView.x} y={detailView.y} width={detailView.w} height={detailView.h} fill="#ffffff" stroke="#cbd5e1" strokeDasharray="5 4" />
        <text x={detailView.x + 12} y={detailView.y + 16} fontSize="10" fontWeight="800" fill="#475569" letterSpacing="0.16em">
          GAGE LAYOUT
        </text>
        <text x={detailView.x + 12} y={detailView.y + 34} fontSize="10" fill="#334155">
          Active gages straddle the highest bending ligaments.
        </text>
        <text x={detailView.x + 12} y={detailView.y + 48} fontSize="10" fill="#334155">
          Passive gages sit on the opposite surfaces for bridge completion.
        </text>
      </svg>
    </div>
  )
}
