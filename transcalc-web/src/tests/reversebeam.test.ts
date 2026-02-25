import { describe, it, expect } from 'vitest';
import { calculateReversebeamStrain, ReversebeamInput } from '../domain/reversebeam';

describe('Reverse Bending Beam Calculator', () => {
  /**
   * Test case 1: Nominal US geometry
   */
  it('should calculate strain for nominal US geometry', () => {
    const input: ReversebeamInput = {
      appliedLoad: 5000, // lbf
      beamWidth: 1.0, // inches
      thickness: 0.25, // inches
      distanceBetweenGages: 2.0, // inches
      modulus: 30000, // PSI
      gageLength: 0.5, // inches
      gageFactor: 2.0,
    };

    const result = calculateReversebeamStrain(input);

    // Verify that strain values are calculated
    expect(result.minStrain).toBeDefined();
    expect(result.maxStrain).toBeDefined();
    expect(result.avgStrain).toBeDefined();

    // Min/Max relationship check
    expect(result.maxStrain).toBeGreaterThan(result.minStrain);
    expect(result.avgStrain).toBeGreaterThanOrEqual(result.minStrain);
    expect(result.avgStrain).toBeLessThanOrEqual(result.maxStrain);

    // Gradient should be positive percentage
    expect(result.gradient).toBeGreaterThan(0);
    expect(result.gradient).toBeLessThanOrEqual(100);

    // Sensitivity should be positive
    expect(result.fullSpanSensitivity).toBeGreaterThan(0);
  });

  /**
   * Test case 2: Metric (SI) units
   */
  it('should calculate strain for nominal SI geometry', () => {
    const input: ReversebeamInput = {
      appliedLoad: 22241, // N
      beamWidth: 25.4, // mm
      thickness: 6.35, // mm
      distanceBetweenGages: 50.8, // mm
      modulus: 206.8e9, // Pa
      gageLength: 12.7, // mm
      gageFactor: 2.0,
    };

    const result = calculateReversebeamStrain(input);

    expect(result.minStrain).toBeDefined();
    expect(result.maxStrain).toBeGreaterThan(result.minStrain);
    expect(result.avgStrain).toBeGreaterThanOrEqual(result.minStrain);
    expect(result.avgStrain).toBeLessThanOrEqual(result.maxStrain);
    expect(result.gradient).toBeGreaterThan(0);
    expect(result.fullSpanSensitivity).toBeGreaterThan(0);
  });

  /**
   * Test case 3: High load scenario
   */
  it('should produce higher strain under increased load', () => {
    const baseInput: ReversebeamInput = {
      appliedLoad: 5000, // lbf
      beamWidth: 1.0, // inches
      thickness: 0.25, // inches
      distanceBetweenGages: 2.0, // inches
      modulus: 30000, // PSI
      gageLength: 0.5, // inches
      gageFactor: 2.0,
    };

    const highLoadInput: ReversebeamInput = {
      ...baseInput,
      appliedLoad: 10000, // doubled load
    };

    const baseResult = calculateReversebeamStrain(baseInput);
    const highLoadResult = calculateReversebeamStrain(highLoadInput);

    // Doubling load should approximately double strain
    expect(highLoadResult.minStrain).toBeGreaterThan(baseResult.minStrain);
    expect(highLoadResult.maxStrain).toBeGreaterThan(baseResult.maxStrain);
    expect(highLoadResult.avgStrain).toBeGreaterThan(baseResult.avgStrain);
    expect(highLoadResult.fullSpanSensitivity).toBeGreaterThan(baseResult.fullSpanSensitivity);
  });

  /**
   * Test case 4: Thin beam geometry - higher strain
   */
  it('should show higher strain with thinner beam', () => {
    const baseInput: ReversebeamInput = {
      appliedLoad: 5000, // lbf
      beamWidth: 1.0, // inches
      thickness: 0.25, // inches
      distanceBetweenGages: 2.0, // inches
      modulus: 30000, // PSI
      gageLength: 0.5, // inches
      gageFactor: 2.0,
    };

    const thinInput: ReversebeamInput = {
      ...baseInput,
      thickness: 0.15, // thinner
    };

    const baseResult = calculateReversebeamStrain(baseInput);
    const thinResult = calculateReversebeamStrain(thinInput);

    // Thinner beam (T²in denominator) should have higher strain
    expect(thinResult.avgStrain).toBeGreaterThan(baseResult.avgStrain);
  });

  /**
   * Test case 5: Gage length impact on strain range
   */
  it('should show larger gradient with longer gage length', () => {
    const baseInput: ReversebeamInput = {
      appliedLoad: 5000, // lbf
      beamWidth: 1.0, // inches
      thickness: 0.25, // inches
      distanceBetweenGages: 2.0, // inches
      modulus: 30000, // PSI
      gageLength: 0.3, // inches
      gageFactor: 2.0,
    };

    const longGageInput: ReversebeamInput = {
      ...baseInput,
      gageLength: 0.8, // longer
    };

    const baseResult = calculateReversebeamStrain(baseInput);
    const longGageResult = calculateReversebeamStrain(longGageInput);

    // Longer gage creates larger strain range (bigger gradient)
    expect(longGageResult.gradient).toBeGreaterThan(baseResult.gradient);
  });

  /**
   * Test case 6: Gage factor sensitivity
   */
  it('should scale sensitivity with gage factor', () => {
    const baseInput: ReversebeamInput = {
      appliedLoad: 5000, // lbf
      beamWidth: 1.0, // inches
      thickness: 0.25, // inches
      distanceBetweenGages: 2.0, // inches
      modulus: 30000, // PSI
      gageLength: 0.5, // inches
      gageFactor: 2.0,
    };

    const highGFInput: ReversebeamInput = {
      ...baseInput,
      gageFactor: 3.0,
    };

    const baseResult = calculateReversebeamStrain(baseInput);
    const highGFResult = calculateReversebeamStrain(highGFInput);

    // GF is linearly proportional to sensitivity
    expect(highGFResult.fullSpanSensitivity).toBeGreaterThan(baseResult.fullSpanSensitivity);
    expect(highGFResult.fullSpanSensitivity / baseResult.fullSpanSensitivity).toBeCloseTo(
      3.0 / 2.0,
      1
    );
  });

  /**
   * Test case 7: Average strain is between min and max
   */
  it('should have average strain between min and max', () => {
    const input: ReversebeamInput = {
      appliedLoad: 5000, // lbf
      beamWidth: 1.0, // inches
      thickness: 0.25, // inches
      distanceBetweenGages: 2.0, // inches
      modulus: 30000, // PSI
      gageLength: 0.5, // inches
      gageFactor: 2.0,
    };

    const result = calculateReversebeamStrain(input);

    // Average of min and max should be close to calculated average
    const calculatedAverage = (result.minStrain + result.maxStrain) / 2;
    expect(Math.abs(result.avgStrain - calculatedAverage)).toBeLessThan(
      Math.max(Math.abs(result.avgStrain), Math.abs(calculatedAverage)) * 0.01 + 1e-6
    );
  });

  /**
   * Test case 8: Gradient formula validation
   */
  it('should calculate gradient correctly', () => {
    const input: ReversebeamInput = {
      appliedLoad: 5000, // lbf
      beamWidth: 1.0, // inches
      thickness: 0.25, // inches
      distanceBetweenGages: 2.0, // inches
      modulus: 30000, // PSI
      gageLength: 0.5, // inches
      gageFactor: 2.0,
    };

    const result = calculateReversebeamStrain(input);

    // Verify gradient calculation: (Max - Min) / Max * 100
    const expectedGradient = ((result.maxStrain - result.minStrain) / result.maxStrain) * 100;
    expect(Math.abs(result.gradient - expectedGradient)).toBeLessThan(
      Math.max(Math.abs(result.gradient), Math.abs(expectedGradient)) * 0.001 + 1e-6
    );
  });

  /**
   * Test case 9: Validation - invalid thickness
   */
  it('should reject invalid geometry', () => {
    const invalidInput: ReversebeamInput = {
      appliedLoad: 5000,
      beamWidth: 1.0,
      thickness: -0.1, // negative thickness
      distanceBetweenGages: 2.0,
      modulus: 30000,
      gageLength: 0.5,
      gageFactor: 2.0,
    };

    expect(() => calculateReversebeamStrain(invalidInput)).toThrow();
  });

  /**
   * Test case 10: Validation - gage length exceeds distance
   */
  it('should reject gage length greater than distance between gages', () => {
    const invalidInput: ReversebeamInput = {
      appliedLoad: 5000,
      beamWidth: 1.0,
      thickness: 0.25,
      distanceBetweenGages: 2.0, // inches
      modulus: 30000,
      gageLength: 3.0, // longer than distance (should be <= distance)
      gageFactor: 2.0,
    };

    expect(() => calculateReversebeamStrain(invalidInput)).toThrow();
  });

  /**
   * Test case 11: Unit auto-detection
   */
  it('should auto-detect SI units', () => {
    const siInput: ReversebeamInput = {
      appliedLoad: 22241, // N (> 4000)
      beamWidth: 25, // mm (> 10)
      thickness: 6, // mm
      distanceBetweenGages: 50, // mm
      modulus: 200e9, // Pa (> 10^7)
      gageLength: 12, // mm
      gageFactor: 2.0,
    };

    expect(() => calculateReversebeamStrain(siInput)).not.toThrow();
  });
});
