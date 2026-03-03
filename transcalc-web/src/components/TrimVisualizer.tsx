import { useMemo, useState } from 'react'
import {
  LADDER_UNIT_KEYS,
  C01UnitKey, C11UnitKey, C12UnitKey, D01UnitKey, E01UnitKey,
  LadderC01Rungs, LadderC11Rungs, LadderC12Rungs, LadderD01Rungs, LadderE01SideRungs,
  RungState,
  solveC01Rungs, solveC11Rungs, solveC12Rungs, solveD01Rungs, solveE01SideRungs,
} from '../domain/ladderResistors'

type UnitSystem = 'SI' | 'US'
type Props = { unitSystem: UnitSystem; onUnitChange: (next: UnitSystem) => void }

type LadderFamily = 'C01' | 'C11' | 'C12' | 'D01' | 'E01'

const isCut = (state: RungState): boolean => {
  if (typeof state === 'boolean') return state
  return state === 1
}

// ── Section layouts ────────────────────────────────────────────────────────

type Section = { label: string; rungs: boolean[] }

function sectionsFromC01(r: LadderC01Rungs): Section[] {
  return [
    { label: 'FA', rungs: r.fa.map(isCut) },
    { label: 'SA', rungs: r.sa.map(isCut) },
    { label: 'B',  rungs: r.b.map(isCut)  },
    { label: 'FC', rungs: r.fc.map(isCut) },
    { label: 'SC', rungs: r.sc.map(isCut) },
  ]
}

function sectionsFromC11(r: LadderC11Rungs): Section[] {
  return [
    { label: 'A', rungs: r.a.map(isCut) },
    { label: 'B', rungs: r.b.map(isCut) },
    { label: 'C', rungs: r.c.map(isCut) },
    { label: 'D', rungs: r.d.map(isCut) },
  ]
}

function sectionsFromC12(r: LadderC12Rungs): Section[] {
  return [
    { label: 'FA', rungs: r.fa.map(isCut) },
    { label: 'SA', rungs: r.sa.map(isCut) },
    { label: 'B',  rungs: r.b.map(isCut)  },
    { label: 'C',  rungs: r.c.map(isCut)  },
  ]
}

function sectionsFromD01(r: LadderD01Rungs): Section[] {
  return [
    { label: 'FA', rungs: r.fa.map(isCut) },
    { label: 'FB', rungs: r.fb.map(isCut) },
    { label: 'FC', rungs: r.fc.map(isCut) },
  ]
}

function sectionsFromE01Side(r: LadderE01SideRungs): Section[] {
  return [
    { label: 'A', rungs: r.a.map(isCut) },
    { label: 'B', rungs: r.b.map(isCut) },
    { label: 'C', rungs: r.c.map(isCut) },
    { label: 'G', rungs: [isCut(r.g)] },
  ]
}

// ── Rung grid SVG ─────────────────────────────────────────────────────────

const CELL_W = 22
const CELL_H = 22
const CELL_GAP = 3
const SECTION_GAP = 10
const LABEL_W = 24
const PADDING = 8

