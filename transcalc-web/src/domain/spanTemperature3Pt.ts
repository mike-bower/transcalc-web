/**
 * Span vs Temperature 3-Point Calculation Module
 * Calculates span shift using three calibration points for better non-linear compensation
 * Used for RTD and high-precision temperature measurement systems
 *
 * @module spanTemperature3Pt
 */

export interface CalibrationPoint {
  temperature: number; // °F or °C
  output: number; // mV/V or similar output
}

/**
 * Input for 3-point span temperature calculation
 */
export interface SpanTemperature3PtInput {
  /** Low calibration point (temperature, output) */
  lowPoint: CalibrationPoint;
  /** Mid calibration point (temperature, output) */
  midPoint: CalibrationPoint;
  /** High calibration point (temperature, output) */
  highPoint: CalibrationPoint;
  /** Resistor temperature coefficient (%/°C or %/°F) */
  resistorTCR: number;
  /** Initial bridge resistance (Ohms) */
  bridgeResistance: number;
  /** Whether using US units (°F) or SI (°C) */
  usUnits?: boolean;
}

/**
 * Result of 3-point span calculation
 */
export interface SpanTemperature3PtResult {
  /** Calculated compensation resistances (Ohms) */
  lowCompensation: number;
  midCompensation: number;
  highCompensation: number;
  /** Average sensitivity across range */
  averageSensitivity: number;
  /** Linear regression coefficient (0-1, higher is better fit) */
  regressionCoeff: number;
  /** Non-linearity indicator (curvature of response) */
  nonlinearity: number;
  /** Recommended compensation method */
  compensationMethod: 'linear' | 'quadratic';
  /** Whether input was valid */
  isValid: boolean;
}

/**
 * Validate 3-point span input parameters
 */
function validateInput(input: SpanTemperature3PtInput): void {
  const points = [input.lowPoint, input.midPoint, input.highPoint];

  // Check all points
  for (const point of points) {
    if (point.temperature < -100 || point.temperature > 500) {
      throw new Error('Temperature must be between -100 and 500');
    }
    if (point.output <= 0.0001 || point.output > 10) {
      throw new Error('Output must be between 0.0001 and 10 mV/V');
    }
  }

  // Check temperature ordering
  if (!(input.lowPoint.temperature < input.midPoint.temperature &&
        input.midPoint.temperature < input.highPoint.temperature)) {
    throw new Error('Temperatures must be in ascending order: low < mid < high');
  }

  // Check output ordering
  if (!(input.lowPoint.output < input.midPoint.output &&
        input.midPoint.output < input.highPoint.output)) {
    throw new Error('Outputs must be in ascending order: low < mid < high');
  }

  if (input.resistorTCR < 0.1 || input.resistorTCR > 0.9) {
    throw new Error('Resistor TCR must be between 0.1 and 0.9');
  }

  if (input.bridgeResistance < 50 || input.bridgeResistance > 10000) {
    throw new Error('Bridge resistance must be between 50 and 10000 Ohms');
  }
}

/**
 * Calculate compensation resistance for a given output
 */
function calculateCompensation(
  output: number,
  bridgeResistance: number
): number {
  // Compensation based on output level relative to bridge
  // Larger outputs require less compensation (proportionally)
  // Smaller outputs require more compensation
  const normalizedOutput = output / 10; // Normalize to 0-1 range for typical mV/V range
  return (1 - normalizedOutput) * (bridgeResistance / 1000);
}

/**
 * Calculate linear regression coefficient for 3-point fit
 *
 * For perfect linear fit: R² = 1.0
 * Measures how well a line fits the 3 calibration points
 */
function calculateRegressionCoeff(
  lowTemp: number,
  midTemp: number,
  highTemp: number,
  lowOut: number,
  midOut: number,
  highOut: number
): number {
  // Calculate expected mid output using linear interpolation
  const tempRange = highTemp - lowTemp;
  const midFraction = (midTemp - lowTemp) / tempRange;
  const expectedMidOut = lowOut + midFraction * (highOut - lowOut);

  // Calculate deviation from linear fit
  const midDeviation = midOut - expectedMidOut;
  const totalRange = highOut - lowOut;

  // If deviation is zero, perfect fit
  if (Math.abs(midDeviation) < 0.0001) {
    return 1.0;
  }

  // Regression coefficient based on deviation magnitude
  // Small deviations → high coefficient (good fit)
  // Large deviations → low coefficient (poor fit)
  const normalizedDeviation = Math.abs(midDeviation) / totalRange;
  return Math.max(0, 1 - normalizedDeviation);
}

/**
 * Calculate non-linearity: how much the middle point deviates from linear fit
 *
 * Returns the percentage deviation of mid point from linear interpolation
 */
function calculateNonlinearity(
  lowTemp: number,
  midTemp: number,
  highTemp: number,
  lowOut: number,
  midOut: number,
  highOut: number
): number {
  const tempRange = highTemp - lowTemp;
  const midFraction = (midTemp - lowTemp) / tempRange;
  const expectedMidOut = lowOut + midFraction * (highOut - lowOut);
  const deviation = midOut - expectedMidOut;
  const totalRange = highOut - lowOut;

  // Return as percentage
  return (deviation / totalRange) * 100;
}

