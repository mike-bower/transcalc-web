/**
 * Dual Bending Beam Calculator - TypeScript Port
 *
 * Calculates strain for a dual bending beam configuration with four strain measurement points.
 * The dual beam uses four strain gages positioned symmetrically in bending to measure
 * strain at four distinct locations on the beam.
 *
 * Units:
 * - All inputs automatically normalized to SI (Pa for modulus, m for dimensions, N for force)
 * - Outputs: strain in microstrains (μ-strain), gradient in %, sensitivity in mV/V
 *
 * Formulas for each gage position:
 * FirstTerm = F / (E * W)
 * ThirdTerm = 3 * ((±GageDist/2) ± (Length/2)) / T²
 *
 * For each strain base (A, B, C, D):
 * Min/Max/Avg are calculated directly from geometry
 * StrainA(x) = FirstTerm * (-ThirdTerm) * 10^6
 * StrainC(x) = -(FirstTerm * (-ThirdTerm)) * 10^6
 * 
 * Gradient = (MaxStrain - MinStrain) / MaxStrain * 100
 * Sensitivity = AvgStrain * GF * 10^-3
 *
 * @module dualbeam
 */

/**
 * Input parameters for dual bending beam calculation
 */
export interface DualbeamInput {
  /** Applied axial load (N or lbf) */
  appliedLoad: number;
  /** Beam width (m or in) */
  beamWidth: number;
  /** Beam thickness (m or in) */
  thickness: number;
  /** Distance between gage centers (m or in) */
  distanceBetweenGages: number;
  /** Distance from load to beam center line (m or in) - typically 0 */
  distanceLoadToCL: number;
  /** Young's Modulus (Pa or PSI) */
  modulus: number;
  /** Gage length - measurement span (m or in) */
  gageLength: number;
  /** Gage factor (unitless) */
  gageFactor: number;
}

/**
 * Output results from dual bending beam calculation
 */
export interface DualbeamOutput {
  /** Strain at position A in microstrains */
  strainA: number;
  /** Strain at position B in microstrains */
  strainB: number;
  /** Strain at position C in microstrains */
  strainC: number;
  /** Strain at position D in microstrains */
  strainD: number;
  /** Average strain across all four gages */
  avgStrain: number;
  /** Strain gradient as percentage */
  gradient: number;
  /** Full-bridge sensitivity in mV/V */
  fullSpanSensitivity: number;
}

/**
 * Validates input geometry constraints for dual bending beam
 * Throws error if constraints violated
 *
 * @param params - Input parameters to validate
 * @throws Error if constraints violated
 */
function validateDualbeamGeometry(params: DualbeamInput): void {
  const { distanceBetweenGages, thickness, modulus, gageLength, beamWidth } = params;

  // Check: Thickness > 0
  if (thickness <= 0) {
    throw new Error(`Beam thickness ${thickness} must be > 0`);
  }

  // Check: Distance between gages is valid
  if (distanceBetweenGages / 2 <= 0) {
    throw new Error(`Distance between gages / 2 must be > 0`);
  }

  // Check: Gage length is valid
  if (gageLength <= 0) {
    throw new Error(`Gage length ${gageLength} must be > 0`);
  }

  // Check: Beam width is valid
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
function normalizeToSI(params: DualbeamInput): DualbeamInput {
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
    distanceLoadToCL: params.distanceLoadToCL * dimensionMultiplier,
    modulus: modulusInPa,
    gageLength: params.gageLength * dimensionMultiplier,
    gageFactor: params.gageFactor,
  };
}

/**
 * Main calculation function for dual bending beam strain
 *
 * Algorithm:
 * 1. Normalize inputs to SI units
 * 2. Validate geometry constraints
 * 3. Calculate frame factor FirstTerm = F / (E * W)
 * 4. Calculate strain at 4 gage positions using direct formulas
 * 5. Compute average, gradient, and sensitivity metrics
 *
 * @param params - Input parameters
 * @returns Strain at 4 positions plus aggregate metrics
 * @throws Error if geometry constraints violated
 */
export function calculateDualbeamStrain(params: DualbeamInput): DualbeamOutput {
  const normalized = normalizeToSI(params);
  validateDualbeamGeometry(normalized);

  const {
    appliedLoad: F,
    beamWidth: W,
    thickness: T,
    distanceBetweenGages: L_d,
    gageLength: L_g,
    modulus: E,
    gageFactor: GF,
  } = normalized;

  // Calculate base term factor
  const firstTerm = F / (E * W);

  // Calculate third term variants for each gage position
  // ThirdTerm = 3 * ((±L_d/2) ± (L_g/2)) / T²
  const thirdTermA = (3 * (-L_d / 2 + L_g / 2)) / Math.pow(T, 2);
  const thirdTermB = (3 * (L_d / 2 - L_g / 2)) / Math.pow(T, 2);
  const thirdTermC = (3 * (-L_d / 2 + L_g / 2)) / Math.pow(T, 2);
  const thirdTermD = (3 * (L_d / 2 - L_g / 2)) / Math.pow(T, 2);

  // Calculate strain at each position: Strain = FirstTerm * (-ThirdTerm) * 1E6
  const strainA = (firstTerm * -thirdTermA) * 1e6;
  const strainB = (firstTerm * -thirdTermB) * 1e6;
  const strainC = -(firstTerm * -thirdTermC) * 1e6; // Negated
  const strainD = -(firstTerm * -thirdTermD) * 1e6; // Negated

  // Calculate aggregate metrics
  const strainValues = [strainA, strainB, strainC, strainD];
  const avgStrain = Math.abs(
    (Math.abs(strainA) + Math.abs(strainB) + Math.abs(strainC) + Math.abs(strainD)) / 4
  );

  const maxStrain = Math.max(...strainValues.map((s) => Math.abs(s)));
  const minStrain = Math.min(...strainValues.map((s) => Math.abs(s)));

  const gradient = maxStrain > 0 ? ((maxStrain - minStrain) / maxStrain) * 100 : 0;
  const fullSpanSensitivity = avgStrain * GF * 1e-3;

  return {
    strainA,
    strainB,
    strainC,
    strainD,
    avgStrain,
    gradient,
    fullSpanSensitivity,
  };
}

