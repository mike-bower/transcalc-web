import { useEffect, useMemo, useState } from 'react'
import WorkspaceRouter from './components/WorkspaceRouter'
import ProjectPanel from './components/ProjectPanel'
import { newProject, ProjectState } from './domain/projectSchema'

type UnitSystem = 'SI' | 'US'

type CalculatorTopic = {
  key: string
  title: string
  category: string
  file: string
  summary: string
}

type UserFlow = {
  key: string
  title: string
  description: string
  recommended: string[]
  stages: string[]
}

const CALCULATORS: CalculatorTopic[] = [
  { key: 'bbcant', title: 'Bending Beam Cantilever', category: 'Beams', file: 'BBCant.htm', summary: 'Size beam geometry and predict stress.' },
  { key: 'bino', title: 'Binocular Beam', category: 'Beams', file: 'Bino.htm', summary: 'Evaluate dual-hole beam behavior.' },
  { key: 'dualbb', title: 'Dual Beam', category: 'Beams', file: 'DualBB.htm', summary: 'Design matched dual-element beams.' },
  { key: 'revbb', title: 'Reverse Bending Beam', category: 'Beams', file: 'RevBB.htm', summary: 'Reverse-loaded bending beam strain.' },
  { key: 'sbbeam', title: 'S-Beam', category: 'Beams', file: 'SBBeam.htm', summary: 'S-beam sizing and shear checks.' },
  { key: 'sqrcol', title: 'Square Column', category: 'Compression', file: 'SqrCol.htm', summary: 'Column compression strain sizing.' },
  { key: 'rndsldc', title: 'Round Solid Column', category: 'Compression', file: 'RndSld.htm', summary: 'Round solid shaft compression.' },
  { key: 'rndhlwc', title: 'Round Hollow Column', category: 'Compression', file: 'RndHlw.htm', summary: 'Round hollow shaft compression.' },
  { key: 'shrsqr', title: 'Shear Square Web', category: 'Shear', file: 'ShrSqr.htm', summary: 'Square web shear and strain outputs.' },
  { key: 'shrrnd', title: 'Shear Round Web', category: 'Shear', file: 'ShrRnd.htm', summary: 'Round web full-bridge span estimate.' },
  { key: 'shrrnd1', title: 'Shear Round S-Beam', category: 'Shear', file: 'ShrRsb.htm', summary: 'Round S-beam shear response.' },
  { key: 'sqrtor', title: 'Square Torque', category: 'Torsion', file: 'SqrTor.htm', summary: 'Square shaft torque validation.' },
  { key: 'rndsld', title: 'Round Solid Torque', category: 'Torsion', file: 'RndSld.htm', summary: 'Solid shaft torsion stress and span.' },
  { key: 'rndhlw', title: 'Round Hollow Torque', category: 'Torsion', file: 'RndHlw.htm', summary: 'Model hollow-shaft torque transducers.' },
  { key: 'pressure', title: 'Pressure Diaphragm', category: 'Pressure', file: 'Pressure.htm', summary: 'Map pressure load to strain output.' },
  { key: 'zvstemp',  title: 'Zero vs Temperature', category: 'Calibration', file: 'ZvsTemp.htm',  summary: 'Thermal zero drift compensation.' },
  { key: 'zerobal',  title: 'Zero Balance',         category: 'Calibration', file: 'ZeroBal.htm',  summary: 'Initial zero correction and balancing.' },
  { key: 'span2pt',  title: 'Span 2-Point',         category: 'Span',        file: 'Span2pt.htm',  summary: 'Two-point temperature compensation.' },
  { key: 'span3pt',  title: 'Span 3-Point',         category: 'Span',        file: 'Span3pt.htm',  summary: 'Three-point compensation workflow.' },
  { key: 'optshunt', title: 'Shunt Optimization',   category: 'Span',        file: 'OptShnt.htm',  summary: 'Find optimal shunt for span stability.' },
  { key: 'spanset',  title: 'Span Set',             category: 'Span',        file: 'SpanSet.htm',  summary: 'Convert target span into trim resistance.' },
  { key: 'simspan',  title: 'Simulated Span',       category: 'Span',        file: 'SimSpan.htm',  summary: 'Simultaneous 3-point span solution.' },
  { key: 'trimvis', title: 'Trim Visualizer',      category: 'Trim',        file: 'TrimVis.htm',  summary: 'Find rung-cut pattern for a target resistance.' },
]

