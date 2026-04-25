import { Suspense, lazy, useEffect, useMemo, useRef, useState } from 'react'
import { calculateRoundShearSpan } from '../../domain/shearBeams'
import { solveShearWebFea } from '../../domain/fea/shearWebSolver'
import RoundShearModelPreview from '../RoundShearModelPreview'
import RoundShearDiagram from '../diagrams/RoundShearDiagram'
import WheatstoneBridgeDiagram from '../diagrams/WheatstoneBridgeDiagram'
import type { CstFeaViewMode } from '../CstFeaViewer'

const CstFeaViewer = lazy(() => import('../CstFeaViewer'))

type UnitSystem = 'SI' | 'US'
type AnalysisMode = 'closed-form' | 'fea'

const N_PER_LBF = 4.4482216152605
const MM_PER_IN = 25.4
const GPA_PER_MPSI = 6.8947572932

const round = (v: number, d = 4): number => Math.round(v * Math.pow(10, d)) / Math.pow(10, d)
const show = (v: number, d: number): string => (Number.isFinite(v) ? v.toFixed(d) : '—')

type Props = { unitSystem: UnitSystem; onUnitChange: (next: UnitSystem) => void }

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

export default function RoundShearCalc({ unitSystem, onUnitChange }: Props) {
  const [load, setLoad] = useState(1000)
  const [width, setWidth] = useState(20)
  const [height, setHeight] = useState(30)
  const [diameter, setDiameter] = useState(20)
  const [thickness, setThickness] = useState(3)
  const [modulusGPa, setModulusGPa] = useState(200)
  const [poisson, setPoisson] = useState(0.3)
  const [gageFactor, setGageFactor] = useState(2.1)
  const [analysisMode, setAnalysisMode] = useState<AnalysisMode>('closed-form')
  const [viewMode, setViewMode] = useState<CstFeaViewMode>('contour')
  const [bendingNull, setBendingNull] = useState(false)
  const [show2D, setShow2D] = useState(true)
  const [show3D, setShow3D] = useState(true)
  const [showInputs, setShowInputs] = useState(true)
  const [showResults, setShowResults] = useState(true)
  const [showFea, setShowFea] = useState(true)

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
      const span = calculateRoundShearSpan({ load: loadN, width: w, height: h, diameter: d, thickness: t, modulus: modPa, poisson, gageFactor })
      return { error: '', span }
    } catch (e) { return { error: e instanceof Error ? e.message : 'Calculation error', span: NaN } }
  }, [unitSystem, load, width, height, diameter, thickness, modulusGPa, poisson, gageFactor])

  const feaSolution = useMemo(() => {
    if (analysisMode !== 'fea') return null
    const { loadN, widthMm, heightMm, diameterMm, thicknessMm, modulusGPa: modGPa } = siInputs
    if ([loadN, widthMm, heightMm, diameterMm, thicknessMm, modGPa].some(v => !Number.isFinite(v) || v <= 0)) return null
    if (!Number.isFinite(poisson) || poisson <= 0 || poisson >= 0.5) return null
    if (diameterMm >= heightMm) return null
    try {
      return solveShearWebFea({
        appliedForceN: loadN,
        widthMm,
        heightMm,
        diameterMm,
        thicknessMm,
        modulusGPa: modGPa,
        poissonRatio: poisson,
      })
    } catch { return null }
  }, [analysisMode, siInputs, poisson])

  const forceUnit = unitSystem === 'SI' ? 'N' : 'lbf'
  const lenUnit = unitSystem === 'SI' ? 'mm' : 'in'
  const modUnit = unitSystem === 'SI' ? 'GPa' : 'Mpsi'

  return (
    <div className="bino-wrap">
      <div className="workspace-controls">
        <div className="analysis-toggle">
          <button className={unitSystem === 'SI' ? 'active' : ''} onClick={() => onUnitChange('SI')}>SI</button>
          <button className={unitSystem === 'US' ? 'active' : ''} onClick={() => onUnitChange('US')}>US</button>
        </div>
        <div className="analysis-toggle">
          <button className={analysisMode === 'closed-form' ? 'active' : ''} onClick={() => setAnalysisMode('closed-form')}>Closed-form</button>
          <button className={analysisMode === 'fea' ? 'active' : ''} onClick={() => setAnalysisMode('fea')}>FEA</button>
        </div>
        <div className="analysis-toggle">
          <button className={!bendingNull ? 'active' : ''} onClick={() => setBendingNull(false)}>Parallel gages</button>
          <button className={bendingNull ? 'active' : ''} onClick={() => setBendingNull(true)}>Bending-null (Fig C)</button>
        </div>
      </div>
      <SectionToggle label="Diagrams" open={show2D} onToggle={() => setShow2D(v => !v)} />
      {show2D && (
        <div className="calc-diagram-row">
          <div className="calc-diagram-2d">
            <RoundShearDiagram
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

      <SectionToggle label="3D Model" open={show3D} onToggle={() => setShow3D(v => !v)} />
      {show3D && (
        <div className="calc-model-3d">
          <RoundShearModelPreview
            params={{
              load: siInputs.loadN,
              width: siInputs.widthMm,
              height: siInputs.heightMm,
              diameter: siInputs.diameterMm,
              thickness: siInputs.thicknessMm,
              bendingNull: bendingNull ? 1 : 0,
            }}
            us={unitSystem === 'US'}
          />
        </div>
      )}

      <SectionToggle label="Inputs" open={showInputs} onToggle={() => setShowInputs(v => !v)} />
      {showInputs && (
        <>
          <div className="bino-grid">
            <label>Applied load ({forceUnit})<input type="number" value={Number.isFinite(load) ? load : ''} onChange={e => setLoad(e.target.value === '' ? NaN : Number(e.target.value))} /></label>
            <label>Section width ({lenUnit})<input type="number" value={Number.isFinite(width) ? width : ''} onChange={e => setWidth(e.target.value === '' ? NaN : Number(e.target.value))} /></label>
            <label>Section height ({lenUnit})<input type="number" value={Number.isFinite(height) ? height : ''} onChange={e => setHeight(e.target.value === '' ? NaN : Number(e.target.value))} /></label>
            <label>Web opening diameter ({lenUnit})<input type="number" value={Number.isFinite(diameter) ? diameter : ''} onChange={e => setDiameter(e.target.value === '' ? NaN : Number(e.target.value))} /></label>
            <label>Web thickness ({lenUnit})<input type="number" value={Number.isFinite(thickness) ? thickness : ''} onChange={e => setThickness(e.target.value === '' ? NaN : Number(e.target.value))} /></label>
            <label>Modulus ({modUnit})<input type="number" value={Number.isFinite(modulusGPa) ? modulusGPa : ''} onChange={e => setModulusGPa(e.target.value === '' ? NaN : Number(e.target.value))} /></label>
            <label>Poisson&apos;s ratio<input type="number" value={Number.isFinite(poisson) ? poisson : ''} onChange={e => setPoisson(e.target.value === '' ? NaN : Number(e.target.value))} /></label>
            <label>Gage factor<input type="number" value={Number.isFinite(gageFactor) ? gageFactor : ''} onChange={e => setGageFactor(e.target.value === '' ? NaN : Number(e.target.value))} /></label>
          </div>
          {result.error && <p className="workspace-note">{result.error}</p>}
        </>
      )}

      <SectionToggle label="Results" open={showResults} onToggle={() => setShowResults(v => !v)} />
      {showResults && (
        <table className="bino-table">
          <tbody>
            <tr><th colSpan={3}>Calculated Values</th></tr>
            <tr><td>Full Bridge Span:</td><td>{show(result.span, 4)}</td><td>mV/V</td></tr>
          </tbody>
        </table>
      )}

      {analysisMode === 'fea' && (
        <>
          <SectionToggle label="FEA Viewer" open={showFea} onToggle={() => setShowFea(v => !v)} />
          {showFea && (
            <div className="fea-analysis-section">
              {feaSolution ? (
                <>
                  <div className="analysis-toggle" style={{ marginBottom: 8 }}>
                    {(['mesh', 'contour', 'deformed', 'boundary'] as const).map((m) => (
                      <button key={m} className={viewMode === m ? 'active' : ''} onClick={() => setViewMode(m)}>{m}</button>
                    ))}
                  </div>
                  <Suspense fallback={<p className="fea-note">Loading 3D viewer…</p>}>
                    <CstFeaViewer
                      solution={feaSolution}
                      depthMm={siInputs.thicknessMm}
                      viewMode={viewMode}
                      strainKey="exy"
                      bcType="shear-web"
                      unitSystem={unitSystem}
                      dimLabels={[
                        { label: 'h', value: siInputs.heightMm },
                        { label: '⌀', value: siInputs.diameterMm },
                        { label: 't', value: siInputs.thicknessMm },
                      ]}
                    />
                  </Suspense>
                  <p className="fea-accuracy-warn">FEA accuracy: ±20% vs. closed-form for typical shear-web geometries.</p>
                  <p className="fea-note">2D plane-stress CST · web panel only · shear strain (ε_xy) — 45° gages sense max principal = |ε_xy|</p>
                </>
              ) : (
                <p className="fea-note">Enter valid inputs to compute FEA strain field.</p>
              )}
            </div>
          )}
        </>
      )}
      {bendingNull && (
        <p className="fea-note">Bending-null (Fig C, VMM-26): back-face gage grids are rotated 90° relative to front-face grids and wired into opposite bridge arms — bending strains cancel, improving immunity to off-axis loading.</p>
      )}
    </div>
  )
}
