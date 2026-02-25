import { describe, it, expect } from 'vitest';
import { calculateRoundSolidTorqueStrain, RoundSolidTorqueInput } from '../domain/rndsldtq';

describe('Round Solid Torque Strain Calculation', () => {
  it('should calculate shear strain for US units', () => {
    const input: RoundSolidTorqueInput = {
      appliedTorque: 10000, // in-lbf
      diameter: 2.0, // inches
      modulus: 30e6, // PSI
      poissonRatio: 0.3,
      gageFactor: 2.0,
      usUnits: true,
    };
    
    const result = calculateRoundSolidTorqueStrain(input);
    
    // Shear Modulus = 30e6 / (2 * 1.3) = 11538461.5
    // Polar Moment = π × (1)⁴ / 2 = 1.5708
    // Shear Stress = 10000 × 1 / 1.5708 = 6366.20
    // Shear Strain = 6366.20 / 11538461.5 * 1e6 = 551.8 microstrains
    expect(result.shearStrain).toBeCloseTo(551.8, 0);
    expect(result.normalStrain).toBeCloseTo(275.9, 0); // Shear / 2
    expect(result.isValid).toBe(true);
  });

  it('should calculate bridge output correctly', () => {
    const input: RoundSolidTorqueInput = {
      appliedTorque: 5000,
      diameter: 1.5,
      modulus: 30e6,
      poissonRatio: 0.3,
      gageFactor: 2.0,
      usUnits: true,
    };
    
    const result = calculateRoundSolidTorqueStrain(input);
    
    // Verify bridge calculation
    const expectedBridge = (2.0 * (2 * result.shearStrain) / 4) * 1e-3;
    expect(result.fullSpanOutput).toBeCloseTo(expectedBridge, 5);
  });

  it('should auto-detect US units', () => {
    const input: RoundSolidTorqueInput = {
      appliedTorque: 10000,
      diameter: 2.0,
      modulus: 30e6,
      poissonRatio: 0.3,
      gageFactor: 2.0,
    };
    
    const result = calculateRoundSolidTorqueStrain(input);
    expect(result.isValid).toBe(true);
  });

  it('should convert SI units correctly', () => {
    const input: RoundSolidTorqueInput = {
      appliedTorque: 1129.848, // N-m (approximately 10000 in-lbf)
      diameter: 50.8, // mm (2 inches)
      modulus: 207, // GPa
      poissonRatio: 0.3,
      gageFactor: 2.0,
      usUnits: false,
    };
    
    const result = calculateRoundSolidTorqueStrain(input);
    expect(result.shearStrain).toBeCloseTo(551.8, 0);
    expect(result.isValid).toBe(true);
  });

  it('should calculate zero strain with zero torque', () => {
    const input: RoundSolidTorqueInput = {
      appliedTorque: 0,
      diameter: 2.0,
      modulus: 30e6,
      poissonRatio: 0.3,
      gageFactor: 2.0,
      usUnits: true,
    };
    
    const result = calculateRoundSolidTorqueStrain(input);
    expect(result.shearStrain).toBe(0);
    expect(result.normalStrain).toBe(0);
    expect(result.fullSpanOutput).toBe(0);
  });

  it('should maintain normal/shear relationship', () => {
    const input: RoundSolidTorqueInput = {
      appliedTorque: 10000,
      diameter: 2.0,
      modulus: 30e6,
      poissonRatio: 0.3,
      gageFactor: 2.0,
      usUnits: true,
    };
    
    const result = calculateRoundSolidTorqueStrain(input);
    
    // Normal strain should be exactly half of shear strain
    expect(result.normalStrain).toBeCloseTo(result.shearStrain / 2, 5);
  });

  it('should throw error with invalid applied torque', () => {
    const input: RoundSolidTorqueInput = {
      appliedTorque: -1000,
      diameter: 2.0,
      modulus: 30e6,
      poissonRatio: 0.3,
      gageFactor: 2.0,
      usUnits: true,
    };
    
    expect(() => calculateRoundSolidTorqueStrain(input)).toThrow('non-negative');
  });

  it('should throw error with invalid diameter', () => {
    const input: RoundSolidTorqueInput = {
      appliedTorque: 1000,
      diameter: 0,
      modulus: 30e6,
      poissonRatio: 0.3,
      gageFactor: 2.0,
      usUnits: true,
    };
    
    expect(() => calculateRoundSolidTorqueStrain(input)).toThrow('positive');
  });

  it('should throw error with invalid modulus', () => {
    const input: RoundSolidTorqueInput = {
      appliedTorque: 1000,
      diameter: 2.0,
      modulus: -30e6,
      poissonRatio: 0.3,
      gageFactor: 2.0,
      usUnits: true,
    };
    
    expect(() => calculateRoundSolidTorqueStrain(input)).toThrow('positive');
  });

  it('should throw error with invalid Poisson ratio', () => {
    const input: RoundSolidTorqueInput = {
      appliedTorque: 1000,
      diameter: 2.0,
      modulus: 30e6,
      poissonRatio: 0.7,
      gageFactor: 2.0,
      usUnits: true,
    };
    
    expect(() => calculateRoundSolidTorqueStrain(input)).toThrow('Poisson');
  });

  it('should scale shear strain with torque', () => {
    const input1: RoundSolidTorqueInput = {
      appliedTorque: 5000,
      diameter: 2.0,
      modulus: 30e6,
      poissonRatio: 0.3,
      gageFactor: 2.0,
      usUnits: true,
    };
    
    const input2: RoundSolidTorqueInput = {
      appliedTorque: 15000,
      diameter: 2.0,
      modulus: 30e6,
      poissonRatio: 0.3,
      gageFactor: 2.0,
      usUnits: true,
    };
    
    const result1 = calculateRoundSolidTorqueStrain(input1);
    const result2 = calculateRoundSolidTorqueStrain(input2);
    
    expect(result2.shearStrain / result1.shearStrain).toBeCloseTo(3, 5);
  });

  it('should scale shear strain inversely with diameter cubed for polar moment', () => {
    const input1: RoundSolidTorqueInput = {
      appliedTorque: 10000,
      diameter: 1.0,
      modulus: 30e6,
      poissonRatio: 0.3,
      gageFactor: 2.0,
      usUnits: true,
    };
    
    const input2: RoundSolidTorqueInput = {
      appliedTorque: 10000,
      diameter: 2.0,
      modulus: 30e6,
      poissonRatio: 0.3,
      gageFactor: 2.0,
      usUnits: true,
    };
    
    const result1 = calculateRoundSolidTorqueStrain(input1);
    const result2 = calculateRoundSolidTorqueStrain(input2);
    
    // Doubling diameter increases polar moment by 2^4 / 2 = 8x, reducing strain to 1/8
    // But radius also doubles, so net effect is: torque×2r / ((8J)) = 16/8 = 2x reduction
    // Actually J ∝ D^4, so 2D gives 16x larger J, but outer radius is 2x
    // τ = T×r/J, so doubling D: T×(2r)/(16J) = 2T×r/(16J) = T×r/(8J) = 1/8 strain
    expect(result1.shearStrain / result2.shearStrain).toBeCloseTo(8, 1);
  });

  it('should handle high modulus values (stiffer materials)', () => {
    const input: RoundSolidTorqueInput = {
      appliedTorque: 10000,
      diameter: 2.0,
      modulus: 100e6, // Much stiffer
      poissonRatio: 0.3,
      gageFactor: 2.0,
      usUnits: true,
    };
    
    const result = calculateRoundSolidTorqueStrain(input);
    expect(Math.abs(result.shearStrain)).toBeLessThan(200); // Much lower strain
    expect(result.isValid).toBe(true);
  });

  it('should handle low modulus values (more flexible materials)', () => {
    const input: RoundSolidTorqueInput = {
      appliedTorque: 10000,
      diameter: 2.0,
      modulus: 10e6, // Much more flexible
      poissonRatio: 0.3,
      gageFactor: 2.0,
      usUnits: true,
    };
    
    const result = calculateRoundSolidTorqueStrain(input);
    expect(Math.abs(result.shearStrain)).toBeGreaterThan(1000); // Much higher strain
    expect(result.isValid).toBe(true);
  });

  it('should handle high Poisson ratio effects on shear modulus', () => {
    const input1: RoundSolidTorqueInput = {
      appliedTorque: 10000,
      diameter: 2.0,
      modulus: 30e6,
      poissonRatio: 0.1, // Low Poisson
      gageFactor: 2.0,
      usUnits: true,
    };
    
    const input2: RoundSolidTorqueInput = {
      appliedTorque: 10000,
      diameter: 2.0,
      modulus: 30e6,
      poissonRatio: 0.4, // High Poisson
      gageFactor: 2.0,
      usUnits: true,
    };
    
    const result1 = calculateRoundSolidTorqueStrain(input1);
    const result2 = calculateRoundSolidTorqueStrain(input2);
    
    // Higher Poisson ratio -> lower shear modulus -> higher strain
    expect(result2.shearStrain).toBeGreaterThan(result1.shearStrain);
  });

  it('should throw error with invalid gage factor', () => {
    const input: RoundSolidTorqueInput = {
      appliedTorque: 1000,
      diameter: 2.0,
      modulus: 30e6,
      poissonRatio: 0.3,
      gageFactor: 0, // Invalid
      usUnits: true,
    };
    
    expect(() => calculateRoundSolidTorqueStrain(input)).toThrow('positive');
  });
});
