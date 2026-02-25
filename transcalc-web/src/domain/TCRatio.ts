/**
 * Temperature Coefficient Ratio Calculation Module
 *
 * Calculates temperature coefficient of resistance (TCR) for various sensor types
 * using polynomial interpolation. Supports RTD (Pt100, Pt1000), thermistor,
 * and other temperature-dependent resistors.
 *
 * @module TCRatio
 */

/**
 * Polynomial coefficients for sensor resistance calculation at a given temperature
 */
interface PolynomialCoefficients {
  c0: number; // Constant term
  c1: number; // Linear term
  c2: number; // Quadratic term
  c3: number; // Cubic term
  c4: number; // Quartic term
  c5: number; // Quintic term
  c6: number; // Sextic term
}

/**
 * Sensor type definition with US and SI polynomial coefficients
 */
interface SensorDefinition {
  name: string;
  usCoefficients: PolynomialCoefficients;
  siCoefficients: PolynomialCoefficients;
}

/**
 * Input parameters for TCR calculation
 */
export interface TCRatioInput {
  /** Sensor type name (e.g., 'Pt100', 'Pt1000', 'Thermistor') */
  sensorType: string;
  /** Low temperature point */
  tempLow: number;
  /** Ambient/mid temperature point */
  tempAmbient: number;
  /** High temperature point */
  tempHigh: number;
  /** True for US units (°F), false for SI (°C) */
  usUnits: boolean;
}

/**
 * Output result from TCR calculation
 */
export interface TCRatioResult {
  /** Resistance at low temperature */
  resistanceLow: number;
  /** Resistance at ambient temperature */
  resistanceAmbient: number;
  /** Resistance at high temperature */
  resistanceHigh: number;
  /** Resistance ratio (R_high / R_low) */
  resistanceRatio: number;
  /** Temperature coefficient at low point */
  tcrLow: number;
  /** Temperature coefficient at ambient point */
  tcrAmbient: number;
  /** Temperature coefficient at high point */
  tcrHigh: number;
  /** Average TCR across range */
  tcrAverage: number;
  /** Whether the calculation is valid */
  isValid: boolean;
  /** Error message if invalid */
  error?: string;
}

/**
 * Sensor definitions with polynomial coefficients
 * Coefficients provided for both US (°F) and SI (°C) temperature scales
 */
