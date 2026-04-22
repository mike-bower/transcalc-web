import { useMemo, useState } from 'react'
import { designHexapodFT, generateHexapodCalibrationProcedure, type HexapodFTParams } from '../../domain/hexapodFT'
import { MATERIALS, DEFAULT_MATERIAL_ID, getMaterial } from '../../domain/materials'
import HexapodSketch2D from '../diagrams/HexapodSketch2D'

type UnitSystem = 'SI' | 'US'

const N_PER_LBF    = 4.4482216152605
const MM_PER_IN    = 25.4
const GPA_PER_MPSI = 6.8947572932
const NM_PER_INLB  = 0.112984829

const show = (v: number | undefined, d: number) =>
  v != null && Number.isFinite(v) && v > 0 ? v.toFixed(d) : '—'

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

function MatrixCell({ value, isDiag }: { value: number; isDiag: boolean }) {
  const abs = Math.abs(value)
  const formatted = abs < 0.00001 ? '≈0' : abs < 0.001 ? value.toExponential(2) : value.toFixed(4)
  const style: React.CSSProperties = isDiag
    ? { background: '#edfcf2', color: '#166534', borderColor: '#bbf7d0' }
    : abs < 0.00001
      ? { color: '#cbd5e1', borderColor: '#f1f5f9' }
      : { background: '#fff7ed', color: '#9a3412', borderColor: '#fed7aa' }
  return (
    <td style={{ ...style, textAlign: 'center', fontFamily: 'IBM Plex Mono, monospace', fontSize: 10, padding: '4px 6px', border: '1px solid #e2e8f0' }}>
      {formatted}
    </td>
  )
}

interface Props {
  unitSystem: UnitSystem
  onUnitChange: (next: UnitSystem) => void
}

const CHANNEL_LABELS = ['Fx', 'Fy', 'Fz', 'Mx', 'My', 'Mz'] as const
type Channel = typeof CHANNEL_LABELS[number]

