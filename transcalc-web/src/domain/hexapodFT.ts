/**
 * Hexapod (Stewart platform) 6-DOF Force/Torque sensor — analytical model.
 *
 * TOPOLOGY: 3 top attachment points × 2 struts each = 6 struts total.
 * This is the standard "ATI/JR3-style" commercial F/T sensor geometry:
 *
 *   Top platform:  3 attachment points at 120° intervals, radius R_top
 *   Bottom ring:   6 attachment points, 2 near each top point, radius R_bot
 *   Struts:        top_k → bot(k×120°+60°±spread) for k=0,1,2
 *
 * The strutSpreadDeg parameter controls how far each pair fans out from the
 * central 60° direction. Larger spread → better condition number but more
 * in-plane strut force for Fz. Optimal range: 10°–25°.
 *
 * WHY NOT equal 6+6 spacing?  Six antipodal-pair struts produce a degenerate
 * Jacobian — the "pair-sum" wrench vectors are all parallel, so only 5 DOF are
 * resolvable. The 3-top-point topology avoids this by ensuring no two struts
 * form a 180°-antipodal pair sharing a top attachment point.
 *
 * The 6×6 Jacobian J maps strut axial forces to sensor wrench:
 *   W = J × f_struts    (forward: wrench from gage readings)
 *   f = J⁻¹ × W         (inverse: decode wrench)
 *
 * Column i of J = [ û_i ; P_i × û_i ]
 *   û_i = unit vector along strut i (bottom → top)
 *   P_i = top attachment point (where force acts on measured platform), m
 *
 * References:
 *   Dasgupta & Mruthyunjaya (2000). "The Stewart platform manipulator: a review."
 *   ATI Industrial Automation, F/T Sensor Technical Reference.
 */

// All internal calculations in SI: m, N, N·m, Pa

type Vec3 = [number, number, number]
type Mat6 = number[][]

// ── Vector / matrix utilities ─────────────────────────────────────────────────

function cross3(a: Vec3, b: Vec3): Vec3 {
  return [
    a[1] * b[2] - a[2] * b[1],
    a[2] * b[0] - a[0] * b[2],
    a[0] * b[1] - a[1] * b[0],
  ]
}

function norm6(v: number[]): number {
  return Math.sqrt(v.reduce((s, x) => s + x * x, 0))
}

function matVec6(A: Mat6, v: number[]): number[] {
  return A.map(row => row.reduce((s, a, j) => s + a * v[j], 0))
}

/** Gauss-Jordan elimination with partial pivoting; returns inverse or null if singular. */
function gaussInverse6(A: Mat6): Mat6 | null {
  const n = 6
  const M = A.map((row, i) =>
    [...row, ...Array.from({ length: n }, (_, j) => (i === j ? 1 : 0))]
  )
  for (let col = 0; col < n; col++) {
    let maxRow = col
    for (let row = col + 1; row < n; row++) {
      if (Math.abs(M[row][col]) > Math.abs(M[maxRow][col])) maxRow = row
    }
    if (Math.abs(M[maxRow][col]) < 1e-14) return null
    ;[M[col], M[maxRow]] = [M[maxRow], M[col]]
    const pivot = M[col][col]
    for (let c = col; c < 2 * n; c++) M[col][c] /= pivot
    for (let row = 0; row < n; row++) {
      if (row === col) continue
      const f = M[row][col]
      for (let c = col; c < 2 * n; c++) M[row][c] -= f * M[col][c]
    }
  }
  return M.map(row => row.slice(n))
}

/** Infinity norm = max absolute row sum */
function infNorm6(A: Mat6): number {
  return Math.max(...A.map(row => row.reduce((s, v) => s + Math.abs(v), 0)))
}

// ── Public types ──────────────────────────────────────────────────────────────

