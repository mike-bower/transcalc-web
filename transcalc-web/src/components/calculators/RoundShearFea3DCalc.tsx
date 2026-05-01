import { useState } from 'react'
import { useFeaSolver } from '../../hooks/useFeaSolver'
import FeaViewer3D from '../FeaViewer3D'
import FeaProgressPanel from '../FeaProgressPanel'

type MeshDensity = 'coarse' | 'medium' | 'fine'

interface Props {
  loadN:        number  // applied transverse load (N)
  diameterMm:   number  // section diameter (mm)
  beamLengthMm: number  // beam length (mm)
  modulusGPa:   number
  nu:           number
}

const DENSITY_OPTIONS: { key: MeshDensity; label: string; nx: number; ny: number; nz: number }[] = [
  { key: 'coarse', label: 'Coarse (8×4×4)',   nx: 8,  ny: 4, nz: 4 },
  { key: 'medium', label: 'Medium (14×6×6)',  nx: 14, ny: 6, nz: 6 },
  { key: 'fine',   label: 'Fine (20×8×8)',    nx: 20, ny: 8, nz: 8 },
]

function fmtMicro(e: number) { return (e * 1e6).toFixed(2) + ' με' }
function fmtPct(e: number)   { return (e * 100).toFixed(1) + '%' }

export default function RoundShearFea3DCalc({ loadN, diameterMm, beamLengthMm, modulusGPa, nu }: Props) {
  const [density, setDensity] = useState<MeshDensity>('medium')
  const { solve, solving, progress, solved, error, reset } = useFeaSolver()

  const r = diameterMm / 2 / 1000
  const L = beamLengthMm / 1000
  const W = diameterMm / 1000
  const H = diameterMm / 1000
  const E = modulusGPa * 1e9
  const G = E / (2 * (1 + nu))

  // Max shear at neutral axis for circular section: τ = (4/3) * V / A
  const A = Math.PI * r * r
  const tau_analytical  = (4 / 3) * loadN / A
  const gamma_analytical = tau_analytical / G
  const exy_analytical  = gamma_analytical / 2

  function handleSolve() {
    const opt = DENSITY_OPTIONS.find(o => o.key === density)!
    solve({
      meshParams: {
        L, W, H, nx: opt.nx, ny: opt.ny, nz: opt.nz,
        maskType: 'round',
        round: { r },
      },
      solverParams: { E, nu, fixedGroup: 'x0', loadGroup: 'xL', loadVector: [0, -loadN, 0] },
    })
  }

  const feaMaxExy = (() => {
    if (!solved) return null
    const { mesh, result } = solved
    let maxExy = 0
    for (let n = 0; n < mesh.nodeCount; n++) {
      const nx = mesh.nodes[n * 3]
      const ny = mesh.nodes[n * 3 + 1]
      const nz = mesh.nodes[n * 3 + 2]
      // Near centre of cross-section and mid-span
      if (nx > L * 0.3 && nx < L * 0.7 &&
          Math.hypot(ny - W / 2, nz - H / 2) < r * 0.25) {
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
        Round cross-section approximated with staircase mesh.
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
              <td>Shear strain γ_xy (neutral axis)</td>
              <td>{fmtMicro(gamma_analytical)}</td>
              <td>{feaMaxExy !== null ? fmtMicro(feaMaxExy * 2) : '—'}</td>
              <td>{feaMaxExy !== null ? fmtPct(Math.abs(feaMaxExy * 2 - gamma_analytical) / gamma_analytical) : '—'}</td>
            </tr>
            <tr>
              <td>Tensor exy (neutral axis)</td>
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
