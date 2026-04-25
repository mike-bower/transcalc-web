/**
 * 3-arm (120° symmetric) cross-beam F/T sensor.
 *
 * Geometry: 3 rectangular beam arms at θ_k = k×120°, radiating from hub to outer ring.
 * Gages: 6 total — 1 bending gage (top face) + 1 shear gage (45°, side) per arm.
 * Decoding: matrix / individual-amplifier approach (not a single Wheatstone bridge).
 *
 * Sensitivity formulas (derived from Euler-Bernoulli beam theory + matrix decoding):
 *
 *   S_Fz = (3/2) · GF · L_eff / (E · b · t²)        [3-gage sum — same as 4-arm]
 *   S_Fx = S_Fy = GF · L_eff / (E · b · t²)          [cos/sin-weighted bending diff]
 *   S_Mx = S_My = GF · L_eff / (Ri · E · b · t²)     [moment-arm bending diff]
 *   S_Mz = (3/8) · GF · (1+ν) / (Ra · E · b · t)    [3 shear gages sum — same as 4-arm]
 *
 * Trade-offs vs. 4-arm cross-beam:
 *   • Fz and Mz sensitivity: equal (geometric cancellation of fewer-arm and lighter-bridge effects)
 *   • Fx/Fy sensitivity: 2/3 of Fz (vs. shear-gage-based in 4-arm — different physics)
 *   • Mx/My sensitivity: 1/3 of 4-arm (fewer arms, less efficient moment sensing)
 *   • Condition number: typically worse (Mx/My weaker than Fz/Mz)
 *   • Benefit: 2 fewer gages, simpler structure, smaller form factor, 120° rotational symmetry
 *
 * Natural frequencies: Fz (3 strong-axis arms), Fx/Fy (3-arm lateral effective stiffness × 1.5),
 * Mz (3 arms tangential, k_Mz = 3·k_lat·Ri²). Same Timoshenko correction applies.
 */

export interface ThreeBeamFTParams {
  outerRadiusMm: number
  innerRadiusMm: number
  beamWidthMm: number
  beamThicknessMm: number
  gageDistFromOuterRingMm: number
  youngsModulusPa: number
  poissonRatio: number
  gageFactor: number
  ratedForceN: number
  ratedMomentNm: number
  densityKgM3?: number
  yieldStrengthPa?: number
  shearCorrection?: boolean
}

export interface ThreeBeamChannelSensitivities {
  Fx: number; Fy: number; Fz: number
  Mx: number; My: number; Mz: number
}

export interface ThreeBeamFTResult {
  isValid: boolean
  error?: string
  warnings: string[]

  sensitivity: ThreeBeamChannelSensitivities
  ratedOutput: ThreeBeamChannelSensitivities

  conditionNumber: number
  crossAxisCouplingPct: number

  axialStiffnessNPerM: number
  naturalFrequencyFzHz: number
  naturalFrequencyFxHz: number
  naturalFrequencyFyHz: number
  naturalFrequencyMzHz: number
  workingBandwidthHz: number

  timoshenkoPhiFz: number
  timoshenkoPhiFx: number

  maxStrainMicrostrain: number
  strainSafetyFactor: number
  yieldSafetyFactor?: number

  /** Strain at rated load per channel (µε in beam bending gages) */
  strains: {
    epsFzPerArm: number
    epsFxMaxArm: number
    epsMxMaxArm: number
    epsShearMzArm: number
    peakBendingCombined: number
  }

  geometry: {
    outerRadiusMm: number
    innerRadiusMm: number
    beamWidthMm: number
    beamThicknessMm: number
    beamLengthMm: number
    gageDistFromOuterRingMm: number
  }
}

const STRAIN_LIMIT_MICROSTRAIN = 1500
const KAPPA_RECT = 5 / 6

