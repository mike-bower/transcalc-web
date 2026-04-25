import React from 'react'

interface GalleryCard {
  key: string
  title: string
  description: string
  icon: React.ReactNode
}

interface GallerySection {
  category: string
  accent: string    // hex — used for top pip, hover border, icon bg tint
  iconBg: string   // soft tinted bg for icon container
  cards: GalleryCard[]
}

// ── Mini SVG icons ────────────────────────────────────────────────────────────

const S = (children: React.ReactNode) => (
  <svg width={64} height={48} viewBox="0 0 64 48" fill="none" xmlns="http://www.w3.org/2000/svg">
    {children}
  </svg>
)

const icons: Record<string, React.ReactNode> = {
  bbcant: S(<>
    <rect x={4} y={20} width={4} height={16} rx={1} fill="#94a3b8" />
    <rect x={8} y={26} width={38} height={5} rx={1} fill="#64748b" />
    <line x1={46} y1={20} x2={46} y2={14} stroke="#ef4444" strokeWidth={2} />
    <path d="M43 14 L49 14" stroke="#ef4444" strokeWidth={1.5} />
    <polygon points="46,27 43,20 49,20" fill="#ef4444" />
  </>),

  bino: S(<>
    {/* Fixed wall */}
    <rect x={2} y={12} width={5} height={24} rx={1} fill="#94a3b8" />
    {/* Beam body */}
    <rect x={7} y={14} width={50} height={20} rx={1} fill="#64748b" />
    {/* Two binocular holes — round circles only, no connecting slot */}
    <circle cx={22} cy={24} r={5} fill="#e2e8f0" />
    <circle cx={40} cy={24} r={5} fill="#e2e8f0" />
    {/* Load arrow at right end */}
    <line x1={54} y1={4} x2={54} y2={14} stroke="#ef4444" strokeWidth={2} />
    <polygon points="54,14 51,8 57,8" fill="#ef4444" />
  </>),

  dualbb: S(<>
    {/* Left fixed block */}
    <rect x={2} y={10} width={7} height={28} rx={1} fill="#475569" />
    {/* Upper beam */}
    <rect x={9} y={14} width={42} height={6} rx={1} fill="#64748b" />
    {/* Lower beam */}
    <rect x={9} y={28} width={42} height={6} rx={1} fill="#64748b" />
    {/* Right load block */}
    <rect x={51} y={10} width={7} height={28} rx={1} fill="#94a3b8" />
    {/* Gage A — tension, top upper left (orange) */}
    <rect x={13} y={11} width={6} height={3} rx={0.5} fill="#f97316" opacity={0.9} />
    {/* Gage B — compression, bottom lower left (blue) */}
    <rect x={13} y={34} width={6} height={3} rx={0.5} fill="#2563eb" opacity={0.9} />
    {/* Gage C — compression, top upper right (blue) */}
    <rect x={45} y={11} width={6} height={3} rx={0.5} fill="#2563eb" opacity={0.9} />
    {/* Gage D — tension, bottom lower right (orange) */}
    <rect x={45} y={34} width={6} height={3} rx={0.5} fill="#f97316" opacity={0.9} />
    {/* Load arrow — down onto right block */}
    <line x1={54} y1={2} x2={54} y2={10} stroke="#ef4444" strokeWidth={2} />
    <polygon points="54,10 51,5 57,5" fill="#ef4444" />
  </>),

  revbb: S(<>
    {/* Left fixed block */}
    <rect x={2} y={13} width={7} height={22} rx={1} fill="#475569" />
    {/* Single beam */}
    <rect x={9} y={21} width={42} height={6} rx={1} fill="#64748b" />
    {/* Right load block */}
    <rect x={51} y={13} width={7} height={22} rx={1} fill="#94a3b8" />
    {/* Gage A — tension, top left (orange) */}
    <rect x={17} y={18} width={6} height={3} rx={0.5} fill="#f97316" opacity={0.9} />
    {/* Gage B — compression, bottom left (blue) */}
    <rect x={17} y={27} width={6} height={3} rx={0.5} fill="#2563eb" opacity={0.9} />
    {/* Gage C — compression, top right (blue) */}
    <rect x={41} y={18} width={6} height={3} rx={0.5} fill="#2563eb" opacity={0.9} />
    {/* Gage D — tension, bottom right (orange) */}
    <rect x={41} y={27} width={6} height={3} rx={0.5} fill="#f97316" opacity={0.9} />
    {/* Load arrow — down onto right block */}
    <line x1={54} y1={4} x2={54} y2={13} stroke="#ef4444" strokeWidth={2} />
    <polygon points="54,13 51,7 57,7" fill="#ef4444" />
  </>),

  sbbeam: S(<>
    <path d="M10 38 C10 28 24 28 24 20 C24 12 38 12 38 20 C38 28 52 28 52 18"
      stroke="#64748b" strokeWidth={5} strokeLinecap="round" fill="none" />
    <line x1={32} y1={4} x2={32} y2={18} stroke="#ef4444" strokeWidth={2} />
    <polygon points="32,18 29,12 35,12" fill="#ef4444" />
  </>),

  sqrcol: S(<>
    <rect x={22} y={8} width={20} height={32} rx={1} fill="#64748b" />
    <line x1={32} y1={2} x2={32} y2={8} stroke="#ef4444" strokeWidth={2} />
    <path d="M28 4 L36 4" stroke="#ef4444" strokeWidth={1.5} />
    <line x1={32} y1={40} x2={32} y2={46} stroke="#ef4444" strokeWidth={2} />
    <path d="M28 44 L36 44" stroke="#ef4444" strokeWidth={1.5} />
  </>),

  rndsldc: S(<>
    <ellipse cx={32} cy={12} rx={12} ry={4} fill="#94a3b8" />
    <rect x={20} y={12} width={24} height={24} fill="#64748b" />
    <ellipse cx={32} cy={36} rx={12} ry={4} fill="#475569" />
    <line x1={32} y1={2} x2={32} y2={8} stroke="#ef4444" strokeWidth={2} />
    <path d="M28 4 L36 4" stroke="#ef4444" strokeWidth={1.5} />
    <line x1={32} y1={40} x2={32} y2={46} stroke="#ef4444" strokeWidth={2} />
    <path d="M28 44 L36 44" stroke="#ef4444" strokeWidth={1.5} />
  </>),

  rndhlwc: S(<>
    <ellipse cx={32} cy={12} rx={12} ry={4} fill="#94a3b8" />
    <rect x={20} y={12} width={24} height={24} fill="#64748b" />
    <rect x={26} y={14} width={12} height={22} fill="#e2e8f0" />
    <ellipse cx={32} cy={36} rx={12} ry={4} fill="#475569" />
    <line x1={32} y1={2} x2={32} y2={8} stroke="#ef4444" strokeWidth={2} />
    <path d="M28 4 L36 4" stroke="#ef4444" strokeWidth={1.5} />
    <line x1={32} y1={40} x2={32} y2={46} stroke="#ef4444" strokeWidth={2} />
    <path d="M28 44 L36 44" stroke="#ef4444" strokeWidth={1.5} />
  </>),

  shrsqr: S(<>
    <rect x={8} y={10} width={48} height={28} rx={1} fill="#64748b" />
    <rect x={18} y={16} width={28} height={16} rx={1} fill="#e2e8f0" />
    <line x1={4} y1={24} x2={18} y2={24} stroke="#ef4444" strokeWidth={2} />
    <polygon points="18,20 24,24 18,28" fill="#ef4444" />
  </>),

  shrrnd: S(<>
    <rect x={8} y={10} width={48} height={28} rx={1} fill="#64748b" />
    <ellipse cx={32} cy={24} rx={12} ry={12} fill="#e2e8f0" />
    <line x1={4} y1={24} x2={20} y2={24} stroke="#ef4444" strokeWidth={2} />
    <polygon points="20,20 26,24 20,28" fill="#ef4444" />
  </>),

  shrrnd1: S(<>
    <path d="M10 38 C10 28 24 28 24 20 C24 12 38 12 38 20 C38 28 52 28 52 18"
      stroke="#64748b" strokeWidth={8} strokeLinecap="round" fill="none" />
    <line x1={4} y1={28} x2={18} y2={28} stroke="#ef4444" strokeWidth={2} />
    <polygon points="18,24 24,28 18,32" fill="#ef4444" />
  </>),

  sqrtor: S(<>
    <rect x={20} y={8} width={24} height={32} rx={1} fill="#64748b" />
    <path d="M48 16 C58 16 58 32 48 32" stroke="#ef4444" strokeWidth={2} fill="none" />
    <polygon points="46,29 52,33 48,37" fill="#ef4444" />
  </>),

  rndsld: S(<>
    <ellipse cx={32} cy={12} rx={12} ry={4} fill="#94a3b8" />
    <rect x={20} y={12} width={24} height={24} fill="#64748b" />
    <ellipse cx={32} cy={36} rx={12} ry={4} fill="#475569" />
    <path d="M52 20 C60 20 60 32 52 32" stroke="#ef4444" strokeWidth={2} fill="none" />
    <polygon points="50,29 56,33 52,37" fill="#ef4444" />
  </>),

  rndhlw: S(<>
    <ellipse cx={32} cy={12} rx={12} ry={4} fill="#94a3b8" />
    <rect x={20} y={12} width={24} height={24} fill="#64748b" />
    <rect x={26} y={14} width={12} height={22} fill="#e2e8f0" />
    <ellipse cx={32} cy={36} rx={12} ry={4} fill="#475569" />
    <path d="M52 20 C60 20 60 32 52 32" stroke="#ef4444" strokeWidth={2} fill="none" />
    <polygon points="50,29 56,33 52,37" fill="#ef4444" />
  </>),

  pressure: S(<>
    <ellipse cx={32} cy={36} rx={24} ry={5} fill="#64748b" />
    <path d="M8 36 Q8 10 32 10 Q56 10 56 36" fill="#94a3b8" />
    <line x1={32} y1={2} x2={32} y2={16} stroke="#ef4444" strokeWidth={2} />
    <path d="M28 5 L36 5" stroke="#ef4444" strokeWidth={1.5} />
    <polygon points="32,16 29,10 35,10" fill="#ef4444" />
  </>),

  jts: S(<>
    <circle cx={32} cy={24} r={22} fill="#e2e8f0" stroke="#64748b" strokeWidth={1.5} />
    <circle cx={32} cy={24} r={8} fill="#c8d8e8" stroke="#64748b" strokeWidth={1.5} />
    <rect x={29} y={4} width={6} height={20} rx={1} fill="#94a3b8" />
    <rect x={29} y={28} width={6} height={20} rx={1} fill="#94a3b8" />
    <rect x={4} y={21} width={20} height={6} rx={1} fill="#94a3b8" />
    <rect x={40} y={21} width={20} height={6} rx={1} fill="#94a3b8" />
    <rect x={29} y={20} width={6} height={3} fill="#d97706" opacity={0.9} />
    <rect x={29} y={29} width={6} height={3} fill="#d97706" opacity={0.9} />
    <rect x={20} y={21} width={3} height={6} fill="#d97706" opacity={0.9} />
    <rect x={39} y={21} width={3} height={6} fill="#d97706" opacity={0.9} />
  </>),

  sixaxisft: S(<>
    {/* Outer ring body (annular disc) */}
    <circle cx={32} cy={24} r={21} fill="#475569" />
    <circle cx={32} cy={24} r={16} fill="#dde4ec" />
    {/* 4 radial cross beams bridging hub to ring */}
    <rect x={28.5} y={8} width={7} height={8} fill="#475569" />
    <rect x={28.5} y={32} width={7} height={8} fill="#475569" />
    <rect x={16} y={20.5} width={8} height={7} fill="#475569" />
    <rect x={40} y={20.5} width={8} height={7} fill="#475569" />
    {/* Inner hub */}
    <circle cx={32} cy={24} r={8} fill="#475569" />
    {/* Cable through-hole */}
    <circle cx={32} cy={24} r={3} fill="#1e293b" />
    {/* Strain gage markers (one per beam arm) */}
    <rect x={28.5} y={11} width={7} height={2} rx={0.5} fill="#d97706" />
    <rect x={28.5} y={35} width={7} height={2} rx={0.5} fill="#d97706" />
    <rect x={19} y={20.5} width={2} height={7} rx={0.5} fill="#d97706" />
    <rect x={43} y={20.5} width={2} height={7} rx={0.5} fill="#d97706" />
    {/* Mounting holes in outer ring (6 × 60°) */}
    <circle cx={32} cy={5.5} r={1.5} fill="#1e293b" opacity={0.55} />
    <circle cx={48} cy={15} r={1.5} fill="#1e293b" opacity={0.55} />
    <circle cx={48} cy={33} r={1.5} fill="#1e293b" opacity={0.55} />
    <circle cx={32} cy={42.5} r={1.5} fill="#1e293b" opacity={0.55} />
    <circle cx={16} cy={33} r={1.5} fill="#1e293b" opacity={0.55} />
    <circle cx={16} cy={15} r={1.5} fill="#1e293b" opacity={0.55} />
  </>),

  triaxisft: S(<>
    <circle cx={32} cy={24} r={22} fill="none" stroke="#94a3b8" strokeWidth={1.5} />
    <circle cx={32} cy={24} r={7} fill="#3570a0" />
    <rect x={29} y={3} width={6} height={21} rx={1} fill="#4a88b8" />
    <rect x={29} y={3} width={6} height={21} rx={1} fill="#4a88b8" transform="rotate(120 32 24)" />
    <rect x={29} y={3} width={6} height={21} rx={1} fill="#4a88b8" transform="rotate(240 32 24)" />
    <rect x={29} y={7} width={6} height={4} rx={1} fill="#d97706" opacity={0.9} />
    <rect x={29} y={7} width={6} height={4} rx={1} fill="#d97706" opacity={0.9} transform="rotate(120 32 24)" />
    <rect x={29} y={7} width={6} height={4} rx={1} fill="#d97706" opacity={0.9} transform="rotate(240 32 24)" />
    <rect x={35} y={14} width={4} height={4} rx={1} fill="#0891b2" opacity={0.85} />
    <rect x={35} y={14} width={4} height={4} rx={1} fill="#0891b2" opacity={0.85} transform="rotate(120 32 24)" />
    <rect x={35} y={14} width={4} height={4} rx={1} fill="#0891b2" opacity={0.85} transform="rotate(240 32 24)" />
  </>),

  hexapod: S(<>
    <circle cx={32} cy={24} r={18} fill="none" stroke="#d97706" strokeWidth={1.2} strokeDasharray="4 2" opacity={0.8} />
    <circle cx={32} cy={24} r={12} fill="none" stroke="#0891b2" strokeWidth={1.2} strokeDasharray="3 2" opacity={0.8} />
    <line x1={32} y1={6} x2={28} y2={13} stroke="#64748b" strokeWidth={1} />
    <line x1={32} y1={6} x2={36} y2={13} stroke="#64748b" strokeWidth={1} />
    <line x1={16} y1={38} x2={20} y2={30} stroke="#64748b" strokeWidth={1} />
    <line x1={16} y1={38} x2={24} y2={35} stroke="#64748b" strokeWidth={1} />
    <line x1={48} y1={38} x2={44} y2={30} stroke="#64748b" strokeWidth={1} />
    <line x1={48} y1={38} x2={40} y2={35} stroke="#64748b" strokeWidth={1} />
    <circle cx={32} cy={6} r={3} fill="#d97706" />
    <circle cx={16} cy={38} r={3} fill="#d97706" />
    <circle cx={48} cy={38} r={3} fill="#d97706" />
    <circle cx={28} cy={13} r={2} fill="#0891b2" />
    <circle cx={36} cy={13} r={2} fill="#0891b2" />
    <circle cx={20} cy={30} r={2} fill="#0891b2" />
    <circle cx={24} cy={35} r={2} fill="#0891b2" />
    <circle cx={44} cy={30} r={2} fill="#0891b2" />
    <circle cx={40} cy={35} r={2} fill="#0891b2" />
  </>),

  zvstemp: S(<>
    <line x1={10} y1={40} x2={54} y2={40} stroke="#94a3b8" strokeWidth={1} />
    <line x1={10} y1={40} x2={10} y2={8} stroke="#94a3b8" strokeWidth={1} />
    <path d="M16 36 L22 14 L28 28 L34 10 L40 24 L46 18 L52 28" stroke="#64748b" strokeWidth={2} fill="none" strokeLinejoin="round" />
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
    <line x1={8} y1={12} x2={56} y2={12} stroke="#64748b" strokeWidth={1.5} />
    <line x1={8} y1={36} x2={56} y2={36} stroke="#64748b" strokeWidth={1.5} />
    {[16, 28, 40].map(x => (
      <g key={x}>
        <line x1={x} y1={12} x2={x} y2={36} stroke="#94a3b8" strokeWidth={1} strokeDasharray="3 2" />
        <rect x={x - 4} y={20} width={8} height={8} rx={1} fill="#64748b" />
      </g>
    ))}
    <circle cx={54} cy={24} r={6} fill="#d97706" opacity={0.7} />
  </>),
}

