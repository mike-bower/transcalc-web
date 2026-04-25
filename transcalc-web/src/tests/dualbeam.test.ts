import { describe, it, expect } from 'vitest';
import { calculateDualbeamStrain, type DualbeamInput } from '../domain/dualbeam';

// All inputs follow the contract set by DualBeamCalc.tsx:
//   appliedLoad in N, all lengths in mm, modulus in Pa, gageFactor unitless.
// normalizeToSI() divides lengths by 1000 → meters; force and modulus pass through unchanged.

const REF: DualbeamInput = {
  appliedLoad: 1000,    // N
  beamWidth: 20,        // mm
  thickness: 3,         // mm
  distanceBetweenGages: 30,  // mm (beam span, block-face to block-face)
  distanceLoadToCL: 0,
  modulus: 200e9,       // Pa (200 GPa — steel)
  gageLength: 5,        // mm
  gageFactor: 2.0,
};

// Hand-computed reference:
//   firstTerm = F / (E·W) = 1000 / (200e9 · 0.020) = 2.5e-7
//   thirdTermA = 3·(−L_d/2 + L_g/2) / T² = 3·(−0.0125) / 9e-6 = −4166.67
//   strainA = firstTerm · (−thirdTermA) · 1e6 = 2.5e-7 · 4166.67 · 1e6 = 1041.67 µε
const REF_STRAIN = 1041.667;   // µε
const REF_SENS   = 2.08333;    // mV/V  (avgStrain · GF · 1e-3)

describe('Dual Bending Beam Calculator', () => {

  it('computes reference strain values to within 0.1%', () => {
    const r = calculateDualbeamStrain(REF);
    expect(r.strainA).toBeCloseTo(REF_STRAIN, 1);
    expect(r.strainB).toBeCloseTo(-REF_STRAIN, 1);
    expect(r.strainC).toBeCloseTo(-REF_STRAIN, 1);
    expect(r.strainD).toBeCloseTo(REF_STRAIN, 1);
    expect(r.avgStrain).toBeCloseTo(REF_STRAIN, 1);
    expect(r.gradient).toBeCloseTo(0, 6);
    expect(r.fullSpanSensitivity).toBeCloseTo(REF_SENS, 3);
  });

  it('strain scales linearly with applied load', () => {
    const r1 = calculateDualbeamStrain(REF);
    const r2 = calculateDualbeamStrain({ ...REF, appliedLoad: 2000 });
    expect(r2.strainA / r1.strainA).toBeCloseTo(2.0, 6);
    expect(r2.avgStrain / r1.avgStrain).toBeCloseTo(2.0, 6);
    expect(r2.fullSpanSensitivity / r1.fullSpanSensitivity).toBeCloseTo(2.0, 6);
  });

  it('strain scales as 1/T² with beam thickness', () => {
    // Halving T should quadruple strain (T appears squared in denominator)
    const r1 = calculateDualbeamStrain(REF);
    const r2 = calculateDualbeamStrain({ ...REF, thickness: 1.5 });
    expect(r2.strainA / r1.strainA).toBeCloseTo(4.0, 5);
    expect(r2.avgStrain).toBeCloseTo(REF_STRAIN * 4, 1);
  });

  it('strain scales as 1/W with beam width', () => {
    const r1 = calculateDualbeamStrain(REF);
    const r2 = calculateDualbeamStrain({ ...REF, beamWidth: 40 });
    expect(r2.strainA / r1.strainA).toBeCloseTo(0.5, 6);
  });

  it('strain scales as 1/E with modulus', () => {
    const r1 = calculateDualbeamStrain(REF);
    const r2 = calculateDualbeamStrain({ ...REF, modulus: 400e9 });
    expect(r2.strainA / r1.strainA).toBeCloseTo(0.5, 6);
  });

  it('sensitivity scales linearly with gage factor', () => {
    const r1 = calculateDualbeamStrain(REF);
    const r2 = calculateDualbeamStrain({ ...REF, gageFactor: 3.0 });
    expect(r2.fullSpanSensitivity / r1.fullSpanSensitivity).toBeCloseTo(3.0 / 2.0, 6);
    // Strain values should not change with GF
    expect(r2.strainA).toBeCloseTo(r1.strainA, 6);
  });

  it('longer gage length reduces strain (gage center moves toward beam midpoint)', () => {
    const r1 = calculateDualbeamStrain(REF);                          // L_g = 5 mm
    const r2 = calculateDualbeamStrain({ ...REF, gageLength: 10 });   // L_g = 10 mm
    expect(r2.avgStrain).toBeLessThan(r1.avgStrain);
  });

  it('sign pattern: A and D tension (+), B and C compression (−)', () => {
    const r = calculateDualbeamStrain(REF);
    expect(r.strainA).toBeGreaterThan(0);
    expect(r.strainD).toBeGreaterThan(0);
    expect(r.strainB).toBeLessThan(0);
    expect(r.strainC).toBeLessThan(0);
  });

  it('opposite-arm symmetry: strainA = −strainC and strainB = −strainD', () => {
    const r = calculateDualbeamStrain(REF);
    expect(r.strainA + r.strainC).toBeCloseTo(0, 6);
    expect(r.strainB + r.strainD).toBeCloseTo(0, 6);
  });

  it('gradient is bounded between 0 and 100', () => {
    const r = calculateDualbeamStrain(REF);
    expect(r.gradient).toBeGreaterThanOrEqual(0);
    expect(r.gradient).toBeLessThanOrEqual(100);
    expect(Number.isFinite(r.gradient)).toBe(true);
  });

  it('realistic transducer case — 500 N on 15 mm × 2 mm beam', () => {
    const r = calculateDualbeamStrain({
      appliedLoad: 500,
      beamWidth: 15,
      thickness: 2,
      distanceBetweenGages: 25,
      distanceLoadToCL: 0,
      modulus: 200e9,
      gageLength: 4,
      gageFactor: 2.1,
    });
    // firstTerm = 500 / (200e9 · 0.015) = 1.6667e-7
    // thirdTermA = 3·(−0.025/2 + 0.004/2) / 0.002² = 3·(−0.0105) / 4e-6 = −7875
    // strainA = 1.6667e-7 · 7875 · 1e6 = 1312.5 µε
    expect(r.strainA).toBeCloseTo(1312.5, 1);
    expect(r.strainB).toBeCloseTo(-1312.5, 1);
    expect(r.avgStrain).toBeCloseTo(1312.5, 1);
    expect(r.fullSpanSensitivity).toBeCloseTo(1312.5 * 2.1 * 1e-3, 3);
  });

  it('rejects negative beam thickness', () => {
    expect(() => calculateDualbeamStrain({ ...REF, thickness: -1 })).toThrow();
  });

  it('rejects zero gage length', () => {
    expect(() => calculateDualbeamStrain({ ...REF, gageLength: 0 })).toThrow();
  });

  it('rejects zero beam width', () => {
    expect(() => calculateDualbeamStrain({ ...REF, beamWidth: 0 })).toThrow();
  });

  it('avgStrain equals arithmetic mean of |strainA|…|strainD|', () => {
    const r = calculateDualbeamStrain(REF);
    const expected = (Math.abs(r.strainA) + Math.abs(r.strainB) + Math.abs(r.strainC) + Math.abs(r.strainD)) / 4;
    expect(r.avgStrain).toBeCloseTo(expected, 8);
  });
});
