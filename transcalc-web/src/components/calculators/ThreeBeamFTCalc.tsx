import { useMemo, useState } from 'react'
import { designThreeBeamFT, type ThreeBeamFTParams } from '../../domain/threeBeamFT'
import { DEFAULT_MATERIAL_ID, getMaterial } from '../../domain/materials'
import MaterialSelector from '../MaterialSelector'
import ThreeBeamModelPreview from '../ThreeBeamModelPreview'
import SectionToggle from '../SectionToggle'
import WorkspaceControls from '../WorkspaceControls'
import ThreeBeamFea3DCalc from './ThreeBeamFea3DCalc'

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

/** Minimal top-view SVG for the 3-arm sensor — shows 3 arms at 120°, hub, outer ring, gage positions. */
function ThreeBeamSketch({ outerR, innerR, armW, gageD }: { outerR: number; innerR: number; armW: number; gageD: number }) {
  const cx = 140, cy = 140, scale = 110 / Math.max(outerR, 1)
  const ro = outerR * scale
  const ri = innerR * scale
  const aw = armW * scale
  const L  = ro - ri
  const gd = Math.min(gageD * scale, L * 0.9)
  const armLen = ro - ri
  const angles = [0, (2 * Math.PI) / 3, (4 * Math.PI) / 3]

  return (
    <svg width={280} height={280} viewBox="0 0 280 280" style={{ fontFamily: 'Barlow, sans-serif' }}>
      {/* Outer ring */}
      <circle cx={cx} cy={cy} r={ro + 6} fill="none" stroke="#64748b" strokeWidth={6} />
      {/* Arms */}
      {angles.map((a, i) => {
        const midR = ri + armLen * 0.5
        const ax = cx + Math.sin(a) * midR
        const ay = cy - Math.cos(a) * midR
        return (
          <rect
            key={i}
            x={ax - aw / 2} y={ay - armLen / 2}
            width={aw} height={armLen}
            fill="#4a88b8" rx={1}
            transform={`rotate(${(a * 180) / Math.PI},${ax},${ay})`}
          />
        )
      })}
      {/* Hub */}
      <circle cx={cx} cy={cy} r={ri} fill="#3570a0" />
      {/* Bending gages (amber rectangles near outer ring) */}
      {angles.map((a, i) => {
        const gr = ro - gd
        const gx = cx + Math.sin(a) * gr
        const gy = cy - Math.cos(a) * gr
        return (
          <rect
            key={i}
            x={gx - 5} y={gy - aw * 0.3}
            width={10} height={aw * 0.6}
            fill="#d97706" rx={1}
            transform={`rotate(${(a * 180) / Math.PI},${gx},${gy})`}
          />
        )
      })}
      {/* Shear gages (teal squares at mid-arm, side) */}
      {angles.map((a, i) => {
        const mr = ri + armLen * 0.5 + aw / 2 + 3
        const gx = cx + Math.sin(a) * mr
        const gy = cy - Math.cos(a) * mr
        return (
          <rect
            key={i}
            x={gx - 4} y={gy - 4}
            width={8} height={8}
            fill="#0f9170" rx={1}
            transform={`rotate(${(a * 180) / Math.PI},${gx},${gy})`}
          />
        )
      })}
      {/* Labels */}
      <text x={cx + ro + 12} y={cy + 5} fontSize={9} fill="#94a3b8">Ro</text>
      <text x={cx + ri + 3} y={cy - 6} fontSize={9} fill="#94a3b8">Ri</text>
      {/* Gage legend */}
      <rect x={8} y={262} width={8} height={8} fill="#d97706" rx={1} />
      <text x={20} y={271} fontSize={9} fill="#94a3b8">bending (top)</text>
      <rect x={88} y={262} width={8} height={8} fill="#0f9170" rx={1} />
      <text x={100} y={271} fontSize={9} fill="#94a3b8">shear 45° (side)</text>
    </svg>
  )
}

