export type CantileverInput = {
  appliedLoad: number // N
  beamWidth: number // mm
  thickness: number // mm
  momentArm: number // mm
}

// Returns bending stress in MPa using simple rectangular cross-section cantilever approximation
export function computeCantileverStress(
  appliedLoad: number,
  beamWidth: number,
  thickness: number,
  momentArm: number
): number {
  // moment = load * momentArm (N*mm)
  const moment = appliedLoad * momentArm
  // section modulus for rectangular section: Z = (b * h^2) / 6 (mm^3)
  const sectionModulus = (beamWidth * Math.pow(thickness, 2)) / 6
  // stress (N/mm^2) = moment / Z -> convert to MPa (1 N/mm^2 = 1 MPa)
  const stressMPa = moment / sectionModulus
  return stressMPa
}
