import { useState } from 'react'
import { useFeaSolver } from '../../hooks/useFeaSolver'
import FeaViewer3D from '../FeaViewer3D'
import FeaProgressPanel from '../FeaProgressPanel'

// Cross-beam (Maltese-cross) 3D FEA — Fz load case.
// BC: outer ring fixed (union of 4 arm-end faces), hub loaded with Fz in −Z.
// Analytical: 4 parallel cantilever arms, each carrying Fz/4.
//   δ_hub   = Fz·Larm³ / (E·b·t³)       [m]
//   ε_root  = 1.5·Fz·Leff / (E·b·t²)    [strain, at gage dist from outer ring]
//   Larm  = outerRadius − innerRadius
//   Leff  = Larm − gageDistFromOuterRing

type MeshDensity = 'coarse' | 'medium' | 'fine'

interface Props {
  outerRadiusMm:           number
  innerRadiusMm:           number
  beamWidthMm:             number
  beamThicknessMm:         number
  gageDistFromOuterRingMm: number
  E:                       number   // Pa
  nu:                      number
  ratedForceN:             number
}

// Mesh nx/ny = cells across the 2R span; nz = cells through thickness.
// We need ≥3 cells across beamWidth → nx ≥ ceil(2R / (beamWidth/3)).
// These presets target that constraint for a typical 35mm outer, 10mm arm.
const DENSITY_OPTIONS: { key: MeshDensity; label: string; nx: number; ny: number; nz: number }[] = [
  { key: 'coarse', label: 'Coarse', nx: 24, ny: 24, nz: 1 },
  { key: 'medium', label: 'Medium', nx: 40, ny: 40, nz: 2 },
  { key: 'fine',   label: 'Fine',   nx: 56, ny: 56, nz: 3 },
]

function fmtMm(m: number)    { return (m * 1000).toFixed(4) + ' mm' }
function fmtMicro(e: number) { return (e * 1e6).toFixed(1) + ' με' }
function fmtPct(e: number)   { return (e * 100).toFixed(1) + '%' }

export default function CrossBeamFea3DCalc({
  outerRadiusMm, innerRadiusMm, beamWidthMm, beamThicknessMm,
  gageDistFromOuterRingMm, E, nu, ratedForceN,
}: Props) {
  const [density, setDensity] = useState<MeshDensity>('coarse')
  const { solve, solving, progress, solved, error, reset } = useFeaSolver()

  // SI dimensions (m)
  const Ro = outerRadiusMm / 1000
  const Ri = innerRadiusMm / 1000
  const b  = beamWidthMm   / 1000
  const t  = beamThicknessMm / 1000
  const gd = gageDistFromOuterRingMm / 1000
  const Larm  = Ro - Ri            // full arm length
  const Leff  = Larm - gd          // effective arm to gage

  // Analytical targets (Euler-Bernoulli, 4 parallel arms sharing Fz)
  const I_strong      = b * t ** 3 / 12
  const deltaAnalytical = ratedForceN * Larm ** 3 / (4 * 3 * E * I_strong)  // = Fz·Larm³/(E·b·t³)
  const exxAnalytical   = 1.5 * ratedForceN * Leff / (E * b * t ** 2)       // peak at gage root (4 arms, factor absorbed)

  // Mesh bounding box: 2Ro × 2Ro × t, centred cross
  const L = 2 * Ro, W = 2 * Ro, H = t

  function handleSolve() {
    const opt = DENSITY_OPTIONS.find(o => o.key === density)!
    solve({
      meshParams: {
        L, W, H,
        nx: opt.nx, ny: opt.ny, nz: opt.nz,
        maskType: 'crossbeam',
        crossbeam: { outerRadius: Ro, innerRadius: Ri, halfWidth: b / 2 },
      },
      solverParams: {
        E, nu,
        fixedGroup: 'crossbeam_outer',
        loadGroup:  'crossbeam_hub',
        loadVector: [0, 0, -ratedForceN],
      },
    })
  }

  // Peak |exx| at the outer ring root of the +X arm (highest-moment location).
  // Search nodes in xL face group (x ≈ 2Ro) near arm centreline (y ≈ Ro) at z extremes.
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
      // Near the +X arm outer root
      const nearXRoot = nx > 2 * Ro - Ro * 0.15 && Math.abs(ny - cy) < hw * 1.2
      // Near the +Y arm outer root (exx→eyy by symmetry — report as exx for comparison)
      const nearYRoot = ny > 2 * Ro - Ro * 0.15 && Math.abs(nx - cy) < hw * 1.2
      if ((nearXRoot || nearYRoot) && (nz < t * 0.15 || nz > t * 0.85)) {
        const e = Math.abs(result.nodalStrains[n].exx)
        if (e > max) max = e
      }
    }
    // Also scan eyy for Y arms (same magnitude by symmetry, take overall max)
    for (let n = 0; n < mesh.nodeCount; n++) {
      const nx = mesh.nodes[n * 3]
      const ny = mesh.nodes[n * 3 + 1]
      const nz = mesh.nodes[n * 3 + 2]
      const nearYRoot = ny > 2 * Ro - Ro * 0.15 && Math.abs(nx - W / 2) < hw * 1.2
      if (nearYRoot && (nz < t * 0.15 || nz > t * 0.85)) {
        const e = Math.abs(result.nodalStrains[n].eyy)
        if (e > max) max = e
      }
    }
    return max > 0 ? max : null
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
        <span style={{ fontSize: '0.78rem', color: '#94a3b8' }}>Mesh:</span>
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
          {solving ? 'Solving…' : 'Solve 3D FEA (Fz)'}
        </button>
      </div>

      <p className="workspace-note" style={{ fontSize: '0.75rem', marginTop: -4 }}>
        Load case: Fz = rated force ({ratedForceN.toFixed(0)} N) applied at hub · outer ring fixed.
        Staircase mesh — hub and arm roots approximate circular geometry.
      </p>

      {error && <div className="workspace-note" style={{ color: '#f87171' }}>{error}</div>}

      {solved && (
        <table className="bino-table" style={{ maxWidth: 480 }}>
          <thead>
            <tr><th /><th>Analytical (E-B)</th><th>3D FEA (T10)</th><th>Error</th></tr>
          </thead>
          <tbody>
            <tr>
              <td>Hub deflection (Fz)</td>
              <td>{fmtMm(deltaAnalytical)}</td>
              <td>{fmtMm(solved.result.tipDeflection)}</td>
              <td>{fmtPct(Math.abs(solved.result.tipDeflection - deltaAnalytical) / deltaAnalytical)}</td>
            </tr>
            {feaRootExx !== null && (
              <tr>
                <td>ε at arm root (gage)</td>
                <td>{fmtMicro(exxAnalytical)}</td>
                <td>{fmtMicro(feaRootExx)}</td>
                <td>{fmtPct(Math.abs(feaRootExx - exxAnalytical) / exxAnalytical)}</td>
              </tr>
            )}
          </tbody>
        </table>
      )}

      {solved && <FeaViewer3D mesh={solved.mesh} result={solved.result} height={460} />}

      {solving && progress && <FeaProgressPanel progress={progress} />}

      {!solved && !solving && (
        <div className="step-viewer loading" style={{ height: 400 }}>
          Select mesh density and press Solve 3D FEA.
          Coarse is fast (&lt;5 s); Fine may take 30–60 s.
        </div>
      )}
    </div>
  )
}
