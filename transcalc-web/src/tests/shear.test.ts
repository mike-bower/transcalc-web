import { describe, it, expect } from 'vitest'
import {
  calculateShearStress,
  calculateShearStrain,
  calculateShearModulus,
  calculateShearStressFromModulus,
  calculateTwistAngle,
  calculateSolidCircularPolarMoment,
  calculateHollowCircularPolarMoment,
  calculateShearModulusFromYoungs,
  calculateTorsionalRigidity,
} from '../shear'

describe('Shear Stress and Strain Calculations', () => {
  it('calculates shear stress correctly', () => {
    const force = 1000 // N
    const area = 50 // mm²
    const tau = calculateShearStress(force, area)
    // τ = 1000 / 50 = 20 N/mm²
    expect(tau).toBeCloseTo(20, 1)
  })

  it('throws error on zero area', () => {
    expect(() => calculateShearStress(1000, 0)).toThrow('Area must be non-zero')
  })

  it('calculates shear strain correctly', () => {
    const deflection = 0.1 // mm
    const height = 10 // mm (aspect)
    const gamma = calculateShearStrain(deflection, height)
    // γ = 0.1 / 10 × 1e6 = 10,000 microstrain
    expect(gamma).toBeCloseTo(10000, 0)
  })

  it('calculates shear modulus from stress and strain', () => {
    const shearStress = 20 // Pa (or any unit)
    const shearStrain = 0.001 // dimensionless
    const G = calculateShearModulus(shearStress, shearStrain)
    // G = 20 / 0.001 = 20,000
    expect(G).toBeCloseTo(20000, 0)
  })

  it('calculates shear stress from modulus and strain', () => {
    const G = 80000 // MPa (steel)
    const gamma = 0.0001 // small strain
    const tau = calculateShearStressFromModulus(G, gamma)
    // τ = 80000 × 0.0001 = 8 MPa
    expect(tau).toBeCloseTo(8, 1)
  })

  it('calculates twist angle for solid shaft', () => {
    const torque = 100 // N⋅m
    const length = 500 // mm
    const G = 80e9 // Pa (steel shear modulus)
    const Ip = 1e6 // mm⁴ (polar moment)
    
    const theta = calculateTwistAngle(torque, length, G, Ip)
    // SI: θ = T*L / (G*Ip) with L in m and Ip in m^4
    // = (100 N·m × 0.5 m) / (80e9 Pa × 1e-6 m^4) = 0.000625 rad
    expect(theta).toBeCloseTo(0.000625, 6)
  })

  it('calculates polar moment for solid circular shaft', () => {
    const diameter = 20 // mm
    const Ip = calculateSolidCircularPolarMoment(diameter)
    // Ip = π × d⁴ / 32 = π × 160000 / 32 ≈ 15,707.96 mm⁴
    expect(Ip).toBeCloseTo(15707.96, 0)
  })

  it('calculates polar moment for hollow circular shaft', () => {
    const outerDia = 20 // mm
    const innerDia = 10 // mm
    const Ip = calculateHollowCircularPolarMoment(outerDia, innerDia)
    // Ip = π × (20⁴ - 10⁴) / 32 = π × (160000 - 10000) / 32
    const expected = (Math.PI * (160000 - 10000)) / 32
    expect(Ip).toBeCloseTo(expected, 0)
  })

  it('calculates shear modulus from youngs modulus and poisson ratio', () => {
    // Steel: E = 200 GPa, ν = 0.3
    const E = 200 // GPa
    const nu = 0.3
    const G = calculateShearModulusFromYoungs(E, nu)
    // G = 200 / (2 × 1.3) = 76.923 GPa
    expect(G).toBeCloseTo(76.923, 1)
  })

  it('calculates torsional rigidity', () => {
    const G = 80 // GPa
    const Ip = 1e6 // mm⁴
    const length = 1000 // mm
    const rigidity = calculateTorsionalRigidity(G, Ip, length)
    // SI: G = 80 GPa -> 80e9 Pa, Ip = 1e6 mm^4 = 1e-6 m^4, L = 1 m
    // Rigidity = 80e9 × 1e-6 / 1 = 80000 N·m/rad
    expect(rigidity).toBeCloseTo(80000, 0)
  })

  it('throws on zero length for rigidity', () => {
    expect(() => calculateTorsionalRigidity(80, 1e6, 0)).toThrow(
      'Length must be non-zero'
    )
  })
})
