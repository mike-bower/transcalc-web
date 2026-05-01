import { useMemo, useEffect, useRef, useState } from 'react'
import { calculateRadial, calculateTangential } from '../../domain/pressure'
import { DEFAULT_MATERIAL_ID, getMaterial } from '../../domain/materials'
import MaterialSelector from '../MaterialSelector'
import PressureModelPreview from '../PressureModelPreview'
import WheatstoneBridgeDiagram from '../diagrams/WheatstoneBridgeDiagram'
import SectionToggle from '../SectionToggle'
import WorkspaceControls from '../WorkspaceControls'

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
  const [modulusGPa, setModulusGPa] = useState(() => getMaterial(DEFAULT_MATERIAL_ID).eGPa) // GPa or Mpsi
  const [poisson, setPoisson] = useState(() => getMaterial(DEFAULT_MATERIAL_ID).nu)
  const [materialId, setMaterialId] = useState(DEFAULT_MATERIAL_ID)
  const [mode, setMode] = useState<'analytical' | '3d-fea'>('analytical')
  const [showDiagrams, setShowDiagrams] = useState(false)
  const [show3D, setShow3D] = useState(false)
  const [showInputs, setShowInputs] = useState(true)
  const [showResults, setShowResults] = useState(true)


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
      <WorkspaceControls mode={mode} onModeChange={setMode} unitSystem={unitSystem} onUnitChange={onUnitChange} />

      <SectionToggle label="Inputs" open={showInputs} onToggle={() => setShowInputs(v => !v)} />
      {showInputs && (
        <>
          <div className="bino-grid">
            <MaterialSelector
              materialId={materialId}
              unitSystem={unitSystem}
              onSelect={sel => { setMaterialId(sel.id); setModulusGPa(sel.eGPaDisplay); setPoisson(sel.nu) }}
            />
            <label>Applied pressure ({pressureUnit})<input type="number" value={Number.isFinite(pressure) ? pressure : ''} onChange={e => setPressure(e.target.value === '' ? NaN : Number(e.target.value))} /></label>
            <label>Diaphragm thickness ({lenUnit})<input type="number" value={Number.isFinite(thickness) ? thickness : ''} onChange={e => setThickness(e.target.value === '' ? NaN : Number(e.target.value))} /></label>
            <label>Diaphragm diameter ({lenUnit})<input type="number" value={Number.isFinite(diameter) ? diameter : ''} onChange={e => setDiameter(e.target.value === '' ? NaN : Number(e.target.value))} /></label>
          </div>
          {result.error && <p className="workspace-note">{result.error}</p>}
        </>
      )}

      {mode === 'analytical' && <SectionToggle label="Results" open={showResults} onToggle={() => setShowResults(v => !v)} />}
      {mode === 'analytical' && showResults && (
        <table className="bino-table">
          <tbody>
            <tr><th colSpan={3}>Calculated Values</th></tr>
            <tr><td>Radial Strain:</td><td>{show(result.radial, 0)}</td><td>µε</td></tr>
            <tr><td>Tangential Strain:</td><td>{show(result.tangential, 0)}</td><td>µε</td></tr>
          </tbody>
        </table>
      )}

      {mode === 'analytical' && <SectionToggle label="Diagrams" open={showDiagrams} onToggle={() => setShowDiagrams(v => !v)} />}
      {mode === 'analytical' && showDiagrams && (
        <div className="calc-diagram-2d">
          <WheatstoneBridgeDiagram config="pressure" />
        </div>
      )}

      <SectionToggle label="3D View" open={show3D} onToggle={() => setShow3D(v => !v)} />
      {show3D && (
        <div className="calc-model-3d">
          {mode === 'analytical' && (
            <PressureModelPreview
              params={{ pressure, thickness, diameter, modulus: modulusGPa }}
              us={unitSystem === 'US'}
            />
          )}
          {mode === '3d-fea' && <p className="workspace-note" style={{ padding: '1.5rem', textAlign: 'center' }}>3D FEA is not yet available for this calculator type.</p>}
        </div>
      )}
    </div>
  )
}
