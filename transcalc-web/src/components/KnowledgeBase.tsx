import { useState, useMemo, useEffect } from 'react'
import { KB_ENTRIES, KB_TOPICS, searchKb, type KbTopic } from '../domain/knowledgeBase'
import type { KbOpenArgs } from './KbContext'

const CALC_LABELS: Record<string, string> = {
  bbcant:   'Cantilever Beam',
  bino:     'Binocular Beam',
  dualbb:   'Dual Beam',
  revbb:    'Reverse Beam',
  sbbeam:   'S-Beam',
  sqrcol:   'Square Column',
  rndsldc:  'Round Solid Column',
  rndhlwc:  'Round Hollow Column',
  shrsqr:   'Shear Square',
  shrrnd:   'Shear Round',
  shrrnd1:  'Shear Round S-Beam',
  sqrtor:   'Square Torque',
  rndsld:   'Round Solid Torque',
  rndhlw:   'Round Hollow Torque',
  pressure: 'Pressure Diaphragm',
  zvstemp:  'Zero vs Temp',
  zerobal:  'Zero Balance',
  span2pt:  'Span 2-Pt',
  span3pt:  'Span 3-Pt',
  optshunt: 'Shunt Optim',
  spanset:  'Span Set',
  simspan:  'Sim Span',
  sixaxisft:'6-DOF F/T',
  hexapod:  'Hexapod F/T',
  jts:      'Joint Torque',
  triaxisft:'3-Arm F/T',
}

type Props = {
  open: boolean
  onClose: () => void
  initialArgs?: KbOpenArgs
}

