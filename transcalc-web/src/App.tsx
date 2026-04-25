import { useEffect, useMemo, useState } from 'react'
import ProjectPanel from './components/ProjectPanel'
import TransducerGallery from './components/TransducerGallery'
import WorkspaceRouter from './components/WorkspaceRouter'
import CalcSidebar from './components/CalcSidebar'
import { newProject, type ProjectState } from './domain/projectSchema'
import { initWasm, isWasmLoaded } from './domain/wasmBridge'
import { ErrorBoundary } from './components/ErrorBoundary'

type UnitSystem = 'SI' | 'US'

type CalculatorTopic = {
  key: string
  title: string
  category: string
  file: string
}

const CALCULATORS: CalculatorTopic[] = [
  { key: 'bbcant',    title: 'Bending Beam Cantilever',  category: 'Beams',        file: 'BBCant.htm' },
  { key: 'bino',      title: 'Binocular Beam',           category: 'Beams',        file: 'Bino.htm' },
  { key: 'dualbb',    title: 'Dual Beam',                category: 'Beams',        file: 'DualBB.htm' },
  { key: 'revbb',     title: 'Reverse Bending Beam',     category: 'Beams',        file: 'RevBB.htm' },
  { key: 'sbbeam',    title: 'S-Beam',                   category: 'Beams',        file: 'SBBeam.htm' },
  { key: 'sqrcol',    title: 'Square Column',            category: 'Compression',  file: 'SqrCol.htm' },
  { key: 'rndsldc',   title: 'Round Solid Column',       category: 'Compression',  file: 'RndSld.htm' },
  { key: 'rndhlwc',   title: 'Round Hollow Column',      category: 'Compression',  file: 'RndHlw.htm' },
  { key: 'shrsqr',    title: 'Shear Square Web',         category: 'Shear',        file: 'ShrSqr.htm' },
  { key: 'shrrnd',    title: 'Shear Round Web',          category: 'Shear',        file: 'ShrRnd.htm' },
  { key: 'shrrnd1',   title: 'Shear Round S-Beam',       category: 'Shear',        file: 'ShrRsb.htm' },
  { key: 'sqrtor',    title: 'Square Torque',            category: 'Torsion',      file: 'SqrTor.htm' },
  { key: 'rndsld',    title: 'Round Solid Torque',       category: 'Torsion',      file: 'RndSld.htm' },
  { key: 'rndhlw',    title: 'Round Hollow Torque',      category: 'Torsion',      file: 'RndHlw.htm' },
  { key: 'pressure',  title: 'Pressure Diaphragm',       category: 'Pressure',     file: 'Pressure.htm' },
  { key: 'zvstemp',   title: 'Zero vs Temperature',      category: 'Calibration',  file: 'ZvsTemp.htm' },
  { key: 'zerobal',   title: 'Zero Balance',             category: 'Calibration',  file: 'ZeroBal.htm' },
  { key: 'span2pt',   title: 'Span 2-Point',             category: 'Span',         file: 'Span2pt.htm' },
  { key: 'span3pt',   title: 'Span 3-Point',             category: 'Span',         file: 'Span3pt.htm' },
  { key: 'optshunt',  title: 'Shunt Optimization',       category: 'Span',         file: 'OptShnt.htm' },
  { key: 'spanset',   title: 'Span Set',                 category: 'Span',         file: 'SpanSet.htm' },
  { key: 'simspan',   title: 'Simulated Span',           category: 'Span',         file: 'SimSpan.htm' },
  { key: 'trimvis',   title: 'Trim Visualizer',          category: 'Trim',         file: 'TrimVis.htm' },
  { key: 'sixaxisft', title: '6-DOF F/T Cross-Beam',    category: 'Multi-Axis',   file: '' },
  { key: 'jts',       title: 'Joint Torque Sensor',     category: 'Multi-Axis',   file: '' },
  { key: 'hexapod',   title: 'Hexapod F/T Sensor',      category: 'Multi-Axis',   file: '' },
  { key: 'triaxisft', title: '3-Arm F/T Cross-Beam',   category: 'Multi-Axis',   file: '' },
]

