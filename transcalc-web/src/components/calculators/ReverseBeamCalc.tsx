import { useEffect, useMemo, useRef, useState } from 'react'
import {
  calculateReversebeamStrain,
  type BridgeConfig,
  BRIDGE_CONFIG_LABELS,
  getActiveGages,
} from '../../domain/reversebeam'
import { DEFAULT_MATERIAL_ID, getMaterial } from '../../domain/materials'
import MaterialSelector from '../MaterialSelector'
import ReverseBeamDiagram from '../diagrams/ReverseBeamDiagram'
import ReverseBeamBridgeDiagram from '../diagrams/ReverseBeamBridgeDiagram'
import ReverseBeamModelPreview from '../ReverseBeamModelPreview'
import SectionToggle from '../SectionToggle'
import WorkspaceControls from '../WorkspaceControls'
import ReverseBeamFea3DCalc from './ReverseBeamFea3DCalc'

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

export default function ReverseBeamCalc({ unitSystem, onUnitChange }: Props) {
  const [load, setLoad] = useState(100)             // N or lbf
  const [width, setWidth] = useState(25)             // mm or in
  const [thickness, setThickness] = useState(2)      // mm or in
  const [beamLength, setBeamLength] = useState(75)   // mm or in
  const [distBetweenGages, setDistBetweenGages] = useState(25) // mm or in
  const [modulusGPa, setModulusGPa] = useState(() => getMaterial(DEFAULT_MATERIAL_ID).eGPa)  // GPa or Mpsi
  const [gageLength, setGageLength] = useState(5)    // mm or in
  const [gageFactor, setGageFactor] = useState(2.1)
  const [bridgeConfig, setBridgeConfig] = useState<BridgeConfig>('fullBridgeTopBot')
  const [poissonRatio, setPoissonRatio] = useState(() => getMaterial(DEFAULT_MATERIAL_ID).nu)
  const [materialId, setMaterialId] = useState(DEFAULT_MATERIAL_ID)
  const [mode, setMode] = useState<'analytical' | '3d-fea'>('analytical')
  const [show2D, setShow2D] = useState(false)
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
      setBeamLength(v => round(v / MM_PER_IN))
      setDistBetweenGages(v => round(v / MM_PER_IN))
      setModulusGPa(v => round(v / GPA_PER_MPSI))
      setGageLength(v => round(v / MM_PER_IN))
    } else {
      setLoad(v => round(v * N_PER_LBF))
      setWidth(v => round(v * MM_PER_IN))
      setThickness(v => round(v * MM_PER_IN))
      setBeamLength(v => round(v * MM_PER_IN))
      setDistBetweenGages(v => round(v * MM_PER_IN))
      setModulusGPa(v => round(v * GPA_PER_MPSI))
      setGageLength(v => round(v * MM_PER_IN))
    }
  }, [unitSystem])

  // Always call domain in SI: N, mm, Pa
  const siInputs = useMemo(() => {
    const mm = unitSystem === 'SI' ? 1 : MM_PER_IN
    return {
      loadN: unitSystem === 'SI' ? load : load * N_PER_LBF,
      widthMm: width * mm,
      thicknessMm: thickness * mm,
      beamLengthMm: beamLength * mm,
      distMm: distBetweenGages * mm,
      gageLenMm: gageLength * mm,
      modulusGPa: unitSystem === 'SI' ? modulusGPa : modulusGPa * GPA_PER_MPSI,
    }
  }, [unitSystem, load, width, thickness, beamLength, distBetweenGages, modulusGPa, gageLength])

  const result = useMemo(() => {
    const { loadN, widthMm, thicknessMm, distMm, gageLenMm, modulusGPa: modGPa } = siInputs
    const modulusPa = modGPa * 1e9
    const checks: [number, string][] = [
      [loadN, 'Applied load'], [widthMm, 'Beam width'], [thicknessMm, 'Thickness'],
      [distMm, 'Distance between gages'], [modulusPa, 'Modulus'],
      [gageLenMm, 'Gage length'], [gageFactor, 'Gage factor'],
    ]
    const bad = checks.find(([v]) => !Number.isFinite(v) || v <= 0)
    if (bad) return { error: `${bad[1]} must be a positive value.`, data: null }

    try {
      const data = calculateReversebeamStrain({
        appliedLoad: loadN,
        beamWidth: widthMm,
        thickness: thicknessMm,
        distanceBetweenGages: distMm,
        beamLength: siInputs.beamLengthMm,
        modulus: modulusPa,
        gageLength: gageLenMm,
        gageFactor,
        bridgeConfig,
        poissonRatio,
      })
      return { error: '', data }
    } catch (e) {
      return { error: e instanceof Error ? e.message : 'Calculation error', data: null }
    }
  }, [siInputs, gageFactor])

  const forceUnit = unitSystem === 'SI' ? 'N' : 'lbf'
  const lenUnit = unitSystem === 'SI' ? 'mm' : 'in'
  const modUnit = unitSystem === 'SI' ? 'GPa' : 'Mpsi'

  // Gage marker: near left support (x = gageLength/2 from left)
  const gageMm = siInputs.gageLenMm / 2
  const span = siInputs.distMm

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
              onSelect={sel => { setMaterialId(sel.id); setModulusGPa(sel.eGPaDisplay); setPoissonRatio(sel.nu) }}
            />
            <label style={{ gridColumn: '1 / -1' }}>Bridge Configuration
              <select value={bridgeConfig} onChange={e => setBridgeConfig(e.target.value as BridgeConfig)}
                style={{ display: 'block', width: '100%', marginTop: 4, padding: '4px 8px', borderRadius: 6, border: '1px solid #c8d8e8', fontSize: 13 }}>
                {(Object.keys(BRIDGE_CONFIG_LABELS) as BridgeConfig[]).map(k => (
                  <option key={k} value={k}>{BRIDGE_CONFIG_LABELS[k]}</option>
                ))}
              </select>
            </label>
            <label>Applied load ({forceUnit})<input type="number" value={Number.isFinite(load) ? load : ''} onChange={e => setLoad(e.target.value === '' ? NaN : Number(e.target.value))} /></label>
            <label>Beam width ({lenUnit})<input type="number" value={Number.isFinite(width) ? width : ''} onChange={e => setWidth(e.target.value === '' ? NaN : Number(e.target.value))} /></label>
            <label>Thickness ({lenUnit})<input type="number" value={Number.isFinite(thickness) ? thickness : ''} onChange={e => setThickness(e.target.value === '' ? NaN : Number(e.target.value))} /></label>
            <label>Beam length, L ({lenUnit})<input type="number" value={Number.isFinite(beamLength) ? beamLength : ''} onChange={e => setBeamLength(e.target.value === '' ? NaN : Number(e.target.value))} /></label>
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
            <tr><td>Min Strain:</td><td>{show(result.data?.minStrain ?? NaN, 0)}</td><td>µε</td></tr>
            <tr><td>Max Strain:</td><td>{show(result.data?.maxStrain ?? NaN, 0)}</td><td>µε</td></tr>
            <tr><td>Strain Variation:</td><td>{show(result.data?.gradient ?? NaN, 2)}</td><td>%</td></tr>
            <tr><td>Span at Applied Force:</td><td>{show(result.data?.fullSpanSensitivity ?? NaN, 4)}</td><td>mV/V</td></tr>
          </tbody>
        </table>
      )}

      {mode === 'analytical' && <SectionToggle label="Diagrams" open={show2D} onToggle={() => setShow2D(v => !v)} />}
      {mode === 'analytical' && show2D && (
        <div className="calc-diagram-row">
          <div className="calc-diagram-2d">
            <ReverseBeamDiagram
              load={load}
              width={width}
              thickness={thickness}
              beamLength={beamLength}
              distBetweenGages={distBetweenGages}
              gageLength={gageLength}
              unitSystem={unitSystem}
              bridgeConfig={bridgeConfig}
            />
          </div>
          <div className="calc-diagram-2d">
            <ReverseBeamBridgeDiagram bridgeConfig={bridgeConfig} poissonRatio={poissonRatio} />
          </div>
        </div>
      )}

      <SectionToggle label="3D View" open={show3D} onToggle={() => setShow3D(v => !v)} />
      {show3D && (
        <div className="calc-model-3d">
          {mode === 'analytical' && (
            <ReverseBeamModelPreview
              load={load}
              width={width}
              thickness={thickness}
              beamLength={beamLength}
              distBetweenGages={distBetweenGages}
              gageLength={gageLength}
              unitSystem={unitSystem}
              bridgeConfig={bridgeConfig}
            />
          )}
          {mode === '3d-fea' && (
            <ReverseBeamFea3DCalc
              loadN={siInputs.loadN}
              beamLengthMm={siInputs.beamLengthMm}
              distBetweenGagesMm={siInputs.distMm}
              widthMm={siInputs.widthMm}
              thicknessMm={siInputs.thicknessMm}
              modulusGPa={siInputs.modulusGPa}
              nu={poissonRatio}
            />
          )}
        </div>
      )}

    </div>
  )
}
