/**
 * Pressure diaphragm calculation utilities
 * Ported from Delphi PRESSURE.PAS
 * Calculates strain in circular diaphragms under applied pressure differential
 */

export type PressureParams = {
  appliedPressure: number // Pressure in Pa (SI) or PSI (US); caller responsible for consistency
  thickness: number // Diaphragm thickness in mm (SI) or inches (US)
  diameter: number // Diaphragm diameter in mm (SI) or inches (US)
  poisson: number // Poisson's ratio (unitless, typically 0.3 for steel)
  modulus: number // Young's modulus in Pa (SI) or PSI (US); caller must keep consistent with pressure units
}

/**
 * Calculate radial strain in a circular pressure diaphragm
 * 
 * ε_radial = [(-3 × P × (d/2)²) × (1 - ν²)] / [4 × t² × E] × 1e6
 * where P is pressure, d is diameter, t is thickness, E is modulus, ν is Poisson's ratio
 * 
 * **Unit Consistency Required:** All parameters (pressure, dimensions, modulus) must use compatible units.
 * If using SI: pressure [Pa], diameter/thickness [mm], modulus [Pa]; or
 * If using US: pressure [PSI], diameter/thickness [inches], modulus [PSI]
 * 
 * @param pressure Applied pressure differential (Pa or PSI)
 * @param thickness Diaphragm thickness (mm or inches)
 * @param diameter Diaphragm diameter (mm or inches)
 * @param poisson Poisson's ratio (unitless)
 * @param elasticity Young's modulus (Pa or PSI, must match pressure units)
 * @returns Radial strain in microstrain (με = 1e-6 strain)
 */
export function calculateRadial(
  pressure: number,
  thickness: number,
  diameter: number,
  poisson: number,
  elasticity: number
): number {
  // Numerator := (-3 * Pressure * sqr(TheDiameter / 2)) * (1 - sqr(Ratio));
  // Denominator := 4 * sqr(Thick) * Elasticity;
  // RadialResult := (Numerator / Denominator) * 1E6;
  const numerator = -3 * pressure * Math.pow(diameter / 2.0, 2) * (1 - Math.pow(poisson, 2))
  const denominator = 4 * Math.pow(thickness, 2) * elasticity
  const result = (numerator / denominator) * 1e6
  return result
}

/**
 * Calculate tangential (circumferential) strain in a circular pressure diaphragm
 * 
 * ε_tangential = [(3 × P × (d/2)²) × (1 - ν²)] / [8 × t² × E] × 1e6
 * where P is pressure, d is diameter, t is thickness, E is modulus, ν is Poisson's ratio
 * 
 * **Unit Consistency Required:** See calculateRadial() for unit requirements.
 * 
 * @param pressure Applied pressure differential (Pa or PSI)
 * @param thickness Diaphragm thickness (mm or inches)
 * @param diameter Diaphragm diameter (mm or inches)
 * @param poisson Poisson's ratio (unitless)
 * @param elasticity Young's modulus (Pa or PSI, must match pressure units)
 * @returns Tangential strain in microstrain (με = 1e-6 strain)
 */
export function calculateTangential(
  pressure: number,
  thickness: number,
  diameter: number,
  poisson: number,
  elasticity: number
): number {
  // Numerator := (3 * Pressure * sqr(TheDiameter / 2)) * (1 - sqr(Ratio));
  // Denominator := 8 * sqr(Thick) * Elasticity;
  // TangentResult := (Numerator / Denominator) * 1E6;
  const numerator = 3 * pressure * Math.pow(diameter / 2.0, 2) * (1 - Math.pow(poisson, 2))
  const denominator = 8 * Math.pow(thickness, 2) * elasticity
  const result = (numerator / denominator) * 1e6
  return result
}

/**
 * Compute both radial and tangential strains for a pressure diaphragm in one call
 * 
 * Convenience function that combines calculateRadial() and calculateTangential().
 * **Unit Consistency:** Caller is responsible for ensuring all parameters (pressure, dimensions, modulus) use consistent units.
 * 
 * @param params Pressure diaphragm parameters with pressure [Pa or PSI], dimensions [mm or inches], modulus [Pa or PSI]
 * @returns Object with radial and tangential strains in microstrain (με)
 * @example
 * // SI units (pressure in Pa, dimensions in mm, modulus in Pa)
 * const strains = computePressureStrains({
 *   appliedPressure: 1e6,  // 1 MPa
 *   thickness: 1,
 *   diameter: 50,
 *   poisson: 0.3,
 *   modulus: 200e9  // 200 GPa in Pa
 * })
 */
export function computePressureStrains(params: PressureParams & { units?: 'US' | 'SI' }): { radial: number; tangential: number } {
  // This helper assumes the caller provides consistent units. If units='SI', caller should
  // convert modulus to the same base used below (Pa) and pressure to Pa, dimensions to meters or mm.
  // For now we treat inputs as already normalized where elasticity is in N/mm^2 (MPa) and
  // lengths are in mm, pressure in N/mm^2 (MPa). Caller should convert using `convert.ts` utilities.
  const { appliedPressure, thickness, diameter, poisson, modulus } = params as any
  const radial = calculateRadial(appliedPressure, thickness, diameter, poisson, modulus)
  const tangential = calculateTangential(appliedPressure, thickness, diameter, poisson, modulus)
  return { radial, tangential }
}
