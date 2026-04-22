/**
 * 6-DOF Force/Torque sensor design — cross-beam geometry.
 *
 * Analytical model for a Maltese-cross (4-arm) flexure element:
 *   - 4 rectangular beam arms radiate from a central hub to an outer ring
 *   - Bending gages on Z-faces sense Fz, Mx, My
 *   - 45° shear gages on beam faces sense Fx, Fy, Mz
 *
 * Sensitivity formulas derived from Euler-Bernoulli beam theory:
 *
 *   S_Fz  = 1.5 · GF · L_eff / (E · b · t²)   [mV/V per N]
 *   S_Fx  = S_Fy = 3 · GF · (1+ν) / (4·E·b·t)  [mV/V per N]
 *   S_Mx  = S_My = 3 · GF · L_eff / (Ri·E·b·t²) [mV/V per N·m]
 *   S_Mz  = 3 · GF · (1+ν) / (8·Ra·E·b·t)       [mV/V per N·m]
 *
 * where:
 *   L_eff = (outerRadius − innerRadius) − gageDistFromOuterRing  (effective moment arm to hub)
 *   Ri    = innerRadius (hub radius, moment arm for Mx/My)
 *   Ra    = (outerRadius + innerRadius) / 2 (beam centroid radius, moment arm for Mz)
 *
 * Bridge assumptions:
 *   Fz  — full 4-arm Wheatstone bridge (top/bottom of 4 arms, all additive)
 *   Fx/Fy — full bridge from 4 × 45° shear gages on 2 perpendicular arms
 *   Mx/My — full bridge from 4 gages on 2 opposite arms (differential bending)
 *   Mz   — full bridge from 8 × 45° shear gages on 4 arms (2 per bridge arm in series)
 *
 * Natural frequencies (Fu & Song 2018, J. Sensors):
 *   Fz  — 4 arms bending axially (Z), strong-axis I = b·t³/12
 *   Fx/Fy — 2 arms bending laterally, weak-axis I = t·b³/12
 *   Mz  — 4 arms bending tangentially (rotational mode), k_rot = 4·k_lat·Ri²
 *   Working bandwidth = min(fn_Fx, fn_Fy, fn_Fz, fn_Mz) / 4  (Fu & Song rule)
 *
 * Timoshenko shear correction (Wang et al. 2017, IEEE Sensors J.):
 *   For short arms (L/t < 10), shear deformation reduces effective stiffness.
 *   Φ = 12EI / (κGAL²) where κ = 5/6 for rectangular section.
 *   Corrected stiffness k_tc = k_EB / (1 + Φ).
 *   Applied to stiffness and natural frequency; bending-moment-based
 *   sensitivity formulas are unchanged (M(x) = F·L_eff regardless of shear correction).
 *
 * Coupling: zero for a perfectly symmetric geometry (off-diagonal terms not modelled here).
 * Real sensors have 1–5% coupling from manufacturing tolerances.
 */

// All SI internally: Pa, m, N, N·m

export interface GageStrain {
  /** Gage identifier (G1–G6, or 'peak') */
  id: string
  /** Load channel this gage primarily contributes to */
  channel: string
  /** Arm(s) where gage is located */
  arms: string
  /** Surface or face where gage is bonded */
  face: string
  /** Gage orientation */
  orientation: 'bending (axial)' | 'shear (45°)'
  /** Strain at rated load for this channel (µε) */
  strainMicrostrain: number
  /**
   * Physical grid numbers (1–8) contributing to this bridge combination.
   * Numbering: +X arm → 1(long) 2(shear); +Y → 3(long) 4(shear);
   *            −X arm → 5(long) 6(shear); −Y → 7(long) 8(shear).
   */
  gridNums: number[]
}

/** One step in a calibration procedure: apply this load, expect these voltages. */
export interface CalibrationStep {
  /** Human-readable label, e.g. "+Fz at rated" */
  label: string
  /** Applied wrench [Fx, Fy, Fz, Mx, My, Mz] in N and N·m */
  appliedLoad: [number, number, number, number, number, number]
  /** Expected bridge output for each channel [V1..V6] in mV/V */
  expectedVoltages: [number, number, number, number, number, number]
}