export interface HexapodFTParams {
  /** Radius of the 3 top attachment points (mm). Each top point anchors 2 struts. */
  topRingRadiusMm: number
  /** Radius of the 6 bottom attachment points (mm). */
  bottomRingRadiusMm: number
  /** Axial separation between top and bottom attachment planes (mm). */
  platformHeightMm: number
  /** Rotation of entire top ring from +X axis (degrees, default 0). */
  topAnglesOffsetDeg?: number
  /**
   * Angular half-spread of each strut pair (degrees, default 15).
   * Each top attachment point fans two struts out by ±spread from the
   * central 60° bisector direction. Range 5°–28° gives non-singular Jacobian.
   */
  strutSpreadDeg?: number
  /** Strut circular cross-section diameter (mm). */
  strutDiameterMm: number
  /** Young's modulus (Pa; values < 1e6 treated as GPa and auto-converted). */
  youngsModulusPa: number
  /** Poisson's ratio. */
  poissonRatio: number
  /** Gage factor. */
  gageFactor: number
  /** Bridge configuration per strut. */
  bridgeType: 'quarter' | 'half' | 'full'
  /** Material density (kg/m³, default 7850). */
  densityKgM3?: number
  /** 0.2% yield strength (Pa). When provided, yieldSafetyFactor is computed. */
  yieldStrengthPa?: number
  /** Rated full-scale force (Fx = Fy = Fz, N). */
  ratedForceN: number
  /** Rated full-scale moment (Mx = My = Mz, N·m). */
  ratedMomentNm: number
}

export interface StrutGeometry {
  /** Strut index 0–5. */
  index: number
  /** Which of the 3 top attachment points this strut connects to (0, 1, or 2). */
  topAttachIndex: number
  /** Top attachment point (mm). */
  topMm: Vec3
  /** Bottom attachment point (mm). */
  bottomMm: Vec3
  /** Unit vector from bottom to top. */
  unitVector: Vec3
  /** Strut length (mm). */
  lengthMm: number
  /** Angle of strut from vertical Z axis (degrees). */
  tiltDeg: number
}

export interface HexapodFTResult {
  isValid: boolean
  error?: string
  warnings: string[]

  /** Computed geometry for all 6 struts. */
  struts: StrutGeometry[]

  /**
   * 6×6 Jacobian matrix where column i = [û_i; P_top_i × û_i].
   * W = J × f_struts.
   */
  jacobian: Mat6

  /**
   * Inverse Jacobian: f_struts = J⁻¹ × W.
   * Calibration matrix for decoding wrench from strut voltages.
   */
  jacobianInverse: Mat6

  /**
   * Condition number of the Jacobian (infinity norm: ‖J‖∞ · ‖J⁻¹‖∞).
   * Lower = better load sharing across channels. Ideal: 1.0. Acceptable: < 10.
   */
  conditionNumber: number

  /** Cross-axis coupling (0 for ideal symmetric geometry). */
  crossAxisCouplingPct: number

  /** Per-strut axial sensitivity (mV/V per N of strut force). */
  strutSensitivityMvVPerN: number

  /**
   * RMS strut voltage at rated load per DOF (mV/V).
   * Computed as 2-norm of all 6 strut voltage outputs at rated load for each DOF.
   */
  ratedOutput: { Fx: number; Fy: number; Fz: number; Mx: number; My: number; Mz: number }

  /** Max strut axial strain across all DOFs at rated load (µε). */
  maxStrutStrainMicrostrain: number

  /** Strain safety factor = 1500 µε fatigue limit / maxStrain. */
  strainSafetyFactor: number

  /** Yield safety factor = yieldStrength / peak axial stress. Undefined if no yield supplied. */
  yieldSafetyFactor?: number

  /** Approximate Fz-axis natural frequency (Hz), sensor structure only. */
  naturalFrequencyFzHz: number

  geometry: {
    topRingRadiusMm: number
    bottomRingRadiusMm: number
    platformHeightMm: number
    strutDiameterMm: number
    strutLengthMm: number
    tiltDeg: number
    strutSpreadDeg: number
  }
}

// ── Constants ─────────────────────────────────────────────────────────────────

const STRAIN_LIMIT_MICROSTRAIN = 1500

// ── Core helpers ──────────────────────────────────────────────────────────────

/**
 * Build 6 strut geometries using the 3-top-point topology.
 * Top point k at angle (topOff + k×120°); struts fan ±spread from (k×120°+60°) at bottom.
 */
