/**
 * Joint Torque Sensor (JTS) — spoke-flexure disk design.
 *
 * Geometry: a thin annular disk with N symmetric radial spokes connecting an
 * inner hub to an outer ring.  Each spoke is instrumented with a full
 * Wheatstone bridge (two active + two transverse arms) oriented to sense the
 * bending strain at the spoke root — the highest-stress location.
 *
 * The sensor converts applied torque T into differential bending across paired
 * spokes.  Half the spokes bend in tension, half in compression, giving a
 * natural full-bridge output.
 *
 * Primary derived quantities
 * ──────────────────────────
 * Torsional stiffness (N·m/rad)
 *   K = N · E · w · t³ / (12 · Ls · r²)
 *   where:
 *     N  = number of spokes
 *     E  = Young's modulus (Pa)
 *     w  = spoke width (m)
 *     t  = spoke thickness (m)
 *     Ls = spoke length = (Ro − Ri) (m)
 *     r  = pitch radius = (Ro + Ri) / 2 (m)
 *
 * Bending moment at spoke root due to applied torque T
 *   Each spoke carries a tangential force F = T / (N · r)
 *   Bending moment at root M = F · Ls = T · Ls / (N · r)
 *
 * Bending stress at spoke root (outer fibre)
 *   σ = M · (t/2) / I   where I = w · t³ / 12
 *   σ = 6 · M / (w · t²)
 *   σ = 6 · T · Ls / (N · r · w · t²)
 *
 * Peak bending strain (µε)
 *   ε = σ / E = 6 · T · Ls / (N · r · w · t² · E)
 *
 * Full-bridge span (mV/V) — full-bridge, 4-active arms (2 tension + 2 compression)
 *   Vout = GF · ε · 1e-3   (each active arm sees ε, bridge doubles the differential)
 *   Vout (mV/V) = GF · ε_µε · 1e-3
 *
 * Torsional natural frequency (simplified single-DOF, hub + flywheel approximation)
 *   fn = (1 / 2π) · √(K / J_eff)
 *   where J_eff is the rotational inertia of the outer ring mass about the hub axis.
 *   J_eff = 0.5 · m_ring · Ro²  (solid disk approximation for outer ring mass)
 *   m_ring ≈ ρ · 2π · Ro · disk_thickness · ring_width   (thin-ring approximation)
 *   disk_thickness ≈ t (spoke thickness used as a proxy for disk out-of-plane depth)
 */

// All SI internally: Pa, m, N, N·m, kg

const STRAIN_LIMIT_MICROSTRAIN = 1500 // conservative fatigue design limit

export interface JTSParams {
  /** Outer ring radius (mm) */
  outerRadiusMm: number
  /** Inner hub radius (mm) */
  innerRadiusMm: number
  /** Spoke width — tangential direction (mm) */
  spokeWidthMm: number
  /** Spoke thickness — axial direction (mm) */
  spokeThicknessMm: number
  /** Number of spokes (typically 4, 6, or 8) */
  spokeCount: number
  /** Rated torque — full-scale applied torque (N·m) */
  ratedTorqueNm: number
  /** Young's modulus (Pa; values < 1e6 treated as GPa and auto-converted) */
  youngsModulusPa: number
  /** Poisson's ratio */
  poissonRatio: number
  /** Gage factor */
  gageFactor: number
  /** Material yield strength (Pa) — for safety factor calculation */
  yieldStrengthPa?: number
  /** Material density (kg/m³) — for natural frequency estimate */
  densityKgM3?: number
}

export interface JTSResult {
  isValid: boolean
  error?: string
  warnings: string[]

  /** Torsional stiffness (N·m/rad) */
  stiffnessNmPerRad: number
  /** Torsional compliance — angular deflection per unit torque (rad/N·m) */
  complianceRadPerNm: number
  /** Angular deflection at rated torque (mrad) */
  deflectionAtRatedMrad: number

  /** Peak bending strain at spoke root at rated torque (µε) */
  peakStrainMicrostrain: number
  /** Full-bridge output at rated torque (mV/V) */
  spanMvV: number
  /** Sensitivity (mV/V per N·m) */
  sensitivityMvVPerNm: number

  /** Stress at spoke root at rated torque (MPa) */
  peakStressMPa: number
  /** Strain safety factor (1500 µε limit) */
  strainSafetyFactor: number
  /** Yield safety factor (requires yieldStrengthPa) */
  yieldSafetyFactor?: number

  /** Torsional natural frequency (Hz) — simplified lumped-mass estimate */
  naturalFrequencyHz: number

  /** Derived geometry for display */
  geo: {
    spokeLengthMm: number
    pitchRadiusMm: number
    momentOfInertiaMm4: number
  }
}

