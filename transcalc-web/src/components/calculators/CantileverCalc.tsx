import { useEffect, useMemo, useRef, useState } from 'react'
import CantileverFea3DCalc from './CantileverFea3DCalc'
import { computeCantileverStress } from '../../domain/core'
import {
  calculateCantileverAvgStrain,
  calculateCantileverGradient,
  calculateCantileverMaxStrain,
  calculateCantileverMinStrain,
  calculateCantileverNaturalFrequency,
} from '../../domain/beams'
import { generateCantileverMeshStep } from '../../domain/fea/stepExport'
import { DEFAULT_MATERIAL_ID, getMaterial } from '../../domain/materials'
import MaterialSelector from '../MaterialSelector'
import CantileverDiagram from '../diagrams/CantileverDiagram'
import WheatstoneBridgeDiagram, { type BridgePreset } from '../diagrams/WheatstoneBridgeDiagram'
import CantileverModelPreview from '../CantileverModelPreview'
import SectionToggle from '../SectionToggle'
import WorkspaceControls from '../WorkspaceControls'

type UnitSystem = 'SI' | 'US'

const N_PER_LBF = 4.4482216152605
const MM_PER_IN = 25.4
const GPA_PER_MPSI = 6.8947572932
const MPA_PER_KSI = 6.8947572932

const round = (v: number, d = 4): number => {
  const f = Math.pow(10, d)
  return Math.round(v * f) / f
}
const show = (v: number, d: number): string => (Number.isFinite(v) ? v.toFixed(d) : '—')

const MESH_OPTIONS = { elementsAlongLength: 40, elementsThroughThickness: 8 } as const

type Props = {
  unitSystem: UnitSystem
  onUnitChange: (next: UnitSystem) => void
}

type WorkspaceMode = 'analytical' | '3d-fea'

