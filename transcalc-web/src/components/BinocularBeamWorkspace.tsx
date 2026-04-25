import { useEffect, useMemo, useRef, useState } from 'react'
import { calculateBinobeamStrainExplicit } from '../domain/binobeam'
import { solveBinobeamFea, type BinobeamFeaResult } from '../domain/fea/binobeamSolver'
import BinobeamFeaViewer, { type BinobeamFeaViewMode } from './BinobeamFeaViewer'
import { BinocularModelPreview } from './BinocularModelPreview'
import { BinocularSketch2D } from './BinocularSketch2D'

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
const BINOBEAM_FEA_MESH = {
  elementsAlongLength: 16,
  elementsAlongHeight: 10,
} as const

function SectionToggle({ label, open, onToggle }: { label: string; open: boolean; onToggle: () => void }) {
  return (
    <button
      onClick={onToggle}
      style={{
        display: 'flex', alignItems: 'center', gap: 6,
        background: 'none', border: 'none', padding: '6px 2px 2px',
        cursor: 'pointer', width: '100%', textAlign: 'left',
        color: 'var(--accent)', fontSize: '0.85rem', fontWeight: 600,
        textTransform: 'uppercase', letterSpacing: '0.05em',
        fontFamily: 'inherit',
      }}
      aria-expanded={open}
    >
      <span style={{ fontSize: 10, display: 'inline-block', width: 10, transition: 'transform 0.15s', transform: open ? 'rotate(0deg)' : 'rotate(-90deg)' }}>▼</span>
      {label}
    </button>
  )
}

type BinocularBeamWorkspaceProps = {
  unitSystem: UnitSystem
  onUnitChange: (next: UnitSystem) => void
  onHelpTokensChange?: (tokens: Record<string, string>) => void
}

