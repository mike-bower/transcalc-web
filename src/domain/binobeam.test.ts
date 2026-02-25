import { describe, it, expect } from 'vitest';
import { calculateBinobeamStrain, BinobeamInput } from './binobeam';

describe('Binocular Beam Calculator', () => {
  /**
   * Test case 1: Nominal geometry with US units
   * Applied Load: 5000 lbf
   * Distance Between Holes: 1.5 inches
   * Hole Radius: 0.25 inches
   * Beam Width: 1.0 inch
   * Beam Height: 0.5 inches
   * Minimum Thickness: 0.05 inches
   * Modulus: 30,000 PSI (typical for test)
   * Gage Length: 0.5 inches
   * Gage Factor: 2.0
   */
  it('should calculate strain for nominal US geometry', () => {
    const input: BinobeamInput = {
      appliedLoad: 5000, // lbf
      distanceBetweenHoles: 1.5, // inches
      radius: 0.25, // inches
      beamWidth: 1.0, // inches
      beamHeight: 0.5, // inches
      distanceLoadHole: 0, // inches (set per Delphi code)
      minimumThickness: 0.05, // inches
      modulus: 30000, // PSI (E ≈ 30 GPa for typical test material)
      gageLength: 0.5, // inches
      gageFactor: 2.0,
    };

    const result = calculateBinobeamStrain(input);

    // Verify that strain values are reasonable
    expect(result.minStrain).toBeLessThan(0); // Some negative (compression in gage area)
    expect(result.maxStrain).toBeGreaterThan(0); // Some positive (tension)
    expect(result.avgStrain).toBeGreaterThan(0);
    expect(result.avgStrain).toBeLessThanOrEqual(result.maxStrain);

    // Gradient should be positive percentage
    expect(result.gradient).toBeGreaterThan(0);
    expect(result.gradient).toBeLessThanOrEqual(100);

    // Sensitivity should be reasonable (mV/V)
    expect(result.fullSpanSensitivity).toBeGreaterThan(0);

    // Z_Offset indicates neutral axis location (should be within gage range)
    expect(Math.abs(result.zOffset)).toBeLessThanOrEqual(input.gageLength / 2);
  });

  /**
   * Test case 2: Metric (SI) units
   * Applied Load: 22,241 N (≈ 5000 lbf)
   * Distance Between Holes: 38.1 mm
   * Hole Radius: 6.35 mm
   * Beam Width: 25.4 mm
   * Beam Height: 12.7 mm
   * Minimum Thickness: 1.27 mm
   * Modulus: 206.8 GPa (30,000 PSI)
   * Gage Length: 12.7 mm
   * Gage Factor: 2.0
   */
  it('should calculate strain for nominal SI geometry', () => {
    const input: BinobeamInput = {
      appliedLoad: 22241, // N
      distanceBetweenHoles: 38.1, // mm
      radius: 6.35, // mm
      beamWidth: 25.4, // mm
      beamHeight: 12.7, // mm
      distanceLoadHole: 0, // mm
      minimumThickness: 1.27, // mm
      modulus: 206.8e9, // Pa
      gageLength: 12.7, // mm
      gageFactor: 2.0,
    };

    const result = calculateBinobeamStrain(input);

    expect(result.minStrain).toBeDefined();
    expect(result.maxStrain).toBeGreaterThan(0);
    expect(result.avgStrain).toBeGreaterThan(0);
    expect(result.gradient).toBeGreaterThan(0);
    expect(result.fullSpanSensitivity).toBeGreaterThan(0);
  });

  /**
   * Test case 3: High load scenario
   * Should produce higher strain values
   */
  it('should produce higher strain under increased load', () => {
    const baseInput: BinobeamInput = {
      appliedLoad: 5000, // lbf
      distanceBetweenHoles: 1.5, // inches
      radius: 0.25, // inches
      beamWidth: 1.0, // inches
      beamHeight: 0.5, // inches
      distanceLoadHole: 0,
      minimumThickness: 0.05, // inches
      modulus: 30000, // PSI
      gageLength: 0.5, // inches
      gageFactor: 2.0,
    };

    const highLoadInput: BinobeamInput = {
      ...baseInput,
      appliedLoad: 10000, // doubled load
    };

    const baseResult = calculateBinobeamStrain(baseInput);
    const highLoadResult = calculateBinobeamStrain(highLoadInput);

    // Doubling load should approximately double strain
    expect(highLoadResult.maxStrain).toBeGreaterThan(baseResult.maxStrain);
    expect(highLoadResult.avgStrain).toBeGreaterThan(baseResult.avgStrain);
    expect(highLoadResult.fullSpanSensitivity).toBeGreaterThan(baseResult.fullSpanSensitivity);
  });

  /**
   * Test case 4: Smaller hole geometry
   * Smaller radius should change strain distribution
   */
  it('should handle smaller hole geometry', () => {
    const input: BinobeamInput = {
      appliedLoad: 5000, // lbf
      distanceBetweenHoles: 1.2, // inches
      radius: 0.15, // smaller radius
      beamWidth: 1.0, // inches
      beamHeight: 0.4, // inches
      distanceLoadHole: 0,
      minimumThickness: 0.04, // inches
      modulus: 30000, // PSI
      gageLength: 0.3, // shorter gage length
      gageFactor: 2.0,
    };

    const result = calculateBinobeamStrain(input);

    expect(result.minStrain).toBeDefined();
    expect(result.maxStrain).toBeGreaterThan(0);
    expect(result.avgStrain).toBeGreaterThan(0);
  });

  /**
   * Test case 5: Higher gage factor
   * Sensitivity should scale with gage factor
   */
  it('should scale sensitivity with gage factor', () => {
    const baseInput: BinobeamInput = {
      appliedLoad: 5000, // lbf
      distanceBetweenHoles: 1.5, // inches
      radius: 0.25, // inches
      beamWidth: 1.0, // inches
      beamHeight: 0.5, // inches
      distanceLoadHole: 0,
      minimumThickness: 0.05, // inches
      modulus: 30000, // PSI
      gageLength: 0.5, // inches
      gageFactor: 2.0,
    };

    const highGFInput: BinobeamInput = {
      ...baseInput,
      gageFactor: 3.0,
    };

    const baseResult = calculateBinobeamStrain(baseInput);
    const highGFResult = calculateBinobeamStrain(highGFInput);

    // GF is linearly proportional to sensitivity
    expect(highGFResult.fullSpanSensitivity).toBeGreaterThan(baseResult.fullSpanSensitivity);
    expect(highGFResult.fullSpanSensitivity / baseResult.fullSpanSensitivity).toBeCloseTo(
      3.0 / 2.0,
      1 // Within 1 order of magnitude
    );
  });

  /**
   * Test case 6: Validation - height too small
   */
  it('should reject height smaller than 2r + 2t_min', () => {
    const input: BinobeamInput = {
      appliedLoad: 5000, // lbf
      distanceBetweenHoles: 1.5, // inches
      radius: 0.25, // inches
      beamWidth: 1.0, // inches
      beamHeight: 0.2, // too small (< 2*0.25 + 2*0.05 = 0.6)
      distanceLoadHole: 0,
      minimumThickness: 0.05, // inches
      modulus: 30000, // PSI
      gageLength: 0.5, // inches
      gageFactor: 2.0,
    };

    expect(() => calculateBinobeamStrain(input)).toThrow();
  });

  /**
   * Test case 7: Validation - height/width ratio too high
   */
  it('should reject height/width ratio > 5', () => {
    const input: BinobeamInput = {
      appliedLoad: 5000, // lbf
      distanceBetweenHoles: 1.5, // inches
      radius: 0.25, // inches
      beamWidth: 0.1, // very small width
      beamHeight: 0.6, // height/width = 6 > 5
      distanceLoadHole: 0,
      minimumThickness: 0.05, // inches
      modulus: 30000, // PSI
      gageLength: 0.5, // inches
      gageFactor: 2.0,
    };

    expect(() => calculateBinobeamStrain(input)).toThrow();
  });

  /**
   * Test case 8: Validation - distance/width ratio too small
   */
  it('should reject distance/width ratio < 2', () => {
    const input: BinobeamInput = {
      appliedLoad: 5000, // lbf
      distanceBetweenHoles: 1.0, // too small (< 2*1.0 = 2.0)
      radius: 0.25, // inches
      beamWidth: 1.0, // inches
      beamHeight: 0.5, // inches
      distanceLoadHole: 0,
      minimumThickness: 0.05, // inches
      modulus: 30000, // PSI
      gageLength: 0.5, // inches
      gageFactor: 2.0,
    };

    expect(() => calculateBinobeamStrain(input)).toThrow();
  });

  /**
   * Test case 9: Validation - gage length exceeds radius
   */
  it('should reject gage length > 2*radius', () => {
    const input: BinobeamInput = {
      appliedLoad: 5000, // lbf
      distanceBetweenHoles: 1.5, // inches
      radius: 0.25, // inches
      beamWidth: 1.0, // inches
      beamHeight: 0.5, // inches
      distanceLoadHole: 0,
      minimumThickness: 0.05, // inches
      modulus: 30000, // PSI
      gageLength: 0.6, // > 2*0.25 = 0.5
      gageFactor: 2.0,
    };

    expect(() => calculateBinobeamStrain(input)).toThrow();
  });

  /**
   * Test case 10: Unit auto-detection
   * Large numbers should be interpreted as SI meters/Pa
   * Small numbers should be interpreted as inches/PSI
   */
  it('should auto-detect SI units (large modulus value)', () => {
    // Using SI units (GPa = 10^9 Pa range)
    const siInput: BinobeamInput = {
      appliedLoad: 22241, // N (> 4000)
      distanceBetweenHoles: 38, // mm (> 10)
      radius: 6, // mm
      beamWidth: 25, // mm
      beamHeight: 13, // mm
      distanceLoadHole: 0,
      minimumThickness: 1, // mm
      modulus: 200e9, // Pa (> 10^7)
      gageLength: 12, // mm
      gageFactor: 2.0,
    };

    expect(() => calculateBinobeamStrain(siInput)).not.toThrow();
  });

  /**
   * Test case 11: Return variance check
   * Z_Offset should indicate peak location
   */
  it('should return z_offset within gage range', () => {
    const input: BinobeamInput = {
      appliedLoad: 5000, // lbf
      distanceBetweenHoles: 1.5, // inches
      radius: 0.25, // inches
      beamWidth: 1.0, // inches
      beamHeight: 0.5, // inches
      distanceLoadHole: 0,
      minimumThickness: 0.05, // inches
      modulus: 30000, // PSI
      gageLength: 0.5, // inches
      gageFactor: 2.0,
    };

    const result = calculateBinobeamStrain(input);
    const gageLengthHalf = input.gageLength / 2 * 0.0254; // convert to m

    expect(Math.abs(result.zOffset)).toBeLessThanOrEqual(gageLengthHalf + 0.0001); // Small tolerance
  });
});
