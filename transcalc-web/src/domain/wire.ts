/**
 * Wire and Resistor Calculations
 * Handles AWG wire gauge properties, resistance, voltage drop, and skin effect
 */

export interface WireGaugeProperties {
  awg: number
  diameterInches: number
  diameterMm: number
  resistance: number // Ohms per 1000 feet at 20°C (per legacy spec)
}

// Standard AWG wire gauge table (selected gauges)
const AWG_WIRE_TABLE: Record<number, WireGaugeProperties> = {
  8: {
    awg: 8,
    diameterInches: 0.1285,
    diameterMm: 3.264,
    resistance: 0.6282,
  },
  10: {
    awg: 10,
    diameterInches: 0.1019,
    diameterMm: 2.588,
    resistance: 0.9989,
  },
  12: {
    awg: 12,
    diameterInches: 0.0808,
    diameterMm: 2.053,
    resistance: 1.588,
  },
  14: {
    awg: 14,
    diameterInches: 0.0641,
    diameterMm: 1.628,
    resistance: 2.525,
  },
  16: {
    awg: 16,
    diameterInches: 0.0508,
    diameterMm: 1.291,
    resistance: 4.016,
  },
  18: {
    awg: 18,
    diameterInches: 0.0403,
    diameterMm: 1.024,
    resistance: 6.385,
  },
  20: {
    awg: 20,
    diameterInches: 0.032,
    diameterMm: 0.812,
    resistance: 10.15,
  },
}

/**
 * Calculate wire cross-sectional area in circular mils
 * Used in AWG wire sizing calculations
 * @param diameterInches Wire diameter in inches
 * @returns Cross-sectional area in circular mils (1 mil = 0.001 inches)
 */
export function calculateWireAreaCircularMils(diameterInches: number): number {
  return Math.pow(diameterInches * 1000, 2)
}

/**
 * Calculate wire cross-sectional area in square millimeters
 * @param diameterMm Wire diameter in millimeters
 * @returns Cross-sectional area in mm²
 */
export function calculateWireAreaMm2(diameterMm: number): number {
  const radiusMm = diameterMm / 2
  return Math.PI * Math.pow(radiusMm, 2)
}

/**
 * Calculate total resistance for a given wire length
 * R_total = R_per_length × length
 * @param resistancePerThousandFeet Base resistance (Ohms/1000 ft @ 20°C)
 * @param lengthFeet Total wire length in feet
 * @returns Total resistance in Ohms
 */
export function calculateWireResistance(
  resistancePerThousandFeet: number,
  lengthFeet: number
): number {
  return (resistancePerThousandFeet * lengthFeet) / 1000
}

/**
 * Calculate temperature-corrected wire resistance
 * R_T = R0 × [1 + α × (T - T0)]
 * Copper temperature coefficient of resistance: α ≈ 0.00383 per °C
 * @param baseResistance Resistance at reference temperature (Ohms)
 * @param tempCelsius Actual temperature (°C)
 * @param refTempCelsius Reference temperature (°C, default 20)
 * @returns Temperature-corrected resistance in Ohms
 */
export function calculateTemperatureAdjustedResistance(
  baseResistance: number,
  tempCelsius: number,
  refTempCelsius: number = 20
): number {
  const copperAlpha = 0.00383
  return baseResistance * (1 + copperAlpha * (tempCelsius - refTempCelsius))
}

/**
 * Calculate voltage drop across a wire run
 * V_drop = I × R
 * @param currentAmps Current in amperes
 * @param resistanceOhms Wire resistance in Ohms
 * @returns Voltage drop in volts
 */
export function calculateVoltageDrop(
  currentAmps: number,
  resistanceOhms: number
): number {
  return currentAmps * resistanceOhms
}

/**
 * Calculate power loss in a wire
 * P_loss = I² × R
 * @param currentAmps Current in amperes
 * @param resistanceOhms Wire resistance in Ohms
 * @returns Power loss in watts
 */
export function calculateWirePowerLoss(
  currentAmps: number,
  resistanceOhms: number
): number {
  return Math.pow(currentAmps, 2) * resistanceOhms
}

/**
 * Get wire gauge properties from AWG number
 * @param awg American Wire Gauge number (8, 10, 12, 14, 16, 18, 20)
 * @returns Wire gauge properties or null if not found
 */
export function getWireGaugeProperties(awg: number): WireGaugeProperties | null {
  return AWG_WIRE_TABLE[awg] || null
}

/**
 * Calculate skin effect resistance increase factor at high frequency
 * For typical instrumentation frequencies (DC to ~10kHz), skin effect is negligible
 * For higher frequencies, resistance increases approximately as sqrt(f)
 * @param frequencyHz Frequency in Hz
 * @returns Resistance multiplier (1.0 = no skin effect)
 */
export function calculateSkinEffectFactor(frequencyHz: number): number {
  const skinEffectFrequency = 1000000 // 1 MHz threshold
  if (frequencyHz < 1000) {
    return 1.0 // Negligible below 1 kHz
  }
  return Math.sqrt(frequencyHz / 1000)
}