export function designJTS(p: JTSParams): JTSResult {
  const warnings: string[] = []

  // Auto-convert GPa → Pa if caller passed small numbers
  const E = p.youngsModulusPa < 1e6 ? p.youngsModulusPa * 1e9 : p.youngsModulusPa

  // Convert mm → m
  const Ro = p.outerRadiusMm / 1000
  const Ri = p.innerRadiusMm / 1000
  const w  = p.spokeWidthMm / 1000
  const t  = p.spokeThicknessMm / 1000
  const N  = p.spokeCount
  const T  = p.ratedTorqueNm
  const GF = p.gageFactor
  const nu = p.poissonRatio
  const rho = p.densityKgM3 ?? 7850

  // Validation
  const errs: string[] = []
  if (Ro <= 0) errs.push('Outer radius must be positive')
  if (Ri <= 0) errs.push('Inner radius must be positive')
  if (Ri >= Ro) errs.push('Inner radius must be less than outer radius')
  if (w <= 0) errs.push('Spoke width must be positive')
  if (t <= 0) errs.push('Spoke thickness must be positive')
  if (N < 2 || !Number.isInteger(N)) errs.push('Spoke count must be an integer ≥ 2')
  if (T <= 0) errs.push('Rated torque must be positive')
  if (E <= 0) errs.push('Young\'s modulus must be positive')
  if (nu <= 0 || nu >= 0.5) errs.push('Poisson ratio must be between 0 and 0.5')
  if (GF <= 0) errs.push('Gage factor must be positive')
  if (errs.length > 0) {
    return { isValid: false, error: errs[0], warnings, stiffnessNmPerRad: 0, complianceRadPerNm: 0, deflectionAtRatedMrad: 0, peakStrainMicrostrain: 0, spanMvV: 0, sensitivityMvVPerNm: 0, peakStressMPa: 0, strainSafetyFactor: 0, naturalFrequencyHz: 0, geo: { spokeLengthMm: 0, pitchRadiusMm: 0, momentOfInertiaMm4: 0 } }
  }

  // Geometric checks
  const spokeGapAngle = (2 * Math.PI / N)
  const maxSpokeWidth = 2 * Ri * Math.sin(spokeGapAngle / 4) // approximate
  if (w > maxSpokeWidth * 0.9) {
    warnings.push('Spoke width approaches geometric limit — spokes may overlap at inner radius.')
  }
  if (t > (Ro - Ri) * 0.5) {
    warnings.push('Spoke thickness exceeds 50% of spoke length — beam theory accuracy may be reduced.')
  }
  if (w > t * 5) {
    warnings.push('Spoke width/thickness ratio > 5 — lateral buckling may occur under load.')
  }

  const Ls = Ro - Ri        // spoke length (m)
  const r  = (Ro + Ri) / 2  // pitch radius (m)
  const I  = w * t * t * t / 12 // second moment of area (m⁴)

  // Torsional stiffness
  const K = N * E * I / (Ls * r * r)   // N·m/rad

  // Bending moment at spoke root per rated torque
  const F_spoke = T / (N * r)           // tangential force per spoke (N)
  const M_root  = F_spoke * Ls          // bending moment at root (N·m)

  // Peak bending stress and strain at root
  const sigma = M_root * (t / 2) / I   // Pa
  const epsilon_si = sigma / E          // dimensionless strain
  const epsilon_ue = epsilon_si * 1e6   // microstrain

  // Full-bridge output (2 active tension + 2 active compression arms)
  // Each arm contributes GF·ε/4, four arms sum to GF·ε
  const spanMvV = GF * epsilon_ue * 1e-3  // mV/V at rated torque
  const sensitivity = spanMvV / T          // mV/V per N·m

  // Safety factors
  const strainSF = STRAIN_LIMIT_MICROSTRAIN / epsilon_ue
  const yieldSF  = p.yieldStrengthPa != null ? p.yieldStrengthPa / sigma : undefined

  // Warnings on safety
  if (epsilon_ue > STRAIN_LIMIT_MICROSTRAIN) {
    warnings.push(`Peak strain ${epsilon_ue.toFixed(0)} µε exceeds ${STRAIN_LIMIT_MICROSTRAIN} µε design limit — reduce torque rating or increase spoke cross-section.`)
  }
  if (yieldSF != null && yieldSF < 1.5) {
    warnings.push(`Yield safety factor ${yieldSF.toFixed(2)} is below 1.5 — risk of permanent deformation at rated torque.`)
  }

  // Natural frequency — torsional mode, simplified lumped-mass
  // Outer ring treated as dominant inertia: J = 0.5 · m · Ro²
  // Ring mass approximated as thin annulus: m = ρ · π · (Ro² - (Ro - ring_width)²) · t
  // Use ring_width = 0.15 · Ro as a typical value since we don't have it as an input
  const ring_width = 0.15 * Ro
  const m_ring = rho * Math.PI * (Ro * Ro - (Ro - ring_width) * (Ro - ring_width)) * t
  const J_eff = 0.5 * m_ring * Ro * Ro
  const fn = J_eff > 0 ? (1 / (2 * Math.PI)) * Math.sqrt(K / J_eff) : 0

  // Deflection at rated torque
  const theta_rated = T / K               // rad
  const deflectionMrad = theta_rated * 1000 // mrad

  if (deflectionMrad > 5) {
    warnings.push(`Angular deflection at rated torque is ${deflectionMrad.toFixed(1)} mrad — consider stiffer design for stiff-position-control robots.`)
  }
  if (sensitivity < 0.001) {
    warnings.push('Sensitivity below 0.001 mV/V per N·m — signal may be difficult to condition.')
  }

  return {
    isValid: true,
    warnings,
    stiffnessNmPerRad: K,
    complianceRadPerNm: 1 / K,
    deflectionAtRatedMrad: deflectionMrad,
    peakStrainMicrostrain: epsilon_ue,
    spanMvV,
    sensitivityMvVPerNm: sensitivity,
    peakStressMPa: sigma / 1e6,
    strainSafetyFactor: strainSF,
    yieldSafetyFactor: yieldSF,
    naturalFrequencyHz: fn,
    geo: {
      spokeLengthMm: Ls * 1000,
      pitchRadiusMm: r * 1000,
      momentOfInertiaMm4: I * 1e12,
    },
  }
}
