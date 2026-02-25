import { describe, it, expect } from 'vitest';
import {
  calculateSpanVsTemp2pt,
  type SpanVsTemp2ptInput,
} from './span2pt';

describe('span2pt module', () => {
  describe('Valid calculations - large temperature spans (realistic operating conditions)', () => {
    it('should calculate with 400°F span and 25% output increase', () => {
      const input: SpanVsTemp2ptInput = {
        lowTemperature: 0,
        lowOutput: 2.0,
        highTemperature: 400,
        highOutput: 2.5,
        resistorTCR: 0.2,
        bridgeResistance: 350,
        usUnits: true,
      };
      const result = calculateSpanVsTemp2pt(input);
      expect(result.success).toBe(true);
      expect(result.resistance).toBeGreaterThan(0);
      expect(result.span).toBeGreaterThan(0);
      expect(result.span).toBeLessThanOrEqual(input.lowOutput);
    });

    it('should calculate with SI units (300°C span, 80% output increase)', () => {
      const input: SpanVsTemp2ptInput = {
        lowTemperature: -50,
        lowOutput: 1.0,
        highTemperature: 250,
        highOutput: 1.8,
        resistorTCR: 0.3,
        bridgeResistance: 500,
        usUnits: false,
      };
      const result = calculateSpanVsTemp2pt(input);
      expect(result.success).toBe(true);
      expect(result.resistance).toBeGreaterThan(0);
      expect(result.span).toBeGreaterThan(0);
    });

    it('should calculate with 600°F span and 6% output increase', () => {
      const input: SpanVsTemp2ptInput = {
        lowTemperature: -100,
        lowOutput: 5.0,
        highTemperature: 500,
        highOutput: 5.3,
        resistorTCR: 0.1,
        bridgeResistance: 350,
        usUnits: true,
      };
      const result = calculateSpanVsTemp2pt(input);
      expect(result.success).toBe(true);
      expect(result.resistance).toBeGreaterThan(0);
    });

    it('should calculate with mid-range parameters (400°F, 12% increase)', () => {
      const input: SpanVsTemp2ptInput = {
        lowTemperature: 50,
        lowOutput: 2.0,
        highTemperature: 450,
        highOutput: 2.24,
        resistorTCR: 0.25,
        bridgeResistance: 500,
        usUnits: true,
      };
      const result = calculateSpanVsTemp2pt(input);
      expect(result.success).toBe(true);
      expect(result.resistance).toBeGreaterThan(0);
    });

    it('should calculate with very large temperature span (550°F, 5% increase)', () => {
      const input: SpanVsTemp2ptInput = {
        lowTemperature: -50,
        lowOutput: 4.0,
        highTemperature: 500,
        highOutput: 4.2,
        resistorTCR: 0.15,
        bridgeResistance: 350,
        usUnits: true,
      };
      const result = calculateSpanVsTemp2pt(input);
      expect(result.success).toBe(true);
      expect(result.resistance).toBeGreaterThan(0);
    });
  });

  describe('Input validation - temperature boundaries', () => {
    it('should reject temperature below minimum (-101°F)', () => {
      const input: SpanVsTemp2ptInput = {
        lowTemperature: -101,
        lowOutput: 1.0,
        highTemperature: 300,
        highOutput: 2.0,
        resistorTCR: 0.2,
        bridgeResistance: 350,
        usUnits: true,
      };
      const result = calculateSpanVsTemp2pt(input);
      expect(result.success).toBe(false);
      expect(result.error).toContain('Low temperature');
    });

    it('should reject temperature above maximum (501°F)', () => {
      const input: SpanVsTemp2ptInput = {
        lowTemperature: 100,
        lowOutput: 1.0,
        highTemperature: 501,
        highOutput: 2.0,
        resistorTCR: 0.2,
        bridgeResistance: 350,
        usUnits: true,
      };
      const result = calculateSpanVsTemp2pt(input);
      expect(result.success).toBe(false);
      expect(result.error).toContain('High temperature');
    });

    it('should reject temperatures too close (< 1°F apart)', () => {
      const input: SpanVsTemp2ptInput = {
        lowTemperature: 100,
        lowOutput: 1.0,
        highTemperature: 100.5,
        highOutput: 1.1,
        resistorTCR: 0.2,
        bridgeResistance: 350,
        usUnits: true,
      };
      const result = calculateSpanVsTemp2pt(input);
      expect(result.success).toBe(false);
      expect(result.error).toContain('Temperature difference');
    });
  });

  describe('Input validation - output boundaries', () => {
    it('should reject low output below minimum (0.00009 mV)', () => {
      const input: SpanVsTemp2ptInput = {
        lowTemperature: 50,
        lowOutput: 0.00009,
        highTemperature: 450,
        highOutput: 3.0,
        resistorTCR: 0.2,
        bridgeResistance: 350,
        usUnits: true,
      };
      const result = calculateSpanVsTemp2pt(input);
      expect(result.success).toBe(false);
      expect(result.error).toContain('Low output');
    });

    it('should reject zero low output', () => {
      const input: SpanVsTemp2ptInput = {
        lowTemperature: 50,
        lowOutput: 0,
        highTemperature: 450,
        highOutput: 3.0,
        resistorTCR: 0.2,
        bridgeResistance: 350,
        usUnits: true,
      };
      const result = calculateSpanVsTemp2pt(input);
      expect(result.success).toBe(false);
      expect(result.error).toContain('Low output must be between');
    });

    it('should reject high output above maximum (10.1 mV)', () => {
      const input: SpanVsTemp2ptInput = {
        lowTemperature: 50,
        lowOutput: 1.0,
        highTemperature: 450,
        highOutput: 10.1,
        resistorTCR: 0.2,
        bridgeResistance: 350,
        usUnits: true,
      };
      const result = calculateSpanVsTemp2pt(input);
      expect(result.success).toBe(false);
      expect(result.error).toContain('High output');
    });
  });

  describe('Input validation - TCR and bridge resistance', () => {
    it('should reject TCR below minimum (0.09%)', () => {
      const input: SpanVsTemp2ptInput = {
        lowTemperature: 50,
        lowOutput: 1.0,
        highTemperature: 450,
        highOutput: 2.0,
        resistorTCR: 0.09,
        bridgeResistance: 350,
        usUnits: true,
      };
      const result = calculateSpanVsTemp2pt(input);
      expect(result.success).toBe(false);
      expect(result.error).toContain('Resistor TCR');
    });

    it('should reject TCR above maximum (0.51%)', () => {
      const input: SpanVsTemp2ptInput = {
        lowTemperature: 50,
        lowOutput: 1.0,
        highTemperature: 450,
        highOutput: 2.0,
        resistorTCR: 0.51,
        bridgeResistance: 350,
        usUnits: true,
      };
      const result = calculateSpanVsTemp2pt(input);
      expect(result.success).toBe(false);
      expect(result.error).toContain('Resistor TCR');
    });

    it('should reject bridge resistance below minimum (49 Ω)', () => {
      const input: SpanVsTemp2ptInput = {
        lowTemperature: 50,
        lowOutput: 1.0,
        highTemperature: 450,
        highOutput: 2.0,
        resistorTCR: 0.2,
        bridgeResistance: 49,
        usUnits: true,
      };
      const result = calculateSpanVsTemp2pt(input);
      expect(result.success).toBe(false);
      expect(result.error).toContain('Bridge resistance');
    });

    it('should reject bridge resistance above maximum (10001 Ω)', () => {
      const input: SpanVsTemp2ptInput = {
        lowTemperature: 50,
        lowOutput: 1.0,
        highTemperature: 450,
        highOutput: 2.0,
        resistorTCR: 0.2,
        bridgeResistance: 10001,
        usUnits: true,
      };
      const result = calculateSpanVsTemp2pt(input);
      expect(result.success).toBe(false);
      expect(result.error).toContain('Bridge resistance');
    });
  });

  describe('Impractical mathematical conditions', () => {
    it('should reject when TCR coefficient matches span coefficient (division by zero risk)', () => {
      const input: SpanVsTemp2ptInput = {
        lowTemperature: 0,
        lowOutput: 1.0,
        highTemperature: 100,
        highOutput: 1.2, // dS/dT = 0.002
        resistorTCR: 0.2, // TCR/100 = 0.002 (exact match)
        bridgeResistance: 350,
        usUnits: true,
      };
      const result = calculateSpanVsTemp2pt(input);
      expect(result.success).toBe(false);
      expect(result.error).toContain('impractical');
    });

    it('should reject when output decreases with temperature (impossible to compensate)', () => {
      const input: SpanVsTemp2ptInput = {
        lowTemperature: 0,
        lowOutput: 5.0,
        highTemperature: 300,
        highOutput: 2.0, // Output decreases
        resistorTCR: 0.2,
        bridgeResistance: 350,
        usUnits: true,
      };
      const result = calculateSpanVsTemp2pt(input);
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });
  });

  describe('Result structure validation', () => {
    it('should return complete success result with all properties', () => {
      const input: SpanVsTemp2ptInput = {
        lowTemperature: 0,
        lowOutput: 2.0,
        highTemperature: 400,
        highOutput: 2.5,
        resistorTCR: 0.2,
        bridgeResistance: 350,
        usUnits: true,
      };
      const result = calculateSpanVsTemp2pt(input);
      expect(result.success).toBe(true);
      expect(result).toHaveProperty('resistance');
      expect(result).toHaveProperty('span');
      expect(result.error).toBeUndefined();
      expect(typeof result.resistance).toBe('number');
      expect(typeof result.span).toBe('number');
    });

    it('should return complete error result for invalid input', () => {
      const input: SpanVsTemp2ptInput = {
        lowTemperature: -101,
        lowOutput: 1.0,
        highTemperature: 300,
        highOutput: 2.0,
        resistorTCR: 0.2,
        bridgeResistance: 350,
        usUnits: true,
      };
      const result = calculateSpanVsTemp2pt(input);
      expect(result.success).toBe(false);
      expect(result).toHaveProperty('error');
      expect(result.error).toBeDefined();
      expect(result.resistance).toBeUndefined();
      expect(result.span).toBeUndefined();
    });

    it('should maintain span less than or equal to low output', () => {
      const input: SpanVsTemp2ptInput = {
        lowTemperature: 50,
        lowOutput: 3.0,
        highTemperature: 450,
        highOutput: 4.5, // 50% increase
        resistorTCR: 0.25,
        bridgeResistance: 500,
        usUnits: true,
      };
      const result = calculateSpanVsTemp2pt(input);
      if (result.success) {
        expect(result.span).toBeLessThanOrEqual(input.lowOutput);
      }
    });
  });

  describe('Unit system consistency', () => {
    it('should handle SI units correctly (Celsius)', () => {
      const input: SpanVsTemp2ptInput = {
        lowTemperature: -40,
        lowOutput: 1.0,
        highTemperature: 150,
        highOutput: 1.01, // Small 1% increase over large 190°C span
        resistorTCR: 0.2,
        bridgeResistance: 350,
        usUnits: false,
      };
      const result = calculateSpanVsTemp2pt(input);
      expect(result.success).toBe(true);
      expect(result.resistance).toBeGreaterThan(0);
      expect(result.span).toBeGreaterThan(0);
    });

    it('should reject SI temperatures outside bounds', () => {
      const input: SpanVsTemp2ptInput = {
        lowTemperature: -74, // Below -73.33°C
        lowOutput: 1.0,
        highTemperature: 150,
        highOutput: 2.0,
        resistorTCR: 0.2,
        bridgeResistance: 350,
        usUnits: false,
      };
      const result = calculateSpanVsTemp2pt(input);
      expect(result.success).toBe(false);
      expect(result.error).toContain('Low temperature');
    });
  });
});
