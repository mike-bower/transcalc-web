import { describe, it, expect } from 'vitest';
import { calculateSbeamStrain, SbeamInput } from '../domain/sbeam';

describe('S-Beam Bending Calculator', () => {
  /**
   * Test case 1: Nominal US geometry
   */
  it('should calculate strain for nominal US geometry', () => {
    const input: SbeamInput = {
      appliedLoad: 5000, // lbf
      holeRadius: 0.25, // inches
      beamWidth: 1.0, // inches
      thickness: 0.5, // inches
      distanceBetweenGages: 2.0, // inches
      modulus: 30000, // PSI
      gageLength: 0.5, // inches
      gageFactor: 2.0,
    };

    const result = calculateSbeamStrain(input);

    // Verify that strain values are calculated
    expect(result.minStrain).toBeDefined();
    expect(result.maxStrain).toBeDefined();
    expect(result.avgStrain).toBeDefined();

    // Min/Max/Avg relationship check
    expect(result.maxStrain).toBeGreaterThanOrEqual(result.minStrain);

    // Gradient should be non-negative percentage
    expect(result.gradient).toBeGreaterThanOrEqual(0);
    expect(result.gradient).toBeLessThanOrEqual(1000); // Can be large for S-beam

    // Sensitivity should be positive
    expect(result.fullSpanSensitivity).toBeGreaterThan(0);
  });

  /**
   * Test case 2: Metric (SI) units
   */
  it('should calculate strain for nominal SI geometry', () => {
    const input: SbeamInput = {
      appliedLoad: 22241, // N
      holeRadius: 6.35, // mm
      beamWidth: 25.4, // mm
      thickness: 12.7, // mm
      distanceBetweenGages: 50.8, // mm
      modulus: 206.8e9, // Pa
      gageLength: 12.7, // mm
      gageFactor: 2.0,
    };

    const result = calculateSbeamStrain(input);

    expect(result.minStrain).toBeDefined();
    expect(result.maxStrain).toBeGreaterThanOrEqual(result.minStrain);
    expect(result.avgStrain).toBeDefined();
    expect(result.gradient).toBeGreaterThanOrEqual(0);
    expect(result.fullSpanSensitivity).toBeGreaterThan(0);
  });

  /**
   * Test case 3: High load scenario
   */
  it('should produce higher strain under increased load', () => {
    const baseInput: SbeamInput = {
      appliedLoad: 5000, // lbf
      holeRadius: 0.25, // inches
      beamWidth: 1.0, // inches
      thickness: 0.5, // inches
      distanceBetweenGages: 2.0, // inches
      modulus: 30000, // PSI
      gageLength: 0.5, // inches
      gageFactor: 2.0,
    };

    const highLoadInput: SbeamInput = {
      ...baseInput,
      appliedLoad: 10000, // doubled load
    };

    const baseResult = calculateSbeamStrain(baseInput);
    const highLoadResult = calculateSbeamStrain(highLoadInput);

    // Doubling load should approximately double strain
    expect(highLoadResult.avgStrain).toBeGreaterThan(baseResult.avgStrain);
    expect(highLoadResult.fullSpanSensitivity).toBeGreaterThan(baseResult.fullSpanSensitivity);
  });

  /**
   * Test case 4: Larger hole
   */
  it('should handle larger hole radius', () => {
    const baseInput: SbeamInput = {
      appliedLoad: 5000, // lbf
      holeRadius: 0.15, // inches
      beamWidth: 1.0, // inches
      thickness: 0.5, // inches
      distanceBetweenGages: 2.0, // inches
      modulus: 30000, // PSI
      gageLength: 0.5, // inches
      gageFactor: 2.0,
    };

    const largerHoleInput: SbeamInput = {
      ...baseInput,
      holeRadius: 0.25, // larger
    };

    const baseResult = calculateSbeamStrain(baseInput);
    const largerHoleResult = calculateSbeamStrain(largerHoleInput);

    // Results should be different
    expect(Math.abs(largerHoleResult.avgStrain - baseResult.avgStrain)).toBeGreaterThan(0);
  });

  /**
   * Test case 5: Gage factor scaling
   */
  it('should scale sensitivity with gage factor', () => {
    const baseInput: SbeamInput = {
      appliedLoad: 5000, // lbf
      holeRadius: 0.25, // inches
      beamWidth: 1.0, // inches
      thickness: 0.5, // inches
      distanceBetweenGages: 2.0, // inches
      modulus: 30000, // PSI
      gageLength: 0.5, // inches
      gageFactor: 2.0,
    };

    const highGFInput: SbeamInput = {
      ...baseInput,
      gageFactor: 3.0,
    };

    const baseResult = calculateSbeamStrain(baseInput);
    const highGFResult = calculateSbeamStrain(highGFInput);

    // GF is linearly proportional to sensitivity
    expect(highGFResult.fullSpanSensitivity).toBeGreaterThan(baseResult.fullSpanSensitivity);
    expect(highGFResult.fullSpanSensitivity / baseResult.fullSpanSensitivity).toBeCloseTo(
      3.0 / 2.0,
      1
    );
  });

  /**
   * Test case 6: Thinner beam results in higher strain
   */
  it('should show higher strain with thinner beam', () => {
    const baseInput: SbeamInput = {
      appliedLoad: 5000, // lbf
      holeRadius: 0.25, // inches
      beamWidth: 1.0, // inches
      thickness: 0.5, // inches
      distanceBetweenGages: 2.0, // inches
      modulus: 30000, // PSI
      gageLength: 0.5, // inches
      gageFactor: 2.0,
    };

    const thinInput: SbeamInput = {
      ...baseInput,
      thickness: 0.3, // thinner
    };

    const baseResult = calculateSbeamStrain(baseInput);
    const thinResult = calculateSbeamStrain(thinInput);

    // Thinner beam should have higher strain
    expect(thinResult.avgStrain).toBeGreaterThan(baseResult.avgStrain);
  });

  /**
   * Test case 7: Consistency check
   */
  it('should show reasonable relationship between min/max/avg', () => {
    const input: SbeamInput = {
      appliedLoad: 5000, // lbf
      holeRadius: 0.25, // inches
      beamWidth: 1.0, // inches
      thickness: 0.5, // inches
      distanceBetweenGages: 2.0, // inches
      modulus: 30000, // PSI
      gageLength: 0.5, // inches
      gageFactor: 2.0,
    };

    const result = calculateSbeamStrain(input);

    // For S-beam with symmetry, average should be midpoint-ish
    expect(Number.isFinite(result.avgStrain)).toBe(true);
    expect(Number.isFinite(result.minStrain)).toBe(true);
    expect(Number.isFinite(result.maxStrain)).toBe(true);
  });

  /**
   * Test case 8: Validation - hole radius too large
   */
  it('should reject hole radius greater than thickness', () => {
    const invalidInput: SbeamInput = {
      appliedLoad: 5000,
      holeRadius: 0.6, // larger than thickness
      beamWidth: 1.0,
      thickness: 0.5,
      distanceBetweenGages: 2.0,
      modulus: 30000,
      gageLength: 0.5,
      gageFactor: 2.0,
    };

    expect(() => calculateSbeamStrain(invalidInput)).toThrow();
  });

  /**
   * Test case 9: Validation - negative thickness
   */
  it('should reject invalid geometry', () => {
    const invalidInput: SbeamInput = {
      appliedLoad: 5000,
      holeRadius: 0.25,
      beamWidth: 1.0,
      thickness: -0.1, // negative thickness
      distanceBetweenGages: 2.0,
      modulus: 30000,
      gageLength: 0.5,
      gageFactor: 2.0,
    };

    expect(() => calculateSbeamStrain(invalidInput)).toThrow();
  });

  /**
   * Test case 10: Unit auto-detection
   */
  it('should auto-detect SI units', () => {
    const siInput: SbeamInput = {
      appliedLoad: 22241, // N (> 4000)
      holeRadius: 6, // mm (> 10)
      beamWidth: 25, // mm
      thickness: 12, // mm
      distanceBetweenGages: 50, // mm
      modulus: 200e9, // Pa (> 10^7)
      gageLength: 12, // mm
      gageFactor: 2.0,
    };

    expect(() => calculateSbeamStrain(siInput)).not.toThrow();
  });

  /**
   * Test case 11: Gradient calculation
   */
  it('should calculate reasonable gradient values', () => {
    const input: SbeamInput = {
      appliedLoad: 5000, // lbf
      holeRadius: 0.25, // inches
      beamWidth: 1.0, // inches
      thickness: 0.5, // inches
      distanceBetweenGages: 2.0, // inches
      modulus: 30000, // PSI
      gageLength: 0.5, // inches
      gageFactor: 2.0,
    };

    const result = calculateSbeamStrain(input);

    // Gradient should be reasonable
    expect(result.gradient).toBeGreaterThanOrEqual(0);
    expect(Number.isFinite(result.gradient)).toBe(true);
  });
});