// ── Gallery sections ──────────────────────────────────────────────────────────

const SECTIONS: GallerySection[] = [
  {
    category: 'Bending',
    accent: '#2563eb',
    iconBg: '#eff6ff',
    cards: [
      { key: 'bbcant', title: 'Cantilever Beam',     description: 'Fixed-base with point load',            icon: icons.bbcant },
      { key: 'bino',   title: 'Binocular Beam',       description: 'Dual-hole, high sensitivity',           icon: icons.bino   },
      { key: 'dualbb', title: 'Dual Bending Beam',    description: 'Parallel flexure, off-center comp.',    icon: icons.dualbb },
      { key: 'revbb',  title: 'Reverse Bending Beam', description: 'Fixed-guided single beam, S-bending',   icon: icons.revbb  },
      { key: 'sbbeam', title: 'S-Beam',               description: 'S-shaped tension / compression',        icon: icons.sbbeam },
    ],
  },
  {
    category: 'Column',
    accent: '#6d28d9',
    iconBg: '#f5f3ff',
    cards: [
      { key: 'sqrcol',  title: 'Square Column',       description: 'Solid square axial pillar',             icon: icons.sqrcol  },
      { key: 'rndsldc', title: 'Round Solid Column',  description: 'Solid round axial pillar',              icon: icons.rndsldc },
      { key: 'rndhlwc', title: 'Round Hollow Column', description: 'Hollow annular axial pillar',           icon: icons.rndhlwc },
    ],
  },
  {
    category: 'Shear',
    accent: '#059669',
    iconBg: '#ecfdf5',
    cards: [
      { key: 'shrsqr',  title: 'Square Shear Beam',  description: 'Square section transverse shear',       icon: icons.shrsqr  },
      { key: 'shrrnd',  title: 'Round Shear Beam',   description: 'Round section transverse shear',        icon: icons.shrrnd  },
      { key: 'shrrnd1', title: 'S-Beam Shear',        description: 'Shear-sensing S-beam variant',          icon: icons.shrrnd1 },
    ],
  },
  {
    category: 'Torque',
    accent: '#b45309',
    iconBg: '#fffbeb',
    cards: [
      { key: 'sqrtor', title: 'Square Torque',        description: 'Torsional strain, square shaft',        icon: icons.sqrtor },
      { key: 'rndsld', title: 'Round Solid Torque',   description: 'Torsional strain, solid shaft',         icon: icons.rndsld },
      { key: 'rndhlw', title: 'Round Hollow Torque',  description: 'Torsional strain, hollow shaft',        icon: icons.rndhlw },
    ],
  },
  {
    category: 'Pressure',
    accent: '#0e7490',
    iconBg: '#ecfeff',
    cards: [
      { key: 'pressure', title: 'Pressure Diaphragm', description: 'Flat circular diaphragm sensing',      icon: icons.pressure },
    ],
  },
  {
    category: 'Multi-Axis',
    accent: '#be123c',
    iconBg: '#fff1f2',
    cards: [
      { key: 'sixaxisft', title: '6-DOF F/T Cross-Beam',  description: 'Fx/Fy/Fz/Mx/My/Mz — robot wrists',       icon: icons.sixaxisft },
      { key: 'jts',       title: 'Joint Torque Sensor',   description: 'Spoke-flexure disk for SEA drives',        icon: icons.jts       },
      { key: 'hexapod',   title: 'Hexapod F/T Sensor',    description: 'ATI/JR3-style 6-strut platform',           icon: icons.hexapod   },
      { key: 'triaxisft', title: '3-Arm F/T Cross-Beam',  description: '3-arm 120° flexure, 6-DOF matrix',         icon: icons.triaxisft },
    ],
  },
  {
    category: 'Compensation',
    accent: '#475569',
    iconBg: '#f1f5f9',
    cards: [
      { key: 'zvstemp',  title: 'Zero vs Temperature',  description: 'Thermal zero-shift wire',           icon: icons.zvstemp      },
      { key: 'zerobal',  title: 'Zero Balance',          description: 'Bridge unbalance null resistor',   icon: icons.zerobal      },
      { key: 'span2pt',  title: 'Span Temp 2-Point',     description: '2-point thermal span correction',  icon: icons.compensation },
      { key: 'span3pt',  title: 'Span Temp 3-Point',     description: '3-point quadratic span correction',icon: icons.compensation },
      { key: 'optshunt', title: 'Shunt Optimization',    description: 'Optimal shunt for thermal span',   icon: icons.compensation },
      { key: 'spanset',  title: 'Span Set',              description: 'Post-calibration span scaling',    icon: icons.compensation },
      { key: 'simspan',  title: 'Simulated Span',         description: 'Simultaneous zero + span correction',icon: icons.compensation },
      { key: 'trimvis',  title: 'Trim Visualizer',        description: 'Ladder network rung selector',    icon: icons.trimvis      },
    ],
  },
]

