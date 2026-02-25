import { describe, it, expect } from 'vitest'
import {
  calculateLinearBridge,
  calculateFullTwoBridge,
  calculateFullFourBridge,
  calculateHalfBridge,
  calculateBridgeOutput,
} from '../domain/bridges'

// ---------------------------------------------------------------------------
// calculateLinearBridge — formula: (ε × Fg × (1+ν) × 1e-3) / 2
// ---------------------------------------------------------------------------
describe('calculateLinearBridge', () => {
  it('baseline formula check', () => {
    const strain = 1000, gf = 2.0, nu = 0.3
    const expected = (strain * gf * (1 + nu) * 1e-3) / 2
    expect(calculateLinearBridge(strain, gf, nu)).toBeCloseTo(expected, 9)
  })

  it('zero strain → zero output', () => {
    expect(calculateLinearBridge(0, 2.0, 0.3)).toBe(0)
  })

  it('negative strain → equal-magnitude negative output', () => {
    const pos = calculateLinearBridge(1000, 2.0, 0.3)
    expect(calculateLinearBridge(-1000, 2.0, 0.3)).toBeCloseTo(-pos, 9)
  })

  it('output scales linearly with strain', () => {
    const r1 = calculateLinearBridge(500, 2.0, 0.3)
    expect(calculateLinearBridge(1000, 2.0, 0.3)).toBeCloseTo(r1 * 2, 9)
  })

  it('output scales linearly with gage factor', () => {
    const r1 = calculateLinearBridge(1000, 2.0, 0.3)
    expect(calculateLinearBridge(1000, 4.0, 0.3)).toBeCloseTo(r1 * 2, 9)
  })

  it('Poisson effect: ratio (1+ν₂)/(1+ν₁) matches output ratio', () => {
    const r1 = calculateLinearBridge(1000, 2.0, 0.0)
    const r2 = calculateLinearBridge(1000, 2.0, 0.3)
    expect(r2 / r1).toBeCloseTo(1.3 / 1.0, 9)
  })
})

// ---------------------------------------------------------------------------
// calculateFullTwoBridge — formula: ((ε₁ - ε₂) / 2) × Fg × 1e-3
// ---------------------------------------------------------------------------
describe('calculateFullTwoBridge', () => {
  it('baseline formula check', () => {
    expect(calculateFullTwoBridge(1000, 500, 2.0)).toBeCloseTo(
      ((1000 - 500) / 2) * 2.0 * 1e-3, 9
    )
  })

  it('equal strains → zero output', () => {
    expect(calculateFullTwoBridge(800, 800, 2.0)).toBe(0)
  })

  it('symmetric opposite strains match full-four output', () => {
    // ((ε - (-ε)) / 2) × Fg = ε × Fg
    const sym = calculateFullTwoBridge(1000, -1000, 2.0)
    expect(sym).toBeCloseTo(calculateFullFourBridge(1000, 2.0), 9)
  })

  it('scales linearly with gage factor', () => {
    const r1 = calculateFullTwoBridge(1000, 0, 2.0)
    expect(calculateFullTwoBridge(1000, 0, 4.0)).toBeCloseTo(r1 * 2, 9)
  })
})

// ---------------------------------------------------------------------------
// calculateFullFourBridge — formula: ε × Fg × 1e-3
// ---------------------------------------------------------------------------
describe('calculateFullFourBridge', () => {
  it('baseline: 1000 με × GF 2.0 = 2.0 mV/V', () => {
    expect(calculateFullFourBridge(1000, 2.0)).toBeCloseTo(2.0, 9)
  })

  it('zero strain → zero output', () => {
    expect(calculateFullFourBridge(0, 2.0)).toBe(0)
  })

  it('full-four output > linear (same strain, GF, ν=0.3)', () => {
    expect(calculateFullFourBridge(1000, 2.0)).toBeGreaterThan(
      calculateLinearBridge(1000, 2.0, 0.3)
    )
  })

  it('full-four output = 2 × half-bridge output', () => {
    expect(calculateFullFourBridge(1000, 2.1)).toBeCloseTo(
      calculateHalfBridge(1000, 2.1) * 2, 9
    )
  })

  it('scales linearly with both strain and gage factor', () => {
    const base = calculateFullFourBridge(500, 2.0)
    expect(calculateFullFourBridge(1000, 2.0)).toBeCloseTo(base * 2, 9)
    expect(calculateFullFourBridge(500, 4.0)).toBeCloseTo(base * 2, 9)
  })
})

// ---------------------------------------------------------------------------
// calculateHalfBridge — formula: (ε × Fg / 2) × 1e-3
// ---------------------------------------------------------------------------
describe('calculateHalfBridge', () => {
  it('baseline: 1000 με × GF 2.0 = 1.0 mV/V', () => {
    expect(calculateHalfBridge(1000, 2.0)).toBeCloseTo(1.0, 9)
  })

  it('half-bridge = full-four / 2', () => {
    const strain = 1200, gf = 2.1
    expect(calculateHalfBridge(strain, gf)).toBeCloseTo(
      calculateFullFourBridge(strain, gf) / 2, 9
    )
  })

  it('zero strain → zero output', () => {
    expect(calculateHalfBridge(0, 2.1)).toBe(0)
  })
})

// ---------------------------------------------------------------------------
// calculateBridgeOutput — dispatcher
// ---------------------------------------------------------------------------
describe('calculateBridgeOutput dispatcher', () => {
  const params = { strain: 1000, gageFactor: 2.0, poisson: 0.3, strainL: 500 }

  it('linear → delegates to calculateLinearBridge', () => {
    expect(calculateBridgeOutput('linear', params)).toBeCloseTo(
      calculateLinearBridge(1000, 2.0, 0.3), 9
    )
  })

  it('fullTwo → delegates to calculateFullTwoBridge', () => {
    expect(calculateBridgeOutput('fullTwo', params)).toBeCloseTo(
      calculateFullTwoBridge(1000, 500, 2.0), 9
    )
  })

  it('fullFour → delegates to calculateFullFourBridge', () => {
    expect(calculateBridgeOutput('fullFour', params)).toBeCloseTo(
      calculateFullFourBridge(1000, 2.0), 9
    )
  })

  it('halfBridge → delegates to calculateHalfBridge', () => {
    expect(calculateBridgeOutput('halfBridge', params)).toBeCloseTo(
      calculateHalfBridge(1000, 2.0), 9
    )
  })

  it('unknown bridge type throws', () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expect(() => calculateBridgeOutput('unknown' as any, params)).toThrow()
  })

  it('poisson defaults to 0.3 when omitted (linear)', () => {
    const withDefault = calculateBridgeOutput('linear', { strain: 1000, gageFactor: 2.0 })
    const explicit    = calculateLinearBridge(1000, 2.0, 0.3)
    expect(withDefault).toBeCloseTo(explicit, 9)
  })

  it('strainL defaults to 0 when omitted (fullTwo)', () => {
    const withDefault = calculateBridgeOutput('fullTwo', { strain: 1000, gageFactor: 2.0 })
    const explicit    = calculateFullTwoBridge(1000, 0, 2.0)
    expect(withDefault).toBeCloseTo(explicit, 9)
  })
})
