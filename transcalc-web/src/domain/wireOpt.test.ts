import { describe, it, expect } from 'vitest';
import { calculateWireOpt, WireOptInput, getWireTypes, getWireInfo } from './wireOpt';

describe('WireOpt', () => {
  describe('Calculate resistance from length', () => {
    it('should calculate resistance for copper wire US units', () => {
      const input: WireOptInput = {
        wireType: 'copper',
        units: 'us',
        solveFor: 'resistance',
        value: 10, // 10 inches
      };

      const result = calculateWireOpt(input);
      expect(result.success).toBe(true);
      expect(result.resistance).toBeGreaterThan(0);
    });

    it('should calculate resistance for copper wire SI units', () => {
      const input: WireOptInput = {
        wireType: 'copper',
        units: 'si',
        solveFor: 'resistance',
        value: 254, // ~10 inches in mm
      };

      const result = calculateWireOpt(input);
      expect(result.success).toBe(true);
      expect(result.resistance).toBeGreaterThan(0);
    });

    it('should calculate resistance for constantan wire', () => {
      const input: WireOptInput = {
        wireType: 'constantan',
        units: 'us',
        solveFor: 'resistance',
        value: 50,
      };

      const result = calculateWireOpt(input);
      expect(result.success).toBe(true);
      expect(result.resistance).toBeGreaterThan(0);
    });

    it('should calculate resistance for manganin wire', () => {
      const input: WireOptInput = {
        wireType: 'manganin',
        units: 'si',
        solveFor: 'resistance',
        value: 100,
      };

      const result = calculateWireOpt(input);
      expect(result.success).toBe(true);
      expect(result.resistance).toBeGreaterThan(0);
    });

    it('should calculate resistance for nickel wire', () => {
      const input: WireOptInput = {
        wireType: 'nickel',
        units: 'us',
        solveFor: 'resistance',
        value: 25,
      };

      const result = calculateWireOpt(input);
      expect(result.success).toBe(true);
      expect(result.resistance).toBeGreaterThan(0);
    });

    it('should calculate resistance for balco wire', () => {
      const input: WireOptInput = {
        wireType: 'balco',
        units: 'si',
        solveFor: 'resistance',
        value: 150,
      };

      const result = calculateWireOpt(input);
      expect(result.success).toBe(true);
      expect(result.resistance).toBeGreaterThan(0);
    });

    it('should calculate resistance for advance wire', () => {
      const input: WireOptInput = {
        wireType: 'advance',
        units: 'us',
        solveFor: 'resistance',
        value: 5,
      };

      const result = calculateWireOpt(input);
      expect(result.success).toBe(true);
      expect(result.resistance).toBeGreaterThan(0);
    });

    it('should work with minimum length US units', () => {
      const input: WireOptInput = {
        wireType: 'copper',
        units: 'us',
        solveFor: 'resistance',
        value: 0.01,
      };

      const result = calculateWireOpt(input);
      expect(result.success).toBe(true);
      expect(result.resistance).toBeGreaterThan(0);
    });

    it('should work with maximum length US units', () => {
      const input: WireOptInput = {
        wireType: 'copper',
        units: 'us',
        solveFor: 'resistance',
        value: 100.0,
      };

      const result = calculateWireOpt(input);
      expect(result.success).toBe(true);
      expect(result.resistance).toBeGreaterThan(0);
    });

    it('should work with minimum length SI units', () => {
      const input: WireOptInput = {
        wireType: 'copper',
        units: 'si',
        solveFor: 'resistance',
        value: 0.254,
      };

      const result = calculateWireOpt(input);
      expect(result.success).toBe(true);
      expect(result.resistance).toBeGreaterThan(0);
    });

    it('should work with maximum length SI units', () => {
      const input: WireOptInput = {
        wireType: 'copper',
        units: 'si',
        solveFor: 'resistance',
        value: 2540.0,
      };

      const result = calculateWireOpt(input);
      expect(result.success).toBe(true);
      expect(result.resistance).toBeGreaterThan(0);
    });
  });

  describe('Calculate length from resistance', () => {
    it('should calculate length for copper wire US units', () => {
      const input: WireOptInput = {
        wireType: 'copper',
        units: 'us',
        solveFor: 'length',
        value: 50, // 50 Ohms
      };

      const result = calculateWireOpt(input);
      expect(result.success).toBe(true);
      expect(result.length).toBeGreaterThan(0);
    });

    it('should calculate length for copper wire SI units', () => {
      const input: WireOptInput = {
        wireType: 'copper',
        units: 'si',
        solveFor: 'length',
        value: 50,
      };

      const result = calculateWireOpt(input);
      expect(result.success).toBe(true);
      expect(result.length).toBeGreaterThan(0);
    });

    it('should calculate length for constantan wire', () => {
      const input: WireOptInput = {
        wireType: 'constantan',
        units: 'us',
        solveFor: 'length',
        value: 100,
      };

      const result = calculateWireOpt(input);
      expect(result.success).toBe(true);
      expect(result.length).toBeGreaterThan(0);
    });

    it('should calculate length for manganin wire', () => {
      const input: WireOptInput = {
        wireType: 'manganin',
        units: 'si',
        solveFor: 'length',
        value: 75,
      };

      const result = calculateWireOpt(input);
      expect(result.success).toBe(true);
      expect(result.length).toBeGreaterThan(0);
    });

    it('should work with minimum resistance', () => {
      const input: WireOptInput = {
        wireType: 'copper',
        units: 'us',
        solveFor: 'length',
        value: 0.01,
      };

      const result = calculateWireOpt(input);
      expect(result.success).toBe(true);
      expect(result.length).toBeGreaterThan(0);
    });

    it('should work with maximum resistance', () => {
      const input: WireOptInput = {
        wireType: 'copper',
        units: 'us',
        solveFor: 'length',
        value: 1000,
      };

      const result = calculateWireOpt(input);
      expect(result.success).toBe(true);
      expect(result.length).toBeGreaterThan(0);
    });

    it('should work with mid-range resistance', () => {
      const input: WireOptInput = {
        wireType: 'copper',
        units: 'si',
        solveFor: 'length',
        value: 500,
      };

      const result = calculateWireOpt(input);
      expect(result.success).toBe(true);
      expect(result.length).toBeGreaterThan(0);
    });
  });

  describe('Validation - wire types', () => {
    it('should reject invalid wire type', () => {
      const input = {
        wireType: 'invalid_wire' as any,
        units: 'us' as const,
        solveFor: 'resistance' as const,
        value: 50,
      };

      const result = calculateWireOpt(input);
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });
  });

  describe('Validation - units', () => {
    it('should reject invalid units', () => {
      const input = {
        wireType: 'copper' as const,
        units: 'invalid' as any,
        solveFor: 'resistance' as const,
        value: 50,
      };

      const result = calculateWireOpt(input);
      expect(result.success).toBe(false);
    });
  });

  describe('Validation - solveFor', () => {
    it('should reject invalid solveFor value', () => {
      const input = {
        wireType: 'copper' as const,
        units: 'us' as const,
        solveFor: 'invalid' as any,
        value: 50,
      };

      const result = calculateWireOpt(input);
      expect(result.success).toBe(false);
    });
  });

  describe('Validation - length ranges', () => {
    it('should reject length below minimum US units', () => {
      const input: WireOptInput = {
        wireType: 'copper',
        units: 'us',
        solveFor: 'resistance',
        value: 0.009,
      };

      const result = calculateWireOpt(input);
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('should reject length above maximum US units', () => {
      const input: WireOptInput = {
        wireType: 'copper',
        units: 'us',
        solveFor: 'resistance',
        value: 100.1,
      };

      const result = calculateWireOpt(input);
      expect(result.success).toBe(false);
    });

    it('should reject length below minimum SI units', () => {
      const input: WireOptInput = {
        wireType: 'copper',
        units: 'si',
        solveFor: 'resistance',
        value: 0.25,
      };

      const result = calculateWireOpt(input);
      expect(result.success).toBe(false);
    });

    it('should reject length above maximum SI units', () => {
      const input: WireOptInput = {
        wireType: 'copper',
        units: 'si',
        solveFor: 'resistance',
        value: 2541,
      };

      const result = calculateWireOpt(input);
      expect(result.success).toBe(false);
    });
  });

  describe('Validation - resistance ranges', () => {
    it('should reject resistance below minimum', () => {
      const input: WireOptInput = {
        wireType: 'copper',
        units: 'us',
        solveFor: 'length',
        value: 0.009,
      };

      const result = calculateWireOpt(input);
      expect(result.success).toBe(false);
    });

    it('should reject resistance above maximum', () => {
      const input: WireOptInput = {
        wireType: 'copper',
        units: 'us',
        solveFor: 'length',
        value: 1001,
      };

      const result = calculateWireOpt(input);
      expect(result.success).toBe(false);
    });
  });

  describe('Helper functions', () => {
    it('should return available wire types', () => {
      const types = getWireTypes();
      expect(Array.isArray(types)).toBe(true);
      expect(types.length).toBeGreaterThan(0);
      expect(types).toContain('copper');
      expect(types).toContain('constantan');
      expect(types).toContain('nickel');
    });

    it('should get wire info for known type', () => {
      const info = getWireInfo('copper');
      expect(info).toBeDefined();
      expect(info?.name).toBe('Copper');
      expect(info?.resistivity).toBeGreaterThan(0);
      expect(info?.tcr).toBeGreaterThan(0);
    });

    it('should return undefined for unknown wire type', () => {
      const info = getWireInfo('unknown' as any);
      expect(info).toBeUndefined();
    });

    it('should have all expected wire types with valid properties', () => {
      const types = getWireTypes();
      types.forEach((wireType) => {
        const info = getWireInfo(wireType);
        expect(info).toBeDefined();
        expect(info?.name).toBeDefined();
        expect(info?.resistivity).toBeGreaterThan(0);
        expect(info?.tcr).toBeGreaterThan(0);
      });
    });
  });

  describe('Result structure', () => {
    it('should have success property', () => {
      const input: WireOptInput = {
        wireType: 'copper',
        units: 'us',
        solveFor: 'resistance',
        value: 50,
      };

      const result = calculateWireOpt(input);
      expect(result).toHaveProperty('success');
      expect(typeof result.success).toBe('boolean');
    });

    it('should return resistance when solving for resistance', () => {
      const input: WireOptInput = {
        wireType: 'copper',
        units: 'us',
        solveFor: 'resistance',
        value: 50,
      };

      const result = calculateWireOpt(input);
      expect(result.success).toBe(true);
      expect(result).toHaveProperty('resistance');
      expect(typeof result.resistance).toBe('number');
    });

    it('should return length when solving for length', () => {
      const input: WireOptInput = {
        wireType: 'copper',
        units: 'us',
        solveFor: 'length',
        value: 50,
      };

      const result = calculateWireOpt(input);
      expect(result.success).toBe(true);
      expect(result).toHaveProperty('length');
      expect(typeof result.length).toBe('number');
    });

    it('should have error property on failure', () => {
      const input: WireOptInput = {
        wireType: 'copper',
        units: 'us',
        solveFor: 'resistance',
        value: 0.009,
      };

      const result = calculateWireOpt(input);
      expect(result.success).toBe(false);
      expect(result).toHaveProperty('error');
    });
  });
});
