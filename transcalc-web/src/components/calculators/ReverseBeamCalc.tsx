import { Suspense, lazy, useEffect, useMemo, useRef, useState } from 'react'
import {
  calculateReversebeamStrain,
  type BridgeConfig,
  BRIDGE_CONFIG_LABELS,
  getActiveGages,
} from '../../domain/reversebeam'
import { solveReverseBeamFea } from '../../domain/fea/reverseBeamSolver'
import ReverseBeamDiagram from '../diagrams/ReverseBeamDiagram'
import ReverseBeamBridgeDiagram from '../diagrams/ReverseBeamBridgeDiagram'
import ReverseBeamModelPreview from '../ReverseBeamModelPreview'
import type { CstFeaViewMode } from '../CstFeaViewer'

const CstFeaViewer = lazy(() => import('../CstFeaViewer'))

type UnitSystem = 'SI' | 'US'
type AnalysisMode = 'closed-form' | 'fea'

const N_PER_LBF = 4.4482216152605
const MM_PER_IN = 25.4
const GPA_PER_MPSI = 6.8947572932

const round = (v: number, d = 4): number => Math.round(v * Math.pow(10, d)) / Math.pow(10, d)
const show = (v: number, d: number): string => (Number.isFinite(v) ? v.toFixed(d) : '—')

type Props = {
  unitSystem: UnitSystem
  onUnitChange: (next: UnitSystem) => void
}

function SectionToggle({ label, open, onToggle }: { label: string; open: boolean; onToggle: () => void }) {
  return (
    <button
      onClick={onToggle}
      style={{
        display: 'flex', alignItems: 'center', gap: 6,
        background: 'none', border: 'none', padding: '6px 2px 2px',
        cursor: 'pointer', width: '100%', textAlign: 'left',
        color: 'var(--accent)', fontSize: '0.85rem', fontWeight: 600,
        textTransform: 'uppercase', letterSpacing: '0.05em',
        fontFamily: 'inherit',
      }}
      aria-expanded={open}
    >
      <span style={{ fontSize: 10, display: 'inline-block', width: 10, transition: 'transform 0.15s', transform: open ? 'rotate(0deg)' : 'rotate(-90deg)' }}>▼</span>
      {label}
    </button>
  )
}

