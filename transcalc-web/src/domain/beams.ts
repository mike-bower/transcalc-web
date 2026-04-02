// Cantilever and beam solvers
// Common formulas for cantilever beams under load

export interface CantileverParams {
  load: number // load in N or lbf
  beamWidth: number // mm or inches
  thickness: number // mm or inches
  momentArm: number // distance from load to center of strain sensor, mm or inches
  modulus?: number // Young's modulus (if needed for deflection)
}

export interface CantileverValidation {
  isValid: boolean
  warnings: string[]
  errorMessage?: string
}

/**
 * Validates a cantilever beam design based on practical engineering limits ported from bbcant.pas.
 */
export function validateCantilever(
  params: {
    loadN: number
    momentArmMm: number
    youngsModulusPa: number
    beamWidthMm: number
    thicknessMm: number
  },
  gageLength: number,
  avgStrain: number
): CantileverValidation {
  const warnings: string[] = []
  let errorMessage: string | undefined

  if (params.thicknessMm <= 0) {
    errorMessage = 'Thickness must be greater than zero.'
  } else if (params.beamWidthMm <= 0) {
    errorMessage = 'Beam width must be greater than zero.'
  } else if (params.momentArmMm <= 0) {
    errorMessage = 'Moment arm must be greater than zero.'
  }

  if (errorMessage) {
    return { isValid: false, warnings: [], errorMessage }
  }

  // Practical strain limit (ported from bbcant.pas / ID_SZ_Impratical)
  if (Math.abs(avgStrain) > 5000) {
    warnings.push('Design exceeds 5000 microstrain; might be impractical.')
  }

  // Geometry checks
  if (params.thicknessMm > params.beamWidthMm) {
    warnings.push('Beam thickness is greater than width; lateral instability possible.')
  }

  if (gageLength > params.momentArmMm) {
    warnings.push('Gage length is large relative to moment arm; accuracy may suffer.')
  }

  return {
    isValid: true,
    warnings,
    errorMessage
  }
}

// Cantilever bending stress
// Formula: stress = (load * momentArm) / (width * thickness^2 / 6)
// Where section modulus Z = (b * h^2) / 6 for rectangular cross-section
export function calculateCantileverStress(
  load: number,
  beamWidth: number,
  thickness: number,
  momentArm: number
): number {
  const moment = load * momentArm
  const sectionModulus = (beamWidth * Math.pow(thickness, 2)) / 6
  return moment / sectionModulus
}

// Cantilever deflection (simple approximation)
// For a rectangular cantilever: deflection = (load * L^3) / (3 * E * I)
// Where I = (width * height^3) / 12
export function calculateCantileverDeflection(
  load: number,
  length: number,
  beamWidth: number,
  thickness: number,
  youngsModulus: number
): number {
  const momentOfInertia = (beamWidth * Math.pow(thickness, 3)) / 12
  const deflection = (load * Math.pow(length, 3)) / (3 * youngsModulus * momentOfInertia)
  return deflection
}

// Simple supported beam: center load, bending stress
// Max stress at center: stress = (load * span) / (4 * Z) where Z is section modulus
export function calculateSimpleSupportedStress(
  load: number,
  span: number,
  beamWidth: number,
  thickness: number
): number {
  const moment = (load * span) / 4
  const sectionModulus = (beamWidth * Math.pow(thickness, 2)) / 6
  return moment / sectionModulus
}

// Simple supported beam: center load, deflection at center
// deflection = (load * L^3) / (48 * E * I)
export function calculateSimpleSupportedDeflection(
  load: number,
  span: number,
  beamWidth: number,
  thickness: number,
  youngsModulus: number
): number {
  const momentOfInertia = (beamWidth * Math.pow(thickness, 3)) / 12
  const deflection = (load * Math.pow(span, 3)) / (48 * youngsModulus * momentOfInertia)
  return deflection
}

// Strain calculation from stress
// strain = stress / youngsModulus (in microstrain: multiply by 1e6)
export function stressToStrain(stress: number, youngsModulus: number): number {
  return (stress / youngsModulus) * 1e6
}

