/**
 * Binocular Beam Calculator - TypeScript Port
 *
 * Calculates strain, gradient, and sensitivity for a binocular beam bending configuration.
 * The binocular beam uses two strain gages positioned at equal distances from the neutral axis
 * to measure bending strain across a circular hole in the beam.
 *
 * Units:
 * - All inputs automatically normalized to SI (Pa for modulus, m for dimensions, N for force)
 * - Outputs: strain in microstrains (μ-strain), gradient in %, sensitivity in mV/V
 *
 * Formulas:
 * K1 = L_hd / (H - ((H - 2r - 2g) / 2))  where L_hd is load-hole distance (set to 0)
 * K2 = (H / 2) - g  where g = (H/2) - (r + t_min)
 * g = (H / 2) - (r + t_min)  (beam hole distance)
 *
 * For each position X along gage length:
 * FirstTerm = F / (E * W)
 * SecondTerm = K1 / (K2 - sqrt(r² - X²))
 * ThirdTerm = 3 * ((L_d/2) + X) / (K2 - sqrt(r² - X²))²
 * StrainA(X) = (FirstTerm * (SecondTerm + ThirdTerm)) * 10^6  (in microstrains)
 *
 * Gradient = (MaxStrain - MinStrain) / MaxStrain * 100  (in %)
 * Sensitivity = AvgStrain * GF * 10^-3  (in mV/V)
 *
 * @module binobeam
 */

/**
 * Input parameters for binocular beam calculation
 */
export interface BinobeamInput {
  /** Applied axial load (Pa or PSI) */
  appliedLoad: number;
  /** Distance between gage centers (m or in) */
  distanceBetweenHoles: number;
  /** Radius of circular hole (m or in) */
  radius: number;
  /** Beam width (m or in) */
  beamWidth: number;
  /** Beam height (m or in) */
  beamHeight: number;
  /** Distance from load to hole (m or in) - typically 0 */
  distanceLoadHole: number;
  /** Minimum thickness between hole and beam surface (m or in) */
  minimumThickness: number;
  /** Young's Modulus (Pa or PSI) */
  modulus: number;
  /** Gage length - measurement span (m or in) */
  gageLength: number;
  /** Gage factor (unitless) */
  gageFactor: number;
}

export type BinobeamUnitSystem = 'US' | 'SI';

/**
 * Output results from binocular beam calculation
 */
export interface BinobeamOutput {
  /** Minimum strain in microstrains */
  minStrain: number;
  /** Maximum strain in microstrains */
  maxStrain: number;
  /** Average strain in microstrains */
  avgStrain: number;
  /** Neutral axis offset location (position where max strain occurs) */
  zOffset: number;
  /** Strain gradient as percentage */
  gradient: number;
  /** Full-bridge sensitivity in mV/V */
  fullSpanSensitivity: number;
}

