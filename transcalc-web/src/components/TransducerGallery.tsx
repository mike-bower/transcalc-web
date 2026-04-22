/**
 * TransducerGallery — card grid home screen.
 * Groups all transducer design calculators and compensation tools by category.
 * Each card has a mini SVG thumbnail and opens its calculator on click.
 */

interface GalleryCard {
  key: string
  title: string
  description: string
  icon: React.ReactNode
}

interface GallerySection {
  category: string
  color: string          // Tailwind text color for category label
  borderColor: string    // Tailwind ring color for card hover
  bgHover: string
  cards: GalleryCard[]
}

// ── Mini SVG icons ────────────────────────────────────────────────────────────

const dim = { width: 64, height: 48 }
const S = (children: React.ReactNode) => (
  <svg {...dim} viewBox="0 0 64 48" fill="none" xmlns="http://www.w3.org/2000/svg">
    {children}
  </svg>
)

const icons: Record<string, React.ReactNode> = {
  bbcant: S(<>
    <rect x={4} y={20} width={4} height={16} rx={1} fill="#94a3b8" />
    <rect x={8} y={26} width={38} height={5} rx={1} fill="#64748b" />
    <line x1={46} y1={20} x2={46} y2={14} stroke="#ef4444" strokeWidth={2} markerEnd="url(#a)" />
    <path d="M44 14 L48 14" stroke="#ef4444" strokeWidth={1.5} />
    <defs><marker id="a" markerWidth="5" markerHeight="5" refX="2.5" refY="2.5" orient="auto"><path d="M0,0 L5,2.5 L0,5 Z" fill="#ef4444"/></marker></defs>
  </>),

  bino: S(<>
    <rect x={6} y={14} width={52} height={20} rx={1} fill="#64748b" />
    <ellipse cx={22} cy={24} rx={7} ry={7} fill="#e2e8f0" />
    <ellipse cx={42} cy={24} rx={7} ry={7} fill="#e2e8f0" />
    <line x1={32} y1={4} x2={32} y2={14} stroke="#ef4444" strokeWidth={2} />
    <path d="M29 6 L35 6" stroke="#ef4444" strokeWidth={1.5} />
  </>),

  dualbb: S(<>
    <rect x={8} y={16} width={48} height={5} rx={1} fill="#64748b" />
    <rect x={8} y={27} width={48} height={5} rx={1} fill="#64748b" />
    <line x1={32} y1={6} x2={32} y2={16} stroke="#ef4444" strokeWidth={2} />
    <line x1={32} y1={32} x2={32} y2={42} stroke="#ef4444" strokeWidth={2} />
  </>),

  revbb: S(<>
    {/* Left fixed block */}
    <rect x={1} y={5} width={13} height={38} rx={1} fill="#94a3b8" stroke="#64748b" strokeWidth={0.8}/>
    <line x1={4}  y1={5}  x2={14} y2={13} stroke="#64748b" strokeWidth={0.8}/>
    <line x1={1}  y1={10} x2={14} y2={21} stroke="#64748b" strokeWidth={0.8}/>
    <line x1={1}  y1={17} x2={14} y2={29} stroke="#64748b" strokeWidth={0.8}/>
    <line x1={1}  y1={25} x2={14} y2={37} stroke="#64748b" strokeWidth={0.8}/>
    <line x1={1}  y1={33} x2={10} y2={43} stroke="#64748b" strokeWidth={0.8}/>
    {/* Right fixed block */}
    <rect x={50} y={5} width={13} height={38} rx={1} fill="#94a3b8" stroke="#64748b" strokeWidth={0.8}/>
    <line x1={50} y1={10} x2={57} y2={5}  stroke="#64748b" strokeWidth={0.8}/>
    <line x1={50} y1={18} x2={63} y2={7}  stroke="#64748b" strokeWidth={0.8}/>
    <line x1={50} y1={26} x2={63} y2={15} stroke="#64748b" strokeWidth={0.8}/>
    <line x1={50} y1={34} x2={63} y2={23} stroke="#64748b" strokeWidth={0.8}/>
    <line x1={50} y1={40} x2={63} y2={31} stroke="#64748b" strokeWidth={0.8}/>
    <line x1={54} y1={43} x2={63} y2={35} stroke="#64748b" strokeWidth={0.8}/>
    {/* Upper beam arm */}
    <rect x={14} y={18} width={36} height={5} rx={0.5} fill="#64748b"/>
    {/* Lower beam arm */}
    <rect x={14} y={25} width={36} height={5} rx={0.5} fill="#64748b"/>
    {/* Slot between arms */}
    <rect x={14} y={23} width={36} height={2} fill="#dce8f5"/>
    {/* T gage markers near supports */}
    <rect x={16} y={16} width={7} height={3} fill="#c04010" opacity={0.85}/>
    <rect x={41} y={16} width={7} height={3} fill="#c04010" opacity={0.85}/>
    {/* Load P — downward at center */}
    <line x1={32} y1={3} x2={32} y2={18} stroke="#ef4444" strokeWidth={2}/>
    <polygon points="32,18 29,12 35,12" fill="#ef4444"/>
  </>),

  sbbeam: S(<>
    <path d="M10 38 C10 28 24 28 24 20 C24 12 38 12 38 20 C38 28 52 28 52 18"
      stroke="#64748b" strokeWidth={5} strokeLinecap="round" fill="none" />
    <line x1={32} y1={4} x2={32} y2={18} stroke="#ef4444" strokeWidth={2} />
  </>),

  sqrcol: S(<>
    <rect x={22} y={8} width={20} height={32} rx={1} fill="#64748b" />
    <line x1={32} y1={2} x2={32} y2={8} stroke="#ef4444" strokeWidth={2} />
    <line x1={32} y1={40} x2={32} y2={46} stroke="#ef4444" strokeWidth={2} />
    <path d="M29 4 L35 4" stroke="#ef4444" strokeWidth={1.5} />
    <path d="M29 44 L35 44" stroke="#ef4444" strokeWidth={1.5} />
  </>),

  rndsldc: S(<>
    <ellipse cx={32} cy={12} rx={12} ry={4} fill="#94a3b8" />
    <rect x={20} y={12} width={24} height={24} fill="#64748b" />
    <ellipse cx={32} cy={36} rx={12} ry={4} fill="#475569" />
    <line x1={32} y1={2} x2={32} y2={8} stroke="#ef4444" strokeWidth={2} />
    <line x1={32} y1={40} x2={32} y2={46} stroke="#ef4444" strokeWidth={2} />
  </>),

  rndhlwc: S(<>
    <ellipse cx={32} cy={12} rx={12} ry={4} fill="#94a3b8" />
    <rect x={20} y={12} width={24} height={24} fill="#64748b" />
    <rect x={26} y={14} width={12} height={22} fill="#e2e8f0" />
    <ellipse cx={32} cy={36} rx={12} ry={4} fill="#475569" />
    <line x1={32} y1={2} x2={32} y2={8} stroke="#ef4444" strokeWidth={2} />
    <line x1={32} y1={40} x2={32} y2={46} stroke="#ef4444" strokeWidth={2} />
  </>),

  shrsqr: S(<>
    <rect x={8} y={10} width={48} height={28} rx={1} fill="#64748b" />
    <rect x={18} y={16} width={28} height={16} rx={1} fill="#e2e8f0" />
    <line x1={4} y1={24} x2={16} y2={24} stroke="#ef4444" strokeWidth={2} />
    <path d="M14 21 L20 24 L14 27 Z" fill="#ef4444" />
  </>),

  shrrnd: S(<>
    <rect x={8} y={10} width={48} height={28} rx={1} fill="#64748b" />
    <ellipse cx={32} cy={24} rx={12} ry={12} fill="#e2e8f0" />
    <line x1={4} y1={24} x2={20} y2={24} stroke="#ef4444" strokeWidth={2} />
    <path d="M18 21 L24 24 L18 27 Z" fill="#ef4444" />
  </>),

  shrrnd1: S(<>
    <path d="M10 38 C10 28 24 28 24 20 C24 12 38 12 38 20 C38 28 52 28 52 18"
      stroke="#64748b" strokeWidth={8} strokeLinecap="round" fill="none" />
    <line x1={4} y1={28} x2={18} y2={28} stroke="#ef4444" strokeWidth={2} />
    <path d="M16 25 L22 28 L16 31 Z" fill="#ef4444" />
  </>),

  sqrtor: S(<>
    <rect x={20} y={8} width={24} height={32} rx={1} fill="#64748b" />
    <path d="M48 16 C58 16 58 32 48 32" stroke="#ef4444" strokeWidth={2} fill="none" />
    <path d="M45 30 L50 33 L47 37 Z" fill="#ef4444" />
  </>),

  rndsld: S(<>
    <ellipse cx={32} cy={12} rx={12} ry={4} fill="#94a3b8" />
    <rect x={20} y={12} width={24} height={24} fill="#64748b" />
    <ellipse cx={32} cy={36} rx={12} ry={4} fill="#475569" />
    <path d="M52 20 C60 20 60 32 52 32" stroke="#ef4444" strokeWidth={2} fill="none" />
    <path d="M49 30 L54 33 L51 37 Z" fill="#ef4444" />
  </>),

  rndhlw: S(<>
    <ellipse cx={32} cy={12} rx={12} ry={4} fill="#94a3b8" />
    <rect x={20} y={12} width={24} height={24} fill="#64748b" />
    <rect x={26} y={14} width={12} height={22} fill="#e2e8f0" />
    <ellipse cx={32} cy={36} rx={12} ry={4} fill="#475569" />
    <path d="M52 20 C60 20 60 32 52 32" stroke="#ef4444" strokeWidth={2} fill="none" />
    <path d="M49 30 L54 33 L51 37 Z" fill="#ef4444" />
  </>),

  pressure: S(<>
    <ellipse cx={32} cy={36} rx={24} ry={5} fill="#64748b" />
    <path d="M8 36 Q8 10 32 10 Q56 10 56 36" fill="#94a3b8" />
    <line x1={32} y1={2} x2={32} y2={18} stroke="#ef4444" strokeWidth={2} />
    <path d="M29 5 L35 5" stroke="#ef4444" strokeWidth={1.5} />
  </>),

  jts: S(<>
    {/* Spoke-flexure disk top view */}
    <circle cx={32} cy={24} r={22} fill="#e2e8f0" stroke="#64748b" strokeWidth={1.5} />
    <circle cx={32} cy={24} r={8}  fill="#c8d8e8" stroke="#64748b" strokeWidth={1.5} />
    {/* 4 spokes */}
    <rect x={29} y={4}  width={6} height={20} rx={1} fill="#94a3b8" />
    <rect x={29} y={28} width={6} height={20} rx={1} fill="#94a3b8" />
    <rect x={4}  y={21} width={20} height={6} rx={1} fill="#94a3b8" />
    <rect x={40} y={21} width={20} height={6} rx={1} fill="#94a3b8" />
    {/* Gage markers at spoke roots */}
    <rect x={29} y={20} width={6} height={3} fill="#d97706" opacity="0.9" />
    <rect x={29} y={29} width={6} height={3} fill="#d97706" opacity="0.9" />
    <rect x={20} y={21} width={3} height={6} fill="#d97706" opacity="0.9" />
    <rect x={39} y={21} width={3} height={6} fill="#d97706" opacity="0.9" />
  </>),

  sixaxisft: S(<>
    {/* Cross-beam top view */}
    <rect x={28} y={4} width={8} height={40} rx={1} fill="#64748b" />
    <rect x={4} y={20} width={56} height={8} rx={1} fill="#64748b" />
    <circle cx={32} cy={24} r={8} fill="#e2e8f0" stroke="#64748b" strokeWidth={1.5} />
    <circle cx={32} cy={48} r={20} fill="none" stroke="#94a3b8" strokeWidth={1.5} />
    {/* Gage markers */}
    <rect x={27} y={7} width={10} height={4} fill="#d97706" opacity="0.85" />
    <rect x={27} y={37} width={10} height={4} fill="#d97706" opacity="0.85" />
    <rect x={7} y={22} width={4} height={4} fill="#d97706" opacity="0.85" />
    <rect x={53} y={22} width={4} height={4} fill="#d97706" opacity="0.85" />
  </>),

  hexapod: S(<>
    {/* Hexapod top-view: 2 rings + 6 strut projections + 3 amber + 6 teal dots */}
    <circle cx={32} cy={24} r={18} fill="none" stroke="#d97706" strokeWidth={1.2} strokeDasharray="4 2" opacity={0.8} />
    <circle cx={32} cy={24} r={12} fill="none" stroke="#0891b2" strokeWidth={1.2} strokeDasharray="3 2" opacity={0.8} />
    {/* 3 strut pairs as lines from outer to inner ring */}
    <line x1={32} y1={6}  x2={28} y2={13} stroke="#64748b" strokeWidth={1} />
    <line x1={32} y1={6}  x2={36} y2={13} stroke="#64748b" strokeWidth={1} />
    <line x1={16} y1={38} x2={20} y2={30} stroke="#64748b" strokeWidth={1} />
    <line x1={16} y1={38} x2={24} y2={35} stroke="#64748b" strokeWidth={1} />
    <line x1={48} y1={38} x2={44} y2={30} stroke="#64748b" strokeWidth={1} />
    <line x1={48} y1={38} x2={40} y2={35} stroke="#64748b" strokeWidth={1} />
    {/* 3 top attach points (amber) */}
    <circle cx={32} cy={6}  r={3} fill="#d97706" />
    <circle cx={16} cy={38} r={3} fill="#d97706" />
    <circle cx={48} cy={38} r={3} fill="#d97706" />
    {/* 6 bottom attach points (teal) */}
    <circle cx={28} cy={13} r={2} fill="#0891b2" />
    <circle cx={36} cy={13} r={2} fill="#0891b2" />
    <circle cx={20} cy={30} r={2} fill="#0891b2" />
    <circle cx={24} cy={35} r={2} fill="#0891b2" />
    <circle cx={44} cy={30} r={2} fill="#0891b2" />
    <circle cx={40} cy={35} r={2} fill="#0891b2" />
  </>),

  // Compensation / trim icons (simpler, monochrome)
  zvstemp: S(<>
    <path d="M16 36 L22 14 L28 28 L34 10 L40 24 L46 18 L52 28" stroke="#64748b" strokeWidth={2} fill="none" strokeLinejoin="round" />
    <line x1={10} y1={38} x2={54} y2={38} stroke="#94a3b8" strokeWidth={1} />
    <line x1={10} y1={38} x2={10} y2={8} stroke="#94a3b8" strokeWidth={1} />
  </>),

  zerobal: S(<>
    <rect x={8} y={20} width={48} height={4} rx={1} fill="#64748b" />
    <rect x={28} y={10} width={8} height={14} rx={1} fill="#94a3b8" />
    <circle cx={20} cy={34} r={6} fill="none" stroke="#64748b" strokeWidth={2} />
    <circle cx={44} cy={34} r={6} fill="none" stroke="#64748b" strokeWidth={2} />
    <line x1={14} y1={24} x2={14} y2={28} stroke="#64748b" strokeWidth={1.5} />
    <line x1={50} y1={24} x2={50} y2={28} stroke="#64748b" strokeWidth={1.5} />
  </>),

  compensation: S(<>
    <rect x={6} y={16} width={14} height={16} rx={2} fill="none" stroke="#64748b" strokeWidth={1.5} />
    <rect x={26} y={16} width={14} height={16} rx={2} fill="none" stroke="#64748b" strokeWidth={1.5} />
    <rect x={46} y={16} width={14} height={16} rx={2} fill="none" stroke="#64748b" strokeWidth={1.5} />
    <line x1={20} y1={24} x2={26} y2={24} stroke="#64748b" strokeWidth={1.5} />
    <line x1={40} y1={24} x2={46} y2={24} stroke="#64748b" strokeWidth={1.5} />
    <line x1={32} y1={8} x2={32} y2={16} stroke="#94a3b8" strokeWidth={1.5} />
    <line x1={32} y1={32} x2={32} y2={40} stroke="#94a3b8" strokeWidth={1.5} />
  </>),

  trimvis: S(<>
    {/* Ladder network */}
    <line x1={8} y1={12} x2={56} y2={12} stroke="#64748b" strokeWidth={1.5} />
    <line x1={8} y1={36} x2={56} y2={36} stroke="#64748b" strokeWidth={1.5} />
    {[16, 28, 40].map(x => (
      <g key={x}>
        <line x1={x} y1={12} x2={x} y2={36} stroke="#94a3b8" strokeWidth={1} strokeDasharray="3 2" />
        <rect x={x - 4} y={20} width={8} height={8} rx={1} fill="#64748b" />
      </g>
    ))}
    <circle cx={54} cy={24} r={6} fill="#d97706" opacity="0.7" />
  </>),
}

