import { Suspense, lazy, useEffect, useMemo, useRef, useState } from 'react'
import { computeCantileverStress } from '../../domain/core'
import {
  calculateCantileverAvgStrain,
  calculateCantileverGradient,
  calculateCantileverMaxStrain,
  calculateCantileverMinStrain,
} from '../../domain/beams'
import { runCantileverFeaScaffold } from '../../domain/fea/cantilever'
import { generateCantileverMeshStep } from '../../domain/fea/stepExport'

const StepMeshViewer = lazy(() => import('../StepMeshViewer'))

type UnitSystem = 'SI' | 'US'

const N_PER_LBF = 4.4482216152605
const MM_PER_IN = 25.4
const GPA_PER_MPSI = 6.8947572932
const MPA_PER_KSI = 6.8947572932

const round = (v: number, d = 4): number => {
  const f = Math.pow(10, d)
  return Math.round(v * f) / f
}
const show = (v: number, d: number): string => (Number.isFinite(v) ? v.toFixed(d) : '—')

const MESH_OPTIONS = { elementsAlongLength: 40, elementsThroughThickness: 8 } as const

type Props = {
  unitSystem: UnitSystem
  onUnitChange: (next: UnitSystem) => void
}

export default function CantileverCalc({ unitSystem, onUnitChange }: Props) {
  const [load, setLoad] = useState(100)         // N or lbf
  const [width, setWidth] = useState(25)         // mm or in
  const [thickness, setThickness] = useState(2)  // mm or in
  const [momentArm, setMomentArm] = useState(100)// mm or in
  const [modulusGPa, setModulusGPa] = useState(200) // GPa or Mpsi
  const [gageLength, setGageLength] = useState(5)   // mm or in
  const [gageFactor, setGageFactor] = useState(2.1)
  const [analysisPath, setAnalysisPath] = useState<'closed-form' | 'fea'>('closed-form')

  const prevUnit = useRef<UnitSystem>(unitSystem)
  useEffect(() => {
    if (prevUnit.current === unitSystem) return
    prevUnit.current = unitSystem
    if (unitSystem === 'US') {
      setLoad(v => round(v / N_PER_LBF))
      setWidth(v => round(v / MM_PER_IN))
      setThickness(v => round(v / MM_PER_IN))
      setMomentArm(v => round(v / MM_PER_IN))
      setModulusGPa(v => round(v / GPA_PER_MPSI))
      setGageLength(v => round(v / MM_PER_IN))
    } else {
      setLoad(v => round(v * N_PER_LBF))
      setWidth(v => round(v * MM_PER_IN))
      setThickness(v => round(v * MM_PER_IN))
      setMomentArm(v => round(v * MM_PER_IN))
      setModulusGPa(v => round(v * GPA_PER_MPSI))
      setGageLength(v => round(v * MM_PER_IN))
    }
  }, [unitSystem])

  // Normalize to SI for calculations
  const norm = useMemo(() => {
    const s = unitSystem === 'SI' ? 1 : 0
    return {
      loadN: s ? load : load * N_PER_LBF,
      widthMm: s ? width : width * MM_PER_IN,
      thicknessMm: s ? thickness : thickness * MM_PER_IN,
      momentArmMm: s ? momentArm : momentArm * MM_PER_IN,
      modulusGPa: s ? modulusGPa : modulusGPa * GPA_PER_MPSI,
      gageLengthMm: s ? gageLength : gageLength * MM_PER_IN,
    }
  }, [unitSystem, load, width, thickness, momentArm, modulusGPa, gageLength])

  const inputError = useMemo(() => {
    const checks: [number, string][] = [
      [norm.loadN, 'Applied load'],
      [norm.widthMm, 'Beam width'],
      [norm.thicknessMm, 'Thickness'],
      [norm.momentArmMm, 'Load point to gage CL length'],
      [norm.modulusGPa, 'Modulus of Elasticity'],
      [norm.gageLengthMm, 'Gage length'],
      [gageFactor, 'Gage factor'],
    ]
    const bad = checks.find(([v]) => !Number.isFinite(v) || v <= 0)
    return bad ? `${bad[1]} must be a positive value.` : ''
  }, [norm, gageFactor])

  const result = useMemo(() => {
    if (inputError) return null
    try {
      const min = calculateCantileverMinStrain(norm.loadN, norm.momentArmMm, norm.gageLengthMm, norm.modulusGPa, norm.widthMm, norm.thicknessMm)
      const max = calculateCantileverMaxStrain(norm.loadN, norm.momentArmMm, norm.gageLengthMm, norm.modulusGPa, norm.widthMm, norm.thicknessMm)
      const avg = calculateCantileverAvgStrain(norm.loadN, norm.momentArmMm, norm.modulusGPa, norm.widthMm, norm.thicknessMm)
      const stressMPa = computeCantileverStress(norm.loadN, norm.widthMm, norm.thicknessMm, norm.momentArmMm)
      return {
        minStrain: min,
        maxStrain: max,
        avgStrain: avg,
        gradient: calculateCantileverGradient(max, min),
        spanMvV: avg * gageFactor * 1e-3,
        stressMPa,
      }
    } catch {
      return null
    }
  }, [inputError, norm, gageFactor])

  const feaInput = useMemo(() => ({
    appliedForceN: norm.loadN,
    beamWidthMm: norm.widthMm,
    thicknessMm: norm.thicknessMm,
    loadPointToGageClLengthMm: norm.momentArmMm,
    modulusGPa: norm.modulusGPa,
    gageLengthMm: norm.gageLengthMm,
    gageFactor,
  }), [norm, gageFactor])

  const feaSolution = useMemo(() => {
    if (inputError || analysisPath !== 'fea') return null
    try { return runCantileverFeaScaffold(feaInput, MESH_OPTIONS) } catch { return null }
  }, [inputError, analysisPath, feaInput])

  const activeResult = analysisPath === 'fea'
    ? (feaSolution ? { ...result, avgStrain: feaSolution.gauge.nominalStrainMicrostrain, gradient: feaSolution.gauge.strainVariationPercent, spanMvV: feaSolution.gauge.spanMvV } : null)
    : result

  const forceUnit = unitSystem === 'SI' ? 'N' : 'lbf'
  const lenUnit = unitSystem === 'SI' ? 'mm' : 'in'
  const modUnit = unitSystem === 'SI' ? 'GPa' : 'Mpsi'
  const stressDisplay = result ? (unitSystem === 'SI' ? result.stressMPa : result.stressMPa / MPA_PER_KSI) : NaN
  const stressUnit = unitSystem === 'SI' ? 'MPa' : 'ksi'

  const exportStep = () => {
    if (inputError) return
    const text = generateCantileverMeshStep(feaInput, MESH_OPTIONS)
    const a = document.createElement('a')
    a.href = URL.createObjectURL(new Blob([text], { type: 'application/step' }))
    a.download = `cantilever_mesh.step`
    a.click()
  }

  return (
    <div className="bino-wrap">
      <div className="workspace-controls">
        <div className="analysis-toggle">
          <button className={analysisPath === 'closed-form' ? 'active' : ''} onClick={() => setAnalysisPath('closed-form')}>Closed-form</button>
          <button className={analysisPath === 'fea' ? 'active' : ''} onClick={() => setAnalysisPath('fea')}>FEA</button>
        </div>
        <div className="analysis-toggle">
          <button className={unitSystem === 'SI' ? 'active' : ''} onClick={() => onUnitChange('SI')}>SI</button>
          <button className={unitSystem === 'US' ? 'active' : ''} onClick={() => onUnitChange('US')}>US</button>
        </div>
        <button className="export-btn" onClick={exportStep} disabled={!!inputError}>Export STEP</button>
      </div>

      <div className="bino-illustration">
        <img src="/legacy-help/BBCant.jpg" alt="Cantilever beam geometry" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }} />
      </div>

      <div className="bino-grid">
        <label>Applied load ({forceUnit})<input type="number" value={Number.isFinite(load) ? load : ''} onChange={e => setLoad(e.target.value === '' ? NaN : Number(e.target.value))} /></label>
        <label>Beam width ({lenUnit})<input type="number" value={Number.isFinite(width) ? width : ''} onChange={e => setWidth(e.target.value === '' ? NaN : Number(e.target.value))} /></label>
        <label>Thickness ({lenUnit})<input type="number" value={Number.isFinite(thickness) ? thickness : ''} onChange={e => setThickness(e.target.value === '' ? NaN : Number(e.target.value))} /></label>
        <label>Load point to gage CL, L ({lenUnit})<input type="number" value={Number.isFinite(momentArm) ? momentArm : ''} onChange={e => setMomentArm(e.target.value === '' ? NaN : Number(e.target.value))} /></label>
        <label>Modulus of Elasticity ({modUnit})<input type="number" value={Number.isFinite(modulusGPa) ? modulusGPa : ''} onChange={e => setModulusGPa(e.target.value === '' ? NaN : Number(e.target.value))} /></label>
        <label>Gage length ({lenUnit})<input type="number" value={Number.isFinite(gageLength) ? gageLength : ''} onChange={e => setGageLength(e.target.value === '' ? NaN : Number(e.target.value))} /></label>
        <label>Gage factor<input type="number" value={Number.isFinite(gageFactor) ? gageFactor : ''} onChange={e => setGageFactor(e.target.value === '' ? NaN : Number(e.target.value))} /></label>
      </div>

      {inputError && <p className="workspace-note">{inputError}</p>}

      <table className="bino-table">
        <tbody>
          <tr><th colSpan={3}>Calculated Values</th></tr>
          <tr><td>Nominal Gage Strain:</td><td>{show(activeResult?.avgStrain ?? NaN, 1)}</td><td>µε</td></tr>
          <tr><td>Strain Variation:</td><td>{show(activeResult?.gradient ?? NaN, 2)}</td><td>%</td></tr>
          <tr><td>Span at Applied Force:</td><td>{show(activeResult?.spanMvV ?? NaN, 4)}</td><td>mV/V</td></tr>
          <tr><td>Bending Stress:</td><td>{show(stressDisplay, 3)}</td><td>{stressUnit}</td></tr>
        </tbody>
      </table>

      {analysisPath === 'fea' && (
        <div className="viewer-block">
          <h3>FEA Mesh Viewer</h3>
          {!inputError && feaSolution ? (
            <Suspense fallback={<div className="step-viewer loading">Loading 3D viewer…</div>}>
              <StepMeshViewer input={feaInput} solution={feaSolution.solution} meshOptions={MESH_OPTIONS} />
            </Suspense>
          ) : (
            <div className="step-viewer loading">{inputError || 'Unable to solve FEA for current inputs.'}</div>
          )}
        </div>
      )}
    </div>
  )
}