function solveFromNormalizedSI(normalized: BinobeamInput): BinobeamOutput {
  validateBinobeamGeometry(normalized);

  const {
    appliedLoad: F,
    distanceBetweenHoles: L_d,
    radius: r,
    beamWidth: W,
    beamHeight: H,
    distanceLoadHole: L_hd,
    minimumThickness: t_min,
    modulus: E,
    gageLength: L_gauge,
    gageFactor: GF,
  } = normalized;

  const g = H / 2 - (r + t_min);
  const K2 = H / 2 - g;
  const K1 = L_hd / (H - (H - 2 * r - 2 * g) / 2);
  const xMinValue = -L_gauge / 2;
  const xMaxValue = L_gauge / 2;
  const iterations = 1000;
  const increment = (xMaxValue - xMinValue) / iterations;

  let maxStrain = 0;
  let minStrain = 0;
  let maxStrainLocation = 0;
  let currentX = xMinValue;

  const firstTerm = F / (E * W);

  for (let i = 0; i <= iterations; i++) {
    const rSqMinXSq = Math.sqrt(Math.pow(r, 2) - Math.pow(currentX, 2));
    const secondTerm = K1 / (K2 - rSqMinXSq);
    const denominator = K2 - rSqMinXSq;
    const thirdTerm = (3 * (L_d / 2 + currentX)) / Math.pow(denominator, 2);
    const strain = (firstTerm * (secondTerm + thirdTerm)) * 1e6;

    if (i === 0 || strain > maxStrain) {
      maxStrain = strain;
      maxStrainLocation = currentX;
    }
    if (i === 0 || strain < minStrain) {
      minStrain = strain;
    }

    currentX += increment;
  }

  const xMin2 = xMinValue + maxStrainLocation;
  const xMax2 = xMaxValue + maxStrainLocation;
  let maxStrain2 = 0;
  let minStrain2 = 0;
  let strainSum = 0;
  currentX = xMin2;

  for (let i = 0; i <= iterations; i++) {
    const rSqMinXSq = Math.sqrt(Math.pow(r, 2) - Math.pow(currentX, 2));
    const secondTerm = K1 / (K2 - rSqMinXSq);
    const denominator = K2 - rSqMinXSq;
    const thirdTerm = (3 * (L_d / 2 + currentX)) / Math.pow(denominator, 2);
    const strain = (firstTerm * (secondTerm + thirdTerm)) * 1e6;

    strainSum += strain;

    if (i === 0 || strain > maxStrain2) {
      maxStrain2 = strain;
    }
    if (i === 0 || strain < minStrain2) {
      minStrain2 = strain;
    }

    currentX += increment;
  }

  const avgStrain = Math.abs(strainSum / iterations);
  const gradient = Math.abs((maxStrain2 - minStrain2) / maxStrain2) * 100;
  const fullSpanSensitivity = avgStrain * GF * 1e-3;

  return {
    minStrain: minStrain2,
    maxStrain: maxStrain2,
    avgStrain,
    zOffset: maxStrainLocation,
    gradient,
    fullSpanSensitivity,
  };
}

/**
 * Closed-form binocular beam solver with explicit units (recommended for UI/workflows).
 * US mode expects: lbf, in, Mpsi. SI mode expects: N, mm, GPa.
 */
export function calculateBinobeamStrainExplicit(
  params: BinobeamInput,
  unitSystem: BinobeamUnitSystem
): BinobeamOutput {
  let normalized: BinobeamInput;
  if (unitSystem === 'US') {
    normalized = {
      appliedLoad: params.appliedLoad * 4.448222,
      distanceBetweenHoles: params.distanceBetweenHoles * 0.0254,
      radius: params.radius * 0.0254,
      beamWidth: params.beamWidth * 0.0254,
      beamHeight: params.beamHeight * 0.0254,
      distanceLoadHole: params.distanceLoadHole * 0.0254,
      minimumThickness: params.minimumThickness * 0.0254,
      // UI uses Mpsi in US mode: 1 Mpsi = 1e6 psi = 6.8947572932e9 Pa
      modulus: params.modulus * 6.8947572932e9,
      gageLength: params.gageLength * 0.0254,
      gageFactor: params.gageFactor,
    };
  } else {
    normalized = {
      appliedLoad: params.appliedLoad,
      distanceBetweenHoles: params.distanceBetweenHoles * 0.001,
      radius: params.radius * 0.001,
      beamWidth: params.beamWidth * 0.001,
      beamHeight: params.beamHeight * 0.001,
      distanceLoadHole: params.distanceLoadHole * 0.001,
      minimumThickness: params.minimumThickness * 0.001,
      modulus: params.modulus * 1e9,
      gageLength: params.gageLength * 0.001,
      gageFactor: params.gageFactor,
    };
  }
  return solveFromNormalizedSI(normalized);
}

/**
 * Validates input geometry constraints for binocular beam
 * Throws error if constraints violated
 *
 * @param params - Input parameters to validate
 * @throws Error if height < 2*radius + 2*thickness
 * @throws Error if height/width > 5
 * @throws Error if (distanceBetweenHoles/width) < 2
 * @throws Error if gageLength² > radius²
 */
