import { useEffect, useMemo, useRef, useState } from 'react'
import { calculateSquareColumnStrain } from '../../domain/sqrcol'
import { solveSquareColumnFea } from '../../domain/fea/squareColumnSolver'
import StrainFieldViewer from '../StrainFieldViewer'

type UnitSystem = 'SI' | 'US'
type AnalysisMode = 'closed-form' | 'fea'

const N_PER_LBF = 4.4482216152605
const MM_PER_IN = 25.4
const GPA_PER_MPSI = 6.8947572932

const round = (v: number, d = 4): number => Math.round(v * Math.pow(10, d)) / Math.pow(10, d)
const show = (v: number, d: number): string => (Number.isFinite(v) ? v.toFixed(d) : '—')

type Props = { unitSystem: UnitSystem; onUnitChange: (next: UnitSystem) => void }

export default function SquareColumnCalc({ unitSystem, onUnitChange }: Props) {
  const [load, setLoad] = useState(5000)       // N or lbf
  const [width, setWidth] = useState(25)        // mm or in
  const [depth, setDepth] = useState(25)        // mm or in
  const [modulusGPa, setModulusGPa] = useState(200) // GPa or Mpsi
  const [poisson, setPoisson] = useState(0.3)
  const [gageFactor, setGageFactor] = useState(2.1)
  const [analysisMode, setAnalysisMode] = useState<AnalysisMode>('closed-form')

  const prevUnit = useRef<UnitSystem>(unitSystem)
  useEffect(() => {
    if (prevUnit.current === unitSystem) return
    prevUnit.current = unitSystem
    if (unitSystem === 'US') {
      setLoad(v => round(v / N_PER_LBF))
      setWidth(v => round(v / MM_PER_IN))
      setDepth(v => round(v / MM_PER_IN))
      setModulusGPa(v => round(v / GPA_PER_MPSI))
    } else {
      setLoad(v => round(v * N_PER_LBF))
      setWidth(v => round(v * MM_PER_IN))
      setDepth(v => round(v * MM_PER_IN))
      setModulusGPa(v => round(v * GPA_PER_MPSI))
    }
  }, [unitSystem])

  const siInputs = useMemo(() => {
    const mm = unitSystem === 'SI' ? 1 : MM_PER_IN
    return {
      loadN: unitSystem === 'SI' ? load : load * N_PER_LBF,
      widthMm: width * mm,
      depthMm: depth * mm,
      modulusGPa: unitSystem === 'SI' ? modulusGPa : modulusGPa * GPA_PER_MPSI,
    }
  }, [unitSystem, load, width, depth, modulusGPa])

  const result = useMemo(() => {
    const modulusForDomain = unitSystem === 'US' ? modulusGPa * 1e6 : modulusGPa
    const checks: [number, string][] = [
      [load, 'Applied load'], [width, 'Width'], [depth, 'Depth'],
      [modulusForDomain, 'Modulus'], [gageFactor, 'Gage factor'],
    ]
    const bad = checks.find(([v]) => !Number.isFinite(v) || v <= 0)
    if (bad) return { error: `${bad[1]} must be a positive value.`, data: null }
    if (!Number.isFinite(poisson) || poisson <= 0 || poisson >= 0.5) return { error: 'Poisson\'s ratio must be between 0 and 0.5.', data: null }

    try {
      const data = calculateSquareColumnStrain({
        appliedLoad: load,
        width,
        depth,
        modulus: modulusForDomain,
        poissonRatio: poisson,
        gageFactor,
        usUnits: unitSystem === 'US',
      })
      return { error: '', data }
    } catch (e) {
      return { error: e instanceof Error ? e.message : 'Calculation error', data: null }
    }
  }, [unitSystem, load, width, depth, modulusGPa, poisson, gageFactor])

  const feaSolution = useMemo(() => {
    if (analysisMode !== 'fea') return null
    const { loadN, widthMm, depthMm, modulusGPa: modGPa } = siInputs
    if ([loadN, widthMm, depthMm, modGPa].some(v => !Number.isFinite(v) || v <= 0)) return null
    if (!Number.isFinite(poisson) || poisson <= 0 || poisson >= 0.5) return null
    try {
      return solveSquareColumnFea({
        appliedForceN: loadN,
        widthMm,
        depthMm,
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
      <div className="bino-illustration">
        <img src="/legacy-help/SqrCol.jpg" alt="Square column geometry" onError={e => { (e.target as HTMLImageElement).style.display = 'none' }} />
      </div>
      <div className="bino-grid">
        <label>Applied load ({forceUnit})<input type="number" value={Number.isFinite(load) ? load : ''} onChange={e => setLoad(e.target.value === '' ? NaN : Number(e.target.value))} /></label>
        <label>Width ({lenUnit})<input type="number" value={Number.isFinite(width) ? width : ''} onChange={e => setWidth(e.target.value === '' ? NaN : Number(e.target.value))} /></label>
        <label>Depth ({lenUnit})<input type="number" value={Number.isFinite(depth) ? depth : ''} onChange={e => setDepth(e.target.value === '' ? NaN : Number(e.target.value))} /></label>
        <label>Modulus ({modUnit})<input type="number" value={Number.isFinite(modulusGPa) ? modulusGPa : ''} onChange={e => setModulusGPa(e.target.value === '' ? NaN : Number(e.target.value))} /></label>
        <label>Poisson&apos;s ratio<input type="number" value={Number.isFinite(poisson) ? poisson : ''} onChange={e => setPoisson(e.target.value === '' ? NaN : Number(e.target.value))} /></label>
        <label>Gage factor<input type="number" value={Number.isFinite(gageFactor) ? gageFactor : ''} onChange={e => setGageFactor(e.target.value === '' ? NaN : Number(e.target.value))} /></label>
      </div>
      {result.error && <p className="workspace-note">{result.error}</p>}
      <table className="bino-table">
        <tbody>
          <tr><th colSpan={3}>Calculated Values</th></tr>
          <tr><td>Axial Strain:</td><td>{show(result.data?.axialStrain ?? NaN, 1)}</td><td>µε</td></tr>
          <tr><td>Transverse Strain:</td><td>{show(result.data?.transverseStrain ?? NaN, 1)}</td><td>µε</td></tr>
          <tr><td>Full Bridge Span:</td><td>{show(result.data?.fullSpanOutput ?? NaN, 4)}</td><td>mV/V</td></tr>
        </tbody>
      </table>

      {analysisMode === 'fea' && (
        <div className="fea-analysis-section">
          {feaSolution ? (
            <StrainFieldViewer
              solution={feaSolution}
              strainKey="exx"
              label={`ε_xx field — column cross-section ${siInputs.widthMm.toFixed(1)} × ${siInputs.depthMm.toFixed(1)} mm`}
            />
          ) : (
            <p className="fea-note">Enter valid inputs to compute FEA strain field.</p>
          )}
          <p className="fea-note">2D plane-stress CST · axial strain (ε_xx) should be uniform throughout column cross-section</p>
        </div>
      )}
    </div>
  )
}
