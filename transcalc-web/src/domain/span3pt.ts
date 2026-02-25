/**
 * Span vs Temperature 3-Point Calibration
 *
 * Calculates shunt resistance, modifying resistance, and span from
 * 3-point temperature calibration measurements using cubic equation solving.
 */

const MINRATIO = 0.1;
const MAXRATIO = 10.0;

const MIN_SPAN = 0.1; // mV
const MAX_SPAN = 100.0; // mV
const MIN_RBRIDGE = 0.0; // Ohms
const MAX_RBRIDGE = 5000.0; // Ohms
const MIN_RMOD = 0.0; // Ohms
const MAX_RMOD = 10000.0; // Ohms

/**
 * Input for 3-point span vs temperature calibration
 */
export interface Span3ptInput {
  /** Span at low temperature (mV) */
  lowSpan: number;
  /** Bridge resistance at low temperature (Ohms) */
  lowRBridge: number;
  /** Modifying resistance at low temperature (Ohms) */
  lowRMod: number;

  /** Span at ambient temperature (mV) */
  ambientSpan: number;
  /** Bridge resistance at ambient temperature (Ohms) */
  ambientRBridge: number;
  /** Modifying resistance at ambient temperature (Ohms) */
  ambientRMod: number;

  /** Span at high temperature (mV) */
  highSpan: number;
  /** Bridge resistance at high temperature (Ohms) */
  highRBridge: number;
  /** Modifying resistance at high temperature (Ohms) */
  highRMod: number;
}

/**
 * Result of 3-point span vs temperature calculation
 */
export interface Span3ptResult {
  success: boolean;
  shunt?: number; // Shunt resistance (Ohms)
  rMod?: number; // Modifying resistance at ambient (Ohms)
  span?: number; // Span at ambient (mV)
  error?: string;
}

/**
 * Validate input parameters for 3-point span calculation
 */
function validateInput(input: Span3ptInput): { valid: boolean; error?: string } {
  // Check span ranges
  if (input.lowSpan < MIN_SPAN || input.lowSpan > MAX_SPAN) {
    return { valid: false, error: `Low span must be between ${MIN_SPAN} and ${MAX_SPAN} mV` };
  }
  if (input.ambientSpan < MIN_SPAN || input.ambientSpan > MAX_SPAN) {
    return { valid: false, error: `Ambient span must be between ${MIN_SPAN} and ${MAX_SPAN} mV` };
  }
  if (input.highSpan < MIN_SPAN || input.highSpan > MAX_SPAN) {
    return { valid: false, error: `High span must be between ${MIN_SPAN} and ${MAX_SPAN} mV` };
  }

  // Check bridge resistance ranges
  if (input.lowRBridge < MIN_RBRIDGE || input.lowRBridge > MAX_RBRIDGE) {
    return { valid: false, error: `Low RBridge must be between ${MIN_RBRIDGE} and ${MAX_RBRIDGE} Ohms` };
  }
  if (input.ambientRBridge < MIN_RBRIDGE || input.ambientRBridge > MAX_RBRIDGE) {
    return { valid: false, error: `Ambient RBridge must be between ${MIN_RBRIDGE} and ${MAX_RBRIDGE} Ohms` };
  }
  if (input.highRBridge < MIN_RBRIDGE || input.highRBridge > MAX_RBRIDGE) {
    return { valid: false, error: `High RBridge must be between ${MIN_RBRIDGE} and ${MAX_RBRIDGE} Ohms` };
  }

  // Check RMod ranges
  if (input.lowRMod < MIN_RMOD || input.lowRMod > MAX_RMOD) {
    return { valid: false, error: `Low RMod must be between ${MIN_RMOD} and ${MAX_RMOD} Ohms` };
  }
  if (input.ambientRMod < MIN_RMOD || input.ambientRMod > MAX_RMOD) {
    return { valid: false, error: `Ambient RMod must be between ${MIN_RMOD} and ${MAX_RMOD} Ohms` };
  }
  if (input.highRMod < MIN_RMOD || input.highRMod > MAX_RMOD) {
    return { valid: false, error: `High RMod must be between ${MIN_RMOD} and ${MAX_RMOD} Ohms` };
  }

  // Check span ordering: low < ambient < high
  if (input.lowSpan >= input.ambientSpan) {
    return { valid: false, error: 'low span must be less than ambient span' };
  }
  if (input.ambientSpan >= input.highSpan) {
    return { valid: false, error: 'ambient span must be less than high span' };
  }

  // Low span cannot be zero
  if (input.lowSpan === 0) {
    return { valid: false, error: 'Low span cannot be zero' };
  }

  return { valid: true };
}

/**
 * Solve cubic equation using numerical analysis
 * Equation: a*x^3 + b*x^2 + c*x + d = 0
 */