/**
 * Calibration matrix and 12-step load procedure for the sensor.
 * For cross-beam (diagonal S matrix): C = S⁻¹ is trivially diagonal (1/S_i).
 * For hexapod: C = J⁻¹ (already computed in hexapodFT).
 */
export interface CalibrationProcedure {
  /**
   * 6×6 calibration matrix C mapping bridge voltages [V1..V6] to wrench [F, M].
   * Apply: wrench = C × voltages.
   */
  matrix: number[][]
  /** 12 standard calibration load steps (±Fx, ±Fy, ±Fz, ±Mx, ±My, ±Mz at rated). */
  loadSteps: CalibrationStep[]
}

export interface CrossBeamFTParams {
  /** Outer ring radius (mm) */
  outerRadiusMm: number
  /** Hub (inner) radius — where beams attach to central boss (mm) */
  innerRadiusMm: number
  /** Beam width — tangential direction (mm) */
  beamWidthMm: number
  /** Beam thickness — axial / Z direction (mm) */
  beamThicknessMm: number
  /**
   * Distance from gage centre to the outer-ring beam root (mm).
   * 0 = gage at max-moment location (outer ring), L = gage at hub.
   * Typical: 2–5 mm from the root for max sensitivity.
   */
  gageDistFromOuterRingMm: number
  /** Young's modulus (Pa; values < 1e6 treated as GPa and auto-converted) */
  youngsModulusPa: number
  /** Poisson's ratio (dimensionless, e.g. 0.3 for steel) */
  poissonRatio: number
  /** Gage factor (dimensionless, e.g. 2.0) */
  gageFactor: number
  /** Rated full-scale force (Fx = Fy = Fz = this value, N) */
  ratedForceN: number
  /** Rated full-scale moment (Mx = My = Mz = this value, N·m) */
  ratedMomentNm: number
  /** Material density for natural frequency estimate (kg/m³, default 7850 steel) */
  densityKgM3?: number
  /** 0.2% yield strength (Pa). When provided, yieldSafetyFactor is computed. */
  yieldStrengthPa?: number
  /**
   * Apply Timoshenko shear correction to stiffness and natural frequencies (default true).
   * Important for short arms (beam length / thickness < 10).
   */
  shearCorrection?: boolean
}

export interface SixAxisChannelSensitivities {
  /** Sensitivity per unit load, mV/V per N */
  Fx: number
  Fy: number
  Fz: number
  /** Sensitivity per unit load, mV/V per N·m */
  Mx: number
  My: number
  Mz: number
}

export interface SixAxisFTResult {
  isValid: boolean
  error?: string
  warnings: string[]

  /** Per-channel sensitivity (mV/V per N or N·m) */
  sensitivity: SixAxisChannelSensitivities

  /** Full-span bridge output at rated load (mV/V) */
  ratedOutput: SixAxisChannelSensitivities

  /**
   * Condition number of the normalized sensitivity matrix.
   * = max(ratedOutput) / min(ratedOutput).
   * Lower = better balanced channels. Ideal: 1.0. Acceptable: < 10.
   */
  conditionNumber: number

  /**
   * Cross-axis coupling (% of diagonal sensitivity).
   * 0% for ideal symmetric geometry; real sensors: 1–5%.
   */
  crossAxisCouplingPct: number

  /** Axial (Fz) stiffness of the flexure (N/m), Timoshenko-corrected if enabled */
  axialStiffnessNPerM: number

  /** Approximate natural frequency along Fz axis (Hz) — unloaded sensor mass only */
  naturalFrequencyFzHz: number

  /**
   * Approximate natural frequency for Fx/Fy lateral bending modes (Hz).
   * 2 arms bending in weak-axis (I_lat = t·b³/12). Always equal by symmetry.
   * (Fu & Song 2018)
   */
  naturalFrequencyFxHz: number
  naturalFrequencyFyHz: number

