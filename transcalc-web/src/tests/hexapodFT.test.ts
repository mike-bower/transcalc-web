import { describe, it, expect } from 'vitest'
import { designHexapodFT, generateHexapodCalibrationProcedure, type HexapodFTParams } from '../domain/hexapodFT'

// Reference: symmetric steel hexapod, 15° strut spread (ATI-style topology)
const BASE: HexapodFTParams = {
  topRingRadiusMm: 35,
  bottomRingRadiusMm: 35,
  platformHeightMm: 30,
  topAnglesOffsetDeg: 0,
  strutSpreadDeg: 15,
  strutDiameterMm: 2,
  youngsModulusPa: 200e9,
  poissonRatio: 0.29,
  gageFactor: 2.0,
  bridgeType: 'quarter',
  densityKgM3: 7850,
  ratedForceN: 200,
  ratedMomentNm: 5,
}

describe('designHexapodFT — validation', () => {
  it('returns isValid for good geometry', () => {
    const r = designHexapodFT(BASE)
    expect(r.isValid).toBe(true)
    expect(r.error).toBeUndefined()
  })

  it('rejects zero top ring radius', () => {
    const r = designHexapodFT({ ...BASE, topRingRadiusMm: 0 })
    expect(r.isValid).toBe(false)
    expect(r.error).toMatch(/radii/i)
  })

  it('rejects zero platform height', () => {
    const r = designHexapodFT({ ...BASE, platformHeightMm: 0 })
    expect(r.isValid).toBe(false)
  })

  it('rejects zero strut diameter', () => {
    const r = designHexapodFT({ ...BASE, strutDiameterMm: 0 })
    expect(r.isValid).toBe(false)
  })

  it('rejects zero rated force', () => {
    const r = designHexapodFT({ ...BASE, ratedForceN: 0 })
    expect(r.isValid).toBe(false)
  })

  it('rejects zero rated moment', () => {
    const r = designHexapodFT({ ...BASE, ratedMomentNm: 0 })
    expect(r.isValid).toBe(false)
  })

  it('accepts GPa modulus input (auto-converts)', () => {
    const r1 = designHexapodFT(BASE)
    const r2 = designHexapodFT({ ...BASE, youngsModulusPa: 200 })  // 200 GPa
    expect(r2.isValid).toBe(true)
    expect(r2.strutSensitivityMvVPerN).toBeCloseTo(r1.strutSensitivityMvVPerN, 8)
  })
})

describe('designHexapodFT — strut geometry', () => {
  it('produces exactly 6 struts', () => {
    const r = designHexapodFT(BASE)
    expect(r.struts).toHaveLength(6)
  })

  it('uses 3 distinct top attachment points (indices 0, 1, 2)', () => {
    const r = designHexapodFT(BASE)
    const topIndices = new Set(r.struts.map(s => s.topAttachIndex))
    expect([...topIndices].sort()).toEqual([0, 1, 2])
  })

  it('each top attachment point has exactly 2 struts', () => {
    const r = designHexapodFT(BASE)
    for (let k = 0; k < 3; k++) {
      const count = r.struts.filter(s => s.topAttachIndex === k).length
      expect(count).toBe(2)
    }
  })

  it('strut unit vectors are unit length', () => {
    const r = designHexapodFT(BASE)
    for (const s of r.struts) {
      const mag = Math.sqrt(s.unitVector[0] ** 2 + s.unitVector[1] ** 2 + s.unitVector[2] ** 2)
      expect(mag).toBeCloseTo(1, 10)
    }
  })

  it('tilt angle is between 0° and 90°', () => {
    const r = designHexapodFT(BASE)
    for (const s of r.struts) {
      expect(s.tiltDeg).toBeGreaterThan(0)
      expect(s.tiltDeg).toBeLessThan(90)
    }
  })

  it('top attachment Z coordinates are all +h/2', () => {
    const r = designHexapodFT(BASE)
    for (const s of r.struts) {
      expect(s.topMm[2]).toBeCloseTo(BASE.platformHeightMm / 2, 6)
    }
  })

  it('bottom attachment Z coordinates are all -h/2', () => {
    const r = designHexapodFT(BASE)
    for (const s of r.struts) {
      expect(s.bottomMm[2]).toBeCloseTo(-BASE.platformHeightMm / 2, 6)
    }
  })

  it('larger ring radius increases strut tilt angle', () => {
    const wide   = designHexapodFT({ ...BASE, topRingRadiusMm: 60, bottomRingRadiusMm: 60 })
    const narrow = designHexapodFT({ ...BASE, topRingRadiusMm: 15, bottomRingRadiusMm: 15 })
    expect(wide.struts[0].tiltDeg).toBeGreaterThan(narrow.struts[0].tiltDeg)
  })
})

