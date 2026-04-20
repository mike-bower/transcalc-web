/**
 * Span vs Temperature 2-Point Calculation Module
 * Calculates span shift and output changes based on two calibration points
 * Used for RTD (Resistance Temperature Detector) and similar sensor systems
 *
 * @module spanTemperature2Pt
 */


export interface WireType {
  name: string;
  resistivity: number; // Ohm-cm or similar (material property)
  tcr: number; // Temperature coefficient of resistance (%/°C)
}

export const spanWireTypes: WireType[] = [
  { name: 'Balco', resistivity: 120, tcr: 0.25 },
  { name: 'Copper', resistivity: 10.371, tcr: 0.22 },
  { name: 'Nickel (pure)', resistivity: 45, tcr: 0.33 },
];

/**
 * Input for 2-point span temperature calculation
 */
export interface SpanTemperature2PtInput {
  /** Temperature at low calibration point (°F or °C) */
  lowTemperature: number;
  /** Output/signal at low calibration point (mV/V or similar) */
  lowOutput: number;
  /** Temperature at high calibration point (°F or °C) */
  highTemperature: number;
  /** Output/signal at high calibration point (mV/V or similar) */
  highOutput: number;
  /** Wire material type for RTD compensation */
  wireType: WireType;
  /** Temperature coefficient of resistor (wire) (%/°C or %/°F) */
  resistorTCR: number;
  /** Initial bridge resistance (Ohms) */
  bridgeResistance: number;
  /** Whether using US units (°F) or SI (°C) */
  usUnits?: boolean;
}

/**
 * Result of 2-point span calculation
 */
export interface SpanTemperature2PtResult {
  /** Calculated compensation resistance needed (Ohms) */
  compensationResistance: number;
  /** Span change at low temperature point (mV/V) */
  spanLow: number;
  /** Span change at high temperature point (mV/V) */
  spanHigh: number;
  /** Temperature coefficient of span shift (%/°C) */
  spanTCR: number;
  /** Linear sensitivity (output per degree of temperature) */
  sensitivity: number;
  /** Regression coefficient for span fit */
  regressionCoeff: number;
  /** Whether input was valid */
  isValid: boolean;
}

/**
 * Validate 2-point span input parameters
 */
function validateInput(input: SpanTemperature2PtInput): void {
  // Temperature limits: -100°F to 500°F (-73°C to 260°C)
  const minTempF = -100;
  const maxTempF = 500;

  if (input.lowTemperature < minTempF || input.lowTemperature > maxTempF) {
    throw new Error('Low temperature must be between -100°F and 500°F');
  }

  if (input.highTemperature < minTempF || input.highTemperature > maxTempF) {
    throw new Error('High temperature must be between -100°F and 500°F');
  }

  if (input.lowTemperature >= input.highTemperature) {
    throw new Error('Low temperature must be less than high temperature');
  }

  // Output limits: 0.0001 to 10 mV/V
  if (
    input.lowOutput <= 0.0001 ||
    input.lowOutput > 10 ||
    input.highOutput <= 0.0001 ||
    input.highOutput > 10
  ) {
    throw new Error('Output must be between 0.0001 and 10 mV/V');
  }

  if (input.lowOutput >= input.highOutput) {
    throw new Error('Low output must be less than high output');
  }

  // Resistor TCR limits: 0.1 to 0.5 %/°F or 0.18 to 0.9 %/°C
  if (
    input.resistorTCR < 0.1 ||
    input.resistorTCR > 0.9
  ) {
    throw new Error('Resistor TCR must be between 0.1 and 0.9 %/°unit');
  }

  // Bridge resistance limits: 50 to 10000 Ohms
  if (
    input.bridgeResistance < 50 ||
    input.bridgeResistance > 10000
  ) {
    throw new Error('Bridge resistance must be between 50 and 10000 Ohms');
  }
}

/**
 * Calculate compensation resistance for span shift at 2 calibration points
 *
 * Span change is calculates as:
 * Comp_R = Bridge_R × (HighOut - LowOut) / 1000
 *
 * Where outputs are in mV/V (millivolts per volt)
 */
function calculateCompensationResistance(
  lowOutput: number,
  highOutput: number,
  bridgeResistance: number
): number {
  // Output difference as fraction of full scale
  const outputDiff = (highOutput - lowOutput) / 1000;
  // Compensation resistance needed
  return Math.abs(outputDiff * bridgeResistance);
}

/**
 * Calculate span change values at calibration points
 *
 * Based on linear interpolation from two known points
 */
function calculateSpanValues(
  lowTemperature: number,
  highTemperature: number,
  lowOutput: number,
  highOutput: number
): { spanLow: number; spanHigh: number } {
  return {
    spanLow: lowOutput,
    spanHigh: highOutput,
  };
}