export function designThreeBeamFT(p: ThreeBeamFTParams): ThreeBeamFTResult {
  const warnings: string[] = []

  const E = p.youngsModulusPa < 1e6 ? p.youngsModulusPa * 1e9 : p.youngsModulusPa
  const b   = p.beamWidthMm / 1000
  const t   = p.beamThicknessMm / 1000
  const R_o = p.outerRadiusMm / 1000
  const R_i = p.innerRadiusMm / 1000
  const xg  = p.gageDistFromOuterRingMm / 1000
  const nu  = p.poissonRatio
  const GF  = p.gageFactor
  const rF  = p.ratedForceN
  const rM  = p.ratedMomentNm
  const rho = p.densityKgM3 ?? 7850
  const useTC = p.shearCorrection !== false

  if (R_o <= 0 || R_i <= 0) return invalid('Radii must be greater than zero.', p)
  if (R_i >= R_o)            return invalid('Inner radius must be less than outer radius.', p)
  if (b <= 0)                return invalid('Beam width must be greater than zero.', p)
  if (t <= 0)                return invalid('Beam thickness must be greater than zero.', p)
  if (E <= 0)                return invalid("Young's modulus must be greater than zero.", p)
  if (rF <= 0 || rM <= 0)   return invalid('Rated force and moment must be greater than zero.', p)

  const L = R_o - R_i
  if (xg < 0 || xg >= L)
    return invalid('Gage distance from outer ring must be between 0 and beam length.', p)
  if (b >= L)
    warnings.push('Beam width ≥ beam length; slender beam assumption may not hold.')
  if (t >= b)
    warnings.push('Beam thickness ≥ width; consider swapping b and t.')
  if (3 * b > 2 * Math.PI * R_i)
    warnings.push('Combined beam width exceeds hub circumference; beams may overlap at hub.')

  const L_eff = L - xg
  const R_arm = (R_o + R_i) / 2

  // ── Sensitivity matrix (diagonal terms) ──────────────────────────────────────
  const S_Fz = 1.5 * GF * L_eff * 1e3 / (E * b * t * t)
  const S_Fx = GF * L_eff * 1e3 / (E * b * t * t)
  const S_Fy = S_Fx
  const S_Mx = GF * L_eff * 1e3 / (R_i * E * b * t * t)
  const S_My = S_Mx
  const S_Mz = 3 * GF * (1 + nu) * 1e3 / (8 * R_arm * E * b * t)

  const sensitivity: ThreeBeamChannelSensitivities = { Fx: S_Fx, Fy: S_Fy, Fz: S_Fz, Mx: S_Mx, My: S_My, Mz: S_Mz }
  const ratedOutput: ThreeBeamChannelSensitivities = {
    Fx: S_Fx * rF, Fy: S_Fy * rF, Fz: S_Fz * rF,
    Mx: S_Mx * rM, My: S_My * rM, Mz: S_Mz * rM,
  }

  const outputs = Object.values(ratedOutput)
  const maxOut  = Math.max(...outputs)
  const minOut  = Math.min(...outputs)
  const conditionNumber = minOut > 0 ? maxOut / minOut : Infinity

  if (conditionNumber > 20)
    warnings.push('Condition number > 20: channels are very unbalanced. The 3-arm topology has inherently weaker Mx/My channels — consider adjusting rated ranges or geometry.')
  else if (conditionNumber > 10)
    warnings.push('Condition number > 10: some channels significantly weaker than others.')

  // ── Strains at rated load (µε) ──────────────────────────────────────────────
  // Fz: each arm carries Fz/3
  const epsFzPerArm = 6 * (rF / 3) * L_eff / (E * b * t * t) * 1e6

  // Fx: arm at θ=0° (max cos) carries most bending; peak strain per arm
  // ε_k ≈ 4·Fx·cos²(θ_k)·L_eff/(E·b·t²); max at θ=0°
  const epsFxMaxArm = 4 * rF * L_eff / (E * b * t * t) * 1e6

  // Mx: max arm at θ=120° or 240° (|sin|=0.866); ε = 4·Mx·|sin(θ)|·L_eff/(R_i·E·b·t²)
  const epsMxMaxArm = 4 * rM * 0.866 * L_eff / (R_i * E * b * t * t) * 1e6

  // Mz shear: ε_shear = (1+ν)·Mz·L_eff/(2·R_arm·E·b·t²) × ... from 4-arm formula relation
  const epsShearMzArm = (1 + nu) * rM / (2 * R_arm * E * b * t) * 1e6

  const peakBendingCombined = epsFzPerArm + Math.max(epsMxMaxArm, epsFxMaxArm)
  const maxStrainMicrostrain = Math.max(peakBendingCombined, epsShearMzArm)

  if (maxStrainMicrostrain > STRAIN_LIMIT_MICROSTRAIN)
    warnings.push(`Max strain ${maxStrainMicrostrain.toFixed(0)} µε exceeds ${STRAIN_LIMIT_MICROSTRAIN} µε design limit.`)
  else if (maxStrainMicrostrain < 100)
    warnings.push('Max strain < 100 µε — sensor may have low sensitivity.')

  const strainSafetyFactor = maxStrainMicrostrain > 0 ? STRAIN_LIMIT_MICROSTRAIN / maxStrainMicrostrain : Infinity
  const peakStressPa = maxStrainMicrostrain * 1e-6 * E
  const yieldSafetyFactor = p.yieldStrengthPa && p.yieldStrengthPa > 0
    ? p.yieldStrengthPa / peakStressPa : undefined

  if (yieldSafetyFactor !== undefined && yieldSafetyFactor < 1.5)
    warnings.push(`Yield safety factor ${yieldSafetyFactor.toFixed(2)} is below 1.5.`)
  else if (yieldSafetyFactor !== undefined && yieldSafetyFactor < 2.5)
    warnings.push(`Yield safety factor ${yieldSafetyFactor.toFixed(2)} is below 2.5.`)

  // ── Stiffness & natural frequencies ──────────────────────────────────────────
  const A_m = b * t
  const G   = E / (2 * (1 + nu))
  const I_strong = b * Math.pow(t, 3) / 12
  const I_lat    = t * Math.pow(b, 3) / 12

  const timoshenkoPhiFz = (12 * E * I_strong) / (KAPPA_RECT * G * A_m * L * L)
  const timoshenkoPhiFx = (12 * E * I_lat)    / (KAPPA_RECT * G * A_m * L * L)
  const corrFz = useTC ? 1 / (1 + timoshenkoPhiFz) : 1
  const corrFx = useTC ? 1 / (1 + timoshenkoPhiFx) : 1

  if (useTC && timoshenkoPhiFz > 0.05)
    warnings.push(`Timoshenko shear correction is ${(timoshenkoPhiFz * 100).toFixed(1)}% for Fz — short-beam effect is significant.`)

  // Fz: 3 fixed-guided arms, strong axis
  const axialStiffnessNPerM = 3 * 12 * E * I_strong / Math.pow(L, 3) * corrFz

  // Fx/Fy: 3 arms, effective lateral stiffness = Σk_lat·cos²(θ_k) + Σk_strong·sin²(θ_k)
  // For typical t<<b: k_strong >> k_lat, but for generality:
  // Σcos²(θ_k) = 1.5, Σsin²(θ_k) = 1.5
  const k_arm_strong = 12 * E * I_strong / Math.pow(L, 3) * corrFz
  const k_arm_lat    = 12 * E * I_lat    / Math.pow(L, 3) * corrFx
  // Effective lateral stiffness in X direction (cos² weighting for strong + sin² for lat)
  const lateralStiffnessNPerM = 1.5 * k_arm_strong + 1.5 * k_arm_lat

  // Mz: 3 arms tangential bending, k_Mz [N·m/rad] = 3·k_lat_per_arm·R_i²
  const rotationalStiffnessMzNmPerRad = 3 * k_arm_lat * R_i * R_i

  // Sensor mass: hub + 3 arms
  const volHub   = Math.PI * R_i * R_i * t
  const volBeams = 3 * L * b * t
  const massSensor = rho * (volHub + volBeams)

  const naturalFrequencyFzHz = massSensor > 0
    ? (1 / (2 * Math.PI)) * Math.sqrt(axialStiffnessNPerM / massSensor) : 0
  const naturalFrequencyFxHz = massSensor > 0
    ? (1 / (2 * Math.PI)) * Math.sqrt(lateralStiffnessNPerM / massSensor) : 0
  const naturalFrequencyFyHz = naturalFrequencyFxHz

  const I_rot_hub  = 0.5 * rho * volHub * R_i * R_i
  const I_rot_arms = 3 * rho * b * t * L * R_arm * R_arm
  const I_rot_total = I_rot_hub + I_rot_arms
  const naturalFrequencyMzHz = I_rot_total > 0
    ? (1 / (2 * Math.PI)) * Math.sqrt(rotationalStiffnessMzNmPerRad / I_rot_total) : 0

  const workingBandwidthHz = Math.min(
    naturalFrequencyFxHz, naturalFrequencyFyHz,
    naturalFrequencyFzHz, naturalFrequencyMzHz,
  ) / 4

  const minFn = Math.min(naturalFrequencyFxHz, naturalFrequencyFzHz, naturalFrequencyMzHz)
  if (minFn < 500 && minFn > 0)
    warnings.push(`Lowest natural frequency ${minFn.toFixed(0)} Hz may be too low for kHz-rate control loops.`)

  return {
    isValid: true,
    warnings,
    sensitivity,
    ratedOutput,
    conditionNumber,
    crossAxisCouplingPct: 0,
    axialStiffnessNPerM,
    naturalFrequencyFzHz,
    naturalFrequencyFxHz,
    naturalFrequencyFyHz,
    naturalFrequencyMzHz,
    workingBandwidthHz,
    timoshenkoPhiFz,
    timoshenkoPhiFx,
    maxStrainMicrostrain,
    strainSafetyFactor,
    yieldSafetyFactor,
    strains: { epsFzPerArm, epsFxMaxArm, epsMxMaxArm, epsShearMzArm, peakBendingCombined },
    geometry: {
      outerRadiusMm: p.outerRadiusMm,
      innerRadiusMm: p.innerRadiusMm,
      beamWidthMm: p.beamWidthMm,
      beamThicknessMm: p.beamThicknessMm,
      beamLengthMm: L * 1000,
      gageDistFromOuterRingMm: p.gageDistFromOuterRingMm,
    },
  }
}

