import { useMemo, useState } from 'react'
import { calculateSpanSetResistance } from '../../domain/spanSet'

type UnitSystem = 'SI' | 'US'
type Props = { unitSystem: UnitSystem; onUnitChange: (next: UnitSystem) => void }

export default function SpanSetCalc({ unitSystem, onUnitChange }: Props) {
  const [measuredSpan, setMeasuredSpan] = useState(2.5)
  const [desiredSpan, setDesiredSpan] = useState(2.0)
  const [bridgeResistance, setBridgeResistance] = useState(350)
  const [totalRm, setTotalRm] = useState(0)

  const result = useMemo(() => {
    try {
      const v = calculateSpanSetResistance(measuredSpan, bridgeResistance, totalRm, desiredSpan)
      return { value: v, error: null }
    } catch (e) {
      return { value: null, error: e instanceof Error ? e.message : 'Calculation error' }
    }
  }, [measuredSpan, desiredSpan, bridgeResistance, totalRm])

  return (
    <div className="bino-wrap">
      <div className="workspace-controls">
        <div className="analysis-toggle">
          <button className={unitSystem === 'SI' ? 'active' : ''} onClick={() => onUnitChange('SI')}>SI</button>
          <button className={unitSystem === 'US' ? 'active' : ''} onClick={() => onUnitChange('US')}>US</button>
        </div>
      </div>

      <p className="workspace-note">Resistances are unit-independent (Ω). Spans in mV/V.</p>

      <div className="bino-grid">
        <label>Measured Span (mV/V)
          <input type="number" step="0.01" value={measuredSpan} onChange={e => setMeasuredSpan(+e.target.value)} />
        </label>
        <label>Desired Span (mV/V)
          <input type="number" step="0.01" value={desiredSpan} onChange={e => setDesiredSpan(+e.target.value)} />
        </label>
        <label>Bridge Resistance (Ω)
          <input type="number" step="1" value={bridgeResistance} onChange={e => setBridgeResistance(+e.target.value)} />
        </label>
        <label>Total R<sub>m</sub> (Ω)
          <input type="number" step="0.1" value={totalRm} onChange={e => setTotalRm(+e.target.value)} />
        </label>
      </div>

      {result.error && <p className="workspace-note comp-error">{result.error}</p>}

      {result.value !== null && !result.error && (
        <table className="bino-table">
          <thead><tr><th>Output</th><th>Value</th></tr></thead>
          <tbody>
            <tr>
              <td>Compensation Resistance</td>
              <td>{result.value.toFixed(4)} Ω</td>
            </tr>
            {result.value < 0 && (
              <tr>
                <td colSpan={2} className="comp-warn">
                  Negative result: desired span exceeds measured span — compensation not achievable by adding resistance.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      )}
    </div>
  )
}
