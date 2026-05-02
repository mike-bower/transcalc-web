import { useEffect, useMemo, useRef, useState } from 'react'
import { calculateSbeamStrain } from '../../domain/sbeam'
import { DEFAULT_MATERIAL_ID, getMaterial } from '../../domain/materials'
import MaterialSelector from '../MaterialSelector'
import SBeamModelPreview from '../SBeamModelPreview'
import SBeamDiagram from '../diagrams/SBeamDiagram'
import WheatstoneBridgeDiagram from '../diagrams/WheatstoneBridgeDiagram'
import SectionToggle from '../SectionToggle'
import WorkspaceControls from '../WorkspaceControls'
import SBeamFea3DCalc from './SBeamFea3DCalc'

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

export default function SBeamCalc({ unitSystem, onUnitChange }: Props) {
  const [load, setLoad] = useState(100)
  const [holeRadius, setHoleRadius] = useState(5)
  const [width, setWidth] = useState(25)
  const [thickness, setThickness] = useState(12)
  const [distBetweenGages, setDistBetweenGages] = useState(25)
  const [modulusGPa, setModulusGPa] = useState(() => getMaterial(DEFAULT_MATERIAL_ID).eGPa)
  const [gageLength, setGageLength] = useState(5)
  const [gageFactor, setGageFactor] = useState(2.1)
  const [poisson, setPoisson] = useState(() => getMaterial(DEFAULT_MATERIAL_ID).nu)
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
      setHoleRadius(v => round(v / MM_PER_IN))
      setWidth(v => round(v / MM_PER_IN))
      setThickness(v => round(v / MM_PER_IN))
      setDistBetweenGages(v => round(v / MM_PER_IN))
      setModulusGPa(v => round(v / GPA_PER_MPSI))
      setGageLength(v => round(v / MM_PER_IN))
    } else {
      setLoad(v => round(v * N_PER_LBF))
      setHoleRadius(v => round(v * MM_PER_IN))
      setWidth(v => round(v * MM_PER_IN))
      setThickness(v => round(v * MM_PER_IN))
      setDistBetweenGages(v => round(v * MM_PER_IN))
      setModulusGPa(v => round(v * GPA_PER_MPSI))
      setGageLength(v => round(v * MM_PER_IN))
    }
  }, [unitSystem])

  const result = useMemo(() => {
    const loadN = unitSystem === 'SI' ? load : load * N_PER_LBF
    const mm = unitSystem === 'SI' ? 1 : MM_PER_IN
    const holeRadMm = holeRadius * mm
    const widthMm = width * mm
    const thicknessMm = thickness * mm
    const distMm = distBetweenGages * mm
    const gageLenMm = gageLength * mm
    const modulusGPa_calc = unitSystem === 'SI' ? modulusGPa : modulusGPa * GPA_PER_MPSI

    const checks: [number, string][] = [
      [loadN, 'Applied load'],
      [holeRadMm, 'Hole radius'],
      [widthMm, 'Beam width'],
      [thicknessMm, 'Thickness'],
      [distMm, 'Distance between gages'],
      [modulusGPa_calc, 'Modulus'],
      [gageLenMm, 'Gage length'],
      [gageFactor, 'Gage factor'],
    ]
    const bad = checks.find(([v]) => !Number.isFinite(v) || v <= 0)
    if (bad) return { error: `${bad[1]} must be a positive value.`, data: null }

    try {
      const data = calculateSbeamStrain({
        appliedLoad: loadN,
        holeRadius: holeRadMm,
        beamWidth: widthMm,
        thickness: thicknessMm,
        distanceBetweenGages: distMm,
        modulus: modulusGPa_calc,
        gageLength: gageLenMm,
        gageFactor,
      })
      return { error: '', data }
    } catch (e) {
      return { error: e instanceof Error ? e.message : 'Calculation error', data: null }
    }
  }, [unitSystem, load, holeRadius, width, thickness, distBetweenGages, modulusGPa, gageLength, gageFactor])

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
            <SBeamDiagram
              load={unitSystem === 'SI' ? load : load * N_PER_LBF}
              holeRadius={unitSystem === 'SI' ? holeRadius : holeRadius * MM_PER_IN}
              width={unitSystem === 'SI' ? width : width * MM_PER_IN}
              thickness={unitSystem === 'SI' ? thickness : thickness * MM_PER_IN}
              distBetweenGages={unitSystem === 'SI' ? distBetweenGages : distBetweenGages * MM_PER_IN}
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
              onSelect={sel => { setMaterialId(sel.id); setModulusGPa(sel.eGPaDisplay); setPoisson(sel.nu) }}
            />
            <label>Applied load ({forceUnit})<input type="number" value={Number.isFinite(load) ? load : ''} onChange={e => setLoad(e.target.value === '' ? NaN : Number(e.target.value))} /></label>
            <label>Hole radius, R ({lenUnit})<input type="number" value={Number.isFinite(holeRadius) ? holeRadius : ''} onChange={e => setHoleRadius(e.target.value === '' ? NaN : Number(e.target.value))} /></label>
            <label>Beam width ({lenUnit})<input type="number" value={Number.isFinite(width) ? width : ''} onChange={e => setWidth(e.target.value === '' ? NaN : Number(e.target.value))} /></label>
            <label>Thickness ({lenUnit})<input type="number" value={Number.isFinite(thickness) ? thickness : ''} onChange={e => setThickness(e.target.value === '' ? NaN : Number(e.target.value))} /></label>
            <label>Distance between gages, D ({lenUnit})<input type="number" value={Number.isFinite(distBetweenGages) ? distBetweenGages : ''} onChange={e => setDistBetweenGages(e.target.value === '' ? NaN : Number(e.target.value))} /></label>
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
            <tr><td>Span at Applied Force:</td><td>{show(result.data?.fullSpanSensitivity ?? NaN, 4)}</td><td>mV/V</td></tr>
          </tbody>
        </table>
      )}

      <SectionToggle label="3D View" open={show3D} onToggle={() => setShow3D(v => !v)} />
      {show3D && (
        <div className="calc-model-3d">
          {mode === 'analytical' && (
            <SBeamModelPreview
              params={{
                load:   unitSystem === 'SI' ? load : load * N_PER_LBF,
                holeRadius:   (unitSystem === 'SI' ? holeRadius  : holeRadius  * MM_PER_IN),
                width:  (unitSystem === 'SI' ? width       : width       * MM_PER_IN),
                thickness:    (unitSystem === 'SI' ? thickness   : thickness   * MM_PER_IN),
                distBetweenGages: (unitSystem === 'SI' ? distBetweenGages : distBetweenGages * MM_PER_IN),
                gageLen: (unitSystem === 'SI' ? gageLength  : gageLength  * MM_PER_IN),
                modulus: unitSystem === 'SI' ? modulusGPa : modulusGPa * GPA_PER_MPSI,
                gageFactor,
              }}
              us={unitSystem === 'US'}
              materialId={materialId}
            />
          )}
          {mode === '3d-fea' && (() => {
            const mm = unitSystem === 'SI' ? 1 : MM_PER_IN
            return (
              <SBeamFea3DCalc
                loadN={unitSystem === 'SI' ? load : load * N_PER_LBF}
                holeRadiusMm={holeRadius * mm}
                beamWidthMm={width * mm}
                thicknessMm={thickness * mm}
                distBetweenGagesMm={distBetweenGages * mm}
                gageLengthMm={gageLength * mm}
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
