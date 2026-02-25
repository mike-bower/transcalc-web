/**
 * Zero Balance Strain Gauge Bridge Compensation Module
 * Calculates compensation values needed to null out bridge unbalance
 * for accurate strain gauge measurements
 *
 * @module zeroBalance
 */

import { detectUnits, Unit } from './core';

export interface WireType {
  name: string;
  resistivity: number; // Ohms (using standard Ohms unit convention)
  tcr: number; // Temperature coefficient of resistance (%/°C)
}

export const commonWireTypes: WireType[] = [
  { name: 'Constantan (A Alloy)', resistivity: 294, tcr: 0.014 },
  { name: 'Manganin', resistivity: 290, tcr: 0.0075 },
  { name: 'Modified Karma (K Alloy)', resistivity: 800, tcr: 0.01 },
];

/**
 * Input parameters for zero balance compensation calculation
 */
export interface ZeroBalanceInput {
  /** Bridge unbalance voltage ratio (±0.5 to ±5000 mV/V) */
  unbalance: number;
  /** Initial bridge resistor value (1 to 10000 Ohms) */
  bridgeResistance: number;
  /** Wire type for compensation element */
  wireType: WireType;
  /** AWG gauge for wire (30-50) */
  awgGauge: number;
  /** Whether to use US units (inches) or SI (mm) */
  usUnits?: boolean;
}

/**
 * Result of zero balance compensation calculation
 */
export interface ZeroBalanceResult {
  /** Calculated compensation resistance (Ohms) */
  resistanceNeeded: number;
  /** Calculated bridge arm adjustment (Ohms) */
  bridgeArmValue: number;
  /** Recommended wire length based on gauge properties */
  wireLength: number;
  /** Unit for wire length (in or mm) */
  lengthUnit: string;
  /** Temperature coefficient of the compensation */
  compensationTCR: number;
  /** Whether input was valid */
  isValid: boolean;
}

/**
 * Wire gauge properties for calculation
 */
interface WireGaugeProperties {
  awg: number;
  diameterInches: number;
  circularMils: number;
}

/**
 * Wire gauge lookup table (AWG 30-50)
 */
const wireGaugeTable: WireGaugeProperties[] = [
  { awg: 30, diameterInches: 0.0100, circularMils: 100.0 },
  { awg: 31, diameterInches: 0.0089, circularMils: 79.21 },
  { awg: 32, diameterInches: 0.0080, circularMils: 64.00 },
  { awg: 33, diameterInches: 0.0071, circularMils: 50.41 },
  { awg: 34, diameterInches: 0.0063, circularMils: 39.69 },
  { awg: 35, diameterInches: 0.0056, circularMils: 31.36 },
  { awg: 36, diameterInches: 0.0050, circularMils: 25.00 },
  { awg: 37, diameterInches: 0.0045, circularMils: 20.25 },
  { awg: 38, diameterInches: 0.0040, circularMils: 16.00 },
  { awg: 39, diameterInches: 0.0035, circularMils: 12.25 },
  { awg: 40, diameterInches: 0.0031, circularMils: 9.61 },
  { awg: 41, diameterInches: 0.0028, circularMils: 7.84 },
  { awg: 42, diameterInches: 0.0025, circularMils: 6.25 },
  { awg: 43, diameterInches: 0.0022, circularMils: 5.84 },
  { awg: 44, diameterInches: 0.0020, circularMils: 4.00 },
  { awg: 45, diameterInches: 0.00176, circularMils: 3.10 },
  { awg: 46, diameterInches: 0.00157, circularMils: 2.47 },
  { awg: 47, diameterInches: 0.00140, circularMils: 1.96 },
  { awg: 48, diameterInches: 0.00124, circularMils: 1.54 },
  { awg: 49, diameterInches: 0.00111, circularMils: 1.23 },
  { awg: 50, diameterInches: 0.00099, circularMils: 0.980 },
];

/**
 * Validate zero balance input parameters
 */
function validateInput(input: ZeroBalanceInput): void {
  if (Math.abs(input.unbalance) < 0.001 || Math.abs(input.unbalance) > 5000) {
    throw new Error('Unbalance must be between ±0.001 and ±5000 mV/V');
  }

  if (
    input.bridgeResistance <= 0 ||
    input.bridgeResistance > 10000
  ) {
    throw new Error('Bridge resistance must be between 1 and 10000 Ohms');
  }

  if (input.awgGauge < 30 || input.awgGauge > 50) {
    throw new Error('AWG gauge must be between 30 and 50');
  }
}

/**
 * Get wire gauge properties from AWG number
 */
function getWireGaugeProperties(awgGauge: number): WireGaugeProperties {
  const gauge = wireGaugeTable.find((g) => g.awg === awgGauge);
  if (!gauge) {
    throw new Error(`AWG ${awgGauge} not found in wire gauge table`);
  }
  return gauge;
}

