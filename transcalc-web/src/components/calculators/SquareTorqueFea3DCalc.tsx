import { useState } from 'react'
import { useFeaSolver } from '../../hooks/useFeaSolver'
import FeaViewer3D from '../FeaViewer3D'
import FeaProgressPanel from '../FeaProgressPanel'

type MeshDensity = 'coarse' | 'medium' | 'fine'

interface Props {
  torqueNm:   number  // torque (N·m)
  sideMm:     number  // shaft side width (mm)
  lengthMm:   number  // shaft length (mm)
  modulusGPa: number
  nu:         number
}

const DENSITY_OPTIONS: { key: MeshDensity; label: string; nx: number; ny: number; nz: number }[] = [
  { key: 'coarse', label: 'Coarse (4×2×2)',  nx: 4,  ny: 2, nz: 2 },
  { key: 'medium', label: 'Medium (8×4×4)',  nx: 8,  ny: 4, nz: 4 },
  { key: 'fine',   label: 'Fine (16×6×6)',   nx: 16, ny: 6, nz: 6 },
]

function fmtMicro(e: number) { return (e * 1e6).toFixed(2) + ' με' }
function fmtMPa(s: number)   { return (s / 1e6).toFixed(3) + ' MPa' }
function fmtPct(e: number)   { return (e * 100).toFixed(1) + '%' }

export default function SquareTorqueFea3DCalc({ torqueNm, sideMm, lengthMm, modulusGPa, nu }: Props) {
  const [density, setDensity] = useState<MeshDensity>('medium')
  const { solve, solving, progress, solved, error, reset } = useFeaSolver()

  const a = sideMm / 1000
  const L = lengthMm / 1000
  const W = a
  const H = a
  const E = modulusGPa * 1e9
  const G = E / (2 * (1 + nu))

  // Timoshenko square shaft: τ_max ≈ T / (0.208 * a³)
  const tau_analytical = torqueNm / (0.208 * a * a * a)
  const gamma_max      = tau_analytical / G
  const exy_analytical = gamma_max / 2

  function handleSolve() {
    const opt = DENSITY_OPTIONS.find(o => o.key === density)!
    solve({
      meshParams: { L, W, H, nx: opt.nx, ny: opt.ny, nz: opt.nz, maskType: 'none' },
      solverParams: {
        E, nu,
        fixedGroup: 'x0',
        loadGroup:  'xL',
        loadVector: [0, 0, 0],
        torqueX: torqueNm,
      },
    })
  }

  const feaMaxExy = (() => {
    if (!solved) return null
    const { mesh, result } = solved
    let maxExy = 0
    for (let n = 0; n < mesh.nodeCount; n++) {
      if (mesh.nodes[n * 3] > L * 0.85) {
        const e = Math.abs(result.nodalStrains[n].exy)
        if (e > maxExy) maxExy = e
      }
    }
    return maxExy > 0 ? maxExy : null
  })()

  const btnStyle = (active: boolean): React.CSSProperties => ({
    fontSize: '0.78rem', padding: '4px 10px', border: '1px solid', borderRadius: 3, cursor: 'pointer',
    background: active ? 'rgba(37,99,235,0.55)' : 'rgba(51,65,85,0.35)',
    borderColor: active ? 'rgba(96,165,250,0.7)' : 'rgba(71,85,105,0.4)', color: '#f8fafc',
  })

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <p className="workspace-note" style={{ fontSize: '0.75rem', marginTop: 0, marginBottom: -4 }}>
        Load case: pure torsion Mx = T about shaft axis. Fixed: x=0 face. Load: distributed couple at x=L face.
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

      {solved && (
        <table className="bino-table" style={{ maxWidth: 480 }}>
          <thead>
            <tr><th /><th>Analytical</th><th>3D FEA (T10)</th><th>Error</th></tr>
          </thead>
          <tbody>
            <tr>
              <td>τ_max (face centre)</td>
              <td>{fmtMPa(tau_analytical)}</td>
              <td>{feaMaxExy !== null ? fmtMPa(feaMaxExy * 2 * G) : '—'}</td>
              <td>{feaMaxExy !== null ? fmtPct(Math.abs(feaMaxExy * 2 * G - tau_analytical) / tau_analytical) : '—'}</td>
            </tr>
            <tr>
              <td>γ_max (shear strain)</td>
              <td>{fmtMicro(gamma_max)}</td>
              <td>{feaMaxExy !== null ? fmtMicro(feaMaxExy * 2) : '—'}</td>
              <td>{feaMaxExy !== null ? fmtPct(Math.abs(feaMaxExy * 2 - gamma_max) / gamma_max) : '—'}</td>
            </tr>
            <tr>
              <td>exy (tensor shear)</td>
              <td>{fmtMicro(exy_analytical)}</td>
              <td>{feaMaxExy !== null ? fmtMicro(feaMaxExy) : '—'}</td>
              <td>{feaMaxExy !== null ? fmtPct(Math.abs(feaMaxExy - exy_analytical) / exy_analytical) : '—'}</td>
            </tr>
          </tbody>
        </table>
      )}

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
