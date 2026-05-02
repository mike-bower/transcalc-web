import { useEffect, useMemo, useRef, useState } from 'react'
import { calculateRoundSBeamSpan } from '../../domain/shearBeams'
import { DEFAULT_MATERIAL_ID, getMaterial } from '../../domain/materials'
import MaterialSelector from '../MaterialSelector'
import RoundSBeamShearModelPreview from '../RoundSBeamShearModelPreview'
import RoundSBeamShearDiagram from '../diagrams/RoundSBeamShearDiagram'
import WheatstoneBridgeDiagram from '../diagrams/WheatstoneBridgeDiagram'
import SectionToggle from '../SectionToggle'
import WorkspaceControls from '../WorkspaceControls'
import RoundSBeamShearFea3DCalc from './RoundSBeamShearFea3DCalc'

type UnitSystem = 'SI' | 'US'

const N_PER_LBF = 4.4482216152605
const MM_PER_IN = 25.4
const GPA_PER_MPSI = 6.8947572932

const round = (v: number, d = 4): number => Math.round(v * Math.pow(10, d)) / Math.pow(10, d)
const show = (v: number, d: number): string => (Number.isFinite(v) ? v.toFixed(d) : '—')

type Props = { unitSystem: UnitSystem; onUnitChange: (next: UnitSystem) => void }

