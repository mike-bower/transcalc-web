import { useMemo, useState } from 'react'
import { commonWireTypes, WireType, calculateZeroBalance } from '../../domain/zeroBalance'

type UnitSystem = 'SI' | 'US'
type Props = { unitSystem: UnitSystem; onUnitChange: (next: UnitSystem) => void }

const AWG_GAUGES = Array.from({ length: 21 }, (_, i) => 30 + i) // 30–50

export default function ZeroBalanceCalc({ unitSystem, onUnitChange }: Props) {
  const [wireTypeIdx, setWireTypeIdx] = useState(0)
  const [awgGauge, setAwgGauge] = useState(40)
  const [unbalance, setUnbalance] = useState(10)
  const [bridgeResistance, setBridgeResistance] = useState(350)

  const wireType: WireType = commonWireTypes[wireTypeIdx]
  const usUnits = unitSystem === 'US'

  const result = useMemo(() => {
    try {
      return {
        value: calculateZeroBalance({ unbalance, bridgeResistance, wireType, awgGauge, usUnits }),
        error: null,
      }
    } catch (e) {
      return { value: null, error: e instanceof Error ? e.message : 'Calculation error' }
    }
  }, [unbalance, bridgeResistance, wireType, awgGauge, usUnits])

  return (
    <div className="bino-wrap">
      <div className="workspace-controls">
        <div className="analysis-toggle">
          <button className={unitSystem === 'SI' ? 'active' : ''} onClick={() => onUnitChange('SI')}>SI</button>
          <button className={unitSystem === 'US' ? 'active' : ''} onClick={() => onUnitChange('US')}>US</button>
        </div>
      </div>

      <div className="bino-grid">
        <label>Wire Type
          <select value={wireTypeIdx} onChange={e => setWireTypeIdx(+e.target.value)}>
            {commonWireTypes.map((w, i) => (
              <option key={i} value={i}>{w.name}</option>
            ))}
          </select>
        </label>
        <label>AWG Gauge
          <select value={awgGauge} onChange={e => setAwgGauge(+e.target.value)}>
            {AWG_GAUGES.map(g => <option key={g} value={g}>AWG {g}</option>)}
          </select>
        </label>
        <label>Unbalance (mV/V)
          <input type="number" step="0.1" value={unbalance} onChange={e => setUnbalance(+e.target.value)} />
        </label>
        <label>Bridge Resistance (Ω)
          <input type="number" step="1" value={bridgeResistance} onChange={e => setBridgeResistance(+e.target.value)} />
        </label>
      </div>

      {result.error && <p className="workspace-note comp-error">{result.error}</p>}

      {result.value && (
        <table className="bino-table">
          <thead><tr><th>Output</th><th>Value</th></tr></thead>
          <tbody>
            <tr>
              <td>Compensation Resistance</td>
              <td>{result.value.resistanceNeeded.toFixed(4)} Ω</td>
            </tr>
            <tr>
              <td>Bridge Arm Value</td>
              <td>{result.value.bridgeArmValue.toFixed(4)} Ω</td>
            </tr>
            <tr>
              <td>Wire Length</td>
              <td>{result.value.wireLength.toFixed(2)} {result.value.lengthUnit}</td>
            </tr>
            <tr>
              <td>Wire TCR</td>
              <td>{result.value.compensationTCR.toFixed(4)} %/°C</td>
            </tr>
          </tbody>
        </table>
      )}
    </div>
  )
}
