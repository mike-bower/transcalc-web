/**
 * Wire 3-Point Span vs Temperature Calculation Module
 *
 * Calculates wire span (length) based on resistance and wire type.
 * Uses 3-point wire gauge table with extended AWG range (10-50).
 *
 * @module wire3pt
 */

/**
 * Wire gauge table entry with AWG, diameter, and circular mils
 */
interface WireTableEntry {
  awg: number;
  diameterInches: number;
  circularMils: number;
}

/**
 * Wire type with material properties
 */
interface WireType {
  name: string;
  resistivityOhmsPerFtAt68F: number;
  temperatureCoefficientPercent: number;
}

/**
 * Input parameters for wire 3-point span calculation
 */
export interface Wire3PtInput {
  /** Resistance in Ohms */
  resistance: number;
  /** Wire resistivity type: 'balco' | 'copper' | 'nickel' | 'advance' | 'constantan' | 'nichrome' */
  wireType: string;
  /** Wire gauge (AWG 10-50) */
  awg: number;
  /** True for US units (inches), false for metric (mm) */
  usUnits: boolean;
}

/**
 * Output result from wire 3-point span calculation
 */
export interface Wire3PtResult {
  /** Span/length in inches (US) or mm (SI) */
  span: number;
  /** Wire diameter in inches (US) or mm (SI) */
  diameter: number;
  /** Calculated resistivity per unit length */
  resistivity: number;
  /** Circular mils of the wire */
  circularMils: number;
  /** Whether the calculation is valid */
  isValid: boolean;
  /** Error message if invalid */
  error?: string;
}

/**
 * Wire gauge table: AWG 10-50 (extended range for 3-point calibration)
 */
const WIRE_TABLE: WireTableEntry[] = [
  { awg: 10, diameterInches: 0.1019, circularMils: 10380 },
  { awg: 11, diameterInches: 0.0907, circularMils: 8230 },
  { awg: 12, diameterInches: 0.0808, circularMils: 6530 },
  { awg: 13, diameterInches: 0.072, circularMils: 5190 },
  { awg: 14, diameterInches: 0.0641, circularMils: 4110 },
  { awg: 15, diameterInches: 0.0571, circularMils: 3260 },
  { awg: 16, diameterInches: 0.0508, circularMils: 2580 },
  { awg: 17, diameterInches: 0.0453, circularMils: 2050 },
  { awg: 18, diameterInches: 0.0403, circularMils: 1620 },
  { awg: 19, diameterInches: 0.0359, circularMils: 1290 },
  { awg: 20, diameterInches: 0.032, circularMils: 1020 },
  { awg: 21, diameterInches: 0.0285, circularMils: 812 },
  { awg: 22, diameterInches: 0.0253, circularMils: 640 },
  { awg: 23, diameterInches: 0.0226, circularMils: 510 },
  { awg: 24, diameterInches: 0.0201, circularMils: 404 },
  { awg: 25, diameterInches: 0.0179, circularMils: 320 },
  { awg: 26, diameterInches: 0.0159, circularMils: 253 },
  { awg: 27, diameterInches: 0.0142, circularMils: 202 },
  { awg: 28, diameterInches: 0.0126, circularMils: 158.8 },
  { awg: 29, diameterInches: 0.0113, circularMils: 127.7 },
  { awg: 30, diameterInches: 0.01, circularMils: 100.0 },
  { awg: 31, diameterInches: 0.0089, circularMils: 79.21 },
  { awg: 32, diameterInches: 0.008, circularMils: 64.0 },
  { awg: 33, diameterInches: 0.0071, circularMils: 50.41 },
  { awg: 34, diameterInches: 0.0063, circularMils: 39.69 },
  { awg: 35, diameterInches: 0.0056, circularMils: 31.36 },
  { awg: 36, diameterInches: 0.005, circularMils: 25.0 },
  { awg: 37, diameterInches: 0.0045, circularMils: 20.25 },
  { awg: 38, diameterInches: 0.004, circularMils: 16.0 },
  { awg: 39, diameterInches: 0.0035, circularMils: 12.25 },
  { awg: 40, diameterInches: 0.0031, circularMils: 9.61 },
  { awg: 41, diameterInches: 0.0028, circularMils: 7.84 },
  { awg: 42, diameterInches: 0.0025, circularMils: 6.25 },
  { awg: 43, diameterInches: 0.0022, circularMils: 5.84 },
  { awg: 44, diameterInches: 0.002, circularMils: 4.0 },
  { awg: 45, diameterInches: 0.00176, circularMils: 3.1 },
  { awg: 46, diameterInches: 0.00157, circularMils: 2.47 },
  { awg: 47, diameterInches: 0.0014, circularMils: 1.96 },
  { awg: 48, diameterInches: 0.00124, circularMils: 1.54 },
  { awg: 49, diameterInches: 0.00111, circularMils: 1.23 },
  { awg: 50, diameterInches: 0.00099, circularMils: 0.98 },
];

/**
 * Wire type definitions with resistivity and TCR values at 68°F
 */
