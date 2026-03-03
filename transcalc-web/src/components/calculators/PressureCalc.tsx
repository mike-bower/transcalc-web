import { useMemo, useEffect, useRef, useState } from 'react'
import { calculateRadial, calculateTangential } from '../../domain/pressure'

type UnitSystem = 'SI' | 'US'

// SI: kPa pressure, mm dims, GPa modulus → convert to Pa/mm/Pa for domain
// US: PSI pressure, in dims, Mpsi modulus → convert to PSI/in/PSI for domain
const KPA_PER_PSI = 6.894757293
const MM_PER_IN = 25.4
const GPA_PER_MPSI = 6.8947572932

const round = (v: number, d = 4): number => Math.round(v * Math.pow(10, d)) / Math.pow(10, d)
const show = (v: number, d: number): string => (Number.isFinite(v) ? v.toFixed(d) : '—')

type Props = { unitSystem: UnitSystem; onUnitChange: (next: UnitSystem) => void }

export default function PressureCalc({ unitSystem, onUnitChange }: Props) {
  const [pressure, setPressure] = useState(100)     // kPa or PSI
  const [thickness, setThickness] = useState(2)     // mm or in
  const [diameter, setDiameter] = useState(50)      // mm or in
  const [modulusGPa, setModulusGPa] = useState(200) // GPa or Mpsi
  const [poisson, setPoisson] = useState(0.3)

  const prevUnit = useRef<UnitSystem>(unitSystem)
  useEffect(() => {
    if (prevUnit.current === unitSystem) return
    prevUnit.current = unitSystem
    if (unitSystem === 'US') {
      setPressure(v => round(v / KPA_PER_PSI))
      setThickness(v => round(v / MM_PER_IN))
      setDiameter(v => round(v / MM_PER_IN))
      setModulusGPa(v => round(v / GPA_PER_MPSI))
    } else {
      setPressure(v => round(v * KPA_PER_PSI))
      setThickness(v => round(v * MM_PER_IN))
      setDiameter(v => round(v * MM_PER_IN))
      setModulusGPa(v => round(v * GPA_PER_MPSI))
    }
  }, [unitSystem])

  const result = useMemo(() => {
    // Domain requires consistent units:
    // SI: Pa, mm, Pa — convert kPa→Pa, GPa→Pa
    // US: PSI, in, PSI — convert Mpsi→PSI
    const [pressureDomain, modulusDomain, thicknessDomain, diameterDomain] = unitSystem === 'SI'
      ? [pressure * 1000, modulusGPa * 1e9, thickness, diameter]          // kPa→Pa, GPa→Pa, mm stays
      : [pressure, modulusGPa * 1e6, thickness, diameter]                  // PSI stays, Mpsi→PSI, in stays

    const checks: [number, string][] = [
      [pressureDomain, 'Pressure'], [thicknessDomain, 'Thickness'], [diameterDomain, 'Diameter'],
      [modulusDomain, 'Modulus'],
    ]
    const bad = checks.find(([v]) => !Number.isFinite(v) || v <= 0)
    if (bad) return { error: `${bad[1]} must be a positive value.`, radial: NaN, tangential: NaN }
    if (!Number.isFinite(poisson) || poisson <= 0 || poisson >= 0.5) return { error: 'Poisson\'s ratio must be between 0 and 0.5.', radial: NaN, tangential: NaN }
    try {
      const radial = calculateRadial(pressureDomain, thicknessDomain, diameterDomain, poisson, modulusDomain)
      const tangential = calculateTangential(pressureDomain, thicknessDomain, diameterDomain, poisson, modulusDomain)
      return { error: '', radial, tangential }
    } catch (e) { return { error: e instanceof Error ? e.message : 'Calculation error', radial: NaN, tangential: NaN } }
  }, [unitSystem, pressure, thickness, diameter, modulusGPa, poisson])

  const pressureUnit = unitSystem === 'SI' ? 'kPa' : 'PSI'
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
        <img src="/legacy-help/Pressure.jpg" alt="Pressure diaphragm" onError={e => { (e.target as HTMLImageElement).style.display = 'none' }} />
      </div>
      <div className="bino-grid">
        <label>Applied pressure ({pressureUnit})<input type="number" value={Number.isFinite(pressure) ? pressure : ''} onChange={e => setPressure(e.target.value === '' ? NaN : Number(e.target.value))} /></label>
        <label>Diaphragm thickness ({lenUnit})<input type="number" value={Number.isFinite(thickness) ? thickness : ''} onChange={e => setThickness(e.target.value === '' ? NaN : Number(e.target.value))} /></label>
        <label>Diaphragm diameter ({lenUnit})<input type="number" value={Number.isFinite(diameter) ? diameter : ''} onChange={e => setDiameter(e.target.value === '' ? NaN : Number(e.target.value))} /></label>
        <label>Modulus ({modUnit})<input type="number" value={Number.isFinite(modulusGPa) ? modulusGPa : ''} onChange={e => setModulusGPa(e.target.value === '' ? NaN : Number(e.target.value))} /></label>
        <label>Poisson&apos;s ratio<input type="number" value={Number.isFinite(poisson) ? poisson : ''} onChange={e => setPoisson(e.target.value === '' ? NaN : Number(e.target.value))} /></label>
      </div>
      {result.error && <p className="workspace-note">{result.error}</p>}
      <table className="bino-table">
        <tbody>
          <tr><th colSpan={3}>Calculated Values</th></tr>
          <tr><td>Radial Strain:</td><td>{show(result.radial, 1)}</td><td>µε</td></tr>
          <tr><td>Tangential Strain:</td><td>{show(result.tangential, 1)}</td><td>µε</td></tr>
        </tbody>
      </table>
    </div>
  )
}
