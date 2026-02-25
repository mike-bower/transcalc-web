/**
 * Zero Balance Wire Resistance Module
 * Calculates wire length needed for zero balance compensation using standard wire tables
 */

/**
 * Standard wire gauge properties for zero balance compensation
 */
interface WireProperties {
  /** AWG (American Wire Gauge) number */
  awg: number;
  
  /** Diameter in inches */
  diameterInches: number;
  
  /** Diameter in mm */
  diameterMm: number;
  
  /** Circular mils */
  circularMils: number;
}

/**
 * Wire type with resistivity and temperature coefficient
 */
export interface WireType {
  /** Wire type name (e.g., "Constantan", "Manganin") */
  name: string;
  
  /** Resistivity in Ohms/cmil/ft */
  resistivity: number;
  
  /** Temperature coefficient of resistance in %/°F */
  temperatureCoefficientF: number;
  
  /** Temperature coefficient in %/°C */
  temperatureCoefficientC: number;
}

/**
 * Input for zero balance wire length calculation
 */
export interface ZeroBalanceWireInput {
  /** Target resistance in Ohms */
  targetResistance: number;
  
  /** Wire type */
  wireType: WireType;
  
  /** AWG gauge number (30-50) */
  awgGauge: number;
  
  /** Whether to use US units (inches) or SI (mm) */
  usUnits?: boolean;
}

/**
 * Results from zero balance wire calculation
 */
export interface ZeroBalanceWireResult {
  /** Required wire length in inches or mm */
  wireLength: number;
  
  /** Actual resistance at selected gauge */
  actualResistance: number;
  
  /** Wire diameter at selected gauge */
  wireDiameter: number;
  
  /** Unit of length (in or mm) */
  lengthUnit: string;
  
  /** Input validation status */
  isValid: boolean;
}

/**
 * Standard wire gauge table (AWG 30-50)
 */
const wireGaugeTable: WireProperties[] = [
  { awg: 30, diameterInches: 0.0100, diameterMm: 0.254, circularMils: 100.0 },
  { awg: 31, diameterInches: 0.0089, diameterMm: 0.226, circularMils: 79.21 },
  { awg: 32, diameterInches: 0.0080, diameterMm: 0.203, circularMils: 64.00 },
  { awg: 33, diameterInches: 0.0071, diameterMm: 0.180, circularMils: 50.41 },
  { awg: 34, diameterInches: 0.0063, diameterMm: 0.160, circularMils: 39.69 },
  { awg: 35, diameterInches: 0.0056, diameterMm: 0.142, circularMils: 31.36 },
  { awg: 36, diameterInches: 0.0050, diameterMm: 0.127, circularMils: 25.00 },
  { awg: 37, diameterInches: 0.0045, diameterMm: 0.114, circularMils: 20.25 },
  { awg: 38, diameterInches: 0.0040, diameterMm: 0.102, circularMils: 16.00 },
  { awg: 39, diameterInches: 0.0035, diameterMm: 0.089, circularMils: 12.25 },
  { awg: 40, diameterInches: 0.0031, diameterMm: 0.079, circularMils: 9.61 },
  { awg: 41, diameterInches: 0.0028, diameterMm: 0.071, circularMils: 7.84 },
  { awg: 42, diameterInches: 0.0025, diameterMm: 0.063, circularMils: 6.25 },
  { awg: 43, diameterInches: 0.0022, diameterMm: 0.056, circularMils: 4.84 },
  { awg: 44, diameterInches: 0.0020, diameterMm: 0.051, circularMils: 4.00 },
  { awg: 45, diameterInches: 0.00176, diameterMm: 0.045, circularMils: 3.10 },
  { awg: 46, diameterInches: 0.00157, diameterMm: 0.040, circularMils: 2.47 },
  { awg: 47, diameterInches: 0.00140, diameterMm: 0.036, circularMils: 1.96 },
  { awg: 48, diameterInches: 0.00124, diameterMm: 0.031, circularMils: 1.54 },
  { awg: 49, diameterInches: 0.00111, diameterMm: 0.028, circularMils: 1.23 },
  { awg: 50, diameterInches: 0.00099, diameterMm: 0.025, circularMils: 0.980 },
];

