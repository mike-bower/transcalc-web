import { useEffect, useMemo, useRef, useState } from 'react'
import { calculateRoundSolidTorqueStrain } from '../../domain/rndsldtq'
import { DEFAULT_MATERIAL_ID, getMaterial } from '../../domain/materials'
import MaterialSelector from '../MaterialSelector'
import RoundSolidTorqueModelPreview from '../RoundSolidTorqueModelPreview'
import WheatstoneBridgeDiagram from '../diagrams/WheatstoneBridgeDiagram'
import SectionToggle from '../SectionToggle'
import WorkspaceControls from '../WorkspaceControls'
import RoundSolidTorqueFea3DCalc from './RoundSolidTorqueFea3DCalc'

type UnitSystem = 'SI' | 'US'

const NMAM_PER_INLB = 112.984829
const MM_PER_IN = 25.4
const GPA_PER_MPSI = 6.8947572932

const round = (v: number, d = 4): number => Math.round(v * Math.pow(10, d)) / Math.pow(10, d)
const show = (v: number, d: number): string => (Number.isFinite(v) ? v.toFixed(d) : '—')

type Props = { unitSystem: UnitSystem; onUnitChange: (next: UnitSystem) => void }

export default function RoundSolidTorqueCalc({ unitSystem, onUnitChange }: Props) {
  const [torque, setTorque] = useState(1000)
  const [diameter, setDiameter] = useState(25)
  const [shaftLength, setShaftLength] = useState(100) // mm or in
  const [modulusGPa, setModulusGPa] = useState(() => getMaterial(DEFAULT_MATERIAL_ID).eGPa)
  const [poisson, setPoisson] = useState(() => getMaterial(DEFAULT_MATERIAL_ID).nu)
  const [materialId, setMaterialId] = useState(DEFAULT_MATERIAL_ID)
  const [gageFactor, setGageFactor] = useState(2.1)
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
      setTorque(v => round(v / NMAM_PER_INLB))
      setDiameter(v => round(v / MM_PER_IN))
      setShaftLength(v => round(v / MM_PER_IN))
      setModulusGPa(v => round(v / GPA_PER_MPSI))
    } else {
      setTorque(v => round(v * NMAM_PER_INLB))
      setDiameter(v => round(v * MM_PER_IN))
      setShaftLength(v => round(v * MM_PER_IN))
      setModulusGPa(v => round(v * GPA_PER_MPSI))
    }
  }, [unitSystem])

  const result = useMemo(() => {
    const modulusForDomain = unitSystem === 'US' ? modulusGPa * 1e6 : modulusGPa
    const checks: [number, string][] = [
      [torque, 'Applied torque'], [diameter, 'Diameter'], [modulusForDomain, 'Modulus'], [gageFactor, 'Gage factor'],
    ]
    const bad = checks.find(([v]) => !Number.isFinite(v) || v <= 0)
    if (bad) return { error: `${bad[1]} must be a positive value.`, data: null }
    if (!Number.isFinite(poisson) || poisson <= 0 || poisson >= 0.5) return { error: 'Poisson\'s ratio must be between 0 and 0.5.', data: null }
    try {
      const data = calculateRoundSolidTorqueStrain({ appliedTorque: torque, diameter, modulus: modulusForDomain, poissonRatio: poisson, gageFactor, usUnits: unitSystem === 'US' })
      return { error: '', data }
    } catch (e) { return { error: e instanceof Error ? e.message : 'Calculation error', data: null } }
  }, [unitSystem, torque, diameter, modulusGPa, poisson, gageFactor])

  const torqueUnit = unitSystem === 'SI' ? 'N·mm' : 'in·lb'
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
            <label>Applied torque ({torqueUnit})<input type="number" value={Number.isFinite(torque) ? torque : ''} onChange={e => setTorque(e.target.value === '' ? NaN : Number(e.target.value))} /></label>
            <label>Shaft diameter ({lenUnit})<input type="number" value={Number.isFinite(diameter) ? diameter : ''} onChange={e => setDiameter(e.target.value === '' ? NaN : Number(e.target.value))} /></label>
            <label>Shaft length ({lenUnit})<input type="number" value={Number.isFinite(shaftLength) ? shaftLength : ''} onChange={e => setShaftLength(e.target.value === '' ? NaN : Number(e.target.value))} /></label>
            <label>Gage factor<input type="number" value={Number.isFinite(gageFactor) ? gageFactor : ''} onChange={e => setGageFactor(e.target.value === '' ? NaN : Number(e.target.value))} /></label>
          </div>
          {result.error && <p className="workspace-note">{result.error}</p>}
        </>
      )}

      {mode === 'analytical' && <SectionToggle label="Results" open={showResults} onToggle={() => setShowResults(v => !v)} />}
      {mode === 'analytical' && showResults && (
        <table className="bino-table">
          <tbody>
            <tr><th colSpan={3}>Calculated Values</th></tr>
            <tr><td>Shear Strain:</td><td>{show(result.data?.shearStrain ?? NaN, 0)}</td><td>µε</td></tr>
            <tr><td>Normal Strain:</td><td>{show(result.data?.normalStrain ?? NaN, 0)}</td><td>µε</td></tr>
            <tr><td>Full Bridge Span:</td><td>{show(result.data?.fullSpanOutput ?? NaN, 4)}</td><td>mV/V</td></tr>
          </tbody>
        </table>
      )}

      {mode === 'analytical' && <SectionToggle label="Diagrams" open={showDiagrams} onToggle={() => setShowDiagrams(v => !v)} />}
      {mode === 'analytical' && showDiagrams && (
        <div className="calc-diagram-2d">
          <WheatstoneBridgeDiagram config="torque" />
        </div>
      )}

      <SectionToggle label="3D View" open={show3D} onToggle={() => setShow3D(v => !v)} />
      {show3D && (
        <div className="calc-model-3d">
          {mode === 'analytical' && (
            <RoundSolidTorqueModelPreview
              params={{ torque, diameter, modulus: modulusGPa }}
              us={unitSystem === 'US'}
            />
          )}
          {mode === '3d-fea' && (() => {
            const mm = unitSystem === 'SI' ? 1 : MM_PER_IN
            const torqueNm = unitSystem === 'SI' ? torque / 1000 : torque * NMAM_PER_INLB / 1000
            return (
              <RoundSolidTorqueFea3DCalc
                torqueNm={torqueNm}
                diameterMm={diameter * mm}
                lengthMm={shaftLength * mm}
                modulusGPa={unitSystem === 'SI' ? modulusGPa : modulusGPa * GPA_PER_MPSI}
                nu={poisson}
              />
            )
          })()}
        </div>
      )}
    </div>
  )
}
