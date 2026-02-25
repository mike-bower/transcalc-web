/**
 * Round Solid Column Module
 * Calculates axial and transverse strain for a round solid column under compression
 */

/**
 * Input parameters for round solid column strain calculation
 */
export interface RoundSolidColumnInput {
  /** Applied load (force) in lbf or N */
  appliedLoad: number;
  
  /** Column diameter in inches or mm */
  diameter: number;
  
  /** Young's modulus (E) in PSI or GPa */
  modulus: number;
  
  /** Poisson's ratio */
  poissonRatio: number;
  
  /** Gage factor (K) for strain gage */
  gageFactor: number;
  
  /** Whether to use US units (lbf, inches, PSI) - auto-detected if not specified */
  usUnits?: boolean;
}

/**
 * Results from round solid column strain calculation
 */
export interface RoundSolidColumnResult {
  /** Axial strain (tensile positive, in microstrains) */
  axialStrain: number;
  
  /** Transverse strain (in microstrains) */
  transverseStrain: number;
  
  /** Full bridge output (in mV/V) */
  fullSpanOutput: number;
  
  /** Input validation status */
  isValid: boolean;
}

/**
 * Validates round solid column input parameters
 * @throws Error if validation fails
 */
function validateInput(input: RoundSolidColumnInput): void {
  if (input.appliedLoad < 0) {
    throw new Error('Applied load must be non-negative');
  }
  if (input.diameter <= 0) {
    throw new Error('Diameter must be positive');
  }
  if (input.modulus <= 0) {
    throw new Error('Modulus must be positive');
  }
  if (input.poissonRatio < 0 || input.poissonRatio > 0.5) {
    throw new Error('Poisson\'s ratio must be between 0 and 0.5');
  }
  if (input.gageFactor <= 0) {
    throw new Error('Gage factor must be positive');
  }
}

/**
 * Detects whether US or SI units are being used based on input values
 */
function autoDetectUnits(input: RoundSolidColumnInput): boolean {
  if (input.usUnits !== undefined) {
    return input.usUnits;
  }
  // Heuristic: PSI (5M-50M) vs GPa (50-300)
  return input.modulus > 1000;
}

/**
 * Converts SI to US units for strain calculation
 */
function convertSIToUS(input: RoundSolidColumnInput): RoundSolidColumnInput {
  return {
    appliedLoad: input.appliedLoad / 4.44822, // N to lbf
    diameter: input.diameter / 25.4, // mm to inches
    modulus: input.modulus * 145037.738, // GPa to PSI
    poissonRatio: input.poissonRatio,
    gageFactor: input.gageFactor,
    usUnits: true,
  };
}

/**
 * Calculates strain for a round solid column
 * 
 * Formula:
 * - Area = π × (Diameter/2)²
 * - Axial Strain = -(Load / Area) / E × 10^6 (microstrains)
 * - Transverse Strain = Axial Strain × (-Poisson's Ratio)
 * - Full Bridge Output = K × ((-2 × Axial) + (2 × Transverse)) / 4 × 10^-3 (mV/V)
 * 
 * @param input Round solid column input parameters
 * @returns Calculated strain results
 */
export function calculateRoundSolidColumnStrain(input: RoundSolidColumnInput): RoundSolidColumnResult {
  try {
    validateInput(input);
    
    // Auto-detect units if not specified
    const usUnits = autoDetectUnits(input);
    let workingInput = input;
    
    // Convert SI to US if needed
    if (!usUnits) {
      workingInput = convertSIToUS(input);
    }
    
    // Calculate cross-sectional area (circular)
    const radius = workingInput.diameter / 2;
    const area = Math.PI * radius * radius;
    
    // Calculate stress (force per unit area)
    const stress = workingInput.appliedLoad / area;
    
    // Calculate axial strain in microstrains (negative for compression)
    const axialStrain = -(stress / workingInput.modulus) * 1e6;
    
    // Calculate transverse strain
    const transverseStrain = axialStrain * (-workingInput.poissonRatio);
    
    // Calculate full bridge output in mV/V
    const bridgeNumerator = (-2 * axialStrain) + (2 * transverseStrain);
    const bridgeOutput = (workingInput.gageFactor * (bridgeNumerator / 4)) * 1e-3;
    
    return {
      axialStrain,
      transverseStrain,
      fullSpanOutput: bridgeOutput,
      isValid: true,
    };
  } catch (error) {
    throw error;
  }
}
