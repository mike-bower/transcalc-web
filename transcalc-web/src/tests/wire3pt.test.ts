/**
 * Tests for Wire 3-Point Span Calculation Module
 */

import { describe, it, expect } from 'vitest';
import {
  calculateWire3Pt,
  getWireTypes,
  getAvailableAWG,
  getWireResistivity,
  getWireDiameter,
  getWireResistancePerLength,
  Wire3PtInput,
} from '../domain/wire3pt';

describe('Wire 3-Point Span Calculation', () => {
  describe('Basic span calculations', () => {
    it('should calculate span for copper wire at standard conditions', () => {
      const input: Wire3PtInput = {
        resistance: 10.0,
        wireType: 'copper',
        awg: 40,
        usUnits: true,
      };

      const result = calculateWire3Pt(input);

      expect(result.isValid).toBe(true);
      expect(result.span).toBeGreaterThan(0);
      expect(result.circularMils).toBe(9.61);
    });

    it('should calculate span for balco wire in metric units', () => {
      const input: Wire3PtInput = {
        resistance: 50.0,
        wireType: 'balco',
        awg: 35,
        usUnits: false,
      };

      const result = calculateWire3Pt(input);

      expect(result.isValid).toBe(true);
      expect(result.span).toBeGreaterThan(0);
      expect(result.diameter).toBeGreaterThan(0);
    });

    it('should handle larger gauge sizes (AWG 10-20)', () => {
      const input: Wire3PtInput = {
        resistance: 50.0,
        wireType: 'copper',
        awg: 14,
        usUnits: true,
      };

      const result = calculateWire3Pt(input);

      expect(result.isValid).toBe(true);
      expect(result.circularMils).toBe(4110);
      expect(result.span).toBeGreaterThan(0);
    });

    it('should handle smallest gauge size (AWG 50)', () => {
      const input: Wire3PtInput = {
        resistance: 100.0,
        wireType: 'copper',
        awg: 50,
        usUnits: true,
      };

      const result = calculateWire3Pt(input);

      expect(result.isValid).toBe(true);
      expect(result.circularMils).toBe(0.98);
      expect(result.span).toBeGreaterThan(0);
    });

    it('should calculate higher resistance as longer span', () => {
      const input1: Wire3PtInput = {
        resistance: 10.0,
        wireType: 'copper',
        awg: 40,
        usUnits: true,
      };

      const input2: Wire3PtInput = {
        ...input1,
        resistance: 20.0,
      };

      const result1 = calculateWire3Pt(input1);
      const result2 = calculateWire3Pt(input2);

      expect(result2.span).toBeGreaterThan(result1.span);
    });
  });

  describe('Extended AWG range (10-50)', () => {
    it('should support AWG 10 (largest)', () => {
      const input: Wire3PtInput = {
        resistance: 5.0,
        wireType: 'copper',
        awg: 10,
        usUnits: true,
      };

      const result = calculateWire3Pt(input);

      expect(result.isValid).toBe(true);
      expect(result.circularMils).toBe(10380);
    });

    it('should support AWG 20 (mid-range)', () => {
      const input: Wire3PtInput = {
        resistance: 25.0,
        wireType: 'copper',
        awg: 20,
        usUnits: true,
      };

      const result = calculateWire3Pt(input);

      expect(result.isValid).toBe(true);
      expect(result.circularMils).toBe(1020);
    });

    it('should support AWG 50 (smallest)', () => {
      const input: Wire3PtInput = {
        resistance: 100.0,
        wireType: 'copper',
        awg: 50,
        usUnits: true,
      };

      const result = calculateWire3Pt(input);

      expect(result.isValid).toBe(true);
      expect(result.circularMils).toBe(0.98);
    });

    it('should reject AWG below 10', () => {
      const input: Wire3PtInput = {
        resistance: 50.0,
        wireType: 'copper',
        awg: 9,
        usUnits: true,
      };

      const result = calculateWire3Pt(input);

      expect(result.isValid).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('should reject AWG above 50', () => {
      const input: Wire3PtInput = {
        resistance: 50.0,
        wireType: 'copper',
        awg: 51,
        usUnits: true,
      };

      const result = calculateWire3Pt(input);

      expect(result.isValid).toBe(false);
    });
  });

  describe('Wire type handling', () => {
    it('should calculate different spans for different wire types', () => {
      const copperResult = calculateWire3Pt({
        resistance: 50.0,
        wireType: 'copper',
        awg: 40,
        usUnits: true,
      });

      const balcoResult = calculateWire3Pt({
        resistance: 50.0,
        wireType: 'balco',
        awg: 40,
        usUnits: true,
      });

      const nickelResult = calculateWire3Pt({
        resistance: 50.0,
        wireType: 'nickel',
        awg: 40,
        usUnits: true,
      });

      expect(copperResult.isValid).toBe(true);
      expect(balcoResult.isValid).toBe(true);
      expect(nickelResult.isValid).toBe(true);

      // Copper has lowest resistivity, should give longest span
      expect(copperResult.span).toBeGreaterThan(4.0);
      // Balco has highest resistivity, should give shortest span
      expect(balcoResult.span).toBeLessThan(0.5);
      // Verify ordering
      expect(copperResult.span).toBeGreaterThan(nickelResult.span);
      expect(nickelResult.span).toBeGreaterThan(balcoResult.span);
    });

    it('should support nichrome wire type (3-point extended)', () => {
      const input: Wire3PtInput = {
        resistance: 200.0,
        wireType: 'nichrome',
        awg: 30,
        usUnits: true,
      };

      const result = calculateWire3Pt(input);

      expect(result.isValid).toBe(true);
      expect(result.span).toBeGreaterThan(0);
    });

    it('should have nichrome with very high resistivity', () => {
      const nichromeDensity = getWireResistivity('nichrome');
      const copperDensity = getWireResistivity('copper');

      expect(nichromeDensity).toBeDefined();
      expect(copperDensity).toBeDefined();
      expect(nichromeDensity!).toBeGreaterThan(copperDensity!);
    });

    it('should reject invalid wire type', () => {
      const input: Wire3PtInput = {
        resistance: 50.0,
        wireType: 'invalid_wire',
        awg: 40,
        usUnits: true,
      };

      const result = calculateWire3Pt(input);

      expect(result.isValid).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('should handle case-insensitive wire type names', () => {
      const input1: Wire3PtInput = {
        resistance: 50.0,
        wireType: 'NICHROME',
        awg: 40,
        usUnits: true,
      };

      const input2: Wire3PtInput = {
        ...input1,
        wireType: 'nichrome',
      };

      const result1 = calculateWire3Pt(input1);
      const result2 = calculateWire3Pt(input2);

      expect(result1.span).toEqual(result2.span);
    });
  });

  describe('Unit conversions', () => {
    it('should convert span from feet to mm for metric units', () => {
      const inputUS: Wire3PtInput = {
        resistance: 10.0,
        wireType: 'copper',
        awg: 40,
        usUnits: true,
      };

      const inputSI: Wire3PtInput = {
        ...inputUS,
        usUnits: false,
      };

      const resultUS = calculateWire3Pt(inputUS);
      const resultSI = calculateWire3Pt(inputSI);

      // SI result should be larger (meters to mm conversion)
      // 1 m = 1000 mm
      expect(resultSI.span).toBeCloseTo(resultUS.span * 304.8, 0);
    });

    it('should provide diameter in different units correctly', () => {
      const inputUS: Wire3PtInput = {
        resistance: 50.0,
        wireType: 'copper',
        awg: 40,
        usUnits: true,
      };

      const inputSI: Wire3PtInput = {
        ...inputUS,
        usUnits: false,
      };

      const resultUS = calculateWire3Pt(inputUS);
      const resultSI = calculateWire3Pt(inputSI);

      // SI diameter should be ~25.4x larger (inches to mm)
      expect(resultSI.diameter).toBeCloseTo(resultUS.diameter * 25.4, 1);
    });
  });

  describe('Error validation', () => {
    it('should reject zero resistance', () => {
      const input: Wire3PtInput = {
        resistance: 0,
        wireType: 'copper',
        awg: 40,
        usUnits: true,
      };

      const result = calculateWire3Pt(input);

      expect(result.isValid).toBe(false);
    });

    it('should reject negative resistance', () => {
      const input: Wire3PtInput = {
        resistance: -10.0,
        wireType: 'copper',
        awg: 40,
        usUnits: true,
      };

      const result = calculateWire3Pt(input);

      expect(result.isValid).toBe(false);
    });

    it('should reject resistance below minimum', () => {
      const input: Wire3PtInput = {
        resistance: 0.005,
        wireType: 'copper',
        awg: 40,
        usUnits: true,
      };

      const result = calculateWire3Pt(input);

      expect(result.isValid).toBe(false);
    });

    it('should reject resistance above maximum', () => {
      const input: Wire3PtInput = {
        resistance: 2000.0,
        wireType: 'copper',
        awg: 40,
        usUnits: true,
      };

      const result = calculateWire3Pt(input);

      expect(result.isValid).toBe(false);
    });
  });

  describe('Helper functions', () => {
    it('should return list of available wire types with nichrome', () => {
      const types = getWireTypes();

      expect(types).toContain('Copper');
      expect(types).toContain('Nichrome');
      expect(types.length).toBeGreaterThanOrEqual(6);
    });

    it('should return full list of AWG values (10-50)', () => {
      const awgValues = getAvailableAWG();

      expect(awgValues).toContain(10);
      expect(awgValues).toContain(30);
      expect(awgValues).toContain(50);
      expect(awgValues.length).toBe(41); // AWG 10-50 inclusive
    });

    it('should return resistivity for valid wire types', () => {
      const copperResistivity = getWireResistivity('copper');
      const nichromeResistivity = getWireResistivity('nichrome');

      expect(copperResistivity).toBeCloseTo(10.371, 1);
      expect(nichromeResistivity).toBeCloseTo(650.0, 0);
    });

    it('should return wire diameter for all AWG values', () => {
      const diameter10 = getWireDiameter(10, true);
      const diameter30 = getWireDiameter(30, true);
      const diameter50 = getWireDiameter(50, true);

      expect(diameter10).toBeCloseTo(0.1019, 4);
      expect(diameter30).toEqual(0.01);
      expect(diameter50).toEqual(0.00099);
    });

    it('should return resistance per length in different units', () => {
      const usResistance = getWireResistancePerLength('copper', true);
      const siResistance = getWireResistancePerLength('copper', false);

      expect(usResistance).toBeCloseTo(10.371, 1);
      // SI: Ohms/m = Ohms/ft / 0.3048
      expect(siResistance).toBeCloseTo(10.371 / 0.3048, 1);
    });

    it('should return undefined for invalid AWG', () => {
      const diameter = getWireDiameter(99, true);

      expect(diameter).toBeUndefined();
    });
  });

  describe('Physical consistency', () => {
    it('should return positive span for all valid gauge sizes', () => {
      const awgValues = getAvailableAWG();

      for (const awg of awgValues) {
        const result = calculateWire3Pt({
          resistance: 50.0,
          wireType: 'copper',
          awg,
          usUnits: true,
        });

        expect(result.isValid).toBe(true);
        expect(result.span).toBeGreaterThan(0);
      }
    });

    it('should scale span inversely with resistivity', () => {
      const advanceResult = calculateWire3Pt({
        resistance: 50.0,
        wireType: 'advance',
        awg: 40,
        usUnits: true,
      });

      const copperResult = calculateWire3Pt({
        resistance: 50.0,
        wireType: 'copper',
        awg: 40,
        usUnits: true,
      });

      // Ratio of spans should equal ratio of resistivities
      const spanRatio = copperResult.span / advanceResult.span;
      const resistivityRatio = advanceResult.resistivity / copperResult.resistivity;

      expect(spanRatio).toBeCloseTo(resistivityRatio, 5);
    });

    it('should maintain consistency with extended AWG range', () => {
      const smallGaugeResult = calculateWire3Pt({
        resistance: 100.0,
        wireType: 'copper',
        awg: 50,
        usUnits: true,
      });

      const largeGaugeResult = calculateWire3Pt({
        resistance: 100.0,
        wireType: 'copper',
        awg: 10,
        usUnits: true,
      });

      // Same resistance and material → same span (resistivity per unit length is constant)
      expect(smallGaugeResult.span).toBeCloseTo(largeGaugeResult.span, 10);

      // But diameter differs significantly
      expect(largeGaugeResult.diameter).toBeGreaterThan(smallGaugeResult.diameter);
      expect(largeGaugeResult.circularMils).toBeGreaterThan(smallGaugeResult.circularMils);
    });
  });
});