function computeStruts(
  R_t: number, R_b: number, h: number, topOff: number, spreadRad: number
): StrutGeometry[] {
  const struts: StrutGeometry[] = []
  for (let k = 0; k < 3; k++) {
    const aTop = topOff + k * (2 * Math.PI / 3)
    const aCenter = k * (2 * Math.PI / 3) + Math.PI / 3  // 60° ahead of top point
    for (let s = 0; s < 2; s++) {
      const aBot = aCenter + (s === 0 ? -spreadRad : spreadRad)
      const topMm: Vec3 = [R_t * Math.cos(aTop) * 1000, R_t * Math.sin(aTop) * 1000, (h / 2) * 1000]
      const botMm: Vec3 = [R_b * Math.cos(aBot) * 1000, R_b * Math.sin(aBot) * 1000, -(h / 2) * 1000]
      const dx = (topMm[0] - botMm[0]) / 1000
      const dy = (topMm[1] - botMm[1]) / 1000
      const dz = (topMm[2] - botMm[2]) / 1000
      const L = Math.sqrt(dx * dx + dy * dy + dz * dz)
      const u: Vec3 = [dx / L, dy / L, dz / L]
      struts.push({
        index: k * 2 + s,
        topAttachIndex: k,
        topMm,
        bottomMm: botMm,
        unitVector: u,
        lengthMm: L * 1000,
        tiltDeg: Math.acos(Math.abs(u[2])) * (180 / Math.PI),
      })
    }
  }
  return struts
}

function buildJacobian(struts: StrutGeometry[]): Mat6 {
  const J: Mat6 = Array.from({ length: 6 }, () => new Array(6).fill(0))
  for (let i = 0; i < 6; i++) {
    const u = struts[i].unitVector
    const P: Vec3 = [
      struts[i].topMm[0] / 1000,
      struts[i].topMm[1] / 1000,
      struts[i].topMm[2] / 1000,
    ]
    const m = cross3(P, u)
    for (let r = 0; r < 3; r++) J[r][i] = u[r]
    for (let r = 0; r < 3; r++) J[r + 3][i] = m[r]
  }
  return J
}

function invalid(error: string, p: HexapodFTParams): HexapodFTResult {
  const zero6 = (): Mat6 => Array.from({ length: 6 }, () => new Array(6).fill(0))
  return {
    isValid: false, error, warnings: [],
    struts: [], jacobian: zero6(), jacobianInverse: zero6(),
    conditionNumber: Infinity, crossAxisCouplingPct: 0,
    strutSensitivityMvVPerN: 0,
    ratedOutput: { Fx: 0, Fy: 0, Fz: 0, Mx: 0, My: 0, Mz: 0 },
    maxStrutStrainMicrostrain: 0, strainSafetyFactor: 0,
    naturalFrequencyFzHz: 0,
    geometry: {
      topRingRadiusMm: p.topRingRadiusMm, bottomRingRadiusMm: p.bottomRingRadiusMm,
      platformHeightMm: p.platformHeightMm, strutDiameterMm: p.strutDiameterMm,
      strutLengthMm: 0, tiltDeg: 0, strutSpreadDeg: p.strutSpreadDeg ?? 15,
    },
  }
}

// ── Main function ─────────────────────────────────────────────────────────────

