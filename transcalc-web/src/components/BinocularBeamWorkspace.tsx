import { useEffect, useMemo, useRef, useState } from 'react'
import { calculateBinobeamStrainExplicit } from '../domain/binobeam'
import { solveBinobeamFea, type BinobeamFeaResult } from '../domain/fea/binobeamSolver'
import BinobeamFeaViewer from './BinobeamFeaViewer'

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

type BinocularBeamWorkspaceProps = {
  unitSystem: UnitSystem
  onUnitChange: (next: UnitSystem) => void
  onHelpTokensChange?: (tokens: Record<string, string>) => void
}

export default function BinocularBeamWorkspace({ unitSystem, onUnitChange, onHelpTokensChange }: BinocularBeamWorkspaceProps) {
  const [analysisPath, setAnalysisPath] = useState<'closed-form' | 'fea'>('closed-form')
  const [appliedForce, setAppliedForce] = useState(22.4809)
  const [distanceBetweenGageCls, setDistanceBetweenGageCls] = useState(3.937)
  const [radius, setRadius] = useState(0.1969)
  const [beamWidth, setBeamWidth] = useState(0.9843)
  const [beamHeight, setBeamHeight] = useState(0.5512)
  const [minimumThickness, setMinimumThickness] = useState(0.0787)
  const [modulus, setModulus] = useState(29.0075)
  const [gageLength, setGageLength] = useState(0.1969)
  const [gageFactor, setGageFactor] = useState(2.1)
  const [feaState, setFeaState] = useState<{
    result: BinobeamFeaResult | null
    error: string
    isSolving: boolean
  }>({
    result: null,
    error: '',
    isSolving: false,
  })

  const distanceLoadHole = 0

  const forceUnit = unitSystem === 'US' ? 'lbf' : 'N'
  const lengthUnit = unitSystem === 'US' ? 'in' : 'mm'
  const modulusUnit = unitSystem === 'US' ? 'Mpsi' : 'GPa'

  const prevUnit = useRef<UnitSystem>(unitSystem)
  useEffect(() => {
    if (prevUnit.current === unitSystem) return
    prevUnit.current = unitSystem
    if (unitSystem === 'SI') {
      setAppliedForce((v) => round(v * N_PER_LBF))
      setDistanceBetweenGageCls((v) => round(v * MM_PER_IN))
      setRadius((v) => round(v * MM_PER_IN))
      setBeamWidth((v) => round(v * MM_PER_IN))
      setBeamHeight((v) => round(v * MM_PER_IN))
      setMinimumThickness((v) => round(v * MM_PER_IN))
      setModulus((v) => round(v * GPA_PER_MPSI))
      setGageLength((v) => round(v * MM_PER_IN))
    } else {
      setAppliedForce((v) => round(v / N_PER_LBF))
      setDistanceBetweenGageCls((v) => round(v / MM_PER_IN))
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
      [distanceBetweenGageCls, 'Distance between Gage CLs'],
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
        avgStrain: Number.NaN,
        gradient: Number.NaN,
        fullSpanSensitivity: Number.NaN,
        zOffset: Number.NaN,
        gageCenterline: Number.NaN,
      }
    }

    try {
      const solved = calculateBinobeamStrainExplicit(
        {
          appliedLoad: appliedForce,
          distanceBetweenHoles: distanceBetweenGageCls,
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
      return {
        error: '',
        ...solved,
        gageCenterline: distanceBetweenGageCls + zUnits * 2,
      }
    } catch (err) {
      return {
        error: err instanceof Error ? err.message : 'Unable to solve binocular beam.',
        avgStrain: Number.NaN,
        gradient: Number.NaN,
        fullSpanSensitivity: Number.NaN,
        zOffset: Number.NaN,
        gageCenterline: Number.NaN,
      }
    }
  }, [appliedForce, distanceBetweenGageCls, radius, beamWidth, beamHeight, minimumThickness, modulus, gageLength, gageFactor, distanceLoadHole, unitSystem])

  useEffect(() => {
    if (analysisPath !== 'fea') return
    setFeaState((prev) => ({ ...prev, isSolving: true, error: '' }))
    const timer = window.setTimeout(() => {
      try {
        const solved = solveBinobeamFea(
          {
            unitSystem,
            appliedForce,
            distanceBetweenGageCls,
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
        setFeaState({
          result: solved,
          error: '',
          isSolving: false,
        })
      } catch (err) {
        setFeaState({
          result: null,
          error: err instanceof Error ? err.message : 'Unable to solve binocular FEA for current inputs.',
          isSolving: false,
        })
      }
    }, 180)
    return () => window.clearTimeout(timer)
  }, [analysisPath, unitSystem, appliedForce, distanceBetweenGageCls, radius, beamWidth, beamHeight, minimumThickness, modulus, gageLength, gageFactor])

  useEffect(() => {
    if (!onHelpTokensChange) return
    onHelpTokensChange({
      af1: Number.isFinite(appliedForce) ? appliedForce.toString() : '—',
      af2: forceUnit,
      cl1: Number.isFinite(distanceBetweenGageCls) ? distanceBetweenGageCls.toString() : '—',
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
    onHelpTokensChange,
    appliedForce,
    distanceBetweenGageCls,
    radius,
    beamWidth,
    beamHeight,
    minimumThickness,
    modulus,
    gageLength,
    gageFactor,
    forceUnit,
    lengthUnit,
    modulusUnit,
    result.gageCenterline,
    result.avgStrain,
    result.gradient,
    result.fullSpanSensitivity,
  ])

  return (
    <div className="bino-wrap">
      <div className="workspace-controls">
        <div className="analysis-toggle">
          <button className={analysisPath === 'closed-form' ? 'active' : ''} onClick={() => setAnalysisPath('closed-form')}>
            Closed-form
          </button>
          <button className={analysisPath === 'fea' ? 'active' : ''} onClick={() => setAnalysisPath('fea')}>
            FEA (Next)
          </button>
        </div>
        <div className="analysis-toggle">
          <button className={unitSystem === 'SI' ? 'active' : ''} onClick={() => onUnitChange('SI')}>SI</button>
          <button className={unitSystem === 'US' ? 'active' : ''} onClick={() => onUnitChange('US')}>US</button>
        </div>
      </div>

      <div className="bino-illustration">
        <img src="/legacy-help/bino.jpg" alt="Binocular beam geometry" />
      </div>

      <div className="bino-grid">
        <label>
          Applied Force, F ({forceUnit})
          <input type="number" value={Number.isFinite(appliedForce) ? appliedForce : ''} onChange={(e) => setAppliedForce(parseInput(e.target.value))} />
        </label>
        <label>
          Distance between Gage CL&apos;s, L ({lengthUnit})
          <input type="number" value={Number.isFinite(distanceBetweenGageCls) ? distanceBetweenGageCls : ''} onChange={(e) => setDistanceBetweenGageCls(parseInput(e.target.value))} />
        </label>
        <label>
          Radius, r ({lengthUnit})
          <input type="number" value={Number.isFinite(radius) ? radius : ''} onChange={(e) => setRadius(parseInput(e.target.value))} />
        </label>
        <label>
          Beam Width, w ({lengthUnit})
          <input type="number" value={Number.isFinite(beamWidth) ? beamWidth : ''} onChange={(e) => setBeamWidth(parseInput(e.target.value))} />
        </label>
        <label>
          Beam Height, h ({lengthUnit})
          <input type="number" value={Number.isFinite(beamHeight) ? beamHeight : ''} onChange={(e) => setBeamHeight(parseInput(e.target.value))} />
        </label>
        <label>
          Minimum Thickness, t ({lengthUnit})
          <input type="number" value={Number.isFinite(minimumThickness) ? minimumThickness : ''} onChange={(e) => setMinimumThickness(parseInput(e.target.value))} />
        </label>
        <label>
          Modulus of Elasticity ({modulusUnit})
          <input type="number" value={Number.isFinite(modulus) ? modulus : ''} onChange={(e) => setModulus(parseInput(e.target.value))} />
        </label>
        <label>
          Gage Length ({lengthUnit})
          <input type="number" value={Number.isFinite(gageLength) ? gageLength : ''} onChange={(e) => setGageLength(parseInput(e.target.value))} />
        </label>
        <label>
          Gage Factor
          <input type="number" value={Number.isFinite(gageFactor) ? gageFactor : ''} onChange={(e) => setGageFactor(parseInput(e.target.value))} />
        </label>
      </div>

      <table className="bino-table">
        <tbody>
          <tr><th colSpan={3}>Calculated Values</th></tr>
          <tr><td>Gage Centerlines, Z:</td><td>{show(result.gageCenterline, 4)}</td><td>{lengthUnit}</td></tr>
          <tr><td>Nominal Gage Strain:</td><td>{show(result.avgStrain, 1)}</td><td>µε</td></tr>
          <tr><td>Strain Variation:</td><td>{show(result.gradient, 2)}</td><td>%</td></tr>
          <tr><td>Span at Applied Force:</td><td>{show(result.fullSpanSensitivity, 4)}</td><td>mV/V</td></tr>
        </tbody>
      </table>

      {analysisPath === 'fea' && (
        <div className="bino-fea">
          <h3>Binocular FEA (Initial Model)</h3>
          {feaState?.result ? (
            <>
              {feaState.isSolving && <p className="workspace-note">Recalculating FEA...</p>}
              <div className="result-grid">
                <div className="result-card">
                  <span>Nominal Gage Strain</span>
                  <strong>{show(feaState.result.gaugeNominalStrainMicrostrain, 1)} µε</strong>
                </div>
                <div className="result-card">
                  <span>Strain Variation</span>
                  <strong>{show(feaState.result.gaugeVariationPercent, 2)} %</strong>
                </div>
                <div className="result-card">
                  <span>Span at Applied Force</span>
                  <strong>{show(feaState.result.spanMvV, 4)} mV/V</strong>
                </div>
                <div className="result-card">
                  <span>Mesh</span>
                  <strong>{feaState.result.nodes} n / {feaState.result.elements} e</strong>
                </div>
              </div>
              <BinobeamFeaViewer
                result={feaState.result}
                widthMeters={unitSystem === 'US' ? beamWidth * 0.0254 : beamWidth * 0.001}
                unitSystem={unitSystem}
                distanceBetweenGageCls={distanceBetweenGageCls}
                radius={radius}
                beamHeight={beamHeight}
                minimumThickness={minimumThickness}
                beamWidth={beamWidth}
              />
            </>
          ) : (
            <div className="step-viewer loading">
              {feaState.isSolving ? 'Recalculating FEA...' : (feaState?.error || 'Unable to solve binocular FEA for current inputs.')}
            </div>
          )}
        </div>
      )}
      {analysisPath === 'closed-form' && result.error && <p className="workspace-note">{result.error}</p>}
    </div>
  )
}
