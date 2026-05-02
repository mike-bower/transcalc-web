import { useEffect, useMemo, useRef, useState } from 'react'
import { calculateSqTorque } from '../../domain/sqtorque'
import { DEFAULT_MATERIAL_ID, getMaterial } from '../../domain/materials'
import MaterialSelector from '../MaterialSelector'
import SquareTorqueModelPreview from '../SquareTorqueModelPreview'
import WheatstoneBridgeDiagram from '../diagrams/WheatstoneBridgeDiagram'
import SectionToggle from '../SectionToggle'
import WorkspaceControls from '../WorkspaceControls'
import SquareTorqueFea3DCalc from './SquareTorqueFea3DCalc'

type UnitSystem = 'SI' | 'US'

const NMAM_PER_INLB = 112.984829  // N·mm per in·lb
const MM_PER_IN = 25.4
const GPA_PER_MPSI = 6.8947572932

const round = (v: number, d = 4): number => Math.round(v * Math.pow(10, d)) / Math.pow(10, d)
const show = (v: number, d: number): string => (Number.isFinite(v) ? v.toFixed(d) : '—')

type Props = { unitSystem: UnitSystem; onUnitChange: (next: UnitSystem) => void }

export default function SquareTorqueCalc({ unitSystem, onUnitChange }: Props) {
  const [torque, setTorque] = useState(1000)        // N·mm or in·lb
  const [width, setWidth] = useState(25)             // mm or in
  const [shaftLength, setShaftLength] = useState(100) // mm or in
  const [modulusGPa, setModulusGPa] = useState(() => getMaterial(DEFAULT_MATERIAL_ID).eGPa)  // GPa or Mpsi
  const [poisson, setPoisson] = useState(() => getMaterial(DEFAULT_MATERIAL_ID).nu)
  const [materialId, setMaterialId] = useState(DEFAULT_MATERIAL_ID)
  const [gageLength, setGageLength] = useState(5)    // mm or in
  const [gageFactor, setGageFactor] = useState(2.1)
  const [mode, setMode] = useState<'analytical' | '3d-fea'>('analytical')
  const [showDiagrams, setShowDiagrams] = useState(true)
  const [show3D, setShow3D] = useState(false)
  const [showInputs, setShowInputs] = useState(true)
  const [showResults, setShowResults] = useState(true)


  const prevUnit = useRef<UnitSystem>(unitSystem)
  useEffect(() => {
    if (prevUnit.current === unitSystem) return
    prevUnit.current = unitSystem
    if (unitSystem === 'US') {
      setTorque(v => round(v / NMAM_PER_INLB))
      setWidth(v => round(v / MM_PER_IN))
      setShaftLength(v => round(v / MM_PER_IN))
      setModulusGPa(v => round(v / GPA_PER_MPSI))
      setGageLength(v => round(v / MM_PER_IN))
    } else {
      setTorque(v => round(v * NMAM_PER_INLB))
      setWidth(v => round(v * MM_PER_IN))
      setShaftLength(v => round(v * MM_PER_IN))
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
      <WorkspaceControls mode={mode} onModeChange={setMode} unitSystem={unitSystem} onUnitChange={onUnitChange} />

      {mode === 'analytical' && <SectionToggle label="Diagrams" open={showDiagrams} onToggle={() => setShowDiagrams(v => !v)} />}
      {mode === 'analytical' && showDiagrams && (
        <div className="calc-diagram-2d">
          <WheatstoneBridgeDiagram config="torque" />
        </div>
      )}

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
            <label>Shaft width ({lenUnit})<input type="number" value={Number.isFinite(width) ? width : ''} onChange={e => setWidth(e.target.value === '' ? NaN : Number(e.target.value))} /></label>
            <label>Shaft length ({lenUnit})<input type="number" value={Number.isFinite(shaftLength) ? shaftLength : ''} onChange={e => setShaftLength(e.target.value === '' ? NaN : Number(e.target.value))} /></label>
            <label>Gage length ({lenUnit})<input type="number" value={Number.isFinite(gageLength) ? gageLength : ''} onChange={e => setGageLength(e.target.value === '' ? NaN : Number(e.target.value))} /></label>
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
            <tr><td>Nominal Gage Strain:</td><td>{show(result.data?.avgStrain ?? NaN, 0)}</td><td>µε</td></tr>
            <tr><td>Min / Max Strain:</td><td>{show(result.data?.minStrain ?? NaN, 0)} / {show(result.data?.maxStrain ?? NaN, 0)}</td><td>µε</td></tr>
            <tr><td>Strain Variation:</td><td>{show(result.data?.gradient ?? NaN, 2)}</td><td>%</td></tr>
            <tr><td>Full Bridge Span:</td><td>{show(result.data?.fullSpan ?? NaN, 4)}</td><td>mV/V</td></tr>
          </tbody>
        </table>
      )}

      <SectionToggle label="3D View" open={show3D} onToggle={() => setShow3D(v => !v)} />
      {show3D && (
        <div className="calc-model-3d">
          {mode === 'analytical' && (
            <SquareTorqueModelPreview
              params={{ torque, width, gageLength, modulus: modulusGPa }}
              us={unitSystem === 'US'}
              materialId={materialId}
            />
          )}
          {mode === '3d-fea' && (() => {
            const mm = unitSystem === 'SI' ? 1 : MM_PER_IN
            const torqueNm = unitSystem === 'SI' ? torque / 1000 : torque * NMAM_PER_INLB / 1000
            return (
              <SquareTorqueFea3DCalc
                torqueNm={torqueNm}
                sideMm={width * mm}
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
