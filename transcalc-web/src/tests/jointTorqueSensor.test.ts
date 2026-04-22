import { describe, it, expect } from 'vitest'
import { designJTS, type JTSParams } from '../domain/jointTorqueSensor'

const BASE: JTSParams = {
  outerRadiusMm: 60,
  innerRadiusMm: 25,
  spokeWidthMm: 8,
  spokeThicknessMm: 3,
  spokeCount: 4,
  ratedTorqueNm: 50,
  youngsModulusPa: 200e9,
  poissonRatio: 0.3,
  gageFactor: 2.0,
  densityKgM3: 7850,
}

describe('designJTS — validation', () => {
  it('returns isValid=true for base params', () => {
    const r = designJTS(BASE)
    expect(r.isValid).toBe(true)
    expect(r.error).toBeUndefined()
  })

  it('rejects Ri >= Ro', () => {
    const r = designJTS({ ...BASE, innerRadiusMm: 70 })
    expect(r.isValid).toBe(false)
    expect(r.error).toMatch(/inner radius must be less than outer/i)
  })

  it('rejects non-integer spoke count', () => {
    const r = designJTS({ ...BASE, spokeCount: 3.5 })
    expect(r.isValid).toBe(false)
  })

  it('rejects spoke count < 2', () => {
    const r = designJTS({ ...BASE, spokeCount: 1 })
    expect(r.isValid).toBe(false)
  })

  it('rejects zero torque', () => {
    const r = designJTS({ ...BASE, ratedTorqueNm: 0 })
    expect(r.isValid).toBe(false)
  })

  it('accepts GPa-scale modulus and auto-converts', () => {
    const rGpa = designJTS({ ...BASE, youngsModulusPa: 200 })      // GPa (< 1e6)
    const rPa  = designJTS({ ...BASE, youngsModulusPa: 200e9 })    // Pa
    expect(rGpa.stiffnessNmPerRad).toBeCloseTo(rPa.stiffnessNmPerRad, 0)
  })
})

describe('designJTS — stiffness', () => {
  it('stiffness scales linearly with spoke count', () => {
    const r4 = designJTS({ ...BASE, spokeCount: 4 })
    const r8 = designJTS({ ...BASE, spokeCount: 8 })
    expect(r8.stiffnessNmPerRad / r4.stiffnessNmPerRad).toBeCloseTo(2, 4)
  })

  it('stiffness scales with t³', () => {
    const r1 = designJTS({ ...BASE, spokeThicknessMm: 3 })
    const r2 = designJTS({ ...BASE, spokeThicknessMm: 6 })
    // K ∝ t³, so doubling t → 8× stiffness
    expect(r2.stiffnessNmPerRad / r1.stiffnessNmPerRad).toBeCloseTo(8, 3)
  })

  it('stiffness scales linearly with spoke width', () => {
    const r1 = designJTS({ ...BASE, spokeWidthMm: 8 })
    const r2 = designJTS({ ...BASE, spokeWidthMm: 16 })
    expect(r2.stiffnessNmPerRad / r1.stiffnessNmPerRad).toBeCloseTo(2, 4)
  })

  it('stiffness scales linearly with modulus', () => {
    const rSteel = designJTS({ ...BASE, youngsModulusPa: 200e9 })
    const rAlum  = designJTS({ ...BASE, youngsModulusPa: 70e9 })
    expect(rSteel.stiffnessNmPerRad / rAlum.stiffnessNmPerRad).toBeCloseTo(200 / 70, 4)
  })

  it('compliance is reciprocal of stiffness', () => {
    const r = designJTS(BASE)
    expect(r.complianceRadPerNm).toBeCloseTo(1 / r.stiffnessNmPerRad, 10)
  })

  it('deflection = torque × compliance in mrad', () => {
    const r = designJTS(BASE)
    expect(r.deflectionAtRatedMrad).toBeCloseTo(BASE.ratedTorqueNm * r.complianceRadPerNm * 1000, 6)
  })
})

