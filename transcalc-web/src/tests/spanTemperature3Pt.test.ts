import { describe, it, expect } from 'vitest';
import {
  calculateSpanTemperature3Pt,
  interpolateOutputQuadratic,
  interpolateOutputLinear,
  SpanTemperature3PtInput,
} from '../domain/spanTemperature3Pt';

describe('Span vs Temperature 3-Point Calculation', () => {
  const linearInput: SpanTemperature3PtInput = {
    lowPoint: { temperature: 32, output: 1.0 },
    midPoint: { temperature: 122, output: 5.5 },
    highPoint: { temperature: 212, output: 10.0 },
    resistorTCR: 0.25,
    bridgeResistance: 350,
    usUnits: true,
  };

  it('should calculate 3-point span with linear response', () => {
    const result = calculateSpanTemperature3Pt(linearInput);

    expect(result.isValid).toBe(true);
    expect(result.lowCompensation).toBeGreaterThan(0);
    expect(result.midCompensation).toBeGreaterThan(0);
    expect(result.highCompensation).toBeGreaterThanOrEqual(0);
  });

  it('should detect perfect linear response', () => {
    const result = calculateSpanTemperature3Pt(linearInput);

    // Perfect linear response should have near-perfect regression
    expect(result.regressionCoeff).toBeCloseTo(1.0, 2);
    // Non-linearity should be nearly zero
    expect(Math.abs(result.nonlinearity)).toBeLessThan(0.1);
  });

  it('should recommend linear compensation for linear response', () => {
    const result = calculateSpanTemperature3Pt(linearInput);

    expect(result.compensationMethod).toBe('linear');
  });

  it('should calculate average sensitivity correctly', () => {
    const result = calculateSpanTemperature3Pt(linearInput);

    // (5.5 - 1.0) / (122 - 32) = 4.5 / 90 = 0.05
    // (10.0 - 5.5) / (212 - 122) = 4.5 / 90 = 0.05
    // Average = 0.05
    expect(result.averageSensitivity).toBeCloseTo(0.05, 3);
  });

  it('should handle non-linear curvature (concave up)', () => {
    const nonlinearInput: SpanTemperature3PtInput = {
      lowPoint: { temperature: 32, output: 1.0 },
      midPoint: { temperature: 122, output: 4.5 }, // Lower than linear
      highPoint: { temperature: 212, output: 10.0 },
      resistorTCR: 0.25,
      bridgeResistance: 350,
      usUnits: true,
    };

    const result = calculateSpanTemperature3Pt(nonlinearInput);

    // Non-zero non-linearity indicates curvature
    expect(Math.abs(result.nonlinearity)).toBeGreaterThan(0);
    // Regression coefficient should be less than 1.0
    expect(result.regressionCoeff).toBeLessThan(1.0);
  });

  it('should handle non-linear curvature (concave down)', () => {
    const nonlinearInput: SpanTemperature3PtInput = {
      lowPoint: { temperature: 32, output: 1.0 },
      midPoint: { temperature: 122, output: 6.5 }, // Higher than linear
      highPoint: { temperature: 212, output: 10.0 },
      resistorTCR: 0.25,
      bridgeResistance: 350,
      usUnits: true,
    };

    const result = calculateSpanTemperature3Pt(nonlinearInput);

    // Non-linearity should be positive (mid point above linear fit)
    expect(result.nonlinearity).toBeGreaterThan(0);
  });

  it('should recommend quadratic method for significant non-linearity', () => {
    const nonlinearInput: SpanTemperature3PtInput = {
      lowPoint: { temperature: 32, output: 1.0 },
      midPoint: { temperature: 122, output: 3.0 }, // Significantly non-linear
      highPoint: { temperature: 212, output: 10.0 },
      resistorTCR: 0.25,
      bridgeResistance: 350,
      usUnits: true,
    };

    const result = calculateSpanTemperature3Pt(nonlinearInput);

    expect(result.compensationMethod).toBe('quadratic');
  });

  it('should scale compensation with bridge resistance', () => {
    const input1: SpanTemperature3PtInput = {
      lowPoint: { temperature: 32, output: 1.0 },
      midPoint: { temperature: 122, output: 5.5 },
      highPoint: { temperature: 212, output: 10.0 },
      resistorTCR: 0.25,
      bridgeResistance: 350,
      usUnits: true,
    };

    const input2: SpanTemperature3PtInput = {
      ...input1,
      bridgeResistance: 700, // Double
    };

    const result1 = calculateSpanTemperature3Pt(input1);
    const result2 = calculateSpanTemperature3Pt(input2);

    // Doubling bridge resistance should roughly double the compensations
    expect(result2.lowCompensation).toBeGreaterThan(result1.lowCompensation);
    expect(result2.midCompensation).toBeGreaterThan(result1.midCompensation);
    // High compensation will be 0 in both cases since normalized output = 1.0
    expect(result2.highCompensation).toEqual(result1.highCompensation);
  });

  it('should throw error with temperatures out of order', () => {
    const badInput: SpanTemperature3PtInput = {
      lowPoint: { temperature: 122, output: 1.0 },
      midPoint: { temperature: 32, output: 5.5 },
      highPoint: { temperature: 212, output: 10.0 },
      resistorTCR: 0.25,
      bridgeResistance: 350,
      usUnits: true,
    };

    expect(() => calculateSpanTemperature3Pt(badInput)).toThrow(
      'Temperatures must be in ascending order'
    );
  });

  it('should throw error with outputs out of order', () => {
    const badInput: SpanTemperature3PtInput = {
      lowPoint: { temperature: 32, output: 5.5 },
      midPoint: { temperature: 122, output: 1.0 },
      highPoint: { temperature: 212, output: 10.0 },
      resistorTCR: 0.25,
      bridgeResistance: 350,
      usUnits: true,
    };

    expect(() => calculateSpanTemperature3Pt(badInput)).toThrow(
      'Outputs must be in ascending order'
    );
  });

  it('should throw error with invalid temperature', () => {
    const badInput: SpanTemperature3PtInput = {
      lowPoint: { temperature: -150, output: 1.0 },
      midPoint: { temperature: 122, output: 5.5 },
      highPoint: { temperature: 212, output: 10.0 },
      resistorTCR: 0.25,
      bridgeResistance: 350,
      usUnits: true,
    };

    expect(() => calculateSpanTemperature3Pt(badInput)).toThrow('Temperature must be');
  });

  it('should throw error with invalid output', () => {
    const badInput: SpanTemperature3PtInput = {
      lowPoint: { temperature: 32, output: 0.00001 },
      midPoint: { temperature: 122, output: 5.5 },
      highPoint: { temperature: 212, output: 10.0 },
      resistorTCR: 0.25,
      bridgeResistance: 350,
      usUnits: true,
    };

    expect(() => calculateSpanTemperature3Pt(badInput)).toThrow('Output must be');
  });

  it('should throw error with invalid TCR', () => {
    const badInput: SpanTemperature3PtInput = {
      lowPoint: { temperature: 32, output: 1.0 },
      midPoint: { temperature: 122, output: 5.5 },
      highPoint: { temperature: 212, output: 10.0 },
      resistorTCR: 1.5,
      bridgeResistance: 350,
      usUnits: true,
    };

    expect(() => calculateSpanTemperature3Pt(badInput)).toThrow('Resistor TCR');
  });

  it('should interpolate linearly at endpoints', () => {
    const low = { temperature: 32, output: 1.0 };
    const mid = { temperature: 122, output: 5.5 };
    const high = { temperature: 212, output: 10.0 };

    // At low point
    const atLow = interpolateOutputLinear(low, mid, high, 32);
    expect(atLow).toBeCloseTo(1.0, 3);

    // At high point
    const atHigh = interpolateOutputLinear(low, mid, high, 212);
    expect(atHigh).toBeCloseTo(10.0, 3);
  });

  it('should interpolate linearly at mid point', () => {
    const low = { temperature: 32, output: 1.0 };
    const mid = { temperature: 122, output: 5.5 };
    const high = { temperature: 212, output: 10.0 };

    const atMid = interpolateOutputLinear(low, mid, high, 122);
    expect(atMid).toBeCloseTo(5.5, 3);
  });

  it('should interpolate linearly between low and mid', () => {
    const low = { temperature: 32, output: 1.0 };
    const mid = { temperature: 122, output: 5.5 };
    const high = { temperature: 212, output: 10.0 };

    // Midway between low and mid
    const atQuarter = interpolateOutputLinear(low, mid, high, 77);
    // Expecting 3.25 as midpoint between 1.0 and 5.5
    expect(atQuarter).toBeCloseTo(3.25, 3);
  });

  it('should interpolate linearly between mid and high', () => {
    const low = { temperature: 32, output: 1.0 };
    const mid = { temperature: 122, output: 5.5 };
    const high = { temperature: 212, output: 10.0 };

    // Midway between mid and high
    const atThreeQuarter = interpolateOutputLinear(low, mid, high, 167);
    // Expecting 7.75 as midpoint between 5.5 and 10.0
    expect(atThreeQuarter).toBeCloseTo(7.75, 3);
  });

  it('should interpolate quadratically at endpoints', () => {
    const low = { temperature: 32, output: 1.0 };
    const mid = { temperature: 122, output: 5.5 };
    const high = { temperature: 212, output: 10.0 };

    const atLow = interpolateOutputQuadratic(low, mid, high, 32);
    expect(atLow).toBeCloseTo(1.0, 3);

    const atHigh = interpolateOutputQuadratic(low, mid, high, 212);
    expect(atHigh).toBeCloseTo(10.0, 3);
  });

  it('should interpolate quadratically at mid point', () => {
    const low = { temperature: 32, output: 1.0 };
    const mid = { temperature: 122, output: 5.5 };
    const high = { temperature: 212, output: 10.0 };

    const atMid = interpolateOutputQuadratic(low, mid, high, 122);
    expect(atMid).toBeCloseTo(5.5, 3);
  });

  it('should handle quadratic interpolation with non-linear response', () => {
    const low = { temperature: 32, output: 1.0 };
    const mid = { temperature: 122, output: 4.5 };
    const high = { temperature: 212, output: 10.0 };

    // Quadratic should fit the curve better than linear
    const midLin = interpolateOutputLinear(low, mid, high, 50);
    const midQuad = interpolateOutputQuadratic(low, mid, high, 50);

    // For non-linear data, results might differ
    expect(typeof midLin).toBe('number');
    expect(typeof midQuad).toBe('number');
  });

  it('should throw error when querying outside range (linear)', () => {
    const low = { temperature: 32, output: 1.0 };
    const mid = { temperature: 122, output: 5.5 };
    const high = { temperature: 212, output: 10.0 };

    expect(() => interpolateOutputLinear(low, mid, high, 250)).toThrow(
      'outside calibration range'
    );

    expect(() => interpolateOutputLinear(low, mid, high, 0)).toThrow(
      'outside calibration range'
    );
  });

  it('should throw error when querying outside range (quadratic)', () => {
    const low = { temperature: 32, output: 1.0 };
    const mid = { temperature: 122, output: 5.5 };
    const high = { temperature: 212, output: 10.0 };

    expect(() => interpolateOutputQuadratic(low, mid, high, 250)).toThrow(
      'outside calibration range'
    );

    expect(() => interpolateOutputQuadratic(low, mid, high, 0)).toThrow(
      'outside calibration range'
    );
  });

  it('should handle SI units (Celsius)', () => {
    const siInput: SpanTemperature3PtInput = {
      lowPoint: { temperature: 0, output: 1.0 },
      midPoint: { temperature: 50, output: 5.5 },
      highPoint: { temperature: 100, output: 10.0 },
      resistorTCR: 0.45,
      bridgeResistance: 350,
      usUnits: false,
    };

    const result = calculateSpanTemperature3Pt(siInput);

    expect(result.isValid).toBe(true);
    expect(result.averageSensitivity).toBeCloseTo(0.09, 2); // 9/100
  });

  it('should calculate compensation values in reasonable ranges', () => {
    const result = calculateSpanTemperature3Pt(linearInput);

    // All compensation values should be non-negative
    expect(result.lowCompensation).toBeGreaterThanOrEqual(0);
    expect(result.midCompensation).toBeGreaterThanOrEqual(0);
    expect(result.highCompensation).toBeGreaterThanOrEqual(0);

    // Compensation should decrease with higher output (inverse relationship)
    expect(result.lowCompensation).toBeGreaterThan(result.midCompensation);
    expect(result.midCompensation).toBeGreaterThan(result.highCompensation);
  });

  it('should have regression coefficient between 0 and 1', () => {
    const result = calculateSpanTemperature3Pt(linearInput);

    expect(result.regressionCoeff).toBeGreaterThanOrEqual(0);
    expect(result.regressionCoeff).toBeLessThanOrEqual(1);
  });

  it('should have non-linearity expressed as percentage', () => {
    const result = calculateSpanTemperature3Pt(linearInput);

    // Non-linearity should be small percentage
    expect(Math.abs(result.nonlinearity)).toBeLessThan(100);
  });
});
