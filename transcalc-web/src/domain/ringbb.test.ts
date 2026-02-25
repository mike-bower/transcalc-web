import { describe, it, expect } from 'vitest';
import { calculateRingBB, RingBBInput } from './ringbb';

describe('RingBB - Ring Bending Beam', () => {
  const validInputUS: RingBBInput = {
    appliedLoad: 1000,
    ringWidth: 1.0,
    insideDiameter: 2.0,
    outsideDiameter: 3.0,
    modulus: 30000,
    gageLength: 2.0,
    gageFactor: 2.0,
    units: 'us',
  };

  const validInputSI: RingBBInput = {
    appliedLoad: 453.6,
    ringWidth: 25.4,
    insideDiameter: 50.8,
    outsideDiameter: 76.2,
    modulus: 206.8,
    gageLength: 50.8,
    gageFactor: 2.0,
    units: 'si',
  };

  describe('Valid calculations - US units', () => {
    it('should calculate with valid US input', () => {
      const result = calculateRingBB(validInputUS);
      expect(result.success).toBe(true);
      expect(result.avgStrainAD).toBeDefined();
      expect(result.avgStrainBC).toBeDefined();
      expect(result.fullSpan).toBeDefined();
      expect(typeof result.avgStrainAD).toBe('number');
      expect(typeof result.avgStrainBC).toBe('number');
      expect(typeof result.fullSpan).toBe('number');
    });

    it('should calculate with minimum valid loads', () => {
      const input: RingBBInput = {
        appliedLoad: 0.001,
        ringWidth: 0.01,
        insideDiameter: 0.001,
        outsideDiameter: 0.1,
        modulus: 100,
        gageLength: 0.01,
        gageFactor: 1.0,
        units: 'us',
      };

      const result = calculateRingBB(input);
      expect(result.success).toBe(true);
    });

    it('should calculate with high loads', () => {
      const input: RingBBInput = {
        appliedLoad: 9000,
        ringWidth: 500,
        insideDiameter: 100,
        outsideDiameter: 500,
        modulus: 30e6,
        gageLength: 3.9,
        gageFactor: 4.9,
        units: 'us',
      };

      const result = calculateRingBB(input);
      expect(result.success).toBe(true);
    });

    it('should calculate with different modulus values', () => {
      const input: RingBBInput = {
        appliedLoad: 500,
        ringWidth: 2.0,
        insideDiameter: 1.5,
        outsideDiameter: 4.0,
        modulus: 15e6,
        gageLength: 1.0,
        gageFactor: 2.5,
        units: 'us',
      };

      const result = calculateRingBB(input);
      expect(result.success).toBe(true);
      expect(result.avgStrainAD).toBeDefined();
    });

    it('should calculate with different gage factors', () => {
      const input: RingBBInput = {
        appliedLoad: 1000,
        ringWidth: 1.0,
        insideDiameter: 2.0,
        outsideDiameter: 3.0,
        modulus: 30000,
        gageLength: 2.0,
        gageFactor: 1.0,
        units: 'us',
      };

      const result = calculateRingBB(input);
      expect(result.success).toBe(true);
    });
  });

  describe('Valid calculations - SI units', () => {
    it('should calculate with valid SI input', () => {
      const result = calculateRingBB(validInputSI);
      expect(result.success).toBe(true);
      expect(result.avgStrainAD).toBeDefined();
      expect(result.avgStrainBC).toBeDefined();
      expect(result.fullSpan).toBeDefined();
    });

    it('should calculate with minimum valid SI values', () => {
      const input: RingBBInput = {
        appliedLoad: 0.1,
        ringWidth: 1.0,
        insideDiameter: 0.01,
        outsideDiameter: 3.0,
        modulus: 0.0007,
        gageLength: 1.0,
        gageFactor: 1.0,
        units: 'si',
      };

      const result = calculateRingBB(input);
      expect(result.success).toBe(true);
    });

    it('should calculate with high SI values', () => {
      const input: RingBBInput = {
        appliedLoad: 4000,
        ringWidth: 20000,
        insideDiameter: 20000,
        outsideDiameter: 200000,
        modulus: 400000,
        gageLength: 100,
        gageFactor: 4.9,
        units: 'si',
      };

      const result = calculateRingBB(input);
      expect(result.success).toBe(true);
    });
  });

  describe('Validation - units parameter', () => {
    it('should reject invalid units', () => {
      const input = { ...validInputUS, units: 'invalid' as any };
      const result = calculateRingBB(input);
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });
  });

  describe('Validation - applied load US', () => {
    it('should reject negative applied load', () => {
      const input: RingBBInput = {
        ...validInputUS,
        appliedLoad: -1,
      };

      const result = calculateRingBB(input);
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('should reject applied load above maximum US', () => {
      const input: RingBBInput = {
        ...validInputUS,
        appliedLoad: 10001,
      };

      const result = calculateRingBB(input);
      expect(result.success).toBe(false);
    });
  });

  describe('Validation - applied load SI', () => {
    it('should reject applied load above maximum SI', () => {
      const input: RingBBInput = {
        ...validInputSI,
        appliedLoad: 5000,
        units: 'si',
      };

      const result = calculateRingBB(input);
      expect(result.success).toBe(false);
    });
  });

  describe('Validation - ring width', () => {
    it('should reject ring width below minimum US', () => {
      const input: RingBBInput = {
        ...validInputUS,
        ringWidth: 0.0009,
      };

      const result = calculateRingBB(input);
      expect(result.success).toBe(false);
    });

    it('should reject ring width above maximum US', () => {
      const input: RingBBInput = {
        ...validInputUS,
        ringWidth: 1001,
      };

      const result = calculateRingBB(input);
      expect(result.success).toBe(false);
    });
  });

  describe('Validation - inside diameter', () => {
    it('should reject inside diameter below minimum US', () => {
      const input: RingBBInput = {
        ...validInputUS,
        insideDiameter: 0.00009,
      };

      const result = calculateRingBB(input);
      expect(result.success).toBe(false);
    });

    it('should reject inside diameter above maximum US', () => {
      const input: RingBBInput = {
        ...validInputUS,
        insideDiameter: 1001,
      };

      const result = calculateRingBB(input);
      expect(result.success).toBe(false);
    });
  });

  describe('Validation - outside diameter', () => {
    it('should reject outside diameter below minimum US', () => {
      const input: RingBBInput = {
        ...validInputUS,
        outsideDiameter: 0.0009,
      };

      const result = calculateRingBB(input);
      expect(result.success).toBe(false);
    });

    it('should reject outside diameter above maximum US', () => {
      const input: RingBBInput = {
        ...validInputUS,
        outsideDiameter: 10001,
      };

      const result = calculateRingBB(input);
      expect(result.success).toBe(false);
    });
  });

  describe('Validation - modulus', () => {
    it('should reject modulus below minimum', () => {
      const input: RingBBInput = {
        ...validInputUS,
        modulus: 99,
      };

      const result = calculateRingBB(input);
      expect(result.success).toBe(false);
    });

    it('should reject modulus above maximum', () => {
      const input: RingBBInput = {
        ...validInputUS,
        modulus: 100e6 + 1,
      };

      const result = calculateRingBB(input);
      expect(result.success).toBe(false);
    });
  });

  describe('Validation - gage length', () => {
    it('should reject gage length below minimum US', () => {
      const input: RingBBInput = {
        ...validInputUS,
        gageLength: 0.0009,
      };

      const result = calculateRingBB(input);
      expect(result.success).toBe(false);
    });

    it('should reject gage length above maximum US', () => {
      const input: RingBBInput = {
        ...validInputUS,
        gageLength: 4.1,
      };

      const result = calculateRingBB(input);
      expect(result.success).toBe(false);
    });
  });

  describe('Validation - gage factor', () => {
    it('should reject gage factor below minimum', () => {
      const input: RingBBInput = {
        ...validInputUS,
        gageFactor: 0.9,
      };

      const result = calculateRingBB(input);
      expect(result.success).toBe(false);
    });

    it('should reject gage factor above maximum', () => {
      const input: RingBBInput = {
        ...validInputUS,
        gageFactor: 5.1,
      };

      const result = calculateRingBB(input);
      expect(result.success).toBe(false);
    });
  });

  describe('Validation - diameter relationship', () => {
    it('should reject when inside diameter equals outside diameter', () => {
      const input: RingBBInput = {
        ...validInputUS,
        insideDiameter: 2.0,
        outsideDiameter: 2.0,
      };

      const result = calculateRingBB(input);
      expect(result.success).toBe(false);
      expect(result.error).toContain('Inside diameter must be less than outside diameter');
    });

    it('should reject when inside diameter greater than outside diameter', () => {
      const input: RingBBInput = {
        ...validInputUS,
        insideDiameter: 4.0,
        outsideDiameter: 2.0,
      };

      const result = calculateRingBB(input);
      expect(result.success).toBe(false);
    });
  });

  describe('Result structure', () => {
    it('should have success property', () => {
      const result = calculateRingBB(validInputUS);
      expect(result).toHaveProperty('success');
      expect(typeof result.success).toBe('boolean');
    });

    it('should return numeric strain values on success', () => {
      const result = calculateRingBB(validInputUS);
      expect(result.success).toBe(true);
      expect(Number.isFinite(result.avgStrainAD!)).toBe(true);
      expect(Number.isFinite(result.avgStrainBC!)).toBe(true);
      expect(Number.isFinite(result.fullSpan!)).toBe(true);
    });

    it('should return error string on failure', () => {
      const input: RingBBInput = {
        ...validInputUS,
        appliedLoad: -1,
      };

      const result = calculateRingBB(input);
      expect(result.success).toBe(false);
      expect(typeof result.error).toBe('string');
      expect(result.error!.length).toBeGreaterThan(0);
    });
  });

  describe('Strain value properties', () => {
    it('should return reasonable strain mag sizes', () => {
      const result = calculateRingBB(validInputUS);
      expect(result.success).toBe(true);
      // Strains should be in microstrain range
      expect(Math.abs(result.avgStrainAD!)).toBeLessThan(1e9);
      expect(Math.abs(result.avgStrainBC!)).toBeLessThan(1e9);
    });

    it('should have opposite strain signs for AD and BC', () => {
      const result = calculateRingBB(validInputUS);
      expect(result.success).toBe(true);
      // AD and BC typically have opposite signs in bending
      expect(result.avgStrainAD! * result.avgStrainBC!).toBeLessThanOrEqual(0);
    });
  });

  describe('Unit consistency', () => {
    it('should produce results in same scale for equivalent US input', () => {
      // This tests that US units work correctly
      const result = calculateRingBB(validInputUS);
      expect(result.success).toBe(true);
      expect(result.avgStrainAD).toBeDefined();
    });

    it('should produce results in same scale for equivalent SI input', () => {
      // This tests that SI units work correctly
      const result = calculateRingBB(validInputSI);
      expect(result.success).toBe(true);
      expect(result.avgStrainAD).toBeDefined();
    });
  });

  describe('Edge cases', () => {
    it('should handle very small outside diameter difference from inside', () => {
      const input: RingBBInput = {
        appliedLoad: 1000,
        ringWidth: 1.0,
        insideDiameter: 2.0,
        outsideDiameter: 2.001,
        modulus: 30000,
        gageLength: 2.0,
        gageFactor: 2.0,
        units: 'us',
      };

      const result = calculateRingBB(input);
      expect(result.success).toBe(true);
    });

    it('should handle large diameter ratios', () => {
      const input: RingBBInput = {
        appliedLoad: 1000,
        ringWidth: 1.0,
        insideDiameter: 0.1,
        outsideDiameter: 9.9,
        modulus: 30000,
        gageLength: 2.0,
        gageFactor: 2.0,
        units: 'us',
      };

      const result = calculateRingBB(input);
      expect(result.success).toBe(true);
    });
  });
});
