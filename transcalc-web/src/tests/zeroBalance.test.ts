import { describe, it, expect } from 'vitest';
import {
  calculateZeroBalance,
  fahrenheitToCelsius,
  adjustResistanceForTemperature,
  getTemperatureCompensatedResistance,
  commonWireTypes,
  ZeroBalanceInput,
} from '../domain/zeroBalance';

describe('Zero Balance Compensation Calculation', () => {
  it('should calculate compensation for small unbalance', () => {
    const constantan = commonWireTypes[0];
    const input: ZeroBalanceInput = {
      unbalance: 100, // 100 mV/V unbalance
      bridgeResistance: 120, // 120 Ohm strain gauge bridge
      wireType: constantan,
      awgGauge: 36,
      usUnits: true,
    };

    const result = calculateZeroBalance(input);

    // Compensation = (100 / 1000) × 120 = 12 Ohms
    expect(result.resistanceNeeded).toBeCloseTo(12, 1);
    expect(result.isValid).toBe(true);
  });

  it('should calculate compensation for large unbalance', () => {
    const constantan = commonWireTypes[0];
    const input: ZeroBalanceInput = {
      unbalance: 500, // 500 mV/V unbalance
      bridgeResistance: 350, // Larger bridge
      wireType: constantan,
      awgGauge: 36,
      usUnits: true,
    };

    const result = calculateZeroBalance(input);

    // Compensation = (500 / 1000) × 350 = 175 Ohms
    expect(result.resistanceNeeded).toBeCloseTo(175, 0);
    expect(result.isValid).toBe(true);
  });

  it('should handle negative unbalance', () => {
    const constantan = commonWireTypes[0];
    const input: ZeroBalanceInput = {
      unbalance: -50, // Negative unbalance
      bridgeResistance: 120,
      wireType: constantan,
      awgGauge: 36,
      usUnits: true,
    };

    const result = calculateZeroBalance(input);

    // Absolute value: (50 / 1000) × 120 = 6 Ohms
    expect(result.resistanceNeeded).toBeCloseTo(6, 1);
  });

  it('should calculate wire length for compensation', () => {
    const constantan = commonWireTypes[0];
    const input: ZeroBalanceInput = {
      unbalance: 100,
      bridgeResistance: 120,
      wireType: constantan,
      awgGauge: 36,
      usUnits: true,
    };

    const result = calculateZeroBalance(input);

    // Should have calculated a reasonable wire length (inches)
    expect(result.wireLength).toBeGreaterThan(0);
    expect(result.lengthUnit).toBe('in');
  });

  it('should convert wire length to SI units', () => {
    const constantan = commonWireTypes[0];
    const input: ZeroBalanceInput = {
      unbalance: 100,
      bridgeResistance: 120,
      wireType: constantan,
      awgGauge: 36,
      usUnits: false,
    };

    const result = calculateZeroBalance(input);

    expect(result.lengthUnit).toBe('mm');
    expect(result.wireLength).toBeGreaterThan(100); // Much larger in mm
  });

  it('should scale compensation with bridge resistance', () => {
    const constantan = commonWireTypes[0];
    const unbalance = 100;

    const input120: ZeroBalanceInput = {
      unbalance: unbalance,
      bridgeResistance: 120,
      wireType: constantan,
      awgGauge: 36,
      usUnits: true,
    };

    const input350: ZeroBalanceInput = {
      unbalance: unbalance,
      bridgeResistance: 350,
      wireType: constantan,
      awgGauge: 36,
      usUnits: true,
    };

    const result120 = calculateZeroBalance(input120);
    const result350 = calculateZeroBalance(input350);

    // Larger bridge resistance should need larger compensation
    expect(result350.resistanceNeeded).toBeGreaterThan(result120.resistanceNeeded);
    expect(result350.resistanceNeeded / result120.resistanceNeeded).toBeCloseTo(
      350 / 120,
      2
    );
  });

  it('should scale compensation with unbalance', () => {
    const constantan = commonWireTypes[0];
    const bridgeResistance = 120;

    const input50: ZeroBalanceInput = {
      unbalance: 50,
      bridgeResistance: bridgeResistance,
      wireType: constantan,
      awgGauge: 36,
      usUnits: true,
    };

    const input100: ZeroBalanceInput = {
      unbalance: 100,
      bridgeResistance: bridgeResistance,
      wireType: constantan,
      awgGauge: 36,
      usUnits: true,
    };

    const result50 = calculateZeroBalance(input50);
    const result100 = calculateZeroBalance(input100);

    // Doubling unbalance should double compensation
    expect(result100.resistanceNeeded / result50.resistanceNeeded).toBeCloseTo(2, 2);
  });

  it('should calculate bridge arm value', () => {
    const constantan = commonWireTypes[0];
    const input: ZeroBalanceInput = {
      unbalance: 100,
      bridgeResistance: 120,
      wireType: constantan,
      awgGauge: 36,
      usUnits: true,
    };

    const result = calculateZeroBalance(input);

    // Bridge arm should be positive and reasonable
    expect(result.bridgeArmValue).toBeGreaterThan(0);
    // Should scale with bridge resistance
    expect(result.bridgeArmValue).toBeCloseTo(66, 2); // ~60-70 Ohms for BridgeResistance/2
  });

  it('should use constantan wire properties', () => {
    const constantan = commonWireTypes[0];
    expect(constantan.name).toContain('Constantan');
    expect(constantan.resistivity).toBe(294);
    expect(constantan.tcr).toBeCloseTo(0.014, 3);
  });

  it('should use manganin wire properties', () => {
    const manganin = commonWireTypes[1];
    expect(manganin.name).toContain('Manganin');
    expect(manganin.resistivity).toBe(290);
    expect(manganin.tcr).toBeCloseTo(0.0075, 3);
  });

  it('should use modified karma wire properties', () => {
    const modifiedKarma = commonWireTypes[2];
    expect(modifiedKarma.name).toContain('Modified Karma');
    expect(modifiedKarma.resistivity).toBe(800);
    expect(modifiedKarma.tcr).toBeCloseTo(0.01, 3);
  });

  it('should throw error with zero unbalance', () => {
    const constantan = commonWireTypes[0];
    const input: ZeroBalanceInput = {
      unbalance: 0,
      bridgeResistance: 120,
      wireType: constantan,
      awgGauge: 36,
      usUnits: true,
    };

    expect(() => calculateZeroBalance(input)).toThrow('Unbalance must be');
  });

  it('should throw error with excessive unbalance', () => {
    const constantan = commonWireTypes[0];
    const input: ZeroBalanceInput = {
      unbalance: 10000, // Too large
      bridgeResistance: 120,
      wireType: constantan,
      awgGauge: 36,
      usUnits: true,
    };

    expect(() => calculateZeroBalance(input)).toThrow('Unbalance must be');
  });

  it('should throw error with invalid bridge resistance', () => {
    const constantan = commonWireTypes[0];
    const input: ZeroBalanceInput = {
      unbalance: 100,
      bridgeResistance: 0,
      wireType: constantan,
      awgGauge: 36,
      usUnits: true,
    };

    expect(() => calculateZeroBalance(input)).toThrow('Bridge resistance must be');
  });

  it('should throw error with invalid AWG gauge', () => {
    const constantan = commonWireTypes[0];
    const input: ZeroBalanceInput = {
      unbalance: 100,
      bridgeResistance: 120,
      wireType: constantan,
      awgGauge: 25, // Too small
      usUnits: true,
    };

    expect(() => calculateZeroBalance(input)).toThrow('AWG gauge must be');
  });

  it('should convert Fahrenheit to Celsius', () => {
    expect(fahrenheitToCelsius(32)).toBeCloseTo(0, 2);
    expect(fahrenheitToCelsius(212)).toBeCloseTo(100, 2);
    expect(fahrenheitToCelsius(68)).toBeCloseTo(20, 2);
    expect(fahrenheitToCelsius(104)).toBeCloseTo(40, 2);
  });

  it('should adjust resistance for temperature', () => {
    const baseResistance = 100;
    const tcr = 0.014; // %/°C (Constantan)

    // Temperature increase
    const adjustedUp = adjustResistanceForTemperature(baseResistance, tcr, 10);
    expect(adjustedUp).toBeCloseTo(100.14, 2);

    // Temperature decrease
    const adjustedDown = adjustResistanceForTemperature(baseResistance, tcr, -10);
    expect(adjustedDown).toBeCloseTo(99.86, 2);

    // No temperature change
    const unchanged = adjustResistanceForTemperature(baseResistance, tcr, 0);
    expect(unchanged).toBeCloseTo(100, 5);
  });

  it('should calculate temperature compensated resistance', () => {
    // Base resistance at room temperature (25°C / 77°F)
    const baseResistance = 100;
    const baseTempF = 77; // 25°C
    const measTempF = 95; // 35°C
    const tcr = 0.014; // %/°C

    const result = getTemperatureCompensatedResistance(
      baseResistance,
      baseTempF,
      measTempF,
      tcr
    );

    // Temperature rise of 10°C should increase resistance
    expect(result).toBeGreaterThan(baseResistance);
    expect(result).toBeCloseTo(100.14, 2);
  });

  it('should handle different wire types in calculation', () => {
    const unbalance = 100;
    const bridgeResistance = 120;
    const awgGauge = 36;

    const resultConstantan = calculateZeroBalance({
      unbalance,
      bridgeResistance,
      wireType: commonWireTypes[0], // Constantan
      awgGauge,
      usUnits: true,
    });

    const resultModifiedKarma = calculateZeroBalance({
      unbalance,
      bridgeResistance,
      wireType: commonWireTypes[2], // Modified Karma
      awgGauge,
      usUnits: true,
    });

    // Same resistance needed (independent of wire type)
    expect(resultConstantan.resistanceNeeded).toBeCloseTo(resultModifiedKarma.resistanceNeeded, 2);
    
    // But wire lengths should differ due to different resistivity
    expect(resultConstantan.wireLength).not.toBeCloseTo(resultModifiedKarma.wireLength, 0);
    
    // Modified Karma has higher resistivity, so needs less wire length
    expect(resultConstantan.wireLength).toBeGreaterThan(resultModifiedKarma.wireLength);
  });

  it('should scale wire length with AWG gauge', () => {
    const constantan = commonWireTypes[0];
    const unbalance = 100;
    const bridgeResistance = 120;

    const result34 = calculateZeroBalance({
      unbalance,
      bridgeResistance,
      wireType: constantan,
      awgGauge: 34,
      usUnits: true,
    });

    const result40 = calculateZeroBalance({
      unbalance,
      bridgeResistance,
      wireType: constantan,
      awgGauge: 40,
      usUnits: true,
    });

    // AWG 34 has larger diameter, lower resistance/ft, so needs MORE length
    expect(result40.wireLength).toBeLessThan(result34.wireLength);
  });

  it('should return compensation TCR from wire type', () => {
    const constantan = commonWireTypes[0];
    const input: ZeroBalanceInput = {
      unbalance: 100,
      bridgeResistance: 120,
      wireType: constantan,
      awgGauge: 36,
      usUnits: true,
    };

    const result = calculateZeroBalance(input);

    expect(result.compensationTCR).toBe(constantan.tcr);
    expect(result.compensationTCR).toBeCloseTo(0.014, 3);
  });

  it('should handle small unbalance correctly', () => {
    const constantan = commonWireTypes[0];
    const input: ZeroBalanceInput = {
      unbalance: 0.5, // Very small unbalance
      bridgeResistance: 120,
      wireType: constantan,
      awgGauge: 36,
      usUnits: true,
    };

    const result = calculateZeroBalance(input);

    // Compensation = (0.5 / 1000) × 120 = 0.06 Ohms
    expect(result.resistanceNeeded).toBeCloseTo(0.06, 3);
  });

  it('should handle high resistance bridge', () => {
    const constantan = commonWireTypes[0];
    const input: ZeroBalanceInput = {
      unbalance: 100,
      bridgeResistance: 10000, // High resistance bridge
      wireType: constantan,
      awgGauge: 36,
      usUnits: true,
    };

    const result = calculateZeroBalance(input);

    // Compensation = (100 / 1000) × 10000 = 1000 Ohms
    expect(result.resistanceNeeded).toBeCloseTo(1000, 0);
  });
});