  /**
   * Approximate natural frequency for Mz torsional mode (Hz).
   * All 4 arms resist rotation via tangential bending stiffness × Ri².
   * (Fu & Song 2018)
   */
  naturalFrequencyMzHz: number

  /**
   * Working bandwidth estimate = min(fn_Fx, fn_Fy, fn_Fz, fn_Mz) / 4.
   * Empirical rule from Fu & Song 2018 (crossbeam showed fn > 1600 Hz, bandwidth > 400 Hz).
   */
  workingBandwidthHz: number

  /**
   * Timoshenko shear correction factor Φ for the Fz bending mode.
   * Φ = 12EI_strong / (κGA L²); k_corrected = k_EB / (1 + Φ).
   * Small (< 0.05) for slender arms; significant for short stubby arms.
   */
  timoshenkoPhiFz: number

  /**
   * Timoshenko shear correction factor Φ for the Fx/Fy lateral bending mode.
   * Φ = 12EI_lat / (κGA L²); larger than PhiFz when b > t.
   */
  timoshenkoPhiFx: number

  /**
   * Maximum surface strain in any arm at rated loads (µε).
   * The worst-case combination of Fz and Mx contributions.
   */
  maxStrainMicrostrain: number

  /**
   * Strain safety factor = 1500 µε design limit / maxStrain.
   * 1500 µε is a conservative fatigue limit for steel transducers.
   * > 2.0 is typical design target.
   */
  strainSafetyFactor: number

  /**
   * Yield safety factor = yieldStrength / peakBendingStress.
   * undefined when yieldStrengthPa is not supplied.
   */
  yieldSafetyFactor?: number

  /**
   * Individual gage-level strains at rated loads (µε).
   * Each entry represents one gage type / location / load channel.
   */
  gageStrains: GageStrain[]

  /** Geometry snapshot for visualization */
  geometry: {
    outerRadiusMm: number
    innerRadiusMm: number
    beamWidthMm: number
    beamThicknessMm: number
    beamLengthMm: number
    gageDistFromOuterRingMm: number
  }
}

// Conservative fatigue strain limit for steel transducer flexures (µε)
const STRAIN_LIMIT_MICROSTRAIN = 1500

// Timoshenko shear coefficient for rectangular sections
const KAPPA_RECT = 5 / 6

