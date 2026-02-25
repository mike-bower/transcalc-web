/**
 * Zero vs. Temperature compensation calculation
 * Ported from Delphi ZVSTEMP.PAS
 *
 * Computes the series resistance (and which bridge arm) required to cancel
 * observed zero-output shift across a temperature range.  The compensating
 * resistor (or wire) is placed in series with one arm of the Wheatstone
 * bridge; its TCR generates a small opposing output that nulls the thermal
 * zero drift.
 *
 * Core formula (from CalculateResistance in ZVSTEMP.PAS):
 *   R = (ΔOutput × 4 × R_bridge × 1e-3) / ΔTemp / (TCR / 100)
 *
 * where:
 *   ΔOutput  – measured zero shift  [mV/V]
 *   R_bridge – full bridge resistance [Ω]
 *   ΔTemp    – temperature span [°F or °C]
 *   TCR      – compensation resistor/wire TCR [%/°F or %/°C]
 *   R        – required series compensation resistance [Ω]
 */

import { fToC } from './convert'

// ---------------------------------------------------------------------------
// Wire-type catalogue
// ---------------------------------------------------------------------------

export type WireTypeName = 'Balco' | 'Copper' | 'Nickel'

export interface WireProperties {
  /** Display name */
  name: string
  /** Resistivity (Ω·cmil/ft) */
  resistivity: number
  /** TCR in %/°F — convert × 9/5 to get %/°C */
  tcrPerF: number
}

/**
 * Wire types available for zero-vs-temperature compensation.
 * TCR values are stored in US units (%/°F); call `getResistorTcr` to obtain
 * the value appropriate for the current unit system.
 */
export const WIRE_TYPES: Record<WireTypeName, WireProperties> = {
  Balco:  { name: 'Balco',        resistivity: 120,    tcrPerF: 0.25 },
  Copper: { name: 'Copper',       resistivity: 10.371, tcrPerF: 0.22 },
  Nickel: { name: 'Nickel, pure', resistivity: 45,     tcrPerF: 0.33 },
}

export type Units = 'US' | 'SI'

/**
 * Return the resistor/wire TCR in the requested unit system.
 * @param wireType  Wire selected from the combo-box
 * @param units     'US' → %/°F, 'SI' → %/°C
 */
export function getResistorTcr(wireType: WireTypeName, units: Units): number {
  const tcrF = WIRE_TYPES[wireType].tcrPerF
  // Delphi CB_WireTypeChange: TCRNo := TCRNo * 9 / 5  (for SI display)
  return units === 'US' ? tcrF : tcrF * (9 / 5)
}

// ---------------------------------------------------------------------------
// Validation limits (all defined in US units; converted for SI at runtime)
// ---------------------------------------------------------------------------

const LIMITS_US = {
  minTemp: -100,           // °F
  maxTemp:  500,           // °F
  minOutput: -10,          // mV/V
  maxOutput:  10,          // mV/V
  minTcr:    0.1,          // %/°F
  maxTcr:    0.5,          // %/°F
  minBridgeResistance:    50,    // Ω
  maxBridgeResistance: 10000,    // Ω
  warnTempDiff: 50,        // °F – warn if span < this
}

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

export interface ZeroVsTempParams {
  /** Temperature at low end of calibration span [°F for US, °C for SI] */
  lowTemp: number
  /** Bridge output at low temperature [mV/V] */
  lowOutput: number
  /** Temperature at high end of calibration span [°F for US, °C for SI] */
  highTemp: number
  /** Bridge output at high temperature [mV/V] */
  highOutput: number
  /**
   * TCR of the compensation element [%/°F for US, %/°C for SI].
   * Use `getResistorTcr(wireType, units)` to populate this field.
   */
  resistorTcr: number
  /** Full Wheatstone bridge resistance [Ω] */
  bridgeResistance: number
  units: Units
}

/**
 * Which bridge arm receives the series compensation resistor.
 * - `'minus-s-minus'` – the −S / − arm (when zero shift is positive)
 * - `'plus-s-minus'`  – the +S / − arm (when zero shift is negative)
 */
export type BridgeArm = 'minus-s-minus' | 'plus-s-minus'

export interface ZeroVsTempResult {
  /** Required series compensation resistance [Ω], always ≥ 0 */
  resistance: number
  /** Which arm of the bridge receives the series resistor */
  bridgeArm: BridgeArm
  /**
   * True when resistance > 0.5 Ω, meaning wire is the preferred compensator
   * (the E01 resistor network can only realise values ≤ 0.5 Ω).
   */
  useWire: boolean
}

export interface ZeroVsTempValidation {
  valid: boolean
  errors: string[]
  warnings: string[]
}

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------

/**
 * Validate all inputs before calling `calculateZeroVsTemp`.
 * Returns errors (blocking) and warnings (advisory) without throwing.
 */
