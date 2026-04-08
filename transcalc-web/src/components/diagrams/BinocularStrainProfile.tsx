import React, { useMemo } from 'react';

/**
 * Renders a high-fidelity strain profile chart for binocular load cells.
 * Displays strain (με) vs distance from gage centerline (mm).
 */
interface StrainProfileChartProps {
  maxStrain: number;      // peak strain in microstrains
  avgStrain: number;      // effective/weighted strain
  edgeStrain: number;     // strain at ±gageLength/2
  gageLengthMm: number;
  label: string;
  color?: string;
}

export const BinocularStrainProfile: React.FC<StrainProfileChartProps> = ({
  maxStrain,
  avgStrain,
  edgeStrain,
  gageLengthMm,
  label,
  color = '#3b82f6' // blue-500
}) => {
  const width = 300;
  const height = 120;
  const padding = { top: 20, right: 30, bottom: 25, left: 45 };
  
  const points = useMemo(() => {
    const segments = 20;
    const curvePoints: [number, number][] = [];
    const halfGL = gageLengthMm / 2;
    
    // Scale factor to ensure entire curve is shown with headroom
    const yMaxScale = maxStrain * 1.35; 
    
    // Simple parabolic approximation for visualization
    for (let i = 0; i <= segments; i++) {
        const x = -halfGL + (i / segments) * gageLengthMm;
        const normalizedX = x / halfGL; // -1 to 1
        // Strain(x) = max - (max-edge)*(x/halfGL)^2
        const s = maxStrain - (maxStrain - edgeStrain) * Math.pow(normalizedX, 2);
        
        const px = padding.left + (i / segments) * (width - padding.left - padding.right);
        const py = height - padding.bottom - (s / yMaxScale) * (height - padding.top - padding.bottom);
        curvePoints.push([px, py]);
    }
    return { pointsString: curvePoints.map(p => p.join(',')).join(' '), yMaxScale };
  }, [maxStrain, edgeStrain, gageLengthMm, width, height, padding]);

  const avgLineY = height - padding.bottom - (avgStrain / points.yMaxScale) * (height - padding.top - padding.bottom);

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
      <div className="flex justify-between items-center mb-2">
        <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{label}</h4>
        <span className="text-[10px] font-mono text-slate-400">GL: {gageLengthMm}mm</span>
      </div>
      
      <svg width="100%" height={height} viewBox={`0 0 ${width} ${height}`} className="overflow-visible">
        {/* Grids / Axes */}
        <line x1={padding.left} y1={height - padding.bottom} x2={width - padding.right} y2={height - padding.bottom} stroke="#e2e8f0" strokeWidth="1.5" />
        <line x1={padding.left} y1={padding.top} x2={padding.left} y2={height - padding.bottom} stroke="#e2e8f0" strokeWidth="1.5" />
        
        {/* Horizontal Guide Lines */}
        <line x1={padding.left} y1={padding.top} x2={width - padding.right} y2={padding.top} stroke="#f1f5f9" strokeWidth="1" strokeDasharray="3,3" />

        {/* Labels - Y Axis (Microstrain) */}
        <text x={padding.left - 8} y={height - padding.bottom} textAnchor="end" dominantBaseline="middle" className="text-[8px] fill-slate-400 font-mono">0</text>
        <text x={padding.left - 8} y={height - padding.bottom - (0.5 * maxStrain / points.yMaxScale) * (height - padding.top - padding.bottom)} textAnchor="end" dominantBaseline="middle" className="text-[8px] fill-slate-400 font-mono">{Math.round(maxStrain*0.5)}</text>
        <text x={padding.left - 8} y={height - padding.bottom - (maxStrain / points.yMaxScale) * (height - padding.top - padding.bottom)} textAnchor="end" dominantBaseline="middle" className="text-[8px] fill-slate-500 font-mono font-bold">{Math.round(maxStrain)}</text>
        
        {/* Y Axis Label */}
        <text 
          transform={`rotate(-90, ${padding.left - 32}, ${height/2})`}
          x={padding.left - 32} 
          y={height/2} 
          textAnchor="middle" 
          className="text-[7px] font-bold fill-slate-300 uppercase tracking-tighter"
        >
          Strain (με)
        </text>

        {/* Labels - X Axis (Dist from center) */}
        <text x={padding.left} y={height - 5} textAnchor="middle" className="text-[8px] fill-slate-400 font-mono">-{gageLengthMm/2}</text>
        <text x={padding.left + (width - padding.left - padding.right)/2} y={height - 5} textAnchor="middle" className="text-[8px] fill-slate-400 font-mono">0</text>
        <text x={width - padding.right} y={height - 5} textAnchor="middle" className="text-[8px] fill-slate-400 font-mono">{gageLengthMm/2}</text>

        {/* Average/Effective Dashed Line */}
        <line 
            x1={padding.left} 
            y1={avgLineY} 
            x2={width - padding.right} 
            y2={avgLineY} 
            stroke={color} 
            strokeWidth="1" 
            strokeDasharray="4,2" 
            className="opacity-50"
        />
        
        {/* Main Strain Curve */}
        <polyline
          fill="none"
          stroke={color}
          strokeWidth="2.5"
          points={points.pointsString}
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* Value Callout Label (High-Contrast) */}
        <g transform={`translate(${padding.left + (width - padding.left - padding.right)/2}, ${avgLineY - 8})`}>
          <text 
              textAnchor="middle" 
              className="text-[9px] font-black fill-slate-800"
          >
            {label.includes('Effective') ? `Effective: ${Math.round(avgStrain)}` : `Max: ${Math.round(maxStrain)}`} με
          </text>
        </g>
      </svg>
    </div>
  );
};