export default function KnowledgeBase({ open, onClose, initialArgs }: Props) {
  const [query, setQuery]             = useState('')
  const [activeTopic, setActiveTopic] = useState<KbTopic | 'All'>('All')
  const [selectedId, setSelectedId]   = useState<string>(KB_ENTRIES[0].id)

  // When opened with specific args, apply them
  useEffect(() => {
    if (!open) return
    if (initialArgs?.entryId) {
      setSelectedId(initialArgs.entryId)
      setQuery('')
      setActiveTopic('All')
    } else if (initialArgs?.calcKey) {
      setQuery('')
      setActiveTopic('All')
      const first = KB_ENTRIES.find(e => e.calcKeys.includes(initialArgs.calcKey!))
      if (first) setSelectedId(first.id)
    }
  }, [open, initialArgs])

  const filtered = useMemo(
    () => searchKb(KB_ENTRIES, query, activeTopic),
    [query, activeTopic]
  )

  // When the list changes, keep selection valid
  const selected = filtered.find(e => e.id === selectedId)
    ?? filtered[0]
    ?? KB_ENTRIES[0]

  // If filtering by calcKey from args (no topic/query set), show relevant entries first
  const displayList = useMemo(() => {
    if (query || activeTopic !== 'All' || !initialArgs?.calcKey) return filtered
    const calcKey = initialArgs.calcKey
    const relevant = filtered.filter(e => e.calcKeys.includes(calcKey))
    const others   = filtered.filter(e => !e.calcKeys.includes(calcKey))
    return [...relevant, ...others]
  }, [filtered, query, activeTopic, initialArgs])

  if (!open) return null

  const showingForCalc = !query && activeTopic === 'All' && initialArgs?.calcKey
  const relevantCount  = showingForCalc
    ? displayList.filter(e => e.calcKeys.includes(initialArgs!.calcKey!)).length
    : null

  return (
    <div className="help-overlay" onClick={onClose}>
      <section className="panel help-modal" onClick={e => e.stopPropagation()}
        style={{ maxWidth: 980 }}>

        <div className="help-header">
          <h2>Reference Library</h2>
          <div className="topbar-right">
            <input
              type="search"
              placeholder="Search title, author, keyword…"
              value={query}
              onChange={e => setQuery(e.target.value)}
              style={{ minWidth: 220 }}
            />
            <button className="export-btn" onClick={onClose}>Close</button>
          </div>
        </div>

        {/* Topic filter chips */}
        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '5px 6px', padding: '6px 16px 4px' }}>
          {(['All', ...KB_TOPICS] as const).map(t => (
            <button
              key={t}
              onClick={() => setActiveTopic(t)}
              style={{
                fontSize: 11, padding: '2px 10px', borderRadius: 12, cursor: 'pointer',
                border: '1px solid',
                borderColor: activeTopic === t ? 'rgba(96,165,250,0.7)' : 'rgba(71,85,105,0.4)',
                background:  activeTopic === t ? 'rgba(37,99,235,0.18)' : 'rgba(51,65,85,0.12)',
                color: activeTopic === t ? '#2563eb' : '#475569',
                fontWeight: activeTopic === t ? 700 : 400,
              }}
            >
              {t}
            </button>
          ))}
          <span style={{ marginLeft: 'auto', fontSize: 11, color: '#94a3b8' }}>
            {relevantCount != null
              ? `${relevantCount} relevant · ${displayList.length - relevantCount} other`
              : `${displayList.length} reference${displayList.length !== 1 ? 's' : ''}`}
          </span>
        </div>

        <div className="help-layout">
          {/* Entry list */}
          <div className="topic-list">
            {displayList.length === 0 && (
              <p style={{ padding: '12px 8px', fontSize: 12, color: '#94a3b8' }}>No matches.</p>
            )}
            {displayList.map((e, i) => {
              const isRelevant = showingForCalc && e.calcKeys.includes(initialArgs!.calcKey!)
              const isDivider  = showingForCalc && relevantCount != null
                && i === relevantCount && relevantCount > 0
              return (
                <span key={e.id}>
                  {isDivider && (
                    <div style={{ padding: '4px 8px', fontSize: 10, color: '#94a3b8',
                      textTransform: 'uppercase', letterSpacing: '0.06em', borderTop: '1px solid #e2e8f0' }}>
                      Other references
                    </div>
                  )}
                  <button
                    className={e.id === selected.id ? 'topic-item active' : 'topic-item'}
                    onClick={() => setSelectedId(e.id)}
                    style={{ alignItems: 'flex-start', gap: 2 }}
                  >
                    {isRelevant && (
                      <span style={{ fontSize: 9, color: '#2563eb', fontWeight: 700,
                        textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                        ● relevant
                      </span>
                    )}
                    <span style={{ fontWeight: 600, fontSize: 12, lineHeight: 1.3, textAlign: 'left' }}>
                      {e.title}
                    </span>
                    <small style={{ color: '#64748b' }}>
                      {e.authors.split(',')[0].split('&')[0].trim()} · {e.year}
                    </small>
                  </button>
                </span>
              )
            })}
          </div>

          {/* Entry detail */}
          <div className="preview" style={{ overflowY: 'auto' }}>
            <div style={{ padding: '4px 0' }}>
              <div className="preview-meta" style={{ marginBottom: 10 }}>
                <strong style={{ fontSize: 15, lineHeight: 1.35 }}>{selected.title}</strong>
                <span style={{ fontSize: 12, color: '#64748b' }}>{selected.authors} · {selected.year}</span>
                <span style={{ fontSize: 11, color: '#94a3b8', fontStyle: 'italic' }}>{selected.venue}</span>
              </div>

              <p style={{ fontSize: 13, lineHeight: 1.6, color: '#334155', marginBottom: 14 }}>
                {selected.abstract}
              </p>

              <div style={{ marginBottom: 14 }}>
                <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase',
                  letterSpacing: '0.06em', color: '#64748b', marginBottom: 6 }}>
                  Key Points
                </div>
                <ul style={{ margin: 0, paddingLeft: 18, fontSize: 12.5, lineHeight: 1.75, color: '#334155' }}>
                  {selected.keyPoints.map((pt, i) => <li key={i}>{pt}</li>)}
                </ul>
              </div>

              {selected.calcKeys.length > 0 && (
                <div style={{ marginBottom: 14 }}>
                  <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase',
                    letterSpacing: '0.06em', color: '#64748b', marginBottom: 6 }}>
                    Relevant Calculators
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
                    {selected.calcKeys.map(k => (
                      <span key={k} style={{
                        fontSize: 11, padding: '2px 8px', borderRadius: 10,
                        background: 'rgba(37,99,235,0.08)',
                        border: '1px solid rgba(37,99,235,0.2)',
                        color: '#2563eb',
                      }}>
                        {CALC_LABELS[k] ?? k}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {selected.topics.length > 0 && (
                <div style={{ marginBottom: 14 }}>
                  <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase',
                    letterSpacing: '0.06em', color: '#64748b', marginBottom: 6 }}>
                    Topics
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
                    {selected.topics.map(t => (
                      <button
                        key={t}
                        onClick={() => { setActiveTopic(t); setQuery('') }}
                        style={{
                          fontSize: 11, padding: '2px 8px', borderRadius: 10, cursor: 'pointer',
                          background: 'rgba(100,116,139,0.08)',
                          border: '1px solid rgba(100,116,139,0.25)',
                          color: '#475569',
                        }}
                      >
                        {t}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {selected.url && (
                <a
                  href={selected.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="export-btn"
                  style={{ display: 'inline-block', textDecoration: 'none' }}
                >
                  Open Paper ↗
                </a>
              )}
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
