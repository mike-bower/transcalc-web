import { describe, it, expect } from 'vitest'
import {
  calculateLinearBridge,
  calculateFullTwoBridge,
  calculateFullFourBridge,
  calculateHalfBridge,
  calculateQuarterBridge,
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
    // fullTwo(ε, -ε) and fullFour(ε, -ε) both yield ε × Fg × 1e-3
    const sym = calculateFullTwoBridge(1000, -1000, 2.0)
    expect(sym).toBeCloseTo(calculateFullFourBridge(1000, -1000, 2.0), 9)
  })

  it('scales linearly with gage factor', () => {
    const r1 = calculateFullTwoBridge(1000, 0, 2.0)
    expect(calculateFullTwoBridge(1000, 0, 4.0)).toBeCloseTo(r1 * 2, 9)
  })
})

// ---------------------------------------------------------------------------
// calculateFullFourBridge — formula: (strain12 - strain34) / 2 × Fg × 1e-3
// Matches Delphi fullfour.pas: FirstValue := (TheStrain12 - TheStrain34)/2;
// For a symmetric bending bridge: strain12 = +ε (top), strain34 = -ε (bottom)
// ---------------------------------------------------------------------------
describe('calculateFullFourBridge', () => {
  it('baseline: symmetric bending 1000 με × GF 2.0 = 2.0 mV/V', () => {
    // strain12=+1000 (top, tension), strain34=-1000 (bottom, compression)
    expect(calculateFullFourBridge(1000, -1000, 2.0)).toBeCloseTo(2.0, 9)
  })

  it('zero strain → zero output', () => {
    expect(calculateFullFourBridge(0, 0, 2.0)).toBe(0)
  })

  it('full-four bending output > linear (same strain, GF, ν=0.3)', () => {
    expect(calculateFullFourBridge(1000, -1000, 2.0)).toBeGreaterThan(
      calculateLinearBridge(1000, 2.0, 0.3)
    )
  })

  it('full-four bending output = 2 × half-bridge output', () => {
    expect(calculateFullFourBridge(1000, -1000, 2.1)).toBeCloseTo(
      calculateHalfBridge(1000, 2.1) * 2, 9
    )
  })

  it('scales linearly with both strain and gage factor', () => {
    const base = calculateFullFourBridge(500, -500, 2.0)
    expect(calculateFullFourBridge(1000, -1000, 2.0)).toBeCloseTo(base * 2, 9)
    expect(calculateFullFourBridge(500, -500, 4.0)).toBeCloseTo(base * 2, 9)
  })
})

// ---------------------------------------------------------------------------
// calculateHalfBridge — formula: (ε × Fg / 2) × 1e-3
// ---------------------------------------------------------------------------
describe('calculateHalfBridge', () => {
  it('baseline: 1000 με × GF 2.0 = 1.0 mV/V', () => {
    expect(calculateHalfBridge(1000, 2.0)).toBeCloseTo(1.0, 9)
  })

  it('half-bridge = full-four bending / 2', () => {
    const strain = 1200, gf = 2.1
    expect(calculateHalfBridge(strain, gf)).toBeCloseTo(
      calculateFullFourBridge(strain, -strain, gf) / 2, 9
    )
  })

  it('zero strain → zero output', () => {
    expect(calculateHalfBridge(0, 2.1)).toBe(0)
  })
})

