/**
 * Reverse Bending Beam Calculator - TypeScript Port
 *
 * Calculates strain for a reverse bending beam configuration.
 * The reverse beam measures bending strain at locations equidistant from gage center,
 * with the strain varying linearly across the gage length.
 *
 * Units:
 * - All inputs automatically normalized to SI (Pa for modulus, m for dimensions, N for force)
 * - Outputs: strain in microstrains (μ-strain), gradient in %, sensitivity in mV/V
 *
 * Formulas:
 * MinStrain = 6 * F * ((D/2) - (L/2)) / (E * W * T²) * 10^6
 * MaxStrain = 6 * F * ((D/2) + (L/2)) / (E * W * T²) * 10^6
 * AvgStrain = 6 * F * (D/2) / (E * W * T²) * 10^6
 *
 * where F = load, D = distance between gages, L = gage length
 *       E = modulus, W = width, T = thickness
 *
 * Gradient = (MaxStrain - MinStrain) / MaxStrain * 100
 * Sensitivity = AvgStrain * GF * 10^-3
 *
 * @module reversebeam
 */

/**
 * Input parameters for reverse bending beam calculation
 */
export interface ReversebeamInput {
  /** Applied axial load (N or lbf) */
  appliedLoad: number;
  /** Beam width (m or in) */
  beamWidth: number;
  /** Beam thickness (m or in) */
  thickness: number;
  /** Distance between gage centers (m or in) */
  distanceBetweenGages: number;
  /** Young's Modulus (Pa or PSI) */
  modulus: number;
  /** Gage length - measurement span (m or in) */
  gageLength: number;
  /** Gage factor (unitless) */
  gageFactor: number;
}

/**
 * Output results from reverse bending beam calculation
 */
export interface ReversebeamOutput {
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
 * Validates input geometry constraints for reverse bending beam
 * Throws error if constraints violated
 *
 * @param params - Input parameters to validate
 * @throws Error if constraints violated
 */
function validateReversebeamGeometry(params: ReversebeamInput): void {
  const { thickness, distanceBetweenGages, gageLength, beamWidth } = params;

  // Check: Thickness > 0
  if (thickness <= 0) {
    throw new Error(`Beam thickness ${thickness} must be > 0`);
  }

  // Check: Distance between gages > 0
  if (distanceBetweenGages <= 0) {
    throw new Error(`Distance between gages ${distanceBetweenGages} must be > 0`);
  }

  // Check: Gage length > 0
  if (gageLength <= 0) {
    throw new Error(`Gage length ${gageLength} must be > 0`);
  }

  // Check: Beam width > 0
  if (beamWidth <= 0) {
    throw new Error(`Beam width ${beamWidth} must be > 0`);
  }

  // Check: Gage length should not exceed distance between gages
  if (gageLength > distanceBetweenGages) {
    throw new Error(
      `Gage length ${gageLength} should not exceed distance between gages ${distanceBetweenGages}`
    );
  }
}

/**
 * Converts input values to SI units (m, Pa, N) based on magnitude detection
 *
 * @param params - Input parameters (may be in US or SI units)
 * @returns Parameters normalized to SI units
 */
function normalizeToSI(params: ReversebeamInput): ReversebeamInput {
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
    beamWidth: params.beamWidth * dimensionMultiplier,
    thickness: params.thickness * dimensionMultiplier,
    distanceBetweenGages: params.distanceBetweenGages * dimensionMultiplier,
    modulus: modulusInPa,
    gageLength: params.gageLength * dimensionMultiplier,
    gageFactor: params.gageFactor,
  };
}

/**
 * Main calculation function for reverse bending beam strain
 *
 * Algorithm:
 * 1. Normalize inputs to SI units
 * 2. Validate geometry constraints
 * 3. Calculate strains at min/max/avg positions using direct formulas
 * 4. Calculate gradient and sensitivity
 *
 * @param params - Input parameters
 * @returns Strain min/max/avg plus gradient and sensitivity
 * @throws Error if geometry constraints violated
 */
export function calculateReversebeamStrain(params: ReversebeamInput): ReversebeamOutput {
  const normalized = normalizeToSI(params);
  validateReversebeamGeometry(normalized);

  const {
    appliedLoad: F,
    beamWidth: W,
    thickness: T,
    distanceBetweenGages: D,
    gageLength: L,
    modulus: E,
    gageFactor: GF,
  } = normalized;

  // Calculate strain at three key positions
  // Numerator: 6 * F * (term)
  // Denominator: E * W * T²

  const denominator = E * W * Math.pow(T, 2);

  // Min Strain: at distance - (gage length / 2)
  const minStrain = ((6 * F * (D / 2 - L / 2)) / denominator) * 1e6;

  // Max Strain: at distance + (gage length / 2)
  const maxStrain = ((6 * F * (D / 2 + L / 2)) / denominator) * 1e6;

  // Average Strain: at center of gage distance
  const avgStrain = ((6 * F * (D / 2)) / denominator) * 1e6;

  // Calculate gradient and sensitivity
  const gradient = maxStrain !== 0 ? ((maxStrain - minStrain) / maxStrain) * 100 : 0;
  const fullSpanSensitivity = avgStrain * GF * 1e-3;

  return {
    minStrain,
    maxStrain,
    avgStrain,
    gradient,
    fullSpanSensitivity,
  };
}

export { ReversebeamInput, ReversebeamOutput };