function RungGrid({ sections, title }: { sections: Section[]; title?: string }) {
  const maxRungs = Math.max(...sections.map(s => s.rungs.length))
  const totalWidth = PADDING * 2 + LABEL_W + sections.reduce((sum, s) => sum + s.rungs.length * (CELL_W + CELL_GAP) + SECTION_GAP, 0)
  const totalHeight = PADDING * 2 + (title ? 18 : 0) + maxRungs * (CELL_H + CELL_GAP)

  let xCursor = PADDING + LABEL_W

  return (
    <svg
      width={totalWidth}
      height={totalHeight}
      style={{ display: 'block', maxWidth: '100%', overflow: 'visible' }}
    >
      {title && (
        <text x={PADDING} y={PADDING + 12} fontSize={11} fill="#214765" fontFamily="'IBM Plex Mono', monospace" fontWeight={600}>
          {title}
        </text>
      )}
      {sections.map((sec, si) => {
        const sectionX = xCursor
        const labelY = PADDING + (title ? 18 : 0)
        const cells = sec.rungs.map((cut, ri) => {
          const cx = sectionX + ri * (CELL_W + CELL_GAP)
          const cy = labelY
          return (
            <g key={ri}>
              <rect
                x={cx} y={cy}
                width={CELL_W} height={CELL_H}
                rx={4}
                fill={cut ? '#e8eef5' : '#1a8ecb'}
                stroke={cut ? '#b0bec5' : '#0f5e8a'}
                strokeWidth={1}
              />
              {cut ? (
                <>
                  <line
                    x1={cx + 5} y1={cy + 5} x2={cx + CELL_W - 5} y2={cy + CELL_H - 5}
                    stroke="#9aa8b4" strokeWidth={1.5} strokeLinecap="round"
                  />
                  <line
                    x1={cx + CELL_W - 5} y1={cy + 5} x2={cx + 5} y2={cy + CELL_H - 5}
                    stroke="#9aa8b4" strokeWidth={1.5} strokeLinecap="round"
                  />
                </>
              ) : (
                <text
                  x={cx + CELL_W / 2} y={cy + CELL_H / 2 + 4}
                  textAnchor="middle" fontSize={9}
                  fill="#fff" fontFamily="'IBM Plex Mono', monospace"
                >
                  {ri + 1}
                </text>
              )}
            </g>
          )
        })

        xCursor += sec.rungs.length * (CELL_W + CELL_GAP) + SECTION_GAP

        return (
          <g key={si}>
            <text
              x={sectionX + (sec.rungs.length * (CELL_W + CELL_GAP)) / 2 - CELL_GAP / 2}
              y={labelY - 4}
              textAnchor="middle"
              fontSize={9}
              fill="#556677"
              fontFamily="'IBM Plex Mono', monospace"
            >
              {sec.label}
            </text>
            {cells}
          </g>
        )
      })}
    </svg>
  )
}

// ── Main component ────────────────────────────────────────────────────────