describe('designHexapodFT — Jacobian', () => {
  it('Jacobian is 6×6', () => {
    const r = designHexapodFT(BASE)
    expect(r.jacobian).toHaveLength(6)
    expect(r.jacobian[0]).toHaveLength(6)
  })

  it('J × J_inv ≈ identity (6×6)', () => {
    const r = designHexapodFT(BASE)
    const J  = r.jacobian
    const Ji = r.jacobianInverse
    for (let row = 0; row < 6; row++) {
      for (let col = 0; col < 6; col++) {
        const prod = J[row].reduce((s, v, k) => s + v * Ji[k][col], 0)
        expect(prod).toBeCloseTo(row === col ? 1 : 0, 8)
      }
    }
  })

  it('J_inv × J ≈ identity (6×6)', () => {
    const r = designHexapodFT(BASE)
    const J  = r.jacobian
    const Ji = r.jacobianInverse
    for (let row = 0; row < 6; row++) {
      for (let col = 0; col < 6; col++) {
        const prod = Ji[row].reduce((s, v, k) => s + v * J[k][col], 0)
        expect(prod).toBeCloseTo(row === col ? 1 : 0, 8)
      }
    }
  })
})

describe('designHexapodFT — condition number', () => {
  it('condition number is >= 1', () => {
    const r = designHexapodFT(BASE)
    expect(r.conditionNumber).toBeGreaterThanOrEqual(1)
  })

  it('symmetric geometry (equal radii, 15° spread) has finite condition number', () => {
    const r = designHexapodFT(BASE)
    expect(r.conditionNumber).toBeGreaterThanOrEqual(1)
    expect(Number.isFinite(r.conditionNumber)).toBe(true)
  })

  it('cross-axis coupling is 0 for ideal geometry', () => {
    const r = designHexapodFT(BASE)
    expect(r.crossAxisCouplingPct).toBe(0)
  })

  it('larger strut spread improves (reduces) condition number up to a point', () => {
    const r5  = designHexapodFT({ ...BASE, strutSpreadDeg: 5 })
    const r20 = designHexapodFT({ ...BASE, strutSpreadDeg: 20 })
    // r5 is near-degenerate (very small spread), so it should have higher kappa
    expect(r5.conditionNumber).toBeGreaterThan(r20.conditionNumber)
  })
})

