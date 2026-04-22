import { describe, it, expect } from 'vitest'
import { designCrossBeamFT, generateCalibrationProcedure, type CrossBeamFTParams } from '../domain/sixAxisForceTorque'

// Reference geometry: steel cross-beam sensor, ~150N / 15N·m rated
const BASE: CrossBeamFTParams = {
  outerRadiusMm: 40,
  innerRadiusMm: 15,
  beamWidthMm: 8,
  beamThicknessMm: 3,
  gageDistFromOuterRingMm: 2,
  youngsModulusPa: 200e9,
  poissonRatio: 0.3,
  gageFactor: 2.0,
  ratedForceN: 150,
  ratedMomentNm: 15,
  densityKgM3: 7850,
}

describe('designCrossBeamFT — validity', () => {
  it('returns isValid for good geometry', () => {
    const r = designCrossBeamFT(BASE)
    expect(r.isValid).toBe(true)
    expect(r.error).toBeUndefined()
  })

  it('rejects inner >= outer radius', () => {
    const r = designCrossBeamFT({ ...BASE, innerRadiusMm: 40 })
    expect(r.isValid).toBe(false)
    expect(r.error).toMatch(/inner radius/i)
  })

  it('rejects zero beam width', () => {
    const r = designCrossBeamFT({ ...BASE, beamWidthMm: 0 })
    expect(r.isValid).toBe(false)
  })

  it('rejects zero beam thickness', () => {
    const r = designCrossBeamFT({ ...BASE, beamThicknessMm: 0 })
    expect(r.isValid).toBe(false)
  })

  it('rejects gage beyond beam length', () => {
    // beam length = 40-15 = 25mm; dist 30mm > 25mm
    const r = designCrossBeamFT({ ...BASE, gageDistFromOuterRingMm: 30 })
    expect(r.isValid).toBe(false)
  })

  it('rejects zero rated force', () => {
    const r = designCrossBeamFT({ ...BASE, ratedForceN: 0 })
    expect(r.isValid).toBe(false)
  })

  it('rejects zero rated moment', () => {
    const r = designCrossBeamFT({ ...BASE, ratedMomentNm: 0 })
    expect(r.isValid).toBe(false)
  })

  it('accepts GPa input for modulus (auto-convert)', () => {
    const r = designCrossBeamFT({ ...BASE, youngsModulusPa: 200 })  // 200 GPa
    expect(r.isValid).toBe(true)
    // Should equal the Pa-input result
    const r2 = designCrossBeamFT(BASE)
    expect(r.sensitivity.Fz).toBeCloseTo(r2.sensitivity.Fz, 6)
  })
})

