import { useMemo, useState } from 'react'
import { calculateSimultaneousSpan } from '../../domain/simspan'

type UnitSystem = 'SI' | 'US'
type Props = { unitSystem: UnitSystem; onUnitChange: (next: UnitSystem) => void }

export default function SimSpanCalc({ unitSystem, onUnitChange }: Props) {
  const [lowSpan, setLowSpan] = useState(1.5)
  const [lowRBridge, setLowRBridge] = useState(1000)
  const [lowRMod, setLowRMod] = useState(100)

  const [ambientSpan, setAmbientSpan] = useState(5.0)
  const [ambientRBridge, setAmbientRBridge] = useState(1000)
  const [ambientRMod, setAmbientRMod] = useState(100)

  const [highSpan, setHighSpan] = useState(8.5)
  const [highRBridge, setHighRBridge] = useState(1000)
  const [highRMod, setHighRMod] = useState(100)

  const [desiredSpan, setDesiredSpan] = useState(0.0)

  const result = useMemo(() => {
    try {
      return calculateSimultaneousSpan({
        lowSpan, lowRBridge, lowRMod,
        ambientSpan, ambientRBridge, ambientRMod,
        highSpan, highRBridge, highRMod,
        desiredSpan,
      })
    } catch (e) {
      return { success: false, error: e instanceof Error ? e.message : 'Calculation error', rShunt: 0, rMod: 0, span: 0 }
    }
  }, [
    lowSpan, lowRBridge, lowRMod,
    ambientSpan, ambientRBridge, ambientRMod,
    highSpan, highRBridge, highRMod,
    desiredSpan,
  ])

  return (
    <div className="bino-wrap">
      <div className="workspace-controls">
        <div className="analysis-toggle">
          <button className={unitSystem === 'SI' ? 'active' : ''} onClick={() => onUnitChange('SI')}>SI</button>
          <button className={unitSystem === 'US' ? 'active' : ''} onClick={() => onUnitChange('US')}>US</button>
        </div>
      </div>

      <p className="workspace-note">Enter measured span (mV) and bridge data at three temperature points.</p>

      <div className="comp-section-label">Low Temperature Point</div>
      <div className="bino-grid">
        <label>Span (mV)
          <input type="number" step="0.1" value={lowSpan} onChange={e => setLowSpan(+e.target.value)} />
        </label>
        <label>Bridge Resistance (Ω)
          <input type="number" step="1" value={lowRBridge} onChange={e => setLowRBridge(+e.target.value)} />
        </label>
        <label>Mod Resistance (Ω)
          <input type="number" step="0.1" value={lowRMod} onChange={e => setLowRMod(+e.target.value)} />
        </label>
      </div>

      <div className="comp-section-label">Ambient Temperature Point</div>
      <div className="bino-grid">
        <label>Span (mV)
          <input type="number" step="0.1" value={ambientSpan} onChange={e => setAmbientSpan(+e.target.value)} />
        </label>
        <label>Bridge Resistance (Ω)
          <input type="number" step="1" value={ambientRBridge} onChange={e => setAmbientRBridge(+e.target.value)} />
        </label>
        <label>Mod Resistance (Ω)
          <input type="number" step="0.1" value={ambientRMod} onChange={e => setAmbientRMod(+e.target.value)} />
        </label>
      </div>

      <div className="comp-section-label">High Temperature Point</div>
      <div className="bino-grid">
        <label>Span (mV)
          <input type="number" step="0.1" value={highSpan} onChange={e => setHighSpan(+e.target.value)} />
        </label>
        <label>Bridge Resistance (Ω)
          <input type="number" step="1" value={highRBridge} onChange={e => setHighRBridge(+e.target.value)} />
        </label>
        <label>Mod Resistance (Ω)
          <input type="number" step="0.1" value={highRMod} onChange={e => setHighRMod(+e.target.value)} />
        </label>
      </div>

      <div className="bino-grid">
        <label>Desired Span (mV)
          <input type="number" step="0.1" value={desiredSpan} onChange={e => setDesiredSpan(+e.target.value)} />
        </label>
      </div>

      {result.error && <p className="workspace-note comp-error">{result.error}</p>}

      {result.success && (
        <table className="bino-table">
          <thead><tr><th>Output</th><th>Value</th></tr></thead>
          <tbody>
            <tr><td>Shunt Resistance</td><td>{result.rShunt.toFixed(4)} Ω</td></tr>
            <tr><td>Mod Resistance</td><td>{result.rMod.toFixed(4)} Ω</td></tr>
            <tr><td>Resulting Span</td><td>{result.span.toFixed(4)} mV</td></tr>
          </tbody>
        </table>
      )}
    </div>
  )
}