export default function TrimVisualizer({ unitSystem, onUnitChange }: Props) {
  const [family, setFamily] = useState<LadderFamily>('D01')
  const [unitKey, setUnitKey] = useState<string>('cutd01')
  const [startResistance, setStartResistance] = useState(1.0)
  const [targetResistance, setTargetResistance] = useState(0.5)
  const [targetLeft, setTargetLeft] = useState(0.25)
  const [targetRight, setTargetRight] = useState(0.25)
  const [ohmSet, setOhmSet] = useState<'ohm40' | 'ohm80'>('ohm40')

  const unitKeys = LADDER_UNIT_KEYS[family.toLowerCase() as Lowercase<LadderFamily>]

  // Reset unit key when family changes
  const handleFamilyChange = (f: LadderFamily) => {
    setFamily(f)
    const keys = LADDER_UNIT_KEYS[f.toLowerCase() as Lowercase<LadderFamily>]
    setUnitKey(keys[0])
  }

  const result = useMemo(() => {
    try {
      switch (family) {
        case 'C01': {
          const r = solveC01Rungs(unitKey as C01UnitKey, { startResistance, targetResistance, ohmSet })
          return { kind: 'c01' as const, r, sections: sectionsFromC01(r.rungs) }
        }
        case 'C11': {
          const r = solveC11Rungs(unitKey as C11UnitKey, { startResistance, targetResistance })
          return { kind: 'c11' as const, r, sections: sectionsFromC11(r.rungs) }
        }
        case 'C12': {
          const r = solveC12Rungs(unitKey as C12UnitKey, { startResistance, targetResistance })
          return { kind: 'c12' as const, r, sections: sectionsFromC12(r.rungs) }
        }
        case 'D01': {
          const r = solveD01Rungs(unitKey as D01UnitKey, { startResistance, targetResistance })
          return { kind: 'd01' as const, r, sections: sectionsFromD01(r.rungs) }
        }
        case 'E01': {
          const left  = solveE01SideRungs(unitKey as E01UnitKey, { startResistance, targetResistance: targetLeft })
          const right = solveE01SideRungs(unitKey as E01UnitKey, { startResistance, targetResistance: targetRight })
          return {
            kind: 'e01' as const,
            left, right,
            leftSections: sectionsFromE01Side(left.rungs),
            rightSections: sectionsFromE01Side(right.rungs),
          }
        }
      }
    } catch (e) {
      return { kind: 'error' as const, message: e instanceof Error ? e.message : 'Calculation error' }
    }
  }, [family, unitKey, startResistance, targetResistance, targetLeft, targetRight, ohmSet])

  const isE01 = family === 'E01'
  const isC01 = family === 'C01'

  return (
    <div className="bino-wrap">
      <div className="workspace-controls">
        <div className="analysis-toggle">
          <button className={unitSystem === 'SI' ? 'active' : ''} onClick={() => onUnitChange('SI')}>SI</button>
          <button className={unitSystem === 'US' ? 'active' : ''} onClick={() => onUnitChange('US')}>US</button>
        </div>
      </div>

      <p className="workspace-note">
        Find the laser-cut rung pattern that achieves a target resistance in a trim resistor network.
        Blue cells are intact (conducting); gray ✕ cells are cut (removed).
      </p>

      <div className="bino-grid">
        <label>Network Family
          <select value={family} onChange={e => handleFamilyChange(e.target.value as LadderFamily)}>
            {(['C01', 'C11', 'C12', 'D01', 'E01'] as LadderFamily[]).map(f => (
              <option key={f} value={f}>{f}</option>
            ))}
          </select>
        </label>
        <label>Unit / Product
          <select value={unitKey} onChange={e => setUnitKey(e.target.value)}>
            {unitKeys.map(k => <option key={k} value={k}>{k}</option>)}
          </select>
        </label>
        {isC01 && (
          <label>Ohm Set
            <select value={ohmSet} onChange={e => setOhmSet(e.target.value as 'ohm40' | 'ohm80')}>
              <option value="ohm40">40 Ω</option>
              <option value="ohm80">80 Ω</option>
            </select>
          </label>
        )}
        <label>Start Resistance (Ω)
          <input type="number" step="0.1" value={startResistance} onChange={e => setStartResistance(+e.target.value)} />
        </label>
        {isE01 ? (
          <>
            <label>Target — Left Side (Ω)
              <input type="number" step="0.001" value={targetLeft} onChange={e => setTargetLeft(+e.target.value)} />
            </label>
            <label>Target — Right Side (Ω)
              <input type="number" step="0.001" value={targetRight} onChange={e => setTargetRight(+e.target.value)} />
            </label>
          </>
        ) : (
          <label>Target Resistance (Ω)
            <input type="number" step="0.001" value={targetResistance} onChange={e => setTargetResistance(+e.target.value)} />
          </label>
        )}
      </div>

      {result?.kind === 'error' && (
        <p className="workspace-note comp-error">{result.message}</p>
      )}

      {result && result.kind !== 'error' && (
        <>
          {result.kind === 'e01' ? (
            <>
              <div className="comp-section-label">Left Side</div>
              <div className="trim-summary">
                <span>Target: {targetLeft.toFixed(4)} Ω</span>
                <span>Achieved: {result.left.achievedResistance.toFixed(4)} Ω</span>
                <span>Error: {result.left.relativeErrorPct.toFixed(2)} %</span>
                {result.left.clipped !== 'none' && (
                  <span className="comp-warn">⚠ {result.left.clipped}</span>
                )}
              </div>
              <div className="trim-grid-wrap">
                <RungGrid sections={result.leftSections} />
              </div>

              <div className="comp-section-label">Right Side</div>
              <div className="trim-summary">
                <span>Target: {targetRight.toFixed(4)} Ω</span>
                <span>Achieved: {result.right.achievedResistance.toFixed(4)} Ω</span>
                <span>Error: {result.right.relativeErrorPct.toFixed(2)} %</span>
                {result.right.clipped !== 'none' && (
                  <span className="comp-warn">⚠ {result.right.clipped}</span>
                )}
              </div>
              <div className="trim-grid-wrap">
                <RungGrid sections={result.rightSections} />
              </div>
            </>
          ) : (
            <>
              <div className="trim-summary">
                <span>Target: {result.r.targetResistance.toFixed(4)} Ω</span>
                <span>Achieved: {result.r.achievedResistance.toFixed(4)} Ω</span>
                <span>Error: {result.r.relativeErrorPct.toFixed(2)} %</span>
                {result.r.clipped !== 'none' && (
                  <span className="comp-warn">⚠ {result.r.clipped}</span>
                )}
              </div>
              <div className="trim-grid-wrap">
                <RungGrid sections={result.sections} />
              </div>
            </>
          )}

          <div className="trim-legend">
            <span className="trim-legend-item trim-legend-intact">intact (conducting)</span>
            <span className="trim-legend-item trim-legend-cut">✕ cut (removed)</span>
          </div>
        </>
      )}
    </div>
  )
}