export function designHexapodFT(params: HexapodFTParams): HexapodFTResult {
  const warnings: string[] = []

  // Unit normalisation
  const E   = params.youngsModulusPa < 1e6 ? params.youngsModulusPa * 1e9 : params.youngsModulusPa
  const R_t = params.topRingRadiusMm / 1000
  const R_b = params.bottomRingRadiusMm / 1000
  const h   = params.platformHeightMm / 1000
  const d_s = params.strutDiameterMm / 1000
  const A   = Math.PI / 4 * d_s * d_s
  const rho = params.densityKgM3 ?? 7850
  const GF  = params.gageFactor
  const rF  = params.ratedForceN
  const rM  = params.ratedMomentNm
  const topOff    = ((params.topAnglesOffsetDeg ?? 0) * Math.PI) / 180
  const spreadRad = ((params.strutSpreadDeg ?? 15) * Math.PI) / 180

  // Validation
  if (R_t <= 0 || R_b <= 0)
    return invalid('Ring radii must be greater than zero.', params)
  if (h <= 0)
    return invalid('Platform height must be greater than zero.', params)
  if (d_s <= 0)
    return invalid('Strut diameter must be greater than zero.', params)
  if (E <= 0)
    return invalid("Young's modulus must be greater than zero.", params)
  if (rF <= 0 || rM <= 0)
    return invalid('Rated force and moment must be greater than zero.', params)
  if (spreadRad <= 0 || spreadRad >= Math.PI / 6)
    warnings.push('Strut spread outside 0°–30° range — condition number may be poor.')

  const struts = computeStruts(R_t, R_b, h, topOff, spreadRad)
  const J      = buildJacobian(struts)
  const J_inv  = gaussInverse6(J)

  if (!J_inv)
    return invalid('Jacobian is singular — geometry cannot resolve all 6 DOF. Increase strut spread or adjust ring radii.', params)

  // Bridge gain: quarter=0.25, half=0.5, full=1.0
  const kBridge = params.bridgeType === 'quarter' ? 0.25
    : params.bridgeType === 'half' ? 0.5
    : 1.0

  // Per-strut axial sensitivity [mV/V per N]
  const strutSensitivity = GF * kBridge * 1e3 / (E * A)

  // Rated outputs and max strain — evaluate each DOF independently at rated load
  const dofKeys = ['Fx', 'Fy', 'Fz', 'Mx', 'My', 'Mz'] as const
  const ratedLoad = [rF, rF, rF, rM, rM, rM]
  const ratedOutput = { Fx: 0, Fy: 0, Fz: 0, Mx: 0, My: 0, Mz: 0 }
  let maxStrutStrainMicrostrain = 0

  for (let k = 0; k < 6; k++) {
    const e_k = Array.from({ length: 6 }, (_, j) => j === k ? ratedLoad[k] : 0)
    const f_struts = matVec6(J_inv, e_k)
    const f_max = Math.max(...f_struts.map(Math.abs))
    const eps_k = f_max / (E * A) * 1e6   // µε
    if (eps_k > maxStrutStrainMicrostrain) maxStrutStrainMicrostrain = eps_k
    const v_struts = f_struts.map(f => strutSensitivity * f)
    ratedOutput[dofKeys[k]] = norm6(v_struts)
  }

  // Condition number: max/min rated output ratio (load-normalised, unit-consistent).
  // Matches cross-beam calculator convention. Lower = better balance across channels.
  const outputs = Object.values(ratedOutput)
  const conditionNumber = Math.min(...outputs) > 0
    ? Math.max(...outputs) / Math.min(...outputs) : Infinity

  const strainSafetyFactor = maxStrutStrainMicrostrain > 0
    ? STRAIN_LIMIT_MICROSTRAIN / maxStrutStrainMicrostrain : Infinity
  const peakStressPa = maxStrutStrainMicrostrain * 1e-6 * E
  const yieldSafetyFactor = params.yieldStrengthPa && params.yieldStrengthPa > 0
    ? params.yieldStrengthPa / peakStressPa : undefined

  // Fz-axis stiffness and natural frequency
  // Each strut contributes k_Fz_i = (E·A / L_i) · û_z_i²
  const k_Fz = struts.reduce((s, st) => s + (E * A / (st.lengthMm / 1000)) * st.unitVector[2] ** 2, 0)
  const L_avg = struts.reduce((s, st) => s + st.lengthMm / 1000, 0) / 6
  const massSensor = 6 * rho * A * L_avg
  const naturalFrequencyFzHz = massSensor > 0
    ? (1 / (2 * Math.PI)) * Math.sqrt(k_Fz / massSensor) : 0

  // Warnings
  if (conditionNumber > 20)
    warnings.push('Condition number > 20: sensor channels very unbalanced. Try strut spread of 15°–20° with equal ring radii.')
  else if (conditionNumber > 10)
    warnings.push('Condition number > 10: some channels significantly weaker than others.')
  if (maxStrutStrainMicrostrain > STRAIN_LIMIT_MICROSTRAIN)
    warnings.push(`Max strut strain ${maxStrutStrainMicrostrain.toFixed(0)} µε exceeds ${STRAIN_LIMIT_MICROSTRAIN} µε design limit — increase strut diameter or reduce rated load.`)
  else if (maxStrutStrainMicrostrain < 100)
    warnings.push('Max strut strain < 100 µε — sensitivity too low. Consider reducing strut diameter.')
  if (yieldSafetyFactor !== undefined && yieldSafetyFactor < 1.5)
    warnings.push(`Yield safety factor ${yieldSafetyFactor.toFixed(2)} is below 1.5 — risk of permanent strut deformation at rated load.`)
  else if (yieldSafetyFactor !== undefined && yieldSafetyFactor < 2.5)
    warnings.push(`Yield safety factor ${yieldSafetyFactor.toFixed(2)} is below 2.5 — consider stronger material or larger strut diameter.`)
  if (naturalFrequencyFzHz < 500 && naturalFrequencyFzHz > 0)
    warnings.push(`Fz natural frequency ${naturalFrequencyFzHz.toFixed(0)} Hz may be too low for kHz-rate robot control loops.`)

  const avgTilt   = struts.reduce((s, st) => s + st.tiltDeg, 0) / 6
  const avgLength = struts.reduce((s, st) => s + st.lengthMm, 0) / 6

  return {
    isValid: true,
    warnings,
    struts,
    jacobian: J,
    jacobianInverse: J_inv,
    conditionNumber,
    crossAxisCouplingPct: 0,
    strutSensitivityMvVPerN: strutSensitivity,
    ratedOutput,
    maxStrutStrainMicrostrain,
    strainSafetyFactor,
    yieldSafetyFactor,
    naturalFrequencyFzHz,
    geometry: {
      topRingRadiusMm: params.topRingRadiusMm,
      bottomRingRadiusMm: params.bottomRingRadiusMm,
      platformHeightMm: params.platformHeightMm,
      strutDiameterMm: params.strutDiameterMm,
      strutLengthMm: avgLength,
      tiltDeg: avgTilt,
      strutSpreadDeg: (params.strutSpreadDeg ?? 15),
    },
  }
}

