import React, { useState } from 'react'

interface Props {
  selectedKey: string | null
  onSelect: (key: string | null) => void
}

const SECTIONS = [
  {
    label: 'Bending', accent: '#2563eb',
    items: [
      { key: 'bbcant',  title: 'Cantilever Beam' },
      { key: 'bino',    title: 'Binocular Beam' },
      { key: 'dualbb',  title: 'Dual Bending Beam' },
      { key: 'revbb',   title: 'Reverse Bending Beam' },
      { key: 'sbbeam',  title: 'S-Beam' },
    ],
  },
  {
    label: 'Column', accent: '#6d28d9',
    items: [
      { key: 'sqrcol',  title: 'Square Column' },
      { key: 'rndsldc', title: 'Round Solid Column' },
      { key: 'rndhlwc', title: 'Round Hollow Column' },
    ],
  },
  {
    label: 'Shear', accent: '#059669',
    items: [
      { key: 'shrsqr',  title: 'Square Shear Beam' },
      { key: 'shrrnd',  title: 'Round Shear Beam' },
      { key: 'shrrnd1', title: 'S-Beam Shear' },
    ],
  },
  {
    label: 'Torque', accent: '#b45309',
    items: [
      { key: 'sqrtor',  title: 'Square Torque' },
      { key: 'rndsld',  title: 'Round Solid Torque' },
      { key: 'rndhlw',  title: 'Round Hollow Torque' },
    ],
  },
  {
    label: 'Pressure', accent: '#0e7490',
    items: [
      { key: 'pressure', title: 'Pressure Diaphragm' },
    ],
  },
  {
    label: 'Multi-Axis', accent: '#be123c',
    items: [
      { key: 'sixaxisft', title: '6-DOF F/T Cross-Beam' },
      { key: 'jts',       title: 'Joint Torque Sensor' },
      { key: 'hexapod',   title: 'Hexapod F/T Sensor' },
      { key: 'triaxisft', title: '3-Arm F/T Cross-Beam' },
    ],
  },
  {
    label: 'Compensation', accent: '#475569',
    items: [
      { key: 'zvstemp',  title: 'Zero vs Temperature' },
      { key: 'zerobal',  title: 'Zero Balance' },
      { key: 'span2pt',  title: 'Span Temp 2-Point' },
      { key: 'span3pt',  title: 'Span Temp 3-Point' },
      { key: 'optshunt', title: 'Shunt Optimization' },
      { key: 'spanset',  title: 'Span Set' },
      { key: 'simspan',  title: 'Simulated Span' },
      { key: 'trimvis',  title: 'Trim Visualizer' },
    ],
  },
]

export default function CalcSidebar({ selectedKey, onSelect }: Props) {
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({})

  const toggle = (label: string) =>
    setCollapsed(c => ({ ...c, [label]: !c[label] }))

  const activeSection = SECTIONS.find(s => s.items.some(i => i.key === selectedKey))

  return (
    <nav className="calc-sidebar">
      {/* Home / gallery button */}
      <button
        className={`sidebar-home${!selectedKey ? ' sidebar-home-active' : ''}`}
        onClick={() => onSelect(null)}
        title="Back to gallery"
      >
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
          <path d="M1 6.5L7 1.5L13 6.5V13H9.5V9.5H4.5V13H1V6.5Z"
            stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" fill="none" />
        </svg>
        All Calculators
      </button>

      <div className="sidebar-divider" />

      {SECTIONS.map(section => {
        const isOpen = !collapsed[section.label]
        const hasActive = section.items.some(i => i.key === selectedKey)

        return (
          <div key={section.label} className="sidebar-section">
            <button
              className="sidebar-section-header"
              onClick={() => toggle(section.label)}
              style={{ color: section.accent }}
            >
              <span
                className="sidebar-section-pip"
                style={{ background: section.accent, opacity: hasActive ? 1 : 0.4 }}
              />
              <span className="sidebar-section-label">{section.label}</span>
              <span
                className="sidebar-chevron"
                style={{ transform: isOpen ? 'rotate(0deg)' : 'rotate(-90deg)' }}
              >▾</span>
            </button>

            {isOpen && (
              <div className="sidebar-items">
                {section.items.map(item => {
                  const active = item.key === selectedKey
                  return (
                    <button
                      key={item.key}
                      className={`sidebar-item${active ? ' sidebar-item-active' : ''}`}
                      style={active ? {
                        background: `${section.accent}14`,
                        color: section.accent,
                        borderLeft: `3px solid ${section.accent}`,
                      } : {}}
                      onClick={() => onSelect(item.key)}
                      title={item.title}
                    >
                      {item.title}
                    </button>
                  )
                })}
              </div>
            )}
          </div>
        )
      })}
    </nav>
  )
}
