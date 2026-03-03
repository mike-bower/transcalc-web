import { useEffect, useMemo, useRef, useState } from 'react'
import { calculateReversebeamStrain } from '../../domain/reversebeam'

type UnitSystem = 'SI' | 'US'

const N_PER_LBF = 4.4482216152605
const MM_PER_IN = 25.4
const GPA_PER_MPSI = 6.8947572932

const round = (v: number, d = 4): number => Math.round(v * Math.pow(10, d)) / Math.pow(10, d)
const show = (v: number, d: number): string => (Number.isFinite(v) ? v.toFixed(d) : '—')

type Props = {
  unitSystem: UnitSystem
  onUnitChange: (next: UnitSystem) => void
}

export default function ReverseBeamCalc({ unitSystem, onUnitChange }: Props) {
  const [load, setLoad] = useState(100)             // N or lbf
  const [width, setWidth] = useState(25)             // mm or in
  const [thickness, setThickness] = useState(2)      // mm or in
  const [distBetweenGages, setDistBetweenGages] = useState(25) // mm or in
  const [modulusGPa, setModulusGPa] = useState(200)  // GPa or Mpsi
  const [gageLength, setGageLength] = useState(5)    // mm or in
  const [gageFactor, setGageFactor] = useState(2.1)

  const prevUnit = useRef<UnitSystem>(unitSystem)
  useEffect(() => {
    if (prevUnit.current === unitSystem) return
    prevUnit.current = unitSystem
    if (unitSystem === 'US') {
      setLoad(v => round(v / N_PER_LBF))
      setWidth(v => round(v / MM_PER_IN))
      setThickness(v => round(v / MM_PER_IN))
      setDistBetweenGages(v => round(v / MM_PER_IN))
      setModulusGPa(v => round(v / GPA_PER_MPSI))
      setGageLength(v => round(v / MM_PER_IN))
    } else {
      setLoad(v => round(v * N_PER_LBF))
      setWidth(v => round(v * MM_PER_IN))
      setThickness(v => round(v * MM_PER_IN))
      setDistBetweenGages(v => round(v * MM_PER_IN))
      setModulusGPa(v => round(v * GPA_PER_MPSI))
      setGageLength(v => round(v * MM_PER_IN))
    }
  }, [unitSystem])

  // Always call domain in SI: N, mm, Pa
  const result = useMemo(() => {
    const loadN = unitSystem === 'SI' ? load : load * N_PER_LBF
    const mm = unitSystem === 'SI' ? 1 : MM_PER_IN
    const widthMm = width * mm
    const thicknessMm = thickness * mm
    const distMm = distBetweenGages * mm
    const gageLenMm = gageLength * mm
    const modulusPa = (unitSystem === 'SI' ? modulusGPa : modulusGPa * GPA_PER_MPSI) * 1e9

    const checks: [number, string][] = [
      [loadN, 'Applied load'],
      [widthMm, 'Beam width'],
      [thicknessMm, 'Thickness'],
      [distMm, 'Distance between gages'],
      [modulusPa, 'Modulus'],
      [gageLenMm, 'Gage length'],
      [gageFactor, 'Gage factor'],
    ]
    const bad = checks.find(([v]) => !Number.isFinite(v) || v <= 0)
    if (bad) return { error: `${bad[1]} must be a positive value.`, data: null }

    try {
      const data = calculateReversebeamStrain({
        appliedLoad: loadN,
        beamWidth: widthMm,
        thickness: thicknessMm,
        distanceBetweenGages: distMm,
        modulus: modulusPa,
        gageLength: gageLenMm,
        gageFactor,
      })
      return { error: '', data }
    } catch (e) {
      return { error: e instanceof Error ? e.message : 'Calculation error', data: null }
    }
  }, [unitSystem, load, width, thickness, distBetweenGages, modulusGPa, gageLength, gageFactor])

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
      </div>

      <div className="bino-illustration">
        <img src="/legacy-help/revbb.jpg" alt="Reverse bending beam geometry" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }} />
      </div>

      <div className="bino-grid">
        <label>Applied load ({forceUnit})<input type="number" value={Number.isFinite(load) ? load : ''} onChange={e => setLoad(e.target.value === '' ? NaN : Number(e.target.value))} /></label>
        <label>Beam width ({lenUnit})<input type="number" value={Number.isFinite(width) ? width : ''} onChange={e => setWidth(e.target.value === '' ? NaN : Number(e.target.value))} /></label>
        <label>Thickness ({lenUnit})<input type="number" value={Number.isFinite(thickness) ? thickness : ''} onChange={e => setThickness(e.target.value === '' ? NaN : Number(e.target.value))} /></label>
        <label>Distance between gages, D ({lenUnit})<input type="number" value={Number.isFinite(distBetweenGages) ? distBetweenGages : ''} onChange={e => setDistBetweenGages(e.target.value === '' ? NaN : Number(e.target.value))} /></label>
        <label>Modulus of Elasticity ({modUnit})<input type="number" value={Number.isFinite(modulusGPa) ? modulusGPa : ''} onChange={e => setModulusGPa(e.target.value === '' ? NaN : Number(e.target.value))} /></label>
        <label>Gage length ({lenUnit})<input type="number" value={Number.isFinite(gageLength) ? gageLength : ''} onChange={e => setGageLength(e.target.value === '' ? NaN : Number(e.target.value))} /></label>
        <label>Gage factor<input type="number" value={Number.isFinite(gageFactor) ? gageFactor : ''} onChange={e => setGageFactor(e.target.value === '' ? NaN : Number(e.target.value))} /></label>
      </div>

      {result.error && <p className="workspace-note">{result.error}</p>}

      <table className="bino-table">
        <tbody>
          <tr><th colSpan={3}>Calculated Values</th></tr>
          <tr><td>Nominal Gage Strain:</td><td>{show(result.data?.avgStrain ?? NaN, 1)}</td><td>µε</td></tr>
          <tr><td>Min Strain:</td><td>{show(result.data?.minStrain ?? NaN, 1)}</td><td>µε</td></tr>
          <tr><td>Max Strain:</td><td>{show(result.data?.maxStrain ?? NaN, 1)}</td><td>µε</td></tr>
          <tr><td>Strain Variation:</td><td>{show(result.data?.gradient ?? NaN, 2)}</td><td>%</td></tr>
          <tr><td>Span at Applied Force:</td><td>{show(result.data?.fullSpanSensitivity ?? NaN, 4)}</td><td>mV/V</td></tr>
        </tbody>
      </table>
    </div>
  )
}