export function designCrossBeamFT(params: CrossBeamFTParams): SixAxisFTResult {
  const warnings: string[] = []

  // ── Unit normalization ───────────────────────────────────────────────────────
  const E = params.youngsModulusPa < 1e6
    ? params.youngsModulusPa * 1e9
    : params.youngsModulusPa

  const b   = params.beamWidthMm / 1000          // m
  const t   = params.beamThicknessMm / 1000       // m
  const R_o = params.outerRadiusMm / 1000         // m
  const R_i = params.innerRadiusMm / 1000         // m
  const xg  = params.gageDistFromOuterRingMm / 1000 // m

  const nu  = params.poissonRatio
  const GF  = params.gageFactor
  const rF  = params.ratedForceN
  const rM  = params.ratedMomentNm
  const rho = params.densityKgM3 ?? 7850
  const useTimoshenko = params.shearCorrection !== false  // default true

  // ── Validation ───────────────────────────────────────────────────────────────
  if (R_o <= 0 || R_i <= 0)
    return invalid('Radii must be greater than zero.', params)
  if (R_i >= R_o)
    return invalid('Inner radius must be less than outer radius.', params)
  if (b <= 0)
    return invalid('Beam width must be greater than zero.', params)
  if (t <= 0)
    return invalid('Beam thickness must be greater than zero.', params)
  if (E <= 0)
    return invalid("Young's modulus must be greater than zero.", params)
  if (rF <= 0 || rM <= 0)
    return invalid('Rated force and moment must be greater than zero.', params)

  const L = R_o - R_i   // beam length (m)

  if (xg < 0 || xg >= L)
    return invalid('Gage distance from outer ring must be between 0 and beam length.', params)
  if (b >= L)
    warnings.push('Beam width ≥ beam length; slender beam assumption may not hold.')
  if (t >= b)
    warnings.push('Beam thickness ≥ width; bending gages are on the narrow face — consider swapping b and t.')
  if (4 * b > 2 * Math.PI * R_i)
    warnings.push('Combined beam width exceeds hub circumference; beams overlap at hub — reduce beam width or increase inner radius.')

  // Effective moment arm from gage to hub (load application point)
  const L_eff = L - xg   // m
  const R_arm = (R_o + R_i) / 2  // beam centroid radius for Mz (m)

  // ── Sensitivity matrix (diagonal elements, ideal geometry) ─────────────────
  // Note: sensitivity formulas use bending moment M(x) = F·L_eff, which is
  // independent of shear correction (bending moment distribution unchanged by
  // Timoshenko theory for a cantilever under tip load).

  // Fz: full 4-arm bridge from Z-face bending gages
  const S_Fz = 1.5 * GF * L_eff * 1e3 / (E * b * t * t)

  // Fx / Fy: full bridge from 45° shear gages on 2 perpendicular arms
  const S_Fx = 3 * GF * (1 + nu) * 1e3 / (4 * E * b * t)
  const S_Fy = S_Fx

  // Mx / My: full bridge from 4 gages on 2 opposite arms (differential bending)
  const S_Mx = 3 * GF * L_eff * 1e3 / (R_i * E * b * t * t)
  const S_My = S_Mx

  // Mz: 8 × 45° shear gages on all 4 arms
  const S_Mz = 3 * GF * (1 + nu) * 1e3 / (8 * R_arm * E * b * t)

  const sensitivity: SixAxisChannelSensitivities = {
    Fx: S_Fx, Fy: S_Fy, Fz: S_Fz,
    Mx: S_Mx, My: S_My, Mz: S_Mz,
  }

  // ── Rated output (mV/V at full-scale load) ───────────────────────────────────
  const ratedOutput: SixAxisChannelSensitivities = {
    Fx: S_Fx * rF,
    Fy: S_Fy * rF,
    Fz: S_Fz * rF,
    Mx: S_Mx * rM,
    My: S_My * rM,
    Mz: S_Mz * rM,
  }

  // ── Condition number ─────────────────────────────────────────────────────────
  const outputs = Object.values(ratedOutput)
  const maxOut  = Math.max(...outputs)
  const minOut  = Math.min(...outputs)
  const conditionNumber = minOut > 0 ? maxOut / minOut : Infinity

  if (conditionNumber > 20)
    warnings.push('Condition number > 20: channels are very unbalanced. Adjust rated ranges or geometry.')
  else if (conditionNumber > 10)
    warnings.push('Condition number > 10: some channels significantly weaker than others.')

  // ── Strains at rated load ────────────────────────────────────────────────────
  const eps_Fz = 6 * (rF / 4) * L_eff / (E * b * t * t) * 1e6  // µε
  const eps_Mx = 6 * (rM / (2 * R_i)) * L_eff / (E * b * t * t) * 1e6
  const eps_My = eps_Mx
  const eps_Fx_shear = 3 * rF * (1 + nu) / (4 * E * b * t) * 1e6
  const eps_Fy_shear = eps_Fx_shear
  const eps_Mz_shear = 3 * rM * (1 + nu) / (8 * R_arm * E * b * t) * 1e6

  const maxStrainMicrostrain = Math.max(eps_Fz + eps_My, eps_Fz + eps_Mx, eps_Fx_shear, eps_Mz_shear)

  const gageStrains: GageStrain[] = [
    { id: 'G1', channel: 'Fz',    gridNums: [1, 3, 5, 7], arms: 'All 4 (+X, +Y, −X, −Y)', face: 'Z-face, top surface', orientation: 'bending (axial)', strainMicrostrain: eps_Fz },
    { id: 'G2', channel: 'Mx',    gridNums: [3, 7],        arms: '±Y arms (+Y, −Y)',        face: 'Z-face, top surface', orientation: 'bending (axial)', strainMicrostrain: eps_Mx },
    { id: 'G3', channel: 'My',    gridNums: [1, 5],        arms: '±X arms (+X, −X)',        face: 'Z-face, top surface', orientation: 'bending (axial)', strainMicrostrain: eps_My },
    { id: 'G4', channel: 'Fx',    gridNums: [4, 8],        arms: '±Y arms (+Y, −Y)',        face: 'Neutral axis (side)', orientation: 'shear (45°)',     strainMicrostrain: eps_Fx_shear },
    { id: 'G5', channel: 'Fy',    gridNums: [2, 6],        arms: '±X arms (+X, −X)',        face: 'Neutral axis (side)', orientation: 'shear (45°)',     strainMicrostrain: eps_Fy_shear },
    { id: 'G6', channel: 'Mz',    gridNums: [2, 4, 6, 8], arms: 'All 4 (+X, +Y, −X, −Y)', face: 'Neutral axis (side)', orientation: 'shear (45°)',     strainMicrostrain: eps_Mz_shear },
    { id: 'peak', channel: 'Fz+Mx', gridNums: [3, 7],     arms: '±Y arms, Z-face top',     face: 'Z-face, top surface', orientation: 'bending (axial)', strainMicrostrain: eps_Fz + eps_Mx },
    { id: 'peak', channel: 'Fz+My', gridNums: [1, 5],     arms: '±X arms, Z-face top',     face: 'Z-face, top surface', orientation: 'bending (axial)', strainMicrostrain: eps_Fz + eps_My },
  ]

  if (maxStrainMicrostrain > STRAIN_LIMIT_MICROSTRAIN)
    warnings.push(`Max strain ${maxStrainMicrostrain.toFixed(0)} µε exceeds ${STRAIN_LIMIT_MICROSTRAIN} µε design limit — reduce load or increase beam cross-section.`)
  else if (maxStrainMicrostrain < 100)
    warnings.push('Max strain < 100 µε — sensor may have low sensitivity. Consider reducing beam cross-section.')

  const strainSafetyFactor = maxStrainMicrostrain > 0
    ? STRAIN_LIMIT_MICROSTRAIN / maxStrainMicrostrain
    : Infinity

  const peakStressPa = maxStrainMicrostrain * 1e-6 * E
  const yieldSafetyFactor = params.yieldStrengthPa && params.yieldStrengthPa > 0
    ? params.yieldStrengthPa / peakStressPa
    : undefined

  if (yieldSafetyFactor !== undefined && yieldSafetyFactor < 1.5)
    warnings.push(`Yield safety factor ${yieldSafetyFactor.toFixed(2)} is below 1.5 — risk of permanent deformation at rated load.`)
  else if (yieldSafetyFactor !== undefined && yieldSafetyFactor < 2.5)
    warnings.push(`Yield safety factor ${yieldSafetyFactor.toFixed(2)} is below 2.5 — consider increasing beam cross-section or selecting a stronger material.`)

  // ── Structural stiffness with Timoshenko correction ───────────────────────────
  const A_m = b * t                              // cross-section area (m²)
  const G   = E / (2 * (1 + nu))                // shear modulus (Pa)

  // Euler-Bernoulli moment of inertia
  const I_strong = b * Math.pow(t, 3) / 12      // I for Fz bending (strong axis)
  const I_lat    = t * Math.pow(b, 3) / 12      // I for Fx/Fy lateral bending (weak axis)

  // Timoshenko shear correction factors (Φ = 12EI / κGAL²)
  // For fixed-guided beam: k_TC = k_EB / (1 + Φ)
  const timoshenkoPhiFz = (12 * E * I_strong) / (KAPPA_RECT * G * A_m * L * L)
  const timoshenkoPhiFx = (12 * E * I_lat)    / (KAPPA_RECT * G * A_m * L * L)

  const corrFz = useTimoshenko ? 1 / (1 + timoshenkoPhiFz) : 1
  const corrFx = useTimoshenko ? 1 / (1 + timoshenkoPhiFx) : 1

  // Fz stiffness (4 fixed-guided arms, strong-axis bending)
  const axialStiffnessNPerM = 4 * 12 * E * I_strong / Math.pow(L, 3) * corrFz

  // Lateral (Fx/Fy) stiffness: 2 arms bending in weak axis (±Y or ±X arms)
  const lateralStiffnessNPerM = 2 * 12 * E * I_lat / Math.pow(L, 3) * corrFx

  // Mz rotational stiffness: all 4 arms, tangential bending × Ri²
  // k_Mz_rot [N·m/rad] = 4 × k_lat_per_arm × R_i²
  const k_lat_per_arm = 12 * E * I_lat / Math.pow(L, 3) * corrFx
  const rotationalStiffnessMzNmPerRad = 4 * k_lat_per_arm * R_i * R_i

  if (useTimoshenko && timoshenkoPhiFz > 0.05)
    warnings.push(`Timoshenko shear correction is ${(timoshenkoPhiFz * 100).toFixed(1)}% for Fz (L/t = ${(L / t).toFixed(1)}) — short-beam effect is significant.`)
  if (!useTimoshenko && timoshenkoPhiFz > 0.05)
    warnings.push(`Timoshenko correction disabled but L/t = ${(L / t).toFixed(1)} — short-beam shear correction could be ${(timoshenkoPhiFz * 100).toFixed(1)}%.`)

  // ── Natural frequencies ───────────────────────────────────────────────────────
  // Sensor mass (hub disk + 4 arms)
  const volHub   = Math.PI * R_i * R_i * t
  const volBeams = 4 * L * b * t
  const massSensor = rho * (volHub + volBeams)

  // fn_Fz: axial mode (4 arms, full mass participates)
  const naturalFrequencyFzHz = massSensor > 0
    ? (1 / (2 * Math.PI)) * Math.sqrt(axialStiffnessNPerM / massSensor)
    : 0

  // fn_Fx = fn_Fy: lateral bending mode (2 arms carry, full mass participates)
  const naturalFrequencyFxHz = massSensor > 0
    ? (1 / (2 * Math.PI)) * Math.sqrt(lateralStiffnessNPerM / massSensor)
    : 0
  const naturalFrequencyFyHz = naturalFrequencyFxHz

  // fn_Mz: torsional mode (rotational spring / rotational inertia)
  // Rotational inertia: hub (disk) + 4 arms (each approximated at R_arm)
  const I_rot_hub  = 0.5 * rho * volHub * R_i * R_i  // solid disk: (1/2)mr²
  const I_rot_arms = 4 * rho * b * t * L * R_arm * R_arm  // arms at centroid radius
  const I_rot_total = I_rot_hub + I_rot_arms
  const naturalFrequencyMzHz = I_rot_total > 0
    ? (1 / (2 * Math.PI)) * Math.sqrt(rotationalStiffnessMzNmPerRad / I_rot_total)
    : 0

  const workingBandwidthHz = Math.min(
    naturalFrequencyFxHz, naturalFrequencyFyHz,
    naturalFrequencyFzHz, naturalFrequencyMzHz,
  ) / 4

  const minFn = Math.min(naturalFrequencyFxHz, naturalFrequencyFzHz, naturalFrequencyMzHz)
  if (minFn < 500 && minFn > 0)
    warnings.push(`Lowest natural frequency ${minFn.toFixed(0)} Hz may be too low for kHz-rate robot control loops.`)

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
    gageStrains,
    geometry: {
      outerRadiusMm: params.outerRadiusMm,
      innerRadiusMm: params.innerRadiusMm,
      beamWidthMm:   params.beamWidthMm,
      beamThicknessMm: params.beamThicknessMm,
      beamLengthMm:  L * 1000,
      gageDistFromOuterRingMm: params.gageDistFromOuterRingMm,
    },
  }
}

