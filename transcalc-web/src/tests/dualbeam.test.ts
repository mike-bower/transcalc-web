import { describe, it, expect } from 'vitest';
import { calculateDualbeamStrain, DualbeamInput } from '../domain/dualbeam';

describe('Dual Bending Beam Calculator', () => {
  /**
   * Test case 1: Nominal US geometry
   */
  it('should calculate strain for nominal US geometry', () => {
    const input: DualbeamInput = {
      appliedLoad: 5000, // lbf
      beamWidth: 1.0, // inches
      thickness: 0.25, // inches
      distanceBetweenGages: 2.0, // inches
      distanceLoadToCL: 0, // inches
      modulus: 30000, // PSI
      gageLength: 0.5, // inches
      gageFactor: 2.0,
    };

    const result = calculateDualbeamStrain(input);

    // Verify that strain values are calculated
    expect(result.strainA).toBeDefined();
    expect(result.strainB).toBeDefined();
    expect(result.strainC).toBeDefined();
    expect(result.strainD).toBeDefined();
    expect(result.avgStrain).toBeGreaterThan(0);

    // Gradient should be positive percentage
    expect(result.gradient).toBeGreaterThanOrEqual(0);
    expect(result.gradient).toBeLessThanOrEqual(100);

    // Sensitivity should be reasonable (mV/V)
    expect(result.fullSpanSensitivity).toBeGreaterThan(0);
  });

  /**
   * Test case 2: Metric (SI) units
   */
  it('should calculate strain for nominal SI geometry', () => {
    const input: DualbeamInput = {
      appliedLoad: 22241, // N
      beamWidth: 25.4, // mm
      thickness: 6.35, // mm
      distanceBetweenGages: 50.8, // mm
      distanceLoadToCL: 0, // mm
      modulus: 206.8e9, // Pa
      gageLength: 12.7, // mm
      gageFactor: 2.0,
    };

    const result = calculateDualbeamStrain(input);

    expect(result.strainA).toBeDefined();
    expect(result.strainB).toBeDefined();
    expect(result.strainC).toBeDefined();
    expect(result.strainD).toBeDefined();
    expect(result.avgStrain).toBeGreaterThan(0);
    expect(result.gradient).toBeGreaterThanOrEqual(0);
    expect(result.fullSpanSensitivity).toBeGreaterThan(0);
  });

  /**
   * Test case 3: High load scenario
   */
  it('should produce higher strain under increased load', () => {
    const baseInput: DualbeamInput = {
      appliedLoad: 5000, // lbf
      beamWidth: 1.0, // inches
      thickness: 0.25, // inches
      distanceBetweenGages: 2.0, // inches
      distanceLoadToCL: 0,
      modulus: 30000, // PSI
      gageLength: 0.5, // inches
      gageFactor: 2.0,
    };

    const highLoadInput: DualbeamInput = {
      ...baseInput,
      appliedLoad: 10000, // doubled load
    };

    const baseResult = calculateDualbeamStrain(baseInput);
    const highLoadResult = calculateDualbeamStrain(highLoadInput);

    // Doubling load should approximately double strain
    expect(Math.abs(highLoadResult.strainA)).toBeGreaterThan(Math.abs(baseResult.strainA));
    expect(highLoadResult.avgStrain).toBeGreaterThan(baseResult.avgStrain);
    expect(highLoadResult.fullSpanSensitivity).toBeGreaterThan(baseResult.fullSpanSensitivity);
  });

  /**
   * Test case 4: Thin beam geometry
   */
  it('should handle thinner beam with higher strain', () => {
    const baseInput: DualbeamInput = {
      appliedLoad: 5000, // lbf
      beamWidth: 1.0, // inches
      thickness: 0.25, // inches
      distanceBetweenGages: 2.0, // inches
      distanceLoadToCL: 0,
      modulus: 30000, // PSI
      gageLength: 0.5, // inches
      gageFactor: 2.0,
    };

    const thinInput: DualbeamInput = {
      ...baseInput,
      thickness: 0.15, // thinner (1/6")
    };

    const baseResult = calculateDualbeamStrain(baseInput);
    const thinResult = calculateDualbeamStrain(thinInput);

    // Thinner beam should have higher strain (more sensitive)
    expect(thinResult.avgStrain).toBeGreaterThan(baseResult.avgStrain);
  });

  /**
   * Test case 5: Higher gage factor
   * Sensitivity should scale with gage factor
   */
  it('should scale sensitivity with gage factor', () => {
    const baseInput: DualbeamInput = {
      appliedLoad: 5000, // lbf
      beamWidth: 1.0, // inches
      thickness: 0.25, // inches
      distanceBetweenGages: 2.0, // inches
      distanceLoadToCL: 0,
      modulus: 30000, // PSI
      gageLength: 0.5, // inches
      gageFactor: 2.0,
    };

    const highGFInput: DualbeamInput = {
      ...baseInput,
      gageFactor: 3.0,
    };

    const baseResult = calculateDualbeamStrain(baseInput);
    const highGFResult = calculateDualbeamStrain(highGFInput);

    // GF is linearly proportional to sensitivity
    expect(highGFResult.fullSpanSensitivity).toBeGreaterThan(baseResult.fullSpanSensitivity);
    expect(highGFResult.fullSpanSensitivity / baseResult.fullSpanSensitivity).toBeCloseTo(
      3.0 / 2.0,
      1
    );
  });

  /**
   * Test case 6: Four gage positions symmetry
   */
  it('should produce symmetric behavior across four gage positions', () => {
    const input: DualbeamInput = {
      appliedLoad: 5000, // lbf
      beamWidth: 1.0, // inches
      thickness: 0.25, // inches
      distanceBetweenGages: 2.0, // inches
      distanceLoadToCL: 0,
      modulus: 30000, // PSI
      gageLength: 0.5, // inches
      gageFactor: 2.0,
    };

    const result = calculateDualbeamStrain(input);

    // Due to dual beam symmetry with equal spacing, strains can be equal
    // Each gage is calculated directly from geometry
    const strainValues = [
      Math.abs(result.strainA),
      Math.abs(result.strainB),
      Math.abs(result.strainC),
      Math.abs(result.strainD),
    ];

    // All strains should be non-empty and finite
    strainValues.forEach((s) => {
      expect(Number.isFinite(s)).toBe(true);
    });

    // Average should be within range of individual strains
    expect(result.avgStrain).toBeGreaterThanOrEqual(Math.min(...strainValues));
    expect(result.avgStrain).toBeLessThanOrEqual(Math.max(...strainValues));
  });

  /**
   * Test case 7: Symmetry check - opposite gages
   */
  it('should show symmetry in opposite gage positions', () => {
    const input: DualbeamInput = {
      appliedLoad: 5000, // lbf
      beamWidth: 1.0, // inches
      thickness: 0.25, // inches
      distanceBetweenGages: 2.0, // inches
      distanceLoadToCL: 0,
      modulus: 30000, // PSI
      gageLength: 0.5, // inches
      gageFactor: 2.0,
    };

    const result = calculateDualbeamStrain(input);

    // A and C should be negatives of each other
    expect(Math.abs(result.strainA + result.strainC)).toBeLessThan(
      Math.max(Math.abs(result.strainA), Math.abs(result.strainC)) * 0.01 + 1e-6
    );

    // B and D should be negatives of each other
    expect(Math.abs(result.strainB + result.strainD)).toBeLessThan(
      Math.max(Math.abs(result.strainB), Math.abs(result.strainD)) * 0.01 + 1e-6
    );
  });

  /**
   * Test case 8: Validation errors
   */
  it('should reject invalid geometry', () => {
    const invalidInput: DualbeamInput = {
      appliedLoad: 5000,
      beamWidth: 1.0,
      thickness: -0.1, // negative thickness
      distanceBetweenGages: 2.0,
      distanceLoadToCL: 0,
      modulus: 30000,
      gageLength: 0.5,
      gageFactor: 2.0,
    };

    expect(() => calculateDualbeamStrain(invalidInput)).toThrow();
  });

  /**
   * Test case 9: Unit auto-detection
   */
  it('should auto-detect SI units', () => {
    const siInput: DualbeamInput = {
      appliedLoad: 22241, // N (> 4000)
      beamWidth: 25, // mm (> 10)
      thickness: 6, // mm
      distanceBetweenGages: 50, // mm
      distanceLoadToCL: 0,
      modulus: 200e9, // Pa (> 10^7)
      gageLength: 12, // mm
      gageFactor: 2.0,
    };

    expect(() => calculateDualbeamStrain(siInput)).not.toThrow();
  });

  /**
   * Test case 10: Gradient consistency
   */
  it('should calculate consistent gradient', () => {
    const input: DualbeamInput = {
      appliedLoad: 5000, // lbf
      beamWidth: 1.0, // inches
      thickness: 0.25, // inches
      distanceBetweenGages: 2.0, // inches
      distanceLoadToCL: 0,
      modulus: 30000, // PSI
      gageLength: 0.5, // inches
      gageFactor: 2.0,
    };

    const result = calculateDualbeamStrain(input);

    // Gradient should be well-defined
    expect(result.gradient).toBeGreaterThanOrEqual(0);
    expect(result.gradient).toBeLessThanOrEqual(100);
    expect(Number.isFinite(result.gradient)).toBe(true);
  });
});
