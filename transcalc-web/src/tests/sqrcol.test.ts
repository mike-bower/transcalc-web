import { describe, it, expect } from 'vitest';
import { calculateSquareColumnStrain, SquareColumnInput } from '../domain/sqrcol';

describe('Square Column Strain Calculation', () => {
  it('should calculate axial strain for US units compression', () => {
    const input: SquareColumnInput = {
      appliedLoad: 10000, // lbf
      width: 2.0, // inches
      depth: 2.0, // inches
      modulus: 30e6, // PSI
      poissonRatio: 0.3,
      gageFactor: 2.0,
      usUnits: true,
    };
    
    const result = calculateSquareColumnStrain(input);
    
    // Axial = -(10000 / (2 * 2)) / 30e6 * 1e6
    // = -(10000 / 4) / 30e6 * 1e6
    // = -2500 / 30e6 * 1e6 = -83.33 microstrains
    expect(result.axialStrain).toBeCloseTo(-83.33, 1);
    expect(result.transverseStrain).toBeCloseTo(25, 1); // 83.33 * 0.3
    expect(result.isValid).toBe(true);
  });

  it('should calculate bridge output correctly', () => {
    const input: SquareColumnInput = {
      appliedLoad: 5000, // lbf
      width: 1.5,
      depth: 1.5,
      modulus: 30e6, // PSI
      poissonRatio: 0.3,
      gageFactor: 2.0,
      usUnits: true,
    };
    
    const result = calculateSquareColumnStrain(input);
    
    // Axial = -(5000 / 2.25) / 30e6 * 1e6 = -74.07 microstrains
    // Transverse = 74.07 * 0.3 = 22.22 microstrains
    // Bridge = 2.0 * ((-2 * -74.07) + (2 * 22.22)) / 4 * 1e-3
    // = 2.0 * (148.14 + 44.44) / 4 * 1e-3 = 0.0961 mV/V
    const expectedBridge = (2.0 * ((-2 * result.axialStrain) + (2 * result.transverseStrain)) / 4) * 1e-3;
    expect(result.fullSpanOutput).toBeCloseTo(expectedBridge, 5);
  });

  it('should auto-detect US units from high modulus value', () => {
    const input: SquareColumnInput = {
      appliedLoad: 10000,
      width: 2.0,
      depth: 2.0,
      modulus: 30e6, // PSI (recognized as US)
      poissonRatio: 0.3,
      gageFactor: 2.0,
      // usUnits not specified, should auto-detect
    };
    
    const result = calculateSquareColumnStrain(input);
    expect(result.isValid).toBe(true);
    expect(Math.abs(result.axialStrain)).toBeGreaterThan(50); // Should be in microstrains
  });

  it('should convert SI units correctly', () => {
    const input: SquareColumnInput = {
      appliedLoad: 44482.2, // N (approximately 10000 lbf)
      width: 50.8, // mm (2 inches)
      depth: 50.8, // mm (2 inches)
      modulus: 207, // GPa (approximately 30 PSI)
      poissonRatio: 0.3,
      gageFactor: 2.0,
      usUnits: false,
    };
    
    const result = calculateSquareColumnStrain(input);
    
    // Should give similar results to US calculation
    expect(result.axialStrain).toBeCloseTo(-83.33, 0);
    expect(result.isValid).toBe(true);
  });

  it('should calculate zero strain with zero load', () => {
    const input: SquareColumnInput = {
      appliedLoad: 0,
      width: 2.0,
      depth: 2.0,
      modulus: 30e6,
      poissonRatio: 0.3,
      gageFactor: 2.0,
      usUnits: true,
    };
    
    const result = calculateSquareColumnStrain(input);
    expect(result.axialStrain).toBeCloseTo(0, 5);
    expect(result.transverseStrain).toBeCloseTo(0, 5);
    expect(result.fullSpanOutput).toBeCloseTo(0, 5);
  });

  it('should maintain stress relationship with Poisson effect', () => {
    const input: SquareColumnInput = {
      appliedLoad: 10000,
      width: 2.0,
      depth: 2.0,
      modulus: 30e6,
      poissonRatio: 0.3,
      gageFactor: 2.0,
      usUnits: true,
    };
    
    const result = calculateSquareColumnStrain(input);
    
    // Transverse should be negative of (axial * Poisson)
    const expectedTransverse = result.axialStrain * (-0.3);
    expect(result.transverseStrain).toBeCloseTo(expectedTransverse, 5);
  });

  it('should throw error with invalid applied load', () => {
    const input: SquareColumnInput = {
      appliedLoad: -1000, // Invalid
      width: 2.0,
      depth: 2.0,
      modulus: 30e6,
      poissonRatio: 0.3,
      gageFactor: 2.0,
      usUnits: true,
    };
    
    expect(() => calculateSquareColumnStrain(input)).toThrow('non-negative');
  });

  it('should throw error with invalid dimensions', () => {
    const input: SquareColumnInput = {
      appliedLoad: 1000,
      width: 0, // Invalid
      depth: 2.0,
      modulus: 30e6,
      poissonRatio: 0.3,
      gageFactor: 2.0,
      usUnits: true,
    };
    
    expect(() => calculateSquareColumnStrain(input)).toThrow('positive');
  });

  it('should throw error with invalid Poisson ratio', () => {
    const input: SquareColumnInput = {
      appliedLoad: 1000,
      width: 2.0,
      depth: 2.0,
      modulus: 30e6,
      poissonRatio: 0.6, // Invalid (>0.5)
      gageFactor: 2.0,
      usUnits: true,
    };
    
    expect(() => calculateSquareColumnStrain(input)).toThrow('Poisson');
  });

  it('should scale strain with applied load', () => {
    const input1: SquareColumnInput = {
      appliedLoad: 5000,
      width: 2.0,
      depth: 2.0,
      modulus: 30e6,
      poissonRatio: 0.3,
      gageFactor: 2.0,
      usUnits: true,
    };
    
    const input2: SquareColumnInput = {
      appliedLoad: 10000,
      width: 2.0,
      depth: 2.0,
      modulus: 30e6,
      poissonRatio: 0.3,
      gageFactor: 2.0,
      usUnits: true,
    };
    
    const result1 = calculateSquareColumnStrain(input1);
    const result2 = calculateSquareColumnStrain(input2);
    
    // Doubling load should double strain
    expect(result2.axialStrain / result1.axialStrain).toBeCloseTo(2, 5);
  });

  it('should handle high load conditions', () => {
    const input: SquareColumnInput = {
      appliedLoad: 100000, // Large load
      width: 2.0,
      depth: 2.0,
      modulus: 30e6,
      poissonRatio: 0.3,
      gageFactor: 2.0,
      usUnits: true,
    };
    
    const result = calculateSquareColumnStrain(input);
    expect(Math.abs(result.axialStrain)).toBeGreaterThan(500); // Large strain
    expect(result.isValid).toBe(true);
  });

  it('should handle rectangular (non-square) geometry', () => {
    const input: SquareColumnInput = {
      appliedLoad: 10000,
      width: 1.0, // Different from depth
      depth: 4.0,
      modulus: 30e6,
      poissonRatio: 0.3,
      gageFactor: 2.0,
      usUnits: true,
    };
    
    const result = calculateSquareColumnStrain(input);
    // Area = 1 * 4 = 4
    // Stress = 10000 / 4 = 2500
    // Axial = -2500 / 30e6 * 1e6 = -83.33
    expect(result.axialStrain).toBeCloseTo(-83.33, 1);
  });
});
