/**
 * S-Beam Bending Calculator
 *
 * Units: N (force), mm (length), GPa (modulus) — matches Delphi SBBEAM.PAS.
 * Internally converts GPa × 1000 → MPa = N/mm² for the strain formula.
 *
 * For each position X (mm) along the gage arc:
 *   angle  = X / R                              (arc ÷ radius)
 *   K1     = R · sin(angle)                     (mm)
 *   K2     = (T + R − √(R² − K1²))²             (mm²)
 *   strain = 6·(F/2)·K1 / (E_MPa·W·K2) · 1e6   (µε)
 */

export interface SbeamInput {
  /** Applied axial load (N) */
  appliedLoad: number;
  /** Hole radius (mm) */
  holeRadius: number;
  /** Beam width (mm) */
  beamWidth: number;
  /** Beam thickness (mm) */
  thickness: number;
  /** Distance between gage positions (mm) */
  distanceBetweenGages: number;
  /** Young's Modulus (GPa) */
  modulus: number;
  /** Gage length (mm) */
  gageLength: number;
  /** Gage factor (unitless) */
  gageFactor: number;
}

export interface SbeamOutput {
  /** Minimum strain (µε) */
  minStrain: number;
  /** Maximum strain (µε) */
  maxStrain: number;
  /** Average strain (µε) */
  avgStrain: number;
  /** Strain gradient (%) */
  gradient: number;
  /** Full-bridge sensitivity (mV/V) */
  fullSpanSensitivity: number;
}

function validateSbeamGeometry(params: SbeamInput): void {
  const { thickness, holeRadius, gageLength, beamWidth } = params;
  if (thickness <= 0)       throw new Error(`Beam thickness must be > 0`);
  if (holeRadius <= 0)      throw new Error(`Hole radius must be > 0`);
  if (holeRadius > thickness) throw new Error(`Hole radius cannot exceed beam thickness`);
  if (gageLength <= 0)      throw new Error(`Gage length must be > 0`);
  if (beamWidth <= 0)       throw new Error(`Beam width must be > 0`);
}

export function calculateSbeamStrain(params: SbeamInput): SbeamOutput {
  validateSbeamGeometry(params);

  const F = params.appliedLoad;
  const R = params.holeRadius;
  const W = params.beamWidth;
  const T = params.thickness;
  const D = params.distanceBetweenGages;
  const L = params.gageLength;
  const E = params.modulus * 1000;   // GPa → MPa = N/mm²
  const GF = params.gageFactor;

  const xMin = D / 2 - L / 2;
  const xMax = D / 2 + L / 2;
  const iterations = 500;
  const increment = (xMax - xMin) / iterations;

  let minStrain = 0;
  let maxStrain = 0;
  let sumStrain = 0;
  let currentX = xMin;

  for (let i = 0; i <= iterations; i++) {
    const k1 = R * Math.sin(currentX / R);           // arc/radius = angle (radians)
    const k2 = (T + R - Math.sqrt(R * R - k1 * k1)) ** 2;
    const strain = (6 * (F / 2) * k1) / (E * W * k2) * 1e6;

    if (i === 0 || strain > maxStrain) maxStrain = strain;
    if (i === 0 || strain < minStrain) minStrain = strain;
    sumStrain += strain;
    currentX += increment;
  }

  const avgStrain = sumStrain / (iterations + 1);
  const gradient = avgStrain !== 0 ? ((maxStrain - minStrain) / avgStrain) * 100 : 0;

  return {
    minStrain,
    maxStrain,
    avgStrain,
    gradient,
    fullSpanSensitivity: avgStrain * GF * 1e-3,
  };
}
