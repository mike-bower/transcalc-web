/** Fatigue analysis, vibration, and dynamic loading */

/**
 * Calculate fatigue life using S-N (stress-life) curve
 * log(N) = (log(Se) - log(S)) / (log(Se) - log(Sf))
 * where Se = fatigue limit (1e6 cycles), Sf = fatigue strength coefficient
 * @param stressMpa Stress amplitude in MPa
 * @param fatigueLimitMpa Fatigue limit (endurance limit) in MPa
 * @param fatigueStrengthCoeff Fatigue strength coefficient in MPa
 * @returns Estimated fatigue life in cycles
 */
export function calculateFatigueLife(
  stressMpa: number,
  fatigueLimitMpa: number,
  fatigueStrengthCoeff: number
): number {
  if (
    stressMpa <= 0 ||
    fatigueLimitMpa <= 0 ||
    fatigueStrengthCoeff <= 0
  ) {
    throw new Error('All stress values must be positive')
  }

  // If stress is below fatigue limit, infinite life
  if (stressMpa <= fatigueLimitMpa) {
    return Infinity
  }

  // Morrow's equation: log10(N) = (log10(Sf) - log10(S_a)) / (b)
  // where b = (log10(Sf) - log10(Se)) / log10(2e6)
  const logSf = Math.log10(fatigueStrengthCoeff)
  const logSa = Math.log10(stressMpa)
  
  // Morrow parameters (simplified)
  const refLife = 1e6 // Reference life at fatigue limit
  const b = Math.log10(fatigueLimitMpa / fatigueStrengthCoeff) / Math.log10(2 * refLife)
  
  const logN = (logSf - logSa) / b
  return Math.pow(10, logN)
}

/**
 * Calculate stress concentration factor (Kt) for notched members
 * Empirical formula for circular notches: Kt ≈ 1 + (2 × r / d)
 * @param notchRadiusMm Notch radius in mm
 * @param minorDiameterMm Minor diameter (or thickness) in mm
 * @returns Stress concentration factor (>1.0)
 */
export function calculateStressConcentrationNotch(
  notchRadiusMm: number,
  minorDiameterMm: number
): number {
  if (minorDiameterMm === 0) {
    throw new Error('Minor diameter must be non-zero')
  }
  // Simplified Peterson's formula for ductile materials
  const geometricFactor = 2 * notchRadiusMm / minorDiameterMm
  return 1 + geometricFactor * 0.9 // Reduction factor for ductility
}

/**
 * Calculate fatigue notch factor (Kf)
 * Kf = 1 + q × (Kt - 1)
 * where q = notch sensitivity (0-1, depends on material and notch geometry)
 * @param stressConcentrationFactor Kt (from geometry)
 * @param notchSensitivity Notch sensitivity coefficient (0.5-1.0)
 * @returns Fatigue notch factor
 */
export function calculateFatigueNotchFactor(
  stressConcentrationFactor: number,
  notchSensitivity: number
): number {
  return 1 + notchSensitivity * (stressConcentrationFactor - 1)
}

/**
 * Calculate equivalent (Von Mises) stress from principal stresses (SI-consistent)
 * σ_eq = sqrt[(σ1² + σ2² + σ3² - σ1·σ2 - σ2·σ3 - σ3·σ1) / 2]
 * All inputs and outputs use the same stress units (no unit conversion required).
 * @param stress1 First principal stress (same units as output: Pa, MPa, or user-defined)
 * @param stress2 Second principal stress (same units as output)
 * @param stress3 Third principal stress (same units as output)
 * @returns Von Mises equivalent stress (same units as input stresses)
 */
export function calculateVonMisesStress(
  stress1: number,
  stress2: number,
  stress3: number
): number {
  // Use the common engineering form: sqrt((σ1² + σ2² + σ3² - σ1σ2 - σ2σ3 - σ3σ1) / 2)
  const s1 = stress1
  const s2 = stress2
  const s3 = stress3
  const numerator = s1 * s1 + s2 * s2 + s3 * s3 - s1 * s2 - s2 * s3 - s3 * s1
  return Math.sqrt(numerator / 2)
}