// ── Component ─────────────────────────────────────────────────────────────────

interface Props {
  onSelect: (key: string) => void
}

export default function TransducerGallery({ onSelect }: Props) {
  return (
    <div className="gallery-wrap">
      <div className="gallery-inner">

        <div className="gallery-header">
          <h2>Transducer Design</h2>
          <p>Select a transducer type to open its calculator, sketch, and results.</p>
        </div>

        {SECTIONS.map(section => (
          <div key={section.category} className="gallery-section">

            <div className="gallery-section-label">
              <div className="gallery-section-pip" style={{ background: section.accent }} />
              <h3 className="gallery-section-text" style={{ color: section.accent }}>
                {section.category}
              </h3>
            </div>

            <div className="gallery-grid">
              {section.cards.map(card => (
                <button
                  key={card.key}
                  className="gallery-card"
                  style={{
                    ['--card-accent' as string]: section.accent,
                    ['--card-shadow' as string]: `${section.accent}30`,
                  }}
                  onClick={() => onSelect(card.key)}
                >
                  <div
                    className="gallery-card-icon"
                    style={{ background: section.iconBg }}
                  >
                    {card.icon}
                  </div>
                  <div>
                    <div className="gallery-card-title">{card.title}</div>
                    <div className="gallery-card-desc">{card.description}</div>
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
