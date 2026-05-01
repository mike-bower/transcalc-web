import { useState } from 'react'
import { useFeaSolver } from '../../hooks/useFeaSolver'
import FeaViewer3D from '../FeaViewer3D'
import FeaProgressPanel from '../FeaProgressPanel'

type MeshDensity = 'coarse' | 'medium' | 'fine'

interface Props {
  loadN:               number  // applied load (N)
  widthMm:             number  // beam width / depth (mm, Z direction)
  thicknessMm:         number  // beam thickness (mm, bending direction)
  distBetweenGagesMm:  number  // span between block faces (mm)
  modulusGPa:          number
  nu:                  number
}

// beam-centre-to-beam-centre separation = 2.5 × thickness
const BEAM_SEP_FACTOR = 2.5

const DENSITY_OPTIONS: { key: MeshDensity; label: string; nx: number; ny: number; nz: number }[] = [
  { key: 'coarse', label: 'Coarse (8×8×2)',    nx: 8,  ny: 8,  nz: 2 },
  { key: 'medium', label: 'Medium (12×12×3)',  nx: 12, ny: 12, nz: 3 },
  { key: 'fine',   label: 'Fine (20×16×4)',    nx: 20, ny: 16, nz: 4 },
]

function fmtMm(m: number)    { return (m * 1000).toFixed(3) + ' mm' }
function fmtMicro(e: number) { return (e * 1e6).toFixed(1) + ' με' }
function fmtPct(e: number)   { return (e * 100).toFixed(1) + '%' }

export default function DualBeamFea3DCalc({ loadN, widthMm, thicknessMm, distBetweenGagesMm, modulusGPa, nu }: Props) {
  const [density, setDensity] = useState<MeshDensity>('medium')
  const { solve, solving, progress, solved, error, reset } = useFeaSolver()

  const T        = thicknessMm / 1000           // beam thickness (m)
  const W_beam   = widthMm / 1000               // beam depth / width (m, Z direction)
  const L        = distBetweenGagesMm / 1000    // span (m)
  const beamSep  = BEAM_SEP_FACTOR * T          // centre-to-centre beam separation (m)
  const W_total  = beamSep + T                  // bounding box height in Y (m)
  const blockW   = L * 0.12                     // end-block width (m)
  const E        = modulusGPa * 1e9

  // Fixed-guided analytical values for two parallel beams
  // Peak bending strain at the block face (ε = M·c/I, M = F_arm·L/2)
  const exxAnalytical   = 3 * loadN * L / (2 * E * W_beam * T * T)
  // Right-block deflection: δ = F_arm·L³/(12EI) × 1 arm ×1/2 each = F·L³/(2EWT³)
  const deltaAnalytical = loadN * L ** 3 / (2 * E * W_beam * T ** 3)

  function handleSolve() {
    const opt = DENSITY_OPTIONS.find(o => o.key === density)!
    solve({
      meshParams: {
        L, W: W_total, H: W_beam,
        nx: opt.nx, ny: opt.ny, nz: opt.nz,
        maskType: 'dualbeam',
        dualbeam: { T, beamSep, blockW },
      },
      solverParams: {
        E, nu,
        fixedGroup: 'x0',
        loadGroup:  'xL',
        loadVector: [0, -loadN, 0],
      },
    })
  }

  // Peak |exx| in the first 20% of span (near the fixed left block)
  const rootExx = (() => {
    if (!solved) return null
    const { mesh, result } = solved
    let maxAbsExx = 0
    for (let n = 0; n < mesh.nodeCount; n++) {
      if (mesh.nodes[n * 3] < L * 0.2) {
        const e = Math.abs(result.nodalStrains[n].exx)
        if (e > maxAbsExx) maxAbsExx = e
      }
    }
    return maxAbsExx
  })()

  const btnStyle = (active: boolean): React.CSSProperties => ({
    fontSize: '0.78rem', padding: '4px 10px', border: '1px solid', borderRadius: 3, cursor: 'pointer',
    background: active ? 'rgba(37,99,235,0.55)' : 'rgba(51,65,85,0.35)',
    borderColor: active ? 'rgba(96,165,250,0.7)' : 'rgba(71,85,105,0.4)', color: '#f8fafc',
  })

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <p className="workspace-note" style={{ fontSize: '0.75rem', marginTop: 0, marginBottom: -4 }}>
        Model: two parallel beams with rigid end blocks. Left block fixed; load distributed on right block.
        Beam separation = {(BEAM_SEP_FACTOR).toFixed(1)}× thickness.
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
        <table className="bino-table" style={{ maxWidth: 460 }}>
          <thead>
            <tr><th /><th>Analytical</th><th>3D FEA (T10)</th><th>Error</th></tr>
          </thead>
          <tbody>
            <tr>
              <td>Peak ε_xx at block face</td>
              <td>{fmtMicro(exxAnalytical)}</td>
              <td>{rootExx !== null ? fmtMicro(rootExx) : '—'}</td>
              <td>{rootExx !== null ? fmtPct(Math.abs(rootExx - exxAnalytical) / exxAnalytical) : '—'}</td>
            </tr>
            <tr>
              <td>Right-block deflection</td>
              <td>{fmtMm(deltaAnalytical)}</td>
              <td>{fmtMm(solved.result.tipDeflection)}</td>
              <td>{fmtPct(Math.abs(solved.result.tipDeflection - deltaAnalytical) / deltaAnalytical)}</td>
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
