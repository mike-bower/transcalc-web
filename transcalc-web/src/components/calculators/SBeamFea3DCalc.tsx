import { useMemo, useState } from 'react'
import { useFeaSolver } from '../../hooks/useFeaSolver'
import { calculateSbeamStrain } from '../../domain/sbeam'
import FeaViewer3D from '../FeaViewer3D'
import FeaProgressPanel from '../FeaProgressPanel'

type MeshDensity = 'coarse' | 'medium' | 'fine'

interface Props {
  loadN:               number  // applied axial load (N), tension positive
  holeRadiusMm:        number  // hole radius (mm)
  beamWidthMm:         number  // beam width = loading span (mm)
  thicknessMm:         number  // out-of-plane thickness (mm)
  distBetweenGagesMm:  number  // distance between gage positions (mm)
  gageLengthMm:        number  // gage length (mm)
  modulusGPa:          number
  nu:                  number
}

const DENSITY_OPTIONS: { key: MeshDensity; label: string; nx: number; ny: number; nz: number }[] = [
  { key: 'coarse', label: 'Coarse (8×8×1)',   nx: 8,  ny: 8,  nz: 1 },
  { key: 'medium', label: 'Medium (14×14×2)', nx: 14, ny: 14, nz: 2 },
  { key: 'fine',   label: 'Fine (20×20×3)',   nx: 20, ny: 20, nz: 3 },
]

function fmtMicro(e: number)   { return (e * 1e6).toFixed(1) + ' µε' }
function fmtAnalytic(v: number) { return v.toFixed(1) + ' µε' }
function fmtPct(v: number)     { return v.toFixed(1) + '%' }

