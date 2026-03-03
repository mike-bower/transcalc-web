import { useMemo, useRef, useEffect, useState } from 'react'
import { WIRE_TYPES, WireTypeName, getResistorTcr, calculateZeroVsTemp } from '../../domain/zeroVsTemp'

type UnitSystem = 'SI' | 'US'
type Props = { unitSystem: UnitSystem; onUnitChange: (next: UnitSystem) => void }

export default function ZeroVsTempCalc({ unitSystem, onUnitChange }: Props) {
  const [wireType, setWireType] = useState<WireTypeName>('Balco')
  const [lowTemp, setLowTemp] = useState(() => unitSystem === 'US' ? 32 : 0)
  const [lowOutput, setLowOutput] = useState(0)
  const [highTemp, setHighTemp] = useState(() => unitSystem === 'US' ? 212 : 100)
  const [highOutput, setHighOutput] = useState(1)
  const [bridgeResistance, setBridgeResistance] = useState(350)

  const tempUnit = unitSystem === 'SI' ? '°C' : '°F'
  const resistorTcr = getResistorTcr(wireType, unitSystem)

  const prevUnit = useRef<UnitSystem>(unitSystem)
  useEffect(() => {
    if (prevUnit.current === unitSystem) return
    prevUnit.current = unitSystem
    if (unitSystem === 'SI') {
      setLowTemp(v => Math.round(((v - 32) * 5 / 9) * 10) / 10)
      setHighTemp(v => Math.round(((v - 32) * 5 / 9) * 10) / 10)
    } else {
      setLowTemp(v => Math.round((v * 9 / 5 + 32) * 10) / 10)
      setHighTemp(v => Math.round((v * 9 / 5 + 32) * 10) / 10)
    }
  }, [unitSystem])

  const result = useMemo(() => {
    try {
      return {
        value: calculateZeroVsTemp({
          lowTemp, lowOutput, highTemp, highOutput,
          resistorTcr, bridgeResistance, units: unitSystem,
        }),
        error: null,
      }
    } catch (e) {
      return { value: null, error: e instanceof Error ? e.message : 'Calculation error' }
    }
  }, [lowTemp, lowOutput, highTemp, highOutput, resistorTcr, bridgeResistance, unitSystem])

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
          <select value={wireType} onChange={e => setWireType(e.target.value as WireTypeName)}>
            {(Object.keys(WIRE_TYPES) as WireTypeName[]).map(k => (
              <option key={k} value={k}>{WIRE_TYPES[k].name}</option>
            ))}
          </select>
        </label>
        <label>Resistor TCR ({unitSystem === 'SI' ? '%/°C' : '%/°F'})
          <input type="number" readOnly value={resistorTcr.toFixed(4)} className="input-readonly" />
        </label>
        <label>Low Temperature ({tempUnit})
          <input type="number" value={lowTemp} onChange={e => setLowTemp(+e.target.value)} />
        </label>
        <label>Low Output (mV/V)
          <input type="number" step="0.001" value={lowOutput} onChange={e => setLowOutput(+e.target.value)} />
        </label>
        <label>High Temperature ({tempUnit})
          <input type="number" value={highTemp} onChange={e => setHighTemp(+e.target.value)} />
        </label>
        <label>High Output (mV/V)
          <input type="number" step="0.001" value={highOutput} onChange={e => setHighOutput(+e.target.value)} />
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
              <td>{result.value.resistance.toFixed(4)} Ω</td>
            </tr>
            <tr>
              <td>Bridge Arm</td>
              <td>{result.value.bridgeArm === 'minus-s-minus' ? '−S / −' : '+S / −'}</td>
            </tr>
            <tr>
              <td>Compensator Type</td>
              <td>{result.value.useWire ? 'Wire (> 0.5 Ω)' : 'E01 Resistor (≤ 0.5 Ω)'}</td>
            </tr>
          </tbody>
        </table>
      )}
    </div>
  )
}
