/**
 * Round Solid Torque Module
 * Calculates shear strain for a solid round shaft under torsion
 */

/**
 * Input parameters for round solid torque strain calculation
 */
export interface RoundSolidTorqueInput {
  /** Applied torque in in-lbf or N-m */
  appliedTorque: number;
  
  /** Shaft diameter in inches or mm */
  diameter: number;
  
  /** Young's modulus (E) in PSI or GPa */
  modulus: number;
  
  /** Poisson's ratio */
  poissonRatio: number;
  
  /** Gage factor (K) for strain gage */
  gageFactor: number;
  
  /** Whether to use US units (in-lbf, inches, PSI) - auto-detected if not specified */
  usUnits?: boolean;
}

/**
 * Results from round solid torque strain calculation
 */
export interface RoundSolidTorqueResult {
  /** Shear strain (in microstrains) */
  shearStrain: number;
  
  /** Normal strain (perpendicular to shear, in microstrains) */
  normalStrain: number;
  
  /** Full bridge output (in mV/V) */
  fullSpanOutput: number;
  
  /** Input validation status */
  isValid: boolean;
}

/**
 * Validates round solid torque input parameters
 * @throws Error if validation fails
 */
function validateInput(input: RoundSolidTorqueInput): void {
  if (input.appliedTorque < 0) {
    throw new Error('Applied torque must be non-negative');
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
function autoDetectUnits(input: RoundSolidTorqueInput): boolean {
  if (input.usUnits !== undefined) {
    return input.usUnits;
  }
  // Heuristic: PSI (5M-50M) vs GPa (50-300)
  return input.modulus > 1000;
}

/**
 * Converts SI to US units for strain calculation
 */
function convertSIToUS(input: RoundSolidTorqueInput): RoundSolidTorqueInput {
  return {
    appliedTorque: input.appliedTorque * 8.85075, // N-m to in-lbf
    diameter: input.diameter / 25.4, // mm to inches
    modulus: input.modulus * 145037.738, // GPa to PSI
    poissonRatio: input.poissonRatio,
    gageFactor: input.gageFactor,
    usUnits: true,
  };
}

/**
 * Calculates strain for a round solid shaft under torsion
 * 
 * Formula:
 * - Shear Modulus = E / (2 × (1 + Poisson))
 * - Polar Moment = π × (D/2)⁴ / 2
 * - Shear Stress = Torque × (D/2) / Polar Moment
 * - Shear Strain = Shear Stress / Shear Modulus × 10^6 (microstrains)
 * - Normal Strain = Shear Strain / 2
 * - Full Bridge = K × (2 × Shear Strain) / 4 × 10^-3 (mV/V)
 * 
 * @param input Round solid torque input parameters
 * @returns Calculated strain results
 */
export function calculateRoundSolidTorqueStrain(input: RoundSolidTorqueInput): RoundSolidTorqueResult {
  try {
    validateInput(input);
    
    // Auto-detect units if not specified
    const usUnits = autoDetectUnits(input);
    let workingInput = input;
    
    // Convert SI to US if needed
    if (!usUnits) {
      workingInput = convertSIToUS(input);
    }
    
    // Calculate shear modulus
    const shearModulus = workingInput.modulus / (2 * (1 + workingInput.poissonRatio));
    
    // Calculate polar moment of inertia for solid circular section
    // J = π × (D/2)⁴ / 2 = π × D⁴ / 32
    const radius = workingInput.diameter / 2;
    const polarMoment = (Math.PI / 2) * Math.pow(radius, 4);
    
    // Calculate shear stress at outer surface (τ = T × r / J)
    const shearStress = (workingInput.appliedTorque * radius) / polarMoment;
    
    // Calculate shear strain in microstrains
    const shearStrain = (shearStress / shearModulus) * 1e6;
    
    // Calculate normal strain (perpendicular to shear)
    const normalStrain = shearStrain / 2;
    
    // Calculate full bridge output in mV/V
    const bridgeOutput = (workingInput.gageFactor * (2 * shearStrain) / 4) * 1e-3;
    
    return {
      shearStrain,
      normalStrain,
      fullSpanOutput: bridgeOutput,
      isValid: true,
    };
  } catch (error) {
    throw error;
  }
}