// Fallback icon for any key without a specific icon
const defaultIcon = (key: string) => icons.compensation ?? null

// ── Gallery data ──────────────────────────────────────────────────────────────

const SECTIONS: GallerySection[] = [
  {
    category: 'Bending',
    color: 'text-blue-700',
    borderColor: 'ring-blue-400',
    bgHover: 'hover:bg-blue-50',
    cards: [
      { key: 'bbcant', title: 'Cantilever Beam',      description: 'Fixed-base cantilever with point load', icon: icons.bbcant },
      { key: 'bino',   title: 'Binocular Beam',        description: 'Dual-hole bending beam, high sensitivity', icon: icons.bino },
      { key: 'dualbb', title: 'Dual Bending Beam',     description: 'Parallel flexure, off-center compensation', icon: icons.dualbb },
      { key: 'revbb',  title: 'Reverse Bending Beam',  description: 'Simply-supported with center load', icon: icons.revbb },
      { key: 'sbbeam', title: 'S-Beam',                description: 'S-shaped tension/compression flexure', icon: icons.sbbeam },
    ],
  },
  {
    category: 'Column',
    color: 'text-violet-700',
    borderColor: 'ring-violet-400',
    bgHover: 'hover:bg-violet-50',
    cards: [
      { key: 'sqrcol',  title: 'Square Column',        description: 'Solid square axial pillar', icon: icons.sqrcol },
      { key: 'rndsldc', title: 'Round Solid Column',   description: 'Solid round axial pillar', icon: icons.rndsldc },
      { key: 'rndhlwc', title: 'Round Hollow Column',  description: 'Hollow annular axial pillar', icon: icons.rndhlwc },
    ],
  },
  {
    category: 'Shear',
    color: 'text-emerald-700',
    borderColor: 'ring-emerald-400',
    bgHover: 'hover:bg-emerald-50',
    cards: [
      { key: 'shrsqr',  title: 'Square Shear Beam',    description: 'Square-section transverse shear', icon: icons.shrsqr },
      { key: 'shrrnd',  title: 'Round Shear Beam',     description: 'Round-section transverse shear', icon: icons.shrrnd },
      { key: 'shrrnd1', title: 'S-Beam Shear',         description: 'Shear-sensing S-beam variant', icon: icons.shrrnd1 },
    ],
  },
  {
    category: 'Torque',
    color: 'text-orange-700',
    borderColor: 'ring-orange-400',
    bgHover: 'hover:bg-orange-50',
    cards: [
      { key: 'sqrtor', title: 'Square Torque',          description: 'Torsional strain in square shaft', icon: icons.sqrtor },
      { key: 'rndsld', title: 'Round Solid Torque',     description: 'Torsional strain, solid round shaft', icon: icons.rndsld },
      { key: 'rndhlw', title: 'Round Hollow Torque',    description: 'Torsional strain, hollow round shaft', icon: icons.rndhlw },
    ],
  },
  {
    category: 'Pressure',
    color: 'text-cyan-700',
    borderColor: 'ring-cyan-400',
    bgHover: 'hover:bg-cyan-50',
    cards: [
      { key: 'pressure', title: 'Pressure Diaphragm',  description: 'Flat circular diaphragm sensing', icon: icons.pressure },
    ],
  },
  {
    category: 'Multi-Axis',
    color: 'text-rose-700',
    borderColor: 'ring-rose-400',
    bgHover: 'hover:bg-rose-50',
    cards: [
      { key: 'sixaxisft', title: '6-DOF F/T Cross-Beam', description: 'Wrist/ankle sensor for robotics — Fx/Fy/Fz/Mx/My/Mz', icon: icons.sixaxisft },
      { key: 'jts',       title: 'Joint Torque Sensor',  description: 'Spoke-flexure disk for compliant actuators and SEA drives', icon: icons.jts },
      { key: 'hexapod',   title: 'Hexapod F/T Sensor',   description: 'ATI/JR3-style 6-strut Stewart platform — axial-only strut loading', icon: icons.hexapod },
    ],
  },
  {
    category: 'Compensation',
    color: 'text-slate-600',
    borderColor: 'ring-slate-400',
    bgHover: 'hover:bg-slate-50',
    cards: [
      { key: 'zvstemp',  title: 'Zero vs Temperature',  description: 'Thermal zero-shift compensation wire', icon: icons.zvstemp },
      { key: 'zerobal',  title: 'Zero Balance',         description: 'Bridge unbalance null resistor', icon: icons.zerobal },
      { key: 'span2pt',  title: 'Span Temp 2-Point',    description: '2-point thermal span correction', icon: icons.compensation },
      { key: 'span3pt',  title: 'Span Temp 3-Point',    description: '3-point quadratic span correction', icon: icons.compensation },
      { key: 'optshunt', title: 'Shunt Optimization',   description: 'Optimal shunt for thermal span', icon: icons.compensation },
      { key: 'spanset',  title: 'Span Set',             description: 'Post-calibration span scaling', icon: icons.compensation },
      { key: 'simspan',  title: 'Simulated Span',       description: 'Simultaneous zero + span correction', icon: icons.compensation },
      { key: 'trimvis',  title: 'Trim Visualizer',      description: 'Ladder network rung selector', icon: icons.trimvis },
    ],
  },
]

