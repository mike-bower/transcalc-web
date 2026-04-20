import { useEffect, useMemo, useRef, useState } from 'react'
import { calculateRoundHollowTorqueStrain } from '../../domain/rndhlwtq'
import RoundHollowTorqueModelPreview from '../RoundHollowTorqueModelPreview'

type UnitSystem = 'SI' | 'US'

const NMAM_PER_INLB = 112.984829
const MM_PER_IN = 25.4
const GPA_PER_MPSI = 6.8947572932

const round = (v: number, d = 4): number => Math.round(v * Math.pow(10, d)) / Math.pow(10, d)
const show = (v: number, d: number): string => (Number.isFinite(v) ? v.toFixed(d) : '—')

type Props = { unitSystem: UnitSystem; onUnitChange: (next: UnitSystem) => void }

export default function RoundHollowTorqueCalc({ unitSystem, onUnitChange }: Props) {
  const [torque, setTorque] = useState(1000)
  const [outerDia, setOuterDia] = useState(30)
  const [innerDia, setInnerDia] = useState(20)
  const [modulusGPa, setModulusGPa] = useState(200)
  const [poisson, setPoisson] = useState(0.3)
  const [gageFactor, setGageFactor] = useState(2.1)

  const prevUnit = useRef<UnitSystem>(unitSystem)
  useEffect(() => {
    if (prevUnit.current === unitSystem) return
    prevUnit.current = unitSystem
    if (unitSystem === 'US') {
      setTorque(v => round(v / NMAM_PER_INLB))
      setOuterDia(v => round(v / MM_PER_IN))
      setInnerDia(v => round(v / MM_PER_IN))
      setModulusGPa(v => round(v / GPA_PER_MPSI))
    } else {
      setTorque(v => round(v * NMAM_PER_INLB))
      setOuterDia(v => round(v * MM_PER_IN))
      setInnerDia(v => round(v * MM_PER_IN))
      setModulusGPa(v => round(v * GPA_PER_MPSI))
    }
  }, [unitSystem])

  const result = useMemo(() => {
    const modulusForDomain = unitSystem === 'US' ? modulusGPa * 1e6 : modulusGPa
    const checks: [number, string][] = [
      [torque, 'Applied torque'], [outerDia, 'Outer diameter'], [innerDia, 'Inner diameter'],
      [modulusForDomain, 'Modulus'], [gageFactor, 'Gage factor'],
    ]
    const bad = checks.find(([v]) => !Number.isFinite(v) || v <= 0)
    if (bad) return { error: `${bad[1]} must be a positive value.`, data: null }
    if (!Number.isFinite(poisson) || poisson <= 0 || poisson >= 0.5) return { error: 'Poisson\'s ratio must be between 0 and 0.5.', data: null }
    if (innerDia >= outerDia) return { error: 'Inner diameter must be less than outer diameter.', data: null }
    try {
      const data = calculateRoundHollowTorqueStrain({ appliedTorque: torque, outerDiameter: outerDia, innerDiameter: innerDia, modulus: modulusForDomain, poissonRatio: poisson, gageFactor, usUnits: unitSystem === 'US' })
      return { error: '', data }
    } catch (e) { return { error: e instanceof Error ? e.message : 'Calculation error', data: null } }
  }, [unitSystem, torque, outerDia, innerDia, modulusGPa, poisson, gageFactor])

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
      <RoundHollowTorqueModelPreview
        params={{ torque, outerDiameter: outerDia, innerDiameter: innerDia, modulus: modulusGPa }}
        us={unitSystem === 'US'}
      />
      <div className="bino-grid">
        <label>Applied torque ({torqueUnit})<input type="number" value={Number.isFinite(torque) ? torque : ''} onChange={e => setTorque(e.target.value === '' ? NaN : Number(e.target.value))} /></label>
        <label>Outer diameter ({lenUnit})<input type="number" value={Number.isFinite(outerDia) ? outerDia : ''} onChange={e => setOuterDia(e.target.value === '' ? NaN : Number(e.target.value))} /></label>
        <label>Inner diameter ({lenUnit})<input type="number" value={Number.isFinite(innerDia) ? innerDia : ''} onChange={e => setInnerDia(e.target.value === '' ? NaN : Number(e.target.value))} /></label>
        <label>Modulus ({modUnit})<input type="number" value={Number.isFinite(modulusGPa) ? modulusGPa : ''} onChange={e => setModulusGPa(e.target.value === '' ? NaN : Number(e.target.value))} /></label>
        <label>Poisson&apos;s ratio<input type="number" value={Number.isFinite(poisson) ? poisson : ''} onChange={e => setPoisson(e.target.value === '' ? NaN : Number(e.target.value))} /></label>
        <label>Gage factor<input type="number" value={Number.isFinite(gageFactor) ? gageFactor : ''} onChange={e => setGageFactor(e.target.value === '' ? NaN : Number(e.target.value))} /></label>
      </div>
      {result.error && <p className="workspace-note">{result.error}</p>}
      <table className="bino-table">
        <tbody>
          <tr><th colSpan={3}>Calculated Values</th></tr>
          <tr><td>Shear Strain:</td><td>{show(result.data?.shearStrain ?? NaN, 1)}</td><td>µε</td></tr>
          <tr><td>Normal Strain:</td><td>{show(result.data?.normalStrain ?? NaN, 1)}</td><td>µε</td></tr>
          <tr><td>Full Bridge Span:</td><td>{show(result.data?.fullSpanOutput ?? NaN, 4)}</td><td>mV/V</td></tr>
        </tbody>
      </table>
    </div>
  )
}
