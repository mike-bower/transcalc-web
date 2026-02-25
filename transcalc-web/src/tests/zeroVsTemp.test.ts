import { describe, it, expect } from 'vitest'
import {
  calculateZeroVsTemp,
  validateZeroVsTemp,
  getResistorTcr,
  WIRE_TYPES,
  ZeroVsTempParams,
} from '../domain/zeroVsTemp'

// ---------------------------------------------------------------------------
// Helper: build a valid baseline params object (US units, copper wire)
// ---------------------------------------------------------------------------
function baseParams(overrides: Partial<ZeroVsTempParams> = {}): ZeroVsTempParams {
  return {
    lowTemp:           70,    // °F
    lowOutput:          0.1,  // mV/V
    highTemp:          170,   // °F
    highOutput:         0.3,  // mV/V
    resistorTcr:        0.22, // %/°F  (copper, US)
    bridgeResistance: 350,    // Ω
    units: 'US',
    ...overrides,
  }
}

// ---------------------------------------------------------------------------
// Wire type catalogue
// ---------------------------------------------------------------------------
describe('WIRE_TYPES catalogue', () => {
  it('contains Balco, Copper and Nickel entries', () => {
    expect(WIRE_TYPES.Balco).toBeDefined()
    expect(WIRE_TYPES.Copper).toBeDefined()
    expect(WIRE_TYPES.Nickel).toBeDefined()
  })

  it('stores TCR values in %/°F', () => {
    expect(WIRE_TYPES.Balco.tcrPerF).toBeCloseTo(0.25)
    expect(WIRE_TYPES.Copper.tcrPerF).toBeCloseTo(0.22)
    expect(WIRE_TYPES.Nickel.tcrPerF).toBeCloseTo(0.33)
  })
})

// ---------------------------------------------------------------------------
// getResistorTcr — unit conversion
// ---------------------------------------------------------------------------
describe('getResistorTcr', () => {
  it('returns the %/°F value unchanged in US mode', () => {
    expect(getResistorTcr('Copper', 'US')).toBeCloseTo(0.22)
    expect(getResistorTcr('Balco', 'US')).toBeCloseTo(0.25)
    expect(getResistorTcr('Nickel', 'US')).toBeCloseTo(0.33)
  })

  it('converts %/°F → %/°C (×9/5) in SI mode', () => {
    // Delphi: TCRNo := TCRNo * 9 / 5
    expect(getResistorTcr('Copper', 'SI')).toBeCloseTo(0.22 * 9 / 5)
    expect(getResistorTcr('Balco',  'SI')).toBeCloseTo(0.25 * 9 / 5)
    expect(getResistorTcr('Nickel', 'SI')).toBeCloseTo(0.33 * 9 / 5)
  })
})