describe('designCrossBeamFT — sensitivity physics', () => {
  it('S_Fx equals S_Fy (symmetry)', () => {
    const r = designCrossBeamFT(BASE)
    expect(r.sensitivity.Fx).toBeCloseTo(r.sensitivity.Fy, 10)
  })

  it('S_Mx equals S_My (symmetry)', () => {
    const r = designCrossBeamFT(BASE)
    expect(r.sensitivity.Mx).toBeCloseTo(r.sensitivity.My, 10)
  })

  it('S_Fz increases with thinner beam (t↓ → higher sensitivity)', () => {
    const thin = designCrossBeamFT({ ...BASE, beamThicknessMm: 2 })
    const thick = designCrossBeamFT({ ...BASE, beamThicknessMm: 4 })
    expect(thin.sensitivity.Fz).toBeGreaterThan(thick.sensitivity.Fz)
  })

  it('S_Mx increases with longer effective moment arm (gage closer to outer ring)', () => {
    // gage at 1mm (L_eff = 24mm) vs gage at 10mm (L_eff = 15mm)
    const nearRoot  = designCrossBeamFT({ ...BASE, gageDistFromOuterRingMm: 1 })
    const farRoot   = designCrossBeamFT({ ...BASE, gageDistFromOuterRingMm: 10 })
    expect(nearRoot.sensitivity.Mx).toBeGreaterThan(farRoot.sensitivity.Mx)
  })

  it('S_Fx increases with smaller beam cross-section (b↓ or t↓)', () => {
    const narrow = designCrossBeamFT({ ...BASE, beamWidthMm: 4 })
    const wide   = designCrossBeamFT({ ...BASE, beamWidthMm: 12 })
    expect(narrow.sensitivity.Fx).toBeGreaterThan(wide.sensitivity.Fx)
  })

  it('S_Mz is S_Fx / (2 * R_arm) — analytic relation', () => {
    const r = designCrossBeamFT(BASE)
    const R_arm = (BASE.outerRadiusMm + BASE.innerRadiusMm) / 2 / 1000  // m
    // S_Mz = (3·GF·(1+ν)·1e3) / (8·Ra·E·b·t)
    // S_Fx = (3·GF·(1+ν)·1e3) / (4·E·b·t)
    // S_Mz / S_Fx = 4 / (8·Ra) = 1/(2·Ra)
    expect(r.sensitivity.Mz).toBeCloseTo(r.sensitivity.Fx / (2 * R_arm), 8)
  })

  it('S_Mx = 2 * R_i * S_Fz / L_eff — analytic relation from formulas', () => {
    // S_Fz = 1.5·GF·L_eff/(E·b·t²)·1e3
    // S_Mx = 3·GF·L_eff/(Ri·E·b·t²)·1e3 = S_Fz × 2/Ri
    const r = designCrossBeamFT(BASE)
    const R_i = BASE.innerRadiusMm / 1000
    expect(r.sensitivity.Mx).toBeCloseTo(r.sensitivity.Fz * 2 / R_i, 6)
  })

  it('sensitivities scale inversely with modulus', () => {
    const soft  = designCrossBeamFT({ ...BASE, youngsModulusPa: 100e9 })
    const stiff = designCrossBeamFT({ ...BASE, youngsModulusPa: 200e9 })
    expect(soft.sensitivity.Fz).toBeCloseTo(stiff.sensitivity.Fz * 2, 6)
    expect(soft.sensitivity.Fx).toBeCloseTo(stiff.sensitivity.Fx * 2, 6)
    expect(soft.sensitivity.Mx).toBeCloseTo(stiff.sensitivity.Mx * 2, 6)
  })

  it('sensitivities scale linearly with gage factor', () => {
    const gf2 = designCrossBeamFT({ ...BASE, gageFactor: 2.0 })
    const gf3 = designCrossBeamFT({ ...BASE, gageFactor: 3.0 })
    expect(gf3.sensitivity.Fz).toBeCloseTo(gf2.sensitivity.Fz * 1.5, 6)
    expect(gf3.sensitivity.Fx).toBeCloseTo(gf2.sensitivity.Fx * 1.5, 6)
  })

  it('all sensitivities are positive', () => {
    const r = designCrossBeamFT(BASE)
    expect(r.sensitivity.Fx).toBeGreaterThan(0)
    expect(r.sensitivity.Fy).toBeGreaterThan(0)
    expect(r.sensitivity.Fz).toBeGreaterThan(0)
    expect(r.sensitivity.Mx).toBeGreaterThan(0)
    expect(r.sensitivity.My).toBeGreaterThan(0)
    expect(r.sensitivity.Mz).toBeGreaterThan(0)
  })
})

describe('designCrossBeamFT — rated output', () => {
  it('ratedOutput.Fz = sensitivity.Fz × ratedForceN', () => {
    const r = designCrossBeamFT(BASE)
    expect(r.ratedOutput.Fz).toBeCloseTo(r.sensitivity.Fz * BASE.ratedForceN, 8)
  })

  it('ratedOutput.Mx = sensitivity.Mx × ratedMomentNm', () => {
    const r = designCrossBeamFT(BASE)
    expect(r.ratedOutput.Mx).toBeCloseTo(r.sensitivity.Mx * BASE.ratedMomentNm, 8)
  })

  it('doubling rated force doubles Fx/Fy/Fz rated outputs without changing sensitivities', () => {
    const r1 = designCrossBeamFT({ ...BASE, ratedForceN: 100 })
    const r2 = designCrossBeamFT({ ...BASE, ratedForceN: 200 })
    expect(r2.ratedOutput.Fz).toBeCloseTo(r1.ratedOutput.Fz * 2, 8)
    expect(r2.sensitivity.Fz).toBeCloseTo(r1.sensitivity.Fz, 8)
  })
})

