import { useMemo, useState } from 'react'
import { useFeaSolver } from '../../hooks/useFeaSolver'
import { calculateRoundSBeamMaxExy } from '../../domain/shearBeams'
import FeaViewer3D from '../FeaViewer3D'
import FeaProgressPanel from '../FeaProgressPanel'

type MeshDensity = 'coarse' | 'medium' | 'fine'

interface Props {
  loadN:        number  // applied transverse load (N), in Y direction
  widthMm:      number  // section width, Z direction (mm)
  heightMm:     number  // section height, Y direction (mm)
  diameterMm:   number  // flange opening height in Y (mm)
  thicknessMm:  number  // web thickness in Z (mm)
  modulusGPa:   number
  nu:           number
}

// Beam length = 3× section height; cross-section resolution needs enough cells to resolve thin web
const DENSITY_OPTIONS: { key: MeshDensity; label: string; nx: number; ny: number; nz: number }[] = [
  { key: 'coarse', label: 'Coarse (6×8×8)',    nx: 6,  ny: 8,  nz: 8  },
  { key: 'medium', label: 'Medium (10×14×14)', nx: 10, ny: 14, nz: 14 },
  { key: 'fine',   label: 'Fine (16×20×20)',   nx: 16, ny: 20, nz: 20 },
]

function fmtMicro(e: number)    { return (e * 1e6).toFixed(2) + ' µε' }
function fmtAnalytic(v: number) { return v.toFixed(2) + ' µε' }
function fmtPct(v: number)      { return v.toFixed(1) + '%' }

export default function RoundSBeamShearFea3DCalc({
  loadN, widthMm, heightMm, diameterMm, thicknessMm, modulusGPa, nu,
}: Props) {
  const [density, setDensity] = useState<MeshDensity>('medium')
  const { solve, solving, progress, solved, error, reset } = useFeaSolver()

  // Beam runs along X; I-section in Y-Z plane
  const L = (heightMm / 1000) * 3   // beam length = 3× section height (shear formula is length-independent)
  const W = heightMm / 1000          // section height, Y direction
  const H = widthMm / 1000           // section width, Z direction
  const E = modulusGPa * 1e9
  const voidH = diameterMm / 1000    // flange opening height in Y (m)
  const webT  = thicknessMm / 1000   // web thickness in Z (m)

  const exy_analytical = useMemo(() => {
    try {
      return calculateRoundSBeamMaxExy({
        load: loadN,
        width: widthMm,
        height: heightMm,
        diameter: diameterMm,
        thickness: thicknessMm,
        modulus: modulusGPa * 1e9,
        poisson: nu,
        gageFactor: 2.1,
      })
    } catch { return null }
  }, [loadN, widthMm, heightMm, diameterMm, thicknessMm, modulusGPa, nu])

  function handleSolve() {
    const opt = DENSITY_OPTIONS.find(o => o.key === density)!
    solve({
      meshParams: {
        L, W, H, nx: opt.nx, ny: opt.ny, nz: opt.nz,
        maskType: 'shearweb',
        shearweb: { voidH, webT },
      },
      solverParams: { E, nu, fixedGroup: 'x0', loadGroup: 'xL', loadVector: [0, -loadN, 0] },
    })
  }

  // Max |exy| at neutral axis (Y ≈ W/2) in web zone (Z near H/2), mid-span (avoid BC artifacts)
  const feaMaxExy = (() => {
    if (!solved) return null
    const { mesh, result } = solved
    let maxExy = 0
    const webSearch = Math.max(webT * 2, H * 0.25)
    for (let n = 0; n < mesh.nodeCount; n++) {
      const nx = mesh.nodes[n * 3]
      const ny = mesh.nodes[n * 3 + 1]
      const nz = mesh.nodes[n * 3 + 2]
      if (nx < L * 0.25 || nx > L * 0.75) continue
      if (Math.abs(ny - W / 2) > W * 0.2) continue
      if (Math.abs(nz - H / 2) > webSearch) continue
      const e = Math.abs(result.nodalStrains[n].exy)
      if (e > maxExy) maxExy = e
    }
    return maxExy > 0 ? maxExy : null
  })()

  const errorPct = (exy_analytical != null && feaMaxExy != null && exy_analytical !== 0)
    ? Math.abs(feaMaxExy * 1e6 - exy_analytical) / Math.abs(exy_analytical) * 100
    : null

  const btnStyle = (active: boolean): React.CSSProperties => ({
    fontSize: '0.78rem', padding: '4px 10px', border: '1px solid', borderRadius: 3, cursor: 'pointer',
    background: active ? 'rgba(37,99,235,0.55)' : 'rgba(51,65,85,0.35)',
    borderColor: active ? 'rgba(96,165,250,0.7)' : 'rgba(71,85,105,0.4)', color: '#f8fafc',
  })

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <p className="workspace-note" style={{ fontSize: '0.75rem', marginTop: 0, marginBottom: -4 }}>
        I-section shear beam FEA. Beam length = 3× section height. Compares peak tensor shear strain exy at the neutral
        axis to the analytical first-moment-of-area formula. Higher mesh density better resolves thin webs.
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
            <td>Tensor exy (neutral axis)</td>
            <td>{exy_analytical != null ? fmtAnalytic(exy_analytical) : '—'}</td>
            <td>{feaMaxExy != null ? fmtMicro(feaMaxExy) : '—'}</td>
            <td>{errorPct != null ? fmtPct(errorPct) : '—'}</td>
          </tr>
          <tr>
            <td>Shear strain γ_xy = 2·exy</td>
            <td>{exy_analytical != null ? fmtAnalytic(exy_analytical * 2) : '—'}</td>
            <td>{feaMaxExy != null ? fmtMicro(feaMaxExy * 2) : '—'}</td>
            <td>{errorPct != null ? fmtPct(errorPct) : '—'}</td>
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
