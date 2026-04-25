import { useMemo, useState } from 'react'
import { designCrossBeamFT, generateCalibrationProcedure, type CrossBeamFTParams } from '../../domain/sixAxisForceTorque'
import { MATERIALS, DEFAULT_MATERIAL_ID, getMaterial } from '../../domain/materials'
import CrossBeamSketch2D from '../diagrams/CrossBeamSketch2D'
import CrossBeamModelPreview from '../CrossBeamModelPreview'

type UnitSystem = 'SI' | 'US'

const N_PER_LBF    = 4.4482216152605
const MM_PER_IN    = 25.4
const GPA_PER_MPSI = 6.8947572932
const NM_PER_INLB  = 0.112984829

const show = (v: number, d: number) => (Number.isFinite(v) && v > 0 ? v.toFixed(d) : '—')

interface Props {
  unitSystem: UnitSystem
  onUnitChange: (next: UnitSystem) => void
}

interface Field {
  label: string
  key: keyof Omit<CrossBeamFTParams, 'youngsModulusPa' | 'poissonRatio' | 'gageFactor' | 'densityKgM3'>
  unit: 'length' | 'force' | 'moment' | 'none'
  defaultSI: number
  step: number
  min: number
}

const FIELDS: Field[] = [
  { key: 'outerRadiusMm',           label: 'Outer Radius',            unit: 'length', defaultSI: 35,   step: 1,   min: 1 },
  { key: 'innerRadiusMm',           label: 'Hub (Inner) Radius',      unit: 'length', defaultSI: 15,   step: 0.5, min: 1 },
  { key: 'beamWidthMm',             label: 'Beam Width (tangential)', unit: 'length', defaultSI: 10,   step: 0.5, min: 0.5 },
  { key: 'beamThicknessMm',         label: 'Beam Thickness (axial)',  unit: 'length', defaultSI: 4,    step: 0.1, min: 0.1 },
  { key: 'gageDistFromOuterRingMm', label: 'Gage Dist from Root',     unit: 'length', defaultSI: 2,    step: 0.5, min: 0 },
  { key: 'ratedForceN',             label: 'Rated Force (Fx=Fy=Fz)',  unit: 'force',  defaultSI: 400,  step: 10,  min: 0.1 },
  { key: 'ratedMomentNm',           label: 'Rated Moment (Mx=My=Mz)', unit: 'moment', defaultSI: 3.0,  step: 0.1, min: 0.01 },
]

function unitLabel(unit: Field['unit'], us: boolean): string {
  if (unit === 'length') return us ? 'in' : 'mm'
  if (unit === 'force')  return us ? 'lbf' : 'N'
  if (unit === 'moment') return us ? 'in·lbf' : 'N·m'
  return ''
}

function toDisplay(val: number, unit: Field['unit'], us: boolean): number {
  if (!us) return val
  if (unit === 'length') return Math.round(val / MM_PER_IN * 10000) / 10000
  if (unit === 'force')  return Math.round(val / N_PER_LBF * 10000) / 10000
  if (unit === 'moment') return Math.round(val / NM_PER_INLB * 10000) / 10000
  return val
}

function toSI(val: number, unit: Field['unit'], us: boolean): number {
  if (!us) return val
  if (unit === 'length') return val * MM_PER_IN
  if (unit === 'force')  return val * N_PER_LBF
  if (unit === 'moment') return val * NM_PER_INLB
  return val
}

type FieldValues = Record<string, number>

function initFields(us: boolean): FieldValues {
  const vals: FieldValues = {}
  for (const f of FIELDS) {
    vals[f.key] = toDisplay(f.defaultSI, f.unit, us)
  }
  return vals
}

function MatrixCell({ value, isDiag }: { value: number; isDiag: boolean }) {
  const formatted = Math.abs(value) < 0.001 ? '≈0' : value.toFixed(4)
  const style: React.CSSProperties = isDiag
    ? { background: '#edfcf2', color: '#166534', borderColor: '#bbf7d0' }
    : value === 0
      ? { color: '#cbd5e1', borderColor: '#f1f5f9' }
      : { background: '#fff7ed', color: '#9a3412', borderColor: '#fed7aa' }
  return (
    <td style={{ ...style, textAlign: 'center', fontFamily: 'IBM Plex Mono, monospace', fontSize: 11, padding: '5px 8px', border: '1px solid #e2e8f0' }}>
      {formatted}
    </td>
  )
}