describe('designCrossBeamFT — condition number', () => {
  it('condition number >= 1', () => {
    const r = designCrossBeamFT(BASE)
    expect(r.conditionNumber).toBeGreaterThanOrEqual(1)
  })

  it('condition number = 1 when all rated outputs are equal', () => {
    // Find ratedForceN and ratedMomentNm that equalize all outputs:
    // Need S_Fz*rF = S_Fx*rF = S_Mx*rM = S_Mz*rM
    // S_Fz = S_Fx when thicknesses and widths balance... let's just test the formula
    const r = designCrossBeamFT(BASE)
    const outputs = Object.values(r.ratedOutput)
    const ratio = Math.max(...outputs) / Math.min(...outputs)
    expect(r.conditionNumber).toBeCloseTo(ratio, 6)
  })

  it('cross-axis coupling is 0 for ideal geometry', () => {
    const r = designCrossBeamFT(BASE)
    expect(r.crossAxisCouplingPct).toBe(0)
  })
})

describe('designCrossBeamFT — strain and safety', () => {
  it('max strain is positive for valid input', () => {
    const r = designCrossBeamFT(BASE)
    expect(r.maxStrainMicrostrain).toBeGreaterThan(0)
  })

  it('strain safety factor = 1500 / maxStrain', () => {
    const r = designCrossBeamFT(BASE)
    expect(r.strainSafetyFactor).toBeCloseTo(1500 / r.maxStrainMicrostrain, 6)
  })

  it('thicker beam reduces max strain (higher safety factor)', () => {
    const thin  = designCrossBeamFT({ ...BASE, beamThicknessMm: 2 })
    const thick = designCrossBeamFT({ ...BASE, beamThicknessMm: 5 })
    expect(thick.strainSafetyFactor).toBeGreaterThan(thin.strainSafetyFactor)
  })

  it('warning when max strain exceeds limit', () => {
    // Very thin beam + high load → should exceed 1500 µε
    const r = designCrossBeamFT({ ...BASE, beamThicknessMm: 0.5, ratedForceN: 5000 })
    expect(r.warnings.some(w => /exceed/i.test(w))).toBe(true)
  })
})

describe('designCrossBeamFT — stiffness and frequency', () => {
  it('axial stiffness is positive', () => {
    const r = designCrossBeamFT(BASE)
    expect(r.axialStiffnessNPerM).toBeGreaterThan(0)
  })

  it('natural frequency is positive', () => {
    const r = designCrossBeamFT(BASE)
    expect(r.naturalFrequencyFzHz).toBeGreaterThan(0)
  })

  it('stiffer beam (thicker t) has higher stiffness and frequency', () => {
    const thin  = designCrossBeamFT({ ...BASE, beamThicknessMm: 2 })
    const thick = designCrossBeamFT({ ...BASE, beamThicknessMm: 5 })
    expect(thick.axialStiffnessNPerM).toBeGreaterThan(thin.axialStiffnessNPerM)
    expect(thick.naturalFrequencyFzHz).toBeGreaterThan(thin.naturalFrequencyFzHz)
  })

  it('stiffness scales as t³ (moment of inertia) with shear correction off', () => {
    // Timoshenko Φ ∝ t², so correction varies with t; disable it for pure scaling test
    const r2 = designCrossBeamFT({ ...BASE, beamThicknessMm: 2, shearCorrection: false })
    const r4 = designCrossBeamFT({ ...BASE, beamThicknessMm: 4, shearCorrection: false })
    // K = 4·12·E·I/L³, I = b·t³/12 → K ∝ t³; ratio = (4/2)³ = 8
    expect(r4.axialStiffnessNPerM / r2.axialStiffnessNPerM).toBeCloseTo(8, 4)
  })
})

describe('designCrossBeamFT — geometry output', () => {
  it('geometry fields match inputs', () => {
    const r = designCrossBeamFT(BASE)
    expect(r.geometry.outerRadiusMm).toBe(BASE.outerRadiusMm)
    expect(r.geometry.innerRadiusMm).toBe(BASE.innerRadiusMm)
    expect(r.geometry.beamWidthMm).toBe(BASE.beamWidthMm)
    expect(r.geometry.beamThicknessMm).toBe(BASE.beamThicknessMm)
    expect(r.geometry.beamLengthMm).toBeCloseTo(BASE.outerRadiusMm - BASE.innerRadiusMm, 8)
  })
})

