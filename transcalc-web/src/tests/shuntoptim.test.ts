import { describe, it, expect } from 'vitest'
import {
  calculateBridgeOutputWithShunt,
  calculateSpanShiftWithTemperature,
  calculateOptimalShuntResistance,
  calculateThreePointShuntMatrix
} from '../domain/shuntoptim'

// ---------------------------------------------------------------------------
// calculateBridgeOutputWithShunt
// Formula: bridgeOutput × (1 + shuntResistance / measuredArmResistance)
// ---------------------------------------------------------------------------
describe('calculateBridgeOutputWithShunt', () => {
  it('exact value: 1.0 × (1 + 1000/5000) = 1.2', () => {
    expect(calculateBridgeOutputWithShunt(1.0, 1000, 5000)).toBeCloseTo(1.2, 10)
  })

  it('no shunt (shuntResistance=0) → output unchanged', () => {
    expect(calculateBridgeOutputWithShunt(2.5, 0, 5000)).toBeCloseTo(2.5, 10)
  })

  it('scales linearly with bridgeOutput', () => {
    const r1 = calculateBridgeOutputWithShunt(1.0, 1000, 5000)
    expect(calculateBridgeOutputWithShunt(2.0, 1000, 5000)).toBeCloseTo(r1 * 2, 10)
  })

  it('scales linearly with shuntResistance', () => {
    // shuntFactor = 1 + Rs/Rm; doubling Rs increases shuntFactor by Rs/Rm
    const r1 = calculateBridgeOutputWithShunt(1.0, 500, 1000)
    const r2 = calculateBridgeOutputWithShunt(1.0, 1000, 1000)
    // r1 = 1 + 0.5 = 1.5; r2 = 1 + 1.0 = 2.0
    expect(r1).toBeCloseTo(1.5, 10)
    expect(r2).toBeCloseTo(2.0, 10)
  })

  it('larger arm resistance → less shunt effect for same Rs', () => {
    const rSmall = calculateBridgeOutputWithShunt(1.0, 1000, 1000)   // factor = 2.0
    const rLarge = calculateBridgeOutputWithShunt(1.0, 1000, 10000)  // factor = 1.1
    expect(rSmall).toBeGreaterThan(rLarge)
  })

  it('throws on zero measured arm resistance', () => {
    expect(() => calculateBridgeOutputWithShunt(1.0, 1000, 0))
      .toThrow('Measured arm resistance must be non-zero')
  })
})

// ---------------------------------------------------------------------------
// calculateSpanShiftWithTemperature
// Formula: spanAtReference × (tempCoeffPpm / 1e6) × deltaT × 100
// ---------------------------------------------------------------------------
describe('calculateSpanShiftWithTemperature', () => {
  it('exact value: 1.0 span, 100 ppm/°C, ΔT=50 → 0.5 %', () => {
    expect(calculateSpanShiftWithTemperature(1.0, 100, 50)).toBeCloseTo(0.5, 2)
  })

  it('zero temperature change → zero span shift', () => {
    expect(calculateSpanShiftWithTemperature(1.0, 100, 0)).toBe(0)
  })

  it('scales linearly with span', () => {
    const r1 = calculateSpanShiftWithTemperature(1.0, 100, 50)
    expect(calculateSpanShiftWithTemperature(2.0, 100, 50)).toBeCloseTo(r1 * 2, 10)
  })

  it('scales linearly with temperature coefficient', () => {
    const r1 = calculateSpanShiftWithTemperature(1.0, 100, 50)
    expect(calculateSpanShiftWithTemperature(1.0, 200, 50)).toBeCloseTo(r1 * 2, 10)
  })

  it('scales linearly with temperature change', () => {
    const r1 = calculateSpanShiftWithTemperature(1.0, 100, 25)
    expect(calculateSpanShiftWithTemperature(1.0, 100, 50)).toBeCloseTo(r1 * 2, 10)
  })

  it('negative temperature change → negative span shift', () => {
    const pos = calculateSpanShiftWithTemperature(1.0, 100, 50)
    expect(calculateSpanShiftWithTemperature(1.0, 100, -50)).toBeCloseTo(-pos, 10)
  })
})