// ---------------------------------------------------------------------------
// calculateZeroVsTemp — core formula
// ---------------------------------------------------------------------------
describe('calculateZeroVsTemp — core formula', () => {
  it('computes resistance for a typical positive zero shift (copper, US, 350 Ω bridge)', () => {
    // R = (0.2 × 4 × 350 × 0.001) / 100 / (0.22/100)
    //   = 0.28 / 100 / 0.0022  ≈ 1.2727 Ω
    const result = calculateZeroVsTemp(baseParams())
    expect(result.resistance).toBeCloseTo(1.2727, 3)
    expect(result.bridgeArm).toBe('minus-s-minus')
    expect(result.useWire).toBe(true)
  })

  it('computes resistance for a negative zero shift', () => {
    // ΔOutput is negative → signedResistance < 0 → 'plus-s-minus' arm
    const result = calculateZeroVsTemp(baseParams({ lowOutput: 0.3, highOutput: 0.1 }))
    expect(result.resistance).toBeCloseTo(1.2727, 3)
    expect(result.bridgeArm).toBe('plus-s-minus')
    expect(result.useWire).toBe(true)
  })

  it('returns zero resistance when output does not shift with temperature', () => {
    const result = calculateZeroVsTemp(baseParams({ lowOutput: 0.2, highOutput: 0.2 }))
    expect(result.resistance).toBe(0)
    expect(result.bridgeArm).toBe('minus-s-minus')
    expect(result.useWire).toBe(false)
  })

  it('sets useWire=false when compensation is ≤ 0.5 Ω (E01 resistor range)', () => {
    // R = (0.03 × 4 × 350 × 0.001) / 100 / 0.0022 ≈ 0.1909 Ω
    const result = calculateZeroVsTemp(
      baseParams({ lowOutput: 0.0, highOutput: 0.03 })
    )
    expect(result.resistance).toBeCloseTo(0.1909, 3)
    expect(result.useWire).toBe(false)
  })

  it('sets useWire=true when compensation exceeds 0.5 Ω', () => {
    const result = calculateZeroVsTemp(baseParams())
    expect(result.resistance).toBeGreaterThan(0.5)
    expect(result.useWire).toBe(true)
  })

  it('resistance at exactly 0.5 Ω is NOT treated as requiring wire (boundary)', () => {
    // R = 0.5 → ΔOutput = 0.5 × 100 × 0.0022 / (4 × 350 × 0.001) ≈ 0.07857 mV/V
    const deltaOutput = 0.5 * 100 * 0.0022 / (4 * 350 * 0.001)
    const result = calculateZeroVsTemp(
      baseParams({ lowOutput: 0, highOutput: deltaOutput })
    )
    expect(result.resistance).toBeCloseTo(0.5, 5)
    expect(result.useWire).toBe(false) // 0.5 is NOT > 0.5
  })

  it('scales correctly with bridge resistance (120 Ω bridge)', () => {
    // R = (2.0 × 4 × 120 × 0.001) / 100 / 0.0022 ≈ 4.3636 Ω
    const result = calculateZeroVsTemp(
      baseParams({ lowOutput: -1.0, highOutput: 1.0, bridgeResistance: 120 })
    )
    expect(result.resistance).toBeCloseTo(4.3636, 3)
    expect(result.useWire).toBe(true)
  })

  it('result scales linearly with output shift magnitude', () => {
    const r1 = calculateZeroVsTemp(baseParams({ lowOutput: 0.0, highOutput: 0.1 }))
    const r2 = calculateZeroVsTemp(baseParams({ lowOutput: 0.0, highOutput: 0.2 }))
    expect(r2.resistance).toBeCloseTo(r1.resistance * 2, 6)
  })

  it('result scales linearly with bridge resistance', () => {
    const r350 = calculateZeroVsTemp(baseParams({ bridgeResistance: 350 }))
    const r700 = calculateZeroVsTemp(baseParams({ bridgeResistance: 700 }))
    expect(r700.resistance).toBeCloseTo(r350.resistance * 2, 6)
  })

  it('result scales inversely with temperature span', () => {
    const r100 = calculateZeroVsTemp(baseParams({ highTemp: 170 }))  // ΔT=100
    const r200 = calculateZeroVsTemp(baseParams({ highTemp: 270 }))  // ΔT=200
    expect(r100.resistance).toBeCloseTo(r200.resistance * 2, 6)
  })

  it('result scales inversely with TCR', () => {
    const r022 = calculateZeroVsTemp(baseParams({ resistorTcr: 0.22 }))
    const r044 = calculateZeroVsTemp(baseParams({ resistorTcr: 0.44 }))
    expect(r022.resistance).toBeCloseTo(r044.resistance * 2, 6)
  })
})

