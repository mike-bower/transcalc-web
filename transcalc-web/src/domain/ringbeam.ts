/**
 * Ring bending beam (diaphragm) strain calculations
 * Ported from ringbb.pas: Calculates average strain in ring/circular diaphragm beams under radial load
 */

/**
 * Calculate average strain in ring beam (AD direction) (SI-consistent)
 * 
 * Ported from ringbb.pas: Avg_StrainAD formula
 * Calculates strain in the AD (axial) direction for ring bending beams.
 * 
 * ε_AD = [(F / (E × W × T)) × ((0.300 × (6 + β)) / (β × (2 + β)) - 0.5)] × 1e6
 * where β = T / (d_i/2 + T/2) is the wall thickness ratio
 * 
 * @param loadN Applied radial load in N (SI)
 * @param youngsModulusPa Young's modulus in Pa (accepts GPa if <1e6; auto-converts to Pa)
 * @param beamWidthMm Ring width in mm (axial length; converted to m internally)
 * @param outerDiameterMm Outer diameter in mm (converted to m internally)
 * @param innerDiameterMm Inner diameter in mm (converted to m internally)
 * @returns Average strain AD in microstrain (dimensionless × 1e-6)
 */
export function calculateRingStrainAD(
  loadN: number,
  youngsModulusPa: number,
  beamWidthMm: number,
  outerDiameterMm: number,
  innerDiameterMm: number
): number {
  // Auto-detect if Young's modulus is in GPa or Pa
  const E = youngsModulusPa < 1e6 ? youngsModulusPa * 1e9 : youngsModulusPa

  // Convert mm to m for SI consistency
  const widthM = beamWidthMm / 1000
  const odM = outerDiameterMm / 1000
  const idM = innerDiameterMm / 1000

  // Validate geometry: outer diameter must be larger than inner diameter
  if (odM <= idM) {
    throw new Error('Invalid ring geometry: outer diameter must be larger than inner diameter')
  }

  // Wall thickness
  const thicknessM = (odM - idM) / 2

  // Cross-sectional area
  const areaM2 = widthM * thicknessM

  // Thickness ratio: β = T / (d_i/2 + T/2)
  const ratioNumerator = thicknessM
  const ratioDenominator = (idM / 2) + (thicknessM / 2)

  if (ratioDenominator === 0) {
    throw new Error('Invalid ring geometry: denominator is zero')
  }

  const beta = ratioNumerator / ratioDenominator

  // First term: F / (E × W × T)
  const firstTerm = loadN / (E * areaM2)

  // Second term: (0.300×(6+β))/(β×(2+β)) - 0.5
  const secondTermNum = 0.3 * (6 + beta)
  const secondTermDenom = beta * (2 + beta)

  if (secondTermDenom === 0) {
    throw new Error('Invalid ring geometry: second term denominator is zero')
  }

  const secondTerm = (secondTermNum / secondTermDenom) - 0.5

  // Result: (FirstTerm × SecondTerm) × 1e6
  return firstTerm * secondTerm * 1e6
}

/**
 * Calculate average strain in ring beam (BC direction) (SI-consistent)
 * 
 * Ported from ringbb.pas: Avg_StrainBC formula
 * Calculates strain in the BC (circumferential) direction for ring bending beams.
 * 
 * ε_BC = -[(F / (E × W × T)) × ((0.324 × (6 - β)) / (β × (2 - β)) + 0.5)] × 1e6
 * where β = T / (d_i/2 + T/2) is the wall thickness ratio
 * 
 * @param loadN Applied radial load in N (SI)
 * @param youngsModulusPa Young's modulus in Pa (accepts GPa if <1e6; auto-converts to Pa)
 * @param beamWidthMm Ring width in mm (axial length; converted to m internally)
 * @param outerDiameterMm Outer diameter in mm (converted to m internally)
 * @param innerDiameterMm Inner diameter in mm (converted to m internally)
 * @returns Average strain BC in microstrain (dimensionless × 1e-6)
 */
export function calculateRingStrainBC(
  loadN: number,
  youngsModulusPa: number,
  beamWidthMm: number,
  outerDiameterMm: number,
  innerDiameterMm: number
): number {
  // Auto-detect if Young's modulus is in GPa or Pa
  const E = youngsModulusPa < 1e6 ? youngsModulusPa * 1e9 : youngsModulusPa

  // Convert mm to m for SI consistency
  const widthM = beamWidthMm / 1000
  const odM = outerDiameterMm / 1000
  const idM = innerDiameterMm / 1000

  // Validate geometry: outer diameter must be larger than inner diameter
  if (odM <= idM) {
    throw new Error('Invalid ring geometry: outer diameter must be larger than inner diameter')
  }

  // Wall thickness
  const thicknessM = (odM - idM) / 2

  // Cross-sectional area
  const areaM2 = widthM * thicknessM

  // Thickness ratio: β = T / (d_i/2 + T/2)
  const ratioNumerator = thicknessM
  const ratioDenominator = (idM / 2) + (thicknessM / 2)

  if (ratioDenominator === 0) {
    throw new Error('Invalid ring geometry: denominator is zero')
  }

  const beta = ratioNumerator / ratioDenominator

  // First term: F / (E × W × T)
  const firstTerm = loadN / (E * areaM2)

  // Second term: (0.324×(6-β))/(β×(2-β)) + 0.5
  const secondTermNum = 0.324 * (6 - beta)
  const secondTermDenom = beta * (2 - beta)

  if (secondTermDenom === 0) {
    throw new Error('Invalid ring geometry: second term denominator is zero')
  }

  const secondTerm = (secondTermNum / secondTermDenom) + 0.5

  // Result: -(FirstTerm × SecondTerm) × 1e6 (note the negative sign)
  return -(firstTerm * secondTerm * 1e6)
}