export function validateZeroVsTemp(params: ZeroVsTempParams): ZeroVsTempValidation {
  const { lowTemp, lowOutput, highTemp, highOutput, resistorTcr, bridgeResistance, units } = params
  const errors: string[] = []
  const warnings: string[] = []

  // Derive limits for the active unit system
  const lim = units === 'US'
    ? {
        minTemp: LIMITS_US.minTemp,
        maxTemp: LIMITS_US.maxTemp,
        minTcr: LIMITS_US.minTcr,
        maxTcr: LIMITS_US.maxTcr,
        warnTempDiff: LIMITS_US.warnTempDiff,
        tempUnit: '°F',
        tcrUnit: '%/°F',
      }
    : {
        minTemp: fToC(LIMITS_US.minTemp),
        maxTemp: fToC(LIMITS_US.maxTemp),
        // Delphi SI validation: MinResistanceTCR := 1.8 × US_min (= 9/5 × US_min)
        minTcr: LIMITS_US.minTcr * (9 / 5),
        maxTcr: LIMITS_US.maxTcr * (9 / 5),
        warnTempDiff: 10,   // ~18 °F expressed as °C
        tempUnit: '°C',
        tcrUnit: '%/°C',
      }

  // Temperature range
  if (lowTemp < lim.minTemp || lowTemp > lim.maxTemp) {
    errors.push(
      `Low temperature must be between ${lim.minTemp} and ${lim.maxTemp} ${lim.tempUnit}`
    )
  }
  if (highTemp < lim.minTemp || highTemp > lim.maxTemp) {
    errors.push(
      `High temperature must be between ${lim.minTemp} and ${lim.maxTemp} ${lim.tempUnit}`
    )
  }

  // Output range
  if (lowOutput < LIMITS_US.minOutput || lowOutput > LIMITS_US.maxOutput) {
    errors.push(
      `Low output must be between ${LIMITS_US.minOutput} and ${LIMITS_US.maxOutput} mV/V`
    )
  }
  if (highOutput < LIMITS_US.minOutput || highOutput > LIMITS_US.maxOutput) {
    errors.push(
      `High output must be between ${LIMITS_US.minOutput} and ${LIMITS_US.maxOutput} mV/V`
    )
  }

  // TCR range
  if (resistorTcr < lim.minTcr || resistorTcr > lim.maxTcr) {
    errors.push(
      `Resistor TCR must be between ${lim.minTcr.toFixed(3)} and ${lim.maxTcr.toFixed(3)} ${lim.tcrUnit}`
    )
  }

  // Bridge resistance range
  if (
    bridgeResistance < LIMITS_US.minBridgeResistance ||
    bridgeResistance > LIMITS_US.maxBridgeResistance
  ) {
    errors.push(
      `Bridge resistance must be between ${LIMITS_US.minBridgeResistance} and ${LIMITS_US.maxBridgeResistance} Ω`
    )
  }

  // Low temp must be strictly less than high temp
  if (lowTemp >= highTemp) {
    errors.push('Low temperature must be less than high temperature')
  }

  // Warn when the temperature span is very narrow (results will be noisy)
  if (errors.length === 0) {
    const diffTemp = highTemp - lowTemp
    if (diffTemp < lim.warnTempDiff) {
      warnings.push(
        `Temperature span (${diffTemp.toFixed(1)} ${lim.tempUnit}) is less than ` +
        `${lim.warnTempDiff} ${lim.tempUnit}; results may be imprecise`
      )
    }
  }

  return { valid: errors.length === 0, errors, warnings }
}

// ---------------------------------------------------------------------------
// Calculation
// ---------------------------------------------------------------------------

/**
 * Calculate the series compensation resistance and placement for zero-vs-temperature.
 *
 * Mirrors `TZeroVsTempDlg.CalculateResistance` and `CalculateBridgeArm` from ZVSTEMP.PAS.
 *
 * @throws {Error} if `highTemp === lowTemp` (zero denominator)
 * @throws {Error} if `resistorTcr === 0` (zero denominator)
 */
export function calculateZeroVsTemp(params: ZeroVsTempParams): ZeroVsTempResult {
  const { lowTemp, lowOutput, highTemp, highOutput, resistorTcr, bridgeResistance } = params

  const diffTemp   = highTemp   - lowTemp
  const diffOutput = highOutput - lowOutput

  if (diffTemp === 0) {
    throw new Error('Temperature difference must not be zero')
  }
  if (resistorTcr === 0) {
    throw new Error('Resistor TCR must not be zero')
  }

  // If there is no zero shift there is nothing to compensate
  if (diffOutput === 0) {
    return { resistance: 0, bridgeArm: 'minus-s-minus', useWire: false }
  }

  // Core formula from Delphi CalculateResistance:
  //   step 1: ResistanceValue = DiffInSpan × 4 × R_bridge × 1e-3
  //   step 2: /= DiffInTemp
  //   step 3: /= (ResistTCR / 100)
  const signedResistance =
    (diffOutput * 4.0 * bridgeResistance * 1e-3) / diffTemp / (resistorTcr / 100)

  const resistance = Math.abs(signedResistance)

  // Bridge arm: positive signed value → minus-S/minus arm (Delphi: ZTPMinusSMinus)
  //             negative signed value → plus-S/minus arm  (Delphi: ZTPPlusSMinus)
  const bridgeArm: BridgeArm = signedResistance > 0 ? 'minus-s-minus' : 'plus-s-minus'

  // E01 resistor network can only realise ≤ 0.5 Ω; wire is needed above that
  const useWire = resistance > 0.5

  return { resistance, bridgeArm, useWire }
}
