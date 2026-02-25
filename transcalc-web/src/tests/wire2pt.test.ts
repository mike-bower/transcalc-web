/**
 * Tests for Wire 2-Point Span Calculation Module
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  calculateWire2Pt,
  getWireTypes,
  getAvailableAWG,
  getWireResistivity,
  getWireDiameter,
  Wire2PtInput,
} from '../domain/wire2pt';

describe('Wire 2-Point Span Calculation', () => {
  describe('Basic span calculations', () => {
    it('should calculate span for copper wire at standard conditions', () => {
      const input: Wire2PtInput = {
        resistance: 10.0,
        wireType: 'copper',
        awg: 40,
        usUnits: true,
      };

      const result = calculateWire2Pt(input);

      expect(result.isValid).toBe(true);
      expect(result.span).toBeGreaterThan(0);
      expect(result.circularMils).toBe(9.61);
    });

    it('should calculate span for balco wire in metric units', () => {
      const input: Wire2PtInput = {
        resistance: 50.0,
        wireType: 'balco',
        awg: 35,
        usUnits: false,
      };

      const result = calculateWire2Pt(input);

      expect(result.isValid).toBe(true);
      expect(result.span).toBeGreaterThan(0);
      expect(result.diameter).toBeGreaterThan(0);
    });

    it('should calculate higher resistance as longer span', () => {
      const input1: Wire2PtInput = {
        resistance: 10.0,
        wireType: 'copper',
        awg: 40,
        usUnits: true,
      };

      const input2: Wire2PtInput = {
        ...input1,
        resistance: 20.0,
      };

      const result1 = calculateWire2Pt(input1);
      const result2 = calculateWire2Pt(input2);

      expect(result2.span).toBeGreaterThan(result1.span);
    });

    it('should handle minimum valid resistance', () => {
      const input: Wire2PtInput = {
        resistance: 0.01,
        wireType: 'copper',
        awg: 40,
        usUnits: true,
      };

      const result = calculateWire2Pt(input);

      expect(result.isValid).toBe(true);
      expect(result.span).toBeGreaterThan(0);
    });

    it('should handle maximum valid resistance', () => {
      const input: Wire2PtInput = {
        resistance: 1000.0,
        wireType: 'copper',
        awg: 40,
        usUnits: true,
      };

      const result = calculateWire2Pt(input);

      expect(result.isValid).toBe(true);
      expect(result.span).toBeGreaterThan(0);
    });
  });

  describe('Wire type handling', () => {
    it('should calculate different spans for different wire types at same resistance', () => {
      const copperResult = calculateWire2Pt({
        resistance: 50.0,
        wireType: 'copper',
        awg: 40,
        usUnits: true,
      });

      const balcoResult = calculateWire2Pt({
        resistance: 50.0,
        wireType: 'balco',
        awg: 40,
        usUnits: true,
      });

      const nickelResult = calculateWire2Pt({
        resistance: 50.0,
        wireType: 'nickel',
        awg: 40,
        usUnits: true,
      });

      expect(copperResult.isValid).toBe(true);
      expect(balcoResult.isValid).toBe(true);
      expect(nickelResult.isValid).toBe(true);

      // Copper has lowest resistivity (~10.4), should give longest span
      expect(copperResult.span).toBeGreaterThan(4.0); // 50 / 10.371 ~4.82
      // Balco has highest resistivity (~120), should give shortest span
      expect(balcoResult.span).toBeLessThan(0.5); // 50 / 120 ~0.42
      // Nickel is in between
      expect(nickelResult.span).toBeGreaterThan(1.0); // 50 / 45 ~1.11
      expect(nickelResult.span).toBeLessThan(2.0);

      // Verify the ordering
      expect(copperResult.span).toBeGreaterThan(nickelResult.span);
      expect(nickelResult.span).toBeGreaterThan(balcoResult.span);
    });

    it('should support balco wire type', () => {
      const input: Wire2PtInput = {
        resistance: 25.0,
        wireType: 'balco',
        awg: 38,
        usUnits: true,
      };

      const result = calculateWire2Pt(input);

      expect(result.isValid).toBe(true);
    });

    it('should support advance wire type', () => {
      const input: Wire2PtInput = {
        resistance: 100.0,
        wireType: 'advance',
        awg: 35,
        usUnits: true,
      };

      const result = calculateWire2Pt(input);

      expect(result.isValid).toBe(true);
      expect(result.resistivity).toBeGreaterThan(0);
    });

    it('should support constantan wire type', () => {
      const input: Wire2PtInput = {
        resistance: 150.0,
        wireType: 'constantan',
        awg: 40,
        usUnits: true,
      };

      const result = calculateWire2Pt(input);

      expect(result.isValid).toBe(true);
      expect(result.resistivity).toBeGreaterThan(0);
    });

    it('should handle case-insensitive wire type names', () => {
      const input1: Wire2PtInput = {
        resistance: 50.0,
        wireType: 'copper',
        awg: 40,
        usUnits: true,
      };

      const input2: Wire2PtInput = {
        ...input1,
        wireType: 'COPPER',
      };

      const result1 = calculateWire2Pt(input1);
      const result2 = calculateWire2Pt(input2);

      expect(result1.span).toEqual(result2.span);
    });

    it('should reject invalid wire type', () => {
      const input: Wire2PtInput = {
        resistance: 50.0,
        wireType: 'invalid_wire',
        awg: 40,
        usUnits: true,
      };

      const result = calculateWire2Pt(input);

      expect(result.isValid).toBe(false);
      expect(result.error).toBeDefined();
    });
  });

  describe('AWG gauge handling', () => {
    it('should calculate span for minimum AWG (30)', () => {
      const input: Wire2PtInput = {
        resistance: 50.0,
        wireType: 'copper',
        awg: 30,
        usUnits: true,
      };

      const result = calculateWire2Pt(input);

      expect(result.isValid).toBe(true);
      expect(result.circularMils).toBe(100.0);
    });

    it('should calculate span for maximum AWG (50)', () => {
      const input: Wire2PtInput = {
        resistance: 50.0,
        wireType: 'copper',
        awg: 50,
        usUnits: true,
      };

      const result = calculateWire2Pt(input);

      expect(result.isValid).toBe(true);
      expect(result.circularMils).toBe(0.98);
    });

    it('should provide smaller diameter for larger AWG numbers', () => {
      const input30: Wire2PtInput = {
        resistance: 50.0,
        wireType: 'copper',
        awg: 30,
        usUnits: true,
      };

      const input50: Wire2PtInput = {
        ...input30,
        awg: 50,
      };

      const result30 = calculateWire2Pt(input30);
      const result50 = calculateWire2Pt(input50);

      expect(result30.diameter).toBeGreaterThan(result50.diameter);
    });

    it('should reject AWG below 30', () => {
      const input: Wire2PtInput = {
        resistance: 50.0,
        wireType: 'copper',
        awg: 29,
        usUnits: true,
      };

      const result = calculateWire2Pt(input);

      expect(result.isValid).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('should reject AWG above 50', () => {
      const input: Wire2PtInput = {
        resistance: 50.0,
        wireType: 'copper',
        awg: 51,
        usUnits: true,
      };

      const result = calculateWire2Pt(input);

      expect(result.isValid).toBe(false);
      expect(result.error).toBeDefined();
    });
  });

  describe('Unit conversions', () => {
    it('should convert span from feet to mm for metric units', () => {
      const inputUS: Wire2PtInput = {
        resistance: 10.0,
        wireType: 'copper',
        awg: 40,
        usUnits: true,
      };

      const inputSI: Wire2PtInput = {
        ...inputUS,
        usUnits: false,
      };

      const resultUS = calculateWire2Pt(inputUS);
      const resultSI = calculateWire2Pt(inputSI);

      // SI result should be larger (feet to mm conversion factor ~304.8)
      expect(resultSI.span).toBeCloseTo(resultUS.span * 304.8, 0);
    });

    it('should provide diameter in inches for US units', () => {
      const input: Wire2PtInput = {
        resistance: 50.0,
        wireType: 'copper',
        awg: 40,
        usUnits: true,
      };

      const result = calculateWire2Pt(input);

      expect(result.diameter).toBeLessThan(0.01); // AWG 40 is very fine
    });

    it('should provide diameter in mm for SI units', () => {
      const input: Wire2PtInput = {
        resistance: 50.0,
        wireType: 'copper',
        awg: 40,
        usUnits: false,
      };

      const result = calculateWire2Pt(input);

      // Should be diameter in inches * 25.4
      expect(result.diameter).toBeGreaterThan(0.05); // ~0.0031 inches * 25.4 mm/inch
    });
  });

  describe('Error validation', () => {
    it('should reject zero resistance', () => {
      const input: Wire2PtInput = {
        resistance: 0,
        wireType: 'copper',
        awg: 40,
        usUnits: true,
      };

      const result = calculateWire2Pt(input);

      expect(result.isValid).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('should reject negative resistance', () => {
      const input: Wire2PtInput = {
        resistance: -10.0,
        wireType: 'copper',
        awg: 40,
        usUnits: true,
      };

      const result = calculateWire2Pt(input);

      expect(result.isValid).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('should reject resistance below minimum', () => {
      const input: Wire2PtInput = {
        resistance: 0.005,
        wireType: 'copper',
        awg: 40,
        usUnits: true,
      };

      const result = calculateWire2Pt(input);

      expect(result.isValid).toBe(false);
    });

    it('should reject resistance above maximum', () => {
      const input: Wire2PtInput = {
        resistance: 2000.0,
        wireType: 'copper',
        awg: 40,
        usUnits: true,
      };

      const result = calculateWire2Pt(input);

      expect(result.isValid).toBe(false);
    });
  });

  describe('Helper functions', () => {
    it('should return list of available wire types', () => {
      const types = getWireTypes();

      expect(types).toContain('Copper');
      expect(types).toContain('Balco');
      expect(types).toContain('Advance');
      expect(types).toContain('Constantan');
      expect(types.length).toBeGreaterThan(0);
    });

    it('should return list of available AWG values', () => {
      const awgValues = getAvailableAWG();

      expect(awgValues).toContain(30);
      expect(awgValues).toContain(40);
      expect(awgValues).toContain(50);
      expect(awgValues.length).toBe(21); // AWG 30-50 inclusive
    });

    it('should return resistivity for valid wire type', () => {
      const copperResistivity = getWireResistivity('copper');

      expect(copperResistivity).toBeDefined();
      expect(copperResistivity).toBeCloseTo(10.371, 1);
    });

    it('should return undefined resistivity for invalid wire type', () => {
      const resistivity = getWireResistivity('invalid');

      expect(resistivity).toBeUndefined();
    });

    it('should return wire diameter in inches for US units', () => {
      const diameter = getWireDiameter(40, true);

      expect(diameter).toBeDefined();
      expect(diameter).toEqual(0.0031);
    });

    it('should return wire diameter in mm for SI units', () => {
      const diameter = getWireDiameter(40, false);

      expect(diameter).toBeDefined();
      expect(diameter).toBeCloseTo(0.0031 * 25.4, 2);
    });

    it('should return undefined diameter for invalid AWG', () => {
      const diameter = getWireDiameter(99, true);

      expect(diameter).toBeUndefined();
    });
  });

  describe('Physical consistency', () => {
    it('should return positive span for valid inputs', () => {
      const input: Wire2PtInput = {
        resistance: 100.0,
        wireType: 'copper',
        awg: 40,
        usUnits: true,
      };

      const result = calculateWire2Pt(input);

      expect(result.isValid).toBe(true);
      expect(result.span).toBeGreaterThan(0);
    });

    it('should return correct circular mils from table', () => {
      const input: Wire2PtInput = {
        resistance: 50.0,
        wireType: 'copper',
        awg: 45,
        usUnits: true,
      };

      const result = calculateWire2Pt(input);

      expect(result.circularMils).toBe(3.1);
    });

    it('should maintain span proportionality across wire types', () => {
      const resistance = 50.0;
      const copperResult = calculateWire2Pt({
        resistance,
        wireType: 'copper',
        awg: 40,
        usUnits: true,
      });
      const balcoResult = calculateWire2Pt({
        resistance,
        wireType: 'balco',
        awg: 40,
        usUnits: true,
      });

      // Ratio of spans should equal ratio of resistivities
      const spanRatio = copperResult.span / balcoResult.span;
      const resistivityRatio = balcoResult.resistivity / copperResult.resistivity;

      expect(spanRatio).toBeCloseTo(resistivityRatio, 5);
    });
  });
});