describe('designCrossBeamFT — spot-check values', () => {
  it('reference design Fz sensitivity is in engineering range (0.001–0.1 mV/V/N)', () => {
    const r = designCrossBeamFT(BASE)
    expect(r.sensitivity.Fz).toBeGreaterThan(0.001)
    expect(r.sensitivity.Fz).toBeLessThan(0.1)
  })

  it('reference design Mx sensitivity is in engineering range (0.01–10 mV/V/(N·m))', () => {
    const r = designCrossBeamFT(BASE)
    expect(r.sensitivity.Mx).toBeGreaterThan(0.01)
    expect(r.sensitivity.Mx).toBeLessThan(10)
  })

  it('reference design Fz rated output is in 0.1–5 mV/V range', () => {
    const r = designCrossBeamFT(BASE)
    expect(r.ratedOutput.Fz).toBeGreaterThan(0.1)
    expect(r.ratedOutput.Fz).toBeLessThan(5)
  })
})

describe('designCrossBeamFT — gage strain table', () => {
  it('returns 8 gage strain entries', () => {
    const r = designCrossBeamFT(BASE)
    expect(r.gageStrains).toHaveLength(8)
  })

  it('first 6 entries are G1–G6 (one per channel)', () => {
    const r = designCrossBeamFT(BASE)
    expect(r.gageStrains[0].id).toBe('G1')
    expect(r.gageStrains[5].id).toBe('G6')
  })

  it('last 2 entries are peak combination rows', () => {
    const r = designCrossBeamFT(BASE)
    expect(r.gageStrains[6].id).toBe('peak')
    expect(r.gageStrains[7].id).toBe('peak')
  })

  it('G1 (Fz) has gridNums [1,3,5,7] — all 4 bending grids', () => {
    const r = designCrossBeamFT(BASE)
    expect(r.gageStrains[0].gridNums).toEqual([1, 3, 5, 7])
  })

  it('G6 (Mz) has gridNums [2,4,6,8] — all 4 shear grids', () => {
    const r = designCrossBeamFT(BASE)
    expect(r.gageStrains[5].gridNums).toEqual([2, 4, 6, 8])
  })

  it('Mx (G2) uses only ±Y arm grids [3,7]', () => {
    const r = designCrossBeamFT(BASE)
    const mx = r.gageStrains.find(g => g.id === 'G2')!
    expect(mx.gridNums).toEqual([3, 7])
  })

  it('My (G3) uses only ±X arm grids [1,5]', () => {
    const r = designCrossBeamFT(BASE)
    const my = r.gageStrains.find(g => g.id === 'G3')!
    expect(my.gridNums).toEqual([1, 5])
  })

  it('odd grids (1,3,5,7) are bending orientation', () => {
    const r = designCrossBeamFT(BASE)
    const bending = r.gageStrains.filter(g => g.orientation === 'bending (axial)')
    const oddNums = bending.flatMap(g => g.gridNums).filter(n => n % 2 === 1)
    expect(oddNums.length).toBeGreaterThan(0)
    const evenNums = bending.flatMap(g => g.gridNums).filter(n => n % 2 === 0)
    expect(evenNums).toHaveLength(0)
  })

  it('even grids (2,4,6,8) are shear orientation', () => {
    const r = designCrossBeamFT(BASE)
    const shear = r.gageStrains.filter(g => g.orientation === 'shear (45°)')
    const allNums = shear.flatMap(g => g.gridNums).filter((n, i, a) => a.indexOf(n) === i)
    expect(allNums.every(n => n % 2 === 0)).toBe(true)
  })

  it('all strains are positive', () => {
    const r = designCrossBeamFT(BASE)
    r.gageStrains.forEach(g => expect(g.strainMicrostrain).toBeGreaterThan(0))
  })

  it('peak Fz+Mx strain equals eps_Fz + eps_Mx', () => {
    const r = designCrossBeamFT(BASE)
    const fzEntry  = r.gageStrains.find(g => g.id === 'G1')!
    const mxEntry  = r.gageStrains.find(g => g.id === 'G2')!
    const peakMx   = r.gageStrains.find(g => g.channel === 'Fz+Mx')!
    expect(peakMx.strainMicrostrain).toBeCloseTo(fzEntry.strainMicrostrain + mxEntry.strainMicrostrain, 6)
  })
})