export default function RoundSBeamShearCalc({ unitSystem, onUnitChange }: Props) {
  const [load, setLoad] = useState(1000)
  const [width, setWidth] = useState(20)
  const [height, setHeight] = useState(30)
  const [diameter, setDiameter] = useState(20)
  const [thickness, setThickness] = useState(3)
  const [modulusGPa, setModulusGPa] = useState(() => getMaterial(DEFAULT_MATERIAL_ID).eGPa)
  const [poisson, setPoisson] = useState(() => getMaterial(DEFAULT_MATERIAL_ID).nu)
  const [materialId, setMaterialId] = useState(DEFAULT_MATERIAL_ID)
  const [gageFactor, setGageFactor] = useState(2.1)
  const [mode, setMode] = useState<'analytical' | '3d-fea'>('analytical')
  const [bendingNull, setBendingNull] = useState(false)
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
      setHeight(v => round(v / MM_PER_IN))
      setDiameter(v => round(v / MM_PER_IN))
      setThickness(v => round(v / MM_PER_IN))
      setModulusGPa(v => round(v / GPA_PER_MPSI))
    } else {
      setLoad(v => round(v * N_PER_LBF))
      setWidth(v => round(v * MM_PER_IN))
      setHeight(v => round(v * MM_PER_IN))
      setDiameter(v => round(v * MM_PER_IN))
      setThickness(v => round(v * MM_PER_IN))
      setModulusGPa(v => round(v * GPA_PER_MPSI))
    }
  }, [unitSystem])

  const siInputs = useMemo(() => {
    const mm = unitSystem === 'SI' ? 1 : MM_PER_IN
    return {
      loadN: unitSystem === 'SI' ? load : load * N_PER_LBF,
      widthMm: width * mm,
      heightMm: height * mm,
      diameterMm: diameter * mm,
      thicknessMm: thickness * mm,
      modulusGPa: unitSystem === 'SI' ? modulusGPa : modulusGPa * GPA_PER_MPSI,
    }
  }, [unitSystem, load, width, height, diameter, thickness, modulusGPa])

  const result = useMemo(() => {
    const loadN = unitSystem === 'SI' ? load : load * N_PER_LBF
    const mm = unitSystem === 'SI' ? 1 : MM_PER_IN
    const w = width * mm, h = height * mm, d = diameter * mm, t = thickness * mm
    const modPa = (unitSystem === 'SI' ? modulusGPa : modulusGPa * GPA_PER_MPSI) * 1e9
    const checks: [number, string][] = [
      [loadN, 'Applied load'], [w, 'Width'], [h, 'Height'], [d, 'Diameter'], [t, 'Thickness'],
      [modPa, 'Modulus'], [gageFactor, 'Gage factor'],
    ]
    const bad = checks.find(([v]) => !Number.isFinite(v) || v <= 0)
    if (bad) return { error: `${bad[1]} must be a positive value.`, span: NaN }
    try {
      const span = calculateRoundSBeamSpan({ load: loadN, width: w, height: h, diameter: d, thickness: t, modulus: modPa, poisson, gageFactor })
      return { error: '', span }
    } catch (e) { return { error: e instanceof Error ? e.message : 'Calculation error', span: NaN } }
  }, [unitSystem, load, width, height, diameter, thickness, modulusGPa, poisson, gageFactor])

  const forceUnit = unitSystem === 'SI' ? 'N' : 'lbf'
  const lenUnit = unitSystem === 'SI' ? 'mm' : 'in'
  const modUnit = unitSystem === 'SI' ? 'GPa' : 'Mpsi'

  return (
    <div className="bino-wrap">
      <WorkspaceControls mode={mode} onModeChange={setMode} unitSystem={unitSystem} onUnitChange={onUnitChange}>
        <div className="analysis-toggle">
          <button className={!bendingNull ? 'active' : ''} onClick={() => setBendingNull(false)}>Parallel gages</button>
          <button className={bendingNull ? 'active' : ''} onClick={() => setBendingNull(true)}>Bending-null (Fig C)</button>
        </div>
      </WorkspaceControls>

      {mode === 'analytical' && <SectionToggle label="Diagrams" open={show2D} onToggle={() => setShow2D(v => !v)} />}
      {mode === 'analytical' && show2D && (
        <div className="calc-diagram-row">
          <div className="calc-diagram-2d">
            <RoundSBeamShearDiagram
              load={siInputs.loadN}
              width={siInputs.widthMm}
              height={siInputs.heightMm}
              diameter={siInputs.diameterMm}
              thickness={siInputs.thicknessMm}
              unitSystem={unitSystem}
            />
          </div>
          <div className="calc-diagram-2d">
            <WheatstoneBridgeDiagram config="shear" />
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
            <label>Section width ({lenUnit})<input type="number" value={Number.isFinite(width) ? width : ''} onChange={e => setWidth(e.target.value === '' ? NaN : Number(e.target.value))} /></label>
            <label>Section height ({lenUnit})<input type="number" value={Number.isFinite(height) ? height : ''} onChange={e => setHeight(e.target.value === '' ? NaN : Number(e.target.value))} /></label>
            <label>Flange opening diameter ({lenUnit})<input type="number" value={Number.isFinite(diameter) ? diameter : ''} onChange={e => setDiameter(e.target.value === '' ? NaN : Number(e.target.value))} /></label>
            <label>Web thickness ({lenUnit})<input type="number" value={Number.isFinite(thickness) ? thickness : ''} onChange={e => setThickness(e.target.value === '' ? NaN : Number(e.target.value))} /></label>
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
            <tr><td>Full Bridge Span:</td><td>{show(result.span, 4)}</td><td>mV/V</td></tr>
          </tbody>
        </table>
      )}

      <SectionToggle label="3D View" open={show3D} onToggle={() => setShow3D(v => !v)} />
      {show3D && (
        <div className="calc-model-3d">
          {mode === 'analytical' && (
            <RoundSBeamShearModelPreview
              params={{
                load: siInputs.loadN,
                width: siInputs.widthMm,
                height: siInputs.heightMm,
                diameter: siInputs.diameterMm,
                thickness: siInputs.thicknessMm,
                bendingNull: bendingNull ? 1 : 0,
              }}
              us={unitSystem === 'US'}
              materialId={materialId}
            />
          )}
          {mode === '3d-fea' && (
            <RoundSBeamShearFea3DCalc
              loadN={siInputs.loadN}
              widthMm={siInputs.widthMm}
              heightMm={siInputs.heightMm}
              diameterMm={siInputs.diameterMm}
              thicknessMm={siInputs.thicknessMm}
              modulusGPa={siInputs.modulusGPa}
              nu={poisson}
            />
          )}
        </div>
      )}

      {bendingNull && (
        <p className="fea-note">Bending-null (Fig C, VMM-26): back-face gage grids are rotated 90° relative to front-face grids and wired into opposite bridge arms — bending strains cancel, improving immunity to off-axis loading.</p>
      )}
    </div>
  )
}