export default function HexapodFTCalc({ unitSystem, onUnitChange }: Props) {
  const us = unitSystem === 'US'

  const [materialId, setMaterialId] = useState(DEFAULT_MATERIAL_ID)
  const mat = getMaterial(materialId)
  const [modulus,    setModulus]    = useState(us ? +(mat.eGPa / GPA_PER_MPSI).toFixed(2) : mat.eGPa)
  const [poisson,    setPoisson]    = useState(mat.nu)
  const [gageFactor, setGageFactor] = useState(2.0)
  const [bridgeType, setBridgeType] = useState<'quarter' | 'half' | 'full'>('quarter')

  // Geometry — stored in display units
  const [topRadius,   setTopRadius]   = useState(us ? +(35 / MM_PER_IN).toFixed(4) : 35)
  const [botRadius,   setBotRadius]   = useState(us ? +(35 / MM_PER_IN).toFixed(4) : 35)
  const [platHeight,  setPlatHeight]  = useState(us ? +(30 / MM_PER_IN).toFixed(4) : 30)
  const [spread,      setSpread]      = useState(15)     // degrees, unit-agnostic
  const [topOffset,   setTopOffset]   = useState(0)      // degrees
  const [strutDiam,   setStrutDiam]   = useState(us ? +(2 / MM_PER_IN).toFixed(4) : 2)

  // Rated loads — display units
  const [ratedForce,  setRatedForce]  = useState(us ? +(200 / N_PER_LBF).toFixed(2) : 200)
  const [ratedMoment, setRatedMoment] = useState(us ? +(5 / NM_PER_INLB).toFixed(2) : 5)

  const [showSketch,  setShowSketch]  = useState(true)
  const [showInputs,  setShowInputs]  = useState(true)
  const [showMetrics, setShowMetrics] = useState(true)
  const [showRated,   setShowRated]   = useState(true)
  const [showStruts,  setShowStruts]  = useState(false)
  const [showJacobian,setShowJacobian]= useState(false)
  const [showCalib,   setShowCalib]   = useState(false)

  function applyMaterial(id: string) {
    const m = getMaterial(id)
    setMaterialId(id)
    setModulus(us ? +(m.eGPa / GPA_PER_MPSI).toFixed(2) : m.eGPa)
    setPoisson(m.nu)
  }

  const params = useMemo((): HexapodFTParams => {
    const toMm = (v: number) => us ? v * MM_PER_IN : v
    const toN  = (v: number) => us ? v * N_PER_LBF : v
    const toNm = (v: number) => us ? v * NM_PER_INLB : v
    const E_Pa = us ? modulus * GPA_PER_MPSI * 1e9 : modulus * 1e9
    return {
      topRingRadiusMm:    toMm(topRadius),
      bottomRingRadiusMm: toMm(botRadius),
      platformHeightMm:   toMm(platHeight),
      topAnglesOffsetDeg: topOffset,
      strutSpreadDeg:     spread,
      strutDiameterMm:    toMm(strutDiam),
      youngsModulusPa:    E_Pa,
      poissonRatio:       poisson,
      gageFactor,
      bridgeType,
      densityKgM3:        mat.densityKgM3,
      yieldStrengthPa:    mat.yieldMPa ? mat.yieldMPa * 1e6 : undefined,
      ratedForceN:        toN(ratedForce),
      ratedMomentNm:      toNm(ratedMoment),
    }
  }, [us, topRadius, botRadius, platHeight, topOffset, spread, strutDiam,
      modulus, poisson, gageFactor, bridgeType, mat, ratedForce, ratedMoment])

  const result = useMemo(() => designHexapodFT(params), [params])

  const lenUnit  = us ? 'in' : 'mm'
  const forceUnit = us ? 'lbf' : 'N'
  const momentUnit = us ? 'in·lbf' : 'N·m'

  const ratedOut: Record<Channel, number> = result.isValid ? {
    Fx: result.ratedOutput.Fx, Fy: result.ratedOutput.Fy, Fz: result.ratedOutput.Fz,
    Mx: result.ratedOutput.Mx, My: result.ratedOutput.My, Mz: result.ratedOutput.Mz,
  } : { Fx: 0, Fy: 0, Fz: 0, Mx: 0, My: 0, Mz: 0 }

  // For sketch, always pass SI params
  const sketchProps = {
    topRingRadiusMm:    params.topRingRadiusMm,
    bottomRingRadiusMm: params.bottomRingRadiusMm,
    platformHeightMm:   params.platformHeightMm,
    strutSpreadDeg:     params.strutSpreadDeg ?? 15,
    topAnglesOffsetDeg: params.topAnglesOffsetDeg ?? 0,
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
      <SectionToggle label="2D Geometry Preview" open={showSketch} onToggle={() => setShowSketch(v => !v)} />
      {showSketch && (
        <div className="calc-diagram-2d" style={{ display: 'flex', justifyContent: 'center' }}>
          {result.isValid ? (
            <HexapodSketch2D {...sketchProps} width={480} height={260} />
          ) : (
            <p className="workspace-note" style={{ color: '#a03020' }}>{result.error}</p>
          )}
        </div>
      )}

      {/* Inputs */}
      <SectionToggle label="Inputs" open={showInputs} onToggle={() => setShowInputs(v => !v)} />
      {showInputs && (
        <>
          {/* Material */}
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
              Modulus ({us ? 'Mpsi' : 'GPa'})
              <input type="number" value={modulus} step={1} min={1} onChange={e => setModulus(Number(e.target.value))} />
            </label>
            <label>
              Poisson Ratio ν
              <input type="number" value={poisson} step={0.01} min={0.1} max={0.5} onChange={e => setPoisson(Number(e.target.value))} />
            </label>
          </div>

          {/* Geometry */}
          <div className="bino-grid">
            <label>
              Top Ring Radius ({lenUnit})
              <input type="number" value={topRadius} step={us ? 0.05 : 1} min={0.1} onChange={e => setTopRadius(Number(e.target.value))} />
            </label>
            <label>
              Bottom Ring Radius ({lenUnit})
              <input type="number" value={botRadius} step={us ? 0.05 : 1} min={0.1} onChange={e => setBotRadius(Number(e.target.value))} />
            </label>
            <label>
              Platform Height ({lenUnit})
              <input type="number" value={platHeight} step={us ? 0.05 : 1} min={0.1} onChange={e => setPlatHeight(Number(e.target.value))} />
            </label>
            <label>
              Strut Spread ±(°)
              <input type="number" value={spread} step={1} min={3} max={40} onChange={e => setSpread(Number(e.target.value))} />
            </label>
            <label>
              Top Ring Offset (°)
              <input type="number" value={topOffset} step={1} min={-60} max={60} onChange={e => setTopOffset(Number(e.target.value))} />
            </label>
            <label>
              Strut Diameter ({lenUnit})
              <input type="number" value={strutDiam} step={us ? 0.01 : 0.1} min={0.01} onChange={e => setStrutDiam(Number(e.target.value))} />
            </label>
            <label>
              Gage Factor
              <input type="number" value={gageFactor} step={0.1} min={0.5} max={5} onChange={e => setGageFactor(Number(e.target.value))} />
            </label>
            <label>
              Bridge Type
              <select
                value={bridgeType}
                onChange={e => setBridgeType(e.target.value as 'quarter' | 'half' | 'full')}
                style={{ fontFamily: 'inherit', padding: '4px 6px', borderRadius: 4, border: '1px solid var(--line)', background: '#fff', color: 'var(--ink)', marginTop: 4 }}
              >
                <option value="quarter">Quarter Bridge (×0.25)</option>
                <option value="half">Half Bridge (×0.5)</option>
                <option value="full">Full Bridge (×1.0)</option>
              </select>
            </label>
          </div>

          {/* Rated Loads */}
          <div className="bino-grid" style={{ marginTop: 4 }}>
            <label>
              Rated Force ({forceUnit})
              <input type="number" value={ratedForce} step={us ? 1 : 10} min={0.01} onChange={e => setRatedForce(Number(e.target.value))} />
            </label>
            <label>
              Rated Moment ({momentUnit})
              <input type="number" value={ratedMoment} step={us ? 0.1 : 0.5} min={0.001} onChange={e => setRatedMoment(Number(e.target.value))} />
            </label>
          </div>

          {result.warnings.map((w, i) => (
            <p key={i} className="workspace-note" style={{ color: '#8b5e00' }}>{w}</p>
          ))}
        </>
      )}

      {/* Design Metrics */}
      <SectionToggle label="Design Metrics" open={showMetrics} onToggle={() => setShowMetrics(v => !v)} />
      {showMetrics && result.isValid && (
        <table className="bino-table">
          <tbody>
            <tr><th colSpan={3}>Geometry</th></tr>
            <tr>
              <td>Strut Length</td>
              <td>{us ? (result.geometry.strutLengthMm / MM_PER_IN).toFixed(4) : result.geometry.strutLengthMm.toFixed(2)}</td>
              <td>{lenUnit}</td>
            </tr>
            <tr>
              <td>Strut Tilt from Vertical</td>
              <td>{result.geometry.tiltDeg.toFixed(2)}</td>
              <td>°</td>
            </tr>
            <tr><th colSpan={3}>Decoupling</th></tr>
            <tr>
              <td>Condition Number</td>
              <td style={{ color: result.conditionNumber < 5 ? '#166534' : result.conditionNumber < 10 ? '#92400e' : '#991b1b', fontWeight: 600 }}>
                {show(result.conditionNumber, 2)}
              </td>
              <td>max/min rated output</td>
            </tr>
            <tr><th colSpan={3}>Sensitivity</th></tr>
            <tr>
              <td>Strut Sensitivity</td>
              <td>{result.strutSensitivityMvVPerN.toFixed(6)}</td>
              <td>mV/V per N (axial)</td>
            </tr>
            <tr><th colSpan={3}>Strain &amp; Safety</th></tr>
            <tr>
              <td>Max Strut Strain</td>
              <td>{result.maxStrutStrainMicrostrain.toFixed(1)}</td>
              <td>µε at rated load</td>
            </tr>
            <tr>
              <td>Strain Safety Factor</td>
              <td style={{ color: result.strainSafetyFactor > 2 ? '#166534' : result.strainSafetyFactor > 1 ? '#92400e' : '#991b1b', fontWeight: 600 }}>
                {show(result.strainSafetyFactor, 2)}
              </td>
              <td>1500 µε limit / max strain</td>
            </tr>
            {result.yieldSafetyFactor !== undefined && (
              <tr>
                <td>Yield Safety Factor</td>
                <td style={{ color: result.yieldSafetyFactor >= 2.5 ? '#166534' : result.yieldSafetyFactor >= 1.5 ? '#92400e' : '#991b1b', fontWeight: 600 }}>
                  {result.yieldSafetyFactor.toFixed(2)}
                </td>
                <td>{mat.name}{mat.yieldMPa ? `, σy=${mat.yieldMPa} MPa` : ''}</td>
              </tr>
            )}
            <tr><th colSpan={3}>Dynamics</th></tr>
            <tr>
              <td>Natural Frequency (Fz)</td>
              <td>{show(result.naturalFrequencyFzHz, 0)}</td>
              <td>Hz</td>
            </tr>
          </tbody>
        </table>
      )}

      {/* Rated Output per DOF */}
      <SectionToggle label="Rated Output per DOF" open={showRated} onToggle={() => setShowRated(v => !v)} />
      {showRated && result.isValid && (
        <table className="bino-table">
          <tbody>
            <tr>
              <th>DOF</th>
              <th>Rated Load</th>
              <th>Voltage (mV/V)</th>
            </tr>
            {CHANNEL_LABELS.map(ch => {
              const isForce = ch.startsWith('F')
              const ratedLoad = isForce
                ? (us ? (params.ratedForceN / N_PER_LBF).toFixed(1) : params.ratedForceN.toFixed(1))
                : (us ? (params.ratedMomentNm / NM_PER_INLB).toFixed(2) : params.ratedMomentNm.toFixed(2))
              const loadUnit = isForce ? forceUnit : momentUnit
              return (
                <tr key={ch}>
                  <td style={{ fontFamily: 'monospace', fontWeight: 600 }}>{ch}</td>
                  <td>{ratedLoad} {loadUnit}</td>
                  <td>{ratedOut[ch].toFixed(6)}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      )}

      {/* Strut Geometry Table */}
      <SectionToggle label="Strut Geometry" open={showStruts} onToggle={() => setShowStruts(v => !v)} />
      {showStruts && result.isValid && (
        <div style={{ overflowX: 'auto' }}>
          <table className="bino-table">
            <tbody>
              <tr>
                <th>Strut</th>
                <th>Top Pt</th>
                <th>Length ({lenUnit})</th>
                <th>Tilt (°)</th>
                <th>û_x</th>
                <th>û_y</th>
                <th>û_z</th>
              </tr>
              {result.struts.map(s => (
                <tr key={s.index}>
                  <td style={{ fontFamily: 'monospace' }}>{s.index}</td>
                  <td>{s.topAttachIndex}</td>
                  <td>{us ? (s.lengthMm / MM_PER_IN).toFixed(4) : s.lengthMm.toFixed(2)}</td>
                  <td>{s.tiltDeg.toFixed(2)}</td>
                  <td style={{ fontFamily: 'monospace', fontSize: 11 }}>{s.unitVector[0].toFixed(4)}</td>
                  <td style={{ fontFamily: 'monospace', fontSize: 11 }}>{s.unitVector[1].toFixed(4)}</td>
                  <td style={{ fontFamily: 'monospace', fontSize: 11 }}>{s.unitVector[2].toFixed(4)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Jacobian Matrix */}
      <SectionToggle label="Jacobian Matrix (6×6)" open={showJacobian} onToggle={() => setShowJacobian(v => !v)} />
      {showJacobian && result.isValid && (
        <div style={{ overflowX: 'auto' }}>
          <p style={{ fontSize: 11, color: '#64748b', margin: '4px 0 6px', fontFamily: 'monospace' }}>
            W = J × f_struts &nbsp;|&nbsp; rows: [Fx Fy Fz Mx My Mz] &nbsp;|&nbsp; cols: struts 0–5
          </p>
          <table style={{ borderCollapse: 'collapse', fontFamily: 'IBM Plex Mono, monospace', fontSize: 10 }}>
            <thead>
              <tr>
                <th style={{ padding: '4px 6px', textAlign: 'left', fontSize: 10, color: '#64748b' }}>DOF</th>
                {[0, 1, 2, 3, 4, 5].map(j => (
                  <th key={j} style={{ padding: '4px 6px', textAlign: 'center', fontSize: 10, color: '#64748b' }}>s{j}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {CHANNEL_LABELS.map((ch, row) => (
                <tr key={ch}>
                  <td style={{ padding: '4px 6px', fontWeight: 600, color: '#475569', fontFamily: 'monospace', fontSize: 11 }}>{ch}</td>
                  {result.jacobian[row].map((v, col) => (
                    <MatrixCell key={col} value={v} isDiag={false} />
                  ))}
                </tr>
              ))}
            </tbody>
          </table>

          <p style={{ fontSize: 11, color: '#64748b', margin: '10px 0 6px', fontFamily: 'monospace' }}>
            Calibration Matrix J⁻¹ &nbsp;|&nbsp; f_struts = J⁻¹ × W
          </p>
          <table style={{ borderCollapse: 'collapse', fontFamily: 'IBM Plex Mono, monospace', fontSize: 10 }}>
            <thead>
              <tr>
                <th style={{ padding: '4px 6px', textAlign: 'left', fontSize: 10, color: '#64748b' }}>Strut</th>
                {CHANNEL_LABELS.map(ch => (
                  <th key={ch} style={{ padding: '4px 6px', textAlign: 'center', fontSize: 10, color: '#64748b' }}>{ch}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {[0, 1, 2, 3, 4, 5].map(row => (
                <tr key={row}>
                  <td style={{ padding: '4px 6px', fontWeight: 600, color: '#475569', fontFamily: 'monospace', fontSize: 11 }}>s{row}</td>
                  {result.jacobianInverse[row].map((v, col) => (
                    <MatrixCell key={col} value={v} isDiag={false} />
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Calibration Export */}
      <SectionToggle label="Calibration Export (Ahmad et al. 2021)" open={showCalib} onToggle={() => setShowCalib(v => !v)} />
      {showCalib && result.isValid && (() => {
        const cal = generateHexapodCalibrationProcedure(result, params)

        function downloadBlob(content: string, filename: string, type: string) {
          const blob = new Blob([content], { type })
          const url = URL.createObjectURL(blob)
          const a = document.createElement('a')
          a.href = url; a.download = filename; a.click()
          URL.revokeObjectURL(url)
        }

        function exportJson() {
          const out = {
            sensor: 'Hexapod F/T (Stewart Platform)',
            calibrationMatrix: cal.matrix,
            loadSteps: cal.loadSteps.map(s => ({
              label: s.label,
              appliedLoad_N_Nm: s.appliedLoad,
              expectedVoltages_mVV: s.expectedVoltages,
            })),
          }
          downloadBlob(JSON.stringify(out, null, 2), 'hexapod_calibration.json', 'application/json')
        }

        function exportCsv() {
          const rows = ['step,Fx_N,Fy_N,Fz_N,Mx_Nm,My_Nm,Mz_Nm,V1_mVV,V2_mVV,V3_mVV,V4_mVV,V5_mVV,V6_mVV']
          for (const s of cal.loadSteps) {
            rows.push([s.label, ...s.appliedLoad, ...s.expectedVoltages].join(','))
          }
          downloadBlob(rows.join('\n'), 'hexapod_calibration.csv', 'text/csv')
        }

        return (
          <div>
            <p className="workspace-note" style={{ marginBottom: 6 }}>
              12-step procedure for lab calibration. C&nbsp;=&nbsp;J/S maps strut voltages to wrench components.
              Apply each load at rated full-scale; verify strut voltage pattern matches expected values.
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
                  <th>Load</th>
                  <th>Peak strut voltage</th>
                </tr>
                {cal.loadSteps.map((s, i) => {
                  const chanIdx = s.appliedLoad.findIndex(v => v !== 0)
                  const chanLabel = ['Fx', 'Fy', 'Fz', 'Mx', 'My', 'Mz'][chanIdx] ?? '?'
                  const loadVal = s.appliedLoad[chanIdx] ?? 0
                  const isForce = chanIdx < 3
                  const dispLoad = us
                    ? isForce ? (loadVal / N_PER_LBF).toFixed(2) : (loadVal / NM_PER_INLB).toFixed(3)
                    : loadVal.toFixed(isForce ? 1 : 3)
                  const voltUnit = isForce ? forceUnit : momentUnit
                  const peakV = Math.max(...s.expectedVoltages.map(Math.abs))
                  const peakSign = s.expectedVoltages.some(v => v < -1e-12) ? '±' : '+'
                  return (
                    <tr key={i}>
                      <td style={{ fontFamily: 'monospace' }}>{i + 1}. {s.label}</td>
                      <td>{dispLoad} {voltUnit} on {chanLabel}</td>
                      <td style={{ fontFamily: 'monospace', color: '#166534' }}>
                        {peakSign}{peakV.toFixed(5)} mV/V
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
