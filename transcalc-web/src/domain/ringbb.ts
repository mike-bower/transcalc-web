/**
 * Ring Bending Beam Calculation
 *
 * Calculates average strain and full span sensitivity for a ring bending beam
 * load cell under applied mechanical load.
 */

// Constants - US units
const MIN_APPLIED_LOAD_US = 0.0; // lbf
const MAX_APPLIED_LOAD_US = 10000; // lbf
const MIN_RING_WIDTH_US = 0.001; // inches
const MAX_RING_WIDTH_US = 1000; // inches
const MIN_INSIDE_DIAMETER_US = 0.0001; // inches
const MAX_INSIDE_DIAMETER_US = 1000; // inches
const MIN_OUTSIDE_DIAMETER_US = 0.001; // inches
const MAX_OUTSIDE_DIAMETER_US = 10000; // inches
const MIN_MODULUS_US = 100; // PSI
const MAX_MODULUS_US = 100e6; // PSI
const MIN_GAGE_LENGTH_US = 0.001; // inches
const MAX_GAGE_LENGTH_US = 4.0; // inches
const MIN_GAGE_FACTOR_US = 1.0; // dimensionless
const MAX_GAGE_FACTOR_US = 5.0; // dimensionless

// Constants - SI units (converted via formulas in validation)
const MIN_APPLIED_LOAD_SI = 0.0; // kG
const MAX_APPLIED_LOAD_SI = 4535.9; // 10000 lbf converted to kG
const MIN_RING_WIDTH_SI = 0.0254; // 0.001 inches in mm
const MAX_RING_WIDTH_SI = 25400; // 1000 inches in mm
const MIN_INSIDE_DIAMETER_SI = 0.00254; // 0.0001 inches in mm
const MAX_INSIDE_DIAMETER_SI = 25400; // 1000 inches in mm
const MIN_OUTSIDE_DIAMETER_SI = 0.0254; // 0.001 inches in mm
const MAX_OUTSIDE_DIAMETER_SI = 254000; // 10000 inches in mm
const MIN_MODULUS_SI = 0.000689476; // 100 PSI in GPa
const MAX_MODULUS_SI = 689476; // 100e6 PSI in GPa
const MIN_GAGE_LENGTH_SI = 0.0254; // 0.001 inches in mm
const MAX_GAGE_LENGTH_SI = 101.6; // 4.0 inches in mm
const MIN_GAGE_FACTOR_SI = 1.0;
const MAX_GAGE_FACTOR_SI = 5.0;

/**
 * Input for ring bending beam calculation
 */
export interface RingBBInput {
  /** Applied load (lbf or kG) */
  appliedLoad: number;
  /** Ring width (inches or mm) */
  ringWidth: number;
  /** Inside diameter (inches or mm) */
  insideDiameter: number;
  /** Outside diameter (inches or mm) */
  outsideDiameter: number;
  /** Young's modulus (PSI or GPa) */
  modulus: number;
  /** Gage length (inches or mm) */
  gageLength: number;
  /** Gage factor (dimensionless) */
  gageFactor: number;
  /** Unit system: 'us' for US, 'si' for SI */
  units: 'us' | 'si';
}

/**
 * Result of ring bending beam calculation
 */
export interface RingBBResult {
  success: boolean;
  avgStrainAD?: number; // average strain AD (microstrain)
  avgStrainBC?: number; // average strain BC (microstrain)
  fullSpan?: number; // full span sensitivity (mV)
  error?: string;
}

/**
 * Unit conversion: PSI to GPa
 */
function psiToGpa(psi: number): number {
  return psi * 0.00000689476;
}

/**
 * Unit conversion: GPa to PSI
 */
function gpaToPsi(gpa: number): number {
  return gpa / 0.00000689476;
}

/**
 * Unit conversion: lbf to kG
 */
function lbfToKg(lbf: number): number {
  return lbf * 0.45359237;
}

/**
 * Unit conversion: kG to lbf
 */
function kgToLbf(kg: number): number {
  return kg / 0.45359237;
}

