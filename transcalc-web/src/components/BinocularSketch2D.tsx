import React from 'react';

// Helper for param retrieval
function p(params: Record<string, number>, key: string, fallback: number): number {
  const v = params[key]
  return Number.isFinite(v) && v > 0 ? v : fallback
}

/**
 * Renders a 2D SVG sketch of a Binocular Beam Load Cell based on the provided H-pattern flexure.
 */
export const BinocularSketch2D: React.FC<{ params: any; us?: boolean }> = ({ params, us }) => {
  const width = 400;
  const height = 200;
  
  // 1. Scene scaling (Matches 3D logic)
  const mmToPx = 2.5; // Scale for the sketch

  // 2. Geometric Params
  const L_mm = p(params, 'length', 60);
  const H_mm = p(params, 'height', 50);
  const R_mm = p(params, 'radius', 12);
  const s_mm = p(params, 'slotSpacing', 20);
  const t_mm = p(params, 'webThickness', 4);

  const L = L_mm * mmToPx;
  const H = H_mm * mmToPx;
  const R = R_mm * mmToPx;
  const s = s_mm * mmToPx;
  const t = t_mm * mmToPx;

  const centerX = width / 2;
  const centerY = height / 2;
  
  const leftX = centerX - s / 2;
  const rightX = centerX + s / 2;

  return (
    <div className="flex flex-col items-center bg-white p-4 rounded-lg shadow-sm border border-gray-200">
      <h4 className="text-sm font-bold text-gray-700 mb-2 uppercase tracking-wider">Binocular Flexure Profile</h4>
      <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} className="bg-gray-50 border border-gray-100 rounded">
        {/* Main Body Outline */}
        <rect 
          x={centerX - L/2} 
          y={centerY - H/2} 
          width={L} 
          height={H} 
          fill="none" 
          stroke="#333" 
          strokeWidth="2" 
        />
        
        {/* Left Vertical Slot (Binocular Hole 1 - "Pill" shape) */}
        <path 
          d={`M ${leftX - R} ${centerY - R} 
             L ${leftX - R} ${centerY + R}
             A ${R} ${R} 0 0 0 ${leftX + R} ${centerY + R} 
             L ${leftX + R} ${centerY - R} 
             A ${R} ${R} 0 0 0 ${leftX - R} ${centerY - R} 
             Z`} 
          fill="#fff" stroke="#000" strokeWidth="2.5" 
        />
        
        {/* Right Vertical Slot (Binocular Hole 2 - "Pill" shape) */}
        <path 
          d={`M ${rightX - R} ${centerY - R} 
             L ${rightX - R} ${centerY + R}
             A ${R} ${R} 0 0 0 ${rightX + R} ${centerY + R} 
             L ${rightX + R} ${centerY - R} 
             A ${R} ${R} 0 0 0 ${rightX - R} ${centerY - R} 
             Z`} 
          fill="#fff" stroke="#000" strokeWidth="2.5" 
        />
        
        {/* Connecting Web (The horizontal bar of the 'H') */}
        <rect 
          x={leftX + R} 
          y={centerY - t/2} 
          width={s - 2*R} 
          height={t} 
          fill="#fff" 
        />
        <line x1={leftX + R} y1={centerY - t/2} x2={rightX - R} y2={centerY - t/2} stroke="#000" strokeWidth="2.5" />
        <line x1={leftX + R} y1={centerY + t/2} x2={rightX - R} y2={centerY + t/2} stroke="#000" strokeWidth="2.5" />


        {/* Labels/Annotations */}
        <g fill="#666" fontSize="10" fontFamily="sans-serif">
          <text x="30" y="15">FIXED END (Wall)</text>
          <text x={width-75} y={15}>LOAD END (P)</text>
          
          {/* Arrow for Load */}
          <path d={`M ${width-35} 40 L ${width-35} 70`} stroke="red" strokeWidth="2" fill="none" markerEnd="url(#arrow)" />
          <defs>
            <marker id="arrow" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
              <path d="M 0 0 L 10 5 L 0 10 z" fill="red" />
            </marker>
          </defs>
        </g>
      </svg>
    </div>
  );
};
