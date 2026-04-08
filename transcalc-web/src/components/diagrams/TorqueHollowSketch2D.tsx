import React from 'react';

interface TorqueHollowSketchProps {
  outerDiameter: number;
  innerDiameter: number;
  appliedTorque: number;
  us: boolean;
}

export const TorqueHollowSketch2D: React.FC<TorqueHollowSketchProps> = ({
  outerDiameter,
  innerDiameter,
  appliedTorque,
  us
}) => {
  const width = 300;
  const height = 250;
  const centerX = width / 2;
  const centerY = height / 2;
  
  // Scale factor: assume max diameter is ~50mm for view purposes
  const scale = 80 / (outerDiameter || 30);
  const Ro = (outerDiameter / 2) * scale;
  const Ri = (innerDiameter / 2) * scale;
  
  return (
    <div className="flex flex-col items-center bg-white p-4 rounded-lg shadow-sm border border-slate-200">
      <h4 className="text-sm font-bold text-slate-700 mb-2 uppercase tracking-wider">Shaft Cross-Section</h4>
      <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} className="bg-slate-50 border border-slate-100 rounded">
        {/* Outer Circle */}
        <circle 
          cx={centerX} 
          cy={centerY} 
          r={Ro} 
          fill="#e2e8f0" 
          stroke="#475569" 
          strokeWidth="2" 
        />
        
        {/* Inner Circle (Hollow part) */}
        <circle 
          cx={centerX} 
          cy={centerY} 
          r={Ri} 
          fill="#f8fafc" 
          stroke="#475569" 
          strokeWidth="1.5" 
          strokeDasharray="4,2"
        />

        {/* 45 Degree Shear Gages (Four Gages on Outer Surface) */}
        <g stroke="#1e293b" strokeWidth="1">
           {/* Gage 1: Right Side (45 deg) */}
           <rect x={centerX + Ro - 4} y={centerY - 8} width="8" height="16" fill="#fef08a" transform={`rotate(45, ${centerX + Ro}, ${centerY})`} />
           <line x1={centerX + Ro} y1={centerY - 6} x2={centerX + Ro} y2={centerY + 6} stroke="#dc2626" strokeWidth="1.5" transform={`rotate(45, ${centerX + Ro}, ${centerY})`} />
           
           {/* Gage 2: Left Side (-45 deg) */}
           <rect x={centerX - Ro - 4} y={centerY - 8} width="8" height="16" fill="#fef08a" transform={`rotate(-45, ${centerX - Ro}, ${centerY})`} />
           <line x1={centerX - Ro} y1={centerY - 6} x2={centerX - Ro} y2={centerY + 6} stroke="#dc2626" strokeWidth="1.5" transform={`rotate(-45, ${centerX - Ro}, ${centerY})`} />

           {/* Gage 3: Top Side (45 deg) */}
           <rect x={centerX - 4} y={centerY - Ro - 8} width="8" height="16" fill="#fef08a" transform={`rotate(45, ${centerX}, ${centerY - Ro})`} />
           <line x1={centerX} y1={centerY - Ro - 6} x2={centerX} y2={centerY - Ro + 6} stroke="#dc2626" strokeWidth="1.5" transform={`rotate(45, ${centerX}, ${centerY - Ro})`} />

           {/* Gage 4: Bottom Side (-45 deg) */}
           <rect x={centerX - 4} y={centerY + Ro - 8} width="8" height="16" fill="#fef08a" transform={`rotate(-45, ${centerX}, ${centerY + Ro})`} />
           <line x1={centerX} y1={centerY + Ro - 6} x2={centerX} y2={centerY + Ro + 6} stroke="#dc2626" strokeWidth="1.5" transform={`rotate(-45, ${centerX}, ${centerY + Ro})`} />
        </g>

        {/* Dimension Lines */}
        <g stroke="#94a3b8" strokeWidth="1">
           {/* OD Label */}
           <line x1={centerX - Ro} y1={centerY + Ro + 20} x2={centerX + Ro} y2={centerY + Ro + 20} />
           <line x1={centerX - Ro} y1={centerY + Ro + 15} x2={centerX - Ro} y2={centerY + Ro + 25} />
           <line x1={centerX + Ro} y1={centerY + Ro + 15} x2={centerX + Ro} y2={centerY + Ro + 25} />
           
           {/* ID Label */}
           <line x1={centerX - Ri} y1={centerY} x2={centerX + Ri} y2={centerY} strokeDasharray="2,2" />
        </g>

        {/* Torque Indicator (Curved Arrow above the shaft)
            Positive = clockwise (arc left→right, arrow at right end)
            Negative = counterclockwise (arc right→left, arrow at left end) */}
        {(() => {
          const ax1 = centerX - Ro - 10, ax2 = centerX + Ro + 10;
          const ay = centerY - Ro - 30;
          const rx = Ro + 40, ry = 40;
          const cw = appliedTorque >= 0;
          // sweep-flag=1 is clockwise in SVG; swap endpoints + flip sweep for CCW
          const d = cw
            ? `M ${ax1} ${ay} A ${rx} ${ry} 0 0 1 ${ax2} ${ay}`
            : `M ${ax2} ${ay} A ${rx} ${ry} 0 0 0 ${ax1} ${ay}`;
          return (
            <path d={d} fill="none" stroke="#2563eb" strokeWidth="3" markerEnd="url(#torque-arrow)" />
          );
        })()}

        <g fill="#475569" fontSize="10" fontWeight="bold" fontFamily="sans-serif" textAnchor="middle">
          <text x={centerX} y={centerY + Ro + 35}>OD: {outerDiameter}{us ? '"' : 'mm'}</text>
          <text x={centerX} y={centerY - 12}>ID: {innerDiameter}{us ? '"' : 'mm'}</text>
          <text x={centerX} y={30} fill="#2563eb" fontSize="12">TORQUE: {appliedTorque} {us ? 'in-lb' : 'N·m'}</text>
        </g>

        <defs>
          <marker id="torque-arrow" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="4" markerHeight="4" orient="auto-start-reverse">
            <path d="M 0 0 L 10 5 L 0 10 z" fill="#2563eb" />
          </marker>
        </defs>
      </svg>
    </div>
  );
};
