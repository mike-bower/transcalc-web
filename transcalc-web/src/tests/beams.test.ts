import { describe, it, expect } from 'vitest'
import {
  calculateCantileverStress,
  calculateCantileverDeflection,
  calculateSimpleSupportedStress,
  stressToStrain,
  calculateCantileverMinStrain,
  calculateCantileverMaxStrain,
  calculateCantileverAvgStrain,
  calculateCantileverGradient,
  validateCantilever
} from '../domain/beams'

describe('beam solvers', () => {
  it('calculateCantileverStress', () => {
    const load = 100
    const beamWidth = 25
    const thickness = 2
    const momentArm = 100
    const moment = load * momentArm
    const sectionModulus = (beamWidth * Math.pow(thickness, 2)) / 6
    const expected = moment / sectionModulus
    const result = calculateCantileverStress(load, beamWidth, thickness, momentArm)
    expect(result).toBeCloseTo(expected, 9)
  })

  it('calculateCantileverDeflection', () => {
    const load = 100
    const length = 200
    const beamWidth = 25
    const thickness = 2
    const youngsModulus = 200000 // MPa
    const momentOfInertia = (beamWidth * Math.pow(thickness, 3)) / 12
    const expected = (load * Math.pow(length, 3)) / (3 * youngsModulus * momentOfInertia)
    const result = calculateCantileverDeflection(load, length, beamWidth, thickness, youngsModulus)
    expect(result).toBeCloseTo(expected, 9)
  })

  it('calculateSimpleSupportedStress', () => {
    const load = 100
    const span = 500
    const beamWidth = 25
    const thickness = 2
    const moment = (load * span) / 4
    const sectionModulus = (beamWidth * Math.pow(thickness, 2)) / 6
    const expected = moment / sectionModulus
    const result = calculateSimpleSupportedStress(load, span, beamWidth, thickness)
    expect(result).toBeCloseTo(expected, 9)
  })

  it('stressToStrain', () => {
    const stress = 100 // MPa
    const youngsModulus = 200000 // MPa
    const expected = (stress / youngsModulus) * 1e6
    const result = stressToStrain(stress, youngsModulus)
    expect(result).toBeCloseTo(expected, 9)
  })

  it('calculateCantileverMinStrain (ported from bbcant.pas)', () => {
    // Example: Load=100N, MomentArm=100mm, GageLength=5mm, E=200GPa, Width=25mm, Thick=2mm
    const load = 100 // N
    const arm = 100 // mm
    const gage = 5 // mm
    const youngsModulus = 200 // GPa
    const width = 25 // mm
    const thick = 2 // mm

    const result = calculateCantileverMinStrain(load, arm, gage, youngsModulus, width, thick)
    // ε_min = (6 × 100 × (0.1 - 0.0025)) / (200e9 × 0.025 × 0.04) × 1e6
    expect(result).toBeGreaterThan(0)
    expect(result).toBeLessThan(10000)
  })

  it('calculateCantileverMaxStrain (ported from bbcant.pas)', () => {
    // Example: Load=100N, MomentArm=100mm, GageLength=5mm, E=200GPa, Width=25mm, Thick=2mm
    const load = 100 // N
    const arm = 100 // mm
    const gage = 5 // mm
    const youngsModulus = 200 // GPa
    const width = 25 // mm
    const thick = 2 // mm

    const result = calculateCantileverMaxStrain(load, arm, gage, youngsModulus, width, thick)
    // ε_max = (6 × 100 × (0.1 + 0.0025)) / (200e9 × 0.025 × 0.04) × 1e6
    expect(result).toBeGreaterThan(0)
    expect(result).toBeLessThan(10000)
  })

  it('calculateCantileverAvgStrain (ported from bbcant.pas)', () => {
    // Example: Load=100N, MomentArm=100mm, E=200GPa, Width=25mm, Thick=2mm
    const load = 100 // N
    const arm = 100 // mm
    const youngsModulus = 200 // GPa
    const width = 25 // mm
    const thick = 2 // mm

    const result = calculateCantileverAvgStrain(load, arm, youngsModulus, width, thick)
    // ε_avg = (6 × 100 × 0.1) / (200e9 × 0.025 × 0.04) × 1e6
    expect(result).toBeGreaterThan(0)
    expect(result).toBeLessThan(10000)
  })

  it('calculateCantileverGradient (ported from bbcant.pas)', () => {
    // Calculate strain difference as percentage
    const maxStrain = 600 // microstrain
    const minStrain = 500 // microstrain

    const result = calculateCantileverGradient(maxStrain, minStrain)
    // Gradient = ((600 - 500) / 600) × 100 ≈ 16.67%
    expect(result).toBeCloseTo(16.667, 1)
  })

  it('calculateCantileverGradient throws on zero max strain', () => {
    expect(() => calculateCantileverGradient(0, 100)).toThrow()
  })

  describe('validateCantilever', () => {
    const validParams = {
      loadN: 100,
      momentArmMm: 100,
      youngsModulusPa: 200e9,
      beamWidthMm: 25,
      thicknessMm: 2
    }

    it('returns valid for normal parameters', () => {
      const result = validateCantilever(validParams, 5, 1000)
      expect(result.isValid).toBe(true)
      expect(result.warnings).toHaveLength(0)
    })

    it('warns if strain exceeds 5000 microstrain', () => {
      // 6000 microstrain
      const result = validateCantilever(validParams, 5, 6000)
      expect(result.isValid).toBe(true)
      expect(result.warnings).toContain('Design exceeds 5000 microstrain; might be impractical.')
    })

    it('returns error for zero thickness', () => {
      const result = validateCantilever({ ...validParams, thicknessMm: 0 }, 5, 1000)
      expect(result.isValid).toBe(false)
      expect(result.errorMessage).toBe('Thickness must be greater than zero.')
    })

    it('returns error for zero width', () => {
      const result = validateCantilever({ ...validParams, beamWidthMm: 0 }, 5, 1000)
      expect(result.isValid).toBe(false)
      expect(result.errorMessage).toBe('Beam width must be greater than zero.')
    })

    it('warns if gage length is overly large compared to moment arm', () => {
      // Gage length = 150mm, Moment Arm = 100mm -> 150%
      const result = validateCantilever(validParams, 150, 1000)
      expect(result.isValid).toBe(true)
      expect(result.warnings).toContain('Gage length is large relative to moment arm; accuracy may suffer.')
    })
  })
})
