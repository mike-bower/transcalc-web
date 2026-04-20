/**
 * S-Beam Bending Calculator - TypeScript Port
 *
 * Calculates strain for an S-shaped bending beam configuration with a hole.
 * The S-beam uses iterative calculation over the gage range to measure
 * strain variations across the curved beam geometry.
 *
 * Units:
 * - All inputs automatically normalized to SI (Pa for modulus, m for dimensions, N for force)
 * - Outputs: strain in microstrains (μ-strain), gradient in %, sensitivity in mV/V
 *
 * Formulas:
 * For each position X along gage range:
 * K1 = R * sin((X * 360) / (π * 2 * R) * π / 180)
 * K2 = (T + R - sqrt(R² - K1²))²
 * FirstTerm = 6 * (F / 2) * K1
 * SecondTerm = E * W * K2
 * StrainX = (FirstTerm / SecondTerm) * 10^6
 *
 * Collect Min/Max/Avg across gage length
 * Gradient = (MaxStrain - MinStrain) / AvgStrain * 100
 * Sensitivity = AvgStrain * GF * 10^-3
 *
 * @module sbeam
 */

/**
 * Input parameters for S-beam bending calculation
 */
export interface SbeamInput {
  /** Applied axial load (N or lbf) */
  appliedLoad: number;
  /** Hole radius (m or in) */
  holeRadius: number;
  /** Beam width (m or in) */
  beamWidth: number;
  /** Beam thickness (m or in) */
  thickness: number;
  /** Distance between gage positions (m or in) */
  distanceBetweenGages: number;
  /** Young's Modulus (Pa or PSI) */
  modulus: number;
  /** Gage length - measurement span (m or in) */
  gageLength: number;
  /** Gage factor (unitless) */
  gageFactor: number;
}

/**
 * Output results from S-beam bending calculation
 */
export interface SbeamOutput {
  /** Minimum strain in microstrains */
  minStrain: number;
  /** Maximum strain in microstrains */
  maxStrain: number;
  /** Average strain in microstrains */
  avgStrain: number;
  /** Strain gradient as percentage */
  gradient: number;
  /** Full-bridge sensitivity in mV/V */
  fullSpanSensitivity: number;
}

/**
 * Validates input geometry constraints for S-beam
 * Throws error if constraints violated
 *
 * @param params - Input parameters to validate
 * @throws Error if constraints violated
 */
function validateSbeamGeometry(params: SbeamInput): void {
  const { thickness, holeRadius, gageLength, beamWidth } = params;

  // Check: Thickness > 0
  if (thickness <= 0) {
    throw new Error(`Beam thickness ${thickness} must be > 0`);
  }

  // Check: Hole radius > 0
  if (holeRadius <= 0) {
    throw new Error(`Hole radius ${holeRadius} must be > 0`);
  }

  // Check: Hole radius <= thickness
  if (holeRadius > thickness) {
    throw new Error(
      `Hole radius ${holeRadius} cannot exceed beam thickness ${thickness}`
    );
  }

  // Check: Gage length > 0
  if (gageLength <= 0) {
    throw new Error(`Gage length ${gageLength} must be > 0`);
  }

  // Check: Beam width > 0
  if (beamWidth <= 0) {
    throw new Error(`Beam width ${beamWidth} must be > 0`);
  }
}

/**
 * Converts input values to SI units (m, Pa, N) based on magnitude detection
 *
 * @param params - Input parameters (may be in US or SI units)
 * @returns Parameters normalized to SI units
 */
function normalizeToSI(params: SbeamInput): SbeamInput {
  // Detect if modulus is in PSI or Pa
  const modulusIsSI = params.modulus > 1e7; // > 10 MPa indicates Pa
  const modulusInPa = modulusIsSI ? params.modulus : params.modulus * 6894.75; // PSI to Pa

  // Detect if load is in lbf or N
  const loadIsSI = params.appliedLoad > 4000; // > 4 kN indicates N
  const loadInN = loadIsSI ? params.appliedLoad : params.appliedLoad * 4.448222;

  // Dimensions: if > 10, likely mm; if < 10, likely inches
  const dimensionsAreMM = params.beamWidth > 10;
  const dimensionMultiplier = dimensionsAreMM ? 0.001 : 0.0254; // mm to m or in to m

  return {
    appliedLoad: loadInN,
    holeRadius: params.holeRadius * dimensionMultiplier,
    beamWidth: params.beamWidth * dimensionMultiplier,
    thickness: params.thickness * dimensionMultiplier,
    distanceBetweenGages: params.distanceBetweenGages * dimensionMultiplier,
    modulus: modulusInPa,
    gageLength: params.gageLength * dimensionMultiplier,
    gageFactor: params.gageFactor,
  };
}

/**
 * Main calculation function for S-beam bending strain
 *
 * Algorithm:
 * 1. Normalize inputs to SI units
 * 2. Validate geometry constraints
 * 3. Iterate across gage range calculating strain at each position
 * 4. Collect min/max/avg statistics
 * 5. Calculate gradient and sensitivity
 *
 * @param params - Input parameters
 * @returns Strain min/max/avg plus gradient and sensitivity
 * @throws Error if geometry constraints violated
 */
export function calculateSbeamStrain(params: SbeamInput): SbeamOutput {
  const normalized = normalizeToSI(params);
  validateSbeamGeometry(normalized);

  const {
    appliedLoad: F,
    holeRadius: R,
    beamWidth: W,
    thickness: T,
    distanceBetweenGages: D,
    gageLength: L,
    modulus: E,
    gageFactor: GF,
  } = normalized;

  // Initialize iteration range
  const xMinValue = D / 2 - L / 2;
  const xMaxValue = D / 2 + L / 2;
  const iterations = 500;
  const increment = (xMaxValue - xMinValue) / iterations;

  let minStrain = 0;
  let maxStrain = 0;
  let avgStrainSum = 0;
  let iterationCount = 0;
  let currentX = xMinValue;

  const PI = Math.PI;

  // Iterate over gage range to calculate strain at each position
  for (let i = 0; i <= iterations; i++) {
    // K1 = R * sin((X * 360) / (π * 2 * R) * π / 180)
    // Simplify: sin(degrees) = sin(radians * 180/π)
    const angleRadians = (currentX * PI) / (PI * 2 * R);
    const k1 = R * Math.sin(angleRadians);

    // K2 = (T + R - sqrt(R² - K1²))²
    const sqrtTerm = Math.sqrt(Math.pow(R, 2) - Math.pow(k1, 2));
    const k2 = Math.pow(T + R - sqrtTerm, 2);

    // FirstTerm = 6 * (F / 2) * K1
    const firstTerm = 6 * (F / 2) * k1;

    // SecondTerm = E * W * K2
    const secondTerm = E * W * k2;

    // StrainResult = (FirstTerm / SecondTerm) * 1E6
    const strain = (firstTerm / secondTerm) * 1e6;

    // Track min/max/sum
    if (i === 0 || strain > maxStrain) {
      maxStrain = strain;
    }
    if (i === 0 || strain < minStrain) {
      minStrain = strain;
    }

    avgStrainSum += strain;
    iterationCount++;
    currentX += increment;
  }

  const avgStrain = avgStrainSum / iterationCount;

  // Calculate gradient and sensitivity
  const gradient = avgStrain !== 0 ? ((maxStrain - minStrain) / avgStrain) * 100 : 0;
  const fullSpanSensitivity = avgStrain * GF * 1e-3;

  return {
    minStrain,
    maxStrain,
    avgStrain,
    gradient,
    fullSpanSensitivity,
  };
}

