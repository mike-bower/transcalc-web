import { getEntriesForCalc } from '../domain/knowledgeBase'
import { useKb } from './KbContext'

type Props = { calcKey: string }

export default function KbSeeAlso({ calcKey }: Props) {
  const openKb = useKb()
  const entries = getEntriesForCalc(calcKey)
  if (entries.length === 0) return null

  return (
    <div style={{
      borderTop: '1px solid #e2e8f0',
      padding: '7px 16px',
      display: 'flex',
      flexWrap: 'wrap',
      alignItems: 'baseline',
      gap: '4px 8px',
      background: '#f8fafc',
      fontSize: 11.5,
    }}>
      <span style={{ color: '#94a3b8', fontWeight: 600, whiteSpace: 'nowrap' }}>
        See also:
      </span>
      {entries.map((e, i) => (
        <span key={e.id}>
          <button
            onClick={() => openKb({ entryId: e.id, calcKey })}
            style={{
              background: 'none', border: 'none', padding: 0, cursor: 'pointer',
              color: '#2563eb', fontSize: 11.5, textDecoration: 'underline',
              textDecorationColor: 'rgba(37,99,235,0.35)',
              textUnderlineOffset: 2,
            }}
          >
            {e.authors.split(',')[0].split('&')[0].trim()} ({e.year})
          </button>
          {i < entries.length - 1 && <span style={{ color: '#cbd5e1' }}> · </span>}
        </span>
      ))}
    </div>
  )
}