// Strain calculation from deflection (simplified for cantilever tip)
// For a cantilever, surface strain ≈ (6 * deflection) / (thickness^2)
export function deflectionToStrain(deflection: number, thickness: number): number {
  return (6 * deflection) / Math.pow(thickness, 2)
}

/**
 * Calculate minimum strain in cantilever beam with distributed gage length (SI-consistent)
 * 
 * Ported from bbcant.pas: Min_Strain formula
 * ε_min = (6 × F × (L_arm - 0.5 × L_gage)) / (E × W × T²) × 1e6
 * Accounts for minimum strain over the gage length.
 * 
 * @param loadN Applied load in N (SI)
 * @param momentArmMm Distance from load to strain sensor in mm (converted to m internally)
 * @param gageLengthMm Gage length in mm (converted to m internally)
 * @param youngsModulusPa Young's modulus in Pa (accepts GPa if <1e6; auto-converts to Pa)
 * @param beamWidthMm Beam width in mm (converted to m internally)
 * @param thicknessMm Beam thickness in mm (converted to m internally)
 * @returns Minimum strain in microstrain (dimensionless × 1e-6)
 */
export function calculateCantileverMinStrain(
  loadN: number,
  momentArmMm: number,
  gageLengthMm: number,
  youngsModulusPa: number,
  beamWidthMm: number,
  thicknessMm: number
): number {
  // Auto-detect if Young's modulus is in GPa or Pa
  const E = youngsModulusPa < 1e6 ? youngsModulusPa * 1e9 : youngsModulusPa

  // Convert mm to m for SI consistency
  const armM = momentArmMm / 1000
  const gageM = gageLengthMm / 1000
  const widthM = beamWidthMm / 1000
  const thickM = thicknessMm / 1000

  // ε_min = (6 × F × (L_arm - 0.5 × L_gage)) / (E × W × T²) × 1e6
  const numerator = 6 * loadN * (armM - 0.5 * gageM)
  const denominator = E * widthM * Math.pow(thickM, 2)

  if (denominator === 0) {
    throw new Error('Young\'s modulus, width, and thickness must be non-zero')
  }

  return (numerator / denominator) * 1e6
}

/**
 * Calculate maximum strain in cantilever beam with distributed gage length (SI-consistent)
 * 
 * Ported from bbcant.pas: Max_Strain formula
 * ε_max = (6 × F × (L_arm + 0.5 × L_gage)) / (E × W × T²) × 1e6
 * Accounts for maximum strain over the gage length.
 * 
 * @param loadN Applied load in N (SI)
 * @param momentArmMm Distance from load to strain sensor in mm (converted to m internally)
 * @param gageLengthMm Gage length in mm (converted to m internally)
 * @param youngsModulusPa Young's modulus in Pa (accepts GPa if <1e6; auto-converts to Pa)
 * @param beamWidthMm Beam width in mm (converted to m internally)
 * @param thicknessMm Beam thickness in mm (converted to m internally)
 * @returns Maximum strain in microstrain (dimensionless × 1e-6)
 */
export function calculateCantileverMaxStrain(
  loadN: number,
  momentArmMm: number,
  gageLengthMm: number,
  youngsModulusPa: number,
  beamWidthMm: number,
  thicknessMm: number
): number {
  // Auto-detect if Young's modulus is in GPa or Pa
  const E = youngsModulusPa < 1e6 ? youngsModulusPa * 1e9 : youngsModulusPa

  // Convert mm to m for SI consistency
  const armM = momentArmMm / 1000
  const gageM = gageLengthMm / 1000
  const widthM = beamWidthMm / 1000
  const thickM = thicknessMm / 1000

  // ε_max = (6 × F × (L_arm + 0.5 × L_gage)) / (E × W × T²) × 1e6
  const numerator = 6 * loadN * (armM + 0.5 * gageM)
  const denominator = E * widthM * Math.pow(thickM, 2)

  if (denominator === 0) {
    throw new Error('Young\'s modulus, width, and thickness must be non-zero')
  }

  return (numerator / denominator) * 1e6
}