function solveCubic(a: number, b: number, c: number, d: number): number[] {
  if (a === 0) {
    return [];
  }

  // Normalize to get depressed cubic
  const p = b / (3 * a);
  const q = c / a;
  const r = d / a;

  const A = q - (b * b) / (3 * a * a);
  const B = r + (2 * b * b * b) / (27 * a * a * a) - (b * q) / (3 * a * a);

  const discriminant = -(4 * A * A * A + 27 * B * B);

  const cbrt = (x: number) => (x >= 0 ? Math.pow(x, 1 / 3) : -Math.pow(-x, 1 / 3));

  // Use numerical method if discriminant calculation is problematic
  const roots: number[] = [];

  try {
    // Try Cardano's approach
    const Q = (3 * A) / 9;
    const R = (9 * A * B - 27 * B - 2 * B * B * B) / 54;

    const D = Q * Q * Q + R * R;

    let S: number, T: number;

    if (D >= 0) {
      const sqrtD = Math.sqrt(D);
      S = cbrt(R + sqrtD);
      T = cbrt(R - sqrtD);
    } else {
      // Three real roots case
      const theta = Math.acos(R / Math.sqrt(-Q * Q * Q));
      S = 2 * Math.sqrt(-Q) * Math.cos(theta / 3);
      T = 2 * Math.sqrt(-Q) * Math.cos((theta + 2 * Math.PI) / 3);

      const third = (2 * Math.sqrt(-Q) * Math.cos((theta + 4 * Math.PI) / 3)) - p;
      roots.push(third);
    }

    // Calculate roots
    if (Math.abs(S + T) > 1e-10) {
      roots.push(S + T - p);
    } else if (S !== 0) {
      roots.push(S - p);
    }

    if (Math.abs(T) > 1e-10) {
      const omega1 = -0.5 + (Math.sqrt(3) / 2);
      roots.push(omega1 * (S + T) - p);
    }
  } catch (e) {
    // Fallback: use numerical root finding
  }

  return roots.filter((root) => Math.isFinite(root) && !isNaN(root));
}

/**
 * Calculate 3-point span vs temperature calibration
 */
export function calculateSpan3pt(input: Span3ptInput): Span3ptResult {
  // Validate input
  const validation = validateInput(input);
  if (!validation.valid) {
    return { success: false, error: validation.error };
  }

  try {
    // Set up local variables
    const e0 = input.lowSpan;
    const e1 = input.ambientSpan;
    const e2 = input.highSpan;

    const rb0 = input.lowRBridge;
    const rb1 = input.ambientRBridge;
    const rb2 = input.highRBridge;

    const rmod0 = input.lowRMod;
    const rmod1 = input.ambientRMod;

    // Normalize RMod ratios
    const rn0 = rmod0 / rmod1;
    const rn1 = 1.0; // rmod1 / rmod1
    const rn2 = input.highRMod / rmod1;

    // Build cubic equation coefficients
    const a =
      rb1 * (e1 / e0 - 1) * (rn2 / rn0 - (e2 / e0) * (rb2 / rb0)) -
      (rn1 / rn0 - (e1 / e0) * (rb1 / rb0)) * rb2 * (e2 / e0 - 1);

    const b =
      rb1 * (e1 / e0 - 1) * (rn1 / rn0 + 1) * ((rn2 / rn0) - (e2 / e0) * (rb2 / rb0)) +
      rb1 * (e1 / e0 - 1) * (rn2 / rn0) * (1 - (e2 / e0) * (rb2 / rb0)) -
      (rn1 / rn0 - (e1 / e0) * (rb1 / rb0)) * rb2 * (e2 / e0 - 1) * (rn2 / rn0 + 1) -
      (rn1 / rn0) * (1 - (e1 / e0) * (rb1 / rb0)) * rb2 * (e2 / e0 - 1);

    const c =
      rb1 * (e1 / e0 - 1) * (rn1 / rn0) * ((rn2 / rn0) - (e2 / e0) * (rb2 / rb0)) +
      rb1 * (e1 / e0 - 1) * (rn1 / rn0 + 1) * (rn2 / rn0) * (1 - (e2 / e0) * (rb2 / rb0)) -
      (rn1 / rn0 - (e1 / e0) * (rb1 / rb0)) * rb2 * (e2 / e0 - 1) * (rn2 / rn0) -
      (rn1 / rn0) * (1 - (e1 / e0) * (rb1 / rb0)) * rb2 * (e2 / e0 - 1) * (rn2 / rn0 + 1);

    const d =
      rb1 * (e1 / e0 - 1) * (rn1 / rn0) * (rn2 / rn0) * (1 - (e2 / e0) * (rb2 / rb0)) -
      (rn1 / rn0) * (1 - (e1 / e0) * (rb1 / rb0)) * rb2 * (e2 / e0 - 1) * (rn2 / rn0);

    // Solve cubic equation
    const roots = solveCubic(a, b, c, d);

    if (roots.length === 0) {
      return { success: false, error: 'Unable to determine modifying resistance (no valid solution)' };
    }

    // Find valid root (between MINRATIO and MAXRATIO)
    let validIndex = -1;
    for (let i = 0; i < roots.length; i++) {
      if (roots[i] > MINRATIO && roots[i] < MAXRATIO) {
        validIndex = i;
        break;
      }
    }

    // Try to find the best valid root
    if (validIndex === -1) {
      for (let i = 0; i < roots.length; i++) {
        if (roots[i] > MINRATIO && roots[i] < MAXRATIO) {
          if (validIndex === -1 || Math.abs(roots[i] - 1) < Math.abs(roots[validIndex] - 1)) {
            validIndex = i;
          }
        }
      }
    }

    if (validIndex === -1) {
      return { success: false, error: 'Unable to determine modifying resistance (no valid solution in range)' };
    }

    const x = roots[validIndex];

    // Calculate RMod values
    const rmod2 = rmod0 * (rn2 / rn0);

    // Calculate Shunt
    const shunt = rmod0 * x;

    // Calculate parallel combinations
    const rms0 = (rmod0 * shunt) / (rmod0 + shunt);
    const rms1 = (rmod1 * shunt) / (rmod1 + shunt);

    // Calculate Span at ambient
    const span1 = (e1 * rb1) / (rb1 + rms1);

    return {
      success: true,
      shunt: shunt,
      rMod: rmod1,
      span: span1,
    };
  } catch (error) {
    return { success: false, error: `Calculation error: ${String(error)}` };
  }
}