describe('designHexapodFT — sensitivity', () => {
  it('strut sensitivity is positive', () => {
    const r = designHexapodFT(BASE)
    expect(r.strutSensitivityMvVPerN).toBeGreaterThan(0)
  })

  it('strut sensitivity scales inversely with E', () => {
    const soft  = designHexapodFT({ ...BASE, youngsModulusPa: 100e9 })
    const stiff = designHexapodFT({ ...BASE, youngsModulusPa: 200e9 })
    expect(soft.strutSensitivityMvVPerN).toBeCloseTo(stiff.strutSensitivityMvVPerN * 2, 8)
  })

  it('strut sensitivity scales inversely with cross-section area (d²)', () => {
    const thin  = designHexapodFT({ ...BASE, strutDiameterMm: 1 })
    const thick = designHexapodFT({ ...BASE, strutDiameterMm: 2 })
    // A ∝ d², so S ∝ 1/d² → ratio = 4
    expect(thin.strutSensitivityMvVPerN / thick.strutSensitivityMvVPerN).toBeCloseTo(4, 6)
  })

  it('full bridge has 4× sensitivity of quarter bridge', () => {
    const qtr  = designHexapodFT({ ...BASE, bridgeType: 'quarter' })
    const full = designHexapodFT({ ...BASE, bridgeType: 'full' })
    expect(full.strutSensitivityMvVPerN).toBeCloseTo(qtr.strutSensitivityMvVPerN * 4, 8)
  })

  it('all rated outputs are positive', () => {
    const r = designHexapodFT(BASE)
    for (const key of ['Fx', 'Fy', 'Fz', 'Mx', 'My', 'Mz'] as const) {
      expect(r.ratedOutput[key]).toBeGreaterThan(0)
    }
  })

  it('Fx and Fy rated outputs are equal (3-fold symmetry)', () => {
    const r = designHexapodFT(BASE)
    expect(r.ratedOutput.Fx).toBeCloseTo(r.ratedOutput.Fy, 6)
  })

  it('Mx and My rated outputs are equal (3-fold symmetry)', () => {
    const r = designHexapodFT(BASE)
    expect(r.ratedOutput.Mx).toBeCloseTo(r.ratedOutput.My, 6)
  })

  it('rated output scales linearly with rated force', () => {
    const r1 = designHexapodFT({ ...BASE, ratedForceN: 100 })
    const r2 = designHexapodFT({ ...BASE, ratedForceN: 200 })
    expect(r2.ratedOutput.Fz).toBeCloseTo(r1.ratedOutput.Fz * 2, 6)
  })
})

describe('designHexapodFT — strain and safety', () => {
  it('max strut strain is positive', () => {
    const r = designHexapodFT(BASE)
    expect(r.maxStrutStrainMicrostrain).toBeGreaterThan(0)
  })

  it('strain safety factor = 1500 / maxStrain', () => {
    const r = designHexapodFT(BASE)
    expect(r.strainSafetyFactor).toBeCloseTo(1500 / r.maxStrutStrainMicrostrain, 6)
  })

  it('larger strut diameter reduces strain (increases safety factor)', () => {
    const thin  = designHexapodFT({ ...BASE, strutDiameterMm: 1 })
    const thick = designHexapodFT({ ...BASE, strutDiameterMm: 3 })
    expect(thick.strainSafetyFactor).toBeGreaterThan(thin.strainSafetyFactor)
  })

  it('yields warning when max strain exceeds 1500 µε', () => {
    const r = designHexapodFT({ ...BASE, strutDiameterMm: 0.3, ratedForceN: 2000 })
    expect(r.warnings.some(w => /exceed/i.test(w))).toBe(true)
  })

  it('yieldSafetyFactor is undefined without yieldStrengthPa', () => {
    const r = designHexapodFT(BASE)
    expect(r.yieldSafetyFactor).toBeUndefined()
  })

  it('yieldSafetyFactor is defined when yieldStrengthPa is supplied', () => {
    const r = designHexapodFT({ ...BASE, yieldStrengthPa: 500e6 })
    expect(r.yieldSafetyFactor).toBeDefined()
    expect(r.yieldSafetyFactor!).toBeGreaterThan(0)
  })

  it('yieldSafetyFactor = yieldStrength / (maxStrain × E)', () => {
    const yld = 500e6
    const r = designHexapodFT({ ...BASE, yieldStrengthPa: yld })
    const expected = yld / (r.maxStrutStrainMicrostrain * 1e-6 * 200e9)
    expect(r.yieldSafetyFactor!).toBeCloseTo(expected, 6)
  })
})

describe('designHexapodFT — stiffness and dynamics', () => {
  it('natural frequency is positive', () => {
    const r = designHexapodFT(BASE)
    expect(r.naturalFrequencyFzHz).toBeGreaterThan(0)
  })

  it('natural frequency is independent of strut diameter (k∝A and mass∝A cancel)', () => {
    // For struts that are both the spring and the mass: k_Fz ∝ A, mass ∝ A → fn = const.
    // This is the axial rod resonance result: fn does not depend on cross-section.
    const thin  = designHexapodFT({ ...BASE, strutDiameterMm: 1 })
    const thick = designHexapodFT({ ...BASE, strutDiameterMm: 4 })
    expect(thick.naturalFrequencyFzHz).toBeCloseTo(thin.naturalFrequencyFzHz, 4)
  })

  it('stiffer material increases natural frequency', () => {
    const soft  = designHexapodFT({ ...BASE, youngsModulusPa: 70e9 })   // Al
    const stiff = designHexapodFT({ ...BASE, youngsModulusPa: 200e9 })  // steel
    expect(stiff.naturalFrequencyFzHz).toBeGreaterThan(soft.naturalFrequencyFzHz)
  })
})

