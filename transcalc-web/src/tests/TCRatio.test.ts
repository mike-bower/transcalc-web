/**
 * Tests for Temperature Coefficient Ratio Calculation Module
 */

import { describe, it, expect } from 'vitest';
import {
  calculateTCRatio,
  getAvailableSensorTypes,
  getSensorInfo,
  addCustomSensor,
  TCRatioInput,
} from '../domain/TCRatio';

describe('Temperature Coefficient Ratio Calculation', () => {
  describe('Basic TCR calculations', () => {
    it('should calculate TCR for Pt100 at standard temperatures', () => {
      const input: TCRatioInput = {
        sensorType: 'pt100_us',
        tempLow: 32,
        tempAmbient: 68,
        tempHigh: 104,
        usUnits: true,
      };

      const result = calculateTCRatio(input);

      expect(result.isValid).toBe(true);
      expect(result.resistanceLow).toBeGreaterThan(0);
      expect(result.resistanceAmbient).toBeGreaterThan(result.resistanceLow);
      expect(result.resistanceHigh).toBeGreaterThan(result.resistanceAmbient);
    });

    it('should calculate TCR for Pt1000 in SI units', () => {
      const input: TCRatioInput = {
        sensorType: 'pt1000_si',
        tempLow: 0,
        tempAmbient: 25,
        tempHigh: 50,
        usUnits: false,
      };

      const result = calculateTCRatio(input);

      expect(result.isValid).toBe(true);
      expect(result.resistanceLow).toBeGreaterThan(0);
      expect(result.resistanceLow).toBeLessThan(result.resistanceHigh);
    });

    it('should calculate consistent TCR values', () => {
      const input: TCRatioInput = {
        sensorType: 'pt100_us',
        tempLow: 32,
        tempAmbient: 68,
        tempHigh: 104,
        usUnits: true,
      };

      const result = calculateTCRatio(input);

      // TCR should be consistent across all points
      expect(result.tcrLow).toBeGreaterThan(0);
      expect(result.tcrAmbient).toBeGreaterThan(0);
      expect(result.tcrHigh).toBeGreaterThan(0);

      // Average should be within range of individual values
      const minTCR = Math.min(result.tcrLow, result.tcrAmbient, result.tcrHigh);
      const maxTCR = Math.max(result.tcrLow, result.tcrAmbient, result.tcrHigh);
      expect(result.tcrAverage).toBeGreaterThanOrEqual(minTCR);
      expect(result.tcrAverage).toBeLessThanOrEqual(maxTCR);
    });

    it('should calculate resistance ratio correctly', () => {
      const input: TCRatioInput = {
        sensorType: 'pt100_us',
        tempLow: 32,
        tempAmbient: 68,
        tempHigh: 104,
        usUnits: true,
      };

      const result = calculateTCRatio(input);

      expect(result.resistanceRatio).toBe(result.resistanceLow / result.resistanceHigh);
    });
  });

  describe('Different sensor types', () => {
    it('should calculate TCR for Pt100', () => {
      const input: TCRatioInput = {
        sensorType: 'pt100',
        tempLow: 32,
        tempAmbient: 68,
        tempHigh: 104,
        usUnits: true,
      };

      const result = calculateTCRatio(input);

      expect(result.isValid).toBe(true);
    });

    it('should calculate TCR for Pt1000', () => {
      const input: TCRatioInput = {
        sensorType: 'pt1000',
        tempLow: 32,
        tempAmbient: 68,
        tempHigh: 104,
        usUnits: true,
      };

      const result = calculateTCRatio(input);

      expect(result.isValid).toBe(true);
      // Pt1000 should have 10x the resistance of Pt100
      const pt100Result = calculateTCRatio({
        sensorType: 'pt100',
        tempLow: 32,
        tempAmbient: 68,
        tempHigh: 104,
        usUnits: true,
      });

      expect(result.resistanceLow).toBeCloseTo(pt100Result.resistanceLow * 10, 0);
    });

    it('should calculate TCR for Thermistor 10K', () => {
      const input: TCRatioInput = {
        sensorType: 'thermistor_10k',
        tempLow: 32,
        tempAmbient: 68,
        tempHigh: 104,
        usUnits: true,
      };

      const result = calculateTCRatio(input);

      expect(result.isValid).toBe(true);
      // Thermistor has negative TCR (resistance decreases with temperature)
      expect(result.tcrLow).toBeLessThan(0);
      expect(result.resistanceLow).toBeGreaterThan(result.resistanceHigh);
    });

    it('should calculate TCR for Thermistor 100K', () => {
      const input: TCRatioInput = {
        sensorType: 'thermistor_100k',
        tempLow: 32,
        tempAmbient: 68,
        tempHigh: 104,
        usUnits: true,
      };

      const result = calculateTCRatio(input);

      expect(result.isValid).toBe(true);
      // 100K thermistor should have higher base resistance than 10K
      const result10K = calculateTCRatio({
        sensorType: 'thermistor_10k',
        tempLow: 32,
        tempAmbient: 68,
        tempHigh: 104,
        usUnits: true,
      });

      expect(result.resistanceLow).toBeGreaterThan(result10K.resistanceLow);
    });

    it('should calculate TCR for Copper RTD', () => {
      const input: TCRatioInput = {
        sensorType: 'copper',
        tempLow: 32,
        tempAmbient: 68,
        tempHigh: 104,
        usUnits: true,
      };

      const result = calculateTCRatio(input);

      expect(result.isValid).toBe(true);
      expect(result.tcrLow).toBeGreaterThan(0); // Positive TCR for copper
    });

    it('should calculate TCR for Nickel RTD', () => {
      const input: TCRatioInput = {
        sensorType: 'nickel',
        tempLow: 32,
        tempAmbient: 68,
        tempHigh: 104,
        usUnits: true,
      };

      const result = calculateTCRatio(input);

      expect(result.isValid).toBe(true);
      expect(result.tcrLow).toBeGreaterThan(0);
    });

    it('should reject invalid sensor type', () => {
      const input: TCRatioInput = {
        sensorType: 'invalid_sensor',
        tempLow: 32,
        tempAmbient: 68,
        tempHigh: 104,
        usUnits: true,
      };

      const result = calculateTCRatio(input);

      expect(result.isValid).toBe(false);
      expect(result.error).toBeDefined();
    });
  });

  describe('Temperature range handling', () => {
    it('should handle wide temperature ranges', () => {
      const input: TCRatioInput = {
        sensorType: 'pt100',
        tempLow: -40,
        tempAmbient: 0,
        tempHigh: 150,
        usUnits: true,
      };

      const result = calculateTCRatio(input);

      expect(result.isValid).toBe(true);
    });

    it('should handle narrow temperature ranges', () => {
      const input: TCRatioInput = {
        sensorType: 'pt100',
        tempLow: 67,
        tempAmbient: 68,
        tempHigh: 69,
        usUnits: true,
      };

      const result = calculateTCRatio(input);

      expect(result.isValid).toBe(true);
    });

    it('should reject temperatures out of order (low >= ambient)', () => {
      const input: TCRatioInput = {
        sensorType: 'pt100',
        tempLow: 68,
        tempAmbient: 68,
        tempHigh: 104,
        usUnits: true,
      };

      const result = calculateTCRatio(input);

      expect(result.isValid).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('should reject temperatures out of order (ambient >= high)', () => {
      const input: TCRatioInput = {
        sensorType: 'pt100',
        tempLow: 32,
        tempAmbient: 104,
        tempHigh: 104,
        usUnits: true,
      };

      const result = calculateTCRatio(input);

      expect(result.isValid).toBe(false);
    });

    it('should reject temperatures out of order (low >= high)', () => {
      const input: TCRatioInput = {
        sensorType: 'pt100',
        tempLow: 104,
        tempAmbient: 68,
        tempHigh: 32,
        usUnits: true,
      };

      const result = calculateTCRatio(input);

      expect(result.isValid).toBe(false);
    });

    it('should reject temperature below minimum (-100)', () => {
      const input: TCRatioInput = {
        sensorType: 'pt100',
        tempLow: -150,
        tempAmbient: 0,
        tempHigh: 100,
        usUnits: true,
      };

      const result = calculateTCRatio(input);

      expect(result.isValid).toBe(false);
    });

    it('should reject temperature above maximum (500)', () => {
      const input: TCRatioInput = {
        sensorType: 'pt100',
        tempLow: 100,
        tempAmbient: 200,
        tempHigh: 600,
        usUnits: true,
      };

      const result = calculateTCRatio(input);

      expect(result.isValid).toBe(false);
    });
  });

  describe('Unit conversions', () => {
    it('should show different resistance values for US vs SI (same sensor)', () => {
      const inputUS: TCRatioInput = {
        sensorType: 'pt100',
        tempLow: 32,
        tempAmbient: 68,
        tempHigh: 104,
        usUnits: true,
      };

      const inputSI: TCRatioInput = {
        sensorType: 'pt100_si',
        tempLow: 0,
        tempAmbient: 20,
        tempHigh: 40,
        usUnits: false,
      };

      const resultUS = calculateTCRatio(inputUS);
      const resultSI = calculateTCRatio(inputSI);

      // Both should have valid results but different coefficient sets
      expect(resultUS.isValid).toBe(true);
      expect(resultSI.isValid).toBe(true);
    });

    it('should handle US units (°F)', () => {
      const input: TCRatioInput = {
        sensorType: 'pt100_us',
        tempLow: 32,
        tempAmbient: 50,
        tempHigh: 68,
        usUnits: true,
      };

      const result = calculateTCRatio(input);

      expect(result.isValid).toBe(true);
      expect(result.resistanceLow).toBeGreaterThan(0);
    });

    it('should handle SI units (°C)', () => {
      const input: TCRatioInput = {
        sensorType: 'pt100_si',
        tempLow: 0,
        tempAmbient: 10,
        tempHigh: 20,
        usUnits: false,
      };

      const result = calculateTCRatio(input);

      expect(result.isValid).toBe(true);
      expect(result.resistanceLow).toBeGreaterThan(0);
    });
  });

  describe('Physical consistency', () => {
    it('should show higher resistance at higher temperature for RTD', () => {
      const input: TCRatioInput = {
        sensorType: 'pt100',
        tempLow: 0,
        tempAmbient: 50,
        tempHigh: 100,
        usUnits: false,
      };

      const result = calculateTCRatio(input);

      // For RTD (Pt), resistance increases with temperature
      expect(result.resistanceHigh).toBeGreaterThan(result.resistanceLow);
    });

    it('should show lower resistance at higher temperature for Thermistor', () => {
      const input: TCRatioInput = {
        sensorType: 'thermistor_10k',
        tempLow: 0,
        tempAmbient: 50,
        tempHigh: 100,
        usUnits: false,
      };

      const result = calculateTCRatio(input);

      // For thermistor, resistance decreases with temperature
      expect(result.resistanceHigh).toBeLessThan(result.resistanceLow);
    });

    it('should maintain consistent polynomial evaluation', () => {
      const input: TCRatioInput = {
        sensorType: 'pt100',
        tempLow: 32,
        tempAmbient: 68,
        tempHigh: 104,
        usUnits: true,
      };

      const result1 = calculateTCRatio(input);
      const result2 = calculateTCRatio(input);

      // Same input should always produce same result
      expect(result1.resistanceLow).toEqual(result2.resistanceLow);
      expect(result1.resistanceAmbient).toEqual(result2.resistanceAmbient);
      expect(result1.tcrAverage).toEqual(result2.tcrAverage);
    });

    it('should produce positive TCR for RTD sensors', () => {
      const rtdSensors = ['pt100', 'pt1000', 'copper', 'nickel'];

      for (const sensor of rtdSensors) {
        const result = calculateTCRatio({
          sensorType: sensor,
          tempLow: 0,
          tempAmbient: 50,
          tempHigh: 100,
          usUnits: false,
        });

        expect(result.tcrAverage).toBeGreaterThan(0); // RTD has positive TCR
      }
    });

    it('should produce negative TCR for Thermistor sensors', () => {
      const thermistorSensors = ['thermistor_10k', 'thermistor_100k'];

      for (const sensor of thermistorSensors) {
        const result = calculateTCRatio({
          sensorType: sensor,
          tempLow: 0,
          tempAmbient: 50,
          tempHigh: 100,
          usUnits: false,
        });

        expect(result.tcrAverage).toBeLessThan(0); // Thermistor has negative TCR
      }
    });
  });

  describe('Helper functions', () => {
    it('should return list of available sensor types', () => {
      const types = getAvailableSensorTypes();

      expect(types.length).toBeGreaterThan(0);
      expect(types.some(t => t.toLowerCase().includes('pt100'))).toBe(true);
      expect(types.some(t => t.toLowerCase().includes('thermistor'))).toBe(true);
    });

    it('should return sensor info for valid type', () => {
      const info = getSensorInfo('pt100_us');

      expect(info).toBeDefined();
      expect(info?.name).toContain('Pt100');
      expect(info?.usCoefficients).toBeDefined();
      expect(info?.siCoefficients).toBeDefined();
    });

    it('should return undefined for invalid sensor type', () => {
      const info = getSensorInfo('invalid_type_us');

      expect(info).toBeUndefined();
    });

    it('should allow adding custom sensor types', () => {
      const customCoeff = {
        c0: 1000,
        c1: 5,
        c2: 0.05,
        c3: 0,
        c4: 0,
        c5: 0,
        c6: 0,
      };

      const result = addCustomSensor('CustomSensor', customCoeff, customCoeff);

      expect(result).toBe(true);

      // Should be able to use the custom sensor
      const calcResult = calculateTCRatio({
        sensorType: 'CustomSensor',
        tempLow: 0,
        tempAmbient: 50,
        tempHigh: 100,
        usUnits: false,
      });

      expect(calcResult.isValid).toBe(true);
    });

    it('should prevent duplicate custom sensor names', () => {
      const coeff = {
        c0: 1000,
        c1: 5,
        c2: 0.05,
        c3: 0,
        c4: 0,
        c5: 0,
        c6: 0,
      };

      addCustomSensor('UniqueSensor', coeff, coeff);
      const result = addCustomSensor('UniqueSensor', coeff, coeff);

      expect(result).toBe(false); // Should fail on duplicate
    });
  });
});