/**
 * Unit conversion: inches to mm
 */
function inchesToMm(inches: number): number {
  return inches * 25.4;
}

/**
 * Unit conversion: mm to inches
 */
function mmToInches(mm: number): number {
  return mm / 25.4;
}

/**
 * Validate input parameters
 */
function validateInput(input: RingBBInput): { valid: boolean; error?: string } {
  if (input.units !== 'us' && input.units !== 'si') {
    return { valid: false, error: 'Units must be either "us" or "si"' };
  }

  let minLoad, maxLoad, minWidth, maxWidth, minInside, maxInside, minOutside, maxOutside, minMod, maxMod, minLength, maxLength;

  if (input.units === 'us') {
    minLoad = MIN_APPLIED_LOAD_US;
    maxLoad = MAX_APPLIED_LOAD_US;
    minWidth = MIN_RING_WIDTH_US;
    maxWidth = MAX_RING_WIDTH_US;
    minInside = MIN_INSIDE_DIAMETER_US;
    maxInside = MAX_INSIDE_DIAMETER_US;
    minOutside = MIN_OUTSIDE_DIAMETER_US;
    maxOutside = MAX_OUTSIDE_DIAMETER_US;
    minMod = MIN_MODULUS_US;
    maxMod = MAX_MODULUS_US;
    minLength = MIN_GAGE_LENGTH_US;
    maxLength = MAX_GAGE_LENGTH_US;
  } else {
    minLoad = MIN_APPLIED_LOAD_SI;
    maxLoad = MAX_APPLIED_LOAD_SI;
    minWidth = MIN_RING_WIDTH_SI;
    maxWidth = MAX_RING_WIDTH_SI;
    minInside = MIN_INSIDE_DIAMETER_SI;
    maxInside = MAX_INSIDE_DIAMETER_SI;
    minOutside = MIN_OUTSIDE_DIAMETER_SI;
    maxOutside = MAX_OUTSIDE_DIAMETER_SI;
    minMod = MIN_MODULUS_SI;
    maxMod = MAX_MODULUS_SI;
    minLength = MIN_GAGE_LENGTH_SI;
    maxLength = MAX_GAGE_LENGTH_SI;
  }

  // Validate applied load
  if (input.appliedLoad < minLoad || input.appliedLoad > maxLoad) {
    const unit = input.units === 'us' ? 'lbf' : 'kG';
    return { valid: false, error: `Applied load must be between ${minLoad} and ${maxLoad} ${unit}` };
  }

  // Validate ring width
  if (input.ringWidth < minWidth || input.ringWidth > maxWidth) {
    const unit = input.units === 'us' ? 'inches' : 'mm';
    return { valid: false, error: `Ring width must be between ${minWidth} and ${maxWidth} ${unit}` };
  }

  // Validate inside diameter
  if (input.insideDiameter < minInside || input.insideDiameter > maxInside) {
    const unit = input.units === 'us' ? 'inches' : 'mm';
    return { valid: false, error: `Inside diameter must be between ${minInside} and ${maxInside} ${unit}` };
  }

  // Validate outside diameter
  if (input.outsideDiameter < minOutside || input.outsideDiameter > maxOutside) {
    const unit = input.units === 'us' ? 'inches' : 'mm';
    return { valid: false, error: `Outside diameter must be between ${minOutside} and ${maxOutside} ${unit}` };
  }

  // Validate modulus
  if (input.modulus < minMod || input.modulus > maxMod) {
    const unit = input.units === 'us' ? 'PSI' : 'GPa';
    return { valid: false, error: `Modulus must be between ${minMod} and ${maxMod} ${unit}` };
  }

  // Validate gage length
  if (input.gageLength < minLength || input.gageLength > maxLength) {
    const unit = input.units === 'us' ? 'inches' : 'mm';
    return { valid: false, error: `Gage length must be between ${minLength} and ${maxLength} ${unit}` };
  }

  // Validate gage factor
  if (input.gageFactor < MIN_GAGE_FACTOR_US || input.gageFactor > MAX_GAGE_FACTOR_US) {
    return { valid: false, error: `Gage factor must be between ${MIN_GAGE_FACTOR_US} and ${MAX_GAGE_FACTOR_US}` };
  }

  // Validate diameter relationship
  if (input.insideDiameter >= input.outsideDiameter) {
    return { valid: false, error: 'Inside diameter must be less than outside diameter' };
  }

  return { valid: true };
}