// ---------------------------------------------------------------------------
// calculateOptimalShuntResistance
// Formula: rmBridge × |ΔR_low / (ΔR_low - ΔR_high)|
//   where ΔR = tempCoeffPpm × (temp - tempAmb) / 1e6
// ---------------------------------------------------------------------------
describe('calculateOptimalShuntResistance', () => {
  it('returns a positive value for well-formed inputs', () => {
    expect(calculateOptimalShuntResistance(5000, 100, 0, 25, 60))
      .toBeGreaterThan(0)
  })

  it('exact value: rmBridge=5000, coeff=100, tempLow=0, tempAmb=25, tempHigh=60', () => {
    // ΔRlow  = 100 × (0-25) / 1e6  = -2.5e-3
    // ΔRhigh = 100 × (60-25) / 1e6 = +3.5e-3
    // ΔRdiff = |(-2.5e-3) - (3.5e-3)| = 6e-3
    // optShunt = 5000 × |-2.5e-3 / 6e-3| = 5000 × 5/12 ≈ 2083.333
    expect(calculateOptimalShuntResistance(5000, 100, 0, 25, 60))
      .toBeCloseTo(5000 * 25 / 60, 3)
  })

  it('scales linearly with bridge resistance', () => {
    const r1 = calculateOptimalShuntResistance(1000, 100, 0, 25, 60)
    const r2 = calculateOptimalShuntResistance(2000, 100, 0, 25, 60)
    expect(r2).toBeCloseTo(r1 * 2, 8)
  })

  it('throws when bridge resistance is zero', () => {
    expect(() => calculateOptimalShuntResistance(0, 100, 0, 25, 60)).toThrow()
  })

  it('throws when temperature range produces no resistance change (ΔRdiff = 0)', () => {
    // tempLow = tempHigh = tempAmb → both ΔR = 0 → ΔRdiff = 0
    expect(() => calculateOptimalShuntResistance(5000, 100, 25, 25, 25)).toThrow()
    // Also: symmetric about ambient (|ΔRlow| = |ΔRhigh|, same sign difference → non-zero diff)
    // But tempCoeff = 0 → all ΔR = 0
    expect(() => calculateOptimalShuntResistance(5000, 0, 0, 25, 60)).toThrow()
  })
})

// ---------------------------------------------------------------------------
// calculateThreePointShuntMatrix
// ---------------------------------------------------------------------------
describe('calculateThreePointShuntMatrix', () => {
  const spans:      [number, number, number] = [0.95, 1.0, 1.05]
  const rmBridges:  [number, number, number] = [5000, 5000, 5000]
  const rmModifiers:[number, number, number] = [1.0, 1.0, 1.0]

  it('returns the required shape', () => {
    const result = calculateThreePointShuntMatrix(spans, rmBridges, rmModifiers)
    expect(result).toHaveProperty('coefficients')
    expect(result).toHaveProperty('recommendedShunt')
    expect(result).toHaveProperty('residualShiftLow')
    expect(result).toHaveProperty('residualShiftAmbient')
    expect(result).toHaveProperty('residualShiftHigh')
    expect(result.coefficients).toHaveLength(3)
  })

  it('recommendedShunt is positive for non-zero modifier sums', () => {
    const result = calculateThreePointShuntMatrix(spans, rmBridges, rmModifiers)
    expect(result.recommendedShunt).toBeGreaterThan(0)
  })

  it('uniform modifiers and equal bridge resistances → equal coefficients', () => {
    const result = calculateThreePointShuntMatrix(spans, rmBridges, rmModifiers)
    const [c0, c1, c2] = result.coefficients
    expect(c0).toBeCloseTo(c1, 10)
    expect(c1).toBeCloseTo(c2, 10)
  })

  it('zero modifiers → recommendedShunt = 0 (sumCoef = 0)', () => {
    const result = calculateThreePointShuntMatrix(
      spans,
      rmBridges,
      [0, 0, 0],
    )
    expect(result.recommendedShunt).toBe(0)
  })

  it('exact coefficients: modifier/rmBridge for each point', () => {
    // coef = mod / rm = 1.0 / 5000 = 0.0002
    const result = calculateThreePointShuntMatrix(spans, rmBridges, rmModifiers)
    for (const c of result.coefficients) {
      expect(c).toBeCloseTo(1 / 5000, 10)
    }
  })
})
