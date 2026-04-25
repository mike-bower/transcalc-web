import { useMemo, useRef, useEffect, useState } from 'react'
import { spanWireTypes, WireType, calculateSpanTemperature2Pt } from '../../domain/spanTemperature2Pt'

type UnitSystem = 'SI' | 'US'
type Props = { unitSystem: UnitSystem; onUnitChange: (next: UnitSystem) => void }

export default function SpanTemp2PtCalc({ unitSystem, onUnitChange }: Props) {
  const [wireTypeIdx, setWireTypeIdx] = useState(0)
  const [resistorTCR, setResistorTCR] = useState(0.25)
  const [bridgeResistance, setBridgeResistance] = useState(350)
  const [lowTemp, setLowTemp] = useState(() => unitSystem === 'US' ? 32 : 0)
  const [lowOutput, setLowOutput] = useState(1.0)
  const [highTemp, setHighTemp] = useState(() => unitSystem === 'US' ? 212 : 100)
  const [highOutput, setHighOutput] = useState(10.0)

  const wireType: WireType = spanWireTypes[wireTypeIdx]
  const tempUnit = unitSystem === 'SI' ? '°C' : '°F'
  const tcrUnit  = unitSystem === 'SI' ? '%/°C' : '%/°F'

  const prevUnit = useRef<UnitSystem>(unitSystem)
  useEffect(() => {
    if (prevUnit.current === unitSystem) return
    prevUnit.current = unitSystem
    if (unitSystem === 'SI') {
      setLowTemp(v  => Math.round(((v  - 32) * 5 / 9) * 10) / 10)
      setHighTemp(v => Math.round(((v - 32) * 5 / 9) * 10) / 10)
    } else {
      setLowTemp(v  => Math.round((v  * 9 / 5 + 32) * 10) / 10)
      setHighTemp(v => Math.round((v * 9 / 5 + 32) * 10) / 10)
    }
  }, [unitSystem])

  const result = useMemo(() => {
    try {
      return {
        value: calculateSpanTemperature2Pt({
          lowTemperature: lowTemp,
          lowOutput,
          highTemperature: highTemp,
          highOutput,
          wireType,
          resistorTCR,
          bridgeResistance,
          usUnits: unitSystem === 'US',
        }),
        error: null,
      }
    } catch (e) {
      return { value: null, error: e instanceof Error ? e.message : 'Calculation error' }
    }
  }, [lowTemp, lowOutput, highTemp, highOutput, wireType, resistorTCR, bridgeResistance, unitSystem])

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
            {spanWireTypes.map((w, i) => <option key={i} value={i}>{w.name}</option>)}
          </select>
        </label>
        <label>Resistor TCR ({tcrUnit})
          <input type="number" step="0.01" value={resistorTCR} onChange={e => setResistorTCR(+e.target.value)} />
        </label>
        <label>Bridge Resistance (Ω)
          <input type="number" step="1" value={bridgeResistance} onChange={e => setBridgeResistance(+e.target.value)} />
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
      </div>

      {result.error && <p className="workspace-note comp-error">{result.error}</p>}

      {result.value && (
        <table className="bino-table">
          <thead><tr><th>Output</th><th>Value</th></tr></thead>
          <tbody>
            <tr>
              <td>Compensation Resistance</td>
              <td>{result.value.compensationResistance.toFixed(4)} Ω</td>
            </tr>
            <tr>
              <td>Sensitivity</td>
              <td>{result.value.sensitivity.toFixed(6)} mV/V/{tempUnit}</td>
            </tr>
            <tr>
              <td>Span TCR</td>
              <td>{result.value.spanTCR.toFixed(4)} %</td>
            </tr>
            <tr>
              <td>Span at Low Temp</td>
              <td>{result.value.spanLow.toFixed(4)} mV/V</td>
            </tr>
            <tr>
              <td>Span at High Temp</td>
              <td>{result.value.spanHigh.toFixed(4)} mV/V</td>
            </tr>
          </tbody>
        </table>
      )}
    </div>
  )
}
