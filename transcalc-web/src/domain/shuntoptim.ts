/**
 * Bridge shunt resistor optimization for temperature compensation
 * Calculates optimal shunt resistance to minimize output span shift with temperature
 */

/**
 * Calculate bridge output span with shunt resistor (SI-consistent)
 * 
 * For a bridge circuit with a shunt resistor across one or more arms,
 * the output span changes with temperature due to resistance drift.
 * 
 * Vout = G × ε × (1 + Rs/Rm) - where Rs is shunt, Rm is measured arm resistance
 * 
 * @param bridgeOutput Bridge output voltage or span (mV/V or unitless ratio)
 * @param shuntResistance Shunt resistance in Ohms
 * @param measuredArmResistance Active/measured arm resistance in Ohms
 * @returns Adjusted bridge output span accounting for shunt
 */
export function calculateBridgeOutputWithShunt(
  bridgeOutput: number,
  shuntResistance: number,
  measuredArmResistance: number
): number {
  if (measuredArmResistance === 0) {
    throw new Error('Measured arm resistance must be non-zero')
  }

  // Correction factor for shunt: (1 + Rs/Rm)
  // In parallel: R_eff = (Rs × Rm) / (Rs + Rm), but for span shift we use ratio
  const shuntFactor = 1 + (shuntResistance / measuredArmResistance)

  return bridgeOutput * shuntFactor
}

/**
 * Calculate resistance temperature coefficient effect on bridge span
 * 
 * Δ_span = span_ref × α × (Δ_R / R_ref) × 100%
 * where α is the temperature coefficient of resistance
 * 
 * @param spanAtReference Bridge output span at reference temperature (mV/V)
 * @param resistanceTempCoefficientPpm Temperature coefficient in ppm/°C
 * @param temperatureChangeC Temperature change in °C
 * @returns Span shift as percentage of original (%)
 */
export function calculateSpanShiftWithTemperature(
  spanAtReference: number,
  resistanceTempCoefficientPpm: number,
  temperatureChangeC: number
): number {
  // Resistance change: ΔR/R = α × ΔT
  const resistanceChange = (resistanceTempCoefficientPpm / 1e6) * temperatureChangeC

  // Span shift as percentage
  return spanAtReference * resistanceChange * 100
}

/**
 * Calculate optimal shunt resistance to match span shifts across temperature (simplified)
 * 
 * For a dual-temperature (low and high) requirement:
 * Optimal Rs is found by matching the span shift between low and ambient temperatures.
 * 
 * Approximation: Rs ≈ Rm × (ΔR_low / |ΔR_low - ΔR_amb|)
 * 
 * @param rmBridge Bridge/measured arm resistance at reference in Ohms
 * @param rmTempCoeffPpm Temperature coefficient of Rm in ppm/°C
 * @param tempLowC Low operating temperature in °C
 * @param tempAmbientC Ambient/reference temperature in °C
 * @param tempHighC High operating temperature in °C
 * @returns Optimized shunt resistance in Ohms
 */
export function calculateOptimalShuntResistance(
  rmBridge: number,
  rmTempCoeffPpm: number,
  tempLowC: number,
  tempAmbientC: number,
  tempHighC: number
): number {
  if (rmBridge === 0) {
    throw new Error('Bridge resistance must be non-zero')
  }

  // Resistance change factors
  const deltaRLow = rmTempCoeffPpm * (tempLowC - tempAmbientC) / 1e6
  const deltaRHigh = rmTempCoeffPpm * (tempHighC - tempAmbientC) / 1e6

  // Difference in resistance changes
  const deltaRDiff = Math.abs(deltaRLow - deltaRHigh)

  if (deltaRDiff === 0) {
    throw new Error('Temperature range does not produce sufficient resistance change')
  }

  // Simplified optimal shunt (this is a heuristic; full optimization requires iterative solving)
  // Rs ≈ Rm × |ΔR_low / ΔR_diff|
  const optimalShunt = rmBridge * Math.abs(deltaRLow / deltaRDiff)

  return optimalShunt
}

/**
 * Calculate three-point span compensation matrix for shunt optimization
 * 
 * Given three temperature points (low, ambient, high) with known spans and bridge resistances,
 * compute the influence of a shunt resistor on each span.
 * 
 * @param spans Array [low_span, ambient_span, high_span] in mV/V
 * @param rmBridges Array [low_rmb, ambient_rmb, high_rmb] in Ohms (bridge resistance at each temp)
 * @param rmModifiers Array [low_rmod, ambient_rmod, high_rmod] (resistance modifiers/drifts)
 * @returns Object with computed influence coefficients and recommended shunt
 */
export function calculateThreePointShuntMatrix(
  spans: [number, number, number],
  rmBridges: [number, number, number],
  rmModifiers: [number, number, number]
): {
  coefficients: [number, number, number]
  recommendedShunt: number
  residualShiftLow: number
  residualShiftAmbient: number
  residualShiftHigh: number
} {
  const [spanLow, spanAmb, spanHigh] = spans
  const [rmLow, rmAmb, rmHigh] = rmBridges
  const [modLow, modAmb, modHigh] = rmModifiers

  // Coefficients: influence of shunt on each span
  const coefLow = modLow / rmLow
  const coefAmb = modAmb / rmAmb
  const coefHigh = modHigh / rmHigh

  // Least-squares estimate of optimal shunt (simplified)
  const sumCoef = coefLow + coefAmb + coefHigh
  const recommendedShunt = sumCoef > 0 ? 100 / sumCoef : 0

  // Residual shifts with recommended shunt
  const residualLow = spanLow * coefLow * recommendedShunt
  const residualAmb = spanAmb * coefAmb * recommendedShunt
  const residualHigh = spanHigh * coefHigh * recommendedShunt

  return {
    coefficients: [coefLow, coefAmb, coefHigh],
    recommendedShunt,
    residualShiftLow: residualLow,
    residualShiftAmbient: residualAmb,
    residualShiftHigh: residualHigh
  }
}