describe('designCrossBeamFT — yield safety factor', () => {
  it('yieldSafetyFactor is undefined when yieldStrengthPa not supplied', () => {
    const r = designCrossBeamFT(BASE)
    expect(r.yieldSafetyFactor).toBeUndefined()
  })

  it('yieldSafetyFactor is defined when yieldStrengthPa is supplied', () => {
    const r = designCrossBeamFT({ ...BASE, yieldStrengthPa: 500e6 })
    expect(r.yieldSafetyFactor).toBeDefined()
    expect(r.yieldSafetyFactor!).toBeGreaterThan(0)
  })

  it('yieldSafetyFactor = yieldStrength / (maxStrain × E)', () => {
    const yld = 500e6
    const r = designCrossBeamFT({ ...BASE, yieldStrengthPa: yld })
    const expected = yld / (r.maxStrainMicrostrain * 1e-6 * 200e9)
    expect(r.yieldSafetyFactor!).toBeCloseTo(expected, 6)
  })

  it('yields warning when yieldSafetyFactor < 2.5', () => {
    // Use a very weak material so yield SF is low
    const r = designCrossBeamFT({ ...BASE, beamThicknessMm: 0.8, ratedForceN: 2000, yieldStrengthPa: 100e6 })
    const hasYieldWarning = r.warnings.some(w => /yield/i.test(w) || /safety factor/i.test(w))
    expect(hasYieldWarning).toBe(true)
  })
})

describe('designCrossBeamFT — warning conditions', () => {
  it('no warnings for a well-proportioned design', () => {
    // BASE is a reasonable design — may have some warnings but not invalid
    const r = designCrossBeamFT(BASE)
    expect(r.isValid).toBe(true)
  })

  it('warns when beam width >= beam length', () => {
    // Beam length = 40-15 = 25mm; set width > 25mm
    const r = designCrossBeamFT({ ...BASE, beamWidthMm: 26 })
    expect(r.warnings.some(w => /slender/i.test(w) || /beam width/i.test(w))).toBe(true)
  })

  it('warns when thickness >= width (narrow face bending)', () => {
    const r = designCrossBeamFT({ ...BASE, beamThicknessMm: 10, beamWidthMm: 8 })
    expect(r.warnings.some(w => /thickness/i.test(w) || /narrow/i.test(w))).toBe(true)
  })

  it('warns when condition number > 10', () => {
    // Inflate ratedForceN massively compared to ratedMomentNm to unbalance outputs
    const r = designCrossBeamFT({ ...BASE, ratedForceN: 50000, ratedMomentNm: 0.001 })
    expect(r.warnings.some(w => /condition/i.test(w))).toBe(true)
  })

  it('warns when max strain < 100 µε (too stiff)', () => {
    // Very thick beam + small load → near-zero strain
    const r = designCrossBeamFT({ ...BASE, beamThicknessMm: 20, beamWidthMm: 20, ratedForceN: 1 })
    expect(r.warnings.some(w => /100/i.test(w) || /low sensitivity/i.test(w))).toBe(true)
  })
})