/**
 * Determine best compensation method based on non-linearity
 *
 * Linear: small non-linearity < 2%
 * Quadratic: moderate to high non-linearity ≥ 2%
 */
function getCompensationMethod(
  nonlinearity: number
): 'linear' | 'quadratic' {
  return Math.abs(nonlinearity) < 2 ? 'linear' : 'quadratic';
}

/**
 * Calculate 3-point span temperature compensation
 *
 * Uses three calibration points to better account for non-linear
 * temperature effects in sensor response
 *
 * @example
 * ```typescript
 * const result = calculateSpanTemperature3Pt({
 *   lowPoint: { temperature: 32, output: 1.0 },
 *   midPoint: { temperature: 122, output: 5.5 },
 *   highPoint: { temperature: 212, output: 10.0 },
 *   resistorTCR: 0.25,
 *   bridgeResistance: 350,
 *   usUnits: true
 * });
 *
 * console.log(result.regressionCoeff);    // How well points fit
 * console.log(result.nonlinearity);       // Deviation from linearity
 * console.log(result.compensationMethod);  // Recommended method
 * ```
 */
export function calculateSpanTemperature3Pt(
  input: SpanTemperature3PtInput
): SpanTemperature3PtResult {
  validateInput(input);

  // Calculate compensation for each point
  const lowCompensation = calculateCompensation(
    input.lowPoint.output,
    input.bridgeResistance
  );
  const midCompensation = calculateCompensation(
    input.midPoint.output,
    input.bridgeResistance
  );
  const highCompensation = calculateCompensation(
    input.highPoint.output,
    input.bridgeResistance
  );

  // Calculate average sensitivity
  const lowSensitivity =
    (input.midPoint.output - input.lowPoint.output) /
    (input.midPoint.temperature - input.lowPoint.temperature);
  const highSensitivity =
    (input.highPoint.output - input.midPoint.output) /
    (input.highPoint.temperature - input.midPoint.temperature);
  const averageSensitivity = (lowSensitivity + highSensitivity) / 2;

  // Calculate regression coefficient (goodness of linear fit)
  const regressionCoeff = calculateRegressionCoeff(
    input.lowPoint.temperature,
    input.midPoint.temperature,
    input.highPoint.temperature,
    input.lowPoint.output,
    input.midPoint.output,
    input.highPoint.output
  );

  // Calculate non-linearity
  const nonlinearity = calculateNonlinearity(
    input.lowPoint.temperature,
    input.midPoint.temperature,
    input.highPoint.temperature,
    input.lowPoint.output,
    input.midPoint.output,
    input.highPoint.output
  );

  // Determine compensation method
  const compensationMethod = getCompensationMethod(nonlinearity);

  return {
    lowCompensation: lowCompensation,
    midCompensation: midCompensation,
    highCompensation: highCompensation,
    averageSensitivity: averageSensitivity,
    regressionCoeff: regressionCoeff,
    nonlinearity: nonlinearity,
    compensationMethod: compensationMethod,
    isValid: true,
  };
}

/**
 * Interpolate output at arbitrary temperature using quadratic fit
 *
 * Provides better accuracy for non-linear temperature responses
 */
export function interpolateOutputQuadratic(
  lowPoint: CalibrationPoint,
  midPoint: CalibrationPoint,
  highPoint: CalibrationPoint,
  queryTemperature: number
): number {
  if (
    queryTemperature < lowPoint.temperature ||
    queryTemperature > highPoint.temperature
  ) {
    throw new Error('Query temperature outside calibration range');
  }

  // Use Lagrange interpolation for quadratic fit
  const x = queryTemperature;
  const x0 = lowPoint.temperature;
  const x1 = midPoint.temperature;
  const x2 = highPoint.temperature;
  const y0 = lowPoint.output;
  const y1 = midPoint.output;
  const y2 = highPoint.output;

  const L0 = ((x - x1) * (x - x2)) / ((x0 - x1) * (x0 - x2));
  const L1 = ((x - x0) * (x - x2)) / ((x1 - x0) * (x1 - x2));
  const L2 = ((x - x0) * (x - x1)) / ((x2 - x0) * (x2 - x1));

  return y0 * L0 + y1 * L1 + y2 * L2;
}

/**
 * Interpolate output at arbitrary temperature using piecewise linear fit
 *
 * Simpler but still accurate for mildly non-linear responses
 */
export function interpolateOutputLinear(
  lowPoint: CalibrationPoint,
  midPoint: CalibrationPoint,
  highPoint: CalibrationPoint,
  queryTemperature: number
): number {
  if (
    queryTemperature < lowPoint.temperature ||
    queryTemperature > highPoint.temperature
  ) {
    throw new Error('Query temperature outside calibration range');
  }

  // Determine which segment to use
  if (queryTemperature <= midPoint.temperature) {
    // Use low-mid segment
    const tempFraction =
      (queryTemperature - lowPoint.temperature) /
      (midPoint.temperature - lowPoint.temperature);
    return lowPoint.output + tempFraction * (midPoint.output - lowPoint.output);
  } else {
    // Use mid-high segment
    const tempFraction =
      (queryTemperature - midPoint.temperature) /
      (highPoint.temperature - midPoint.temperature);
    return midPoint.output + tempFraction * (highPoint.output - midPoint.output);
  }
}