describe('designHexapodFT — geometry output', () => {
  it('geometry echoes input dimensions', () => {
    const r = designHexapodFT(BASE)
    expect(r.geometry.topRingRadiusMm).toBe(BASE.topRingRadiusMm)
    expect(r.geometry.bottomRingRadiusMm).toBe(BASE.bottomRingRadiusMm)
    expect(r.geometry.platformHeightMm).toBe(BASE.platformHeightMm)
    expect(r.geometry.strutDiameterMm).toBe(BASE.strutDiameterMm)
    expect(r.geometry.strutSpreadDeg).toBe(BASE.strutSpreadDeg)
  })

  it('average strut length is greater than platform height (struts are inclined)', () => {
    const r = designHexapodFT(BASE)
    expect(r.geometry.strutLengthMm).toBeGreaterThan(BASE.platformHeightMm)
  })

  it('tilt angle > 0 when ring radii are non-zero', () => {
    const r = designHexapodFT(BASE)
    expect(r.geometry.tiltDeg).toBeGreaterThan(0)
  })
})

describe('designHexapodFT — calibration procedure (Ahmad et al. 2021)', () => {
  it('returns exactly 12 load steps', () => {
    const r = designHexapodFT(BASE)
    const cal = generateHexapodCalibrationProcedure(r, BASE)
    expect(cal.loadSteps).toHaveLength(12)
  })

  it('calibration matrix is 6×6', () => {
    const r = designHexapodFT(BASE)
    const cal = generateHexapodCalibrationProcedure(r, BASE)
    expect(cal.matrix).toHaveLength(6)
    expect(cal.matrix[0]).toHaveLength(6)
  })

  it('steps cover all 6 DOFs with both signs', () => {
    const r = designHexapodFT(BASE)
    const cal = generateHexapodCalibrationProcedure(r, BASE)
    const labels = cal.loadSteps.map(s => s.label)
    for (const ch of ['Fx', 'Fy', 'Fz', 'Mx', 'My', 'Mz']) {
      expect(labels).toContain(`+${ch} at rated`)
      expect(labels).toContain(`−${ch} at rated`)
    }
  })

  it('+Fz step applied load has only Fz non-zero', () => {
    const r = designHexapodFT(BASE)
    const cal = generateHexapodCalibrationProcedure(r, BASE)
    const plusFz = cal.loadSteps.find(s => s.label === '+Fz at rated')!
    expect(plusFz.appliedLoad[2]).toBeCloseTo(BASE.ratedForceN, 6)
    expect(plusFz.appliedLoad[0]).toBe(0)
    expect(plusFz.appliedLoad[1]).toBe(0)
  })

  it('+Fz step produces non-zero strut voltages (struts share Fz through Jacobian)', () => {
    const r = designHexapodFT(BASE)
    const cal = generateHexapodCalibrationProcedure(r, BASE)
    const plusFz = cal.loadSteps.find(s => s.label === '+Fz at rated')!
    const totalV = plusFz.expectedVoltages.reduce((s, v) => s + Math.abs(v), 0)
    expect(totalV).toBeGreaterThan(0)
  })

  it('−Fz expected voltages are negatives of +Fz voltages', () => {
    const r = designHexapodFT(BASE)
    const cal = generateHexapodCalibrationProcedure(r, BASE)
    const plusFz  = cal.loadSteps.find(s => s.label === '+Fz at rated')!
    const minusFz = cal.loadSteps.find(s => s.label === '−Fz at rated')!
    for (let i = 0; i < 6; i++) {
      expect(minusFz.expectedVoltages[i]).toBeCloseTo(-plusFz.expectedVoltages[i], 8)
    }
  })
})
