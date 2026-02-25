import { describe, it, expect } from 'vitest';
import { calculateRoundSolidColumnStrain, RoundSolidColumnInput } from '../domain/rndsldc';

describe('Round Solid Column Strain Calculation', () => {
  it('should calculate axial strain for US units compression', () => {
    const input: RoundSolidColumnInput = {
      appliedLoad: 10000, // lbf
      diameter: 2.0, // inches
      modulus: 30e6, // PSI
      poissonRatio: 0.3,
      gageFactor: 2.0,
      usUnits: true,
    };
    
    const result = calculateRoundSolidColumnStrain(input);
    
    // Area = π × (2/2)² = π
    // Stress = 10000 / π = 3183.10 PSI
    // Axial = -3183.10 / 30e6 * 1e6 = -106.1 microstrains
    expect(result.axialStrain).toBeCloseTo(-106.1, 0);
    expect(result.transverseStrain).toBeCloseTo(31.83, 0); // 106.1 * 0.3
    expect(result.isValid).toBe(true);
  });

  it('should calculate bridge output correctly', () => {
    const input: RoundSolidColumnInput = {
      appliedLoad: 5000,
      diameter: 1.5,
      modulus: 30e6,
      poissonRatio: 0.3,
      gageFactor: 2.0,
      usUnits: true,
    };
    
    const result = calculateRoundSolidColumnStrain(input);
    
    // Area = π × (0.75)² = 1.767
    // Stress = 5000 / 1.767 = 2829.15
    // Axial = -2829.15 / 30e6 * 1e6 = -94.31 microstrains
    expect(result.axialStrain).toBeCloseTo(-94.31, 0);
    
    // Bridge calculation verification
    const expectedBridge = (2.0 * ((-2 * result.axialStrain) + (2 * result.transverseStrain)) / 4) * 1e-3;
    expect(result.fullSpanOutput).toBeCloseTo(expectedBridge, 5);
  });

  it('should auto-detect US units from high modulus value', () => {
    const input: RoundSolidColumnInput = {
      appliedLoad: 10000,
      diameter: 2.0,
      modulus: 30e6, // PSI (recognized as US)
      poissonRatio: 0.3,
      gageFactor: 2.0,
    };
    
    const result = calculateRoundSolidColumnStrain(input);
    expect(result.isValid).toBe(true);
    expect(Math.abs(result.axialStrain)).toBeGreaterThan(50);
  });

  it('should convert SI units correctly', () => {
    const input: RoundSolidColumnInput = {
      appliedLoad: 44482.2, // N (approximately 10000 lbf)
      diameter: 50.8, // mm (2 inches)
      modulus: 207, // GPa (approximately 30 PSI)
      poissonRatio: 0.3,
      gageFactor: 2.0,
      usUnits: false,
    };
    
    const result = calculateRoundSolidColumnStrain(input);
    
    // Should give similar results to US calculation
    expect(result.axialStrain).toBeCloseTo(-106.1, 0);
    expect(result.isValid).toBe(true);
  });

  it('should calculate zero strain with zero load', () => {
    const input: RoundSolidColumnInput = {
      appliedLoad: 0,
      diameter: 2.0,
      modulus: 30e6,
      poissonRatio: 0.3,
      gageFactor: 2.0,
      usUnits: true,
    };
    
    const result = calculateRoundSolidColumnStrain(input);
    expect(result.axialStrain).toBeCloseTo(0, 5);
    expect(result.transverseStrain).toBeCloseTo(0, 5);
    expect(result.fullSpanOutput).toBeCloseTo(0, 5);
  });

  it('should maintain Poisson relationship', () => {
    const input: RoundSolidColumnInput = {
      appliedLoad: 10000,
      diameter: 2.0,
      modulus: 30e6,
      poissonRatio: 0.35,
      gageFactor: 2.0,
      usUnits: true,
    };
    
    const result = calculateRoundSolidColumnStrain(input);
    
    const expectedTransverse = result.axialStrain * (-0.35);
    expect(result.transverseStrain).toBeCloseTo(expectedTransverse, 5);
  });

  it('should throw error with invalid applied load', () => {
    const input: RoundSolidColumnInput = {
      appliedLoad: -1000,
      diameter: 2.0,
      modulus: 30e6,
      poissonRatio: 0.3,
      gageFactor: 2.0,
      usUnits: true,
    };
    
    expect(() => calculateRoundSolidColumnStrain(input)).toThrow('non-negative');
  });

  it('should throw error with invalid diameter', () => {
    const input: RoundSolidColumnInput = {
      appliedLoad: 1000,
      diameter: 0,
      modulus: 30e6,
      poissonRatio: 0.3,
      gageFactor: 2.0,
      usUnits: true,
    };
    
    expect(() => calculateRoundSolidColumnStrain(input)).toThrow('positive');
  });

  it('should throw error with invalid modulus', () => {
    const input: RoundSolidColumnInput = {
      appliedLoad: 1000,
      diameter: 2.0,
      modulus: -30e6,
      poissonRatio: 0.3,
      gageFactor: 2.0,
      usUnits: true,
    };
    
    expect(() => calculateRoundSolidColumnStrain(input)).toThrow('positive');
  });

  it('should throw error with invalid Poisson ratio', () => {
    const input: RoundSolidColumnInput = {
      appliedLoad: 1000,
      diameter: 2.0,
      modulus: 30e6,
      poissonRatio: 0.8,
      gageFactor: 2.0,
      usUnits: true,
    };
    
    expect(() => calculateRoundSolidColumnStrain(input)).toThrow('Poisson');
  });

  it('should scale strain linearly with load', () => {
    const input1: RoundSolidColumnInput = {
      appliedLoad: 5000,
      diameter: 2.0,
      modulus: 30e6,
      poissonRatio: 0.3,
      gageFactor: 2.0,
      usUnits: true,
    };
    
    const input2: RoundSolidColumnInput = {
      appliedLoad: 15000,
      diameter: 2.0,
      modulus: 30e6,
      poissonRatio: 0.3,
      gageFactor: 2.0,
      usUnits: true,
    };
    
    const result1 = calculateRoundSolidColumnStrain(input1);
    const result2 = calculateRoundSolidColumnStrain(input2);
    
    expect(result2.axialStrain / result1.axialStrain).toBeCloseTo(3, 5);
  });

  it('should scale strain inversely with diameter squared', () => {
    const input1: RoundSolidColumnInput = {
      appliedLoad: 10000,
      diameter: 1.0,
      modulus: 30e6,
      poissonRatio: 0.3,
      gageFactor: 2.0,
      usUnits: true,
    };
    
    const input2: RoundSolidColumnInput = {
      appliedLoad: 10000,
      diameter: 2.0,
      modulus: 30e6,
      poissonRatio: 0.3,
      gageFactor: 2.0,
      usUnits: true,
    };
    
    const result1 = calculateRoundSolidColumnStrain(input1);
    const result2 = calculateRoundSolidColumnStrain(input2);
    
    // Doubling diameter increases area by 4x, reducing strain by 4x
    expect(Math.abs(result1.axialStrain / result2.axialStrain)).toBeCloseTo(4, 1);
  });

  it('should handle small diameter columns', () => {
    const input: RoundSolidColumnInput = {
      appliedLoad: 1000,
      diameter: 0.25, // Small diameter
      modulus: 30e6,
      poissonRatio: 0.3,
      gageFactor: 2.0,
      usUnits: true,
    };
    
    const result = calculateRoundSolidColumnStrain(input);
    expect(Math.abs(result.axialStrain)).toBeGreaterThan(500);
    expect(result.isValid).toBe(true);
  });

  it('should handle large diameter columns', () => {
    const input: RoundSolidColumnInput = {
      appliedLoad: 100000,
      diameter: 12.0, // Large diameter
      modulus: 30e6,
      poissonRatio: 0.3,
      gageFactor: 2.0,
      usUnits: true,
    };
    
    const result = calculateRoundSolidColumnStrain(input);
    expect(Math.abs(result.axialStrain)).toBeLessThan(100);
    expect(result.isValid).toBe(true);
  });
});
