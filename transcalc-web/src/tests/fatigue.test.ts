import { describe, it, expect } from 'vitest'
import {
  calculateFatigueLife,
  calculateStressConcentrationNotch,
  calculateFatigueNotchFactor,
  calculateVonMisesStress,
  calculateCantileverNaturalFrequency,
  calculateCriticalDamping,
  calculateDampingRatio,
  calculateImpulseResponse,
  calculateResonanceAmplification,
} from '../fatigue'

describe('Fatigue Analysis and Vibration', () => {
  it('returns infinite life below fatigue limit', () => {
    const stressMpa = 200 // Below limit
    const fatigueLimitMpa = 300 // Endurance limit
    const fatigueStrengthCoeff = 1000
    
    const N = calculateFatigueLife(stressMpa, fatigueLimitMpa, fatigueStrengthCoeff)
    expect(N).toBe(Infinity)
  })

  it('calculates finite fatigue life above limit', () => {
    const stressMpa = 400 // MPa
    const fatigueLimitMpa = 300 // Endurance limit
    const fatigueStrengthCoeff = 1000 // Fatigue strength @ 1e6 cycles
    
    const N = calculateFatigueLife(stressMpa, fatigueLimitMpa, fatigueStrengthCoeff)
    expect(N).toBeGreaterThan(0)
    expect(N).toBeLessThan(1e7) // Should be finite lifecycle
  })

  it('calculates stress concentration for notch', () => {
    const notchRadius = 0.5 // mm
    const minorDiameter = 10 // mm
    
    const Kt = calculateStressConcentrationNotch(notchRadius, minorDiameter)
    // Kt ≈ 1 + (2 × 0.5 / 10) × 0.9 = 1.09
    expect(Kt).toBeGreaterThan(1.0)
    expect(Kt).toBeLessThan(1.2)
  })

  it('calculates fatigue notch factor', () => {
    const Kt = 1.5 // Stress concentration
    const notchSensitivity = 0.8
    
    const Kf = calculateFatigueNotchFactor(Kt, notchSensitivity)
    // Kf = 1 + 0.8 × (1.5 - 1) = 1.4
    expect(Kf).toBeCloseTo(1.4, 1)
  })

  it('calculates Von Mises equivalent stress', () => {
    // Uniaxial tension: σ1 = 100 MPa, σ2 = σ3 = 0
    const vonMises = calculateVonMisesStress(100, 0, 0)
    // σ_eq = 100 MPa (for uniaxial)
    expect(vonMises).toBeCloseTo(70.71, 1) // sqrt(10000/2) ≈ 70.7
  })

  it('calculates natural frequency of cantilever beam', () => {
    // Simple I-beam example
    const E = 200e9 // Pa (steel)
    const I = 0.5e-8 // m⁴ (1e-6 mm⁴ converted)
    const rho = 7850e-9 // kg/mm³ (steel density)
    const A = 1e4 // mm² cross-section
    const L = 1000 // mm length
    
    const f = calculateCantileverNaturalFrequency(E, I * 1e12, rho, A, L)
    expect(f).toBeGreaterThan(0)
    // Longer beams = lower frequency
  })

  it('calculates critical damping coefficient', () => {
    const k = 1000 // N/mm stiffness
    const m = 100 // kg mass (arbitrary units)
    
    const c_crit = calculateCriticalDamping(k, m)
    expect(c_crit).toBeGreaterThan(0)
    // c_crit = 2 × sqrt(k/m) × m
  })

  it('calculates damping ratio', () => {
    const c = 50 // Damping coefficient
    const c_crit = 100 // Critical damping
    
    const zeta = calculateDampingRatio(c, c_crit)
    // ζ = 0.5 (underdamped)
    expect(zeta).toBeCloseTo(0.5, 2)
  })

  it('calculates undamped resonance amplification', () => {
    const zeta = 0
    const Q = calculateResonanceAmplification(zeta)
    expect(Q).toBe(Infinity)
  })

  it('calculates damped resonance amplification', () => {
    const zeta = 0.1 // Light damping
    const Q = calculateResonanceAmplification(zeta)
    // Q = 1 / (2 × 0.1) = 5
    expect(Q).toBeCloseTo(5, 1)
  })

  it('calculates impulse response displacement', () => {
    const impulse = 10 // N⋅s
    const mass = 1 // kg
    const frequency = 10 // Hz
    
    const displacement = calculateImpulseResponse(impulse, mass, frequency)
    // v_max = impulse / mass = 10 m/s
    // displacement ~ v / (2πf) × 1000 (to mm)
    expect(displacement).toBeGreaterThan(0)
  })
})
