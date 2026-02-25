import { describe, it, expect } from 'vitest';
import {
  calculateSpanTemperature2Pt,
  interpolateOutputAtTemperature,
  temperatureCompensateOutput,
  spanWireTypes,
  SpanTemperature2PtInput,
} from '../domain/spanTemperature2Pt';

describe('Span vs Temperature 2-Point Calculation', () => {
  it('should calculate span compensation for wide temperature range', () => {
    const balco = spanWireTypes[0];
    const input: SpanTemperature2PtInput = {
      lowTemperature: 32, // 0°C
      lowOutput: 1.0,
      highTemperature: 212, // 100°C
      highOutput: 10.0,
      wireType: balco,
      resistorTCR: 0.25,
      bridgeResistance: 350,
      usUnits: true,
    };

    const result = calculateSpanTemperature2Pt(input);

    expect(result.compensationResistance).toBeGreaterThan(0);
    expect(result.isValid).toBe(true);
    expect(result.sensitivity).toBeGreaterThan(0);
  });

  it('should calculate correct sensitivity (output per degree)', () => {
    const balco = spanWireTypes[0];
    const input: SpanTemperature2PtInput = {
      lowTemperature: 32,
      lowOutput: 1.0,
      highTemperature: 212,
      highOutput: 10.0,
      wireType: balco,
      resistorTCR: 0.25,
      bridgeResistance: 350,
      usUnits: true,
    };

    const result = calculateSpanTemperature2Pt(input);

    // 9 mV/V over 180°F = 0.05 mV/V per °F
    const expectedSensitivity = (10.0 - 1.0) / (212 - 32);
    expect(result.sensitivity).toBeCloseTo(expectedSensitivity, 5);
  });

  it('should handle narrower temperature range', () => {
    const copper = spanWireTypes[1];
    const input: SpanTemperature2PtInput = {
      lowTemperature: 68,
      lowOutput: 4.0,
      highTemperature: 104,
      highOutput: 6.0,
      wireType: copper,
      resistorTCR: 0.22,
      bridgeResistance: 120,
      usUnits: true,
    };

    const result = calculateSpanTemperature2Pt(input);

    expect(result.compensationResistance).toBeGreaterThan(0);
    expect(result.spanLow).toBe(4.0);
    expect(result.spanHigh).toBe(6.0);
  });

  it('should calculate span TCR based on wire type', () => {
    const balco = spanWireTypes[0];
    const input: SpanTemperature2PtInput = {
      lowTemperature: 32,
      lowOutput: 1.0,
      highTemperature: 212,
      highOutput: 10.0,
      wireType: balco,
      resistorTCR: 0.25,
      bridgeResistance: 350,
      usUnits: true,
    };

    const result = calculateSpanTemperature2Pt(input);

    // Span TCR should reflect the difference between resistor and wire effects
    expect(result.spanTCR).toBeDefined();
    expect(Math.abs(result.spanTCR)).toBeLessThan(1); // Reasonable percentage
  });

  it('should use different wire types', () => {
    const tempConfig = {
      lowTemperature: 32,
      lowOutput: 1.0,
      highTemperature: 212,
      highOutput: 10.0,
      resistorTCR: 0.25,
      bridgeResistance: 350,
      usUnits: true,
    };

    const resultBalco = calculateSpanTemperature2Pt({
      ...tempConfig,
      wireType: spanWireTypes[0], // Balco
    });

    const resultCopper = calculateSpanTemperature2Pt({
      ...tempConfig,
      wireType: spanWireTypes[1], // Copper
    });

    // Different wire types should give different TCR results
    expect(resultBalco.spanTCR).not.toBeCloseTo(resultCopper.spanTCR, 2);
  });

  it('should throw error with low temperature higher than high', () => {
    const balco = spanWireTypes[0];
    const input: SpanTemperature2PtInput = {
      lowTemperature: 212,
      lowOutput: 10.0,
      highTemperature: 32,
      highOutput: 1.0,
      wireType: balco,
      resistorTCR: 0.25,
      bridgeResistance: 350,
      usUnits: true,
    };

    expect(() => calculateSpanTemperature2Pt(input)).toThrow(
      'Low temperature must be less than high temperature'
    );
  });

  it('should throw error with low output higher than high', () => {
    const balco = spanWireTypes[0];
    const input: SpanTemperature2PtInput = {
      lowTemperature: 32,
      lowOutput: 10.0,
      highTemperature: 212,
      highOutput: 1.0,
      wireType: balco,
      resistorTCR: 0.25,
      bridgeResistance: 350,
      usUnits: true,
    };

    expect(() => calculateSpanTemperature2Pt(input)).toThrow(
      'Low output must be less than high output'
    );
  });

  it('should throw error with invalid temperature range', () => {
    const balco = spanWireTypes[0];
    const input: SpanTemperature2PtInput = {
      lowTemperature: -150, // Below -100°F
      lowOutput: 1.0,
      highTemperature: 212,
      highOutput: 10.0,
      wireType: balco,
      resistorTCR: 0.25,
      bridgeResistance: 350,
      usUnits: true,
    };

    expect(() => calculateSpanTemperature2Pt(input)).toThrow('Low temperature');
  });

  it('should throw error with invalid output range', () => {
    const balco = spanWireTypes[0];
    const input: SpanTemperature2PtInput = {
      lowTemperature: 32,
      lowOutput: 0.00001, // Below 0.0001
      highTemperature: 212,
      highOutput: 10.0,
      wireType: balco,
      resistorTCR: 0.25,
      bridgeResistance: 350,
      usUnits: true,
    };

    expect(() => calculateSpanTemperature2Pt(input)).toThrow('Output must be');
  });

  it('should throw error with invalid TCR', () => {
    const balco = spanWireTypes[0];
    const input: SpanTemperature2PtInput = {
      lowTemperature: 32,
      lowOutput: 1.0,
      highTemperature: 212,
      highOutput: 10.0,
      wireType: balco,
      resistorTCR: 1.0, // Too high
      bridgeResistance: 350,
      usUnits: true,
    };

    expect(() => calculateSpanTemperature2Pt(input)).toThrow('Resistor TCR');
  });

  it('should throw error with invalid bridge resistance', () => {
    const balco = spanWireTypes[0];
    const input: SpanTemperature2PtInput = {
      lowTemperature: 32,
      lowOutput: 1.0,
      highTemperature: 212,
      highOutput: 10.0,
      wireType: balco,
      resistorTCR: 0.25,
      bridgeResistance: 20000, // Too high
      usUnits: true,
    };

    expect(() => calculateSpanTemperature2Pt(input)).toThrow(
      'Bridge resistance'
    );
  });

  it('should interpolate output at intermediate temperature', () => {
    const lowTemp = 32;
    const highTemp = 212;
    const lowOut = 1.0;
    const highOut = 10.0;

    // Test at midpoint
    const midTemp = 122; // 90°F, midpoint between 32 and 212
    const midOutput = interpolateOutputAtTemperature(
      lowTemp,
      highTemp,
      lowOut,
      highOut,
      midTemp
    );

    // Should be at midpoint
    const expectedOutput = 5.5;
    expect(midOutput).toBeCloseTo(expectedOutput, 2);
  });

  it('should interpolate at quarter points', () => {
    const lowTemp = 0;
    const highTemp = 100;
    const lowOut = 0;
    const highOut = 100;

    // Quarter point
    const quarterTemp = 25;
    const quarterOutput = interpolateOutputAtTemperature(
      lowTemp,
      highTemp,
      lowOut,
      highOut,
      quarterTemp
    );

    expect(quarterOutput).toBeCloseTo(25, 2);

    // Three quarter point
    const threeQuarterTemp = 75;
    const threeQuarterOutput = interpolateOutputAtTemperature(
      lowTemp,
      highTemp,
      lowOut,
      highOut,
      threeQuarterTemp
    );

    expect(threeQuarterOutput).toBeCloseTo(75, 2);
  });

  it('should throw error when querying outside calibration range', () => {
    expect(() =>
      interpolateOutputAtTemperature(32, 212, 1, 10, 250)
    ).toThrow('Query temperature must be between');

    expect(() =>
      interpolateOutputAtTemperature(32, 212, 1, 10, 0)
    ).toThrow('Query temperature must be between');
  });

  it('should apply temperature compensation to output', () => {
    const rawOutput = 5.0;
    const refTemp = 68; // Reference temperature
    const actualTemp = 77; // 9°F warmer
    const spanTCR = 0.1; // 0.1% per °F

    const compensated = temperatureCompensateOutput(
      rawOutput,
      refTemp,
      actualTemp,
      spanTCR
    );

    // Expected: 5.0 × (1 + 0.001 × 9) = 5.045
    expect(compensated).toBeCloseTo(5.045, 3);
  });

  it('should handle negative temperature compensation', () => {
    const rawOutput = 5.0;
    const refTemp = 68;
    const actualTemp = 59; // 9°F cooler
    const spanTCR = 0.1;

    const compensated = temperatureCompensateOutput(
      rawOutput,
      refTemp,
      actualTemp,
      spanTCR
    );

    // Expected: 5.0 × (1 + 0.001 × -9) = 4.955
    expect(compensated).toBeCloseTo(4.955, 3);
  });

  it('should have regression coefficient of 1.0 for perfect fit', () => {
    const balco = spanWireTypes[0];
    const input: SpanTemperature2PtInput = {
      lowTemperature: 32,
      lowOutput: 1.0,
      highTemperature: 212,
      highOutput: 10.0,
      wireType: balco,
      resistorTCR: 0.25,
      bridgeResistance: 350,
      usUnits: true,
    };

    const result = calculateSpanTemperature2Pt(input);

    // 2-point calibration should have perfect fit
    expect(result.regressionCoeff).toBe(1.0);
  });

  it('should store correct span values', () => {
    const balco = spanWireTypes[0];
    const input: SpanTemperature2PtInput = {
      lowTemperature: 50,
      lowOutput: 2.5,
      highTemperature: 150,
      highOutput: 7.5,
      wireType: balco,
      resistorTCR: 0.25,
      bridgeResistance: 350,
      usUnits: true,
    };

    const result = calculateSpanTemperature2Pt(input);

    expect(result.spanLow).toBe(2.5);
    expect(result.spanHigh).toBe(7.5);
  });

  it('should scale compensation resistance with output change', () => {
    const balco = spanWireTypes[0];
    const bridgeR = 350;

    const input1: SpanTemperature2PtInput = {
      lowTemperature: 32,
      lowOutput: 1.0,
      highTemperature: 212,
      highOutput: 5.0, // 4.0 mV/V change
      wireType: balco,
      resistorTCR: 0.25,
      bridgeResistance: bridgeR,
      usUnits: true,
    };

    const input2: SpanTemperature2PtInput = {
      lowTemperature: 32,
      lowOutput: 1.0,
      highTemperature: 212,
      highOutput: 9.0, // 8.0 mV/V change (doubled)
      wireType: balco,
      resistorTCR: 0.25,
      bridgeResistance: bridgeR,
      usUnits: true,
    };

    const result1 = calculateSpanTemperature2Pt(input1);
    const result2 = calculateSpanTemperature2Pt(input2);

    // Doubling output change should roughly double compensation
    expect(result2.compensationResistance / result1.compensationResistance).toBeCloseTo(2, 1);
  });

  it('should handle SI units (Celsius) correctly', () => {
    const balco = spanWireTypes[0];
    const input: SpanTemperature2PtInput = {
      lowTemperature: 0, // 0°C
      lowOutput: 1.0,
      highTemperature: 100, // 100°C
      highOutput: 10.0,
      wireType: balco,
      resistorTCR: 0.45, // %/°C (approximately 0.25 %/°F × 1.8)
      bridgeResistance: 350,
      usUnits: false,
    };

    const result = calculateSpanTemperature2Pt(input);

    expect(result.compensationResistance).toBeGreaterThan(0);
    // Sensitivity should be in mV/V per °C
    const expectedSensitivity = 9.0 / 100;
    expect(result.sensitivity).toBeCloseTo(expectedSensitivity, 5);
  });

  it('should create correct wire type definitions', () => {
    expect(spanWireTypes).toHaveLength(3);
    expect(spanWireTypes[0].name).toContain('Balco');
    expect(spanWireTypes[1].name).toContain('Copper');
    expect(spanWireTypes[2].name).toContain('Nickel');
  });
});
