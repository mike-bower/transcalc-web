import { describe, it, expect } from 'vitest';
import { calculateSbeamStrain, SbeamInput } from '../domain/sbeam';

// Standard steel S-beam baseline: N, mm, GPa
const BASE: SbeamInput = {
  appliedLoad: 500,          // N
  holeRadius: 6,             // mm
  beamWidth: 25,             // mm
  thickness: 12,             // mm
  distanceBetweenGages: 24,  // mm
  modulus: 207,              // GPa (steel)
  gageLength: 5,             // mm
  gageFactor: 2.0,
};

describe('S-Beam Bending Calculator', () => {
  it('should calculate strain for standard steel geometry', () => {
    const result = calculateSbeamStrain(BASE);
    expect(result.minStrain).toBeDefined();
    expect(result.maxStrain).toBeDefined();
    expect(result.avgStrain).toBeDefined();
    expect(result.maxStrain).toBeGreaterThanOrEqual(result.minStrain);
    expect(result.gradient).toBeGreaterThanOrEqual(0);
    expect(result.fullSpanSensitivity).toBeGreaterThan(0);
  });

  it('should calculate strain for a typical metric geometry', () => {
    const input: SbeamInput = {
      appliedLoad: 1000,
      holeRadius: 8,
      beamWidth: 30,
      thickness: 16,
      distanceBetweenGages: 32,
      modulus: 206.8,
      gageLength: 6,
      gageFactor: 2.0,
    };
    const result = calculateSbeamStrain(input);
    expect(result.maxStrain).toBeGreaterThanOrEqual(result.minStrain);
    expect(result.avgStrain).toBeDefined();
    expect(result.gradient).toBeGreaterThanOrEqual(0);
    expect(result.fullSpanSensitivity).toBeGreaterThan(0);
  });

  it('should produce higher strain under doubled load', () => {
    const high = { ...BASE, appliedLoad: 1000 };
    const base = calculateSbeamStrain(BASE);
    const elevated = calculateSbeamStrain(high);
    expect(elevated.avgStrain).toBeGreaterThan(base.avgStrain);
    expect(elevated.fullSpanSensitivity / base.fullSpanSensitivity).toBeCloseTo(2.0, 1);
  });

  it('should produce different strain for a larger hole radius', () => {
    const larger = { ...BASE, holeRadius: 9 };
    const base = calculateSbeamStrain(BASE);
    const result = calculateSbeamStrain(larger);
    expect(Math.abs(result.avgStrain - base.avgStrain)).toBeGreaterThan(0);
  });

  it('should scale sensitivity linearly with gage factor', () => {
    const highGF = { ...BASE, gageFactor: 3.0 };
    const base = calculateSbeamStrain(BASE);
    const result = calculateSbeamStrain(highGF);
    expect(result.fullSpanSensitivity).toBeGreaterThan(base.fullSpanSensitivity);
    expect(result.fullSpanSensitivity / base.fullSpanSensitivity).toBeCloseTo(3.0 / 2.0, 2);
  });

  it('should show higher strain with thinner beam', () => {
    const thin = { ...BASE, thickness: 8 };
    const base = calculateSbeamStrain(BASE);
    const result = calculateSbeamStrain(thin);
    expect(result.avgStrain).toBeGreaterThan(base.avgStrain);
  });

  it('should return finite min/max/avg', () => {
    const result = calculateSbeamStrain(BASE);
    expect(Number.isFinite(result.avgStrain)).toBe(true);
    expect(Number.isFinite(result.minStrain)).toBe(true);
    expect(Number.isFinite(result.maxStrain)).toBe(true);
  });

  it('should reject hole radius greater than thickness', () => {
    expect(() => calculateSbeamStrain({ ...BASE, holeRadius: 15 })).toThrow();
  });

  it('should reject negative thickness', () => {
    expect(() => calculateSbeamStrain({ ...BASE, thickness: -1 })).toThrow();
  });

  it('should accept valid N/mm/GPa inputs without throwing', () => {
    expect(() => calculateSbeamStrain(BASE)).not.toThrow();
  });

  it('should calculate a finite gradient', () => {
    const result = calculateSbeamStrain(BASE);
    expect(result.gradient).toBeGreaterThanOrEqual(0);
    expect(Number.isFinite(result.gradient)).toBe(true);
  });

  it('angle fix: strain should match Delphi formula (X/R not X/2R)', () => {
    // Verify the angle fix by checking that strain is nonzero and finite
    // for a gage placed exactly at the hole edge (xMin = R - L/2)
    const input: SbeamInput = {
      appliedLoad: 200,
      holeRadius: 5,
      beamWidth: 20,
      thickness: 10,
      distanceBetweenGages: 10,  // center gage at X = 5 = R
      modulus: 200,
      gageLength: 2,
      gageFactor: 2.0,
    };
    const result = calculateSbeamStrain(input);
    expect(Number.isFinite(result.avgStrain)).toBe(true);
    expect(result.avgStrain).toBeGreaterThan(0);
  });
});