export default function ReverseBeamCalc({ unitSystem, onUnitChange }: Props) {
  const [load, setLoad] = useState(100)             // N or lbf
  const [width, setWidth] = useState(25)             // mm or in
  const [thickness, setThickness] = useState(2)      // mm or in
  const [beamLength, setBeamLength] = useState(75)   // mm or in
  const [distBetweenGages, setDistBetweenGages] = useState(25) // mm or in
  const [modulusGPa, setModulusGPa] = useState(200)  // GPa or Mpsi
  const [gageLength, setGageLength] = useState(5)    // mm or in
  const [gageFactor, setGageFactor] = useState(2.1)
  const [bridgeConfig, setBridgeConfig] = useState<BridgeConfig>('fullBridgeTopBot')
  const [poissonRatio, setPoissonRatio] = useState(0.3)
  const [analysisMode, setAnalysisMode] = useState<AnalysisMode>('closed-form')
  const [viewMode, setViewMode] = useState<CstFeaViewMode>('contour')
  const [show2D, setShow2D] = useState(true)
  const [show3D, setShow3D] = useState(true)
  const [showInputs, setShowInputs] = useState(true)
  const [showResults, setShowResults] = useState(true)
  const [showFea, setShowFea] = useState(true)

  const prevUnit = useRef<UnitSystem>(unitSystem)
  useEffect(() => {
    if (prevUnit.current === unitSystem) return
    prevUnit.current = unitSystem
    if (unitSystem === 'US') {
      setLoad(v => round(v / N_PER_LBF))
      setWidth(v => round(v / MM_PER_IN))
      setThickness(v => round(v / MM_PER_IN))
      setBeamLength(v => round(v / MM_PER_IN))
      setDistBetweenGages(v => round(v / MM_PER_IN))
      setModulusGPa(v => round(v / GPA_PER_MPSI))
      setGageLength(v => round(v / MM_PER_IN))
    } else {
      setLoad(v => round(v * N_PER_LBF))
      setWidth(v => round(v * MM_PER_IN))
      setThickness(v => round(v * MM_PER_IN))
      setBeamLength(v => round(v * MM_PER_IN))
      setDistBetweenGages(v => round(v * MM_PER_IN))
      setModulusGPa(v => round(v * GPA_PER_MPSI))
      setGageLength(v => round(v * MM_PER_IN))
    }
  }, [unitSystem])

  // Always call domain in SI: N, mm, Pa
  const siInputs = useMemo(() => {
    const mm = unitSystem === 'SI' ? 1 : MM_PER_IN
    return {
      loadN: unitSystem === 'SI' ? load : load * N_PER_LBF,
      widthMm: width * mm,
      thicknessMm: thickness * mm,
      beamLengthMm: beamLength * mm,
      distMm: distBetweenGages * mm,
      gageLenMm: gageLength * mm,
      modulusGPa: unitSystem === 'SI' ? modulusGPa : modulusGPa * GPA_PER_MPSI,
    }
  }, [unitSystem, load, width, thickness, beamLength, distBetweenGages, modulusGPa, gageLength])

  const result = useMemo(() => {
    const { loadN, widthMm, thicknessMm, distMm, gageLenMm, modulusGPa: modGPa } = siInputs
    const modulusPa = modGPa * 1e9
    const checks: [number, string][] = [
      [loadN, 'Applied load'], [widthMm, 'Beam width'], [thicknessMm, 'Thickness'],
      [distMm, 'Distance between gages'], [modulusPa, 'Modulus'],
      [gageLenMm, 'Gage length'], [gageFactor, 'Gage factor'],
    ]
    const bad = checks.find(([v]) => !Number.isFinite(v) || v <= 0)
    if (bad) return { error: `${bad[1]} must be a positive value.`, data: null }

    try {
      const data = calculateReversebeamStrain({
        appliedLoad: loadN,
        beamWidth: widthMm,
        thickness: thicknessMm,
        distanceBetweenGages: distMm,
        beamLength: siInputs.beamLengthMm,
        modulus: modulusPa,
        gageLength: gageLenMm,
        gageFactor,
        bridgeConfig,
        poissonRatio,
      })
      return { error: '', data }
    } catch (e) {
      return { error: e instanceof Error ? e.message : 'Calculation error', data: null }
    }
  }, [siInputs, gageFactor])

  const feaSolution = useMemo(() => {
    if (analysisMode !== 'fea') return null
    const { loadN, widthMm, thicknessMm, distMm, modulusGPa: modGPa } = siInputs
    if ([loadN, widthMm, thicknessMm, distMm, modGPa].some(v => !Number.isFinite(v) || v <= 0)) return null
    try {
      return solveReverseBeamFea({
        appliedForceN: loadN,
        beamWidthMm: widthMm,
        thicknessMm,
        spanMm: distMm,
        modulusGPa: modGPa,
      })
    } catch { return null }
  }, [analysisMode, siInputs])

  const forceUnit = unitSystem === 'SI' ? 'N' : 'lbf'
  const lenUnit = unitSystem === 'SI' ? 'mm' : 'in'
  const modUnit = unitSystem === 'SI' ? 'GPa' : 'Mpsi'

  // Gage marker: near left support (x = gageLength/2 from left)
  const gageMm = siInputs.gageLenMm / 2
  const span = siInputs.distMm

  return (
    <div className="bino-wrap">
      <div className="workspace-controls">
        <div className="analysis-toggle">
          <button className={analysisMode === 'closed-form' ? 'active' : ''} onClick={() => setAnalysisMode('closed-form')}>Closed-form</button>
          <button className={analysisMode === 'fea' ? 'active' : ''} onClick={() => setAnalysisMode('fea')}>FEA</button>
        </div>
        <div className="analysis-toggle">
          <button className={unitSystem === 'SI' ? 'active' : ''} onClick={() => onUnitChange('SI')}>SI</button>
          <button className={unitSystem === 'US' ? 'active' : ''} onClick={() => onUnitChange('US')}>US</button>
        </div>
      </div>

      <SectionToggle label="Diagrams" open={show2D} onToggle={() => setShow2D(v => !v)} />
      {show2D && (
        <div className="calc-diagram-row">
          <div className="calc-diagram-2d">
            <ReverseBeamDiagram
              load={load}
              width={width}
              thickness={thickness}
              beamLength={beamLength}
              distBetweenGages={distBetweenGages}
              gageLength={gageLength}
              unitSystem={unitSystem}
              bridgeConfig={bridgeConfig}
            />
          </div>
          <div className="calc-diagram-2d">
            <ReverseBeamBridgeDiagram bridgeConfig={bridgeConfig} poissonRatio={poissonRatio} />
          </div>
        </div>
      )}

      <SectionToggle label="3D Model" open={show3D} onToggle={() => setShow3D(v => !v)} />
      {show3D && (
        <div className="calc-model-3d">
          <ReverseBeamModelPreview
            load={load}
            width={width}
            thickness={thickness}
            beamLength={beamLength}
            distBetweenGages={distBetweenGages}
            gageLength={gageLength}
            unitSystem={unitSystem}
            bridgeConfig={bridgeConfig}
          />
        </div>
      )}

      <SectionToggle label="Inputs" open={showInputs} onToggle={() => setShowInputs(v => !v)} />
      {showInputs && (
        <>
          <div className="bino-grid">
            <label style={{ gridColumn: '1 / -1' }}>Bridge Configuration
              <select value={bridgeConfig} onChange={e => setBridgeConfig(e.target.value as BridgeConfig)}
                style={{ display: 'block', width: '100%', marginTop: 4, padding: '4px 8px', borderRadius: 6, border: '1px solid #c8d8e8', fontSize: 13 }}>
                {(Object.keys(BRIDGE_CONFIG_LABELS) as BridgeConfig[]).map(k => (
                  <option key={k} value={k}>{BRIDGE_CONFIG_LABELS[k]}</option>
                ))}
              </select>
            </label>
            <label>Applied load ({forceUnit})<input type="number" value={Number.isFinite(load) ? load : ''} onChange={e => setLoad(e.target.value === '' ? NaN : Number(e.target.value))} /></label>
            <label>Beam width ({lenUnit})<input type="number" value={Number.isFinite(width) ? width : ''} onChange={e => setWidth(e.target.value === '' ? NaN : Number(e.target.value))} /></label>
            <label>Thickness ({lenUnit})<input type="number" value={Number.isFinite(thickness) ? thickness : ''} onChange={e => setThickness(e.target.value === '' ? NaN : Number(e.target.value))} /></label>
            <label>Beam length, L ({lenUnit})<input type="number" value={Number.isFinite(beamLength) ? beamLength : ''} onChange={e => setBeamLength(e.target.value === '' ? NaN : Number(e.target.value))} /></label>
            <label>Distance between gages, D ({lenUnit})<input type="number" value={Number.isFinite(distBetweenGages) ? distBetweenGages : ''} onChange={e => setDistBetweenGages(e.target.value === '' ? NaN : Number(e.target.value))} /></label>
            <label>Modulus of Elasticity ({modUnit})<input type="number" value={Number.isFinite(modulusGPa) ? modulusGPa : ''} onChange={e => setModulusGPa(e.target.value === '' ? NaN : Number(e.target.value))} /></label>
            <label>Gage length ({lenUnit})<input type="number" value={Number.isFinite(gageLength) ? gageLength : ''} onChange={e => setGageLength(e.target.value === '' ? NaN : Number(e.target.value))} /></label>
            <label>Gage factor<input type="number" value={Number.isFinite(gageFactor) ? gageFactor : ''} onChange={e => setGageFactor(e.target.value === '' ? NaN : Number(e.target.value))} /></label>
            {bridgeConfig === 'fullBridgeTop' && (
              <label>Poisson's Ratio<input type="number" value={poissonRatio} step={0.01} min={0.1} max={0.5}
                onChange={e => setPoissonRatio(e.target.value === '' ? 0.3 : Number(e.target.value))} /></label>
            )}
          </div>
          {result.error && <p className="workspace-note">{result.error}</p>}
        </>
      )}

      <SectionToggle label="Results" open={showResults} onToggle={() => setShowResults(v => !v)} />
      {showResults && (
        <table className="bino-table">
          <tbody>
            <tr><th colSpan={3}>Calculated Values</th></tr>
            <tr><td>Nominal Gage Strain:</td><td>{show(result.data?.avgStrain ?? NaN, 0)}</td><td>µε</td></tr>
            <tr><td>Min Strain:</td><td>{show(result.data?.minStrain ?? NaN, 0)}</td><td>µε</td></tr>
            <tr><td>Max Strain:</td><td>{show(result.data?.maxStrain ?? NaN, 0)}</td><td>µε</td></tr>
            <tr><td>Strain Variation:</td><td>{show(result.data?.gradient ?? NaN, 2)}</td><td>%</td></tr>
            <tr><td>Span at Applied Force:</td><td>{show(result.data?.fullSpanSensitivity ?? NaN, 4)}</td><td>mV/V</td></tr>
          </tbody>
        </table>
      )}

      {analysisMode === 'fea' && (
        <>
          <SectionToggle label="FEA Viewer" open={showFea} onToggle={() => setShowFea(v => !v)} />
          {showFea && (
            <div className="viewer-block">
              {feaSolution ? (
                <>
                  <div className="analysis-toggle" style={{ marginBottom: 8 }}>
                    {(['mesh', 'contour', 'deformed', 'boundary'] as const).map((m) => (
                      <button key={m} className={viewMode === m ? 'active' : ''} onClick={() => setViewMode(m)}>{m}</button>
                    ))}
                  </div>
                  <Suspense fallback={<p className="fea-note">Loading 3D viewer…</p>}>
                    <CstFeaViewer
                      solution={feaSolution}
                      depthMm={siInputs.widthMm}
                      viewMode={viewMode}
                      strainKey="exx"
                      bcType="simply-supported"
                      unitSystem={unitSystem}
                      dimLabels={[
                        { label: 'span', value: siInputs.distMm },
                        { label: 'w', value: siInputs.widthMm },
                        { label: 't', value: siInputs.thicknessMm },
                      ]}
                    />
                  </Suspense>
                  <p className="fea-note">2D plane-stress CST · linear elastic</p>
                </>
              ) : (
                <p className="fea-note">Enter valid inputs to compute FEA strain field.</p>
              )}
            </div>
          )}
        </>
      )}
    </div>
  )
}
