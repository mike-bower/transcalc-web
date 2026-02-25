/**
 * Wire Table Optimization (Zero vs. Temperature) Module
 *
 * Calculates wire resistance or span length for temperature-compensated
 * wire tables used in strain gauge circuits.
 *
 * @module wireOpt
 */

/**
 * Supported wire types for optimization calculations
 */
export type WireType =
  | 'balco'
  | 'copper'
  | 'nickel'
  | 'advance'
  | 'constantan'
  | 'manganin'
  | 'modified_karma'
  | 'nickel_pure';

/**
 * Wire definition with material properties
 */
interface Wire {
  name: string;
  resistivity: number; // Ohms per inch US or per mm SI
  tcr: number; // Temperature coefficient of resistance
}

/**
 * Wire material database with resistivity and TCR values
 */
const WIRE_DATABASE: Record<WireType, Wire> = {
  balco: {
    name: 'Balco',
    resistivity: 15,
    tcr: 0.00004,
  },
  copper: {
    name: 'Copper',
    resistivity: 10.37,
    tcr: 0.00393,
  },
  nickel: {
    name: 'Nickel',
    resistivity: 36,
    tcr: 0.006,
  },
  advance: {
    name: 'Advance',
    resistivity: 290,
    tcr: 0.000015,
  },
  constantan: {
    name: 'Constantan',
    resistivity: 295,
    tcr: 0.000008,
  },
  manganin: {
    name: 'Manganin',
    resistivity: 290,
    tcr: 0.000015,
  },
  modified_karma: {
    name: 'Modified Karma (K Alloy)',
    resistivity: 800,
    tcr: 0.00002,
  },
  nickel_pure: {
    name: 'Nickel, pure',
    resistivity: 45,
    tcr: 0.33,
  },
};

/**
 * Input parameters for wire table calculation
 */
export interface WireOptInput {
  /** Wire type selection */
  wireType: WireType;
  /** Unit system: 'us' or 'si' */
  units: 'us' | 'si';
  /** Solve for: 'length' or 'resistance' */
  solveFor: 'length' | 'resistance';
  /** Input value (resistance in Ohms or length in inches US / mm SI) */
  value: number;
}

/**
 * Result of wire optimization calculation
 */
export interface WireOptResult {
  /** Calculated length (inches US or mm SI) */
  length?: number;
  /** Calculated resistance (Ohms) */
  resistance?: number;
  /** Whether calculation was successful */
  success: boolean;
  /** Error message if calculation failed */
  error?: string;
}

/**
 * Validate input parameters
 *
 * @param input - Input parameters
 * @returns Validation result
 */
function validateInput(input: WireOptInput): {
  valid: boolean;
  error?: string;
} {
  const { wireType, units, solveFor, value } = input;

  // Validate wire type
  if (!(wireType in WIRE_DATABASE)) {
    return { valid: false, error: `Invalid wire type: ${wireType}` };
  }

  // Validate units
  if (units !== 'us' && units !== 'si') {
    return { valid: false, error: `Invalid units: ${units}` };
  }

  // Validate solve for
  if (solveFor !== 'length' && solveFor !== 'resistance') {
    return { valid: false, error: `Invalid solveFor: ${solveFor}` };
  }

  // Validate value range based on what we're solving for
  if (solveFor === 'resistance') {
    // Input is length, validate range
    const minLength = units === 'us' ? 0.01 : 0.254; // 0.01" = 0.254mm
    const maxLength = units === 'us' ? 100.0 : 2540.0; // 100" = 2540mm

    if (value < minLength || value > maxLength) {
      const unit = units === 'us' ? 'inches' : 'mm';
      return {
        valid: false,
        error: `Length must be between ${minLength} and ${maxLength} ${unit}`,
      };
    }
  } else {
    // Input is resistance, validate range
    const minResistance = 0.01;
    const maxResistance = 1000;

    if (value < minResistance || value > maxResistance) {
      return {
        valid: false,
        error: `Resistance must be between ${minResistance} and ${maxResistance} Ohms`,
      };
    }
  }

  return { valid: true };
}

/**
 * Calculate wire resistance or span length using wire material properties
 *
 * Solves either:
 * - Resistance = Length × Resistivity
 * - Length = Resistance / Resistivity
 *
 * @param input - Input parameters
 * @returns Calculation result with length and/or resistance
 *
 * @example
 * // Calculate resistance for 50mm of copper wire
 * const result = calculateWireOpt({
 *   wireType: 'copper',
 *   units: 'si',
 *   solveFor: 'resistance',
 *   value: 50
 * });
 *
 * @example
 * // Calculate length for 50 Ohms of constantan wire
 * const result = calculateWireOpt({
 *   wireType: 'constantan',
 *   units: 'si',
 *   solveFor: 'length',
 *   value: 50
 * });
 */
export function calculateWireOpt(input: WireOptInput): WireOptResult {
  // Validate input
  const validation = validateInput(input);
  if (!validation.valid) {
    return {
      success: false,
      error: validation.error,
    };
  }

  try {
    const { wireType, units, solveFor, value } = input;
    const wire = WIRE_DATABASE[wireType];

    // Adjust resistivity for unit system
    // US: Ohms per inch, SI: Ohms per mm
    let resistivity = wire.resistivity;
    if (units === 'us') {
      // resistivity is in ohms/12 inches (ohms/foot)
      resistivity = wire.resistivity / 12;
    } else {
      // resistivity is in ohms/1000 mm (ohms/meter)
      resistivity = wire.resistivity / 1000;
    }

    if (resistivity <= 0) {
      return {
        success: false,
        error: 'Invalid wire resistivity',
      };
    }

    if (solveFor === 'resistance') {
      // Input is length (in inches US or mm SI), calculate resistance
      const length = value;
      const resistance = length * resistivity;

      return {
        resistance: resistance,
        success: true,
      };
    } else {
      // Input is resistance (in Ohms), calculate length
      const resistance = value;
      const length = resistance / resistivity;

      return {
        length: length,
        success: true,
      };
    }
  } catch (error) {
    return {
      success: false,
      error: `Calculation error: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}

/**
 * Get available wire types
 *
 * @returns Array of wire type keys
 */
export function getWireTypes(): WireType[] {
  return Object.keys(WIRE_DATABASE) as WireType[];
}

/**
 * Get wire material information
 *
 * @param wireType - Wire type to retrieve
 * @returns Wire material properties or undefined if not found
 */
export function getWireInfo(wireType: WireType): Wire | undefined {
  return WIRE_DATABASE[wireType];
}