export default function CantileverCalc({ unitSystem, onUnitChange }: Props) {
  const [mode, setMode] = useState<WorkspaceMode>('analytical')
  const [load, setLoad] = useState(100)         // N or lbf
  const [width, setWidth] = useState(25)         // mm or in
  const [thickness, setThickness] = useState(2)  // mm or in
  const [momentArm, setMomentArm] = useState(100)// mm or in
  const [modulusGPa, setModulusGPa] = useState(() => getMaterial(DEFAULT_MATERIAL_ID).eGPa)
  const [poisson, setPoisson] = useState(() => getMaterial(DEFAULT_MATERIAL_ID).nu)
  const [densityKgM3, setDensityKgM3] = useState(() => getMaterial(DEFAULT_MATERIAL_ID).densityKgM3)
  const [materialId, setMaterialId] = useState(DEFAULT_MATERIAL_ID)
  const [gageLength, setGageLength] = useState(5)   // mm or in
  const [gageFactor, setGageFactor] = useState(2.0)
  const [bridgeConfig, setBridgeConfig] = useState<BridgePreset>('cantHalfTopBot')

  const bridgeFactor = useMemo(() => {
    switch (bridgeConfig) {
      case 'cantQuarter':     return 0.25
      case 'cantPoissonHalf': return (1 + poisson) / 4
      case 'cantHalfTopBot':  return 0.5
      case 'cantFullBend':    return 1.0
      case 'cantFullPoisson': return (1 + poisson) / 2
      default:                return 0.5
    }
  }, [bridgeConfig, poisson])

  // Maps WheatstoneBridgeDiagram preset → 3D model bridge config key
  const model3DBridgeConfig = useMemo(() => {
    switch (bridgeConfig) {
      case 'cantQuarter':     return 'quarter'
      case 'cantPoissonHalf': return 'poissonHalf'
      case 'cantHalfTopBot':  return 'halfBending'
      case 'cantFullBend':    return 'fullBending'
      case 'cantFullPoisson': return 'poissonFullTop'
      default:                return 'halfBending'
    }
  }, [bridgeConfig])
  const [show2D, setShow2D]         = useState(true)
  const [show3D, setShow3D]         = useState(false)
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
      setMomentArm(v => round(v / MM_PER_IN))
      setModulusGPa(v => round(v / GPA_PER_MPSI))
      setGageLength(v => round(v / MM_PER_IN))
    } else {
      setLoad(v => round(v * N_PER_LBF))
      setWidth(v => round(v * MM_PER_IN))
      setThickness(v => round(v * MM_PER_IN))
      setMomentArm(v => round(v * MM_PER_IN))
      setModulusGPa(v => round(v * GPA_PER_MPSI))
      setGageLength(v => round(v * MM_PER_IN))
    }
  }, [unitSystem])

  // Normalize to SI for calculations
  const norm = useMemo(() => {
    const s = unitSystem === 'SI' ? 1 : 0
    return {
      loadN: s ? load : load * N_PER_LBF,
      widthMm: s ? width : width * MM_PER_IN,
      thicknessMm: s ? thickness : thickness * MM_PER_IN,
      momentArmMm: s ? momentArm : momentArm * MM_PER_IN,
      modulusGPa: s ? modulusGPa : modulusGPa * GPA_PER_MPSI,
      gageLengthMm: s ? gageLength : gageLength * MM_PER_IN,
    }
  }, [unitSystem, load, width, thickness, momentArm, modulusGPa, gageLength])

  const inputError = useMemo(() => {
    const checks: [number, string][] = [
      [norm.loadN, 'Applied load'],
      [norm.widthMm, 'Beam width'],
      [norm.thicknessMm, 'Thickness'],
      [norm.momentArmMm, 'Load point to gage CL length'],
      [norm.modulusGPa, 'Modulus of Elasticity'],
      [norm.gageLengthMm, 'Gage length'],
      [gageFactor, 'Gage factor'],
    ]
    const bad = checks.find(([v]) => !Number.isFinite(v) || v <= 0)
    return bad ? `${bad[1]} must be a positive value.` : ''
  }, [norm, gageFactor])

  const result = useMemo(() => {
    if (inputError) return null
    try {
      const min = calculateCantileverMinStrain(norm.loadN, norm.momentArmMm, norm.gageLengthMm, norm.modulusGPa, norm.widthMm, norm.thicknessMm)
      const max = calculateCantileverMaxStrain(norm.loadN, norm.momentArmMm, norm.gageLengthMm, norm.modulusGPa, norm.widthMm, norm.thicknessMm)
      const avg = calculateCantileverAvgStrain(norm.loadN, norm.momentArmMm, norm.modulusGPa, norm.widthMm, norm.thicknessMm)
      const stressMPa = computeCantileverStress(norm.loadN, norm.widthMm, norm.thicknessMm, norm.momentArmMm)
      const naturalFreqHz = calculateCantileverNaturalFrequency(
        norm.modulusGPa * 1e9, norm.widthMm, norm.thicknessMm, norm.momentArmMm, norm.loadN,
        densityKgM3,
      )
      return {
        minStrain: min,
        maxStrain: max,
        avgStrain: avg,
        gradient: calculateCantileverGradient(max, min),
        spanMvV: avg * gageFactor * bridgeFactor * 1e-3,
        stressMPa,
        naturalFreqHz,
      }
    } catch {
      return null
    }
  }, [inputError, norm, gageFactor, bridgeFactor, densityKgM3])

  const feaInput = useMemo(() => ({
    appliedForceN: norm.loadN,
    beamWidthMm: norm.widthMm,
    thicknessMm: norm.thicknessMm,
    loadPointToGageClLengthMm: norm.momentArmMm,
    modulusGPa: norm.modulusGPa,
    gageLengthMm: norm.gageLengthMm,
    gageFactor,
  }), [norm, gageFactor])

  const activeResult = result

  // Per-gage strain values for display (µε)
  const gageStrains = useMemo(() => {
    const ε = activeResult?.avgStrain
    if (!ε) return null
    const ν = poisson
    switch (bridgeConfig) {
      case 'cantQuarter':     return [{ label: 'A', strain: +ε, desc: 'top 0°' }]
      case 'cantPoissonHalf': return [{ label: 'A', strain: +ε, desc: 'top 0°' }, { label: 'B', strain: -ν * ε, desc: 'top 90°' }]
      case 'cantHalfTopBot':  return [{ label: 'A', strain: +ε, desc: 'top 0°' }, { label: 'B', strain: -ε, desc: 'bot 0°' }]
      case 'cantFullBend':    return [{ label: 'A', strain: +ε, desc: 'top 0°' }, { label: 'B', strain: -ε, desc: 'bot 0°' },
                                      { label: 'C', strain: +ε, desc: 'top 0°' }, { label: 'D', strain: -ε, desc: 'bot 0°' }]
      case 'cantFullPoisson': return [{ label: 'A', strain: +ε, desc: 'top 0°' }, { label: 'B', strain: -ν * ε, desc: 'top 90°' },
                                      { label: 'C', strain: +ε, desc: 'top 0°' }, { label: 'D', strain: -ν * ε, desc: 'top 90°' }]
      default:                return [{ label: 'A', strain: +ε, desc: 'top 0°' }]
    }
  }, [activeResult?.avgStrain, bridgeConfig, poisson])

  const forceUnit = unitSystem === 'SI' ? 'N' : 'lbf'
  const lenUnit = unitSystem === 'SI' ? 'mm' : 'in'
  const modUnit = unitSystem === 'SI' ? 'GPa' : 'Mpsi'
  const stressDisplay = result ? (unitSystem === 'SI' ? result.stressMPa : result.stressMPa / MPA_PER_KSI) : NaN
  const stressUnit = unitSystem === 'SI' ? 'MPa' : 'ksi'

  const exportStep = () => {
    if (inputError) return
    const text = generateCantileverMeshStep(feaInput, MESH_OPTIONS)
    const a = document.createElement('a')
    a.href = URL.createObjectURL(new Blob([text], { type: 'application/step' }))
    a.download = `cantilever_mesh.step`
    a.click()
  }

  return (
    <div className="bino-wrap">
      <WorkspaceControls mode={mode} onModeChange={setMode} unitSystem={unitSystem} onUnitChange={onUnitChange}>
        {mode === 'analytical' && <button className="export-btn" onClick={exportStep} disabled={!!inputError}>Export STEP</button>}
      </WorkspaceControls>

      {mode === 'analytical' && <SectionToggle label="Diagrams" open={show2D} onToggle={() => setShow2D(v => !v)} />}
      {mode === 'analytical' && show2D && (
        <div className="calc-diagram-row">
          <div className="calc-diagram-2d">
            <CantileverDiagram
              load={norm.loadN}
              width={norm.widthMm}
              thickness={norm.thicknessMm}
              momentArm={norm.momentArmMm}
              gageLength={norm.gageLengthMm}
              unitSystem={unitSystem}
              bridgeConfig={bridgeConfig}
            />
          </div>
          <div className="calc-diagram-2d">
            <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginBottom: 6 }}>
              {([
                ['cantQuarter',     '¼ Bridge'],
                ['cantPoissonHalf', '½ Poisson'],
                ['cantHalfTopBot',  '½ Top/Bot'],
                ['cantFullBend',    'Full Bend'],
                ['cantFullPoisson', 'Full Poisson'],
              ] as [BridgePreset, string][]).map(([key, label]) => (
                <button key={key} onClick={() => setBridgeConfig(key)} style={{
                  fontSize: '0.72rem', padding: '3px 7px',
                  border: '1px solid', borderRadius: 3, cursor: 'pointer',
                  background: bridgeConfig === key ? 'rgba(37,99,235,0.55)' : 'rgba(51,65,85,0.35)',
                  borderColor: bridgeConfig === key ? 'rgba(96,165,250,0.7)' : 'rgba(71,85,105,0.4)',
                  color: '#f8fafc',
                }}>
                  {label}
                </button>
              ))}
            </div>
            <WheatstoneBridgeDiagram config={bridgeConfig} />
          </div>
        </div>
      )}

      <SectionToggle label="Inputs" open={showInputs} onToggle={() => setShowInputs(v => !v)} />
      {showInputs && (
        <>
          <div className="bino-grid" style={{ marginBottom: 4 }}>
            <MaterialSelector
              materialId={materialId}
              unitSystem={unitSystem}
              onSelect={sel => {
                setMaterialId(sel.id)
                setModulusGPa(sel.eGPaDisplay)
                setPoisson(sel.nu)
                setDensityKgM3(sel.densityKgM3)
              }}
            />
          </div>
          <div className="bino-grid">
            <label>Applied load ({forceUnit})<input type="number" value={Number.isFinite(load) ? load : ''} onChange={e => setLoad(e.target.value === '' ? NaN : Number(e.target.value))} /></label>
            <label>Beam width ({lenUnit})<input type="number" value={Number.isFinite(width) ? width : ''} onChange={e => setWidth(e.target.value === '' ? NaN : Number(e.target.value))} /></label>
            <label>Thickness ({lenUnit})<input type="number" value={Number.isFinite(thickness) ? thickness : ''} onChange={e => setThickness(e.target.value === '' ? NaN : Number(e.target.value))} /></label>
            <label>Load point to gage CL, L ({lenUnit})<input type="number" value={Number.isFinite(momentArm) ? momentArm : ''} onChange={e => setMomentArm(e.target.value === '' ? NaN : Number(e.target.value))} /></label>
            <label>Gage length ({lenUnit})<input type="number" value={Number.isFinite(gageLength) ? gageLength : ''} onChange={e => setGageLength(e.target.value === '' ? NaN : Number(e.target.value))} /></label>
            <label>Gage factor<input type="number" value={Number.isFinite(gageFactor) ? gageFactor : ''} onChange={e => setGageFactor(e.target.value === '' ? NaN : Number(e.target.value))} /></label>
          </div>
          {inputError && <p className="workspace-note">{inputError}</p>}
        </>
      )}


      <SectionToggle label="Results" open={showResults} onToggle={() => setShowResults(v => !v)} />
      {mode === 'analytical' && showResults && (
        <table className="bino-table">
          <tbody>
            <tr><th colSpan={3}>Calculated Values</th></tr>
            <tr><td>Nominal Gage Strain:</td><td>{show(activeResult?.avgStrain ?? NaN, 0)}</td><td>µε</td></tr>
            <tr><td>Strain Variation:</td><td>{show(activeResult?.gradient ?? NaN, 2)}</td><td>%</td></tr>
            <tr><td>Span at Applied Force:</td><td>{show(activeResult?.spanMvV ?? NaN, 4)}</td><td>mV/V</td></tr>
            <tr><td>Bending Stress:</td><td>{show(stressDisplay, 3)}</td><td>{stressUnit}</td></tr>
            <tr><td>Natural Frequency:</td><td>{show(result?.naturalFreqHz ?? NaN, 1)}</td><td>Hz</td></tr>
            {gageStrains && <tr><th colSpan={3}>Gage Strains</th></tr>}
            {gageStrains?.map(g => (
              <tr key={g.label}>
                <td>Gage {g.label} ({g.desc}):</td>
                <td>{show(g.strain, 0)}</td>
                <td>µε</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <SectionToggle label="3D View" open={show3D} onToggle={() => setShow3D(v => !v)} />
      {show3D && (
        <div className="calc-model-3d">
          {mode === 'analytical' && (
            <CantileverModelPreview
              params={{
                load: norm.loadN,
                width: norm.widthMm,
                thickness: norm.thicknessMm,
                momentArm: norm.momentArmMm,
                gageLength: norm.gageLengthMm,
                gageLen: norm.gageLengthMm,
                gageOffset: norm.gageLengthMm / 2,
                clampLength: Math.max(norm.momentArmMm * 0.2, norm.gageLengthMm * 0.8),
                modulus: norm.modulusGPa,
                poisson,
                gageFactor,
                bridgeConfig: model3DBridgeConfig,
              }}
              us={unitSystem === 'US'}
              materialId={materialId}
            />
          )}
          {mode === '3d-fea' && (
            <CantileverFea3DCalc
              loadN={norm.loadN}
              widthMm={norm.widthMm}
              thicknessMm={norm.thicknessMm}
              momentArmMm={norm.momentArmMm}
              modulusGPa={norm.modulusGPa}
              nu={poisson}
            />
          )}
        </div>
      )}
    </div>
  )
}