/**
 * Generate a 12-step calibration procedure for the cross-beam sensor.
 * The calibration matrix C = S⁻¹ is trivially diagonal for ideal geometry.
 * Each step specifies which load to apply and what voltages to expect.
 */
export function generateCalibrationProcedure(
  result: SixAxisFTResult,
  params: CrossBeamFTParams,
): CalibrationProcedure {
  const { Fx: S_Fx, Fy: S_Fy, Fz: S_Fz, Mx: S_Mx, My: S_My, Mz: S_Mz } = result.sensitivity
  const { ratedForceN: rF, ratedMomentNm: rM } = params

  // Calibration matrix C = S⁻¹ (diagonal)
  const matrix: number[][] = Array.from({ length: 6 }, (_, i) =>
    Array.from({ length: 6 }, (_, j) => {
      if (i !== j) return 0
      const diag = [1 / S_Fx, 1 / S_Fy, 1 / S_Fz, 1 / S_Mx, 1 / S_My, 1 / S_Mz][i]
      return isFinite(diag) ? diag : 0
    })
  )

  // 12 standard load steps: ±Fx, ±Fy, ±Fz (at ratedForceN), ±Mx, ±My, ±Mz (at ratedMomentNm)
  const dofs = [
    { label: 'Fx', i: 0, rated: rF },
    { label: 'Fy', i: 1, rated: rF },
    { label: 'Fz', i: 2, rated: rF },
    { label: 'Mx', i: 3, rated: rM },
    { label: 'My', i: 4, rated: rM },
    { label: 'Mz', i: 5, rated: rM },
  ]

  const sensitivities = [S_Fx, S_Fy, S_Fz, S_Mx, S_My, S_Mz]

  const loadSteps: CalibrationStep[] = []
  for (const { label, i, rated } of dofs) {
    for (const sign of [1, -1] as const) {
      const appliedLoad = [0, 0, 0, 0, 0, 0] as [number, number, number, number, number, number]
      appliedLoad[i] = sign * rated
      const expectedVoltages = sensitivities.map((s, j) =>
        j === i ? s * sign * rated : 0
      ) as [number, number, number, number, number, number]
      loadSteps.push({
        label: `${sign > 0 ? '+' : '−'}${label} at rated`,
        appliedLoad,
        expectedVoltages,
      })
    }
  }

  return { matrix, loadSteps }
}