// ---------------------------------------------------------------------------
// calculateQuarterBridge — TN-507-1 Case 1 (nonlinear)
// Formula: Fε×10⁻³ / (4 + 2Fε×10⁻⁶)
// Equivalent form: K×ε×10⁻³×(1-η)  where K=F/4, η=Fε×10⁻⁶/(2+Fε×10⁻⁶)
// ---------------------------------------------------------------------------
describe('calculateQuarterBridge (TN-507-1 Case 1, nonlinear)', () => {
  it('zero strain → zero output', () => {
    expect(calculateQuarterBridge(0, 2.0)).toBe(0)
  })

  it('baseline: 1000 με × GF 2.0 = 2.0/4.004 ≈ 0.49950 mV/V', () => {
    // Numerator: 2.0×1000×1e-3 = 2.0; Denominator: 4 + 2×2.0×1000×1e-6 = 4.004
    expect(calculateQuarterBridge(1000, 2.0)).toBeCloseTo(2.0 / 4.004, 9)
  })

  it('less than linear approx (F/4×ε×1e-3) for tension — TN-507-1 §4', () => {
    const qb = calculateQuarterBridge(1000, 2.0)
    const linear = (2.0 / 4) * 1000 * 1e-3
    expect(qb).toBeLessThan(linear)
  })

  it('larger magnitude than linear approx for compression — TN-507-1 §4', () => {
    // TN-507-1: compressive strains read too high in magnitude → output more negative
    const qb = calculateQuarterBridge(-1000, 2.0)
    const linear = (2.0 / 4) * (-1000) * 1e-3
    expect(Math.abs(qb)).toBeGreaterThan(Math.abs(linear))
  })

  it('nonlinearity η ≈ 0.1% at 1000 με, GF=2 (TN-507-1 rule of thumb)', () => {
    const F = 2.0, eps = 1000
    const linear = (F / 4) * eps * 1e-3
    const qb = calculateQuarterBridge(eps, F)
    const errorPct = Math.abs(qb - linear) / linear * 100
    expect(errorPct).toBeCloseTo(0.1, 1)
  })

  it('satisfies K×(1-η) form from TN-507-1 Table 1', () => {
    // Eo/E = K×ε×1e-3×(1-η) where K=F/4, η=Fε×1e-6/(2+Fε×1e-6)
    const F = 2.0, eps = 1000
    const eta = (F * eps * 1e-6) / (2 + F * eps * 1e-6)
    const expected = (F / 4) * eps * 1e-3 * (1 - eta)
    expect(calculateQuarterBridge(eps, F)).toBeCloseTo(expected, 9)
  })

  it('quarter-bridge < half-bridge for same positive strain', () => {
    // Quarter bridge has lower sensitivity than half bridge (2 active gages)
    expect(calculateQuarterBridge(1000, 2.0)).toBeLessThan(calculateHalfBridge(1000, 2.0))
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

  it('fullFour → delegates to calculateFullFourBridge (strain34 defaults to 0)', () => {
    // params has no strain12/strain34, so dispatcher uses strain=1000 and strain34=0
    expect(calculateBridgeOutput('fullFour', params)).toBeCloseTo(
      calculateFullFourBridge(1000, 0, 2.0), 9
    )
  })

  it('halfBridge → delegates to calculateHalfBridge', () => {
    expect(calculateBridgeOutput('halfBridge', params)).toBeCloseTo(
      calculateHalfBridge(1000, 2.0), 9
    )
  })

  it('quarterBridge → delegates to calculateQuarterBridge', () => {
    expect(calculateBridgeOutput('quarterBridge', params)).toBeCloseTo(
      calculateQuarterBridge(1000, 2.0), 9
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

// ---------------------------------------------------------------------------
// Absolute value checks — all formulas verified against TN-507-1 (Micro-Measurements)
// Wheatstone bridge: Eo/E = (GF/4) × Σεi  (ε in microstrain, result in mV/V)
// Reference: ε = 1000 με, GF = 2.0, ν = 0.3
// ---------------------------------------------------------------------------
describe('TN-507-1 absolute accuracy checks (ε=1000με, GF=2.0, ν=0.3)', () => {
  const ε = 1000, GF = 2.0, ν = 0.3

  it('half bridge (1 top + 1 bottom, ±ε) → 1.0 mV/V', () => {
    // Delphi twoAdj.pas: ε × GF / 2 × 1e-3
    expect(calculateHalfBridge(ε, GF)).toBeCloseTo(1.0, 9)
  })

  it('full bending bridge (2 top + 2 bottom, ±ε) → 2.0 mV/V', () => {
    // Delphi fullfour.pas: (strain12 - strain34) / 2 × GF × 1e-3; strain12=+ε, strain34=-ε
    expect(calculateFullFourBridge(ε, -ε, GF)).toBeCloseTo(2.0, 9)
  })

  it('linear/full-Poisson bridge (2 long + 2 transverse) → 1.3 mV/V', () => {
    // Delphi linear.pas: ε × GF × (1+ν) × 1e-3 / 2 = 1000 × 2.0 × 1.3 × 1e-3 / 2 = 1.3
    expect(calculateLinearBridge(ε, GF, ν)).toBeCloseTo(1.3, 9)
  })
})