export default function BinocularBeamWorkspace({ unitSystem, onUnitChange, onHelpTokensChange }: BinocularBeamWorkspaceProps) {
  const [analysisPath, setAnalysisPath] = useState<'closed-form' | 'fea'>('closed-form')
  const [viewMode, setViewMode] = useState<BinobeamFeaViewMode>('contour')
  const [showFeaNodes, setShowFeaNodes] = useState(false)
  const [showFeaEdges, setShowFeaEdges] = useState(true)
  const [appliedForce, setAppliedForce] = useState(unitSystem === 'US' ? 100 : 500)
  const [distanceBetweenHoles, setDistanceBetweenHoles] = useState(unitSystem === 'US' ? 2.5 : 60)
  const [radius, setRadius] = useState(unitSystem === 'US' ? 0.5 : 12)
  const [beamWidth, setBeamWidth] = useState(unitSystem === 'US' ? 1.0 : 25)
  const [beamHeight, setBeamHeight] = useState(unitSystem === 'US' ? 2.0 : 50)
  const [minimumThickness, setMinimumThickness] = useState(unitSystem === 'US' ? 0.15 : 4)
  const [modulus, setModulus] = useState(unitSystem === 'US' ? 10.6 : 73.1)
  const [gageLength, setGageLength] = useState(unitSystem === 'US' ? 0.25 : 6)
  const [gageFactor, setGageFactor] = useState(2.1)
  const [poisson, setPoisson] = useState(0.33)
  const [feaState, setFeaState] = useState<{
    result: BinobeamFeaResult | null
    error: string
    isSolving: boolean
  }>({ result: null, error: '', isSolving: false })

  const [show2D, setShow2D] = useState(true)
  const [show3D, setShow3D] = useState(true)
  const [showInputs, setShowInputs] = useState(true)
  const [showResults, setShowResults] = useState(true)
  const [showFea, setShowFea] = useState(true)

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
    if (analysisPath !== 'fea') return
    setFeaState((prev) => ({ ...prev, isSolving: true, error: '' }))
    const timer = window.setTimeout(() => {
      try {
        const solved = solveBinobeamFea(
          {
            unitSystem,
            appliedForce,
            distanceBetweenGageCls: distanceBetweenHoles,
            radius,
            beamWidth,
            beamHeight,
            minimumThickness,
            modulus,
            gageLength,
            gageFactor,
          },
          BINOBEAM_FEA_MESH
        )
        setFeaState({ result: solved, error: '', isSolving: false })
      } catch (err) {
        setFeaState({
          result: null,
          error: err instanceof Error ? err.message : 'Unable to solve binocular FEA for current inputs.',
          isSolving: false,
        })
      }
    }, 180)
    return () => window.clearTimeout(timer)
  }, [analysisPath, unitSystem, appliedForce, distanceBetweenHoles, radius, beamWidth, beamHeight, minimumThickness, modulus, gageLength, gageFactor])

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
      <div className="workspace-controls">
        <div className="analysis-toggle">
          <button className={analysisPath === 'closed-form' ? 'active' : ''} onClick={() => setAnalysisPath('closed-form')}>Closed-form</button>
          <button className={analysisPath === 'fea' ? 'active' : ''} onClick={() => setAnalysisPath('fea')}>FEA</button>
        </div>
        <div className="analysis-toggle">
          <button className={unitSystem === 'SI' ? 'active' : ''} onClick={() => onUnitChange('SI')}>SI</button>
          <button className={unitSystem === 'US' ? 'active' : ''} onClick={() => onUnitChange('US')}>US</button>
        </div>
      </div>

      <SectionToggle label="2D Diagram" open={show2D} onToggle={() => setShow2D(v => !v)} />
      {show2D && (
        <div className="calc-diagram-2d" style={{ background: '#f8fafc', padding: 12, borderRadius: 8 }}>
          <BinocularSketch2D params={viewerParams} us={unitSystem === 'US'} />
        </div>
      )}

      <SectionToggle label="3D Model" open={show3D} onToggle={() => setShow3D(v => !v)} />
      {show3D && (
        <div className="calc-model-3d">
          <BinocularModelPreview params={viewerParams} us={unitSystem === 'US'} />
        </div>
      )}

      <SectionToggle label="Inputs" open={showInputs} onToggle={() => setShowInputs(v => !v)} />
      {showInputs && (
        <>
          <div className="bino-grid">
            <label>Applied force ({forceUnit})<input type="number" step="any" value={Number.isFinite(appliedForce) ? appliedForce : ''} onChange={e => setAppliedForce(parseInput(e.target.value))} /></label>
            <label>Hole spacing ({lengthUnit})<input type="number" step="any" value={Number.isFinite(distanceBetweenHoles) ? distanceBetweenHoles : ''} onChange={e => setDistanceBetweenHoles(parseInput(e.target.value))} /></label>
            <label>Hole radius ({lengthUnit})<input type="number" step="any" value={Number.isFinite(radius) ? radius : ''} onChange={e => setRadius(parseInput(e.target.value))} /></label>
            <label>Beam width ({lengthUnit})<input type="number" step="any" value={Number.isFinite(beamWidth) ? beamWidth : ''} onChange={e => setBeamWidth(parseInput(e.target.value))} /></label>
            <label>Beam height ({lengthUnit})<input type="number" step="any" value={Number.isFinite(beamHeight) ? beamHeight : ''} onChange={e => setBeamHeight(parseInput(e.target.value))} /></label>
            <label>Min. thickness ({lengthUnit})<input type="number" step="any" value={Number.isFinite(minimumThickness) ? minimumThickness : ''} onChange={e => setMinimumThickness(parseInput(e.target.value))} /></label>
            <label>Modulus ({modulusUnit})<input type="number" step="any" value={Number.isFinite(modulus) ? modulus : ''} onChange={e => setModulus(parseInput(e.target.value))} /></label>
            <label>Gage length ({lengthUnit})<input type="number" step="any" value={Number.isFinite(gageLength) ? gageLength : ''} onChange={e => setGageLength(parseInput(e.target.value))} /></label>
            <label>Gage factor<input type="number" step="any" value={Number.isFinite(gageFactor) ? gageFactor : ''} onChange={e => setGageFactor(parseInput(e.target.value))} /></label>
            <label>Poisson&apos;s ratio<input type="number" step="0.01" value={Number.isFinite(poisson) ? poisson : ''} onChange={e => setPoisson(parseInput(e.target.value))} /></label>
          </div>
          {result.error && <p className="workspace-note">{result.error}</p>}
        </>
      )}

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
            {analysisPath === 'fea' && feaState.result && (
              <>
                <tr><th colSpan={3}>FEA Results</th></tr>
                <tr><td>FEA Nominal Strain:</td><td>{show(feaState.result.gaugeNominalStrainMicrostrain, 1)}</td><td>µε</td></tr>
                <tr><td>FEA Variation:</td><td>{show(feaState.result.gaugeVariationPercent, 2)}</td><td>%</td></tr>
                <tr><td>FEA Span:</td><td>{show(feaState.result.spanMvV, 4)}</td><td>mV/V</td></tr>
                <tr><td>Nodes / Elements:</td><td>{feaState.result.nodes} / {feaState.result.elements}</td><td></td></tr>
              </>
            )}
          </tbody>
        </table>
      )}

      {analysisPath === 'fea' && (
        <>
          <SectionToggle label="FEA Viewer" open={showFea} onToggle={() => setShowFea(v => !v)} />
          {showFea && (
            <div className="fea-analysis-section">
              <div className="analysis-toggle" style={{ marginBottom: 8 }}>
                {(['contour', 'mesh', 'deformed', 'boundary'] as const).map((m) => (
                  <button key={m} className={viewMode === m ? 'active' : ''} onClick={() => setViewMode(m)}>{m}</button>
                ))}
                <label style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, fontWeight: 500, cursor: 'pointer', marginLeft: 8 }}>
                  <input type="checkbox" checked={showFeaEdges} onChange={e => setShowFeaEdges(e.target.checked)} />
                  Edges
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, fontWeight: 500, cursor: 'pointer' }}>
                  <input type="checkbox" checked={showFeaNodes} onChange={e => setShowFeaNodes(e.target.checked)} />
                  Nodes
                </label>
              </div>
              {feaState.result ? (
                <div style={{ padding: 4 }}>
                  <BinobeamFeaViewer
                    result={feaState.result}
                    widthMeters={unitSystem === 'US' ? beamWidth * 0.0254 : beamWidth * 0.001}
                    unitSystem={unitSystem}
                    distanceBetweenGageCls={distanceBetweenHoles}
                    radius={radius}
                    beamHeight={beamHeight}
                    minimumThickness={minimumThickness}
                    beamWidth={beamWidth}
                    viewMode={viewMode}
                    showNodes={showFeaNodes}
                    showEdges={showFeaEdges}
                  />
                  {feaState.result.warnings.length > 0 && (
                    <div style={{ marginTop: 8 }}>
                      {feaState.result.warnings.map((w, i) => (
                        <p key={i} className="fea-note">{w}</p>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                <p className="fea-note">
                  {feaState.isSolving ? 'Solving binocular FEA…' : feaState.error || 'Enter valid inputs to compute FEA.'}
                </p>
              )}
            </div>
          )}
        </>
      )}
    </div>
  )
}