export default function ThreeBeamFTCalc({ unitSystem, onUnitChange }: Props) {
  const us = unitSystem === 'US'

  const [materialId, setMaterialId] = useState(DEFAULT_MATERIAL_ID)
  const [modulus,    setModulus]    = useState(() => { const m = getMaterial(DEFAULT_MATERIAL_ID); return us ? +(m.eGPa / GPA_PER_MPSI).toFixed(2) : m.eGPa })
  const [poisson,    setPoisson]    = useState(() => getMaterial(DEFAULT_MATERIAL_ID).nu)
  const [densityKgM3, setDensityKgM3] = useState(() => getMaterial(DEFAULT_MATERIAL_ID).densityKgM3)
  const [yieldMPa,   setYieldMPa]   = useState(() => getMaterial(DEFAULT_MATERIAL_ID).yieldMPa)
  const [gageFactor, setGageFactor] = useState(2.0)
  // mat alias for params compatibility
  const mat = { densityKgM3, yieldMPa }

  const lenUnit    = us ? 'in' : 'mm'
  const forceUnit  = us ? 'lbf' : 'N'
  const momentUnit = us ? 'in·lbf' : 'N·m'
  const modUnit    = us ? 'Mpsi' : 'GPa'

  // Geometry in display units
  const [outerRadius,  setOuterRadius]  = useState(us ? 1.38 : 35)
  const [innerRadius,  setInnerRadius]  = useState(us ? 0.59 : 15)
  const [beamWidth,    setBeamWidth]    = useState(us ? 0.39 : 10)
  const [beamThick,    setBeamThick]    = useState(us ? 0.16 : 4)
  const [gageDistRoot, setGageDistRoot] = useState(us ? 0.08 : 2)
  const [ratedForce,   setRatedForce]   = useState(us ? 90 : 400)
  const [ratedMoment,  setRatedMoment]  = useState(us ? 0.27 : 3.0)

  const [mode, setMode] = useState<'analytical' | '3d-fea'>('analytical')
  const [showSketch,  setShowSketch]  = useState(false)
  const [show3D,      setShow3D]      = useState(false)
  const [showInputs,  setShowInputs]  = useState(true)
  const [showMetrics, setShowMetrics] = useState(true)
  const [showChannels, setShowChannels] = useState(true)
  const [showMatrix,  setShowMatrix]  = useState(true)

  const toMm = (v: number) => us ? v * MM_PER_IN : v
  const toN  = (v: number) => us ? v * N_PER_LBF : v
  const toNm = (v: number) => us ? v * NM_PER_INLB : v

  const params = useMemo((): ThreeBeamFTParams => ({
    outerRadiusMm:           toMm(outerRadius),
    innerRadiusMm:           toMm(innerRadius),
    beamWidthMm:             toMm(beamWidth),
    beamThicknessMm:         toMm(beamThick),
    gageDistFromOuterRingMm: toMm(gageDistRoot),
    ratedForceN:             toN(ratedForce),
    ratedMomentNm:           toNm(ratedMoment),
    youngsModulusPa:         us ? modulus * GPA_PER_MPSI * 1e9 : modulus * 1e9,
    poissonRatio:            poisson,
    gageFactor,
    densityKgM3:             mat.densityKgM3,
    yieldStrengthPa:         mat.yieldMPa ? mat.yieldMPa * 1e6 : undefined,
  }), [us, outerRadius, innerRadius, beamWidth, beamThick, gageDistRoot, ratedForce, ratedMoment, modulus, poisson, gageFactor, densityKgM3, yieldMPa])

  const result = useMemo(() => designThreeBeamFT(params), [params])

  const sfColor = (sf: number) => sf > 2 ? '#166534' : sf > 1 ? '#92400e' : '#991b1b'
  const cnColor = (cn: number) => cn < 5 ? '#166534' : cn < 10 ? '#92400e' : '#991b1b'
  const bwColor = (bw: number) => bw > 500 ? '#166534' : bw > 200 ? '#92400e' : '#991b1b'

  const sens = result.sensitivity
  const rated = result.ratedOutput

  const CHANNELS = ['Fx', 'Fy', 'Fz', 'Mx', 'My', 'Mz'] as const

  return (
    <div className="bino-wrap">

      <WorkspaceControls mode={mode} onModeChange={setMode} unitSystem={unitSystem} onUnitChange={onUnitChange} />

      {/* Inputs */}
      <SectionToggle label="Inputs" open={showInputs} onToggle={() => setShowInputs(v => !v)} />
      {showInputs && (
        <>
          <div className="bino-grid" style={{ marginBottom: 4 }}>
            <MaterialSelector
              materialId={materialId}
              unitSystem={unitSystem}
              onSelect={sel => {
                setMaterialId(sel.id)
                setModulus(sel.eGPaDisplay)
                setPoisson(sel.nu)
                setDensityKgM3(sel.densityKgM3)
                setYieldMPa(sel.yieldMPa)
              }}
            />
          </div>
          <div className="bino-grid">
            <label>Outer Radius ({lenUnit})
              <input type="number" value={outerRadius} step={us ? 0.05 : 1} min={0.1} onChange={e => setOuterRadius(Number(e.target.value))} />
            </label>
            <label>Hub (Inner) Radius ({lenUnit})
              <input type="number" value={innerRadius} step={us ? 0.05 : 0.5} min={0.1} onChange={e => setInnerRadius(Number(e.target.value))} />
            </label>
            <label>Beam Width ({lenUnit})
              <input type="number" value={beamWidth} step={us ? 0.02 : 0.5} min={0.5} onChange={e => setBeamWidth(Number(e.target.value))} />
            </label>
            <label>Beam Thickness ({lenUnit})
              <input type="number" value={beamThick} step={us ? 0.01 : 0.1} min={0.1} onChange={e => setBeamThick(Number(e.target.value))} />
            </label>
            <label>Gage Dist from Root ({lenUnit})
              <input type="number" value={gageDistRoot} step={us ? 0.02 : 0.5} min={0} onChange={e => setGageDistRoot(Number(e.target.value))} />
            </label>
            <label>Rated Force Fx=Fy=Fz ({forceUnit})
              <input type="number" value={ratedForce} step={us ? 5 : 10} min={0.1} onChange={e => setRatedForce(Number(e.target.value))} />
            </label>
            <label>Rated Moment Mx=My=Mz ({momentUnit})
              <input type="number" value={ratedMoment} step={us ? 0.05 : 0.1} min={0.01} onChange={e => setRatedMoment(Number(e.target.value))} />
            </label>
            <label>Gage Factor
              <input type="number" value={gageFactor} step={0.1} min={0.5} max={5} onChange={e => setGageFactor(Number(e.target.value))} />
            </label>
          </div>

          {result.warnings.map((w, i) => (
            <p key={i} className="workspace-note" style={{ color: '#8b5e00' }}>{w}</p>
          ))}
          {!result.isValid && (
            <p className="workspace-note" style={{ color: '#a03020' }}>{result.error}</p>
          )}
        </>
      )}

      {/* Design Metrics */}
      {mode === 'analytical' && <SectionToggle label="Design Metrics" open={showMetrics} onToggle={() => setShowMetrics(v => !v)} />}
      {mode === 'analytical' && showMetrics && (
        <table className="bino-table">
          <tbody>
            <tr><th colSpan={3}>Decoupling</th></tr>
            <tr>
              <td>Condition Number</td>
              <td style={{ color: cnColor(result.conditionNumber), fontWeight: 600 }}>{show(result.conditionNumber, 2)}</td>
              <td>max/min rated output</td>
            </tr>
            <tr><th colSpan={3}>Strain &amp; Safety</th></tr>
            <tr>
              <td>Strain Safety Factor</td>
              <td style={{ color: sfColor(result.strainSafetyFactor), fontWeight: 600 }}>{show(result.strainSafetyFactor, 2)}</td>
              <td>1500 µε limit / peak strain</td>
            </tr>
            <tr><td>Peak Bending Strain</td><td>{show(result.strains.peakBendingCombined, 0)}</td><td>µε</td></tr>
            <tr><td>Fz Bending (per arm)</td><td>{show(result.strains.epsFzPerArm, 0)}</td><td>µε</td></tr>
            <tr><td>Fx Max Arm Bending</td><td>{show(result.strains.epsFxMaxArm, 0)}</td><td>µε</td></tr>
            <tr><td>Mx Max Arm Bending</td><td>{show(result.strains.epsMxMaxArm, 0)}</td><td>µε</td></tr>
            <tr><td>Shear (Mz)</td><td>{show(result.strains.epsShearMzArm, 0)}</td><td>µε</td></tr>
            {result.yieldSafetyFactor !== undefined && (
              <tr>
                <td>Yield Safety Factor</td>
                <td style={{ color: sfColor(result.yieldSafetyFactor), fontWeight: 600 }}>{result.yieldSafetyFactor.toFixed(2)}</td>
                <td>{mat.name}{mat.yieldMPa ? `, σy=${mat.yieldMPa} MPa` : ''}</td>
              </tr>
            )}
            <tr><th colSpan={3}>Stiffness &amp; Dynamics</th></tr>
            <tr><td>Axial Stiffness (Fz)</td><td>{show(result.axialStiffnessNPerM / 1000, 1)}</td><td>kN/m</td></tr>
            <tr><td>Natural Frequency — Fz</td><td>{show(result.naturalFrequencyFzHz, 0)}</td><td>Hz</td></tr>
            <tr><td>Natural Frequency — Fx = Fy</td><td>{show(result.naturalFrequencyFxHz, 0)}</td><td>Hz</td></tr>
            <tr><td>Natural Frequency — Mz</td><td>{show(result.naturalFrequencyMzHz, 0)}</td><td>Hz</td></tr>
            <tr>
              <td>Working Bandwidth</td>
              <td style={{ color: bwColor(result.workingBandwidthHz), fontWeight: 600 }}>{show(result.workingBandwidthHz, 0)}</td>
              <td>Hz (min fn / 4)</td>
            </tr>
            <tr><th colSpan={3}>Timoshenko Correction</th></tr>
            <tr>
              <td>Shear Factor Φ (Fz)</td>
              <td style={{ color: result.timoshenkoPhiFz > 0.1 ? '#92400e' : '#475569' }}>{result.timoshenkoPhiFz.toFixed(4)}</td>
              <td>{(result.timoshenkoPhiFz * 100).toFixed(1)}% stiffness reduction</td>
            </tr>
            <tr>
              <td>Shear Factor Φ (Fx/Fy)</td>
              <td style={{ color: result.timoshenkoPhiFx > 0.1 ? '#92400e' : '#475569' }}>{result.timoshenkoPhiFx.toFixed(4)}</td>
              <td>{(result.timoshenkoPhiFx * 100).toFixed(1)}% stiffness reduction</td>
            </tr>
          </tbody>
        </table>
      )}

      {/* Channel Sensitivity */}
      {mode === 'analytical' && <SectionToggle label="Channel Sensitivity & Rated Output" open={showChannels} onToggle={() => setShowChannels(v => !v)} />}
      {mode === 'analytical' && showChannels && (
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
                <td style={{ fontFamily: 'IBM Plex Mono, monospace', textAlign: 'right', color: '#1d4ed8' }}>{sens[ch].toFixed(5)}</td>
                <td>mV/V / {forceUnit}</td>
                <td style={{ fontFamily: 'IBM Plex Mono, monospace', textAlign: 'right', color: '#166534' }}>{rated[ch].toFixed(4)}</td>
                <td>mV/V</td>
              </tr>
            ))}
            {(['Mx', 'My', 'Mz'] as const).map(ch => (
              <tr key={ch}>
                <td><strong>{ch}</strong></td>
                <td style={{ fontFamily: 'IBM Plex Mono, monospace', textAlign: 'right', color: '#1d4ed8' }}>{sens[ch].toFixed(5)}</td>
                <td>mV/V / {momentUnit}</td>
                <td style={{ fontFamily: 'IBM Plex Mono, monospace', textAlign: 'right', color: '#166534' }}>{rated[ch].toFixed(4)}</td>
                <td>mV/V</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {/* Sensitivity Matrix */}
      {mode === 'analytical' && <SectionToggle label="Sensitivity Matrix S (mV/V per unit load)" open={showMatrix} onToggle={() => setShowMatrix(v => !v)} />}
      {mode === 'analytical' && showMatrix && (
        <div style={{ overflowX: 'auto' }}>
          <p className="workspace-note" style={{ marginBottom: 6 }}>
            3-arm 120° topology: Fz and Mz equal 4-arm sensitivity. Fx/Fy = 2/3·Fz. Mx/My = 1/3 of equivalent 4-arm sensor — weaker moment channels are the main trade-off.
          </p>
          <table style={{ borderCollapse: 'collapse', fontSize: 11 }}>
            <thead>
              <tr>
                <th style={{ padding: '5px 8px', background: '#f8fafc', color: '#94a3b8', fontWeight: 'normal', border: '1px solid #e2e8f0', fontFamily: 'IBM Plex Mono, monospace' }}>S</th>
                {CHANNELS.map(col => (
                  <th key={col} style={{ padding: '5px 10px', background: '#f8fafc', color: '#334155', fontWeight: 700, border: '1px solid #e2e8f0', fontFamily: 'IBM Plex Mono, monospace', minWidth: 72 }}>{col}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {CHANNELS.map(row => (
                <tr key={row}>
                  <td style={{ padding: '5px 8px', background: '#f8fafc', fontWeight: 700, border: '1px solid #e2e8f0', fontFamily: 'IBM Plex Mono, monospace' }}>{row}</td>
                  {CHANNELS.map(col => {
                    const isDiag = row === col
                    const val = isDiag ? sens[row] : 0
                    const formatted = isDiag ? val.toFixed(4) : '≈0'
                    const style: React.CSSProperties = isDiag
                      ? { background: '#edfcf2', color: '#166534', borderColor: '#bbf7d0' }
                      : { color: '#cbd5e1', borderColor: '#f1f5f9' }
                    return (
                      <td key={col} style={{ ...style, textAlign: 'center', fontFamily: 'IBM Plex Mono, monospace', fontSize: 11, padding: '5px 8px', border: '1px solid #e2e8f0' }}>
                        {formatted}
                      </td>
                    )
                  })}
                </tr>
              ))}
            </tbody>
          </table>
          <p className="workspace-note" style={{ marginTop: 4 }}>
            Force channels: mV/V/{forceUnit}. Moment channels: mV/V/{momentUnit}. Off-diagonal coupling = 0% for ideal geometry (real sensors: 1–5%).
          </p>
        </div>
      )}

      {/* 2D Sketch */}
      {mode === 'analytical' && <SectionToggle label="Diagrams" open={showSketch} onToggle={() => setShowSketch(v => !v)} />}
      {mode === 'analytical' && showSketch && (
        <div className="calc-diagram-2d" style={{ display: 'flex', justifyContent: 'center' }}>
          {result.isValid ? (
            <ThreeBeamSketch
              outerR={params.outerRadiusMm}
              innerR={params.innerRadiusMm}
              armW={params.beamWidthMm}
              gageD={params.gageDistFromOuterRingMm}
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
            <ThreeBeamModelPreview
              outerRadiusMm={params.outerRadiusMm}
              innerRadiusMm={params.innerRadiusMm}
              beamWidthMm={params.beamWidthMm}
              beamThicknessMm={params.beamThicknessMm}
              gageDistFromOuterRingMm={params.gageDistFromOuterRingMm}
              us={us}
            />
          )}
          {mode === '3d-fea' && (
            <ThreeBeamFea3DCalc
              outerRadiusMm={params.outerRadiusMm}
              innerRadiusMm={params.innerRadiusMm}
              beamWidthMm={params.beamWidthMm}
              beamThicknessMm={params.beamThicknessMm}
              E={params.youngsModulusPa}
              nu={params.poissonRatio}
              ratedForceN={params.ratedForceN}
            />
          )}
        </div>
      )}

    </div>
  )
}
