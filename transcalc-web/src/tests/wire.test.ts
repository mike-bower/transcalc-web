import { describe, it, expect } from 'vitest'
import {
  calculateWireAreaCircularMils,
  calculateWireAreaMm2,
  calculateWireResistance,
  calculateTemperatureAdjustedResistance,
  calculateVoltageDrop,
  calculateWirePowerLoss,
  getWireGaugeProperties,
  calculateSkinEffectFactor,
} from '../wire'

describe('Wire and Resistor Calculations', () => {
  it('calculates wire area in circular mils', () => {
    const diameterInches = 0.0808 // AWG 12
    const areaCM = calculateWireAreaCircularMils(diameterInches)
    // (80.8 mils)² = 6529 CM
    expect(areaCM).toBeCloseTo(6528.64, 0)
  })

  it('calculates wire area in mm²', () => {
    const diameterMm = 2.053 // AWG 12
    const areaMm2 = calculateWireAreaMm2(diameterMm)
    // π × (1.0265)² ≈ 3.31 mm²
    expect(areaMm2).toBeCloseTo(3.31, 1)
  })

  it('calculates wire resistance for given length', () => {
    const baseResistance = 1.588 // Ohms per 1000 ft (AWG 12)
    const lengthFt = 500
    const totalResistance = calculateWireResistance(baseResistance, lengthFt)
    // 1.588 × 500 / 1000 = 0.794 Ω
    expect(totalResistance).toBeCloseTo(0.794, 3)
  })

  it('adjusts wire resistance for temperature', () => {
    const baseResistance = 1.0 // Ohms at 20°C
    const tempCelsius = 50
    const adjustedR = calculateTemperatureAdjustedResistance(baseResistance, tempCelsius, 20)
    // R = 1.0 × [1 + 0.00383 × 30] = 1.1149
    expect(adjustedR).toBeCloseTo(1.1149, 4)
  })

  it('calculates voltage drop across wire', () => {
    const currentA = 5
    const resistanceOhms = 2.0
    const dropV = calculateVoltageDrop(currentA, resistanceOhms)
    // V = I × R = 5 × 2 = 10V
    expect(dropV).toBeCloseTo(10, 1)
  })

  it('calculates power loss in wire', () => {
    const currentA = 10
    const resistanceOhms = 0.5
    const powerLoss = calculateWirePowerLoss(currentA, resistanceOhms)
    // P = I² × R = 100 × 0.5 = 50W
    expect(powerLoss).toBeCloseTo(50, 1)
  })

  it('retrieves wire gauge properties', () => {
    const gauge = getWireGaugeProperties(12)
    expect(gauge).not.toBeNull()
    if (gauge) {
      expect(gauge.awg).toBe(12)
      expect(gauge.diameterInches).toBeCloseTo(0.0808, 4)
      expect(gauge.diameterMm).toBeCloseTo(2.053, 3)
      expect(gauge.resistance).toBeCloseTo(1.588, 3)
    }
  })

  it('returns null for unknown gauge', () => {
    const gauge = getWireGaugeProperties(999)
    expect(gauge).toBeNull()
  })

  it('calculates skin effect factor', () => {
    // DC/low frequency - no skin effect
    expect(calculateSkinEffectFactor(100)).toBeCloseTo(1.0, 1)
    
    // At 1 kHz - still minimal
    expect(calculateSkinEffectFactor(1000)).toBeCloseTo(1.0, 1)
    
    // At 1 MHz - sqrt(1MHz/1000) ≈ 31.6
    expect(calculateSkinEffectFactor(1000000)).toBeCloseTo(31.62, 1)
  })
})