const USER_FLOWS: UserFlow[] = [
  {
    key: 'design-verification',
    title: 'Design Verification',
    description: 'Validate transducer designs against stress, strain, and span targets.',
    recommended: ['bbcant', 'bino', 'dualbb', 'revbb', 'sbbeam', 'shrsqr', 'pressure'],
    stages: [
      'Select transducer geometry family',
      'Enter design loads and dimensions',
      'Review strain and sensitivity outputs',
      'Compare against practical design limits',
    ],
  },
  {
    key: 'circuit-refinement',
    title: 'Circuit Refinement',
    description: 'Tune a built transducer using resistive compensation workflows.',
    recommended: ['span2pt', 'span3pt', 'optshunt', 'spanset', 'zerobal', 'zvstemp', 'trimvis'],
    stages: [
      'Load measured baseline behavior',
      'Choose refinement objective (span or zero)',
      'Apply resistor/compensation strategy',
      'Iterate until error and drift are acceptable',
    ],
  },
]

export default function App() {
  const [unitSystem, setUnitSystem] = useState<UnitSystem>('SI')
  const [selectedFlowKey, setSelectedFlowKey] = useState('design-verification')
  const [selectedHelpKey, setSelectedHelpKey] = useState('bbcant')
  const [helpSearch, setHelpSearch] = useState('')
  const [helpHtml, setHelpHtml] = useState<string>('')

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

  const selectedFlow = USER_FLOWS.find(f => f.key === selectedFlowKey) ?? USER_FLOWS[0]
  const selectedTopic = CALCULATORS.find(t => t.key === selectedHelpKey) ?? CALCULATORS[0]

  const recommendedTopics = useMemo(
    () => selectedFlow.recommended
      .map(k => CALCULATORS.find(c => c.key === k))
      .filter((t): t is CalculatorTopic => Boolean(t)),
    [selectedFlow]
  )

  const filteredTopics = useMemo(() => {
    const q = helpSearch.trim().toLowerCase()
    if (!q) return CALCULATORS
    return CALCULATORS.filter(t =>
      `${t.title} ${t.category}`.toLowerCase().includes(q)
    )
  }, [helpSearch])

  useEffect(() => {
    let canceled = false
    fetch(`/legacy-help/${selectedTopic.file}`)
      .then(r => r.text())
      .then(html => { if (!canceled) setHelpHtml(html) })
      .catch(() => { if (!canceled) setHelpHtml('<html><body><p>Unable to load help content.</p></body></html>') })
    return () => { canceled = true }
  }, [selectedTopic.file])

  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="brand">
          <span className="brand-mark">TC</span>
          <div>
            <h1>Transcalc Engineering Workbench</h1>
            <p>Design Verification and Circuit Refinement, modernized</p>
          </div>
        </div>
        <div className="topbar-right">
          <ProjectPanel onGetState={handleGetState} onLoadState={handleLoadState} />
          <div className="analysis-toggle">
            <button className={unitSystem === 'SI' ? 'active' : ''} onClick={() => setUnitSystem('SI')}>SI</button>
            <button className={unitSystem === 'US' ? 'active' : ''} onClick={() => setUnitSystem('US')}>US</button>
          </div>
        </div>
      </header>

      <main className="layout">
        <section className="panel journey-panel">
          <h2>Choose Operating Mode</h2>
          <div className="flow-grid">
            {USER_FLOWS.map(flow => (
              <button
                key={flow.key}
                className={flow.key === selectedFlow.key ? 'flow-card active' : 'flow-card'}
                onClick={() => setSelectedFlowKey(flow.key)}
              >
                <strong>{flow.title}</strong>
                <span>{flow.description}</span>
              </button>
            ))}
          </div>
          <div className="mode-stage">
            <h3>{selectedFlow.title} Workflow</h3>
            <ol>
              {selectedFlow.stages.map(stage => (
                <li key={stage}>{stage}</li>
              ))}
            </ol>
          </div>
          <div className="recommended">
            <h3>Recommended Calculators</h3>
            <div className="tool-grid">
              {recommendedTopics.map(topic => (
                <button
                  key={topic.key}
                  className={topic.key === selectedTopic.key ? 'tool-card active' : 'tool-card'}
                  onClick={() => setSelectedHelpKey(topic.key)}
                >
                  <small>{topic.category}</small>
                  <strong>{topic.title}</strong>
                  <span>{topic.summary}</span>
                </button>
              ))}
            </div>
          </div>
        </section>

        <section className="panel workspace">
          <h2>{selectedTopic.title}</h2>
          <p className="muted">{selectedTopic.category} Calculator</p>
          <WorkspaceRouter
            calcKey={selectedHelpKey}
            unitSystem={unitSystem}
            onUnitChange={setUnitSystem}
          />
        </section>

        <section className="panel help-panel">
          <div className="help-header">
            <h2>Context Help + Reference</h2>
            <input
              type="search"
              placeholder="Search topic or category"
              value={helpSearch}
              onChange={e => setHelpSearch(e.target.value)}
            />
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
              <iframe
                title={selectedTopic.title}
                srcDoc={helpHtml}
                className="help-frame"
              />
            </div>
          </div>
        </section>
      </main>
    </div>
  )
}