export default function App() {
  const [unitSystem, setUnitSystem]         = useState<UnitSystem>('SI')
  const [selectedCalcKey, setSelectedCalcKey] = useState<string | null>(null)
  const [helpSearch, setHelpSearch]         = useState('')
  const [helpHtml, setHelpHtml]             = useState<string>('')
  const [helpOpen, setHelpOpen]             = useState(false)
  const [helpTopicKey, setHelpTopicKey]     = useState('bbcant')
  const [wasmReady, setWasmReady]           = useState(false)

  useEffect(() => {
    initWasm().then(loaded => { if (loaded) setWasmReady(true) })
  }, [])

  // Project save/load
  const handleGetState = (): ProjectState => ({
    ...newProject(),
    unitSystem,
    selectedCalcKey: selectedCalcKey ?? '',
    inputs: {},
  })

  const handleLoadState = (state: ProjectState) => {
    if (state.unitSystem === 'SI' || state.unitSystem === 'US')
      setUnitSystem(state.unitSystem as UnitSystem)
    if (state.selectedCalcKey && CALCULATORS.some(c => c.key === state.selectedCalcKey))
      setSelectedCalcKey(state.selectedCalcKey)
  }

  // Help modal
  const selectedHelpTopic = CALCULATORS.find(t => t.key === helpTopicKey) ?? CALCULATORS[0]
  const filteredTopics = useMemo(() => {
    const q = helpSearch.trim().toLowerCase()
    return q ? CALCULATORS.filter(t => `${t.title} ${t.category}`.toLowerCase().includes(q)) : CALCULATORS
  }, [helpSearch])

  useEffect(() => {
    if (!selectedHelpTopic.file) return
    let canceled = false
    fetch(`/legacy-help/${selectedHelpTopic.file}`)
      .then(r => r.text())
      .then(html => { if (!canceled) setHelpHtml(html) })
      .catch(() => { if (!canceled) setHelpHtml('<p>Unable to load help content.</p>') })
    return () => { canceled = true }
  }, [selectedHelpTopic.file])

  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="brand">
          <img src="/mm-logo.webp" alt="Micro-Measurements" className="mm-logo" />
          <div className="brand-divider" />
          <div>
            <div className="brand-app-name">Transcalc</div>
            <div className="brand-app-sub">Transducer Design Environment</div>
          </div>
        </div>

        <div className="topbar-right">
          <ProjectPanel onGetState={handleGetState} onLoadState={handleLoadState} />
          <div className="analysis-toggle">
            <button className={unitSystem === 'SI' ? 'active' : ''} onClick={() => setUnitSystem('SI')} aria-pressed={unitSystem === 'SI'}>SI</button>
            <button className={unitSystem === 'US' ? 'active' : ''} onClick={() => setUnitSystem('US')} aria-pressed={unitSystem === 'US'}>US</button>
          </div>
          {wasmReady && isWasmLoaded() && (
            <span className="status-pill" title="Rust/WASM solver active">WASM</span>
          )}
          <button className="export-btn" onClick={() => window.print()} aria-label="Print engineering report">Print Report</button>
          <a className="export-btn" href="/user-guide.html" target="_blank" rel="noopener noreferrer">User Guide</a>
          <button className="export-btn" onClick={() => setHelpOpen(true)}>Help</button>
        </div>
      </header>

      <div className="app-body">
        <CalcSidebar selectedKey={selectedCalcKey} onSelect={setSelectedCalcKey} />
        <main className="main-content">
          <ErrorBoundary label="Main">
            {selectedCalcKey ? (
              <WorkspaceRouter
                calcKey={selectedCalcKey}
                unitSystem={unitSystem}
                onUnitChange={setUnitSystem}
              />
            ) : (
              <TransducerGallery onSelect={setSelectedCalcKey} />
            )}
          </ErrorBoundary>
        </main>
      </div>

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
                    className={topic.key === selectedHelpTopic.key ? 'topic-item active' : 'topic-item'}
                    onClick={() => setHelpTopicKey(topic.key)}
                  >
                    <span>{topic.title}</span>
                    <small>{topic.category}</small>
                  </button>
                ))}
              </div>
              <div className="preview">
                <div className="preview-meta">
                  <strong>{selectedHelpTopic.title}</strong>
                  <span>{selectedHelpTopic.file}</span>
                </div>
                <iframe title={selectedHelpTopic.title} srcDoc={helpHtml} className="help-frame" />
              </div>
            </div>
          </section>
        </div>
      )}
    </div>
  )
}