/**
 * Calculate average strain AD
 */
function calculateAvgStrainAD(load: number, modulus: number, width: number, inside: number, outside: number): number {
  const thickness = (outside - inside) / 2;
  const areaNumber = width * thickness;
  const ratioNumerator = thickness;
  const ratioDenominator = inside / 2 + thickness / 2;

  if (Math.abs(ratioDenominator) < 1e-10) {
    throw new Error('Ring geometry results in zero denominator');
  }

  const ratioResult = ratioNumerator / ratioDenominator;

  const firstTerm = load / (modulus * areaNumber);
  const secondTermNumerator = 0.3 * (6 + ratioResult);
  const secondTermDenominator = ratioResult * (2 + ratioResult);

  if (Math.abs(secondTermDenominator) < 1e-10) {
    throw new Error('Calculation results in division by zero');
  }

  const secondTerm = secondTermNumerator / secondTermDenominator - 0.5;
  const strainResult = firstTerm * secondTerm * 1e6;

  return strainResult;
}

/**
 * Calculate average strain BC
 */
function calculateAvgStrainBC(load: number, modulus: number, width: number, inside: number, outside: number): number {
  const thickness = (outside - inside) / 2;
  const areaNumber = width * thickness;
  const ratioNumerator = thickness;
  const ratioDenominator = inside / 2 + thickness / 2;

  if (Math.abs(ratioDenominator) < 1e-10) {
    throw new Error('Ring geometry results in zero denominator');
  }

  const ratioResult = ratioNumerator / ratioDenominator;

  const firstTerm = load / (modulus * areaNumber);
  const secondTermNumerator = 0.324 * (6 - ratioResult);
  const secondTermDenominator = ratioResult * (2 - ratioResult);

  if (Math.abs(secondTermDenominator) < 1e-10) {
    throw new Error('Calculation results in division by zero');
  }

  const secondTerm = secondTermNumerator / secondTermDenominator + 0.5;
  const strainResult = -1 * (firstTerm * secondTerm * 1e6);

  return strainResult;
}

/**
 * Calculate full bridge span sensitivity
 */
function calculateFullSpan(avgStrainAD: number, avgStrainBC: number, gageFactor: number): number {
  const spanResult = ((2 * avgStrainAD - 2 * avgStrainBC) / 4) * gageFactor * 1e-3;
  return spanResult;
}

/**
 * Calculate ring bending beam measurements
 */
export function calculateRingBB(input: RingBBInput): RingBBResult {
  // Validate input
  const validation = validateInput(input);
  if (!validation.valid) {
    return { success: false, error: validation.error };
  }

  try {
    // Convert SI units to US for calculation if needed
    let load = input.appliedLoad;
    let modulus = input.modulus;
    let width = input.ringWidth;
    let inside = input.insideDiameter;
    let outside = input.outsideDiameter;

    if (input.units === 'si') {
      load = kgToLbf(input.appliedLoad);
      modulus = gpaToPsi(input.modulus);
      width = mmToInches(input.ringWidth);
      inside = mmToInches(input.insideDiameter);
      outside = mmToInches(input.outsideDiameter);
    }

    // Calculate strains
    const avgStrainAD = calculateAvgStrainAD(load, modulus, width, inside, outside);
    const avgStrainBC = calculateAvgStrainBC(load, modulus, width, inside, outside);

    // Calculate full span
    const fullSpan = calculateFullSpan(avgStrainAD, avgStrainBC, input.gageFactor);

    return {
      success: true,
      avgStrainAD,
      avgStrainBC,
      fullSpan,
    };
  } catch (error) {
    return { success: false, error: `Calculation error: ${String(error)}` };
  }
}