/**
 * Calculate average strain in cantilever beam (SI-consistent)
 * 
 * Ported from bbcant.pas: Avg_Strain formula
 * ε_avg = (6 × F × L_arm) / (E × W × T²) × 1e6
 * Average strain across the gage length; centerline of the gage element.
 * 
 * @param loadN Applied load in N (SI)
 * @param momentArmMm Distance from load to strain sensor in mm (converted to m internally)
 * @param youngsModulusPa Young's modulus in Pa (accepts GPa if <1e6; auto-converts to Pa)
 * @param beamWidthMm Beam width in mm (converted to m internally)
 * @param thicknessMm Beam thickness in mm (converted to m internally)
 * @returns Average strain in microstrain (dimensionless × 1e-6)
 */
export function calculateCantileverAvgStrain(
  loadN: number,
  momentArmMm: number,
  youngsModulusPa: number,
  beamWidthMm: number,
  thicknessMm: number
): number {
  // Auto-detect if Young's modulus is in GPa or Pa
  const E = youngsModulusPa < 1e6 ? youngsModulusPa * 1e9 : youngsModulusPa

  // Convert mm to m for SI consistency
  const armM = momentArmMm / 1000
  const widthM = beamWidthMm / 1000
  const thickM = thicknessMm / 1000

  // ε_avg = (6 × F × L_arm) / (E × W × T²) × 1e6
  const numerator = 6 * loadN * armM
  const denominator = E * widthM * Math.pow(thickM, 2)

  if (denominator === 0) {
    throw new Error('Young\'s modulus, width, and thickness must be non-zero')
  }

  return (numerator / denominator) * 1e6
}

/**
 * Calculate gradient (strain difference) in cantilever beam (SI-consistent)
 * 
 * Ported from bbcant.pas: CalculateGradient formula
 * Gradient (%) = ((ε_max - ε_min) / ε_max) × 100
 * Measure of strain nonlinearity over the gage length.
 * 
 * @param maxStrain Maximum strain in microstrain
 * @param minStrain Minimum strain in microstrain
 * @returns Gradient in percent (%)
 */
export function calculateCantileverGradient(
  maxStrain: number,
  minStrain: number
): number {
  if (maxStrain === 0) {
    throw new Error('Maximum strain must be non-zero (cannot divide by zero)')
  }
  return ((maxStrain - minStrain) / maxStrain) * 100
}

/**
 * Calculate natural frequency of a cantilever beam with tip load (approximation).
 * Formula: f_n = (1 / 2π) * sqrt(k / m_eff)
 * where k (stiffness) = (3 * E * I) / L^3
 * and m_eff (effective mass) ≈ mass_load + 0.23 * mass_beam
 * 
 * @param youngsModulusPa Young's Modulus in Pa
 * @param widthMm Beam width in mm
 * @param thicknessMm Beam thickness in mm
 * @param lengthMm Beam length (moment arm) in mm
 * @param loadN Applied load in N (used to estimate mass, mass = load / 9.80665)
 * @param densityKgM3 Material density in kg/m^3 (default 7850 for steel)
 * @returns Natural frequency in Hz
 */
export function calculateCantileverNaturalFrequency(
  youngsModulusPa: number,
  widthMm: number,
  thicknessMm: number,
  lengthMm: number,
  loadN: number,
  densityKgM3: number = 7850
): number {
  const E = youngsModulusPa < 1e6 ? youngsModulusPa * 1e9 : youngsModulusPa
  const w = widthMm / 1000
  const t = thicknessMm / 1000
  const L = lengthMm / 1000
  
  const I = (w * Math.pow(t, 3)) / 12
  const k = (3 * E * I) / Math.pow(L, 3)
  
  const massLoad = loadN / 9.80665
  const volumeBeam = w * t * L
  const massBeam = volumeBeam * densityKgM3
  const effectiveMass = massLoad + (0.24 * massBeam) // 0.23-0.24 is standard for cantilever tip mass
  
  if (effectiveMass <= 0) return 0
  
  return (1 / (2 * Math.PI)) * Math.sqrt(k / effectiveMass)
}
