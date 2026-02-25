/**
 * Simultaneous Span (3-Point) Calculation Module
 *
 * Calculates shunt resistance, modulation resistance, and span for a
 * simultaneous span bridge at three temperature points.
 *
 * @module simspan
 */

/**
 * Input parameters for simultaneous span calculation
 */
export interface SimultaneousSpanInput {
  /** Low temperature span in mV (-10 to 10) */
  lowSpan: number;
  /** Low temperature bridge resistance in Ohms (50-10000) */
  lowRBridge: number;
  /** Low temperature modulation resistance in Ohms (0.001-1000) */
  lowRMod: number;

  /** Ambient temperature span in mV (-10 to 10) */
  ambientSpan: number;
  /** Ambient temperature bridge resistance in Ohms (50-10000) */
  ambientRBridge: number;
  /** Ambient temperature modulation resistance in Ohms (0.001-1000) */
  ambientRMod: number;

  /** High temperature span in mV (-10 to 10) */
  highSpan: number;
  /** High temperature bridge resistance in Ohms (50-10000) */
  highRBridge: number;
  /** High temperature modulation resistance in Ohms (0.001-1000) */
  highRMod: number;

  /** Desired span output in mV */
  desiredSpan: number;
}

/**
 * Result of simultaneous span calculation
 */
export interface SimultaneousSpanResult {
  /** Shunt resistance in Ohms */
  rShunt: number;
  /** Modulation resistance in Ohms */
  rMod: number;
  /** Resulting span in mV */
  span: number;
  /** Whether calculation was successful */
  success: boolean;
  /** Error message if calculation failed */
  error?: string;
}

/**
 * Validate input parameters for simultaneous span calculation
 *
 * @param input - Input parameters
 * @returns Validation result with error message if invalid
 */
function validateInput(input: SimultaneousSpanInput): {
  valid: boolean;
  error?: string;
} {
  const {
    lowSpan,
    lowRBridge,
    lowRMod,
    ambientSpan,
    ambientRBridge,
    ambientRMod,
    highSpan,
    highRBridge,
    highRMod,
    desiredSpan,
  } = input;

  const MINSPAN = -10;
  const MAXSPAN = 10;
  const MINRBRIDGE = 50;
  const MAXRBRIDGE = 10000;
  const MINRMOD = 0.001;
  const MAXRMOD = 1000;

  // Check low span
  if (lowSpan < MINSPAN || lowSpan > MAXSPAN) {
    return { valid: false, error: `Low span must be between ${MINSPAN} and ${MAXSPAN} mV` };
  }

  // Check low RBridge
  if (lowRBridge < MINRBRIDGE || lowRBridge > MAXRBRIDGE) {
    return { valid: false, error: `Low RBridge must be between ${MINRBRIDGE} and ${MAXRBRIDGE} Ohms` };
  }

  // Check low RMod
  if (lowRMod < MINRMOD || lowRMod > MAXRMOD) {
    return { valid: false, error: `Low RMod must be between ${MINRMOD} and ${MAXRMOD} Ohms` };
  }

  // Check ambient span
  if (ambientSpan < MINSPAN || ambientSpan > MAXSPAN) {
    return { valid: false, error: `Ambient span must be between ${MINSPAN} and ${MAXSPAN} mV` };
  }

  // Check ambient RBridge
  if (ambientRBridge < MINRBRIDGE || ambientRBridge > MAXRBRIDGE) {
    return { valid: false, error: `Ambient RBridge must be between ${MINRBRIDGE} and ${MAXRBRIDGE} Ohms` };
  }

  // Check ambient RMod
  if (ambientRMod < MINRMOD || ambientRMod > MAXRMOD) {
    return { valid: false, error: `Ambient RMod must be between ${MINRMOD} and ${MAXRMOD} Ohms` };
  }

  // Check high span
  if (highSpan < MINSPAN || highSpan > MAXSPAN) {
    return { valid: false, error: `High span must be between ${MINSPAN} and ${MAXSPAN} mV` };
  }

  // Check high RBridge
  if (highRBridge < MINRBRIDGE || highRBridge > MAXRBRIDGE) {
    return { valid: false, error: `High RBridge must be between ${MINRBRIDGE} and ${MAXRBRIDGE} Ohms` };
  }

  // Check high RMod
  if (highRMod < MINRMOD || highRMod > MAXRMOD) {
    return { valid: false, error: `High RMod must be between ${MINRMOD} and ${MAXRMOD} Ohms` };
  }

  // Span ordering: LowSpan < AmbientSpan < HighSpan
  if (lowSpan >= ambientSpan) {
    return { valid: false, error: 'Low span must be less than ambient span' };
  }

  if (ambientSpan >= highSpan) {
    return { valid: false, error: 'Ambient span must be less than high span' };
  }

  // Desired span ordering: Must be less than all other spans
  if (desiredSpan >= lowSpan) {
    return { valid: false, error: 'Desired span must be less than low span' };
  }

  if (desiredSpan >= ambientSpan) {
    return { valid: false, error: 'Desired span must be less than ambient span' };
  }

  if (desiredSpan >= highSpan) {
    return { valid: false, error: 'Desired span must be less than high span' };
  }

  return { valid: true };
}

