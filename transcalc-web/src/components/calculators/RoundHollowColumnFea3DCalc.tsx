import { useState } from 'react'
import { useFeaSolver } from '../../hooks/useFeaSolver'
import FeaViewer3D from '../FeaViewer3D'
import FeaProgressPanel from '../FeaProgressPanel'

type MeshDensity = 'coarse' | 'medium' | 'fine'

interface Props {
  loadN:           number  // compressive axial force (N)
  outerDiameterMm: number  // outer diameter (mm)
  innerDiameterMm: number  // inner diameter (mm)
  lengthMm:        number  // column length (mm)
  modulusGPa:      number
  nu:              number
}

const DENSITY_OPTIONS: { key: MeshDensity; label: string; nx: number; ny: number; nz: number }[] = [
  { key: 'coarse', label: 'Coarse (4×6×6)',   nx: 4,  ny: 6,  nz: 6  },
  { key: 'medium', label: 'Medium (8×10×10)', nx: 8,  ny: 10, nz: 10 },
  { key: 'fine',   label: 'Fine (12×14×14)',  nx: 12, ny: 14, nz: 14 },
]

function fmtMicro(e: number) { return (e * 1e6).toFixed(1) + ' με' }
function fmtMm(m: number)    { return (m * 1000).toFixed(4) + ' mm' }
function fmtPct(e: number)   { return (e * 100).toFixed(1) + '%' }

export default function RoundHollowColumnFea3DCalc({ loadN, outerDiameterMm, innerDiameterMm, lengthMm, modulusGPa, nu }: Props) {
  const [density, setDensity] = useState<MeshDensity>('medium')
  const { solve, solving, progress, solved, error, reset } = useFeaSolver()

  const Ro = outerDiameterMm / 2 / 1000
  const Ri = innerDiameterMm / 2 / 1000
  const L = lengthMm / 1000
  const W = outerDiameterMm / 1000
  const H = outerDiameterMm / 1000
  const E = modulusGPa * 1e9
  const A = Math.PI * (Ro * Ro - Ri * Ri)

  const exxAnalytical   = loadN / (E * A)
  const deltaAnalytical = loadN * L / (E * A)

  function handleSolve() {
    const opt = DENSITY_OPTIONS.find(o => o.key === density)!
    solve({
      meshParams: {
        L, W, H, nx: opt.nx, ny: opt.ny, nz: opt.nz,
        maskType: 'round-hollow',
        roundHollow: { outerR: Ro, innerR: Ri },
      },
      solverParams: { E, nu, fixedGroup: 'x0', loadGroup: 'xL', loadVector: [-loadN, 0, 0] },
    })
  }

  const feaExx = (() => {
    if (!solved) return null
    const vals = solved.result.elementStrains.map(s => s.exx)
    return Math.abs(vals.reduce((a, v) => a + v, 0) / vals.length)
  })()

  const btnStyle = (active: boolean): React.CSSProperties => ({
    fontSize: '0.78rem', padding: '4px 10px', border: '1px solid', borderRadius: 3, cursor: 'pointer',
    background: active ? 'rgba(37,99,235,0.55)' : 'rgba(51,65,85,0.35)',
    borderColor: active ? 'rgba(96,165,250,0.7)' : 'rgba(71,85,105,0.4)', color: '#f8fafc',
  })

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <p className="workspace-note" style={{ fontSize: '0.75rem', marginTop: 0, marginBottom: -4 }}>
        Hollow round cross-section approximated with staircase mesh.
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
        <table className="bino-table" style={{ maxWidth: 440 }}>
          <thead>
            <tr><th /><th>Analytical</th><th>3D FEA (T10)</th><th>Error</th></tr>
          </thead>
          <tbody>
            <tr>
              <td>Axial shortening</td>
              <td>{fmtMm(deltaAnalytical)}</td>
              <td>{fmtMm(solved.result.tipDeflection)}</td>
              <td>{fmtPct(Math.abs(solved.result.tipDeflection - deltaAnalytical) / deltaAnalytical)}</td>
            </tr>
            {feaExx !== null && (
              <tr>
                <td>Mean ε_xx (axial)</td>
                <td>{fmtMicro(exxAnalytical)}</td>
                <td>{fmtMicro(feaExx)}</td>
                <td>{fmtPct(Math.abs(feaExx - exxAnalytical) / exxAnalytical)}</td>
              </tr>
            )}
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
