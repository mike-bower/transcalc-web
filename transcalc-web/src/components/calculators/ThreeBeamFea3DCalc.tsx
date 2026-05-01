import { useState } from 'react'
import { useFeaSolver } from '../../hooks/useFeaSolver'
import FeaViewer3D from '../FeaViewer3D'
import FeaProgressPanel from '../FeaProgressPanel'

type MeshDensity = 'coarse' | 'medium' | 'fine'

interface Props {
  outerRadiusMm:   number  // outer radius (mm)
  innerRadiusMm:   number  // inner hub radius (mm)
  beamWidthMm:     number  // arm width (mm)
  beamThicknessMm: number  // arm & body thickness (mm)
  E:               number  // Young's modulus (Pa)
  nu:              number
  ratedForceN:     number  // rated Fz load (N)
}

const DENSITY_OPTIONS: { key: MeshDensity; label: string; nx: number; ny: number; nz: number }[] = [
  { key: 'coarse', label: 'Coarse (24×24×1)', nx: 24, ny: 24, nz: 1 },
  { key: 'medium', label: 'Medium (40×40×2)', nx: 40, ny: 40, nz: 2 },
  { key: 'fine',   label: 'Fine (56×56×3)',   nx: 56, ny: 56, nz: 3 },
]

function fmtMm(m: number)    { return (m * 1000).toFixed(4) + ' mm' }
function fmtMicro(e: number) { return (e * 1e6).toFixed(1) + ' με' }
function fmtPct(e: number)   { return (e * 100).toFixed(1) + '%' }

export default function ThreeBeamFea3DCalc({ outerRadiusMm, innerRadiusMm, beamWidthMm, beamThicknessMm, E, nu, ratedForceN }: Props) {
  const [density, setDensity] = useState<MeshDensity>('coarse')
  const { solve, solving, progress, solved, error, reset } = useFeaSolver()

  const Ro = outerRadiusMm / 1000
  const Ri = innerRadiusMm / 1000
  const b  = beamWidthMm / 1000
  const t  = beamThicknessMm / 1000

  // Mesh bounding box: 2Ro × 2Ro × t
  const L = 2 * Ro, W = 2 * Ro, H = t

  // Analytical: 3 parallel cantilever arms, each carrying ratedForceN/3
  const Larm = Ro - Ri
  const I_arm = b * t ** 3 / 12
  const delta_analytical = (ratedForceN / 3) * Larm ** 3 / (3 * E * I_arm)
  const eps_root = 6 * (ratedForceN / 3) * Larm / (E * b * t ** 2)

  function handleSolve() {
    const opt = DENSITY_OPTIONS.find(o => o.key === density)!
    solve({
      meshParams: {
        L, W, H,
        nx: opt.nx, ny: opt.ny, nz: opt.nz,
        maskType: 'threebeam',
        threebeam: { outerRadius: Ro, innerRadius: Ri, halfWidth: b / 2 },
      },
      solverParams: {
        E, nu,
        fixedGroup: 'threebeam_outer',
        loadGroup:  'threebeam_hub',
        loadVector: [0, 0, -ratedForceN],
      },
    })
  }

  // Peak |exx| near the +X arm outer root
  const feaRootExx = (() => {
    if (!solved) return null
    const { mesh, result } = solved
    const hw = b / 2
    const cy = W / 2
    let max = 0
    for (let n = 0; n < mesh.nodeCount; n++) {
      const nx = mesh.nodes[n * 3]
      const ny = mesh.nodes[n * 3 + 1]
      const nz = mesh.nodes[n * 3 + 2]
      // Near +X arm outer root (exx) or +Y arm outer root (eyy, same magnitude)
      const nearXRoot = nx > 2 * Ro - Ro * 0.15 && Math.abs(ny - cy) < hw * 1.2
      const nearYRoot = ny > 2 * Ro - Ro * 0.15 && Math.abs(nx - cy) < hw * 1.2
      if ((nearXRoot || nearYRoot) && (nz < t * 0.15 || nz > t * 0.85)) {
        const ex = Math.abs(result.nodalStrains[n].exx)
        const ey = Math.abs(result.nodalStrains[n].eyy)
        if (ex > max) max = ex
        if (ey > max) max = ey
      }
    }
    return max > 0 ? max : null
  })()

  const btnStyle = (active: boolean): React.CSSProperties => ({
    fontSize: '0.78rem', padding: '4px 10px', border: '1px solid', borderRadius: 3, cursor: 'pointer',
    background: active ? 'rgba(37,99,235,0.55)' : 'rgba(51,65,85,0.35)',
    borderColor: active ? 'rgba(96,165,250,0.7)' : 'rgba(71,85,105,0.4)', color: '#f8fafc',
  })

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <p className="workspace-note" style={{ fontSize: '0.75rem', marginTop: 0, marginBottom: -4 }}>
        Load case: Fz = rated force ({ratedForceN.toFixed(0)} N) at hub · outer ring fixed. Three-arm staircase mesh. Coarse is fast (&lt;10 s); Fine may take 60–120 s.
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
          {solving ? 'Solving…' : 'Solve 3D FEA (Fz)'}
        </button>
      </div>

      {error && <div className="workspace-note" style={{ color: '#f87171' }}>{error}</div>}

      {solved && (
        <table className="bino-table" style={{ maxWidth: 480 }}>
          <thead>
            <tr><th /><th>Analytical (E-B)</th><th>3D FEA (T10)</th><th>Error</th></tr>
          </thead>
          <tbody>
            <tr>
              <td>Hub deflection (Fz)</td>
              <td>{fmtMm(delta_analytical)}</td>
              <td>{fmtMm(solved.result.tipDeflection)}</td>
              <td>{fmtPct(Math.abs(solved.result.tipDeflection - delta_analytical) / delta_analytical)}</td>
            </tr>
            {feaRootExx !== null && (
              <tr>
                <td>ε at arm root (gage)</td>
                <td>{fmtMicro(eps_root)}</td>
                <td>{fmtMicro(feaRootExx)}</td>
                <td>{fmtPct(Math.abs(feaRootExx - eps_root) / eps_root)}</td>
              </tr>
            )}
          </tbody>
        </table>
      )}

      {solved && <FeaViewer3D mesh={solved.mesh} result={solved.result} height={460} />}

      {solving && progress && <FeaProgressPanel progress={progress} />}

      {!solved && !solving && (
        <div className="step-viewer loading" style={{ height: 400 }}>
          Select mesh density and press Solve 3D FEA
        </div>
      )}
    </div>
  )
}