// ---------------------------------------------------------------------------
// calculateZeroVsTemp — SI units
// ---------------------------------------------------------------------------
describe('calculateZeroVsTemp — SI units', () => {
  it('computes resistance using °C temperatures and %/°C TCR (Balco)', () => {
    // Balco in SI: TCR = 0.25 × 9/5 = 0.45 %/°C
    // R = (0.2 × 4 × 350 × 0.001) / 60 / (0.45/100) ≈ 1.0370 Ω
    const result = calculateZeroVsTemp({
      lowTemp:          20,    // °C
      lowOutput:         0.1,
      highTemp:          80,   // °C
      highOutput:        0.3,
      resistorTcr: getResistorTcr('Balco', 'SI'),
      bridgeResistance: 350,
      units: 'SI',
    })
    expect(result.resistance).toBeCloseTo(1.0370, 3)
    expect(result.bridgeArm).toBe('minus-s-minus')
    expect(result.useWire).toBe(true)
  })

  it('SI and US calculations agree when temperatures are converted consistently', () => {
    // Build equivalent cases: US 70–170 °F  ≡  SI 21.11–76.67 °C
    const usResult = calculateZeroVsTemp(baseParams())
    const siResult = calculateZeroVsTemp({
      lowTemp:   (70 - 32) * 5 / 9,
      highTemp:  (170 - 32) * 5 / 9,
      lowOutput:  0.1,
      highOutput: 0.3,
      resistorTcr: getResistorTcr('Copper', 'SI'),
      bridgeResistance: 350,
      units: 'SI',
    })
    expect(siResult.resistance).toBeCloseTo(usResult.resistance, 4)
    expect(siResult.bridgeArm).toBe(usResult.bridgeArm)
  })
})

// ---------------------------------------------------------------------------
// calculateZeroVsTemp — error cases
// ---------------------------------------------------------------------------
describe('calculateZeroVsTemp — error cases', () => {
  it('throws when temperature difference is zero', () => {
    expect(() =>
      calculateZeroVsTemp(baseParams({ highTemp: 70 })) // highTemp === lowTemp
    ).toThrow('Temperature difference must not be zero')
  })

  it('throws when resistorTcr is zero', () => {
    expect(() =>
      calculateZeroVsTemp(baseParams({ resistorTcr: 0 }))
    ).toThrow('Resistor TCR must not be zero')
  })
})

// ---------------------------------------------------------------------------
// validateZeroVsTemp — valid input
// ---------------------------------------------------------------------------
describe('validateZeroVsTemp — valid input', () => {
  it('accepts a well-formed US parameter set', () => {
    const v = validateZeroVsTemp(baseParams())
    expect(v.valid).toBe(true)
    expect(v.errors).toHaveLength(0)
  })

  it('accepts a well-formed SI parameter set', () => {
    const v = validateZeroVsTemp({
      lowTemp:          20,
      highTemp:         80,
      lowOutput:         0.1,
      highOutput:        0.3,
      resistorTcr: getResistorTcr('Copper', 'SI'),
      bridgeResistance: 350,
      units: 'SI',
    })
    expect(v.valid).toBe(true)
    expect(v.errors).toHaveLength(0)
  })
})

// ---------------------------------------------------------------------------
// validateZeroVsTemp — individual field errors
// ---------------------------------------------------------------------------
describe('validateZeroVsTemp — field errors', () => {
  it('rejects low temperature below −100 °F', () => {
    const v = validateZeroVsTemp(baseParams({ lowTemp: -200 }))
    expect(v.valid).toBe(false)
    expect(v.errors.some(e => e.includes('Low temperature'))).toBe(true)
  })

  it('rejects high temperature above 500 °F', () => {
    const v = validateZeroVsTemp(baseParams({ highTemp: 600 }))
    expect(v.valid).toBe(false)
    expect(v.errors.some(e => e.includes('High temperature'))).toBe(true)
  })

  it('rejects low output below −10 mV/V', () => {
    const v = validateZeroVsTemp(baseParams({ lowOutput: -15 }))
    expect(v.valid).toBe(false)
    expect(v.errors.some(e => e.includes('Low output'))).toBe(true)
  })

  it('rejects high output above 10 mV/V', () => {
    const v = validateZeroVsTemp(baseParams({ highOutput: 15 }))
    expect(v.valid).toBe(false)
    expect(v.errors.some(e => e.includes('High output'))).toBe(true)
  })

  it('rejects TCR below 0.1 %/°F', () => {
    const v = validateZeroVsTemp(baseParams({ resistorTcr: 0.05 }))
    expect(v.valid).toBe(false)
    expect(v.errors.some(e => e.includes('TCR'))).toBe(true)
  })

  it('rejects TCR above 0.5 %/°F', () => {
    const v = validateZeroVsTemp(baseParams({ resistorTcr: 0.6 }))
    expect(v.valid).toBe(false)
    expect(v.errors.some(e => e.includes('TCR'))).toBe(true)
  })

  it('rejects bridge resistance below 50 Ω', () => {
    const v = validateZeroVsTemp(baseParams({ bridgeResistance: 10 }))
    expect(v.valid).toBe(false)
    expect(v.errors.some(e => e.includes('Bridge resistance'))).toBe(true)
  })

  it('rejects bridge resistance above 10000 Ω', () => {
    const v = validateZeroVsTemp(baseParams({ bridgeResistance: 20000 }))
    expect(v.valid).toBe(false)
    expect(v.errors.some(e => e.includes('Bridge resistance'))).toBe(true)
  })

  it('rejects when low temperature equals high temperature', () => {
    const v = validateZeroVsTemp(baseParams({ highTemp: 70 }))
    expect(v.valid).toBe(false)
    expect(v.errors.some(e => e.includes('less than high temperature'))).toBe(true)
  })

  it('rejects when low temperature is greater than high temperature', () => {
    const v = validateZeroVsTemp(baseParams({ lowTemp: 200, highTemp: 100 }))
    expect(v.valid).toBe(false)
    expect(v.errors.some(e => e.includes('less than high temperature'))).toBe(true)
  })

  it('reports multiple simultaneous errors', () => {
    const v = validateZeroVsTemp(
      baseParams({ lowTemp: -999, highTemp: -998, bridgeResistance: 1 })
    )
    expect(v.valid).toBe(false)
    expect(v.errors.length).toBeGreaterThan(1)
  })
})