const WIRE_TYPES: Record<string, WireType> = {
  balco: {
    name: 'Balco',
    resistivityOhmsPerFtAt68F: 120.0,
    temperatureCoefficientPercent: 0.25,
  },
  copper: {
    name: 'Copper',
    resistivityOhmsPerFtAt68F: 10.371,
    temperatureCoefficientPercent: 0.22,
  },
  nickel: {
    name: 'Nickel (Pure)',
    resistivityOhmsPerFtAt68F: 45.0,
    temperatureCoefficientPercent: 0.33,
  },
  advance: {
    name: 'Advance',
    resistivityOhmsPerFtAt68F: 49.02,
    temperatureCoefficientPercent: 0.11,
  },
  constantan: {
    name: 'Constantan',
    resistivityOhmsPerFtAt68F: 90.0,
    temperatureCoefficientPercent: 0.02,
  },
  nichrome: {
    name: 'Nichrome',
    resistivityOhmsPerFtAt68F: 650.0,
    temperatureCoefficientPercent: 0.04,
  },
};

/**
 * Convert inches to millimeters
 */
function inchesToMm(inches: number): number {
  return inches * 25.4;
}

/**
 * Find wire table entry by AWG number
 */
function findWireEntry(awg: number): WireTableEntry | undefined {
  return WIRE_TABLE.find(entry => entry.awg === awg);
}

/**
 * Calculate wire span from resistance using wire type and gauge
 *
 * Formula: Span = Resistance / Resistivity
 *
 * @param input - Input parameters
 * @returns Calculation result with span and diagnostics
 */
export function calculateWire3Pt(input: Wire3PtInput): Wire3PtResult {
  // Validate inputs
  if (input.resistance < 0.01 || input.resistance > 1000) {
    return {
      span: 0,
      diameter: 0,
      resistivity: 0,
      circularMils: 0,
      isValid: false,
      error: `Resistance must be between 0.01 and 1000 Ohms, got ${input.resistance}`,
    };
  }

  if (input.awg < 10 || input.awg > 50) {
    return {
      span: 0,
      diameter: 0,
      resistivity: 0,
      circularMils: 0,
      isValid: false,
      error: `AWG must be between 10 and 50, got ${input.awg}`,
    };
  }

  const wireType = WIRE_TYPES[input.wireType.toLowerCase()];
  if (!wireType) {
    const validTypes = Object.keys(WIRE_TYPES).join(', ');
    return {
      span: 0,
      diameter: 0,
      resistivity: 0,
      circularMils: 0,
      isValid: false,
      error: `Invalid wire type '${input.wireType}'. Valid types: ${validTypes}`,
    };
  }

  const wireEntry = findWireEntry(input.awg);
  if (!wireEntry) {
    return {
      span: 0,
      diameter: 0,
      resistivity: 0,
      circularMils: 0,
      isValid: false,
      error: `Wire gauge AWG ${input.awg} not found in table`,
    };
  }

  // Get base resistivity (Ohms/ft at 68°F)
  let resistivityPerUnitLength = wireType.resistivityOhmsPerFtAt68F;
  let diameterResult = wireEntry.diameterInches;
  let spanResult: number;

  if (input.usUnits) {
    // US units: resistivity in Ohms/ft, span in feet
    spanResult = input.resistance / resistivityPerUnitLength;
  } else {
    // SI units: convert resistivity to Ohms/m, span will be in meters
    // 1 meter = 3.28084 feet, so Ohms/m = Ohms/ft / 0.3048
    const resistivityOhmsPerMeter = resistivityPerUnitLength / 0.3048;
    spanResult = input.resistance / resistivityOhmsPerMeter; // Result in meters
    spanResult = spanResult * 1000; // Convert meters to mm
    diameterResult = inchesToMm(diameterResult);
    resistivityPerUnitLength = resistivityOhmsPerMeter; // Store SI resistivity for output
  }

  return {
    span: spanResult,
    diameter: diameterResult,
    resistivity: resistivityPerUnitLength,
    circularMils: wireEntry.circularMils,
    isValid: true,
  };
}

/**
 * Get available wire types
 */
export function getWireTypes(): string[] {
  return Object.keys(WIRE_TYPES).map(key => WIRE_TYPES[key].name);
}

/**
 * Get available AWG values
 */
export function getAvailableAWG(): number[] {
  return WIRE_TABLE.map(entry => entry.awg);
}

/**
 * Get wire resistivity for a given type
 */
export function getWireResistivity(wireType: string): number | undefined {
  const type = WIRE_TYPES[wireType.toLowerCase()];
  return type?.resistivityOhmsPerFtAt68F;
}

/**
 * Get wire diameter for a given AWG
 */
export function getWireDiameter(awg: number, usUnits: boolean = true): number | undefined {
  const entry = findWireEntry(awg);
  if (!entry) return undefined;
  return usUnits ? entry.diameterInches : inchesToMm(entry.diameterInches);
}

/**
 * Get wire resistance per unit length for a given wire type
 */
export function getWireResistancePerLength(
  wireType: string,
  usUnits: boolean = true
): number | undefined {
  const resistance = getWireResistivity(wireType);
  if (!resistance) return undefined;
  // Convert from Ohms/ft to Ohms/ft (US) or Ohms/m (SI)
  return usUnits ? resistance : resistance / 0.3048;
}