/**
 * Calculate the compensation resistance needed to null bridge unbalance
 *
 * For a Wheatstone bridge with unbalance U (mV/V) and bridge resistance R:
 * The compensation resistance = U × R / 1000
 * This represents the equivalent imbalance that must be compensated
 */
function calculateCompensationResistance(
  unbalance: number,
  bridgeResistance: number
): number {
  // Convert mV/V unbalance to fractional resistance ratio
  // Unbalance in mV/V means the unbalance is U mV per 1000 mV (1V)
  // So the fractional unbalance is U / 1000
  // Required compensation = Fractional unbalance × Bridge resistance
  return (Math.abs(unbalance) / 1000) * bridgeResistance;
}

/**
 * Calculate the bridge arm value for fine adjustment
 *
 * The bridge arm is typically a potentiometer or precision resistor
 * that allows fine adjustment of the compensation
 */
function calculateBridgeArmValue(
  unbalance: number,
  bridgeResistance: number
): number {
  // Bridge arm is the parallel combination approach
  // For small unbalances, bridge arm ≈ bridge resistance / (unbalance sensitivity)
  // Standard approach: bridge arm = bridge resistance / 2
  // Adjusted for unbalance magnitude
  const baseArm = bridgeResistance / 2;

  // Scale based on unbalance ratio (larger unbalance needs larger adjustment range)
  const unbalanceRatio = Math.abs(unbalance) / 1000;
  return baseArm * (1 + unbalanceRatio);
}

/**
 * Calculate zero balance compensation requirements
 *
 * Determines the resistance value and wire properties needed to
 * null out a bridge unbalance and the bridge arm setting required
 *
 * @example
 * ```typescript
 * const result = calculateZeroBalance({
 *   unbalance: 100,           // 100 mV/V unbalance
 *   bridgeResistance: 120,    // 120 Ohm bridge
 *   wireType: commonWireTypes[0], // Constantan
 *   awgGauge: 36,
 *   usUnits: true
 * });
 *
 * console.log(result.resistanceNeeded);  // ~12 Ohms
 * console.log(result.wireLength);        // ~1.2 feet
 * ```
 */
export function calculateZeroBalance(
  input: ZeroBalanceInput
): ZeroBalanceResult {
  validateInput(input);

  const usUnits = input.usUnits ?? true;
  const gauge = getWireGaugeProperties(input.awgGauge);

  // Calculate compensation resistance needed
  const resistanceNeeded = calculateCompensationResistance(
    input.unbalance,
    input.bridgeResistance
  );

  // Calculate bridge arm value
  const bridgeArmValue = calculateBridgeArmValue(
    input.unbalance,
    input.bridgeResistance
  );

  // Calculate wire length needed for compensation resistance
  // Resistance per unit length = Resistivity / CircularMils
  const resistancePerFoot = input.wireType.resistivity / gauge.circularMils;
  const lengthFeet = resistanceNeeded / resistancePerFoot;
  const wireLength = usUnits ? lengthFeet * 12 : lengthFeet * 304.8;
  const lengthUnit = usUnits ? 'in' : 'mm';

  return {
    resistanceNeeded: resistanceNeeded,
    bridgeArmValue: bridgeArmValue,
    wireLength: wireLength,
    lengthUnit: lengthUnit,
    compensationTCR: input.wireType.tcr,
    isValid: true,
  };
}

/**
 * Calculate the resistance at a different temperature using TCR
 *
 * R(T) = R₀ × (1 + TCR × ΔT) where TCR is in %/°C
 * TCR is expressed as a percentage, so divide by 100
 *
 * @example
 * ```typescript
 * const R25 = 100; // Resistance at 25°C
 * const TCR = 0.014; // %/°C
 * const dT = -10; // Temperature change of -10°C
 * const R15 = adjustResistanceForTemperature(R25, TCR, dT);
 * // R15 ≈ 99.86 Ohms
 * ```
 */
export function adjustResistanceForTemperature(
  baseResistance: number,
  tcr: number,
  temperatureChange: number
): number {
  // TCR is in %/°C, convert to decimal
  const tcrDecimal = tcr / 100;
  return baseResistance * (1 + tcrDecimal * temperatureChange);
}

/**
 * Convert Fahrenheit to Celsius
 *
 * T(°C) = (T(°F) - 32) × 5/9
 */
export function fahrenheitToCelsius(fahrenheit: number): number {
  return ((fahrenheit - 32) * 5) / 9;
}

/**
 * Calculate temperature-compensated resistance
 *
 * Combines temperature conversion and resistance adjustment
 * Useful for predicting wire resistance at measurement conditions
 */
export function getTemperatureCompensatedResistance(
  baseResistance: number,
  baseTempF: number,
  measTempF: number,
  tcr: number
): number {
  const baseTempC = fahrenheitToCelsius(baseTempF);
  const measTempC = fahrenheitToCelsius(measTempF);
  const tempChange = measTempC - baseTempC;
  return adjustResistanceForTemperature(baseResistance, tcr, tempChange);
}