// ── Component ─────────────────────────────────────────────────────────────────

interface Props {
  onSelect: (key: string) => void
}

export default function TransducerGallery({ onSelect }: Props) {
  return (
    <div className="min-h-full bg-slate-50 px-6 py-8 overflow-y-auto">
      <div className="max-w-5xl mx-auto space-y-10">

        <div>
          <h2 className="text-xl font-bold text-slate-800 mb-1">Transducer Design</h2>
          <p className="text-sm text-slate-500">
            Select a transducer type to open its calculator, sketch, and results.
          </p>
        </div>

        {SECTIONS.map(section => (
          <div key={section.category}>
            <h3 className={`text-[11px] font-black uppercase tracking-widest mb-3 ${section.color}`}>
              {section.category}
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
              {section.cards.map(card => (
                <button
                  key={card.key}
                  onClick={() => onSelect(card.key)}
                  className={`
                    flex flex-col items-center gap-2 p-4 rounded-xl bg-white border border-slate-200
                    text-left ring-inset ring-0 transition-all
                    hover:ring-2 hover:shadow-sm hover:border-transparent
                    ${section.borderColor} ${section.bgHover}
                    focus:outline-none focus-visible:ring-2
                  `}
                >
                  <div className="opacity-90">
                    {card.icon ?? defaultIcon(card.key)}
                  </div>
                  <div className="w-full">
                    <div className="text-[12px] font-semibold text-slate-800 leading-tight text-center">
                      {card.title}
                    </div>
                    <div className="text-[10px] text-slate-400 mt-0.5 leading-snug text-center">
                      {card.description}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        ))}

      </div>
    </div>
  )
}