/**
 * Calculate natural frequency of a cantilever beam
 * f = λ² / (2π) × sqrt(EI / (ρ × A × L⁴))
 * where λ = 1.875 for first mode
 * @param youngsModulusPa Young's modulus in Pa
 * @param momentOfInertia Moment of inertia in mm⁴
 * @param densityKgMm3 Material density in kg/mm³
 * @param crossSectionAreaMm2 Area in mm²
 * @param lengthMm Beam length in mm
 * @returns Natural frequency in Hz (first mode)
 */
export function calculateCantileverNaturalFrequency(
  youngsModulusPa: number,
  momentOfInertiaMm4: number,
  densityKgMm3: number,
  crossSectionAreaMm2: number,
  lengthMm: number
): number {
  if (
    crossSectionAreaMm2 === 0 ||
    lengthMm === 0 ||
    momentOfInertiaMm4 === 0
  ) {
    throw new Error('Cross-section area, length, and moment of inertia must be non-zero')
  }

  const lambda = 1.875 // First bending mode
  const numerator = youngsModulusPa * momentOfInertiaMm4
  const denominator =
    densityKgMm3 *
    crossSectionAreaMm2 *
    Math.pow(lengthMm, 4)

  const result = (Math.pow(lambda, 2) / (2 * Math.PI)) *
    Math.sqrt(numerator / denominator)

  return result
}

/**
 * Calculate critical damping coefficient
 * c_critical = 2 × sqrt(k × m)
 * @param stiffnessNPerMm Spring stiffness (N/mm)
 * @param massMg Mass in arbitrary units (ratio relevant)
 * @returns Critical damping coefficient (same units as stiffness)
 */
export function calculateCriticalDamping(
  stiffnessNPerMm: number,
  massKg: number
): number {
  const omega0 = Math.sqrt(stiffnessNPerMm / massKg) // Natural frequency
  return 2 * omega0 * massKg
}

/**
 * Calculate damping ratio from damping coefficient and critical damping
 * ζ = c / c_critical
 * @param dampingCoefficient Actual damping coefficient
 * @param criticalDampingCoefficient Critical damping coefficient
 * @returns Damping ratio (0=undamped, 1=critical, >1=overdamped)
 */
export function calculateDampingRatio(
  dampingCoefficient: number,
  criticalDampingCoefficient: number
): number {
  if (criticalDampingCoefficient === 0) {
    throw new Error('Critical damping must be non-zero')
  }
  return dampingCoefficient / criticalDampingCoefficient
}

/**
 * Calculate peak response of undamped vibration system to impulse
 * Peak = Impulse / (mass × natural_frequency)
 * @param impulseNs Impulse (Force × time) in N⋅s
 * @param massKg Mass in kg
 * @param naturalFrequencyHz Natural frequency in Hz
 * @returns Peak displacement in mm
 */
export function calculateImpulseResponse(
  impulseNs: number,
  massKg: number,
  naturalFrequencyHz: number
): number {
  if (naturalFrequencyHz === 0 || massKg === 0) {
    throw new Error('Natural frequency and mass must be non-zero')
  }
  const omegaN = 2 * Math.PI * naturalFrequencyHz
  return (impulseNs / (massKg * omegaN)) * 1000 // Convert to mm
}

/**
 * Calculate stress amplification at resonance
 * Q = 1 / (2 × ζ) at resonance
 * Amplification = Force / (k × displacement_static)
 * @param dampingRatio Damping ratio ζ (0-1 typical)
 * @returns Amplification factor at resonance
 */
export function calculateResonanceAmplification(dampingRatio: number): number {
  if (dampingRatio === 0) {
    return Infinity // Undamped resonance
  }
  return 1 / (2 * dampingRatio)
}