// ---------------------------------------------------------------------------
// validateZeroVsTemp — SI field errors
// ---------------------------------------------------------------------------
describe('validateZeroVsTemp — SI field errors', () => {
  it('rejects SI temperature outside the converted limits', () => {
    // −100 °F ≈ −73.3 °C ; below that should fail
    const v = validateZeroVsTemp({
      lowTemp: -100,   // well below fToC(-100) ≈ -73.3 °C
      highTemp: 20,
      lowOutput: 0.1,
      highOutput: 0.3,
      resistorTcr: getResistorTcr('Copper', 'SI'),
      bridgeResistance: 350,
      units: 'SI',
    })
    expect(v.valid).toBe(false)
    expect(v.errors.some(e => e.includes('Low temperature'))).toBe(true)
  })

  it('rejects SI TCR outside converted limits (0.18–0.9 %/°C)', () => {
    const v = validateZeroVsTemp({
      lowTemp: 20, highTemp: 80,
      lowOutput: 0.1, highOutput: 0.3,
      resistorTcr: 0.05,   // too low even in SI
      bridgeResistance: 350,
      units: 'SI',
    })
    expect(v.valid).toBe(false)
    expect(v.errors.some(e => e.includes('TCR'))).toBe(true)
  })
})

// ---------------------------------------------------------------------------
// validateZeroVsTemp — warnings
// ---------------------------------------------------------------------------
describe('validateZeroVsTemp — warnings', () => {
  it('warns when temperature span is less than 50 °F (US)', () => {
    const v = validateZeroVsTemp(baseParams({ lowTemp: 70, highTemp: 100 })) // ΔT = 30 °F
    expect(v.valid).toBe(true)   // warnings do not block validity
    expect(v.warnings.some(w => w.includes('30.0'))).toBe(true)
  })

  it('warns when temperature span is less than 10 °C (SI)', () => {
    const v = validateZeroVsTemp({
      lowTemp: 20, highTemp: 25,   // ΔT = 5 °C
      lowOutput: 0.1, highOutput: 0.3,
      resistorTcr: getResistorTcr('Copper', 'SI'),
      bridgeResistance: 350,
      units: 'SI',
    })
    expect(v.valid).toBe(true)
    expect(v.warnings.length).toBeGreaterThan(0)
  })

  it('issues no warning for a 100 °F span', () => {
    const v = validateZeroVsTemp(baseParams()) // ΔT = 100 °F
    expect(v.warnings).toHaveLength(0)
  })
})
