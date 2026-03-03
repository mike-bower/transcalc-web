import { useEffect, useMemo, useRef, useState } from 'react'
import { calculateSqTorque } from '../../domain/sqtorque'

type UnitSystem = 'SI' | 'US'

const NMAM_PER_INLB = 112.984829  // N·mm per in·lb
const MM_PER_IN = 25.4
const GPA_PER_MPSI = 6.8947572932

const round = (v: number, d = 4): number => Math.round(v * Math.pow(10, d)) / Math.pow(10, d)
const show = (v: number, d: number): string => (Number.isFinite(v) ? v.toFixed(d) : '—')

type Props = { unitSystem: UnitSystem; onUnitChange: (next: UnitSystem) => void }

export default function SquareTorqueCalc({ unitSystem, onUnitChange }: Props) {
  const [torque, setTorque] = useState(1000)       // N·mm or in·lb
  const [width, setWidth] = useState(25)            // mm or in
  const [modulusGPa, setModulusGPa] = useState(200) // GPa or Mpsi
  const [poisson, setPoisson] = useState(0.3)
  const [gageLength, setGageLength] = useState(5)   // mm or in
  const [gageFactor, setGageFactor] = useState(2.1)

  const prevUnit = useRef<UnitSystem>(unitSystem)
  useEffect(() => {
    if (prevUnit.current === unitSystem) return
    prevUnit.current = unitSystem
    if (unitSystem === 'US') {
      setTorque(v => round(v / NMAM_PER_INLB))
      setWidth(v => round(v / MM_PER_IN))
      setModulusGPa(v => round(v / GPA_PER_MPSI))
      setGageLength(v => round(v / MM_PER_IN))
    } else {
      setTorque(v => round(v * NMAM_PER_INLB))
      setWidth(v => round(v * MM_PER_IN))
      setModulusGPa(v => round(v * GPA_PER_MPSI))
      setGageLength(v => round(v * MM_PER_IN))
    }
  }, [unitSystem])

  const result = useMemo(() => {
    const checks: [number, string][] = [
      [torque, 'Applied torque'], [width, 'Width'], [modulusGPa, 'Modulus'],
      [gageLength, 'Gage length'], [gageFactor, 'Gage factor'],
    ]
    const bad = checks.find(([v]) => !Number.isFinite(v) || v <= 0)
    if (bad) return { error: `${bad[1]} must be a positive value.`, data: null }
    try {
      const data = calculateSqTorque({
        appliedTorque: torque,
        width,
        poisson,
        modulus: modulusGPa,
        gageLength,
        gageFactor,
        usUnits: unitSystem === 'US',
      })
      return { error: data.error ?? '', data: data.success ? data : null }
    } catch (e) { return { error: e instanceof Error ? e.message : 'Calculation error', data: null } }
  }, [unitSystem, torque, width, modulusGPa, poisson, gageLength, gageFactor])

  const torqueUnit = unitSystem === 'SI' ? 'N·mm' : 'in·lb'
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
        <img src="/legacy-help/SqrTor.jpg" alt="Square torque shaft" onError={e => { (e.target as HTMLImageElement).style.display = 'none' }} />
      </div>
      <div className="bino-grid">
        <label>Applied torque ({torqueUnit})<input type="number" value={Number.isFinite(torque) ? torque : ''} onChange={e => setTorque(e.target.value === '' ? NaN : Number(e.target.value))} /></label>
        <label>Shaft width ({lenUnit})<input type="number" value={Number.isFinite(width) ? width : ''} onChange={e => setWidth(e.target.value === '' ? NaN : Number(e.target.value))} /></label>
        <label>Modulus ({modUnit})<input type="number" value={Number.isFinite(modulusGPa) ? modulusGPa : ''} onChange={e => setModulusGPa(e.target.value === '' ? NaN : Number(e.target.value))} /></label>
        <label>Poisson&apos;s ratio<input type="number" value={Number.isFinite(poisson) ? poisson : ''} onChange={e => setPoisson(e.target.value === '' ? NaN : Number(e.target.value))} /></label>
        <label>Gage length ({lenUnit})<input type="number" value={Number.isFinite(gageLength) ? gageLength : ''} onChange={e => setGageLength(e.target.value === '' ? NaN : Number(e.target.value))} /></label>
        <label>Gage factor<input type="number" value={Number.isFinite(gageFactor) ? gageFactor : ''} onChange={e => setGageFactor(e.target.value === '' ? NaN : Number(e.target.value))} /></label>
      </div>
      {result.error && <p className="workspace-note">{result.error}</p>}
      <table className="bino-table">
        <tbody>
          <tr><th colSpan={3}>Calculated Values</th></tr>
          <tr><td>Nominal Gage Strain:</td><td>{show(result.data?.avgStrain ?? NaN, 1)}</td><td>µε</td></tr>
          <tr><td>Min / Max Strain:</td><td>{show(result.data?.minStrain ?? NaN, 1)} / {show(result.data?.maxStrain ?? NaN, 1)}</td><td>µε</td></tr>
          <tr><td>Strain Variation:</td><td>{show(result.data?.gradient ?? NaN, 2)}</td><td>%</td></tr>
          <tr><td>Full Bridge Span:</td><td>{show(result.data?.fullSpan ?? NaN, 4)}</td><td>mV/V</td></tr>
        </tbody>
      </table>
    </div>
  )
}
