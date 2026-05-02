import { useEffect, useMemo, useRef, useState } from 'react'
import { calculateBinobeamStrainExplicit } from '../domain/binobeam'
import { DEFAULT_MATERIAL_ID, getMaterial } from '../domain/materials'
import MaterialSelector from './MaterialSelector'
import { BinocularModelPreview } from './BinocularModelPreview'
import { BinocularSketch2D } from './BinocularSketch2D'
import BinocularFea3DCalc from './calculators/BinocularFea3DCalc'
import SectionToggle from './SectionToggle'
import WorkspaceControls from './WorkspaceControls'

const parseInput = (raw: string): number => {
  if (raw.trim() === '') return Number.NaN
  return Number(raw)
}

const show = (value: number, digits: number): string => (Number.isFinite(value) ? value.toFixed(digits) : '—')
const round = (value: number, digits: number = 8): number => {
  const p = Math.pow(10, digits)
  return Math.round(value * p) / p
}

type UnitSystem = 'US' | 'SI'

const N_PER_LBF = 4.4482216152605
const MM_PER_IN = 25.4
const MPSI_PER_GPA = 0.1450377377
const GPA_PER_MPSI = 6.8947572932

type BinocularBeamWorkspaceProps = {
  unitSystem: UnitSystem
  onUnitChange: (next: UnitSystem) => void
  onHelpTokensChange?: (tokens: Record<string, string>) => void
}

