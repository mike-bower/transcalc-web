import { useState } from 'react'
import { useFeaSolver } from '../../hooks/useFeaSolver'
import FeaViewer3D from '../FeaViewer3D'
import FeaProgressPanel from '../FeaProgressPanel'

type MeshDensity = 'coarse' | 'medium' | 'fine'

interface Props {
  loadN:             number  // transverse bending force (N)
  beamHeightMm:      number  // overall beam height (y, mm)
  beamDepthMm:       number  // beam depth / width (z, mm)
  holeRadiusMm:      number  // hole radius (mm)
  holeSpacingMm:     number  // centre-to-centre distance between holes (mm)
  minThicknessMm:    number  // minimum ligament thickness (mm)
  modulusGPa:        number
  nu:                number
}

function totalLength(holeSpacingMm: number, radiusMm: number, minThickMm: number): number {
  return (holeSpacingMm + 2 * (radiusMm + minThickMm)) / 1000  // m
}

const DENSITY_OPTIONS: { key: MeshDensity; label: string; nx: number; ny: number; nz: number }[] = [
  { key: 'coarse', label: 'Coarse',  nx: 20, ny: 12, nz: 2 },
  { key: 'medium', label: 'Medium',  nx: 32, ny: 20, nz: 3 },
  { key: 'fine',   label: 'Fine',    nx: 48, ny: 30, nz: 4 },
]

function fmtMicro(e: number) { return (e * 1e6).toFixed(1) + ' με' }
function fmtPct(e: number)   { return (e * 100).toFixed(1) + '%' }

export default function BinocularFea3DCalc({
  loadN, beamHeightMm, beamDepthMm, holeRadiusMm, holeSpacingMm, minThicknessMm, modulusGPa, nu,
}: Props) {
  const [density, setDensity] = useState<MeshDensity>('coarse')
  const { solve, solving, progress, solved, error, reset } = useFeaSolver()

  const L = totalLength(holeSpacingMm, holeRadiusMm, minThicknessMm)
  const W = beamHeightMm / 1000
  const H = beamDepthMm  / 1000
  const E = modulusGPa * 1e9
  const r = holeRadiusMm / 1000

  const leftHoleX  = (minThicknessMm + holeRadiusMm) / 1000
  const rightHoleX = L - (minThicknessMm + holeRadiusMm) / 1000
  const holeCy     = W / 2

  const I_gross    = H * W ** 3 / 12
  const exxNominal = loadN * (L - leftHoleX) * (W / 2) / (E * I_gross)

  function handleSolve() {
    const opt = DENSITY_OPTIONS.find(o => o.key === density)!
    solve({
      meshParams: {
        L, W, H, nx: opt.nx, ny: opt.ny, nz: opt.nz,
        maskType: 'binocular',
        binocular: { leftHoleX, rightHoleX, holeCy, r },
      },
      solverParams: {
        E, nu,
        fixedGroup: 'x0',
        loadGroup:  'xL',
        loadVector: [0, -loadN, 0],
      },
    })
  }

  const peakExx = (() => {
    if (!solved) return null
    const { mesh, result } = solved
    let maxExx = 0
    const tol = r * 1.5
    for (let n = 0; n < mesh.nodeCount; n++) {
      const nx = mesh.nodes[n * 3]
      const ny2 = mesh.nodes[n * 3 + 1]
      if (Math.abs(nx - leftHoleX) < tol) {
        if (ny2 < W * 0.25 || ny2 > W * 0.75) {
          const e = Math.abs(result.nodalStrains[n].exx)
          if (e > maxExx) maxExx = e
        }
      }
    }
    return maxExx
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
          <button key={o.key} style={btnStyle(density === o.key)}
            onClick={() => { setDensity(o.key); reset() }}>
            {o.label} ({o.nx}×{o.ny}×{o.nz})
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
            <tr><th /><th>Nominal (beam theory, no hole)</th><th>FEA peak (bridge)</th><th>Kt (bending)</th></tr>
          </thead>
          <tbody>
            <tr>
              <td>ε_xx</td>
              <td>{fmtMicro(exxNominal)}</td>
              <td>{peakExx !== null ? fmtMicro(peakExx) : '—'}</td>
              <td>{peakExx !== null ? fmtPct(peakExx / exxNominal) : '—'}</td>
            </tr>
          </tbody>
        </table>
      )}

      {solved && <FeaViewer3D mesh={solved.mesh} result={solved.result} height={440} />}

      {solving && progress && <FeaProgressPanel progress={progress} />}

      {!solved && !solving && (
        <div className="step-viewer loading" style={{ height: 400 }}>
          Select mesh density and press Solve 3D FEA.
          Coarse (~5k tets) is fast; Fine (~20k tets) takes several seconds.
        </div>
      )}

      {solved && (
        <p className="workspace-note" style={{ fontSize: '0.75rem' }}>
          Staircase mesh: circular holes are approximated as axis-aligned steps.
          Use Fine mesh for better hole geometry. Kt = FEA peak / beam-theory nominal at left hole section.
        </p>
      )}
    </div>
  )
}