export default function SBeamFea3DCalc({
  loadN, holeRadiusMm, beamWidthMm, thicknessMm, distBetweenGagesMm, gageLengthMm, modulusGPa, nu,
}: Props) {
  const [density, setDensity] = useState<MeshDensity>('coarse')
  const { solve, solving, progress, solved, error, reset } = useFeaSolver()

  // S-beam mesh: square-ish in X-Y plane, holes in X-Y plane
  const L = beamWidthMm / 1000     // loading direction (X)
  const W = beamWidthMm / 1000     // cross-section in Y (same as L for S-beam)
  const H = thicknessMm / 1000     // out-of-plane (Z)
  const E = modulusGPa * 1e9
  const r_hole = holeRadiusMm / 1000

  const D_hole = distBetweenGagesMm / 1000
  const leftHoleX  = L / 2 - D_hole / 2
  const leftHoleY  = W * 0.25
  const rightHoleX = L / 2 + D_hole / 2
  const rightHoleY = W * 0.75

  const analytical = useMemo(() => {
    try {
      return calculateSbeamStrain({
        appliedLoad: loadN,
        holeRadius: holeRadiusMm,
        beamWidth: beamWidthMm,
        thickness: thicknessMm,
        distanceBetweenGages: distBetweenGagesMm,
        modulus: modulusGPa,
        gageLength: gageLengthMm,
        gageFactor: 2.1,
      })
    } catch { return null }
  }, [loadN, holeRadiusMm, beamWidthMm, thicknessMm, distBetweenGagesMm, modulusGPa, gageLengthMm])

  function handleSolve() {
    const opt = DENSITY_OPTIONS.find(o => o.key === density)!
    solve({
      meshParams: {
        L, W, H, nx: opt.nx, ny: opt.ny, nz: opt.nz,
        maskType: 'sbeam',
        sbeam: { leftHoleX, leftHoleY, rightHoleX, rightHoleY, r: r_hole },
      },
      solverParams: {
        E, nu,
        fixedGroup: 'x0',
        loadGroup:  'xL',
        loadVector: [loadN, 0, 0],
      },
    })
  }

  // Peak |exx| near hole stress concentration zones (within 2.5× hole radius of each hole)
  const feaPeakExx = (() => {
    if (!solved) return null
    const { mesh, result } = solved
    let maxAbsExx = 0
    const searchR = r_hole * 2.5
    for (let n = 0; n < mesh.nodeCount; n++) {
      const nx = mesh.nodes[n * 3]
      const ny = mesh.nodes[n * 3 + 1]
      const dLeft  = Math.hypot(nx - leftHoleX, ny - leftHoleY)
      const dRight = Math.hypot(nx - rightHoleX, ny - rightHoleY)
      if (dLeft > searchR && dRight > searchR) continue
      const e = Math.abs(result.nodalStrains[n].exx)
      if (e > maxAbsExx) maxAbsExx = e
    }
    return maxAbsExx > 0 ? maxAbsExx : null
  })()

  const errorPct = (analytical != null && feaPeakExx != null && analytical.maxStrain !== 0)
    ? Math.abs(feaPeakExx * 1e6 - analytical.maxStrain) / Math.abs(analytical.maxStrain) * 100
    : null

  const btnStyle = (active: boolean): React.CSSProperties => ({
    fontSize: '0.78rem', padding: '4px 10px', border: '1px solid', borderRadius: 3, cursor: 'pointer',
    background: active ? 'rgba(37,99,235,0.55)' : 'rgba(51,65,85,0.35)',
    borderColor: active ? 'rgba(96,165,250,0.7)' : 'rgba(71,85,105,0.4)', color: '#f8fafc',
  })

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <p className="workspace-note" style={{ fontSize: '0.75rem', marginTop: 0, marginBottom: -4 }}>
        S-beam with staggered cylindrical holes. FEA extracts peak |ε_xx| near each hole; analytical gives peak strain at gage edge.
      </p>

      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
        <span style={{ fontSize: '0.78rem', color: 'var(--muted)' }}>Mesh:</span>
        {DENSITY_OPTIONS.map(o => (
          <button key={o.key} style={btnStyle(density === o.key)} onClick={() => { setDensity(o.key); reset() }}>
            {o.label}
          </button>
        ))}
        <button
          onClick={handleSolve}
          disabled={solving}
          style={{
            padding: '4px 14px', borderRadius: 4, cursor: solving ? 'default' : 'pointer',
            background: solving ? '#374151' : '#1d4ed8', color: '#f8fafc',
            border: '1px solid rgba(96,165,250,0.5)', fontSize: '0.82rem', fontWeight: 600,
          }}
        >
          {solving ? 'Solving…' : 'Solve 3D FEA'}
        </button>
      </div>

      {error && <div className="workspace-note" style={{ color: '#f87171' }}>{error}</div>}

      <table className="bino-table" style={{ maxWidth: 520 }}>
        <thead>
          <tr><th /><th>Analytical</th><th>3D FEA (T10)</th><th>Error</th></tr>
        </thead>
        <tbody>
          <tr>
            <td>Peak ε_xx at hole</td>
            <td>{analytical ? fmtAnalytic(analytical.maxStrain) : '—'}</td>
            <td>{feaPeakExx != null ? fmtMicro(feaPeakExx) : '—'}</td>
            <td>{errorPct != null ? fmtPct(errorPct) : '—'}</td>
          </tr>
          <tr>
            <td>Avg ε_xx (gage)</td>
            <td>{analytical ? fmtAnalytic(analytical.avgStrain) : '—'}</td>
            <td>—</td>
            <td>—</td>
          </tr>
          <tr>
            <td>Max displacement</td>
            <td>—</td>
            <td>{solved ? (solved.result.maxDisplacement * 1e6).toFixed(3) + ' µm' : '—'}</td>
            <td>—</td>
          </tr>
        </tbody>
      </table>

      {solved && <FeaViewer3D mesh={solved.mesh} result={solved.result} height={760} />}

      {solving && progress && <FeaProgressPanel progress={progress} />}

      {!solved && !solving && (
        <div className="step-viewer loading" style={{ height: 400 }}>
          Select mesh density and press Solve 3D FEA
        </div>
      )}
    </div>
  )
}