export default function BinocularBeamWorkspace({ unitSystem, onUnitChange, onHelpTokensChange }: BinocularBeamWorkspaceProps) {
  const [mode, setMode] = useState<'analytical' | '3d-fea'>('analytical')
  const [appliedForce, setAppliedForce] = useState(unitSystem === 'US' ? 100 : 500)
  const [distanceBetweenHoles, setDistanceBetweenHoles] = useState(unitSystem === 'US' ? 2.5 : 60)
  const [radius, setRadius] = useState(unitSystem === 'US' ? 0.5 : 12)
  const [beamWidth, setBeamWidth] = useState(unitSystem === 'US' ? 1.0 : 25)
  const [beamHeight, setBeamHeight] = useState(unitSystem === 'US' ? 2.0 : 50)
  const [minimumThickness, setMinimumThickness] = useState(unitSystem === 'US' ? 0.15 : 4)
  const [modulus, setModulus] = useState(() => unitSystem === 'US' ? getMaterial(DEFAULT_MATERIAL_ID).eGPa / GPA_PER_MPSI : getMaterial(DEFAULT_MATERIAL_ID).eGPa)
  const [gageLength, setGageLength] = useState(unitSystem === 'US' ? 0.25 : 6)
  const [gageFactor, setGageFactor] = useState(2.1)
  const [poisson, setPoisson] = useState(() => getMaterial(DEFAULT_MATERIAL_ID).nu)
  const [materialId, setMaterialId] = useState(DEFAULT_MATERIAL_ID)

  const [showInputs, setShowInputs] = useState(true)
  const [showResults, setShowResults] = useState(true)
  const [show2D, setShow2D] = useState(false)
  const [show3D, setShow3D] = useState(false)

  const distanceLoadHole = 0
  const viewerParams = {
    beamWidth,
    beamHeight,
    distHoles: distanceBetweenHoles,
    radius,
    minThick: minimumThickness,
    gageLen: gageLength,
    load: appliedForce,
  }

  const forceUnit = unitSystem === 'US' ? 'lbf' : 'N'
  const lengthUnit = unitSystem === 'US' ? 'in' : 'mm'
  const modulusUnit = unitSystem === 'US' ? 'Mpsi' : 'GPa'

  const prevUnit = useRef<UnitSystem>(unitSystem)
  useEffect(() => {
    if (prevUnit.current === unitSystem) return
    prevUnit.current = unitSystem
    if (unitSystem === 'SI') {
      setAppliedForce((v) => round(v * N_PER_LBF))
      setDistanceBetweenHoles((v) => round(v * MM_PER_IN))
      setRadius((v) => round(v * MM_PER_IN))
      setBeamWidth((v) => round(v * MM_PER_IN))
      setBeamHeight((v) => round(v * MM_PER_IN))
      setMinimumThickness((v) => round(v * MM_PER_IN))
      setModulus((v) => round(v * GPA_PER_MPSI))
      setGageLength((v) => round(v * MM_PER_IN))
    } else {
      setAppliedForce((v) => round(v / N_PER_LBF))
      setDistanceBetweenHoles((v) => round(v / MM_PER_IN))
      setRadius((v) => round(v / MM_PER_IN))
      setBeamWidth((v) => round(v / MM_PER_IN))
      setBeamHeight((v) => round(v / MM_PER_IN))
      setMinimumThickness((v) => round(v / MM_PER_IN))
      setModulus((v) => round(v * MPSI_PER_GPA))
      setGageLength((v) => round(v / MM_PER_IN))
    }
  }, [unitSystem])

  const result = useMemo(() => {
    const checks: Array<[number, string]> = [
      [appliedForce, 'Applied Force'],
      [distanceBetweenHoles, 'Distance between Holes'],
      [radius, 'Radius'],
      [beamWidth, 'Beam Width'],
      [beamHeight, 'Beam Height'],
      [minimumThickness, 'Minimum Thickness'],
      [modulus, 'Modulus of Elasticity'],
      [gageLength, 'Gage Length'],
      [gageFactor, 'Gage Factor'],
    ]
    const bad = checks.find(([value]) => !Number.isFinite(value) || value <= 0)
    if (bad) {
      return {
        error: `${bad[1]} must be a positive value.`,
        avgStrain: Number.NaN, minStrain: Number.NaN, maxStrain: Number.NaN,
        gradient: Number.NaN, fullSpanSensitivity: Number.NaN,
        zOffset: Number.NaN, gageCenterline: Number.NaN,
      }
    }
    try {
      const solved = calculateBinobeamStrainExplicit(
        {
          appliedLoad: appliedForce,
          distanceBetweenHoles,
          radius,
          beamWidth,
          beamHeight,
          distanceLoadHole,
          minimumThickness,
          modulus,
          gageLength,
          gageFactor,
        },
        unitSystem
      )
      const zUnits = unitSystem === 'US' ? solved.zOffset / 0.0254 : solved.zOffset / 0.001
      return { error: '', ...solved, gageCenterline: distanceBetweenHoles + zUnits * 2 }
    } catch (err) {
      return {
        error: err instanceof Error ? err.message : 'Unable to solve binocular beam.',
        avgStrain: Number.NaN, minStrain: Number.NaN, maxStrain: Number.NaN,
        gradient: Number.NaN, fullSpanSensitivity: Number.NaN,
        zOffset: Number.NaN, gageCenterline: Number.NaN,
      }
    }
  }, [appliedForce, distanceBetweenHoles, radius, beamWidth, beamHeight, minimumThickness, modulus, gageLength, gageFactor, distanceLoadHole, unitSystem])

  useEffect(() => {
    if (!onHelpTokensChange) return
    onHelpTokensChange({
      af1: Number.isFinite(appliedForce) ? appliedForce.toString() : '—',
      af2: forceUnit,
      cl1: Number.isFinite(distanceBetweenHoles) ? distanceBetweenHoles.toString() : '—',
      cl2: lengthUnit,
      rad1: Number.isFinite(radius) ? radius.toString() : '—',
      rad2: lengthUnit,
      bw1: Number.isFinite(beamWidth) ? beamWidth.toString() : '—',
      bw2: lengthUnit,
      bh1: Number.isFinite(beamHeight) ? beamHeight.toString() : '—',
      bh2: lengthUnit,
      mt1: Number.isFinite(minimumThickness) ? minimumThickness.toString() : '—',
      mt2: lengthUnit,
      me1: Number.isFinite(modulus) ? modulus.toString() : '—',
      me2: modulusUnit,
      gl1: Number.isFinite(gageLength) ? gageLength.toString() : '—',
      gl2: lengthUnit,
      gf1: Number.isFinite(gageFactor) ? gageFactor.toString() : '—',
      gc1: show(result.gageCenterline, 4),
      gcu1: lengthUnit,
      gs1: show(result.avgStrain, 1),
      sv1: show(result.gradient, 2),
      sf1: show(result.fullSpanSensitivity, 4),
    })
  }, [
    onHelpTokensChange, appliedForce, distanceBetweenHoles, radius, beamWidth, beamHeight,
    minimumThickness, modulus, gageLength, gageFactor, forceUnit, lengthUnit, modulusUnit,
    result.gageCenterline, result.avgStrain, result.gradient, result.fullSpanSensitivity,
  ])

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
              onSelect={sel => { setMaterialId(sel.id); setModulus(sel.eGPaDisplay); setPoisson(sel.nu) }}
            />
            <label>Applied force ({forceUnit})<input type="number" step="any" value={Number.isFinite(appliedForce) ? appliedForce : ''} onChange={e => setAppliedForce(parseInput(e.target.value))} /></label>
            <label>Hole spacing ({lengthUnit})<input type="number" step="any" value={Number.isFinite(distanceBetweenHoles) ? distanceBetweenHoles : ''} onChange={e => setDistanceBetweenHoles(parseInput(e.target.value))} /></label>
            <label>Hole radius ({lengthUnit})<input type="number" step="any" value={Number.isFinite(radius) ? radius : ''} onChange={e => setRadius(parseInput(e.target.value))} /></label>
            <label>Beam width ({lengthUnit})<input type="number" step="any" value={Number.isFinite(beamWidth) ? beamWidth : ''} onChange={e => setBeamWidth(parseInput(e.target.value))} /></label>
            <label>Beam height ({lengthUnit})<input type="number" step="any" value={Number.isFinite(beamHeight) ? beamHeight : ''} onChange={e => setBeamHeight(parseInput(e.target.value))} /></label>
            <label>Min. thickness ({lengthUnit})<input type="number" step="any" value={Number.isFinite(minimumThickness) ? minimumThickness : ''} onChange={e => setMinimumThickness(parseInput(e.target.value))} /></label>
            <label>Gage length ({lengthUnit})<input type="number" step="any" value={Number.isFinite(gageLength) ? gageLength : ''} onChange={e => setGageLength(parseInput(e.target.value))} /></label>
            <label>Gage factor<input type="number" step="any" value={Number.isFinite(gageFactor) ? gageFactor : ''} onChange={e => setGageFactor(parseInput(e.target.value))} /></label>
          </div>
          {result.error && <p className="workspace-note">{result.error}</p>}
        </>
      )}

      {mode === 'analytical' && (
        <>
          <SectionToggle label="Results" open={showResults} onToggle={() => setShowResults(v => !v)} />
          {showResults && (
            <table className="bino-table">
              <tbody>
                <tr><th colSpan={3}>Calculated Values</th></tr>
                <tr><td>Nominal Gage Strain:</td><td>{show(result.avgStrain, 1)}</td><td>µε</td></tr>
                <tr><td>Min / Max Strain:</td><td>{show(result.minStrain, 1)} / {show(result.maxStrain, 1)}</td><td>µε</td></tr>
                <tr><td>Strain Variation:</td><td>{show(result.gradient, 2)}</td><td>%</td></tr>
                <tr><td>Span at Applied Force:</td><td>{show(result.fullSpanSensitivity, 4)}</td><td>mV/V</td></tr>
                <tr><td>Z-Offset:</td><td>{show(result.zOffset, 4)}</td><td>{lengthUnit}</td></tr>
                <tr><td>Gage Centerline:</td><td>{show(result.gageCenterline, 4)}</td><td>{lengthUnit}</td></tr>
              </tbody>
            </table>
          )}

          <SectionToggle label="2D Diagram" open={show2D} onToggle={() => setShow2D(v => !v)} />
          {show2D && (
            <div className="calc-diagram-2d" style={{ background: '#f8fafc', padding: 12, borderRadius: 8 }}>
              <BinocularSketch2D params={viewerParams} us={unitSystem === 'US'} />
            </div>
          )}
        </>
      )}

      <SectionToggle label="3D View" open={show3D} onToggle={() => setShow3D(v => !v)} />
      {show3D && (
        <div className="calc-model-3d">
          {mode === 'analytical' && (
            <BinocularModelPreview params={viewerParams} us={unitSystem === 'US'} materialId={materialId} />
          )}
          {mode === '3d-fea' && (
            <BinocularFea3DCalc
              loadN={unitSystem === 'SI' ? appliedForce : appliedForce * N_PER_LBF}
              beamHeightMm={unitSystem === 'SI' ? beamHeight : beamHeight * MM_PER_IN}
              beamDepthMm={unitSystem === 'SI' ? beamWidth : beamWidth * MM_PER_IN}
              holeRadiusMm={unitSystem === 'SI' ? radius : radius * MM_PER_IN}
              holeSpacingMm={unitSystem === 'SI' ? distanceBetweenHoles : distanceBetweenHoles * MM_PER_IN}
              minThicknessMm={unitSystem === 'SI' ? minimumThickness : minimumThickness * MM_PER_IN}
              modulusGPa={unitSystem === 'SI' ? modulus : modulus * GPA_PER_MPSI}
              nu={poisson}
            />
          )}
        </div>
      )}
    </div>
  )
}
