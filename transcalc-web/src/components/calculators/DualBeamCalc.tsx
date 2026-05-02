import { useEffect, useMemo, useRef, useState } from 'react'
import { calculateDualbeamStrain } from '../../domain/dualbeam'
import { DEFAULT_MATERIAL_ID, getMaterial } from '../../domain/materials'
import MaterialSelector from '../MaterialSelector'
import DualBeamModelPreview from '../DualBeamModelPreview'
import DualBeamDiagram from '../diagrams/DualBeamDiagram'
import WheatstoneBridgeDiagram from '../diagrams/WheatstoneBridgeDiagram'
import SectionToggle from '../SectionToggle'
import WorkspaceControls from '../WorkspaceControls'
import DualBeamFea3DCalc from './DualBeamFea3DCalc'

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

export default function DualBeamCalc({ unitSystem, onUnitChange }: Props) {
  const [load, setLoad] = useState(100)
  const [width, setWidth] = useState(25)
  const [thickness, setThickness] = useState(3)
  const [distBetweenGages, setDistBetweenGages] = useState(30)
  const [distLoadToCL, setDistLoadToCL] = useState(0)
  const [modulusGPa, setModulusGPa] = useState(() => getMaterial(DEFAULT_MATERIAL_ID).eGPa)
  const [gageLength, setGageLength] = useState(5)
  const [gageFactor, setGageFactor] = useState(2.1)
  const [nu, setNu] = useState(() => getMaterial(DEFAULT_MATERIAL_ID).nu)
  const [materialId, setMaterialId] = useState(DEFAULT_MATERIAL_ID)
  const [mode, setMode] = useState<'analytical' | '3d-fea'>('analytical')
  const [show2D, setShow2D] = useState(true)
  const [show3D, setShow3D] = useState(false)
  const [showInputs, setShowInputs] = useState(true)
  const [showResults, setShowResults] = useState(true)


  const prevUnit = useRef<UnitSystem>(unitSystem)
  useEffect(() => {
    if (prevUnit.current === unitSystem) return
    prevUnit.current = unitSystem
    if (unitSystem === 'US') {
      setLoad(v => round(v / N_PER_LBF))
      setWidth(v => round(v / MM_PER_IN))
      setThickness(v => round(v / MM_PER_IN))
      setDistBetweenGages(v => round(v / MM_PER_IN))
      setDistLoadToCL(v => round(v / MM_PER_IN))
      setModulusGPa(v => round(v / GPA_PER_MPSI))
      setGageLength(v => round(v / MM_PER_IN))
    } else {
      setLoad(v => round(v * N_PER_LBF))
      setWidth(v => round(v * MM_PER_IN))
      setThickness(v => round(v * MM_PER_IN))
      setDistBetweenGages(v => round(v * MM_PER_IN))
      setDistLoadToCL(v => round(v * MM_PER_IN))
      setModulusGPa(v => round(v * GPA_PER_MPSI))
      setGageLength(v => round(v * MM_PER_IN))
    }
  }, [unitSystem])

  const siInputs = useMemo(() => {
    const mm = unitSystem === 'SI' ? 1 : MM_PER_IN
    return {
      loadN: unitSystem === 'SI' ? load : load * N_PER_LBF,
      widthMm: width * mm,
      thicknessMm: thickness * mm,
      distMm: distBetweenGages * mm,
      distLoadMm: distLoadToCL * mm,
      gageLenMm: gageLength * mm,
      modulusGPa: unitSystem === 'SI' ? modulusGPa : modulusGPa * GPA_PER_MPSI,
    }
  }, [unitSystem, load, width, thickness, distBetweenGages, distLoadToCL, modulusGPa, gageLength])

  const result = useMemo(() => {
    const { loadN, widthMm, thicknessMm, distMm, distLoadMm, gageLenMm, modulusGPa: modGPa } = siInputs
    const modulusPa = modGPa * 1e9
    if (!Number.isFinite(distLoadMm)) return { error: 'Distance load to CL must be a number.', data: null }
    const checks: [number, string][] = [
      [loadN, 'Applied load'], [widthMm, 'Beam width'], [thicknessMm, 'Thickness'],
      [distMm, 'Distance between gages'], [modulusPa, 'Modulus'],
      [gageLenMm, 'Gage length'], [gageFactor, 'Gage factor'],
    ]
    const bad = checks.find(([v]) => !Number.isFinite(v) || v <= 0)
    if (bad) return { error: `${bad[1]} must be a positive value.`, data: null }

    try {
      const data = calculateDualbeamStrain({
        appliedLoad: loadN,
        beamWidth: widthMm,
        thickness: thicknessMm,
        distanceBetweenGages: distMm,
        distanceLoadToCL: distLoadMm,
        modulus: modulusPa,
        gageLength: gageLenMm,
        gageFactor,
      })
      return { error: '', data }
    } catch (e) {
      return { error: e instanceof Error ? e.message : 'Calculation error', data: null }
    }
  }, [siInputs, gageFactor])

  const forceUnit = unitSystem === 'SI' ? 'N' : 'lbf'
  const lenUnit = unitSystem === 'SI' ? 'mm' : 'in'
  const modUnit = unitSystem === 'SI' ? 'GPa' : 'Mpsi'

  return (
    <div className="bino-wrap">
      <WorkspaceControls mode={mode} onModeChange={setMode} unitSystem={unitSystem} onUnitChange={onUnitChange} />

      {mode === 'analytical' && <SectionToggle label="Diagrams" open={show2D} onToggle={() => setShow2D(v => !v)} />}
      {mode === 'analytical' && show2D && (
        <div className="calc-diagram-row">
          <div className="calc-diagram-2d">
            <DualBeamDiagram
              load={siInputs.loadN}
              width={siInputs.widthMm}
              thickness={siInputs.thicknessMm}
              distBetweenGages={siInputs.distMm}
              gageLength={siInputs.gageLenMm}
              unitSystem={unitSystem}
            />
          </div>
          <div className="calc-diagram-2d">
            <WheatstoneBridgeDiagram config="bending" />
          </div>
        </div>
      )}

      <SectionToggle label="Inputs" open={showInputs} onToggle={() => setShowInputs(v => !v)} />
      {showInputs && (
        <>
          <div className="bino-grid">
            <MaterialSelector
              materialId={materialId}
              unitSystem={unitSystem}
              onSelect={sel => { setMaterialId(sel.id); setModulusGPa(sel.eGPaDisplay); setNu(sel.nu) }}
            />
            <label>Applied load ({forceUnit})<input type="number" value={Number.isFinite(load) ? load : ''} onChange={e => setLoad(e.target.value === '' ? NaN : Number(e.target.value))} /></label>
            <label>Beam width ({lenUnit})<input type="number" value={Number.isFinite(width) ? width : ''} onChange={e => setWidth(e.target.value === '' ? NaN : Number(e.target.value))} /></label>
            <label>Thickness ({lenUnit})<input type="number" value={Number.isFinite(thickness) ? thickness : ''} onChange={e => setThickness(e.target.value === '' ? NaN : Number(e.target.value))} /></label>
            <label>Distance between gages, D ({lenUnit})<input type="number" value={Number.isFinite(distBetweenGages) ? distBetweenGages : ''} onChange={e => setDistBetweenGages(e.target.value === '' ? NaN : Number(e.target.value))} /></label>
            <label>Distance load to CL ({lenUnit})<input type="number" value={Number.isFinite(distLoadToCL) ? distLoadToCL : ''} onChange={e => setDistLoadToCL(e.target.value === '' ? NaN : Number(e.target.value))} /></label>
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
            <tr><td>Strain A / C:</td><td>{show(result.data?.strainA ?? NaN, 0)} / {show(result.data?.strainC ?? NaN, 0)}</td><td>µε</td></tr>
            <tr><td>Strain B / D:</td><td>{show(result.data?.strainB ?? NaN, 0)} / {show(result.data?.strainD ?? NaN, 0)}</td><td>µε</td></tr>
            <tr><td>Strain Variation:</td><td>{show(result.data?.gradient ?? NaN, 2)}</td><td>%</td></tr>
            <tr><td>Span at Applied Force:</td><td>{show(result.data?.fullSpanSensitivity ?? NaN, 4)}</td><td>mV/V</td></tr>
          </tbody>
        </table>
      )}

      <SectionToggle label="3D View" open={show3D} onToggle={() => setShow3D(v => !v)} />
      {show3D && (
        <div className="calc-model-3d">
          {mode === 'analytical' && (
            <DualBeamModelPreview
              params={{
                load: siInputs.loadN,
                width: siInputs.widthMm,
                thickness: siInputs.thicknessMm,
                distBetweenGages: siInputs.distMm,
                distLoadToCL: siInputs.distLoadMm,
                gageLen: siInputs.gageLenMm,
                modulus: siInputs.modulusGPa,
                gageFactor,
              }}
              us={unitSystem === 'US'}
              materialId={materialId}
            />
          )}
          {mode === '3d-fea' && (
            <DualBeamFea3DCalc
              loadN={siInputs.loadN}
              widthMm={siInputs.widthMm}
              thicknessMm={siInputs.thicknessMm}
              distBetweenGagesMm={siInputs.distMm}
              modulusGPa={siInputs.modulusGPa}
              nu={nu}
            />
          )}
        </div>
      )}

    </div>
  )
}
