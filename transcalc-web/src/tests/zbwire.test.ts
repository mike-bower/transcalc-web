import { describe, it, expect } from 'vitest';
import {
  calculateZeroBalanceWireLength,
  fahrenheitToCelsius,
  adjustResistanceForTemperature,
  commonWireTypes,
  ZeroBalanceWireInput,
} from '../domain/zbwire';

describe('Zero Balance Wire Length Calculation', () => {
  it('should calculate wire length for constantan wire', () => {
    const constantan = commonWireTypes[0]; // Constantan
    const input: ZeroBalanceWireInput = {
      targetResistance: 100,
      wireType: constantan,
      awgGauge: 36,
      usUnits: true,
    };

    const result = calculateZeroBalanceWireLength(input);

    // Resistance per foot = 295 / 25 = 11.8 Ohms/ft
    // Length = 100 / 11.8 = 8.475 ft = 101.7 inches
    expect(result.wireLength).toBeCloseTo(101.7, 0);
    expect(result.lengthUnit).toBe('in');
    expect(result.isValid).toBe(true);
  });

  it('should calculate wire length for manganin wire', () => {
    const manganin = commonWireTypes[1]; // Manganin
    const input: ZeroBalanceWireInput = {
      targetResistance: 50,
      wireType: manganin,
      awgGauge: 40,
      usUnits: true,
    };

    const result = calculateZeroBalanceWireLength(input);

    // Resistance per foot = 286 / 9.61 = 29.76 Ohms/ft
    // Length = 50 / 29.76 = 1.68 ft = 20.2 inches
    expect(result.wireLength).toBeCloseTo(20.2, 0);
    expect(result.isValid).toBe(true);
  });

  it('should convert to SI units (mm)', () => {
    const constantan = commonWireTypes[0];
    const input: ZeroBalanceWireInput = {
      targetResistance: 100,
      wireType: constantan,
      awgGauge: 36,
      usUnits: false,
    };

    const result = calculateZeroBalanceWireLength(input);

    // Same length in mm: 101.7 inches * 25.4 mm/in ≈ 2583 mm
    expect(result.wireLength).toBeCloseTo(2583, 0);
    expect(result.lengthUnit).toBe('mm');
  });

  it('should throw error with zero target resistance', () => {
    const constantan = commonWireTypes[0];
    const input: ZeroBalanceWireInput = {
      targetResistance: 0,
      wireType: constantan,
      awgGauge: 36,
      usUnits: true,
    };

    expect(() => calculateZeroBalanceWireLength(input)).toThrow('positive');
  });

  it('should throw error with invalid AWG gauge', () => {
    const constantan = commonWireTypes[0];
    const input: ZeroBalanceWireInput = {
      targetResistance: 100,
      wireType: constantan,
      awgGauge: 25, // Too small
      usUnits: true,
    };

    expect(() => calculateZeroBalanceWireLength(input)).toThrow('between 30');
  });

  it('should return wire diameter correctly', () => {
    const constantan = commonWireTypes[0];
    const input: ZeroBalanceWireInput = {
      targetResistance: 50,
      wireType: constantan,
      awgGauge: 36,
      usUnits: true,
    };

    const result = calculateZeroBalanceWireLength(input);

    // AWG 36 = 0.005 inches diameter
    expect(result.wireDiameter).toBeCloseTo(0.005, 4);
  });

  it('should scale wire length proportionally with target resistance', () => {
    const constantan = commonWireTypes[0];
    
    const input50: ZeroBalanceWireInput = {
      targetResistance: 50,
      wireType: constantan,
      awgGauge: 36,
      usUnits: true,
    };

    const input100: ZeroBalanceWireInput = {
      targetResistance: 100,
      wireType: constantan,
      awgGauge: 36,
      usUnits: true,
    };

    const result50 = calculateZeroBalanceWireLength(input50);
    const result100 = calculateZeroBalanceWireLength(input100);

    // Doubling resistance should double length
    expect(result100.wireLength / result50.wireLength).toBeCloseTo(2, 2);
  });

  it('should handle different wire gauges', () => {
    const constantan = commonWireTypes[0];
    
    const input34: ZeroBalanceWireInput = {
      targetResistance: 100,
      wireType: constantan,
      awgGauge: 34,
      usUnits: true,
    };

    const input38: ZeroBalanceWireInput = {
      targetResistance: 100,
      wireType: constantan,
      awgGauge: 38,
      usUnits: true,
    };

    const result34 = calculateZeroBalanceWireLength(input34);
    const result38 = calculateZeroBalanceWireLength(input38);

    // Different gauges result in different lengths
    expect(result34.wireLength).not.toBeCloseTo(result38.wireLength, 0);
  });

  it('should compare different wire types for same resistance', () => {
    const constantan = commonWireTypes[0];
    const manganin = commonWireTypes[1];
    
    const inputConstantan: ZeroBalanceWireInput = {
      targetResistance: 100,
      wireType: constantan,
      awgGauge: 36,
      usUnits: true,
    };

    const inputManganin: ZeroBalanceWireInput = {
      targetResistance: 100,
      wireType: manganin,
      awgGauge: 36,
      usUnits: true,
    };

    const resultConstantan = calculateZeroBalanceWireLength(inputConstantan);
    const resultManganin = calculateZeroBalanceWireLength(inputManganin);

    // Manganin has slightly lower resistivity, requiring slightly more length
    expect(resultManganin.wireLength).toBeGreaterThan(resultConstantan.wireLength);
  });

  it('should convert Fahrenheit to Celsius correctly', () => {
    expect(fahrenheitToCelsius(32)).toBeCloseTo(0, 5);
    expect(fahrenheitToCelsius(212)).toBeCloseTo(100, 5);
    expect(fahrenheitToCelsius(68)).toBeCloseTo(20, 5);
  });

  it('should adjust resistance for temperature change', () => {
    // Constantan with 0.014 %/°C TCR
    const baseResistance = 100;
    const tcr = 0.014; // %/°C
    const tempChange = 10; // °C increase

    const adjusted = adjustResistanceForTemperature(baseResistance, tcr, tempChange);

    // R(T) = 100 × (1 + 0.00014 × 10) = 100.14
    expect(adjusted).toBeCloseTo(100.14, 2);
  });

  it('should handle negative temperature changes', () => {
    const baseResistance = 100;
    const tcr = 0.014;
    const tempChange = -10; // °C decrease

    const adjusted = adjustResistanceForTemperature(baseResistance, tcr, tempChange);

    // R(T) = 100 × (1 + 0.00014 × -10) = 99.86
    expect(adjusted).toBeCloseTo(99.86, 2);
  });

  it('should handle zero temperature change', () => {
    const baseResistance = 100;
    const tcr = 0.014;
    const tempChange = 0;

    const adjusted = adjustResistanceForTemperature(baseResistance, tcr, tempChange);

    // No temperature change = no resistance change
    expect(adjusted).toBeCloseTo(baseResistance, 5);
  });

  it('should handle small resistance values', () => {
    const constantan = commonWireTypes[0];
    const input: ZeroBalanceWireInput = {
      targetResistance: 0.5,
      wireType: constantan,
      awgGauge: 36,
      usUnits: true,
    };

    const result = calculateZeroBalanceWireLength(input);

    expect(result.wireLength).toBeGreaterThan(0);
    expect(result.isValid).toBe(true);
  });

  it('should handle large resistance values', () => {
    const constantan = commonWireTypes[0];
    const input: ZeroBalanceWireInput = {
      targetResistance: 1000,
      wireType: constantan,
      awgGauge: 36,
      usUnits: true,
    };

    const result = calculateZeroBalanceWireLength(input);

    expect(result.wireLength).toBeGreaterThan(100);
    expect(result.isValid).toBe(true);
  });

  it('should return consistent actual resistance', () => {
    const constantan = commonWireTypes[0];
    const targetResistance = 75.5;
    const input: ZeroBalanceWireInput = {
      targetResistance: targetResistance,
      wireType: constantan,
      awgGauge: 36,
      usUnits: true,
    };

    const result = calculateZeroBalanceWireLength(input);

    // Actual resistance should match target (within rounding error)
    expect(result.actualResistance).toBeCloseTo(targetResistance, 1);
  });
});
