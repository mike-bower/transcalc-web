import { useState } from 'react'
import { useFeaSolver } from '../../hooks/useFeaSolver'
import FeaViewer3D from '../FeaViewer3D'
import FeaProgressPanel from '../FeaProgressPanel'

type MeshDensity = 'coarse' | 'medium' | 'fine'

interface Props {
  loadN:        number  // applied load (N), transverse (−z direction, through thickness)
  widthMm:      number  // beam width (y, mm)
  thicknessMm:  number  // beam thickness (z, mm)
  momentArmMm:  number  // beam length (x, mm)
  modulusGPa:   number
  nu:           number
}

const DENSITY_OPTIONS: { key: MeshDensity; label: string; nx: number; ny: number; nz: number }[] = [
  { key: 'coarse', label: 'Coarse (4×1×1)',  nx: 4,  ny: 1, nz: 1 },
  { key: 'medium', label: 'Medium (8×2×2)',  nx: 8,  ny: 2, nz: 2 },
  { key: 'fine',   label: 'Fine (16×4×4)',   nx: 16, ny: 4, nz: 4 },
]

function fmtMm(m: number): string    { return (m * 1000).toFixed(3) + ' mm' }
function fmtMicro(e: number): string { return (e * 1e6).toFixed(1) + ' με' }
function fmtPct(err: number): string { return (err * 100).toFixed(1) + '%' }

export default function CantileverFea3DCalc({ loadN, widthMm, thicknessMm, momentArmMm, modulusGPa, nu }: Props) {
  const [density, setDensity] = useState<MeshDensity>('medium')
  const { solve, solving, progress, solved, error, reset } = useFeaSolver()

  const L = momentArmMm  / 1000
  const W = widthMm      / 1000
  const H = thicknessMm  / 1000
  const E = modulusGPa * 1e9

  const I = W * H ** 3 / 12
  const deltaAnalytical = loadN * L ** 3 / (3 * E * I)
  const exxAnalytical   = 6 * loadN * L / (E * W * H ** 2)

  function handleSolve() {
    const opt = DENSITY_OPTIONS.find(o => o.key === density)!
    solve({
      meshParams: {
        L, W, H, nx: opt.nx, ny: opt.ny, nz: opt.nz,
        maskType: 'none',
      },
      solverParams: {
        E, nu,
        fixedGroup: 'x0',
        loadGroup:  'xL',
        loadVector: [0, 0, -loadN],
      },
    })
  }

  const rootExx = (() => {
    if (!solved) return null
    const { mesh, result } = solved
    let maxAbsExx = 0
    for (let n = 0; n < mesh.nodeCount; n++) {
      if (mesh.nodes[n * 3] < L * 0.15) {
        const e = Math.abs(result.nodalStrains[n].exx)
        if (e > maxAbsExx) maxAbsExx = e
      }
    }
    return maxAbsExx
  })()

  const btnStyle = (active: boolean): React.CSSProperties => ({
    fontSize: '0.78rem', padding: '4px 10px',
    border: '1px solid', borderRadius: 3, cursor: 'pointer',
    background: active ? 'rgba(37,99,235,0.55)' : 'rgba(51,65,85,0.35)',
    borderColor: active ? 'rgba(96,165,250,0.7)' : 'rgba(71,85,105,0.4)',
    color: '#f8fafc',
  })

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
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
        <table className="bino-table" style={{ maxWidth: 420 }}>
          <thead>
            <tr><th /><th>Analytical</th><th>3D FEA (T10)</th><th>Error</th></tr>
          </thead>
          <tbody>
            <tr>
              <td>Tip deflection</td>
              <td>{fmtMm(deltaAnalytical)}</td>
              <td>{fmtMm(solved.result.tipDeflection)}</td>
              <td>{fmtPct(Math.abs(solved.result.tipDeflection - deltaAnalytical) / deltaAnalytical)}</td>
            </tr>
            {rootExx !== null && (
              <tr>
                <td>Root ε_xx (peak)</td>
                <td>{fmtMicro(exxAnalytical)}</td>
                <td>{fmtMicro(rootExx)}</td>
                <td>{fmtPct(Math.abs(rootExx - exxAnalytical) / exxAnalytical)}</td>
              </tr>
            )}
          </tbody>
        </table>
      )}

      {solved && <FeaViewer3D mesh={solved.mesh} result={solved.result} height={420} />}

      {solving && progress && <FeaProgressPanel progress={progress} />}

      {!solved && !solving && (
        <div className="step-viewer loading" style={{ height: 400 }}>
          Select mesh density and press Solve 3D FEA
        </div>
      )}
    </div>
  )
}

