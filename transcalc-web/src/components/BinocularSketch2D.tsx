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
  const plotHeight = 120; // Height for the strain plot
  
  // 1. Scene scaling
  const mmToPx = 2.5;

  // 2. Geometric Params
  const L_mm = p(params, 'totalLength', p(params, 'distHoles', 100) + 40);
  const H_mm = p(params, 'beamHeight', 50);
  const R_mm = p(params, 'radius', 12);
  const s_mm = p(params, 'distHoles', 60);
  const t_mm = p(params, 'minThick', 4);
  const cutH_mm = p(params, 'cutThick', 4);
  const mod_GPa = p(params, 'modulus', 200);
  const width_mm = p(params, 'beamWidth', 25);
  const load_N = p(params, 'load', 100);
  const gageLen_mm = p(params, 'gageLen', 5);

  const holeCenterOffset = Math.max(0, (H_mm / 2) - t_mm - R_mm);

  const L = L_mm * mmToPx;
  const H = H_mm * mmToPx;
  const R = R_mm * mmToPx;
  const s = s_mm * mmToPx;
  const hOff = holeCenterOffset * mmToPx;
  const cutH = cutH_mm * mmToPx;

  const centerX = width / 2;
  const centerY = height / 2;
  
  const leftX = centerX - s / 2;
  const rightX = centerX + s / 2;

  // --- Bridge Configuration Support ---
  // Mapping placeholder bridgeConfig values to actual multiplier logic
  // 0: Full Bending (4 active arms ε, -ε, ε, -ε) -> Gain 4.0 relative to ε/4
  // 1: Half Bending (2 active arms ε, -ε) -> Gain 2.0 relative to ε/4
  // 2: Poisson Full (2 active + 2 poisson ν) -> Gain 2(1+ν) relative to ε/4
  // 3: Quarter Bridge (1 active arm ε) -> Gain 1.0 relative to ε/4
  const bridgeConfig = p(params, 'bridgeConfig', 0);
  const poisson = p(params, 'poisson', 0.3);
  
  let bridgeGain = 4.0; // Default Full Bending
  let bridgeName = "Full Bending Bridge";
  
  if (bridgeConfig === 1) { bridgeGain = 2.0; bridgeName = "Half Bending Bridge"; }
  else if (bridgeConfig === 2) { bridgeGain = 2.0 * (1 + poisson); bridgeName = "Poisson Full Bridge"; }
  else if (bridgeConfig === 3) { bridgeGain = 1.0; bridgeName = "Quarter Bridge"; }

  // --- Strain Plot Calculation ---
  // We plot strain vs X (distance from centerline) under the gages.
  // Centerline is at +/- s_mm/2. Gage extends +/- gageLen_mm/2 around that.
  const plotPoints = 50;
  const g = H_mm / 2 - (R_mm + t_mm);
  const K2 = H_mm / 2 - g;
  const K1 = 0; // Assuming load-hole-dist L_hd = 0 for standard binocular
  const E = mod_GPa * 1e9;
  const W = width_mm * 0.001;
  const F = load_N;
  const r_m = R_mm * 0.001;
  const s_m = s_mm * 0.001;
  const K2_m = K2 * 0.001;

  const calculateStrain = (x_rel_mm: number) => {
    const x_m = x_rel_mm * 0.001;
    const firstTerm = F / (E * W);
    const rSqMinXSq = Math.sqrt(Math.pow(r_m, 2) - Math.pow(x_m, 2));
    const denominator = K2_m - rSqMinXSq;
    const secondTerm = K1 / denominator;
    const thirdTerm = (3 * (s_m / 2 + x_m)) / Math.pow(denominator, 2);
    return (firstTerm * (secondTerm + thirdTerm)) * 1e6;
  };

  const strainData = Array.from({ length: plotPoints + 1 }, (_, i) => {
    const x_rel = -gageLen_mm/2 + (i * gageLen_mm / plotPoints);
    return { x: x_rel, y: calculateStrain(x_rel) };
  });

  const maxVal = Math.max(...strainData.map(d => Math.abs(d.y)), 1);
  const plotYScale = (plotHeight - 20) / (maxVal * 1.2);

  return (
    <div className="flex flex-col items-center bg-white p-4 rounded-lg shadow-sm border border-slate-200">
      <h4 className="text-sm font-bold text-slate-700 mb-2 uppercase tracking-wider">Binocular Flexure Profile</h4>
      <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} className="bg-slate-50 border border-slate-100 rounded">
        {/* Main Body Outline */}
        <rect 
          x={centerX - L/2} 
          y={centerY - H/2} 
          width={L} 
          height={H} 
          fill="none" 
          stroke="#475569" 
          strokeWidth="2" 
        />
        
        {/* Unified "O=O" path for full cross-slot pattern with variable cut thickness */}
        <path 
          d={`
            M ${leftX - R} ${centerY - hOff} 
            A ${R} ${R} 0 0 1 ${leftX + R} ${centerY - hOff}
            L ${leftX + R} ${centerY - cutH/2}
            L ${rightX - R} ${centerY - cutH/2}
            L ${rightX - R} ${centerY - hOff}
            A ${R} ${R} 0 0 1 ${rightX + R} ${centerY - hOff}
            L ${rightX + R} ${centerY + hOff}
            A ${R} ${R} 0 0 1 ${rightX - R} ${centerY + hOff}
            L ${rightX - R} ${centerY + cutH/2}
            L ${leftX + R} ${centerY + cutH/2}
            L ${leftX + R} ${centerY + hOff}
            A ${R} ${R} 0 0 1 ${leftX - R} ${centerY + hOff}
            Z
          `}
          fill="#ffffff" 
          stroke="#1e293b" 
          strokeWidth="2.5" 
        />

        {/* Labels/Annotations */}
        <g fill="#475569" fontSize="10" fontWeight="bold" fontFamily="sans-serif">
          <text x={centerX - L/2 + 5} y={centerY - H/2 - 10}>FIXED END</text>
          <text x={centerX + L/2 - 45} y={centerY - H/2 - 10}>LOAD END (P)</text>
          
          {/* Arrow for Load - Positioned at the right end of the beam */}
          <path 
            d={`M ${centerX + L/2 - 15} ${centerY - H/2 - 35} L ${centerX + L/2 - 15} ${centerY - H/2 - 5}`} 
            stroke="red" 
            strokeWidth="2" 
            fill="none" 
            markerEnd="url(#arrow)" 
          />
          <defs>
            <marker id="arrow" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
              <path d="M 0 0 L 10 5 L 0 10 z" fill="red" />
            </marker>
          </defs>
        </g>
      </svg>

      {/* Strain Plot */}
      <h4 className="text-sm font-bold text-gray-700 mt-6 mb-2 uppercase tracking-wider">Strain vs. Gage Offset</h4>
      <svg width={width} height={plotHeight} className="bg-white border border-gray-100 rounded">
        <defs>
          <linearGradient id="strainGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.2" />
            <stop offset="100%" stopColor="#3b82f6" stopOpacity="0.05" />
          </linearGradient>
        </defs>
        
        {/* Horizontal Axis (0 Strain) */}
        <line x1="40" y1={plotHeight/2} x2={width-20} y2={plotHeight/2} stroke="#ccc" strokeDasharray="4" />
        <text x="5" y={plotHeight/2 + 4} fontSize="9" fill="#999">0με</text>
        
        {/* Strain Curve Path (Area) */}
        <path
          d={`
            M ${40} ${plotHeight/2}
            ${strainData.map((d, i) => {
              const x = 40 + (i * (width - 60) / plotPoints);
              const y = plotHeight/2 - (d.y * plotYScale);
              return `L ${x} ${y}`;
            }).join(' ')}
            L ${width-20} ${plotHeight/2}
            Z
          `}
          fill="url(#strainGradient)"
        />

        {/* Strain Curve Path (Line) */}
        <path
          d={`
            M ${40} ${plotHeight/2 - (strainData[0].y) * plotYScale}
            ${strainData.map((d, i) => {
              const x = 40 + (i * (width - 60) / plotPoints);
              const y = plotHeight/2 - (d.y * plotYScale);
              return `L ${x} ${y}`;
            }).join(' ')}
          `}
          fill="none"
          stroke="#3b82f6"
          strokeWidth="2"
        />

        {/* Labels */}
        <text x="40" y={plotHeight - 5} fontSize="10" fill="#666" textAnchor="middle">-{gageLen_mm/2}mm</text>
        <text x={40 + (width - 60)/2} y={plotHeight - 5} fontSize="10" fill="#666" textAnchor="middle">0 (Centerline)</text>
        <text x={width - 20} y={plotHeight - 5} fontSize="10" fill="#666" textAnchor="middle">{gageLen_mm/2}mm</text>
        
        {/* Max Strain Label */}
        <text x="45" y="15" fontSize="10" fontWeight="bold" fill="#3b82f6">Max: {Math.round(maxVal)} με</text>
      </svg>
      <p className="text-[10px] text-gray-500 mt-2 italic">Strain profile across gage length at hinge location</p>

      {/* Strain Plot */}
      <div className="flex justify-between items-center mt-6 mb-2">
        <h4 className="text-sm font-bold text-gray-700 uppercase tracking-wider">Strain vs. Offset (με)</h4>
        <span className="text-[10px] font-medium px-2 py-1 bg-blue-50 text-blue-600 rounded-full border border-blue-100 shadow-sm">
          {bridgeName}
        </span>
      </div>
      <svg width={width} height={plotHeight} className="bg-white border border-gray-100 rounded">
        <defs>
          <linearGradient id="strainGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.2" />
            <stop offset="100%" stopColor="#3b82f6" stopOpacity="0.05" />
          </linearGradient>
        </defs>
        
        {/* Horizontal Axis (0 Strain) */}
        <line x1="40" y1={plotHeight/2} x2={width-20} y2={plotHeight/2} stroke="#ccc" strokeDasharray="4" />
        <text x="5" y={plotHeight/2 + 4} fontSize="9" fill="#999">0με</text>
        
        {/* Strain Curve Path (Area) */}
        <path
          d={`
            M ${40} ${plotHeight/2}
            ${strainData.map((d, i) => {
              const xValue = 40 + (i * (width - 60) / plotPoints);
              const plotVal = d.y * bridgeGain;
              const yValue = plotHeight/2 - (plotVal * plotYScale);
              return `L ${xValue} ${yValue}`;
            }).join(' ')}
            L ${width-20} ${plotHeight/2}
            Z
          `}
          fill="url(#strainGradient)"
        />

        {/* Strain Curve Path (Line) */}
        <path
          d={`
            M ${40} ${plotHeight/2 - (strainData[0].y * bridgeGain) * plotYScale}
            ${strainData.map((d, i) => {
              const xValue = 40 + (i * (width - 60) / plotPoints);
              const plotVal = d.y * bridgeGain;
              const yValue = plotHeight/2 - (plotVal * plotYScale);
              return `L ${xValue} ${yValue}`;
            }).join(' ')}
          `}
          fill="none"
          stroke="#3b82f6"
          strokeWidth="2"
        />

        {/* Labels */}
        <text x="40" y={plotHeight - 5} fontSize="10" fill="#666" textAnchor="middle">-{gageLen_mm/2}mm</text>
        <text x={40 + (width - 60)/2} y={plotHeight - 5} fontSize="10" fill="#666" textAnchor="middle">0 (Centerline)</text>
        <text x={width - 20} y={plotHeight - 5} fontSize="10" fill="#666" textAnchor="middle">{gageLen_mm/2}mm</text>
        
        {/* Max Strain Label */}
        <text x="45" y="15" fontSize="10" fontWeight="bold" fill="#3b82f6">Effective: {Math.round(maxVal * bridgeGain)} με</text>
      </svg>
      <p className="text-[10px] text-gray-500 mt-2 italic text-center w-full">Total composite strain profile factoring in {bridgeName}</p>
    </div>
  );
};