const SENSOR_DEFINITIONS: Record<string, SensorDefinition> = {
  // Pt100 RTD - US °F
  pt100_us: {
    name: 'Pt100',
    usCoefficients: {
      c0: 100.0,
      c1: 0.3666,
      c2: 0.0,
      c3: 0.0,
      c4: 0.0,
      c5: 0.0,
      c6: 0.0,
    },
    siCoefficients: {
      c0: 100.0,
      c1: 0.3666,
      c2: 0.0,
      c3: 0.0,
      c4: 0.0,
      c5: 0.0,
      c6: 0.0,
    },
  },
  // Pt100 RTD - SI °C
  pt100_si: {
    name: 'Pt100',
    usCoefficients: {
      c0: 100.0,
      c1: 0.3850,
      c2: 0.0,
      c3: 0.0,
      c4: 0.0,
      c5: 0.0,
      c6: 0.0,
    },
    siCoefficients: {
      c0: 100.0,
      c1: 0.3850,
      c2: 0.0,
      c3: 0.0,
      c4: 0.0,
      c5: 0.0,
      c6: 0.0,
    },
  },
  // Pt1000 RTD - US °F
  pt1000_us: {
    name: 'Pt1000',
    usCoefficients: {
      c0: 1000.0,
      c1: 3.666,
      c2: 0.0,
      c3: 0.0,
      c4: 0.0,
      c5: 0.0,
      c6: 0.0,
    },
    siCoefficients: {
      c0: 1000.0,
      c1: 3.666,
      c2: 0.0,
      c3: 0.0,
      c4: 0.0,
      c5: 0.0,
      c6: 0.0,
    },
  },
  // Pt1000 RTD - SI °C
  pt1000_si: {
    name: 'Pt1000',
    usCoefficients: {
      c0: 1000.0,
      c1: 3.85,
      c2: 0.0,
      c3: 0.0,
      c4: 0.0,
      c5: 0.0,
      c6: 0.0,
    },
    siCoefficients: {
      c0: 1000.0,
      c1: 3.85,
      c2: 0.0,
      c3: 0.0,
      c4: 0.0,
      c5: 0.0,
      c6: 0.0,
    },
  },
  // Thermistor 10K - US °F
  thermistor_10k_us: {
    name: 'Thermistor 10K',
    usCoefficients: {
      c0: 10000.0,
      c1: -50.0,
      c2: 0.0,
      c3: 0.0,
      c4: 0.0,
      c5: 0.0,
      c6: 0.0,
    },
    siCoefficients: {
      c0: 10000.0,
      c1: -50.0,
      c2: 0.0,
      c3: 0.0,
      c4: 0.0,
      c5: 0.0,
      c6: 0.0,
    },
  },
  // Thermistor 10K - SI °C  
  thermistor_10k_si: {
    name: 'Thermistor 10K',
    usCoefficients: {
      c0: 10000.0,
      c1: -45.0,
      c2: 0.0,
      c3: 0.0,
      c4: 0.0,
      c5: 0.0,
      c6: 0.0,
    },
    siCoefficients: {
      c0: 10000.0,
      c1: -45.0,
      c2: 0.0,
      c3: 0.0,
      c4: 0.0,
      c5: 0.0,
      c6: 0.0,
    },
  },
  // Thermistor 100K - US °F
  thermistor_100k_us: {
    name: 'Thermistor 100K',
    usCoefficients: {
      c0: 100000.0,
      c1: -500.0,
      c2: 0.0,
      c3: 0.0,
      c4: 0.0,
      c5: 0.0,
      c6: 0.0,
    },
    siCoefficients: {
      c0: 100000.0,
      c1: -500.0,
      c2: 0.0,
      c3: 0.0,
      c4: 0.0,
      c5: 0.0,
      c6: 0.0,
    },
  },
  // Thermistor 100K - SI °C
  thermistor_100k_si: {
    name: 'Thermistor 100K',
    usCoefficients: {
      c0: 100000.0,
      c1: -450.0,
      c2: 0.0,
      c3: 0.0,
      c4: 0.0,
      c5: 0.0,
      c6: 0.0,
    },
    siCoefficients: {
      c0: 100000.0,
      c1: -450.0,
      c2: 0.0,
      c3: 0.0,
      c4: 0.0,
      c5: 0.0,
      c6: 0.0,
    },
  },
  // Copper RTD - US °F
  copper_us: {
    name: 'Copper RTD',
    usCoefficients: {
      c0: 100.0,
      c1: 0.4268,
      c2: 0.0,
      c3: 0.0,
      c4: 0.0,
      c5: 0.0,
      c6: 0.0,
    },
    siCoefficients: {
      c0: 100.0,
      c1: 0.4268,
      c2: 0.0,
      c3: 0.0,
      c4: 0.0,
      c5: 0.0,
      c6: 0.0,
    },
  },
  // Copper RTD - SI °C
  copper_si: {
    name: 'Copper RTD',
    usCoefficients: {
      c0: 100.0,
      c1: 0.425,
      c2: 0.0,
      c3: 0.0,
      c4: 0.0,
      c5: 0.0,
      c6: 0.0,
    },
    siCoefficients: {
      c0: 100.0,
      c1: 0.425,
      c2: 0.0,
      c3: 0.0,
      c4: 0.0,
      c5: 0.0,
      c6: 0.0,
    },
  },
  // Nickel RTD - US °F
  nickel_us: {
    name: 'Nickel RTD',
    usCoefficients: {
      c0: 100.0,
      c1: 0.6179,
      c2: 0.0,
      c3: 0.0,
      c4: 0.0,
      c5: 0.0,
      c6: 0.0,
    },
    siCoefficients: {
      c0: 100.0,
      c1: 0.6179,
      c2: 0.0,
      c3: 0.0,
      c4: 0.0,
      c5: 0.0,
      c6: 0.0,
    },
  },
  // Nickel RTD - SI °C
  nickel_si: {
    name: 'Nickel RTD',
    usCoefficients: {
      c0: 100.0,
      c1: 0.61,
      c2: 0.0,
      c3: 0.0,
      c4: 0.0,
      c5: 0.0,
      c6: 0.0,
    },
    siCoefficients: {
      c0: 100.0,
      c1: 0.61,
      c2: 0.0,
      c3: 0.0,
      c4: 0.0,
      c5: 0.0,
      c6: 0.0,
    },
  },
};

