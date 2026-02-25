import { describe, it, expect } from 'vitest';
import { calculateSqTorque, getShearModulus, getMaxShearStress, type SqTorqueInput } from './sqtorque';

describe('sqtorque module', () => {
  describe('Valid calculations - basic operation', () => {
    it('should calculate strains with typical US torque parameters', () => {
      const input: SqTorqueInput = {
        appliedTorque: 10000,  // in⋅lb
        width: 2.0,            // inches
        poisson: 0.3,
        modulus: 30000000,     // PSI
        gageLength: 0.5,       // inches
        gageFactor: 2.1,
        usUnits: true,
      };
      const result = calculateSqTorque(input);
      expect(result.success).toBe(true);
      expect(result.minStrain).toBeGreaterThan(0);
      expect(result.maxStrain).toBeGreaterThan(result.minStrain!);
      expect(result.avgStrain).toBeGreaterThan(0);
      expect(result.gradient).toBeGreaterThan(0);
      expect(result.fullSpan).toBeGreaterThan(0);
    });

    it('should calculate strains with small torque values', () => {
      const input: SqTorqueInput = {
        appliedTorque: 100,    // Small torque
        width: 1.0,
        poisson: 0.25,
        modulus: 28000000,     // PSI
        gageLength: 0.25,
        gageFactor: 2.0,
        usUnits: true,
      };
      const result = calculateSqTorque(input);
      expect(result.success).toBe(true);
      expect(result.minStrain!).toBeGreaterThanOrEqual(0);
      expect(result.maxStrain!).toBeGreaterThan(0);
    });

    it('should calculate strains with high modulus material', () => {
      const input: SqTorqueInput = {
        appliedTorque: 20000,
        width: 2.5,
        poisson: 0.32,
        modulus: 45000000,     // High modulus (PSI)
        gageLength: 0.75,
        gageFactor: 2.5,
        usUnits: true,
      };
      const result = calculateSqTorque(input);
      expect(result.success).toBe(true);
      expect(result.maxStrain!).toBeLessThan(50000); // High modulus reduces strain
    });
  });

  describe('Input validation - applied torque', () => {
    it('should reject negative applied torque', () => {
      const input: SqTorqueInput = {
        appliedTorque: -100,
        width: 2.0,
        poisson: 0.3,
        modulus: 30000000,
        gageLength: 0.5,
        gageFactor: 2.1,
        usUnits: true,
      };
      const result = calculateSqTorque(input);
      expect(result.success).toBe(false);
      expect(result.error).toContain('Applied torque');
    });

    it('should reject torque exceeding maximum (US)', () => {
      const input: SqTorqueInput = {
        appliedTorque: 600000,  // Exceeds MAXAPPLIEDTORQUE_US
        width: 2.0,
        poisson: 0.3,
        modulus: 30000000,
        gageLength: 0.5,
        gageFactor: 2.1,
        usUnits: true,
      };
      const result = calculateSqTorque(input);
      expect(result.success).toBe(false);
      expect(result.error).toContain('Applied torque');
    });
  });

  describe('Input validation - width', () => {
    it('should reject width below minimum (US)', () => {
      const input: SqTorqueInput = {
        appliedTorque: 10000,
        width: 0.1,  // Below MINWIDTH_US = 0.2
        poisson: 0.3,
        modulus: 30000000,
        gageLength: 0.5,
        gageFactor: 2.1,
        usUnits: true,
      };
      const result = calculateSqTorque(input);
      expect(result.success).toBe(false);
      expect(result.error).toContain('Width');
    });

    it('should reject width exceeding maximum (US)', () => {
      const input: SqTorqueInput = {
        appliedTorque: 10000,
        width: 25.0,  // Exceeds MAXWIDTH_US = 20.0
        poisson: 0.3,
        modulus: 30000000,
        gageLength: 0.5,
        gageFactor: 2.1,
        usUnits: true,
      };
      const result = calculateSqTorque(input);
      expect(result.success).toBe(false);
      expect(result.error).toContain('Width');
    });
  });

  describe('Input validation - Poisson ratio', () => {
    it('should reject Poisson ratio below 0.1', () => {
      const input: SqTorqueInput = {
        appliedTorque: 10000,
        width: 2.0,
        poisson: 0.05,
        modulus: 30000000,
        gageLength: 0.5,
        gageFactor: 2.1,
        usUnits: true,
      };
      const result = calculateSqTorque(input);
      expect(result.success).toBe(false);
      expect(result.error).toContain("Poisson's ratio");
    });

    it('should reject Poisson ratio above 0.4', () => {
      const input: SqTorqueInput = {
        appliedTorque: 10000,
        width: 2.0,
        poisson: 0.5,
        modulus: 30000000,
        gageLength: 0.5,
        gageFactor: 2.1,
        usUnits: true,
      };
      const result = calculateSqTorque(input);
      expect(result.success).toBe(false);
      expect(result.error).toContain("Poisson's ratio");
    });

    it('should accept valid Poisson ratio boundaries', () => {
      const input: SqTorqueInput = {
        appliedTorque: 10000,
        width: 2.0,
        poisson: 0.1,  // Minimum boundary
        modulus: 30000000,
        gageLength: 0.5,
        gageFactor: 2.1,
        usUnits: true,
      };
      const result = calculateSqTorque(input);
      expect(result.success).toBe(true);
    });
  });

  describe('Input validation - modulus', () => {
    it('should reject modulus below minimum (US)', () => {
      const input: SqTorqueInput = {
        appliedTorque: 10000,
        width: 2.0,
        poisson: 0.3,
        modulus: 4000000,  // Below MINMODULUS_US
        gageLength: 0.5,
        gageFactor: 2.1,
        usUnits: true,
      };
      const result = calculateSqTorque(input);
      expect(result.success).toBe(false);
      expect(result.error).toContain('Modulus');
    });

    it('should reject modulus exceeding maximum (US)', () => {
      const input: SqTorqueInput = {
        appliedTorque: 10000,
        width: 2.0,
        poisson: 0.3,
        modulus: 60000000,  // Exceeds MAXMODULUS_US
        gageLength: 0.5,
        gageFactor: 2.1,
        usUnits: true,
      };
      const result = calculateSqTorque(input);
      expect(result.success).toBe(false);
      expect(result.error).toContain('Modulus');
    });
  });

  describe('Input validation - gage length', () => {
    it('should reject gage length below minimum (US)', () => {
      const input: SqTorqueInput = {
        appliedTorque: 10000,
        width: 2.0,
        poisson: 0.3,
        modulus: 30000000,
        gageLength: 0.005,  // Below MINGAGELENGTH_US
        gageFactor: 2.1,
        usUnits: true,
      };
      const result = calculateSqTorque(input);
      expect(result.success).toBe(false);
      expect(result.error).toContain('Gage length');
    });

    it('should reject gage length exceeding maximum (US)', () => {
      const input: SqTorqueInput = {
        appliedTorque: 10000,
        width: 2.0,
        poisson: 0.3,
        modulus: 30000000,
        gageLength: 1.5,  // Exceeds MAXGAGELENGTH_US
        gageFactor: 2.1,
        usUnits: true,
      };
      const result = calculateSqTorque(input);
      expect(result.success).toBe(false);
      expect(result.error).toContain('Gage length');
    });
  });

  describe('Input validation - gage factor', () => {
    it('should reject gage factor below 1.0', () => {
      const input: SqTorqueInput = {
        appliedTorque: 10000,
        width: 2.0,
        poisson: 0.3,
        modulus: 30000000,
        gageLength: 0.5,
        gageFactor: 0.5,  // Below MINGAGEFACTOR_US
        usUnits: true,
      };
      const result = calculateSqTorque(input);
      expect(result.success).toBe(false);
      expect(result.error).toContain('Gage factor');
    });

    it('should reject gage factor above 5.0', () => {
      const input: SqTorqueInput = {
        appliedTorque: 10000,
        width: 2.0,
        poisson: 0.3,
        modulus: 30000000,
        gageLength: 0.5,
        gageFactor: 6.0,  // Exceeds MAXGAGEFACTOR_US
        usUnits: true,
      };
      const result = calculateSqTorque(input);
      expect(result.success).toBe(false);
      expect(result.error).toContain('Gage factor');
    });
  });

  describe('Complex material parameters', () => {
    it('should reject SI torque exceeding maximum', () => {
      const input: SqTorqueInput = {
        appliedTorque: 100000,  // 100000 N⋅mm (exceeds ~56490 max)
        width: 50.8,
        poisson: 0.3,
        modulus: 207,
        gageLength: 12.7,
        gageFactor: 2.1,
        usUnits: false,
      };
      const result = calculateSqTorque(input);
      expect(result.success).toBe(false);
      expect(result.error).toContain('Applied torque');
    });

    it('should accept boundary Poisson ratio values', () => {
      const input: SqTorqueInput = {
        appliedTorque: 10000,
        width: 2.0,
        poisson: 0.4,  // Maximum Poisson ratio
        modulus: 30000000,
        gageLength: 0.5,
        gageFactor: 2.1,
        usUnits: true,
      };
      const result = calculateSqTorque(input);
      expect(result.success).toBe(true);
    });
  });

  describe('Result structure validation', () => {
    it('should return all result fields on success', () => {
      const input: SqTorqueInput = {
        appliedTorque: 10000,
        width: 2.0,
        poisson: 0.3,
        modulus: 30000000,
        gageLength: 0.5,
        gageFactor: 2.1,
        usUnits: true,
      };
      const result = calculateSqTorque(input);
      expect(result.success).toBe(true);
      expect(result).toHaveProperty('minStrain');
      expect(result).toHaveProperty('maxStrain');
      expect(result).toHaveProperty('avgStrain');
      expect(result).toHaveProperty('gradient');
      expect(result).toHaveProperty('fullSpan');
      expect(typeof result.minStrain).toBe('number');
      expect(typeof result.maxStrain).toBe('number');
      expect(typeof result.avgStrain).toBe('number');
      expect(typeof result.gradient).toBe('number');
      expect(typeof result.fullSpan).toBe('number');
    });

    it('should return error field on failure', () => {
      const input: SqTorqueInput = {
        appliedTorque: -100,  // Invalid
        width: 2.0,
        poisson: 0.3,
        modulus: 30000000,
        gageLength: 0.5,
        gageFactor: 2.1,
        usUnits: true,
      };
      const result = calculateSqTorque(input);
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      expect(typeof result.error).toBe('string');
      expect(result.minStrain).toBeUndefined();
      expect(result.maxStrain).toBeUndefined();
    });
  });

  describe('Strain relationships', () => {
    it('average strain should be mean of min and max', () => {
      const input: SqTorqueInput = {
        appliedTorque: 10000,
        width: 2.0,
        poisson: 0.3,
        modulus: 30000000,
        gageLength: 0.5,
        gageFactor: 2.1,
        usUnits: true,
      };
      const result = calculateSqTorque(input);
      expect(result.success).toBe(true);
      const calculatedAvg = (result.minStrain! + result.maxStrain!) / 2;
      expect(result.avgStrain).toBeCloseTo(calculatedAvg, 1);
    });

    it('gradient should be percentage change from max to min', () => {
      const input: SqTorqueInput = {
        appliedTorque: 10000,
        width: 2.0,
        poisson: 0.3,
        modulus: 30000000,
        gageLength: 0.5,
        gageFactor: 2.1,
        usUnits: true,
      };
      const result = calculateSqTorque(input);
      expect(result.success).toBe(true);
      if (result.maxStrain! > 0) {
        const calculatedGradient = ((result.maxStrain! - result.minStrain!) / result.maxStrain!) * 100;
        expect(result.gradient).toBeCloseTo(calculatedGradient, 1);
      }
    });

    it('full span should be proportional to gage factor and average strain', () => {
      const input: SqTorqueInput = {
        appliedTorque: 10000,
        width: 2.0,
        poisson: 0.3,
        modulus: 30000000,
        gageLength: 0.5,
        gageFactor: 2.1,
        usUnits: true,
      };
      const result = calculateSqTorque(input);
      expect(result.success).toBe(true);
      const expectedSpan = (input.gageFactor * result.avgStrain!) * 1e-3;
      expect(result.fullSpan).toBeCloseTo(expectedSpan, 5);
    });
  });

  describe('Helper functions', () => {
    it('getShearModulus should calculate correctly', () => {
      const youngs = 30000000;
      const poisson = 0.3;
      const shear = getShearModulus(youngs, poisson);
      const expected = youngs / (2 * (1 + poisson));
      expect(shear).toBeCloseTo(expected, 5);
    });

    it('getMaxShearStress should calculate correctly', () => {
      const torque = 10000;
      const width = 2.0;
      const stress = getMaxShearStress(torque, width);
      const expected = torque / (0.22 * Math.pow(width, 3));
      expect(stress).toBeCloseTo(expected, 5);
    });
  });

  describe('Edge cases and boundaries', () => {
    it('should handle minimum gage length', () => {
      const input: SqTorqueInput = {
        appliedTorque: 10000,
        width: 2.0,
        poisson: 0.3,
        modulus: 30000000,
        gageLength: 0.008,  // Minimum allowed
        gageFactor: 2.1,
        usUnits: true,
      };
      const result = calculateSqTorque(input);
      expect(result.success).toBe(true);
    });

    it('should handle maximum width', () => {
      const input: SqTorqueInput = {
        appliedTorque: 10000,
        width: 20.0,  // Maximum allowed
        poisson: 0.3,
        modulus: 30000000,
        gageLength: 0.5,
        gageFactor: 2.1,
        usUnits: true,
      };
      const result = calculateSqTorque(input);
      expect(result.success).toBe(true);
    });
  });
});
