/**
 * Square Column Module
 * Calculates axial and transverse strain for a square/rectangular column under compression
 */

/**
 * Input parameters for square column strain calculation
 */
export interface SquareColumnInput {
  /** Applied load (force) in lbf or N */
  appliedLoad: number;
  
  /** Column width in inches or mm (first dimension) */
  width: number;
  
  /** Column depth in inches or mm (second dimension) */
  depth: number;
  
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
 * Results from square column strain calculation
 */
export interface SquareColumnResult {
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
 * Validates square column input parameters
 * @throws Error if validation fails
 */
function validateInput(input: SquareColumnInput): void {
  if (input.appliedLoad < 0) {
    throw new Error('Applied load must be non-negative');
  }
  if (input.width <= 0 || input.depth <= 0) {
    throw new Error('Width and depth must be positive');
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
function autoDetectUnits(input: SquareColumnInput): boolean {
  // If explicitly specified, use that
  if (input.usUnits !== undefined) {
    return input.usUnits;
  }
  
  // Heuristic: if modulus is reasonable for PSI (millions), assume US
  // PSI: 5M-50M, GPa: 50-300
  return input.modulus > 1000;
}

/**
 * Converts SI to US units for strain calculation
 */
function convertSIToUS(input: SquareColumnInput): SquareColumnInput {
  return {
    appliedLoad: input.appliedLoad / 4.44822, // N to lbf
    width: input.width / 25.4, // mm to inches
    depth: input.depth / 25.4, // mm to inches
    modulus: input.modulus * 145037.738, // GPa to PSI
    poissonRatio: input.poissonRatio,
    gageFactor: input.gageFactor,
    usUnits: true,
  };
}

/**
 * Calculates strain for a square/rectangular column
 * 
 * Formula:
 * - Axial Strain = -(Load / (Width × Depth)) / E × 10^6 (microstrains)
 * - Transverse Strain = Axial Strain × (-Poisson's Ratio)
 * - Full Bridge Output = K × ((-2 × Axial) + (2 × Transverse)) / 4 × 10^-3 (mV/V)
 * 
 * @param input Square column input parameters
 * @returns Calculated strain results
 */
export function calculateSquareColumnStrain(input: SquareColumnInput): SquareColumnResult {
  try {
    validateInput(input);
    
    // Auto-detect units if not specified
    const usUnits = autoDetectUnits(input);
    let workingInput = input;
    
    // Convert SI to US if needed
    if (!usUnits) {
      workingInput = convertSIToUS(input);
    }
    
    // Calculate cross-sectional area (square/rectangular)
    const area = workingInput.width * workingInput.depth;
    
    // Calculate stress (force per unit area)
    const stress = workingInput.appliedLoad / area;
    
    // Calculate axial strain in microstrains (negative for compression)
    const axialStrain = -(stress / workingInput.modulus) * 1e6;
    
    // Calculate transverse strain (perpendicular to load)
    // Transverse strain is negative of (axial strain times Poisson's ratio)
    const transverseStrain = axialStrain * (-workingInput.poissonRatio);
    
    // Calculate full bridge output in mV/V
    // Bridge equation: ((-2 × ε_axial) + (2 × ε_transverse)) / 4
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