/**
 * Evaluate polynomial using Horner's method
 * P(x) = c0 + c1*x + c2*x^2 + c3*x^3 + c4*x^4 + c5*x^5 + c6*x^6
 */
function evaluatePolynomial(coeff: PolynomialCoefficients, t: number): number {
  const x = t;
  const x2 = x * x;
  const x3 = x2 * x;
  const x4 = x3 * x;
  const x5 = x4 * x;
  const x6 = x5 * x;

  return (
    coeff.c0 +
    coeff.c1 * x +
    coeff.c2 * x2 +
    coeff.c3 * x3 +
    coeff.c4 * x4 +
    coeff.c5 * x5 +
    coeff.c6 * x6
  );
}

/**
 * Calculate temperature coefficient of resistance (TCR) at a given temperature
 * TCR = (1/R) * (dR/dT)
 * For polynomial: dR/dT = c1 + 2*c2*T + 3*c3*T^2 + 4*c4*T^3 + 5*c5*T^4 + 6*c6*T^5
 */
function calculateTCR(coeff: PolynomialCoefficients, t: number): number {
  const x = t;
  const x2 = x * x;
  const x3 = x2 * x;
  const x4 = x3 * x;
  const x5 = x4 * x;

  // Derivative: dR/dT
  const dRdt =
    coeff.c1 +
    2 * coeff.c2 * x +
    3 * coeff.c3 * x2 +
    4 * coeff.c4 * x3 +
    5 * coeff.c5 * x4 +
    6 * coeff.c6 * x5;

  const r = evaluatePolynomial(coeff, t);

  if (r === 0) return 0;

  // TCR in %/°C or %/°F = (dR/dT) / R * 100
  return (dRdt / r) * 100;
}

/**
 * Calculate temperature coefficient ratios for a sensor across temperature range
 *
 * @param input - Input parameters with temperature points and sensor type
 * @returns TCR calculation result with resistance values and coefficients
 */
