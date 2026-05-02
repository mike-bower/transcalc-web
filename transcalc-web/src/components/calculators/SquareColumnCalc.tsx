import { useEffect, useMemo, useRef, useState } from 'react'
import { calculateSquareColumnStrain } from '../../domain/sqrcol'
import { DEFAULT_MATERIAL_ID, getMaterial } from '../../domain/materials'
import MaterialSelector from '../MaterialSelector'
import SquareColumnModelPreview from '../SquareColumnModelPreview'
import SquareColumnDiagram from '../diagrams/SquareColumnDiagram'
import WheatstoneBridgeDiagram from '../diagrams/WheatstoneBridgeDiagram'
import SquareColumnFea3DCalc from './SquareColumnFea3DCalc'
import SectionToggle from '../SectionToggle'
import WorkspaceControls from '../WorkspaceControls'

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
  const [columnLength, setColumnLength] = useState(150) // mm or in
  const [modulusGPa, setModulusGPa] = useState(() => getMaterial(DEFAULT_MATERIAL_ID).eGPa) // GPa or Mpsi
  const [poisson, setPoisson] = useState(() => getMaterial(DEFAULT_MATERIAL_ID).nu)
  const [materialId, setMaterialId] = useState(DEFAULT_MATERIAL_ID)
  const [gageFactor, setGageFactor] = useState(2.1)
  const [analysisMode, setAnalysisMode] = useState<'analytical' | '3d-fea'>('analytical')
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
      setDepth(v => round(v / MM_PER_IN))
      setColumnLength(v => round(v / MM_PER_IN))
      setModulusGPa(v => round(v / GPA_PER_MPSI))
    } else {
      setLoad(v => round(v * N_PER_LBF))
      setWidth(v => round(v * MM_PER_IN))
      setDepth(v => round(v * MM_PER_IN))
      setColumnLength(v => round(v * MM_PER_IN))
      setModulusGPa(v => round(v * GPA_PER_MPSI))
    }
  }, [unitSystem])

  const siInputs = useMemo(() => {
    const mm = unitSystem === 'SI' ? 1 : MM_PER_IN
    return {
      loadN: unitSystem === 'SI' ? load : load * N_PER_LBF,
      widthMm: width * mm,
      depthMm: depth * mm,
      lengthMm: columnLength * mm,
      modulusGPa: unitSystem === 'SI' ? modulusGPa : modulusGPa * GPA_PER_MPSI,
    }
  }, [unitSystem, load, width, depth, columnLength, modulusGPa])

  const columnLengthWarning = useMemo(() => {
    const mm = unitSystem === 'SI' ? 1 : MM_PER_IN
    const lenMm = columnLength * mm
    const maxDim = Math.max(width * mm, depth * mm)
    if (Number.isFinite(lenMm) && Number.isFinite(maxDim) && maxDim > 0 && lenMm < 5 * maxDim) {
      return `Column length should be ≥ 5× max cross-section dimension (${(5 * maxDim).toFixed(1)} ${unitSystem === 'SI' ? 'mm' : 'in'}) for uniform strain at gage locations (VMM-26).`
    }
    return ''
  }, [unitSystem, columnLength, width, depth])

  const result = useMemo(() => {
    const modulusForDomain = unitSystem === 'US' ? modulusGPa * 1e6 : modulusGPa
    const checks: [number, string][] = [
      [load, 'Applied load'], [width, 'Width'], [depth, 'Depth'],
      [modulusForDomain, 'Modulus'], [gageFactor, 'Gage factor'],
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

  const naturalFreqHz = useMemo(() => {
    const { loadN, widthMm, depthMm, lengthMm, modulusGPa: modGPa } = siInputs
    if ([loadN, widthMm, depthMm, lengthMm, modGPa].some(v => !Number.isFinite(v) || v <= 0)) return NaN
    const E = modGPa * 1e9
    const A = (widthMm / 1000) * (depthMm / 1000)
    const L = lengthMm / 1000
    const k = A * E / L
    const mLoad = loadN / 9.80665
    const mCol = 7850 * A * L
    const mEff = mLoad + mCol / 3
    return mEff > 0 ? (1 / (2 * Math.PI)) * Math.sqrt(k / mEff) : NaN
  }, [siInputs])


  const forceUnit = unitSystem === 'SI' ? 'N' : 'lbf'
  const lenUnit = unitSystem === 'SI' ? 'mm' : 'in'
  const modUnit = unitSystem === 'SI' ? 'GPa' : 'Mpsi'

  return (
    <div className="bino-wrap">
      <WorkspaceControls mode={analysisMode} onModeChange={setAnalysisMode} unitSystem={unitSystem} onUnitChange={onUnitChange} />

      {analysisMode !== '3d-fea' && <SectionToggle label="Diagrams" open={show2D} onToggle={() => setShow2D(v => !v)} />}
      {analysisMode !== '3d-fea' && show2D && (
        <div className="calc-diagram-row">
          <div className="calc-diagram-2d">
            <SquareColumnDiagram
              load={siInputs.loadN}
              width={siInputs.widthMm}
              depth={siInputs.depthMm}
              length={siInputs.lengthMm}
              unitSystem={unitSystem}
            />
          </div>
          <div className="calc-diagram-2d">
            <WheatstoneBridgeDiagram config="column" />
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
            <label>Width ({lenUnit})<input type="number" value={Number.isFinite(width) ? width : ''} onChange={e => setWidth(e.target.value === '' ? NaN : Number(e.target.value))} /></label>
            <label>Depth ({lenUnit})<input type="number" value={Number.isFinite(depth) ? depth : ''} onChange={e => setDepth(e.target.value === '' ? NaN : Number(e.target.value))} /></label>
            <label>Column length ({lenUnit})<input type="number" value={Number.isFinite(columnLength) ? columnLength : ''} onChange={e => setColumnLength(e.target.value === '' ? NaN : Number(e.target.value))} /></label>
            <label>Gage factor<input type="number" value={Number.isFinite(gageFactor) ? gageFactor : ''} onChange={e => setGageFactor(e.target.value === '' ? NaN : Number(e.target.value))} /></label>
          </div>
          {result.error && <p className="workspace-note">{result.error}</p>}
        </>
      )}

      <SectionToggle label="Results" open={showResults} onToggle={() => setShowResults(v => !v)} />
      {analysisMode !== '3d-fea' && showResults && (
        <>
          {columnLengthWarning && <p className="fea-accuracy-warn">{columnLengthWarning}</p>}
          <table className="bino-table">
            <tbody>
              <tr><th colSpan={3}>Calculated Values</th></tr>
              <tr><td>Axial Strain:</td><td>{show(result.data?.axialStrain ?? NaN, 0)}</td><td>µε</td></tr>
              <tr><td>Transverse Strain:</td><td>{show(result.data?.transverseStrain ?? NaN, 0)}</td><td>µε</td></tr>
              <tr><td>Full Bridge Span:</td><td>{show(result.data?.fullSpanOutput ?? NaN, 4)}</td><td>mV/V</td></tr>
              <tr><td>Natural Frequency:</td><td>{show(naturalFreqHz, 1)}</td><td>Hz</td></tr>
            </tbody>
          </table>
        </>
      )}

      <SectionToggle label="3D View" open={show3D} onToggle={() => setShow3D(v => !v)} />
      {show3D && (
        <div className="calc-model-3d">
          {analysisMode === 'analytical' && (
            <SquareColumnModelPreview
              params={{
                load:  siInputs.loadN,
                width: siInputs.widthMm,
                depth: siInputs.depthMm,
                length: siInputs.lengthMm,
                modulus: siInputs.modulusGPa,
                poisson,
                gageFactor,
              }}
              us={unitSystem === 'US'}
              materialId={materialId}
            />
          )}
          {analysisMode === '3d-fea' && (
            <SquareColumnFea3DCalc
              loadN={siInputs.loadN}
              widthMm={siInputs.widthMm}
              depthMm={siInputs.depthMm}
              lengthMm={siInputs.lengthMm}
              modulusGPa={siInputs.modulusGPa}
              nu={poisson}
            />
          )}
        </div>
      )}
    </div>
  )
}
