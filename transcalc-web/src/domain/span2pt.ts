/**
 * Span vs Temperature 2-Point Module
 * Calculates compensation resistance and bridge output span based on
 * temperature and output changes across a two-point calibration range.
 */

const MIN_TEMPERATURE_US = -100; // °F
const MAX_TEMPERATURE_US = 500; // °F
const MIN_TEMPERATURE_SI = -73.33; // °C (converted from -100°F)
const MAX_TEMPERATURE_SI = 260; // °C (converted from 500°F)

const MIN_OUTPUT = 0.0001; // mV
const MAX_OUTPUT = 10; // mV

const MIN_RESISTANCE_TCR = 0.1; // %/°F or %/°C
const MAX_RESISTANCE_TCR = 0.5; // %/°F or %/°C

const MIN_BRIDGE_RESISTANCE = 50; // Ω
const MAX_BRIDGE_RESISTANCE = 10000; // Ω

export interface SpanVsTemp2ptInput {
  lowTemperature: number; // °F (US) or °C (SI)
  lowOutput: number; // mV
  highTemperature: number; // °F (US) or °C (SI)
  highOutput: number; // mV
  resistorTCR: number; // %/°F or %/°C
  bridgeResistance: number; // Ω
  usUnits: boolean; // true for US (°F), false for SI (°C)
}

export interface SpanVsTemp2ptResult {
  success: boolean;
  error?: string;
  resistance?: number; // Ω (compensation resistance)
  span?: number; // mV (bridge output span)
}

/**
 * Validates input parameters
 */
function validateInput(input: SpanVsTemp2ptInput): string | null {
  const minTemp = input.usUnits ? MIN_TEMPERATURE_US : MIN_TEMPERATURE_SI;
  const maxTemp = input.usUnits ? MAX_TEMPERATURE_US : MAX_TEMPERATURE_SI;
  const tempUnit = input.usUnits ? '°F' : '°C';

  if (input.lowTemperature < minTemp || input.lowTemperature > maxTemp) {
    return `Low temperature must be between ${minTemp} and ${maxTemp} ${tempUnit}`;
  }

  if (input.highTemperature < minTemp || input.highTemperature > maxTemp) {
    return `High temperature must be between ${minTemp} and ${maxTemp} ${tempUnit}`;
  }

  if (input.lowOutput < MIN_OUTPUT || input.lowOutput > MAX_OUTPUT) {
    return `Low output must be between ${MIN_OUTPUT} and ${MAX_OUTPUT} mV`;
  }

  if (input.highOutput < MIN_OUTPUT || input.highOutput > MAX_OUTPUT) {
    return `High output must be between ${MIN_OUTPUT} and ${MAX_OUTPUT} mV`;
  }

  if (input.lowOutput === 0) {
    return 'Low output cannot be zero (causes division by zero in calculation)';
  }

  if (
    input.resistorTCR < MIN_RESISTANCE_TCR ||
    input.resistorTCR > MAX_RESISTANCE_TCR
  ) {
    return `Resistor TCR must be between ${MIN_RESISTANCE_TCR} and ${MAX_RESISTANCE_TCR}`;
  }

  if (
    input.bridgeResistance < MIN_BRIDGE_RESISTANCE ||
    input.bridgeResistance > MAX_BRIDGE_RESISTANCE
  ) {
    return `Bridge resistance must be between ${MIN_BRIDGE_RESISTANCE} and ${MAX_BRIDGE_RESISTANCE} Ω`;
  }

  const tempDiff = input.highTemperature - input.lowTemperature;
  if (Math.abs(tempDiff) < 1) {
    return 'Temperature difference must be at least 1 degree (prevents numerical instability)';
  }

  return null;
}

/**
 * Calculates the compensation resistance needed to match temperature coefficient
 * Formula: R = (dS/dT * Rb) / ((TCR/100) - dS/dT)
 * where dS/dT = (HighOut - LowOut) / LowOut / (HighTemp - LowTemp)
 */
function calculateResistance(input: SpanVsTemp2ptInput): number {
  const diffInTemp = input.highTemperature - input.lowTemperature;
  const diffInSpan = (input.highOutput - input.lowOutput) / input.lowOutput;
  const dsDivDt = diffInSpan / diffInTemp;

  const tcrRatio = input.resistorTCR / 100;

  // Check for condition where denominator would be zero or very close
  if (Math.abs(tcrRatio - dsDivDt) < 1e-10) {
    throw new Error(
      'Calculation impractical: resistor TCR too close to span temperature coefficient'
    );
  }

  const resistance = (dsDivDt * input.bridgeResistance) / (tcrRatio - dsDivDt);

  if (resistance <= 0) {
    throw new Error(
      'Calculation produced non-positive resistance (check TCR and output values)'
    );
  }

  return resistance;
}

/**
 * Calculates the bridge output span (mV)
 * Formula: Span = (LowOut * Rb) / (Rb + R)
 * where Rb is bridge resistance and R is compensation resistance
 */
function calculateSpan(
  lowOutput: number,
  bridgeResistance: number,
  resistance: number
): number {
  const denominator = bridgeResistance + resistance;

  if (denominator === 0) {
    throw new Error('Denominator equals zero in span calculation');
  }

  return (lowOutput * bridgeResistance) / denominator;
}

/**
 * Performs span vs temperature 2-point calculation
 * Calculates compensation resistance and output span for a 2-point temperature calibration
 */
export function calculateSpanVsTemp2pt(
  input: SpanVsTemp2ptInput
): SpanVsTemp2ptResult {
  const errorMsg = validateInput(input);
  if (errorMsg) {
    return { success: false, error: errorMsg };
  }

  try {
    const resistance = calculateResistance(input);
    const span = calculateSpan(input.lowOutput, input.bridgeResistance, resistance);

    return {
      success: true,
      resistance,
      span,
    };
  } catch (error) {
    return {
      success: false,
      error: `Calculation error: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}