describe('designJTS — strain and sensitivity', () => {
  it('peak strain scales linearly with rated torque', () => {
    const r1 = designJTS({ ...BASE, ratedTorqueNm: 50 })
    const r2 = designJTS({ ...BASE, ratedTorqueNm: 100 })
    expect(r2.peakStrainMicrostrain / r1.peakStrainMicrostrain).toBeCloseTo(2, 4)
  })

  it('peak strain scales with t⁻²', () => {
    // σ ∝ 1/t², so doubling t → strain drops by 4× (at fixed torque)
    const r1 = designJTS({ ...BASE, spokeThicknessMm: 3 })
    const r2 = designJTS({ ...BASE, spokeThicknessMm: 6 })
    expect(r1.peakStrainMicrostrain / r2.peakStrainMicrostrain).toBeCloseTo(4, 3)
  })

  it('spanMvV = GF × strain_µε × 1e-3', () => {
    const r = designJTS(BASE)
    expect(r.spanMvV).toBeCloseTo(BASE.gageFactor * r.peakStrainMicrostrain * 1e-3, 8)
  })

  it('sensitivity = spanMvV / ratedTorque', () => {
    const r = designJTS(BASE)
    expect(r.sensitivityMvVPerNm).toBeCloseTo(r.spanMvV / BASE.ratedTorqueNm, 8)
  })

  it('strain safety factor = 1500 / peakStrain', () => {
    const r = designJTS(BASE)
    expect(r.strainSafetyFactor).toBeCloseTo(1500 / r.peakStrainMicrostrain, 6)
  })

  it('yield safety factor = yield / stress', () => {
    const yield_Pa = 500e6
    const r = designJTS({ ...BASE, yieldStrengthPa: yield_Pa })
    expect(r.yieldSafetyFactor).toBeDefined()
    expect(r.yieldSafetyFactor!).toBeCloseTo(yield_Pa / (r.peakStressMPa * 1e6), 5)
  })

  it('peak stress in MPa = E × strain_µε × 1e-6 in MPa', () => {
    const r = designJTS(BASE)
    const stressFromStrain = (BASE.youngsModulusPa * r.peakStrainMicrostrain * 1e-6) / 1e6
    expect(r.peakStressMPa).toBeCloseTo(stressFromStrain, 4)
  })
})

describe('designJTS — geometry', () => {
  it('spoke length = Ro − Ri', () => {
    const r = designJTS(BASE)
    expect(r.geo.spokeLengthMm).toBeCloseTo(BASE.outerRadiusMm - BASE.innerRadiusMm, 6)
  })

  it('pitch radius = (Ro + Ri) / 2', () => {
    const r = designJTS(BASE)
    expect(r.geo.pitchRadiusMm).toBeCloseTo((BASE.outerRadiusMm + BASE.innerRadiusMm) / 2, 6)
  })

  it('moment of inertia = w × t³ / 12 (mm⁴)', () => {
    const r = designJTS(BASE)
    const expected = BASE.spokeWidthMm * Math.pow(BASE.spokeThicknessMm, 3) / 12
    expect(r.geo.momentOfInertiaMm4).toBeCloseTo(expected, 6)
  })
})

describe('designJTS — natural frequency', () => {
  it('natural frequency is positive for valid inputs', () => {
    const r = designJTS(BASE)
    expect(r.naturalFrequencyHz).toBeGreaterThan(0)
  })

  it('natural frequency increases with stiffness (more spokes)', () => {
    const r4 = designJTS({ ...BASE, spokeCount: 4 })
    const r8 = designJTS({ ...BASE, spokeCount: 8 })
    expect(r8.naturalFrequencyHz).toBeGreaterThan(r4.naturalFrequencyHz)
  })
})

describe('designJTS — warnings', () => {
  it('warns when peak strain exceeds 1500 µε', () => {
    // Use thin spoke + high torque to exceed limit
    const r = designJTS({ ...BASE, spokeThicknessMm: 1, ratedTorqueNm: 200 })
    expect(r.warnings.some(w => w.includes('1500'))).toBe(true)
  })

  it('warns when yield SF < 1.5', () => {
    const r = designJTS({ ...BASE, yieldStrengthPa: 1e6, ratedTorqueNm: 200 })
    expect(r.isValid).toBe(true) // geometry is still valid
    expect(r.warnings.some(w => w.toLowerCase().includes('yield'))).toBe(true)
  })

  it('no warnings for conservative nominal design', () => {
    const r = designJTS({ ...BASE, ratedTorqueNm: 5 })
    const strainWarnings = r.warnings.filter(w => w.includes('1500'))
    expect(strainWarnings).toHaveLength(0)
  })
})