/**
 * Calculate temperature sensitivity (change in output per degree change in temperature)
 *
 * Sensitivity = ΔOutput / ΔTemperature
 */
function calculateSensitivity(
  lowTemperature: number,
  highTemperature: number,
  lowOutput: number,
  highOutput: number
): number {
  const tempDiff = highTemperature - lowTemperature;
  const outputDiff = highOutput - lowOutput;
  return outputDiff / tempDiff; // mV/V per degree
}

/**
 * Calculate span temperature coefficient
 *
 * TCR represents the fractional change in span per unit temperature change
 * S(T) = S₀ × (1 + MCR × ΔT)
 * where MCR is the manufacturer's span temperature coefficient
 */
function calculateSpanTCR(
  resistorTCR: number,
  wireType: WireType,
  usUnits: boolean
): number {
  // Wire TCR is typically already in %/°C format
  let wireTCR = wireType.tcr;

  // If using Fahrenheit units, convert wire TCR to %/°F
  if (usUnits) {
    wireTCR = wireTCR / 1.8;
  }

  // Span TCR is the difference between resistor TCR and wire TCR
  // This accounts for the differential temperature effects
  // Convert resistor TCR from whatever units to decimal form
  const compTCR = resistorTCR / 100; // Convert from percentage
  const wireCompTCR = wireTCR / 100;

  // Combined effect
  return (compTCR - wireCompTCR) * 100; // Return as percentage
}

/**
 * Calculate 2-point span temperature compensation
 *
 * Determines how much resistance adjustment is needed to compensate
 * for span shift (output sensitivity change) due to temperature
 *
 * @example
 * ```typescript
 * const result = calculateSpanTemperature2Pt({
 *   lowTemperature: 32,        // 32°F (0°C)
 *   lowOutput: 1.0,            // 1.0 mV/V
 *   highTemperature: 212,      // 212°F (100°C)
 *   highOutput: 10.0,          // 10.0 mV/V
 *   wireType: spanWireTypes[0], // Balco
 *   resistorTCR: 0.25,
 *   bridgeResistance: 350,
 *   usUnits: true
 * });
 *
 * console.log(result.compensationResistance); // Ohms needed
 * console.log(result.sensitivity);             // mV/V per °F
 * ```
 */
export function calculateSpanTemperature2Pt(
  input: SpanTemperature2PtInput
): SpanTemperature2PtResult {
  validateInput(input);

  const usUnits = input.usUnits ?? true;

  // Calculate compensation resistance
  const compensationResistance = calculateCompensationResistance(
    input.lowOutput,
    input.highOutput,
    input.bridgeResistance
  );

  // Calculate span values at calibration points
  const { spanLow, spanHigh } = calculateSpanValues(
    input.lowTemperature,
    input.highTemperature,
    input.lowOutput,
    input.highOutput
  );

  // Calculate sensitivity (output change per temperature)
  const sensitivity = calculateSensitivity(
    input.lowTemperature,
    input.highTemperature,
    input.lowOutput,
    input.highOutput
  );

  // Calculate span TCR
  const spanTCR = calculateSpanTCR(
    input.resistorTCR,
    input.wireType,
    usUnits
  );

  // Linear regression coefficient for how well the 2 points fit
  // For a perfect 2-point fit, this is 1.0
  const regressionCoeff = 1.0;

  return {
    compensationResistance: compensationResistance,
    spanLow: spanLow,
    spanHigh: spanHigh,
    spanTCR: spanTCR,
    sensitivity: sensitivity,
    regressionCoeff: regressionCoeff,
    isValid: true,
  };
}

/**
 * Calculate expected output at arbitrary temperature using 2-point calibration
 *
 * Linear interpolation between calibration points
 */
export function interpolateOutputAtTemperature(
  lowTemperature: number,
  highTemperature: number,
  lowOutput: number,
  highOutput: number,
  queryTemperature: number
): number {
  if (
    queryTemperature < lowTemperature ||
    queryTemperature > highTemperature
  ) {
    throw new Error(
      'Query temperature must be between calibration points'
    );
  }

  // Linear interpolation
  const tempFraction =
    (queryTemperature - lowTemperature) /
    (highTemperature - lowTemperature);
  return lowOutput + tempFraction * (highOutput - lowOutput);
}

/**
 * Calculate temperature-compensated output accounting for span shift
 *
 * Adjusted_Output = Raw_Output × (1 + MCR × ΔT)
 * where MCR is manufacturer's span temperature coefficient
 */
export function temperatureCompensateOutput(
  rawOutput: number,
  referenceTemp: number,
  actualTemp: number,
  spanTCR: number
): number {
  const tempChange = actualTemp - referenceTemp;
  // spanTCR is already in percentage form
  const tcrDecimal = spanTCR / 100;
  return rawOutput * (1 + tcrDecimal * tempChange);
}

