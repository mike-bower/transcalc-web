import { Suspense, lazy, useEffect, useMemo, useRef, useState } from 'react'
import { calculateRoundSolidColumnStrain } from '../../domain/rndsldc'
import { solveRoundSolidColumnFea } from '../../domain/fea/roundSolidColumnSolver'
import RoundSolidColumnModelPreview from '../RoundSolidColumnModelPreview'
import RoundSolidColumnDiagram from '../diagrams/RoundSolidColumnDiagram'
import type { CstFeaViewMode } from '../CstFeaViewer'

const CstFeaViewer = lazy(() => import('../CstFeaViewer'))

type UnitSystem = 'SI' | 'US'
type AnalysisMode = 'closed-form' | 'fea'

const N_PER_LBF = 4.4482216152605
const MM_PER_IN = 25.4
const GPA_PER_MPSI = 6.8947572932

const round = (v: number, d = 4): number => Math.round(v * Math.pow(10, d)) / Math.pow(10, d)
const show = (v: number, d: number): string => (Number.isFinite(v) ? v.toFixed(d) : '—')

type Props = { unitSystem: UnitSystem; onUnitChange: (next: UnitSystem) => void }

export default function RoundSolidColumnCalc({ unitSystem, onUnitChange }: Props) {
  const [load, setLoad] = useState(5000)
  const [diameter, setDiameter] = useState(25)
  const [columnLength, setColumnLength] = useState(150)
  const [modulusGPa, setModulusGPa] = useState(200)
  const [poisson, setPoisson] = useState(0.3)
  const [gageFactor, setGageFactor] = useState(2.1)
  const [analysisMode, setAnalysisMode] = useState<AnalysisMode>('closed-form')
  const [viewMode, setViewMode] = useState<CstFeaViewMode>('contour')

  const prevUnit = useRef<UnitSystem>(unitSystem)
  useEffect(() => {
    if (prevUnit.current === unitSystem) return
    prevUnit.current = unitSystem
    if (unitSystem === 'US') {
      setLoad(v => round(v / N_PER_LBF))
      setDiameter(v => round(v / MM_PER_IN))
      setColumnLength(v => round(v / MM_PER_IN))
      setModulusGPa(v => round(v / GPA_PER_MPSI))
    } else {
      setLoad(v => round(v * N_PER_LBF))
      setDiameter(v => round(v * MM_PER_IN))
      setColumnLength(v => round(v * MM_PER_IN))
      setModulusGPa(v => round(v * GPA_PER_MPSI))
    }
  }, [unitSystem])

  const siInputs = useMemo(() => {
    const mm = unitSystem === 'SI' ? 1 : MM_PER_IN
    return {
      loadN: unitSystem === 'SI' ? load : load * N_PER_LBF,
      diameterMm: diameter * mm,
      lengthMm: columnLength * mm,
      modulusGPa: unitSystem === 'SI' ? modulusGPa : modulusGPa * GPA_PER_MPSI,
    }
  }, [unitSystem, load, diameter, columnLength, modulusGPa])

  const columnLengthWarning = useMemo(() => {
    const mm = unitSystem === 'SI' ? 1 : MM_PER_IN
    const lenMm = columnLength * mm
    const maxDim = diameter * mm
    if (Number.isFinite(lenMm) && Number.isFinite(maxDim) && maxDim > 0 && lenMm < 5 * maxDim) {
      return `Column length should be ≥ 5× diameter (${(5 * maxDim).toFixed(1)} ${unitSystem === 'SI' ? 'mm' : 'in'}) for uniform strain at gage locations (VMM-26).`
    }
    return ''
  }, [unitSystem, columnLength, diameter])

  const result = useMemo(() => {
    const modulusForDomain = unitSystem === 'US' ? modulusGPa * 1e6 : modulusGPa
    const checks: [number, string][] = [
      [load, 'Applied load'], [diameter, 'Diameter'], [modulusForDomain, 'Modulus'], [gageFactor, 'Gage factor'],
    ]
    const bad = checks.find(([v]) => !Number.isFinite(v) || v <= 0)
    if (bad) return { error: `${bad[1]} must be a positive value.`, data: null }
    if (!Number.isFinite(poisson) || poisson <= 0 || poisson >= 0.5) return { error: 'Poisson\'s ratio must be between 0 and 0.5.', data: null }
    try {
      const data = calculateRoundSolidColumnStrain({ appliedLoad: load, diameter, modulus: modulusForDomain, poissonRatio: poisson, gageFactor, usUnits: unitSystem === 'US' })
      return { error: '', data }
    } catch (e) { return { error: e instanceof Error ? e.message : 'Calculation error', data: null } }
  }, [unitSystem, load, diameter, modulusGPa, poisson, gageFactor])

  const naturalFreqHz = useMemo(() => {
    const { loadN, diameterMm, lengthMm, modulusGPa: modGPa } = siInputs
    if ([loadN, diameterMm, lengthMm, modGPa].some(v => !Number.isFinite(v) || v <= 0)) return NaN
    const E = modGPa * 1e9
    const A = Math.PI * Math.pow(diameterMm / 2000, 2)
    const L = lengthMm / 1000
    const k = A * E / L
    const mLoad = loadN / 9.80665
    const mCol = 7850 * A * L
    const mEff = mLoad + mCol / 3
    return mEff > 0 ? (1 / (2 * Math.PI)) * Math.sqrt(k / mEff) : NaN
  }, [siInputs])

  const feaSolution = useMemo(() => {
    if (analysisMode !== 'fea') return null
    const { loadN, diameterMm, modulusGPa: modGPa } = siInputs
    if ([loadN, diameterMm, modGPa].some(v => !Number.isFinite(v) || v <= 0)) return null
    if (!Number.isFinite(poisson) || poisson <= 0 || poisson >= 0.5) return null
    try {
      return solveRoundSolidColumnFea({
        appliedForceN: loadN,
        diameterMm,
        modulusGPa: modGPa,
        poissonRatio: poisson,
      })
    } catch { return null }
  }, [analysisMode, siInputs, poisson])

  const forceUnit = unitSystem === 'SI' ? 'N' : 'lbf'
  const lenUnit = unitSystem === 'SI' ? 'mm' : 'in'
  const modUnit = unitSystem === 'SI' ? 'GPa' : 'Mpsi'

  return (
    <div className="bino-wrap">
      <div className="workspace-controls">
        <div className="analysis-toggle">
          <button className={unitSystem === 'SI' ? 'active' : ''} onClick={() => onUnitChange('SI')}>SI</button>
          <button className={unitSystem === 'US' ? 'active' : ''} onClick={() => onUnitChange('US')}>US</button>
        </div>
        <div className="analysis-toggle">
          <button className={analysisMode === 'closed-form' ? 'active' : ''} onClick={() => setAnalysisMode('closed-form')}>Closed-form</button>
          <button className={analysisMode === 'fea' ? 'active' : ''} onClick={() => setAnalysisMode('fea')}>FEA</button>
        </div>
      </div>
      <div className="calc-preview-pair">
        <div className="calc-diagram-2d">
          <RoundSolidColumnDiagram
            load={siInputs.loadN}
            diameter={siInputs.diameterMm}
            length={siInputs.lengthMm}
            unitSystem={unitSystem}
          />
        </div>
        <div className="calc-model-3d">
          <RoundSolidColumnModelPreview
            params={{
              load: siInputs.loadN,
              diameter: siInputs.diameterMm,
              length: siInputs.lengthMm,
              modulus: siInputs.modulusGPa,
              poisson,
              gageFactor,
            }}
            us={unitSystem === 'US'}
          />
        </div>
      </div>
      <div className="bino-grid">
        <label>Applied load ({forceUnit})<input type="number" value={Number.isFinite(load) ? load : ''} onChange={e => setLoad(e.target.value === '' ? NaN : Number(e.target.value))} /></label>
        <label>Diameter ({lenUnit})<input type="number" value={Number.isFinite(diameter) ? diameter : ''} onChange={e => setDiameter(e.target.value === '' ? NaN : Number(e.target.value))} /></label>
        <label>Column length ({lenUnit})<input type="number" value={Number.isFinite(columnLength) ? columnLength : ''} onChange={e => setColumnLength(e.target.value === '' ? NaN : Number(e.target.value))} /></label>
        <label>Modulus ({modUnit})<input type="number" value={Number.isFinite(modulusGPa) ? modulusGPa : ''} onChange={e => setModulusGPa(e.target.value === '' ? NaN : Number(e.target.value))} /></label>
        <label>Poisson&apos;s ratio<input type="number" value={Number.isFinite(poisson) ? poisson : ''} onChange={e => setPoisson(e.target.value === '' ? NaN : Number(e.target.value))} /></label>
        <label>Gage factor<input type="number" value={Number.isFinite(gageFactor) ? gageFactor : ''} onChange={e => setGageFactor(e.target.value === '' ? NaN : Number(e.target.value))} /></label>
      </div>
      {result.error && <p className="workspace-note">{result.error}</p>}
      {columnLengthWarning && <p className="fea-accuracy-warn">{columnLengthWarning}</p>}
      <table className="bino-table">
        <tbody>
          <tr><th colSpan={3}>Calculated Values</th></tr>
          <tr><td>Axial Strain:</td><td>{show(result.data?.axialStrain ?? NaN, 1)}</td><td>µε</td></tr>
          <tr><td>Transverse Strain:</td><td>{show(result.data?.transverseStrain ?? NaN, 1)}</td><td>µε</td></tr>
          <tr><td>Full Bridge Span:</td><td>{show(result.data?.fullSpanOutput ?? NaN, 4)}</td><td>mV/V</td></tr>
          <tr><td>Natural Frequency:</td><td>{show(naturalFreqHz, 1)}</td><td>Hz</td></tr>
        </tbody>
      </table>

      {analysisMode === 'fea' && (
        <div className="fea-analysis-section">
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
                  depthMm={siInputs.diameterMm}
                  viewMode={viewMode}
                  strainKey="exx"
                  bcType="axial"
                  unitSystem={unitSystem}
                  dimLabels={[{ label: '⌀', value: siInputs.diameterMm }]}
                />
              </Suspense>
              <p className="fea-note">2D plane-stress CST · equivalent rectangular section (area = π·D²/4)</p>
            </>
          ) : (
            <p className="fea-note">Enter valid inputs to compute FEA strain field.</p>
          )}
        </div>
      )}
    </div>
  )
}
