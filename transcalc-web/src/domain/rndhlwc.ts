/**
 * Round Hollow Column Module
 * Calculates axial and transverse strain for a hollow cylindrical column under compression
 */

/**
 * Input parameters for round hollow column strain calculation
 */
export interface RoundHollowColumnInput {
  /** Applied load (force) in lbf or N */
  appliedLoad: number;
  
  /** Outer diameter in inches or mm */
  outerDiameter: number;
  
  /** Inner diameter in inches or mm */
  innerDiameter: number;
  
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
 * Results from round hollow column strain calculation
 */
export interface RoundHollowColumnResult {
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
 * Validates round hollow column input parameters
 * @throws Error if validation fails
 */
function validateInput(input: RoundHollowColumnInput): void {
  if (input.appliedLoad < 0) {
    throw new Error('Applied load must be non-negative');
  }
  if (input.outerDiameter <= 0 || input.innerDiameter <= 0) {
    throw new Error('Outer and inner diameters must be positive');
  }
  if (input.innerDiameter >= input.outerDiameter) {
    throw new Error('Inner diameter must be less than outer diameter');
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
function autoDetectUnits(input: RoundHollowColumnInput): boolean {
  if (input.usUnits !== undefined) {
    return input.usUnits;
  }
  // Heuristic: PSI (5M-50M) vs GPa (50-300)
  return input.modulus > 1000;
}

/**
 * Converts SI to US units for strain calculation
 */
function convertSIToUS(input: RoundHollowColumnInput): RoundHollowColumnInput {
  return {
    appliedLoad: input.appliedLoad / 4.44822, // N to lbf
    outerDiameter: input.outerDiameter / 25.4, // mm to inches
    innerDiameter: input.innerDiameter / 25.4, // mm to inches
    modulus: input.modulus * 145037.738, // GPa to PSI
    poissonRatio: input.poissonRatio,
    gageFactor: input.gageFactor,
    usUnits: true,
  };
}

/**
 * Calculates strain for a round hollow column
 * 
 * Formula:
 * - Area = π × ((OD/2)² - (ID/2)²)
 * - Axial Strain = -(Load / Area) / E × 10^6 (microstrains)
 * - Transverse Strain = Axial Strain × (-Poisson's Ratio)
 * - Full Bridge Output = K × ((-2 × Axial) + (2 × Transverse)) / 4 × 10^-3 (mV/V)
 * 
 * @param input Round hollow column input parameters
 * @returns Calculated strain results
 */
export function calculateRoundHollowColumnStrain(input: RoundHollowColumnInput): RoundHollowColumnResult {
  try {
    validateInput(input);
    
    // Auto-detect units if not specified
    const usUnits = autoDetectUnits(input);
    let workingInput = input;
    
    // Convert SI to US if needed
    if (!usUnits) {
      workingInput = convertSIToUS(input);
    }
    
    // Calculate cross-sectional area (annular/ring shaped)
    const outerRadius = workingInput.outerDiameter / 2;
    const innerRadius = workingInput.innerDiameter / 2;
    const area = Math.PI * (outerRadius * outerRadius - innerRadius * innerRadius);
    
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
