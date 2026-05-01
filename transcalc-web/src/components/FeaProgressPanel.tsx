import type { FeaProgress } from '../hooks/useFeaSolver'

export default function FeaProgressPanel({ progress }: { progress: FeaProgress }) {
  const isPcg = progress.phase === 'PCG solver' && progress.maxIter > 1
  const pct = isPcg ? Math.min(100, Math.round((progress.iter / progress.maxIter) * 100)) : null
  return (
    <div style={{
      height: 200, display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center', gap: 14,
      background: 'rgba(15,23,42,0.75)', borderRadius: 6,
      border: '1px solid rgba(96,165,250,0.25)',
    }}>
      <div style={{
        width: 40, height: 40, borderRadius: '50%',
        border: '3px solid rgba(148,163,184,0.25)',
        borderTopColor: '#60a5fa',
        animation: 'fea-spin 0.85s linear infinite',
      }} />
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: '0.82rem', color: '#e2e8f0', letterSpacing: '0.02em' }}>
          {progress.phase}
        </div>
        {isPcg && (
          <>
            <div style={{ fontSize: '0.72rem', color: '#94a3b8', marginTop: 4 }}>
              iteration {progress.iter.toLocaleString()} / {progress.maxIter.toLocaleString()}
            </div>
            <div style={{ marginTop: 10, width: 180, height: 4, background: 'rgba(148,163,184,0.2)', borderRadius: 2 }}>
              <div style={{
                height: '100%', width: `${pct}%`,
                background: '#60a5fa', borderRadius: 2,
                transition: 'width 0.3s ease',
              }} />
            </div>
          </>
        )}
      </div>
    </div>
  )
}
