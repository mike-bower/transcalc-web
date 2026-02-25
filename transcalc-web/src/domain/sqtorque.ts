/**
 * Square Torque Module
 * Calculates strain and stress in a square cross-section shaft under torque
 */

/**
 * Input parameters for square torque calculation
 */
export interface SqTorqueInput {
  /** Applied torque in N⋅mm (SI) or in⋅lb (US) */
  appliedTorque: number;
  /** Side width of square cross-section in mm (SI) or inches (US) */
  width: number;
  /** Poisson's ratio (dimensionless, 0.1 to 0.4) */
  poisson: number;
  /** Young's modulus in GPa (SI) or PSI (US) */
  modulus: number;
  /** Gage length in mm (SI) or inches (US) */
  gageLength: number;
  /** Gage factor (dimensionless) */
  gageFactor: number;
  /** Whether using US units (true) or SI (false) */
  usUnits: boolean;
}

/**
 * Result of square torque calculation
 */
export interface SqTorqueResult {
  /** Whether calculation succeeded */
  success: boolean;
  /** Minimum strain in microstrain if successful */
  minStrain?: number;
  /** Maximum strain in microstrain if successful */
  maxStrain?: number;
  /** Average strain in microstrain if successful */
  avgStrain?: number;
  /** Strain gradient as percentage if successful */
  gradient?: number;
  /** Full span in mV/V if successful */
  fullSpan?: number;
  /** Error message if calculation failed */
  error?: string;
}

/**
 * Validates input parameters for square torque calculation
 * @param input - Input parameters to validate
 * @returns Error message if validation fails, undefined if valid
 */
function validateInput(input: SqTorqueInput): string | undefined {
  if (!input.usUnits && typeof input.usUnits !== 'boolean') {
    return 'Unit system must be specified (usUnits boolean)';
  }

  // Convert US limits to SI if needed
  const minTorque = input.usUnits ? 0.0 : 0.0 * 0.11298;
  const maxTorque = input.usUnits ? 500000 : 500000 * 0.11298;
  const minWidth = input.usUnits ? 0.2 : 0.2 * 25.4;
  const maxWidth = input.usUnits ? 20.0 : 20.0 * 25.4;
  const minGageLength = input.usUnits ? 0.008 : 0.008 * 25.4;
  const maxGageLength = input.usUnits ? 1.0 : 1.0 * 25.4;
  const minModulus = input.usUnits ? 5000000 : 5000000 / 145.038;
  const maxModulus = input.usUnits ? 50000000 : 50000000 / 145.038;

  if (input.appliedTorque < minTorque || input.appliedTorque > maxTorque) {
    return `Applied torque must be between ${minTorque.toFixed(1)} and ${maxTorque.toFixed(1)} ${input.usUnits ? 'in⋅lb' : 'N⋅mm'}`;
  }

  if (input.width < minWidth || input.width > maxWidth) {
    return `Width must be between ${minWidth.toFixed(2)} and ${maxWidth.toFixed(2)} ${input.usUnits ? 'inches' : 'mm'}`;
  }

  if (input.poisson < 0.1 || input.poisson > 0.4) {
    return "Poisson's ratio must be between 0.1 and 0.4";
  }

  if (input.modulus < minModulus || input.modulus > maxModulus) {
    return `Modulus must be between ${minModulus.toFixed(0)} and ${maxModulus.toFixed(0)} ${input.usUnits ? 'PSI' : 'GPa'}`;
  }

  if (input.gageLength < minGageLength || input.gageLength > maxGageLength) {
    return `Gage length must be between ${minGageLength.toFixed(3)} and ${maxGageLength.toFixed(2)} ${input.usUnits ? 'inches' : 'mm'}`;
  }

  if (input.gageFactor < 1.0 || input.gageFactor > 5.0) {
    return 'Gage factor must be between 1.0 and 5.0';
  }

  return undefined;
}

/**
 * Calculates strain in a square torque shaft
 * @param input - Input parameters
 * @returns Calculation result with strain components or error
 *
 * Theory:
 * For a square cross-section shaft under torque:
 * - Shear modulus = E / (2 * (1 + ν))
 * - Maximum shear stress = T / (0.22 * a³)
 * - Minimum/Maximum principal strains depend on stress state
 * - Strain = (stress / modulus) × scaling factors
 *
 * References:
 * - Mechanics of Materials texts
 * - Torsion formulas for non-circular shafts
 */
export function calculateSqTorque(input: SqTorqueInput): SqTorqueResult {
  // Validate input
  const validationError = validateInput(input);
  if (validationError) {
    return {
      success: false,
      error: validationError,
    };
  }

  try {
    // Convert units if needed
    let torque = input.appliedTorque;
    let width = input.width;
    let modulus = input.modulus;
    let gageLength = input.gageLength;

    if (!input.usUnits) {
      // SI to internal units for calculation
      // Keep SI units internally (N⋅mm, mm, GPa)
      // Actually convert to equivalent US-like values for calculation
      torque = torque / 0.11298;  // N⋅mm to in⋅lb equivalent
      width = width / 25.4;       // mm to inches
      modulus = modulus * 145.038; // GPa to PSI
      gageLength = gageLength / 25.4; // mm to inches
    }

    // Calculate strain components
    // MinStrain = sqrt(-((Numerator / Denominator) * MaxE)^2 + MaxE^2)
    // where Numerator = (GageLength / 2) * 0.707 and Denominator = Width / 2

    const numerator = (gageLength / 2) * 0.707;
    const denominator = width / 2;

    // Calculate stresses and strains
    const shearModulus = modulus / (2 * (1 + input.poisson));
    const maxStress = torque / (0.22 * Math.pow(width, 3));

    // Maximum strain (from principal stress direction)
    const maxE = (maxStress / shearModulus) * 0.5 * 1e6; // Convert to microstrain

    // Minimum strain calculation
    let minE: number;
    const innerTerm = Math.pow((numerator / denominator) * maxE, 2);
    if (innerTerm > Math.pow(maxE, 2)) {
      // Cannot calculate - physically infeasible
      return {
        success: false,
        error: 'Torque and width combination creates infeasible strain state',
      };
    }
    minE = Math.sqrt(-innerTerm + Math.pow(maxE, 2));

    // Average strain
    const avgStrain = (minE + maxE) / 2;

    // Gradient (as percentage)
    const gradient = maxE > 0 ? ((maxE - minE) / maxE) * 100 : 0;

    // Full span in mV/V
    // FirstTerm = GageFactor, SecondTerm = AverageE
    const fullSpan = (input.gageFactor * avgStrain) * 1e-3;

    return {
      success: true,
      minStrain: minE,
      maxStrain: maxE,
      avgStrain,
      gradient,
      fullSpan,
    };
  } catch (err) {
    return {
      success: false,
      error: `Calculation failed: ${err instanceof Error ? err.message : 'Unknown error'}`,
    };
  }
}

/**
 * Gets the shear modulus for a material given Young's modulus and Poisson's ratio
 * @param youngsModulus - Young's modulus
 * @param poisson - Poisson's ratio
 * @returns Shear modulus G = E / (2 * (1 + ν))
 */
export function getShearModulus(youngsModulus: number, poisson: number): number {
  return youngsModulus / (2 * (1 + poisson));
}

/**
 * Gets maximum shear stress in a square shaft
 * @param torque - Applied torque
 * @param width - Width of square cross-section
 * @returns Maximum shear stress
 */
export function getMaxShearStress(torque: number, width: number): number {
  return torque / (0.22 * Math.pow(width, 3));
}
