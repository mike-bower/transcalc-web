/**
 * Round shear web (rectangular with round hole) strain calculations
 * Ported from shearrnd.pas: Calculates effective span/compliance in shear web geometries
 */

/**
 * Calculate effective shear span for rectangular web with round hole (SI-consistent)
 * 
 * Ported from shearrnd.pas: CalculateSpan formula (new 6/11/97 mjb)
 * This function computes the effective compliance/span accounting for the round opening
 * and complex stress distribution in the web.
 * 
 * Span = (Fg × F × (1+ν) / (A₀ × E)) × Term2
 * where:
 *   A₀ = (H - D) × B + T × D (area of web section)
 *   Term2 = polynomial fit to geometry ratios d/h, d/b, d/t
 *   d = diameter, h = height, b = width, t = thickness
 * 
 * @param loadN Applied shear load in N (SI)
 * @param youngsModulusPa Young's modulus in Pa (accepts GPa if <1e6; auto-converts to Pa)
 * @param gaugeFactorFg Gauge factor of strain gage (typically 2.0-2.1)
 * @param poissonRatio Poisson's ratio (typically 0.3 for steel)
 * @param webHeightMm Web height in mm (H; converted to m internally)
 * @param webWidthMm Web width in mm (B; converted to m internally)
 * @param webThicknessMm Web thickness in mm (T; converted to m internally)
 * @param holeD iameterMm Circular hole diameter in mm (D; converted to m internally)
 * @returns Effective shear span in microstrain units (scaled × 1e3)
 */
export function calculateRoundShearSpan(
  loadN: number,
  youngsModulusPa: number,
  gaugeFactorFg: number,
  poissonRatio: number,
  webHeightMm: number,
  webWidthMm: number,
  webThicknessMm: number,
  holeDiameterMm: number
): number {
  // Auto-detect if Young's modulus is in GPa or Pa
  const E = youngsModulusPa < 1e6 ? youngsModulusPa * 1e9 : youngsModulusPa

  // Convert mm to m for SI consistency
  const hM = webHeightMm / 1000
  const bM = webWidthMm / 1000
  const tM = webThicknessMm / 1000
  const dM = holeDiameterMm / 1000

  // Validate geometry: hole diameter must be smaller than web height
  if (dM >= hM) {
    throw new Error('Invalid shear web geometry: hole diameter must be smaller than web height')
  }

  // Cross-sectional area of web: A₀ = (H - D) × B + T × D
  const A0M2 = (hM - dM) * bM + tM * dM

  if (A0M2 <= 0) {
    throw new Error('Invalid shear web geometry: cross-sectional area is zero or negative')
  }

  // First term: (Fg × F × (1+ν)) / (A₀ × E)
  const term1 = (gaugeFactorFg * loadN * (1 + poissonRatio)) / (A0M2 * E)

  // Geometry ratios
  const dh = dM / hM
  const db = dM / bM
  const dt = dM / tM
  const dh2 = dh * dh
  const db2 = db * db
  const dt2 = dt * dt

  // Polynomial fit (empirical formula from Delphi code)
  // Term2 = -15.8181 + 218.294×(d/h) - 168.451×(d/b) - 0.268199×(d/t)
  //         - 112.494×(d/h)² + 270.467×(d/b)² - 0.0043091×(d/t)²
  //         - 191.535×(d/h)×(d/b) + 4.2488×(d/h)×(d/t) - 3.70184×(d/b)×(d/t)
  const term2 =
    -15.8181 +
    218.294 * dh -
    168.451 * db -
    0.268199 * dt -
    112.494 * dh2 +
    270.467 * db2 -
    0.0043091 * dt2 -
    191.535 * dh * db +
    4.2488 * dh * dt -
    3.70184 * db * dt

  // Result scaled by 1000 to match Delphi output
  // Use absolute value to ensure physical compliance is positive
  return Math.abs(term1 * term2 * 1000)
}