export function calculateTCRatio(input: TCRatioInput): TCRatioResult {
  // Validate temperature ordering
  if (input.tempLow >= input.tempAmbient || input.tempAmbient >= input.tempHigh) {
    return {
      resistanceLow: 0,
      resistanceAmbient: 0,
      resistanceHigh: 0,
      resistanceRatio: 0,
      tcrLow: 0,
      tcrAmbient: 0,
      tcrHigh: 0,
      tcrAverage: 0,
      isValid: false,
      error: 'Temperatures must be in ascending order: tempLow < tempAmbient < tempHigh',
    };
  }

  // Validate temperature ranges
  const minTemp = -100,
    maxTemp = 500;
  if (
    input.tempLow < minTemp ||
    input.tempHigh > maxTemp ||
    input.tempAmbient < minTemp ||
    input.tempAmbient > maxTemp
  ) {
    return {
      resistanceLow: 0,
      resistanceAmbient: 0,
      resistanceHigh: 0,
      resistanceRatio: 0,
      tcrLow: 0,
      tcrAmbient: 0,
      tcrHigh: 0,
      tcrAverage: 0,
      isValid: false,
      error: `Temperatures must be between ${minTemp} and ${maxTemp}`,
    };
  }

  // Find matching sensor definition
  // Handle both explicit (pt100_us) and implicit (pt100) sensor type names
  let sensorDef: SensorDefinition | undefined;
  const baseName = input.sensorType.toLowerCase();

  // If user provided explicit suffix, use as-is; otherwise add appropriate suffix
  if (baseName.endsWith('_us') || baseName.endsWith('_si')) {
    sensorDef = SENSOR_DEFINITIONS[baseName];
  } else {
    const suffix = input.usUnits ? '_us' : '_si';
    sensorDef = SENSOR_DEFINITIONS[baseName + suffix];
  }

  // If not found with suffix logic, try finding by name
  if (!sensorDef) {
    sensorDef = Object.values(SENSOR_DEFINITIONS).find(s =>
      s.name.toLowerCase().includes(baseName)
    );
  }

  if (!sensorDef) {
    const validTypes = Object.values(SENSOR_DEFINITIONS)
      .map(s => s.name)
      .join(', ');
    return {
      resistanceLow: 0,
      resistanceAmbient: 0,
      resistanceHigh: 0,
      resistanceRatio: 0,
      tcrLow: 0,
      tcrAmbient: 0,
      tcrHigh: 0,
      tcrAverage: 0,
      isValid: false,
      error: `Invalid sensor type '${input.sensorType}'. Valid types: ${validTypes}`,
    };
  }

  const coeff = input.usUnits
    ? sensorDef.usCoefficients
    : sensorDef.siCoefficients;

  // Calculate resistances at three temperature points
  const rLow = evaluatePolynomial(coeff, input.tempLow);
  const rAmbient = evaluatePolynomial(coeff, input.tempAmbient);
  const rHigh = evaluatePolynomial(coeff, input.tempHigh);

  // Calculate TCR at three temperature points
  const tcrLow = calculateTCR(coeff, input.tempLow);
  const tcrAmbient = calculateTCR(coeff, input.tempAmbient);
  const tcrHigh = calculateTCR(coeff, input.tempHigh);

  const tcrAverage = (tcrLow + tcrAmbient + tcrHigh) / 3;

  return {
    resistanceLow: rLow,
    resistanceAmbient: rAmbient,
    resistanceHigh: rHigh,
    resistanceRatio: rHigh > 0 ? rLow / rHigh : 0,
    tcrLow,
    tcrAmbient,
    tcrHigh,
    tcrAverage,
    isValid: true,
  };
}

/**
 * Get available sensor types
 */
export function getAvailableSensorTypes(): string[] {
  const unique = new Map<string, string>();
  Object.values(SENSOR_DEFINITIONS).forEach(def => {
    const baseName = def.name.replace(/ \(US|SI.*\)/g, '');
    unique.set(baseName.toLowerCase(), baseName);
  });
  return Array.from(unique.values());
}

/**
 * Get sensor definition info
 */
export function getSensorInfo(sensorType: string): SensorDefinition | undefined {
  const baseName = sensorType.toLowerCase();
  // If explicit suffix provided, use as-is; otherwise add _us suffix
  if (baseName.endsWith('_us') || baseName.endsWith('_si')) {
    return SENSOR_DEFINITIONS[baseName];
  }
  return SENSOR_DEFINITIONS[baseName + '_us'] || SENSOR_DEFINITIONS[baseName + '_si'];
}

/**
 * Add a custom sensor type
 */
export function addCustomSensor(
  name: string,
  usCoefficients: PolynomialCoefficients,
  siCoefficients: PolynomialCoefficients
): boolean {
  const key = `${name.toLowerCase()}_us`;
  if (SENSOR_DEFINITIONS[key]) {
    return false; // Already exists
  }

  SENSOR_DEFINITIONS[key] = {
    name: `${name}`,
    usCoefficients,
    siCoefficients,
  };

  // Also add SI version
  const siKey = `${name.toLowerCase()}_si`;
  SENSOR_DEFINITIONS[siKey] = SENSOR_DEFINITIONS[key];

  return true;
}
