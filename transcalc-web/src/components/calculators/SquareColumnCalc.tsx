import { useEffect, useMemo, useRef, useState } from 'react'
import { calculateSquareColumnStrain } from '../../domain/sqrcol'

type UnitSystem = 'SI' | 'US'

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

  const result = useMemo(() => {
    // sqrcol handles unit conversion internally when usUnits is set
    // SI: modulus in GPa, dims in mm, load in N
    // US: modulus in PSI (Mpsi * 1e6), dims in in, load in lbf
    const modulusForDomain = unitSystem === 'US' ? modulusGPa * 1e6 : modulusGPa

    const checks: [number, string][] = [
      [load, 'Applied load'],
      [width, 'Width'],
      [depth, 'Depth'],
      [modulusForDomain, 'Modulus'],
      [gageFactor, 'Gage factor'],
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
    </div>
  )
}