// Lightweight collapsible section using existing app styling patterns
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

const CHANNEL_LABELS = ['Fx', 'Fy', 'Fz', 'Mx', 'My', 'Mz'] as const
type Channel = typeof CHANNEL_LABELS[number]

export default function SixAxisFTCalc({ unitSystem, onUnitChange }: Props) {
  const us = unitSystem === 'US'
  const [fields, setFields] = useState<FieldValues>(() => initFields(us))
  const [materialId, setMaterialId] = useState(DEFAULT_MATERIAL_ID)
  const mat = getMaterial(materialId)
  const [modulus, setModulus]     = useState(us ? +(mat.eGPa / GPA_PER_MPSI).toFixed(2) : mat.eGPa)
  const [poisson, setPoisson]     = useState(mat.nu)
  const [gageFactor, setGageFactor] = useState(2.0)

  function applyMaterial(id: string) {
    const m = getMaterial(id)
    setMaterialId(id)
    setModulus(us ? +(m.eGPa / GPA_PER_MPSI).toFixed(2) : m.eGPa)
    setPoisson(m.nu)
  }

  const [showInputs, setShowInputs]   = useState(true)
  const [showSketch, setShowSketch]   = useState(true)
  const [show3D, setShow3D]           = useState(false)
  const [showMetrics, setShowMetrics] = useState(true)
  const [showChannels, setShowChannels] = useState(true)
  const [showGages, setShowGages]     = useState(true)
  const [showMatrix, setShowMatrix]   = useState(true)
  const [showCalib, setShowCalib]     = useState(false)

  function setField(key: string, val: number) {
    setFields(prev => ({ ...prev, [key]: val }))
  }

  const params = useMemo((): CrossBeamFTParams => {
    const get = (key: string, unit: Field['unit']) => toSI(fields[key] ?? 0, unit, us)
    const E_Pa = us ? modulus * GPA_PER_MPSI * 1e9 : modulus * 1e9
    return {
      outerRadiusMm:           get('outerRadiusMm', 'length'),
      innerRadiusMm:           get('innerRadiusMm', 'length'),
      beamWidthMm:             get('beamWidthMm', 'length'),
      beamThicknessMm:         get('beamThicknessMm', 'length'),
      gageDistFromOuterRingMm: get('gageDistFromOuterRingMm', 'length'),
      ratedForceN:             get('ratedForceN', 'force'),
      ratedMomentNm:           get('ratedMomentNm', 'moment'),
      youngsModulusPa:         E_Pa,
      poissonRatio:            poisson,
      gageFactor,
      densityKgM3:             mat.densityKgM3,
      yieldStrengthPa:         mat.yieldMPa ? mat.yieldMPa * 1e6 : undefined,
    }
  }, [fields, modulus, poisson, gageFactor, us, mat])

  const result = useMemo(() => designCrossBeamFT(params), [params])

  const sensCols: Record<Channel, number> = {
    Fx: result.sensitivity.Fx, Fy: result.sensitivity.Fy, Fz: result.sensitivity.Fz,
    Mx: result.sensitivity.Mx, My: result.sensitivity.My, Mz: result.sensitivity.Mz,
  }
  const ratedCols: Record<Channel, number> = {
    Fx: result.ratedOutput.Fx, Fy: result.ratedOutput.Fy, Fz: result.ratedOutput.Fz,
    Mx: result.ratedOutput.Mx, My: result.ratedOutput.My, Mz: result.ratedOutput.Mz,
  }

  function matrixValue(row: Channel, col: Channel): number {
    return row === col ? sensCols[row] : 0
  }

  return (
    <div className="bino-wrap">

      {/* Controls */}
      <div className="workspace-controls">
        <div className="analysis-toggle">
          <button className={!us ? 'active' : ''} onClick={() => onUnitChange('SI')}>SI</button>
          <button className={us ? 'active' : ''} onClick={() => onUnitChange('US')}>US</button>
        </div>
      </div>

      {/* 2D Sketch */}
      <SectionToggle label="Diagrams" open={showSketch} onToggle={() => setShowSketch(v => !v)} />
      {showSketch && (
        <div className="calc-diagram-2d" style={{ display: 'flex', justifyContent: 'center' }}>
          {result.isValid ? (
            <CrossBeamSketch2D
              outerRadiusMm={params.outerRadiusMm}
              innerRadiusMm={params.innerRadiusMm}
              beamWidthMm={params.beamWidthMm}
              beamThicknessMm={params.beamThicknessMm}
              gageDistFromOuterRingMm={params.gageDistFromOuterRingMm}
              width={320} height={320}
            />
          ) : (
            <p className="workspace-note" style={{ color: '#a03020' }}>{result.error}</p>
          )}
        </div>
      )}

      {/* 3D Model */}
      <SectionToggle label="3D Model" open={show3D} onToggle={() => setShow3D(v => !v)} />
      {show3D && (
        <div className="calc-model-3d">
          <CrossBeamModelPreview
            outerRadiusMm={params.outerRadiusMm}
            innerRadiusMm={params.innerRadiusMm}
            beamWidthMm={params.beamWidthMm}
            beamThicknessMm={params.beamThicknessMm}
            gageDistFromOuterRingMm={params.gageDistFromOuterRingMm}
            us={us}
          />
        </div>
      )}

      {/* Inputs */}
      <SectionToggle label="Inputs" open={showInputs} onToggle={() => setShowInputs(v => !v)} />
      {showInputs && (
        <>
          {/* Material group */}
          <div className="bino-grid" style={{ marginBottom: 4 }}>
            <label style={{ gridColumn: '1 / -1' }}>
              Material
              <select
                value={materialId}
                onChange={e => applyMaterial(e.target.value)}
                style={{ fontFamily: 'inherit', padding: '4px 6px', borderRadius: 4, border: '1px solid var(--line)', background: '#fff', color: 'var(--ink)', width: '100%', marginTop: 4 }}
              >
                {MATERIALS.map(m => (
                  <option key={m.id} value={m.id}>{m.name}{m.yieldMPa ? ` — E=${m.eGPa} GPa, σy=${m.yieldMPa} MPa` : ` — E=${m.eGPa} GPa`}</option>
                ))}
              </select>
            </label>
            <label>
              Modulus of Elasticity ({us ? 'Mpsi' : 'GPa'})
              <input type="number" value={modulus} step={1} min={1} onChange={e => setModulus(Number(e.target.value))} />
            </label>
            <label>
              Poisson Ratio ν
              <input type="number" value={poisson} step={0.01} min={0.1} max={0.5} onChange={e => setPoisson(Number(e.target.value))} />
            </label>
          </div>

          {/* Geometry + gage inputs */}
          <div className="bino-grid">
            {FIELDS.map(f => (
              <label key={f.key}>
                {f.label}{f.unit !== 'none' ? ` (${unitLabel(f.unit, us)})` : ''}
                <input
                  type="number"
                  value={fields[f.key] ?? ''}
                  step={f.step}
                  min={f.unit === 'none' ? f.min : toDisplay(f.min, f.unit, us)}
                  onChange={e => setField(f.key, Number(e.target.value))}
                />
              </label>
            ))}
            <label>
              Gage Factor
              <input type="number" value={gageFactor} step={0.1} min={0.5} max={5} onChange={e => setGageFactor(Number(e.target.value))} />
            </label>
          </div>

          {result.warnings.map((w, i) => (
            <p key={i} className="workspace-note" style={{ color: '#8b5e00' }}>{w}</p>
          ))}
        </>
      )}

      {/* Design Metrics */}
      <SectionToggle label="Design Metrics" open={showMetrics} onToggle={() => setShowMetrics(v => !v)} />
      {showMetrics && (
        <table className="bino-table">
          <tbody>
            <tr><th colSpan={3}>Decoupling</th></tr>
            <tr>
              <td>Condition Number</td>
              <td style={{ color: result.conditionNumber < 5 ? '#166534' : result.conditionNumber < 10 ? '#92400e' : '#991b1b', fontWeight: 600 }}>
                {show(result.conditionNumber, 2)}
              </td>
              <td>max/min rated output</td>
            </tr>
            <tr><th colSpan={3}>Strain &amp; Safety</th></tr>
            <tr>
              <td>Strain Safety Factor</td>
              <td style={{ color: result.strainSafetyFactor > 2 ? '#166534' : result.strainSafetyFactor > 1 ? '#92400e' : '#991b1b', fontWeight: 600 }}>
                {show(result.strainSafetyFactor, 2)}
              </td>
              <td>1500 µε limit / max strain</td>
            </tr>
            <tr><td>Max Strain at Rated Load</td><td>{show(result.maxStrainMicrostrain, 0)}</td><td>µε</td></tr>
            {result.yieldSafetyFactor !== undefined && (
              <tr>
                <td>Yield Safety Factor</td>
                <td style={{ color: result.yieldSafetyFactor >= 2.5 ? '#166534' : result.yieldSafetyFactor >= 1.5 ? '#92400e' : '#991b1b', fontWeight: 600 }}>
                  {result.yieldSafetyFactor.toFixed(2)}
                </td>
                <td>{mat.name}, σy = {mat.yieldMPa} MPa</td>
              </tr>
            )}
            <tr><th colSpan={3}>Stiffness &amp; Dynamics (Fu &amp; Song 2018)</th></tr>
            <tr><td>Axial Stiffness (Fz)</td><td>{show(result.axialStiffnessNPerM / 1000, 1)}</td><td>kN/m</td></tr>
            <tr><td>Natural Frequency — Fz</td><td>{show(result.naturalFrequencyFzHz, 0)}</td><td>Hz</td></tr>
            <tr><td>Natural Frequency — Fx = Fy</td><td>{show(result.naturalFrequencyFxHz, 0)}</td><td>Hz</td></tr>
            <tr><td>Natural Frequency — Mz</td><td>{show(result.naturalFrequencyMzHz, 0)}</td><td>Hz</td></tr>
            <tr>
              <td>Working Bandwidth</td>
              <td style={{ color: result.workingBandwidthHz > 500 ? '#166534' : result.workingBandwidthHz > 200 ? '#92400e' : '#991b1b', fontWeight: 600 }}>
                {show(result.workingBandwidthHz, 0)}
              </td>
              <td>Hz (min fn / 4)</td>
            </tr>
            <tr><th colSpan={3}>Timoshenko Correction (Wang et al. 2017)</th></tr>
            <tr>
              <td>Shear Factor Φ (Fz)</td>
              <td style={{ color: result.timoshenkoPhiFz > 0.1 ? '#92400e' : '#475569' }}>
                {result.timoshenkoPhiFz.toFixed(4)}
              </td>
              <td>{(result.timoshenkoPhiFz * 100).toFixed(1)}% stiffness reduction</td>
            </tr>
            <tr>
              <td>Shear Factor Φ (Fx/Fy)</td>
              <td style={{ color: result.timoshenkoPhiFx > 0.1 ? '#92400e' : '#475569' }}>
                {result.timoshenkoPhiFx.toFixed(4)}
              </td>
              <td>{(result.timoshenkoPhiFx * 100).toFixed(1)}% stiffness reduction</td>
            </tr>
          </tbody>
        </table>
      )}

      {/* Channel Sensitivity */}
      <SectionToggle label="Channel Sensitivity & Rated Output" open={showChannels} onToggle={() => setShowChannels(v => !v)} />
      {showChannels && (
        <table className="bino-table">
          <tbody>
            <tr>
              <th>Channel</th>
              <th>Sensitivity</th>
              <th>Unit</th>
              <th>Rated Output</th>
              <th>mV/V</th>
            </tr>
            {(['Fx', 'Fy', 'Fz'] as const).map(ch => (
              <tr key={ch}>
                <td><strong>{ch}</strong></td>
                <td style={{ fontFamily: 'IBM Plex Mono, monospace', textAlign: 'right', color: '#1d4ed8' }}>{sensCols[ch].toFixed(5)}</td>
                <td>mV/V / N</td>
                <td style={{ fontFamily: 'IBM Plex Mono, monospace', textAlign: 'right', color: '#166534' }}>{ratedCols[ch].toFixed(4)}</td>
                <td>mV/V</td>
              </tr>
            ))}
            {(['Mx', 'My', 'Mz'] as const).map(ch => (
              <tr key={ch}>
                <td><strong>{ch}</strong></td>
                <td style={{ fontFamily: 'IBM Plex Mono, monospace', textAlign: 'right', color: '#1d4ed8' }}>{sensCols[ch].toFixed(5)}</td>
                <td>mV/V / N·m</td>
                <td style={{ fontFamily: 'IBM Plex Mono, monospace', textAlign: 'right', color: '#166534' }}>{ratedCols[ch].toFixed(4)}</td>
                <td>mV/V</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {/* Gage Strain Map */}
      <SectionToggle label="Gage Strain Map — Individual Strains at Rated Load" open={showGages} onToggle={() => setShowGages(v => !v)} />
      {showGages && (
        <table className="bino-table">
          <tbody>
            <tr>
              <th>Channel</th>
              <th>Grids</th>
              <th>Orientation</th>
              <th>Arms</th>
              <th style={{ textAlign: 'right' }}>µε at Rated</th>
            </tr>
            {result.gageStrains.map((g, i) => {
              const isPeak = g.id === 'peak'
              const val = g.strainMicrostrain
              const color = val > 1500 ? '#991b1b' : val > 1000 ? '#92400e' : '#166534'
              const isShear = g.orientation === 'shear (45°)'
              return (
                <tr key={i} style={isPeak ? { borderTop: '2px solid var(--line)', background: '#f8fafc' } : undefined}>
                  <td><strong style={{ color: isPeak ? '#4f46e5' : undefined }}>{g.channel}</strong></td>
                  <td style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: '0.8rem', whiteSpace: 'nowrap' }}>
                    {g.gridNums.map(n => (
                      <span key={n} style={{
                        display: 'inline-block', width: 16, textAlign: 'center',
                        fontWeight: 700, marginRight: 1,
                        color: isShear ? '#0891b2' : '#d97706',
                      }}>{n}</span>
                    ))}
                  </td>
                  <td style={{ fontSize: '0.8rem', color: 'var(--ink-soft)' }}>{g.orientation}</td>
                  <td style={{ fontSize: '0.8rem' }}>{g.arms}</td>
                  <td style={{ fontFamily: 'IBM Plex Mono, monospace', textAlign: 'right', color, fontWeight: 600 }}>
                    {val.toFixed(0)}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      )}

      {/* Sensitivity Matrix */}
      <SectionToggle label="Sensitivity Matrix S (mV/V per unit load)" open={showMatrix} onToggle={() => setShowMatrix(v => !v)} />
      {showMatrix && (
        <div style={{ overflowX: 'auto' }}>
          <p className="workspace-note" style={{ marginBottom: 6 }}>
            Ideal symmetric geometry — off-diagonal coupling = 0%. Real sensors: 1–5% from manufacturing tolerances.
          </p>
          <table style={{ borderCollapse: 'collapse', fontSize: 11 }}>
            <thead>
              <tr>
                <th style={{ padding: '5px 8px', background: '#f8fafc', color: '#94a3b8', fontWeight: 'normal', border: '1px solid #e2e8f0', fontFamily: 'IBM Plex Mono, monospace' }}>S</th>
                {CHANNEL_LABELS.map(col => (
                  <th key={col} style={{ padding: '5px 10px', background: '#f8fafc', color: '#334155', fontWeight: 700, border: '1px solid #e2e8f0', fontFamily: 'IBM Plex Mono, monospace', minWidth: 72 }}>{col}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {CHANNEL_LABELS.map(row => (
                <tr key={row}>
                  <td style={{ padding: '5px 8px', background: '#f8fafc', fontWeight: 700, border: '1px solid #e2e8f0', fontFamily: 'IBM Plex Mono, monospace' }}>{row}</td>
                  {CHANNEL_LABELS.map(col => (
                    <MatrixCell key={col} value={matrixValue(row, col)} isDiag={row === col} />
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
          <p className="workspace-note" style={{ marginTop: 4 }}>
            Green = direct sensitivity. N channels: mV/V/N · N·m channels: mV/V/(N·m).
          </p>
        </div>
      )}

      {/* Calibration Export */}
      <SectionToggle label="Calibration Export (Ahmad et al. 2021)" open={showCalib} onToggle={() => setShowCalib(v => !v)} />
      {showCalib && result.isValid && (() => {
        const cal = generateCalibrationProcedure(result, params)
        const forceUnit = us ? 'lbf' : 'N'
        const momentUnit = us ? 'in·lbf' : 'N·m'

        function downloadBlob(content: string, filename: string, type: string) {
          const blob = new Blob([content], { type })
          const url = URL.createObjectURL(blob)
          const a = document.createElement('a')
          a.href = url; a.download = filename; a.click()
          URL.revokeObjectURL(url)
        }

        function exportJson() {
          const out = {
            sensor: 'Cross-Beam 6-DOF F/T',
            calibrationMatrix: cal.matrix,
            loadSteps: cal.loadSteps.map(s => ({
              label: s.label,
              appliedLoad_N_Nm: s.appliedLoad,
              expectedVoltages_mVV: s.expectedVoltages,
            })),
          }
          downloadBlob(JSON.stringify(out, null, 2), 'crossbeam_calibration.json', 'application/json')
        }

        function exportCsv() {
          const rows = ['step,Fx_N,Fy_N,Fz_N,Mx_Nm,My_Nm,Mz_Nm,V1_mVV,V2_mVV,V3_mVV,V4_mVV,V5_mVV,V6_mVV']
          for (const s of cal.loadSteps) {
            rows.push([s.label, ...s.appliedLoad, ...s.expectedVoltages].join(','))
          }
          downloadBlob(rows.join('\n'), 'crossbeam_calibration.csv', 'text/csv')
        }

        return (
          <div>
            <p className="workspace-note" style={{ marginBottom: 6 }}>
              12-step procedure for lab calibration. Apply each load at rated full-scale; record bridge voltages; verify against expected values.
              The calibration matrix C&nbsp;=&nbsp;S⁻¹ maps measured voltages back to wrench components.
            </p>
            <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
              <button
                onClick={exportJson}
                style={{ padding: '5px 12px', borderRadius: 4, border: '1px solid var(--line)', background: '#f8fafc', cursor: 'pointer', fontSize: '0.82rem', fontFamily: 'inherit' }}
              >Download JSON</button>
              <button
                onClick={exportCsv}
                style={{ padding: '5px 12px', borderRadius: 4, border: '1px solid var(--line)', background: '#f8fafc', cursor: 'pointer', fontSize: '0.82rem', fontFamily: 'inherit' }}
              >Download CSV</button>
            </div>
            <table className="bino-table">
              <tbody>
                <tr>
                  <th>Step</th>
                  <th>Load ({forceUnit} or {momentUnit})</th>
                  <th>Expected Ch (mV/V)</th>
                  <th>Value</th>
                </tr>
                {cal.loadSteps.map((s, i) => {
                  const chanIdx = s.appliedLoad.findIndex(v => v !== 0)
                  const chanLabel = ['Fx', 'Fy', 'Fz', 'Mx', 'My', 'Mz'][chanIdx] ?? '?'
                  const volts = s.expectedVoltages[chanIdx] ?? 0
                  const loadVal = s.appliedLoad[chanIdx] ?? 0
                  const isForce = chanIdx < 3
                  const dispLoad = us
                    ? isForce ? (loadVal / 4.4482216152605).toFixed(2) : (loadVal / 0.112984829).toFixed(3)
                    : loadVal.toFixed(isForce ? 1 : 3)
                  return (
                    <tr key={i}>
                      <td style={{ fontFamily: 'monospace' }}>{i + 1}. {s.label}</td>
                      <td>{dispLoad} {isForce ? forceUnit : momentUnit} on {chanLabel}</td>
                      <td style={{ fontFamily: 'monospace' }}>{chanLabel}</td>
                      <td style={{ fontFamily: 'monospace', color: volts >= 0 ? '#166534' : '#991b1b' }}>
                        {volts >= 0 ? '+' : ''}{volts.toFixed(5)} mV/V
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )
      })()}

    </div>
  )
}