function invalid(error: string, params: CrossBeamFTParams): SixAxisFTResult {
  return {
    isValid: false,
    error,
    warnings: [],
    sensitivity:  { Fx: 0, Fy: 0, Fz: 0, Mx: 0, My: 0, Mz: 0 },
    ratedOutput:  { Fx: 0, Fy: 0, Fz: 0, Mx: 0, My: 0, Mz: 0 },
    conditionNumber: Infinity,
    crossAxisCouplingPct: 0,
    axialStiffnessNPerM: 0,
    naturalFrequencyFzHz: 0,
    naturalFrequencyFxHz: 0,
    naturalFrequencyFyHz: 0,
    naturalFrequencyMzHz: 0,
    workingBandwidthHz: 0,
    timoshenkoPhiFz: 0,
    timoshenkoPhiFx: 0,
    maxStrainMicrostrain: 0,
    strainSafetyFactor: 0,
    gageStrains: [],
    geometry: {
      outerRadiusMm: params.outerRadiusMm,
      innerRadiusMm: params.innerRadiusMm,
      beamWidthMm:   params.beamWidthMm,
      beamThicknessMm: params.beamThicknessMm,
      beamLengthMm:  Math.max(0, params.outerRadiusMm - params.innerRadiusMm),
      gageDistFromOuterRingMm: params.gageDistFromOuterRingMm,
    },
  }
}