/**
 * Common wire types used for zero balance compensation
 */
export const commonWireTypes: WireType[] = [
  {
    name: 'Constantan (A Alloy)',
    resistivity: 295.0,
    temperatureCoefficientF: 0.008,
    temperatureCoefficientC: 0.014,
  },
  {
    name: 'Manganin',
    resistivity: 286.0,
    temperatureCoefficientF: 0.001,
    temperatureCoefficientC: 0.002,
  },
  {
    name: 'Modified Karma (K Alloy)',
    resistivity: 765.0,
    temperatureCoefficientF: 0.002,
    temperatureCoefficientC: 0.004,
  },
];

/**
 * Validates zero balance wire input
 */
function validateInput(input: ZeroBalanceWireInput): void {
  if (input.targetResistance <= 0) {
    throw new Error('Target resistance must be positive');
  }
  if (input.awgGauge < 30 || input.awgGauge > 50) {
    throw new Error('AWG gauge must be between 30 and 50');
  }
  if (!input.wireType) {
    throw new Error('Wire type must be specified');
  }
}

/**
 * Finds wire gauge properties by AWG number
 */
function getWireGaugeProperties(awg: number): WireProperties {
  const gauge = wireGaugeTable.find(w => w.awg === awg);
  if (!gauge) {
    throw new Error(`AWG ${awg} not found in wire gauge table`);
  }
  return gauge;
}

/**
 * Calculates required wire length for zero balance compensation
 * 
 * Formula:
 * - Resistance per unit length = Resistivity / Circular Mils
 * - Required Length = Target Resistance / Resistance per unit length
 * 
 * @param input Zero balance wire input parameters
 * @returns Calculated wire length and properties
 */
export function calculateZeroBalanceWireLength(
  input: ZeroBalanceWireInput
): ZeroBalanceWireResult {
  try {
    validateInput(input);
    
    const usUnits = input.usUnits ?? true;
    const gauge = getWireGaugeProperties(input.awgGauge);
    
    // Calculate resistance per unit length
    // Resistivity is in Ohms/cmil/ft, so divide by circular mils to get Ohms/ft
    const resistancePerFootFt = input.wireType.resistivity / gauge.circularMils;
    
    // Calculate required length in feet
    const lengthFeet = input.targetResistance / resistancePerFootFt;
    
    // Convert to inches or mm
    let wireLength: number;
    let lengthUnit: string;
    
    if (usUnits) {
      wireLength = lengthFeet * 12; // Convert to inches
      lengthUnit = 'in';
    } else {
      wireLength = lengthFeet * 304.8; // Convert to mm (1 ft = 304.8 mm)
      lengthUnit = 'mm';
    }
    
    // For output, report the actual diameter in appropriate units
    const wireDiameter = usUnits ? gauge.diameterInches : gauge.diameterMm;
    
    // Calculate actual resistance achieved
    const actualResistance = resistancePerFootFt * lengthFeet;
    
    return {
      wireLength: Math.round(wireLength * 1000) / 1000, // Round to 3 decimals
      actualResistance: Math.round(actualResistance * 10000) / 10000,
      wireDiameter: wireDiameter,
      lengthUnit: lengthUnit,
      isValid: true,
    };
  } catch (error) {
    throw error;
  }
}

/**
 * Converts Fahrenheit to Celsius
 */
export function fahrenheitToCelsius(f: number): number {
  return (f - 32) * (5 / 9);
}

/**
 * Adjusts resistance for temperature change
 * 
 * Formula:
 * R(T) = R0 × (1 + TCR × ΔT)
 * 
 * @param baseResistance Base resistance at reference temperature
 * @param temperatureCoefficientPerCelsius TCR in %/°C
 * @param temperatureChangeC Temperature change in °C
 * @returns Adjusted resistance
 */
export function adjustResistanceForTemperature(
  baseResistance: number,
  temperatureCoefficientPerCelsius: number,
  temperatureChangeC: number
): number {
  const tcr = temperatureCoefficientPerCelsius / 100; // Convert percentage to decimal
  return baseResistance * (1 + tcr * temperatureChangeC);
}