function validateBinobeamGeometry(params: BinobeamInput): void {
  const { radius, beamHeight, minimumThickness, beamWidth, distanceBetweenHoles, gageLength } = params;
  const geoTol = Math.max(1e-9, beamHeight * 1e-5);

  // Check: Height >= 2*radius + 2*thickness
  if (beamHeight + geoTol < 2 * radius + 2 * minimumThickness) {
    throw new Error(
      `Beam height ${beamHeight} must be >= 2*radius + 2*thickness = ${2 * radius + 2 * minimumThickness}`
    );
  }

  // Check: Height/Width <= 5
  if (beamHeight / beamWidth > 5) {
    throw new Error(`Height/Width ratio ${beamHeight / beamWidth} must be <= 5`);
  }

  // Check: DistanceBetweenHoles/Width >= 2
  if (distanceBetweenHoles / beamWidth < 2) {
    throw new Error(
      `Distance between holes / Width ratio ${distanceBetweenHoles / beamWidth} must be >= 2`
    );
  }

  // Check: GageLength² <= Radius²
  if (gageLength / 2 > radius + geoTol) {
    throw new Error(`Gage length / 2 (${gageLength / 2}) must be <= radius (${radius})`);
  }

  // Check: 2*g + 2*r <= Height (where g = (H/2) - (r + t_min))
  const beamHoleDist = beamHeight / 2 - (radius + minimumThickness);
  if (2 * beamHoleDist + 2 * radius >= beamHeight) {
    throw new Error(
      `Geometry constraint failed: 2*beamHoleDist + 2*radius (${2 * beamHoleDist + 2 * radius}) must be < height (${beamHeight})`
    );
  }
}

/**
 * Converts input values to SI units (m, Pa, N) based on magnitude detection
 *
 * @param params - Input parameters (may be in US or SI units)
 * @returns Parameters normalized to SI units
 */
function normalizeToSI(params: BinobeamInput): BinobeamInput {
  // Detect if modulus is in PSI (typical range 20-80e6 PSI) or Pa (20-80e9 Pa)
  const modulusIsSI = params.modulus > 1e7; // > 10 MPa indicates Pa
  const modulusInPa = modulusIsSI ? params.modulus : params.modulus * 6894.75; // PSI to Pa

  // Detect if load is in lbf (~4-40 kN ≈ 20k-180kN N) or N
  // Typical lbf range for beam tests: 1000-100000 lbf
  const loadIsSI = params.appliedLoad > 4000; // > 4 kN indicates N
  const loadInN = loadIsSI ? params.appliedLoad : params.appliedLoad * 4.448222;

  // Dimensions: if > 50, likely mm; if < 10, likely inches; if 10-50, likely mm
  const dimensionsAreMM = params.beamHeight > 10;
  const dimensionMultiplier = dimensionsAreMM ? 0.001 : 0.0254; // mm to m or in to m

  return {
    appliedLoad: loadInN,
    distanceBetweenHoles: params.distanceBetweenHoles * dimensionMultiplier,
    radius: params.radius * dimensionMultiplier,
    beamWidth: params.beamWidth * dimensionMultiplier,
    beamHeight: params.beamHeight * dimensionMultiplier,
    distanceLoadHole: params.distanceLoadHole * dimensionMultiplier,
    minimumThickness: params.minimumThickness * dimensionMultiplier,
    modulus: modulusInPa,
    gageLength: params.gageLength * dimensionMultiplier,
    gageFactor: params.gageFactor,
  };
}

/**
 * Main calculation function for binocular beam bending strain
 *
 * Algorithm:
 * 1. Normalize inputs to SI units
 * 2. Validate geometry constraints
 * 3. Calculate K1, K2 coefficients based on geometry
 * 4. First iteration: scan gage range to find peak strain location
 * 5. Second iteration: collect min/max/avg strain statistics
 * 6. Calculate gradient and sensitivity
 *
 * @param params - Input parameters
 * @returns Strain calculations and sensitivity metrics
 * @throws Error if geometry constraints violated
 */
export function calculateBinobeamStrain(params: BinobeamInput): BinobeamOutput {
  const normalized = normalizeToSI(params);
  return solveFromNormalizedSI(normalized);
}