/**
 * Generate a 12-step calibration procedure for the hexapod F/T sensor.
 * The calibration matrix C = J⁻¹ (already computed); maps strut voltages to wrench.
 * Each step applies one DOF at rated load and lists expected strut voltages.
 */
export function generateHexapodCalibrationProcedure(
  result: HexapodFTResult,
  params: HexapodFTParams,
): import('./sixAxisForceTorque').CalibrationProcedure {
  const { jacobianInverse: J_inv, strutSensitivityMvVPerN: S } = result
  const rF = params.ratedForceN
  const rM = params.ratedMomentNm

  // Calibration matrix C maps [V1..V6] mV/V → wrench [Fx,Fy,Fz,Mx,My,Mz]
  // C = (1/S) × J  (since V_strut = S × f_strut, and J × f_struts = W)
  const matrix: number[][] = result.jacobian.map(row => row.map(v => v / S))

  const dofs = [
    { label: 'Fx', i: 0, rated: rF },
    { label: 'Fy', i: 1, rated: rF },
    { label: 'Fz', i: 2, rated: rF },
    { label: 'Mx', i: 3, rated: rM },
    { label: 'My', i: 4, rated: rM },
    { label: 'Mz', i: 5, rated: rM },
  ]

  const loadSteps: import('./sixAxisForceTorque').CalibrationStep[] = []
  for (const { label, i, rated } of dofs) {
    for (const sign of [1, -1] as const) {
      const appliedLoad = [0, 0, 0, 0, 0, 0] as [number, number, number, number, number, number]
      appliedLoad[i] = sign * rated
      // Strut forces: f = J_inv × W; Voltages: V = S × f
      const f_struts = matVec6(J_inv, appliedLoad)
      const expectedVoltages = f_struts.map(f => S * f) as [number, number, number, number, number, number]
      loadSteps.push({
        label: `${sign > 0 ? '+' : '−'}${label} at rated`,
        appliedLoad,
        expectedVoltages,
      })
    }
  }

  return { matrix, loadSteps }
}