function invalid(error: string, p: ThreeBeamFTParams): ThreeBeamFTResult {
  const zero: ThreeBeamChannelSensitivities = { Fx: 0, Fy: 0, Fz: 0, Mx: 0, My: 0, Mz: 0 }
  return {
    isValid: false, error, warnings: [],
    sensitivity: zero, ratedOutput: zero,
    conditionNumber: Infinity, crossAxisCouplingPct: 0,
    axialStiffnessNPerM: 0,
    naturalFrequencyFzHz: 0, naturalFrequencyFxHz: 0,
    naturalFrequencyFyHz: 0, naturalFrequencyMzHz: 0,
    workingBandwidthHz: 0,
    timoshenkoPhiFz: 0, timoshenkoPhiFx: 0,
    maxStrainMicrostrain: 0, strainSafetyFactor: 0,
    strains: { epsFzPerArm: 0, epsFxMaxArm: 0, epsMxMaxArm: 0, epsShearMzArm: 0, peakBendingCombined: 0 },
    geometry: {
      outerRadiusMm: p.outerRadiusMm, innerRadiusMm: p.innerRadiusMm,
      beamWidthMm: p.beamWidthMm, beamThicknessMm: p.beamThicknessMm,
      beamLengthMm: Math.max(0, p.outerRadiusMm - p.innerRadiusMm),
      gageDistFromOuterRingMm: p.gageDistFromOuterRingMm,
    },
  }
}