/**
 * Calculate simultaneous span compensation using 3-point calibration
 *
 * Solves the simultaneous span equations to determine the shunt resistance,
 * modulation resistance, and resulting span that will give the desired span
 * output at three different temperature points.
 *
 * @param input - Input parameters with 3-point calibration data
 * @returns Calculation result with shunt, modulation resistance, and span
 *
 * @example
 * const result = calculateSimultaneousSpan({
 *   lowSpan: 1.5,
 *   lowRBridge: 1000,
 *   lowRMod: 100,
 *   ambientSpan: 5.0,
 *   ambientRBridge: 1000,
 *   ambientRMod: 100,
 *   highSpan: 8.5,
 *   highRBridge: 1000,
 *   highRMod: 100,
 *   desiredSpan: 0.0
 * });
 */
export function calculateSimultaneousSpan(
  input: SimultaneousSpanInput
): SimultaneousSpanResult {
  // Validate input
  const validation = validateInput(input);
  if (!validation.valid) {
    return {
      rShunt: 0,
      rMod: 0,
      span: 0,
      success: false,
      error: validation.error,
    };
  }

  const {
    lowSpan: E0,
    lowRBridge: Rb0,
    lowRMod: Rn0,
    ambientSpan: E1,
    ambientRBridge: Rb1,
    ambientRMod: Rn1,
    highSpan: E2,
    highRBridge: Rb2,
    highRMod: Rn2,
    desiredSpan: Q,
  } = input;

  try {
    // Pre-calculate ratios
    const Rn1Rn0 = Rn1 / Rn0;
    const Rn1Rn2 = Rn1 / Rn2;

    // T0
    const T0 = Rb2 * (E2 - Q) - Rb0 * (E0 - Q);

    if (T0 === 0) {
      return {
        rShunt: 0,
        rMod: 0,
        span: 0,
        success: false,
        error: 'Compensation not practicable: T0 equals zero',
      };
    }

    // Z
    const Z = (Rb1 * (E1 - Q) - Rb0 * (E0 - Q)) / T0;

    // T1
    const T1 = Z * (Rn1Rn0 - Rn1Rn2);

    // T2
    const T2 = Rn1Rn2 * (Rn1Rn0 - 1);

    if (T1 - T2 === 0) {
      return {
        rShunt: 0,
        rMod: 0,
        span: 0,
        success: false,
        error: 'Compensation not practicable: T1 - T2 equals zero',
      };
    }

    // RsRn1
    const RsRn1 = (Rn1Rn0 - T1 - 1) / (T1 - T2);

    // T3
    const T3 = Rb1 * (E1 - Q) - Rb0 * (E0 - Q);

    // T4
    const T4 = RsRn1 * (1 + Rn1Rn0);

    // T5
    const T5 = RsRn1 * RsRn1 * Rn1Rn0;

    // T6
    const T6 = Q * RsRn1 * (Rn1Rn0 - 1);

    // Shunt
    const Shunt = (T3 * (1 + T4 + T5)) / T6;

    if (Shunt < 0) {
      return {
        rShunt: 0,
        rMod: 0,
        span: 0,
        success: false,
        error: 'Compensation not practicable: Shunt resistance is negative',
      };
    }

    // RMod
    const RMod1 = Shunt / RsRn1;

    if (RMod1 < 0) {
      return {
        rShunt: 0,
        rMod: 0,
        span: 0,
        success: false,
        error: 'Compensation not practicable: Modulation resistance is negative',
      };
    }

    // Span
    const Span1 = (Rb0 * (E0 - Q) / Q) - (Shunt / (1 + RsRn1 * Rn1Rn0));

    return {
      rShunt: Shunt,
      rMod: RMod1,
      span: Span1,
      success: true,
    };
  } catch (error) {
    return {
      rShunt: 0,
      rMod: 0,
      span: 0,
      success: false,
      error: `Calculation error: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}
