import { useMemo, useState } from 'react'
import { designJTS, type JTSParams } from '../../domain/jointTorqueSensor'
import { DEFAULT_MATERIAL_ID, getMaterial } from '../../domain/materials'
import MaterialSelector from '../MaterialSelector'
import JTSSketch2D from '../diagrams/JTSSketch2D'
import JTSModelPreview from '../JTSModelPreview'
import SectionToggle from '../SectionToggle'
import WorkspaceControls from '../WorkspaceControls'

type UnitSystem = 'SI' | 'US'

const N_PER_LBF    = 4.4482216152605
const MM_PER_IN    = 25.4
const GPA_PER_MPSI = 6.8947572932
const NM_PER_INLB  = 0.112984829
const MPA_PER_KSI  = 6.8947572932

const show = (v: number | undefined, d: number) =>
  v != null && Number.isFinite(v) && v > 0 ? v.toFixed(d) : '—'

interface Props {
  unitSystem: UnitSystem
  onUnitChange: (next: UnitSystem) => void
}

export default function JointTorqueCalc({ unitSystem, onUnitChange }: Props) {
  const us = unitSystem === 'US'

  // All state stored in display units
  const [outerRadius,   setOuterRadius]   = useState(us ? 2.36 : 60)    // mm or in
  const [innerRadius,   setInnerRadius]   = useState(us ? 0.98 : 25)    // mm or in
  const [spokeWidth,    setSpokeWidth]    = useState(us ? 0.31 : 8)     // mm or in
  const [spokeThick,    setSpokeThick]    = useState(us ? 0.12 : 3)     // mm or in
  const [spokeCount,    setSpokeCount]    = useState(4)
  const [torque,        setTorque]        = useState(us ? 7.08 : 50)    // N·m or in·lbf
  const [modulus,       setModulus]       = useState(() => us ? getMaterial(DEFAULT_MATERIAL_ID).eGPa / GPA_PER_MPSI : getMaterial(DEFAULT_MATERIAL_ID).eGPa)     // Mpsi or GPa
  const [poisson,       setPoisson]       = useState(() => getMaterial(DEFAULT_MATERIAL_ID).nu)
  const [materialId,    setMaterialId]    = useState(DEFAULT_MATERIAL_ID)
  const [gageFactor,    setGageFactor]    = useState(2.0)
  const [yieldStr,      setYieldStr]      = useState(us ? 72.5 : 500)   // ksi or MPa
  const [showYield,     setShowYield]     = useState(false)

  const [mode, setMode] = useState<'analytical' | '3d-fea'>('analytical')
  const [showSketch,  setShowSketch]  = useState(false)
  const [show3D,      setShow3D]      = useState(false)
  const [showInputs,  setShowInputs]  = useState(true)
  const [showResults, setShowResults] = useState(true)

  const lenUnit    = us ? 'in' : 'mm'
  const torqueUnit = us ? 'in·lbf' : 'N·m'
  const modUnit    = us ? 'Mpsi' : 'GPa'
  const stressUnit = us ? 'ksi' : 'MPa'

  const params = useMemo((): JTSParams => {
    const toMm  = (v: number) => us ? v * MM_PER_IN : v
    const toNm  = (v: number) => us ? v * NM_PER_INLB : v
    const toPa  = (v: number) => us ? v * GPA_PER_MPSI * 1e9 : v * 1e9
    const toMPa = (v: number) => us ? v * MPA_PER_KSI : v
    return {
      outerRadiusMm:    toMm(outerRadius),
      innerRadiusMm:    toMm(innerRadius),
      spokeWidthMm:     toMm(spokeWidth),
      spokeThicknessMm: toMm(spokeThick),
      spokeCount,
      ratedTorqueNm:    toNm(torque),
      youngsModulusPa:  toPa(modulus),
      poissonRatio:     poisson,
      gageFactor,
      yieldStrengthPa:  showYield ? toMPa(yieldStr) * 1e6 : undefined,
      densityKgM3:      7850,
    }
  }, [us, outerRadius, innerRadius, spokeWidth, spokeThick, spokeCount, torque, modulus, poisson, gageFactor, yieldStr, showYield])

  const result = useMemo(() => designJTS(params), [params])

  const stiffDisplay = us
    ? result.stiffnessNmPerRad * (1 / NM_PER_INLB)      // in·lbf/rad
    : result.stiffnessNmPerRad
  const stiffUnit = us ? 'in·lbf/rad' : 'N·m/rad'

  const sfColor = (sf: number) =>
    sf > 2 ? '#166534' : sf > 1 ? '#92400e' : '#991b1b'

  return (
    <div className="bino-wrap">

      {/* Controls */}
      <WorkspaceControls mode={mode} onModeChange={setMode} unitSystem={unitSystem} onUnitChange={onUnitChange} />

      {/* Inputs */}
      <SectionToggle label="Inputs" open={showInputs} onToggle={() => setShowInputs(v => !v)} />
      {showInputs && (
        <>
          <div className="bino-grid">
            <MaterialSelector
              materialId={materialId}
              unitSystem={unitSystem}
              onSelect={sel => { setMaterialId(sel.id); setModulus(sel.eGPaDisplay); setPoisson(sel.nu) }}
            />
            <label>Outer Radius ({lenUnit})
              <input type="number" value={outerRadius} step={us ? 0.05 : 1} min={0.1}
                onChange={e => setOuterRadius(Number(e.target.value))} />
            </label>
            <label>Inner Hub Radius ({lenUnit})
              <input type="number" value={innerRadius} step={us ? 0.05 : 0.5} min={0.1}
                onChange={e => setInnerRadius(Number(e.target.value))} />
            </label>
            <label>Spoke Width ({lenUnit})
              <input type="number" value={spokeWidth} step={us ? 0.02 : 0.5} min={0.01}
                onChange={e => setSpokeWidth(Number(e.target.value))} />
            </label>
            <label>Spoke Thickness ({lenUnit})
              <input type="number" value={spokeThick} step={us ? 0.01 : 0.1} min={0.01}
                onChange={e => setSpokeThick(Number(e.target.value))} />
            </label>
            <label>Number of Spokes
              <input type="number" value={spokeCount} step={2} min={2} max={16}
                onChange={e => setSpokeCount(Math.round(Number(e.target.value)))} />
            </label>
            <label>Rated Torque ({torqueUnit})
              <input type="number" value={torque} step={us ? 0.5 : 1} min={0.001}
                onChange={e => setTorque(Number(e.target.value))} />
            </label>
            <label>Gage Factor
              <input type="number" value={gageFactor} step={0.1} min={0.5} max={5}
                onChange={e => setGageFactor(Number(e.target.value))} />
            </label>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 8, margin: '6px 0 2px' }}>
            <input type="checkbox" id="jts-yield" checked={showYield} onChange={e => setShowYield(e.target.checked)} />
            <label htmlFor="jts-yield" style={{ display: 'inline', fontWeight: 400, fontSize: '0.88rem', color: 'var(--ink-soft)' }}>
              Include yield strength for safety factor
            </label>
          </div>
          {showYield && (
            <div className="bino-grid" style={{ marginTop: 4 }}>
              <label>Yield Strength ({stressUnit})
                <input type="number" value={yieldStr} step={us ? 5 : 10} min={1}
                  onChange={e => setYieldStr(Number(e.target.value))} />
              </label>
            </div>
          )}

          {result.warnings.map((w, i) => (
            <p key={i} className="workspace-note" style={{ color: '#8b5e00' }}>{w}</p>
          ))}
          {!result.isValid && (
            <p className="workspace-note" style={{ color: '#a03020' }}>{result.error}</p>
          )}
        </>
      )}

      {/* Results */}
      {mode === 'analytical' && <SectionToggle label="Results" open={showResults} onToggle={() => setShowResults(v => !v)} />}
      {mode === 'analytical' && showResults && (
        <table className="bino-table">
          <tbody>
            <tr><th colSpan={3}>Structural Performance</th></tr>
            <tr>
              <td>Torsional Stiffness</td>
              <td>{show(stiffDisplay, 1)}</td>
              <td>{stiffUnit}</td>
            </tr>
            <tr>
              <td>Angular Deflection at Rated Torque</td>
              <td>{show(result.deflectionAtRatedMrad, 3)}</td>
              <td>mrad</td>
            </tr>
            <tr>
              <td>Natural Frequency (torsional)</td>
              <td>{show(result.naturalFrequencyHz, 0)}</td>
              <td>Hz</td>
            </tr>
            <tr>
              <td>Spoke Length</td>
              <td>{show(result.geo.spokeLengthMm / (us ? MM_PER_IN : 1), 2)}</td>
              <td>{lenUnit}</td>
            </tr>

            <tr><th colSpan={3}>Strain & Sensitivity</th></tr>
            <tr>
              <td>Peak Strain at Spoke Root</td>
              <td>{show(result.peakStrainMicrostrain, 0)}</td>
              <td>µε</td>
            </tr>
            <tr>
              <td>Full-Bridge Span at Rated Torque</td>
              <td>{show(result.spanMvV, 4)}</td>
              <td>mV/V</td>
            </tr>
            <tr>
              <td>Sensitivity</td>
              <td>{show(result.sensitivityMvVPerNm * (us ? NM_PER_INLB : 1), 5)}</td>
              <td>mV/V / {torqueUnit}</td>
            </tr>

            <tr><th colSpan={3}>Safety</th></tr>
            <tr>
              <td>Peak Bending Stress</td>
              <td>{show(result.peakStressMPa / (us ? MPA_PER_KSI : 1), 2)}</td>
              <td>{stressUnit}</td>
            </tr>
            <tr>
              <td>Strain Safety Factor</td>
              <td style={{ color: sfColor(result.strainSafetyFactor), fontWeight: 600 }}>
                {show(result.strainSafetyFactor, 2)}
              </td>
              <td>1500 µε limit</td>
            </tr>
            {result.yieldSafetyFactor != null && (
              <tr>
                <td>Yield Safety Factor</td>
                <td style={{ color: sfColor(result.yieldSafetyFactor), fontWeight: 600 }}>
                  {show(result.yieldSafetyFactor, 2)}
                </td>
                <td>vs rated torque</td>
              </tr>
            )}
          </tbody>
        </table>
      )}

      {/* 2D Sketch */}
      {mode === 'analytical' && <SectionToggle label="Diagrams" open={showSketch} onToggle={() => setShowSketch(v => !v)} />}
      {mode === 'analytical' && showSketch && (
        <div className="calc-diagram-2d" style={{ display: 'flex', justifyContent: 'center' }}>
          {result.isValid ? (
            <JTSSketch2D
              outerRadiusMm={params.outerRadiusMm}
              innerRadiusMm={params.innerRadiusMm}
              spokeWidthMm={params.spokeWidthMm}
              spokeCount={params.spokeCount}
              width={300}
              height={300}
            />
          ) : (
            <p className="workspace-note" style={{ color: '#a03020' }}>{result.error}</p>
          )}
        </div>
      )}

      {/* 3D View */}
      <SectionToggle label="3D View" open={show3D} onToggle={() => setShow3D(v => !v)} />
      {show3D && (
        <div className="calc-model-3d">
          {mode === 'analytical' && (
            <JTSModelPreview
              outerRadiusMm={params.outerRadiusMm}
              innerRadiusMm={params.innerRadiusMm}
              spokeWidthMm={params.spokeWidthMm}
              spokeThicknessMm={params.spokeThicknessMm}
              spokeCount={params.spokeCount}
              us={us}
            />
          )}
          {mode === '3d-fea' && <p className="workspace-note" style={{ padding: '1.5rem', textAlign: 'center' }}>3D FEA is not yet available for this calculator type.</p>}
        </div>
      )}
    </div>
  )
}
