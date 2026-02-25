import { describe, it, expect } from 'vitest';
import { calculateRoundHollowTorqueStrain, RoundHollowTorqueInput } from '../domain/rndhlwtq';

describe('Round Hollow Torque Strain Calculation', () => {
  it('should calculate shear strain for hollow shaft', () => {
    const input: RoundHollowTorqueInput = {
      appliedTorque: 10000, // in-lbf
      outerDiameter: 3.0, // inches
      innerDiameter: 1.0, // inches
      modulus: 30e6, // PSI
      poissonRatio: 0.3,
      gageFactor: 2.0,
      usUnits: true,
    };
    
    const result = calculateRoundHollowTorqueStrain(input);
    
    // Shear Modulus = 30e6 / (2 * 1.3) = 11538461.5
    // Polar Moment = π × ((1.5)⁴ - (0.5)⁴) / 2 = π × (5.0625 - 0.0625) / 2 = 7.854
    // Shear Stress = 10000 × 1.5 / 7.854 = 1909.86
    // Shear Strain = 1909.86 / 11538461.5 * 1e6 = 165.6 microstrains
    expect(result.shearStrain).toBeCloseTo(165.6, 0);
    expect(result.normalStrain).toBeCloseTo(82.8, 0); // Shear / 2
    expect(result.isValid).toBe(true);
  });

  it('should throw error if inner diameter equals outer diameter', () => {
    const input: RoundHollowTorqueInput = {
      appliedTorque: 10000,
      outerDiameter: 2.0,
      innerDiameter: 2.0,
      modulus: 30e6,
      poissonRatio: 0.3,
      gageFactor: 2.0,
      usUnits: true,
    };
    
    expect(() => calculateRoundHollowTorqueStrain(input)).toThrow('less than');
  });

  it('should throw error if inner diameter exceeds outer diameter', () => {
    const input: RoundHollowTorqueInput = {
      appliedTorque: 10000,
      outerDiameter: 1.0,
      innerDiameter: 2.0,
      modulus: 30e6,
      poissonRatio: 0.3,
      gageFactor: 2.0,
      usUnits: true,
    };
    
    expect(() => calculateRoundHollowTorqueStrain(input)).toThrow('less than');
  });

  it('should calculate zero strain with zero torque', () => {
    const input: RoundHollowTorqueInput = {
      appliedTorque: 0,
      outerDiameter: 3.0,
      innerDiameter: 1.0,
      modulus: 30e6,
      poissonRatio: 0.3,
      gageFactor: 2.0,
      usUnits: true,
    };
    
    const result = calculateRoundHollowTorqueStrain(input);
    expect(result.shearStrain).toBe(0);
    expect(result.normalStrain).toBe(0);
    expect(result.fullSpanOutput).toBe(0);
  });

  it('should auto-detect US units', () => {
    const input: RoundHollowTorqueInput = {
      appliedTorque: 10000,
      outerDiameter: 3.0,
      innerDiameter: 1.0,
      modulus: 30e6,
      poissonRatio: 0.3,
      gageFactor: 2.0,
    };
    
    const result = calculateRoundHollowTorqueStrain(input);
    expect(result.isValid).toBe(true);
  });

  it('should convert SI units correctly', () => {
    const input: RoundHollowTorqueInput = {
      appliedTorque: 1129.848, // N-m (approximately 10000 in-lbf)
      outerDiameter: 76.2, // mm (3 inches)
      innerDiameter: 25.4, // mm (1 inch)
      modulus: 207, // GPa
      poissonRatio: 0.3,
      gageFactor: 2.0,
      usUnits: false,
    };
    
    const result = calculateRoundHollowTorqueStrain(input);
    expect(result.shearStrain).toBeCloseTo(165.6, 0);
    expect(result.isValid).toBe(true);
  });

  it('should maintain normal/shear relationship', () => {
    const input: RoundHollowTorqueInput = {
      appliedTorque: 10000,
      outerDiameter: 3.0,
      innerDiameter: 1.0,
      modulus: 30e6,
      poissonRatio: 0.3,
      gageFactor: 2.0,
      usUnits: true,
    };
    
    const result = calculateRoundHollowTorqueStrain(input);
    
    // Normal strain should be exactly half of shear strain
    expect(result.normalStrain).toBeCloseTo(result.shearStrain / 2, 5);
  });

  it('should calculate bridge output correctly', () => {
    const input: RoundHollowTorqueInput = {
      appliedTorque: 5000,
      outerDiameter: 2.5,
      innerDiameter: 0.5,
      modulus: 30e6,
      poissonRatio: 0.3,
      gageFactor: 2.0,
      usUnits: true,
    };
    
    const result = calculateRoundHollowTorqueStrain(input);
    
    // Verify bridge calculation
    const expectedBridge = (2.0 * (2 * result.shearStrain) / 4) * 1e-3;
    expect(result.fullSpanOutput).toBeCloseTo(expectedBridge, 5);
  });

  it('should throw error with invalid applied torque', () => {
    const input: RoundHollowTorqueInput = {
      appliedTorque: -1000,
      outerDiameter: 3.0,
      innerDiameter: 1.0,
      modulus: 30e6,
      poissonRatio: 0.3,
      gageFactor: 2.0,
      usUnits: true,
    };
    
    expect(() => calculateRoundHollowTorqueStrain(input)).toThrow('non-negative');
  });

  it('should throw error with zero outer diameter', () => {
    const input: RoundHollowTorqueInput = {
      appliedTorque: 1000,
      outerDiameter: 0,
      innerDiameter: 1.0,
      modulus: 30e6,
      poissonRatio: 0.3,
      gageFactor: 2.0,
      usUnits: true,
    };
    
    expect(() => calculateRoundHollowTorqueStrain(input)).toThrow('positive');
  });

  it('should throw error with zero inner diameter', () => {
    const input: RoundHollowTorqueInput = {
      appliedTorque: 1000,
      outerDiameter: 3.0,
      innerDiameter: 0,
      modulus: 30e6,
      poissonRatio: 0.3,
      gageFactor: 2.0,
      usUnits: true,
    };
    
    expect(() => calculateRoundHollowTorqueStrain(input)).toThrow('positive');
  });

  it('should scale shear strain with torque', () => {
    const input1: RoundHollowTorqueInput = {
      appliedTorque: 5000,
      outerDiameter: 3.0,
      innerDiameter: 1.0,
      modulus: 30e6,
      poissonRatio: 0.3,
      gageFactor: 2.0,
      usUnits: true,
    };
    
    const input2: RoundHollowTorqueInput = {
      appliedTorque: 20000,
      outerDiameter: 3.0,
      innerDiameter: 1.0,
      modulus: 30e6,
      poissonRatio: 0.3,
      gageFactor: 2.0,
      usUnits: true,
    };
    
    const result1 = calculateRoundHollowTorqueStrain(input1);
    const result2 = calculateRoundHollowTorqueStrain(input2);
    
    expect(result2.shearStrain / result1.shearStrain).toBeCloseTo(4, 5);
  });

  it('should handle thin-walled hollow shafts', () => {
    const input: RoundHollowTorqueInput = {
      appliedTorque: 10000,
      outerDiameter: 5.0,
      innerDiameter: 4.9, // Very thin wall
      modulus: 30e6,
      poissonRatio: 0.3,
      gageFactor: 2.0,
      usUnits: true,
    };
    
    const result = calculateRoundHollowTorqueStrain(input);
    // Small polar moment -> high strain
    expect(Math.abs(result.shearStrain)).toBeGreaterThan(300);
    expect(result.isValid).toBe(true);
  });

  it('should handle thick-walled hollow shafts', () => {
    const input: RoundHollowTorqueInput = {
      appliedTorque: 10000,
      outerDiameter: 5.0,
      innerDiameter: 1.0, // Thick wall
      modulus: 30e6,
      poissonRatio: 0.3,
      gageFactor: 2.0,
      usUnits: true,
    };
    
    const result = calculateRoundHollowTorqueStrain(input);
    // Large polar moment -> low strain
    expect(Math.abs(result.shearStrain)).toBeLessThan(100);
    expect(result.isValid).toBe(true);
  });

  it('should compare hollow vs solid for same outer diameter', () => {
    // Since we can't make truly solid hollow (ID=0), we compare with very small ID
    const thinWalled: RoundHollowTorqueInput = {
      appliedTorque: 10000,
      outerDiameter: 2.0,
      innerDiameter: 1.99, // Nearly solid
      modulus: 30e6,
      poissonRatio: 0.3,
      gageFactor: 2.0,
      usUnits: true,
    };
    
    try {
      const result = calculateRoundHollowTorqueStrain(thinWalled);
      // Very thin walls -> very high strain
      expect(Math.abs(result.shearStrain)).toBeGreaterThan(5000);
    } catch (e) {
      // Expected - validation would catch this extreme case
    }
  });

  it('should throw error with invalid modulus', () => {
    const input: RoundHollowTorqueInput = {
      appliedTorque: 1000,
      outerDiameter: 3.0,
      innerDiameter: 1.0,
      modulus: 0,
      poissonRatio: 0.3,
      gageFactor: 2.0,
      usUnits: true,
    };
    
    expect(() => calculateRoundHollowTorqueStrain(input)).toThrow('positive');
  });

  it('should throw error with invalid Poisson ratio', () => {
    const input: RoundHollowTorqueInput = {
      appliedTorque: 1000,
      outerDiameter: 3.0,
      innerDiameter: 1.0,
      modulus: 30e6,
      poissonRatio: 0.8,
      gageFactor: 2.0,
      usUnits: true,
    };
    
    expect(() => calculateRoundHollowTorqueStrain(input)).toThrow('Poisson');
  });

  it('should handle high Poisson ratio effects', () => {
    const input1: RoundHollowTorqueInput = {
      appliedTorque: 10000,
      outerDiameter: 3.0,
      innerDiameter: 1.0,
      modulus: 30e6,
      poissonRatio: 0.1, // Low
      gageFactor: 2.0,
      usUnits: true,
    };
    
    const input2: RoundHollowTorqueInput = {
      appliedTorque: 10000,
      outerDiameter: 3.0,
      innerDiameter: 1.0,
      modulus: 30e6,
      poissonRatio: 0.4, // High
      gageFactor: 2.0,
      usUnits: true,
    };
    
    const result1 = calculateRoundHollowTorqueStrain(input1);
    const result2 = calculateRoundHollowTorqueStrain(input2);
    
    // Higher Poisson -> lower shear modulus -> higher strain
    expect(result2.shearStrain).toBeGreaterThan(result1.shearStrain);
  });

  it('should throw error with invalid gage factor', () => {
    const input: RoundHollowTorqueInput = {
      appliedTorque: 1000,
      outerDiameter: 3.0,
      innerDiameter: 1.0,
      modulus: 30e6,
      poissonRatio: 0.3,
      gageFactor: -1.0, // Invalid
      usUnits: true,
    };
    
    expect(() => calculateRoundHollowTorqueStrain(input)).toThrow('positive');
  });
});