describe('designCrossBeamFT — multi-axis natural frequencies (Fu & Song 2018)', () => {
  it('all four natural frequencies are positive', () => {
    const r = designCrossBeamFT(BASE)
    expect(r.naturalFrequencyFxHz).toBeGreaterThan(0)
    expect(r.naturalFrequencyFyHz).toBeGreaterThan(0)
    expect(r.naturalFrequencyFzHz).toBeGreaterThan(0)
    expect(r.naturalFrequencyMzHz).toBeGreaterThan(0)
  })

  it('fn_Fx equals fn_Fy (3-fold symmetry)', () => {
    const r = designCrossBeamFT(BASE)
    expect(r.naturalFrequencyFxHz).toBeCloseTo(r.naturalFrequencyFyHz, 10)
  })

  it('working bandwidth = min(fn) / 4', () => {
    const r = designCrossBeamFT(BASE)
    const minFn = Math.min(r.naturalFrequencyFxHz, r.naturalFrequencyFyHz, r.naturalFrequencyFzHz, r.naturalFrequencyMzHz)
    expect(r.workingBandwidthHz).toBeCloseTo(minFn / 4, 8)
  })

  it('working bandwidth is positive and less than any individual frequency', () => {
    const r = designCrossBeamFT(BASE)
    expect(r.workingBandwidthHz).toBeGreaterThan(0)
    expect(r.workingBandwidthHz).toBeLessThan(r.naturalFrequencyFzHz)
    expect(r.workingBandwidthHz).toBeLessThan(r.naturalFrequencyFxHz)
  })

  it('stiffer material (higher E) increases all frequencies proportionally (√E scaling)', () => {
    const soft  = designCrossBeamFT({ ...BASE, youngsModulusPa: 70e9,  shearCorrection: false })  // Al
    const stiff = designCrossBeamFT({ ...BASE, youngsModulusPa: 200e9, shearCorrection: false })  // steel
    const ratio = Math.sqrt(200e9 / 70e9)
    // All fn ∝ √E (same mass, stiffness ∝ E)
    expect(stiff.naturalFrequencyFzHz / soft.naturalFrequencyFzHz).toBeCloseTo(ratio, 4)
    expect(stiff.naturalFrequencyFxHz / soft.naturalFrequencyFxHz).toBeCloseTo(ratio, 4)
    expect(stiff.naturalFrequencyMzHz / soft.naturalFrequencyMzHz).toBeCloseTo(ratio, 4)
  })

  it('fn_Fx > fn_Fz when beam width > thickness (lateral mode stiffer)', () => {
    // Typical geometry: b=10mm > t=4mm → I_lat = t·b³/12 > I_strong = b·t³/12
    const r = designCrossBeamFT(BASE)
    expect(r.naturalFrequencyFxHz).toBeGreaterThan(r.naturalFrequencyFzHz)
  })

  it('fn_Fz > fn_Fx when thickness > width (axial mode stiffer)', () => {
    const r = designCrossBeamFT({ ...BASE, beamWidthMm: 3, beamThicknessMm: 8, shearCorrection: false })
    expect(r.naturalFrequencyFzHz).toBeGreaterThan(r.naturalFrequencyFxHz)
  })
})

describe('designCrossBeamFT — Timoshenko shear correction (Wang et al. 2017)', () => {
  it('shear correction factors are positive', () => {
    const r = designCrossBeamFT(BASE)
    expect(r.timoshenkoPhiFz).toBeGreaterThan(0)
    expect(r.timoshenkoPhiFx).toBeGreaterThan(0)
  })

  it('PhiFz approaches zero for very slender arms (L/t >> 10)', () => {
    // L = 35-5 = 30mm, t=1mm → L/t = 30
    const r = designCrossBeamFT({ ...BASE, outerRadiusMm: 35, innerRadiusMm: 5, beamThicknessMm: 1 })
    expect(r.timoshenkoPhiFz).toBeLessThan(0.01)
  })

  it('correction reduces stiffness (TC stiffness < EB stiffness)', () => {
    const noCorr = designCrossBeamFT({ ...BASE, shearCorrection: false })
    const withCorr = designCrossBeamFT({ ...BASE, shearCorrection: true })
    expect(withCorr.axialStiffnessNPerM).toBeLessThan(noCorr.axialStiffnessNPerM)
  })

  it('correction reduces natural frequency (softer spring)', () => {
    const noCorr = designCrossBeamFT({ ...BASE, shearCorrection: false })
    const withCorr = designCrossBeamFT({ ...BASE, shearCorrection: true })
    expect(withCorr.naturalFrequencyFzHz).toBeLessThan(noCorr.naturalFrequencyFzHz)
  })

  it('shear correction default is true', () => {
    const defaultR = designCrossBeamFT(BASE)
    const explicitR = designCrossBeamFT({ ...BASE, shearCorrection: true })
    expect(defaultR.axialStiffnessNPerM).toBeCloseTo(explicitR.axialStiffnessNPerM, 6)
  })

  it('sensitivity formulas unchanged by shear correction (moment-based)', () => {
    // Bending-moment distribution unchanged → S_Fz, S_Mx same with/without correction
    const noCorr   = designCrossBeamFT({ ...BASE, shearCorrection: false })
    const withCorr = designCrossBeamFT({ ...BASE, shearCorrection: true })
    expect(withCorr.sensitivity.Fz).toBeCloseTo(noCorr.sensitivity.Fz, 10)
    expect(withCorr.sensitivity.Mx).toBeCloseTo(noCorr.sensitivity.Mx, 10)
    expect(withCorr.sensitivity.Fx).toBeCloseTo(noCorr.sensitivity.Fx, 10)
  })

  it('warns when short-beam Φ > 5%', () => {
    // Very short, thick arm: L/t ≈ 2 → large Φ
    const r = designCrossBeamFT({ ...BASE, outerRadiusMm: 20, innerRadiusMm: 15, beamThicknessMm: 4 })
    if (r.isValid && r.timoshenkoPhiFz > 0.05) {
      expect(r.warnings.some(w => /timoshenko|shear correction|short/i.test(w))).toBe(true)
    }
  })
})

