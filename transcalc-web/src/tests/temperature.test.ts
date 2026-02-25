import { describe, it, expect } from 'vitest'
import {
  calculateThermalStrain,
  calculateThermalStress,
  THERMAL_EXPANSION_COEFFICIENTS,
  adjustPropertyForTemperature,
  compensateMeasuredStrain,
  calculateEffectiveGaugeFactor,
  calculateGaugeFactorError,
  calculateGaugeSelfHeating,
  correctForCreep,
} from '../temperature'

describe('Temperature Compensation and Thermal Effects', () => {
  it('calculates thermal strain for steel', () => {
    const alpha = THERMAL_EXPANSION_COEFFICIENTS.steel // 11e-6 per °C
    const deltaT = 50 // °C change
    const thermalStrain = calculateThermalStrain(alpha, deltaT)
    // ε_thermal = 11e-6 × 50 × 1e6 = 550 microstrain
    expect(thermalStrain).toBeCloseTo(550, 0)
  })

  it('calculates thermal stress when constrained', () => {
    const alpha = 11e-6 // Steel CTE (per °C)
    const E = 200e9 // Young's modulus (Pa)
    const deltaT = 50 // °C change
    const thermalStress = calculateThermalStress(alpha, E, deltaT)
    // σ_thermal = 11e-6 × 200e9 × 50 = 110 MPa
    expect(thermalStress).toBeCloseTo(110e6, 0)
  })

  it('adjusts material properties for temperature', () => {
    // Example: coefficient of resistance for copper wire
    const copperResistivity = 1.68e-8 // Ω⋅m at 20°C
    const tempCoeff = 0.0039 // per °C
    const actualTemp = 60 // °C
    
    const adjustedResistivity = adjustPropertyForTemperature(
      copperResistivity,
      tempCoeff,
      actualTemp,
      20
    )
    // ρ(60) = ρ₀ × [1 + 0.0039 × 40] = ρ₀ × 1.156
    expect(adjustedResistivity).toBeCloseTo(copperResistivity * 1.156, 10)
  })

  it('compensates measured strain for thermal effects', () => {
    const measuredStrain = 1000 // microstrain (actual reading)
    const thermalStrain = 300 // microstrain (thermal component)
    const mechanicalStrain = compensateMeasuredStrain(measuredStrain, thermalStrain)
    // Mechanical = 1000 - 300 = 700 microstrain
    expect(mechanicalStrain).toBeCloseTo(700, 0)
  })

  it('calculates effective gauge factor with temperature', () => {
    const nominalGF = 2.0 // at 20°C
    const tempCoeff = -0.0005 // per °C (typical)
    const deltaT = 50 // °C change from reference
    
    const effectiveGF = calculateEffectiveGaugeFactor(nominalGF, tempCoeff, deltaT)
    // GF_eff = 2.0 + (-0.0005) × 50 = 2.0 - 0.025 = 1.975
    expect(effectiveGF).toBeCloseTo(1.975, 4)
  })

  it('calculates gauge factor error at temperature', () => {
    const measuredStrain = 500 // microstrain actual strain
    const nominalGF = 2.0
    const effectiveGF = 1.95 // Changed due to temperature
    
    const error = calculateGaugeFactorError(measuredStrain, nominalGF, effectiveGF)
    // Error = 500 × (1.95 - 2.0) / 1.95 = -0.128 microstrain
    expect(Math.abs(error)).toBeLessThan(1)
  })

  it('calculates self-heating temperature rise in gauge', () => {
    const currentMa = 50 // mA excitation
    const gaugeResistance = 120 // Ohms
    const thermalResistance = 500 // °C/W (typical for gauges)
    
    const deltaT = calculateGaugeSelfHeating(currentMa, gaugeResistance, thermalResistance)
    // P = (0.05)² × 120 = 0.3W
    // ΔT = 0.3 × 500 = 150°C
    expect(deltaT).toBeCloseTo(150, 0)
  })

  it('corrects for creep over time', () => {
    const measuredStrain = 1000 // microstrain reading
    const creepCoeff = 0.005 // Material-dependent
    const timeHours = 24
    
    const correctedStrain = correctForCreep(measuredStrain, creepCoeff, timeHours)
    // Creep factor = 1 + 0.005 × ln(25) = 1 + 0.005 × 3.219 = 1.016
    // Corrected = 1000 / 1.016 ≈ 984
    expect(correctedStrain).toBeLessThan(measuredStrain)
    expect(correctedStrain).toBeGreaterThan(950)
  })

  it('returns correct CTE for common materials', () => {
    // Steel should be ~11e-6
    expect(THERMAL_EXPANSION_COEFFICIENTS.steel).toBe(11e-6)
    
    // Aluminum higher than steel
    expect(THERMAL_EXPANSION_COEFFICIENTS.aluminum).toBeGreaterThan(
      THERMAL_EXPANSION_COEFFICIENTS.steel
    )
    
    // Titanium lower than steel
    expect(THERMAL_EXPANSION_COEFFICIENTS.titanium).toBeLessThan(
      THERMAL_EXPANSION_COEFFICIENTS.steel
    )
  })
})
