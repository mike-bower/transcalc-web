import { useMemo, useRef, useEffect, useState } from 'react'
import { calculateOptimalShuntResistance } from '../../domain/shuntoptim'

type UnitSystem = 'SI' | 'US'
type Props = { unitSystem: UnitSystem; onUnitChange: (next: UnitSystem) => void }

export default function ShuntOptimCalc({ unitSystem, onUnitChange }: Props) {
  const [rmBridge, setRmBridge] = useState(350)
  const [rmTempCoeffPpm, setRmTempCoeffPpm] = useState(200)
  const [tempLow, setTempLow] = useState(() => unitSystem === 'US' ? -40 : -40)
  const [tempAmbient, setTempAmbient] = useState(() => unitSystem === 'US' ? 75 : 24)
  const [tempHigh, setTempHigh] = useState(() => unitSystem === 'US' ? 212 : 100)

  const tempUnit = unitSystem === 'SI' ? '°C' : '°F'
  const toC = (v: number) => unitSystem === 'US' ? (v - 32) * 5 / 9 : v

  const prevUnit = useRef<UnitSystem>(unitSystem)
  useEffect(() => {
    if (prevUnit.current === unitSystem) return
    prevUnit.current = unitSystem
    if (unitSystem === 'SI') {
      setTempLow(v => Math.round(((v - 32) * 5 / 9) * 10) / 10)
      setTempAmbient(v => Math.round(((v - 32) * 5 / 9) * 10) / 10)
      setTempHigh(v => Math.round(((v - 32) * 5 / 9) * 10) / 10)
    } else {
      setTempLow(v => Math.round((v * 9 / 5 + 32) * 10) / 10)
      setTempAmbient(v => Math.round((v * 9 / 5 + 32) * 10) / 10)
      setTempHigh(v => Math.round((v * 9 / 5 + 32) * 10) / 10)
    }
  }, [unitSystem])

  const result = useMemo(() => {
    try {
      const v = calculateOptimalShuntResistance(
        rmBridge,
        rmTempCoeffPpm,
        toC(tempLow),
        toC(tempAmbient),
        toC(tempHigh),
      )
      return { value: v, error: null }
    } catch (e) {
      return { value: null, error: e instanceof Error ? e.message : 'Calculation error' }
    }
  }, [rmBridge, rmTempCoeffPpm, tempLow, tempAmbient, tempHigh, unitSystem])

  return (
    <div className="bino-wrap">
      <div className="workspace-controls">
        <div className="analysis-toggle">
          <button className={unitSystem === 'SI' ? 'active' : ''} onClick={() => onUnitChange('SI')}>SI</button>
          <button className={unitSystem === 'US' ? 'active' : ''} onClick={() => onUnitChange('US')}>US</button>
        </div>
      </div>

      <div className="bino-grid">
        <label>Bridge Resistance (Ω)
          <input type="number" step="1" value={rmBridge} onChange={e => setRmBridge(+e.target.value)} />
        </label>
        <label>Bridge TCR (ppm/°C)
          <input type="number" step="10" value={rmTempCoeffPpm} onChange={e => setRmTempCoeffPpm(+e.target.value)} />
        </label>
        <label>Low Temperature ({tempUnit})
          <input type="number" value={tempLow} onChange={e => setTempLow(+e.target.value)} />
        </label>
        <label>Ambient Temperature ({tempUnit})
          <input type="number" value={tempAmbient} onChange={e => setTempAmbient(+e.target.value)} />
        </label>
        <label>High Temperature ({tempUnit})
          <input type="number" value={tempHigh} onChange={e => setTempHigh(+e.target.value)} />
        </label>
      </div>

      {result.error && <p className="workspace-note comp-error">{result.error}</p>}

      {result.value !== null && !result.error && (
        <table className="bino-table">
          <thead><tr><th>Output</th><th>Value</th></tr></thead>
          <tbody>
            <tr>
              <td>Optimal Shunt Resistance</td>
              <td>{result.value.toFixed(2)} Ω</td>
            </tr>
          </tbody>
        </table>
      )}
    </div>
  )
}
