/** Shear stress and strain calculations */

/**
 * Calculate shear stress
 * τ = F / A
 * @param forceN Force in Newtons (or lbs in US units)
 * @param areaMm2 Cross-sectional area in mm² (or in² in US)
 * @returns Shear stress in Pa (or psi in US)
 */
export function calculateShearStress(
  forceN: number,
  areaMm2: number
): number {
  if (areaMm2 === 0) {
    throw new Error('Area must be non-zero')
  }
  // τ = F/A
  return forceN / areaMm2
}

/**
 * Calculate shear strain
 * γ = tan(θ) ≈ θ (for small angles in radians)
 * @param deflectionMm Transverse deflection in mm
 * @param heightMm Height or thickness in mm
 * @returns Shear strain (dimensionless, in microstrain × 1e-6)
 */
export function calculateShearStrain(
  deflectionMm: number,
  heightMm: number
): number {
  if (heightMm === 0) {
    throw new Error('Height must be non-zero')
  }
  // γ = angular deflection = deflection/height
  return (deflectionMm / heightMm) * 1e6 // Convert to microstrain
}

/**
 * Calculate shear modulus from shear stress and strain
 * G = τ / γ (Shear modulus = Shear stress / Shear strain)
 * Typical values: Steel ≈ 80 GPa, Aluminum ≈ 25 GPa
 * @param shearStress Shear stress in Pa
 * @param shearStrain Shear strain (dimensionless)
 * @returns Shear modulus in Pa
 */
export function calculateShearModulus(
  shearStress: number,
  shearStrain: number
): number {
  if (shearStrain === 0) {
    throw new Error('Shear strain must be non-zero')
  }
  return shearStress / shearStrain
}

/**
 * Calculate shear stress from shear modulus and strain
 * τ = G × γ
 * @param shearModulusz Shear modulus (Pa)
 * @param shearStrain Shear strain (dimensionless)
 * @returns Shear stress in Pa
 */
export function calculateShearStressFromModulus(
  shearModulus: number,
  shearStrain: number
): number {
  return shearModulus * shearStrain
}

/**
 * Calculate angle of twist for a shaft (SI-consistent)
 * θ = (T × L) / (G × Ip)
 * Formula: converts all inputs to SI base units (m, Pa, m⁴) before calculation.
 * @param torqueNm Torque in N⋅m
 * @param lengthMm Shaft length in mm (converted internally to m)
 * @param shearModulus Shear modulus: accepts GPa numeric value (e.g. 80) or Pa (e.g. 80e9); auto-detected and converted to Pa
 * @param polarMomentMm4 Polar moment of inertia in mm⁴ (converted internally to m⁴)
 * @returns Twist angle in radians (SI)
 */
export function calculateTwistAngle(
  torqueNm: number,
  lengthMm: number,
  shearModulus: number,
  polarMomentMm4: number
): number {
  if (polarMomentMm4 === 0) {
    throw new Error('Polar moment must be non-zero')
  }
  // Normalize shear modulus to Pa (auto-detect if GPa or Pa based on magnitude)
  const shearModulusPa = shearModulus < 1e6 ? shearModulus * 1e9 : shearModulus

  // Convert length mm -> m, polar moment mm^4 -> m^4
  const lengthM = lengthMm / 1000
  const ipM4 = polarMomentMm4 * 1e-12

  // θ = T * L / (G * Ip)  (radians)
  const theta = (torqueNm * lengthM) / (shearModulusPa * ipM4)
  // Return SI-consistent radians (no compatibility scaling)
  return theta
}

/**
 * Calculate polar moment of inertia for solid circular shaft
 * Ip = π × d⁴ / 32 (solid); Ip = π × (do⁴ - di⁴) / 32 (hollow)
 * @param diameterMm Diameter in mm (for solid shaft)
 * @returns Polar moment of inertia in mm⁴
 */
export function calculateSolidCircularPolarMoment(diameterMm: number): number {
  const radius = diameterMm / 2
  return (Math.PI * Math.pow(diameterMm, 4)) / 32
}

/**
 * Calculate polar moment for hollow circular shaft
 * @param outerDiameterMm Outer diameter in mm
 * @param innerDiameterMm Inner diameter in mm
 * @returns Polar moment of inertia in mm⁴
 */
export function calculateHollowCircularPolarMoment(
  outerDiameterMm: number,
  innerDiameterMm: number
): number {
  const do4 = Math.pow(outerDiameterMm, 4)
  const di4 = Math.pow(innerDiameterMm, 4)
  return (Math.PI * (do4 - di4)) / 32
}

/**
 * Relationship between Young's modulus, Shear modulus, and Poisson's ratio
 * G = E / (2 × (1 + ν))
 * @param youngsModulusPa Young's modulus in Pa
 * @param poissonRatio Poisson's ratio (dimensionless, typically 0.3)
 * @returns Shear modulus in Pa
 */
export function calculateShearModulusFromYoungs(
  youngsModulusGPa: number,
  poissonRatio: number
): number {
  return youngsModulusGPa / (2 * (1 + poissonRatio))
}

/**
 * Calculate torsional rigidity (resistance to twist) (SI-consistent)
 * Rigidity = G × Ip / L
 * Formula: converts all inputs to SI units (Pa, m⁴, m) before calculation.
 * @param shearModulus Shear modulus: accepts GPa numeric value (e.g. 80) or Pa (e.g. 80e9); auto-detected and converted to Pa
 * @param polarMomentMm4 Polar moment of inertia in mm⁴ (converted internally to m⁴)
 * @param lengthMm Shaft length in mm (converted internally to m)
 * @returns Rigidity in N⋅m/radian (SI)
 */
export function calculateTorsionalRigidity(
  shearModulus: number,
  polarMomentMm4: number,
  lengthMm: number
): number {
  if (lengthMm === 0) {
    throw new Error('Length must be non-zero')
  }
  // Treat `shearModulusGPa` as GPa (as used across this module/tests)
  // Rigidity = G (GPa) × Ip (mm⁴) / L (mm)
  // This returns a value in the same scaled units the tests expect (N·mm per radian in scaled units)
  // Convert all inputs to SI: G to Pa, Ip to m⁴, L to m
  const shearModulusPa = shearModulus < 1e6 ? shearModulus * 1e9 : shearModulus
  const ipM4 = polarMomentMm4 * 1e-12
  const lengthM = lengthMm / 1000
  // Return rigidity: G·Ip/L in N·m/rad
  return (shearModulusPa * ipM4) / lengthM
}

