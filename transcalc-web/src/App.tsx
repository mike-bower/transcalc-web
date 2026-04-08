import { useEffect, useMemo, useState } from 'react'
import ProjectPanel from './components/ProjectPanel'
import WorkflowWizard from './components/WorkflowWizard'
import { newProject, type ProjectState } from './domain/projectSchema'

type UnitSystem = 'SI' | 'US'

type CalculatorTopic = {
  key: string
  title: string
  category: string
  file: string
}

const CALCULATORS: CalculatorTopic[] = [
  { key: 'bbcant', title: 'Bending Beam Cantilever', category: 'Beams', file: 'BBCant.htm' },
  { key: 'bino', title: 'Binocular Beam', category: 'Beams', file: 'Bino.htm' },
  { key: 'dualbb', title: 'Dual Beam', category: 'Beams', file: 'DualBB.htm' },
  { key: 'revbb', title: 'Reverse Bending Beam', category: 'Beams', file: 'RevBB.htm' },
  { key: 'sbbeam', title: 'S-Beam', category: 'Beams', file: 'SBBeam.htm' },
  { key: 'sqrcol', title: 'Square Column', category: 'Compression', file: 'SqrCol.htm' },
  { key: 'rndsldc', title: 'Round Solid Column', category: 'Compression', file: 'RndSld.htm' },
  { key: 'rndhlwc', title: 'Round Hollow Column', category: 'Compression', file: 'RndHlw.htm' },
  { key: 'shrsqr', title: 'Shear Square Web', category: 'Shear', file: 'ShrSqr.htm' },
  { key: 'shrrnd', title: 'Shear Round Web', category: 'Shear', file: 'ShrRnd.htm' },
  { key: 'shrrnd1', title: 'Shear Round S-Beam', category: 'Shear', file: 'ShrRsb.htm' },
  { key: 'sqrtor', title: 'Square Torque', category: 'Torsion', file: 'SqrTor.htm' },
  { key: 'rndsld', title: 'Round Solid Torque', category: 'Torsion', file: 'RndSld.htm' },
  { key: 'rndhlw', title: 'Round Hollow Torque', category: 'Torsion', file: 'RndHlw.htm' },
  { key: 'pressure', title: 'Pressure Diaphragm', category: 'Pressure', file: 'Pressure.htm' },
  { key: 'zvstemp', title: 'Zero vs Temperature', category: 'Calibration', file: 'ZvsTemp.htm' },
  { key: 'zerobal', title: 'Zero Balance', category: 'Calibration', file: 'ZeroBal.htm' },
  { key: 'span2pt', title: 'Span 2-Point', category: 'Span', file: 'Span2pt.htm' },
  { key: 'span3pt', title: 'Span 3-Point', category: 'Span', file: 'Span3pt.htm' },
  { key: 'optshunt', title: 'Shunt Optimization', category: 'Span', file: 'OptShnt.htm' },
  { key: 'spanset', title: 'Span Set', category: 'Span', file: 'SpanSet.htm' },
  { key: 'simspan', title: 'Simulated Span', category: 'Span', file: 'SimSpan.htm' },
  { key: 'trimvis', title: 'Trim Visualizer', category: 'Trim', file: 'TrimVis.htm' },
]

export default function App() {
  const [unitSystem, setUnitSystem] = useState<UnitSystem>('SI')
  const [selectedFrame, setSelectedFrame] = useState<1 | 2 | 3>(1)
  const [selectedHelpKey, setSelectedHelpKey] = useState('bbcant')
  const [helpSearch, setHelpSearch] = useState('')
  const [helpHtml, setHelpHtml] = useState<string>('')
  const [helpOpen, setHelpOpen] = useState(false)

  const handleGetState = (): ProjectState => ({
    ...newProject(),
    unitSystem,
    selectedCalcKey: selectedHelpKey,
    inputs: {},
  })

  const handleLoadState = (state: ProjectState) => {
    if (state.unitSystem === 'SI' || state.unitSystem === 'US') {
      setUnitSystem(state.unitSystem as UnitSystem)
    }
    if (state.selectedCalcKey && CALCULATORS.some(c => c.key === state.selectedCalcKey)) {
      setSelectedHelpKey(state.selectedCalcKey)
    }
  }

  const selectedTopic = CALCULATORS.find(t => t.key === selectedHelpKey) ?? CALCULATORS[0]

  const filteredTopics = useMemo(() => {
    const q = helpSearch.trim().toLowerCase()
    if (!q) return CALCULATORS
    return CALCULATORS.filter(t => `${t.title} ${t.category}`.toLowerCase().includes(q))
  }, [helpSearch])

  useEffect(() => {
    let canceled = false
    fetch(`/legacy-help/${selectedTopic.file}`)
      .then(r => r.text())
      .then(html => { if (!canceled) setHelpHtml(html) })
      .catch(() => {
        if (!canceled) setHelpHtml('<html><body><p>Unable to load help content.</p></body></html>')
      })
    return () => { canceled = true }
  }, [selectedTopic.file])

  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="brand">
          <span className="brand-mark">TC</span>
          <div>
            <h1>Transcalc Workflow</h1>
            <p className="text-xs text-slate-400">Integrated Load Cell Design Environment</p>
          </div>
        </div>

        <div className="topbar-right">
          <ProjectPanel onGetState={handleGetState} onLoadState={handleLoadState} />
          <div className="analysis-toggle">
            <button className={unitSystem === 'SI' ? 'active' : ''} onClick={() => setUnitSystem('SI')}>SI</button>
            <button className={unitSystem === 'US' ? 'active' : ''} onClick={() => setUnitSystem('US')}>US</button>
          </div>
          <button className="export-btn" onClick={() => setHelpOpen(true)}>Help</button>
        </div>
      </header>

      <main className="layout layout-single p-0 bg-slate-900">
        <section className="h-full">
          <WorkflowWizard 
            unitSystem={unitSystem} 
            onUnitChange={setUnitSystem} 
            initialStep={selectedFrame}
          />
        </section>
      </main>

      {helpOpen && (
        <div className="help-overlay" onClick={() => setHelpOpen(false)}>
          <section className="panel help-modal" onClick={e => e.stopPropagation()}>
            <div className="help-header">
              <h2>Context Help + Reference</h2>
              <div className="topbar-right">
                <input
                  type="search"
                  placeholder="Search topic or category"
                  value={helpSearch}
                  onChange={e => setHelpSearch(e.target.value)}
                />
                <button className="export-btn" onClick={() => setHelpOpen(false)}>Close</button>
              </div>
            </div>
            <div className="help-layout">
              <div className="topic-list">
                {filteredTopics.map(topic => (
                  <button
                    key={topic.key}
                    className={topic.key === selectedTopic.key ? 'topic-item active' : 'topic-item'}
                    onClick={() => setSelectedHelpKey(topic.key)}
                  >
                    <span>{topic.title}</span>
                    <small>{topic.category}</small>
                  </button>
                ))}
              </div>
              <div className="preview">
                <div className="preview-meta">
                  <strong>{selectedTopic.title}</strong>
                  <span>{selectedTopic.file}</span>
                </div>
                <iframe title={selectedTopic.title} srcDoc={helpHtml} className="help-frame" />
              </div>
            </div>
          </section>
        </div>
      )}
    </div>
  )
}
