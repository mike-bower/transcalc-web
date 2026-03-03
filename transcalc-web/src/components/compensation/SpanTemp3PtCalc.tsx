import { useMemo, useState } from 'react'
import { calculateSpanTemperature3Pt } from '../../domain/spanTemperature3Pt'

type UnitSystem = 'SI' | 'US'
type Props = { unitSystem: UnitSystem; onUnitChange: (next: UnitSystem) => void }

export default function SpanTemp3PtCalc({ unitSystem, onUnitChange }: Props) {
  const [resistorTCR, setResistorTCR] = useState(0.25)
  const [bridgeResistance, setBridgeResistance] = useState(350)
  const [lowTemp, setLowTemp] = useState(32)
  const [lowOutput, setLowOutput] = useState(1.0)
  const [midTemp, setMidTemp] = useState(122)
  const [midOutput, setMidOutput] = useState(5.5)
  const [highTemp, setHighTemp] = useState(212)
  const [highOutput, setHighOutput] = useState(9.5)

  const tempUnit = unitSystem === 'SI' ? '°C' : '°F'

  const result = useMemo(() => {
    try {
      return {
        value: calculateSpanTemperature3Pt({
          lowPoint:  { temperature: lowTemp,  output: lowOutput },
          midPoint:  { temperature: midTemp,  output: midOutput },
          highPoint: { temperature: highTemp, output: highOutput },
          resistorTCR,
          bridgeResistance,
          usUnits: unitSystem === 'US',
        }),
        error: null,
      }
    } catch (e) {
      return { value: null, error: e instanceof Error ? e.message : 'Calculation error' }
    }
  }, [lowTemp, lowOutput, midTemp, midOutput, highTemp, highOutput, resistorTCR, bridgeResistance, unitSystem])

  return (
    <div className="bino-wrap">
      <div className="workspace-controls">
        <div className="analysis-toggle">
          <button className={unitSystem === 'SI' ? 'active' : ''} onClick={() => onUnitChange('SI')}>SI</button>
          <button className={unitSystem === 'US' ? 'active' : ''} onClick={() => onUnitChange('US')}>US</button>
        </div>
      </div>

      <div className="bino-grid">
        <label>Resistor TCR (%/unit)
          <input type="number" step="0.01" value={resistorTCR} onChange={e => setResistorTCR(+e.target.value)} />
        </label>
        <label>Bridge Resistance (Ω)
          <input type="number" step="1" value={bridgeResistance} onChange={e => setBridgeResistance(+e.target.value)} />
        </label>
      </div>

      <div className="comp-section-label">Low Calibration Point</div>
      <div className="bino-grid">
        <label>Temperature ({tempUnit})
          <input type="number" value={lowTemp} onChange={e => setLowTemp(+e.target.value)} />
        </label>
        <label>Output (mV/V)
          <input type="number" step="0.001" value={lowOutput} onChange={e => setLowOutput(+e.target.value)} />
        </label>
      </div>

      <div className="comp-section-label">Mid Calibration Point</div>
      <div className="bino-grid">
        <label>Temperature ({tempUnit})
          <input type="number" value={midTemp} onChange={e => setMidTemp(+e.target.value)} />
        </label>
        <label>Output (mV/V)
          <input type="number" step="0.001" value={midOutput} onChange={e => setMidOutput(+e.target.value)} />
        </label>
      </div>

      <div className="comp-section-label">High Calibration Point</div>
      <div className="bino-grid">
        <label>Temperature ({tempUnit})
          <input type="number" value={highTemp} onChange={e => setHighTemp(+e.target.value)} />
        </label>
        <label>Output (mV/V)
          <input type="number" step="0.001" value={highOutput} onChange={e => setHighOutput(+e.target.value)} />
        </label>
      </div>

      {result.error && <p className="workspace-note comp-error">{result.error}</p>}

      {result.value && (
        <table className="bino-table">
          <thead><tr><th>Output</th><th>Value</th></tr></thead>
          <tbody>
            <tr><td>Low Compensation</td><td>{result.value.lowCompensation.toFixed(4)} Ω</td></tr>
            <tr><td>Mid Compensation</td><td>{result.value.midCompensation.toFixed(4)} Ω</td></tr>
            <tr><td>High Compensation</td><td>{result.value.highCompensation.toFixed(4)} Ω</td></tr>
            <tr><td>Average Sensitivity</td><td>{result.value.averageSensitivity.toFixed(6)} mV/V/{tempUnit}</td></tr>
            <tr><td>Non-linearity</td><td>{result.value.nonlinearity.toFixed(2)} %</td></tr>
            <tr><td>Regression Coeff</td><td>{result.value.regressionCoeff.toFixed(4)}</td></tr>
            <tr><td>Compensation Method</td><td>{result.value.compensationMethod}</td></tr>
          </tbody>
        </table>
      )}
    </div>
  )
}
