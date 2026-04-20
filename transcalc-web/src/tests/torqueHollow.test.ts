import { describe, it, expect } from 'vitest'
import { calculateTorqueHollow, type TorqueHollowParams } from '../domain/torqueHollow'

// Reference geometry: 30 mm OD, 20 mm ID, steel (SI)
const BASE: TorqueHollowParams = {
  torque: 50,           // N·m
  outsideDia: 0.030,    // m
  insideDia: 0.020,     // m
  poisson: 0.3,
  modulus: 200e9,       // Pa
  gageFactor: 2.1,
}

// ---------------------------------------------------------------------------
// Valid inputs
// ---------------------------------------------------------------------------
describe('calculateTorqueHollow — valid inputs', () => {
  it('returns isValid=true for well-formed inputs', () => {
    const r = calculateTorqueHollow(BASE, 'SI')
    expect(r.isValid).toBe(true)
    expect(r.error).toBeUndefined()
  })

  it('shearStrain is positive and finite', () => {
    const r = calculateTorqueHollow(BASE, 'SI')
    expect(Number.isFinite(r.shearStrain)).toBe(true)
    expect(r.shearStrain).toBeGreaterThan(0)
  })

  it('normalStrain is exactly half of shearStrain', () => {
    const r = calculateTorqueHollow(BASE, 'SI')
    expect(r.normalStrain).toBeCloseTo(r.shearStrain / 2, 9)
  })

  it('fullSpanSensitivity equals GF × shearStrain / 2 × 1e-3', () => {
    const r = calculateTorqueHollow(BASE, 'SI')
    // formula: (GF × 2 × shearStrain / 4) × 1e-3 = GF × shearStrain / 2 × 1e-3
    const expected = (BASE.gageFactor * r.shearStrain / 2) * 1e-3
    expect(r.fullSpanSensitivity).toBeCloseTo(expected, 9)
  })

  it('scales linearly with torque', () => {
    const r1 = calculateTorqueHollow(BASE, 'SI')
    const r2 = calculateTorqueHollow({ ...BASE, torque: 100 }, 'SI')
    expect(r2.shearStrain).toBeCloseTo(r1.shearStrain * 2, 6)
    expect(r2.normalStrain).toBeCloseTo(r1.normalStrain * 2, 6)
    expect(r2.fullSpanSensitivity).toBeCloseTo(r1.fullSpanSensitivity * 2, 6)
  })

  it('scales linearly with gage factor', () => {
    const r1 = calculateTorqueHollow({ ...BASE, gageFactor: 2.0 }, 'SI')
    const r2 = calculateTorqueHollow({ ...BASE, gageFactor: 4.0 }, 'SI')
    // shearStrain and normalStrain do NOT depend on gageFactor
    expect(r2.shearStrain).toBeCloseTo(r1.shearStrain, 9)
    // fullSpanSensitivity scales linearly with GF
    expect(r2.fullSpanSensitivity).toBeCloseTo(r1.fullSpanSensitivity * 2, 9)
  })

  it('higher modulus → lower strain (inverse relationship)', () => {
    const rSteel = calculateTorqueHollow(BASE, 'SI')                          // 200 GPa
    const rAlum  = calculateTorqueHollow({ ...BASE, modulus: 70e9 }, 'SI')   // 70 GPa
    expect(rAlum.shearStrain).toBeGreaterThan(rSteel.shearStrain)
  })

  it('shearStrain scales inversely with modulus', () => {
    const r1 = calculateTorqueHollow({ ...BASE, modulus: 200e9 }, 'SI')
    const r2 = calculateTorqueHollow({ ...BASE, modulus: 100e9 }, 'SI')
    expect(r2.shearStrain).toBeCloseTo(r1.shearStrain * 2, 6)
  })

  it('higher Poisson ratio → lower shear modulus → higher shear strain', () => {
    const rLow  = calculateTorqueHollow({ ...BASE, poisson: 0.1 }, 'SI')
    const rHigh = calculateTorqueHollow({ ...BASE, poisson: 0.4 }, 'SI')
    // G = E/(2(1+ν)): higher ν → smaller G → larger γ
    expect(rHigh.shearStrain).toBeGreaterThan(rLow.shearStrain)
  })
})

// ---------------------------------------------------------------------------
// Physics check — exact value for reference geometry
// ---------------------------------------------------------------------------
describe('calculateTorqueHollow — physics verification', () => {
  it('shearStrain matches manual calculation for BASE geometry', () => {
    // J = (π/2)(Ro⁴ - Ri⁴)
    const ro = BASE.outsideDia / 2                    // 0.015 m
    const ri = BASE.insideDia / 2                     // 0.010 m
    const J = (Math.PI / 2) * (ro ** 4 - ri ** 4)    // m⁴
    // τ = T × Ro / J
    const tau = (BASE.torque * ro) / J                // Pa
    // G = E / (2(1+ν))
    const G = BASE.modulus / (2 * (1 + BASE.poisson)) // Pa
    // γ (µε) = τ / G × 1e6
    const expected = (tau / G) * 1e6
    const r = calculateTorqueHollow(BASE, 'SI')
    expect(r.shearStrain).toBeCloseTo(expected, 4)
  })
})

// ---------------------------------------------------------------------------
// US units (same result expected — unit handling delegated to caller)
// ---------------------------------------------------------------------------
describe('calculateTorqueHollow — US units', () => {
  const US: TorqueHollowParams = {
    torque: 443.0,          // in·lb (≈ 50 N·m)
    outsideDia: 1.181,      // in (≈ 30 mm)
    insideDia:  0.787,      // in (≈ 20 mm)
    poisson: 0.3,
    modulus: 29e6,          // psi (≈ 200 GPa)
    gageFactor: 2.1,
  }

  it('returns isValid=true for well-formed US inputs', () => {
    const r = calculateTorqueHollow(US, 'US')
    expect(r.isValid).toBe(true)
    expect(r.shearStrain).toBeGreaterThan(0)
  })

  it('normalStrain = shearStrain / 2 in US units too', () => {
    const r = calculateTorqueHollow(US, 'US')
    expect(r.normalStrain).toBeCloseTo(r.shearStrain / 2, 9)
  })
})

// ---------------------------------------------------------------------------
// Error cases
// ---------------------------------------------------------------------------
describe('calculateTorqueHollow — error cases', () => {
  it('outsideDia = insideDia → isValid=false', () => {
    const r = calculateTorqueHollow({ ...BASE, insideDia: BASE.outsideDia }, 'SI')
    expect(r.isValid).toBe(false)
    expect(r.error).toBeDefined()
    expect(r.shearStrain).toBe(0)
    expect(r.normalStrain).toBe(0)
    expect(r.fullSpanSensitivity).toBe(0)
  })

  it('outsideDia < insideDia → isValid=false', () => {
    const r = calculateTorqueHollow({ ...BASE, outsideDia: 0.015, insideDia: 0.020 }, 'SI')
    expect(r.isValid).toBe(false)
    expect(r.error).toMatch(/outside diameter must be greater/i)
  })

  it('all output fields present even on error', () => {
    const r = calculateTorqueHollow({ ...BASE, insideDia: BASE.outsideDia }, 'SI')
    expect(typeof r.shearStrain).toBe('number')
    expect(typeof r.normalStrain).toBe('number')
    expect(typeof r.fullSpanSensitivity).toBe('number')
  })
})