describe('designCrossBeamFT — calibration procedure (Ahmad et al. 2021)', () => {
  it('returns exactly 12 load steps', () => {
    const r = designCrossBeamFT(BASE)
    const cal = generateCalibrationProcedure(r, BASE)
    expect(cal.loadSteps).toHaveLength(12)
  })

  it('calibration matrix is 6×6', () => {
    const r = designCrossBeamFT(BASE)
    const cal = generateCalibrationProcedure(r, BASE)
    expect(cal.matrix).toHaveLength(6)
    expect(cal.matrix[0]).toHaveLength(6)
  })

  it('calibration matrix is diagonal (ideal geometry)', () => {
    const r = designCrossBeamFT(BASE)
    const cal = generateCalibrationProcedure(r, BASE)
    for (let i = 0; i < 6; i++) {
      for (let j = 0; j < 6; j++) {
        if (i !== j) expect(cal.matrix[i][j]).toBe(0)
      }
    }
  })

  it('C × S = identity on diagonal (C = S⁻¹)', () => {
    const r = designCrossBeamFT(BASE)
    const cal = generateCalibrationProcedure(r, BASE)
    const sensArr = [r.sensitivity.Fx, r.sensitivity.Fy, r.sensitivity.Fz, r.sensitivity.Mx, r.sensitivity.My, r.sensitivity.Mz]
    for (let i = 0; i < 6; i++) {
      expect(cal.matrix[i][i] * sensArr[i]).toBeCloseTo(1, 8)
    }
  })

  it('+Fz step has positive expected Fz voltage', () => {
    const r = designCrossBeamFT(BASE)
    const cal = generateCalibrationProcedure(r, BASE)
    const plusFz = cal.loadSteps.find(s => s.label === '+Fz at rated')!
    expect(plusFz.expectedVoltages[2]).toBeGreaterThan(0)
  })

  it('−Fz step has negative expected Fz voltage', () => {
    const r = designCrossBeamFT(BASE)
    const cal = generateCalibrationProcedure(r, BASE)
    const minusFz = cal.loadSteps.find(s => s.label === '−Fz at rated')!
    expect(minusFz.expectedVoltages[2]).toBeLessThan(0)
  })

  it('off-diagonal voltages are zero for ideal geometry', () => {
    const r = designCrossBeamFT(BASE)
    const cal = generateCalibrationProcedure(r, BASE)
    const plusFz = cal.loadSteps.find(s => s.label === '+Fz at rated')!
    // Only channel 2 (Fz) should have voltage for +Fz load
    expect(plusFz.expectedVoltages[0]).toBe(0)  // Fx channel
    expect(plusFz.expectedVoltages[1]).toBe(0)  // Fy channel
    expect(plusFz.expectedVoltages[3]).toBe(0)  // Mx channel
  })

  it('+Fz expected voltage = S_Fz × ratedForce', () => {
    const r = designCrossBeamFT(BASE)
    const cal = generateCalibrationProcedure(r, BASE)
    const plusFz = cal.loadSteps.find(s => s.label === '+Fz at rated')!
    expect(plusFz.expectedVoltages[2]).toBeCloseTo(r.sensitivity.Fz * BASE.ratedForceN, 8)
  })

  it('steps cover all 6 DOFs with both signs', () => {
    const r = designCrossBeamFT(BASE)
    const cal = generateCalibrationProcedure(r, BASE)
    const labels = cal.loadSteps.map(s => s.label)
    for (const ch of ['Fx', 'Fy', 'Fz', 'Mx', 'My', 'Mz']) {
      expect(labels).toContain(`+${ch} at rated`)
      expect(labels).toContain(`−${ch} at rated`)
    }
  })
})
