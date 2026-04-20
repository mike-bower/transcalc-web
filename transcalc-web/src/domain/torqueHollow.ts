type UnitSystem = 'SI' | 'US'

export interface TorqueHollowParams {
  torque: number;      // N-m or in-lb
  insideDia: number;   // m or in
  outsideDia: number;  // m or in
  poisson: number;
  modulus: number;     // Pa or psi
  gageFactor: number;
}

export interface TorqueResult {
  shearStrain: number;      // microstrain
  normalStrain: number;     // microstrain
  fullSpanSensitivity: number; // mV/V
  isValid: boolean;
  error?: string;
}

/**
 * Calculates torque for a round hollow shaft.
 * Logic derived from Delphi RNDHLWTQ.PAS
 */
export function calculateTorqueHollow(p: TorqueHollowParams, system: UnitSystem): TorqueResult {
  const { torque, insideDia, outsideDia, poisson, modulus, gageFactor } = p;

  if (outsideDia <= insideDia) {
    return {
      shearStrain: 0,
      normalStrain: 0,
      fullSpanSensitivity: 0,
      isValid: false,
      error: 'Outside diameter must be greater than inside diameter.'
    };
  }

  try {
    // Polar Moment J = (pi/2) * (Ro^4 - Ri^4)
    // where Ro = outsideDia/2, Ri = insideDia/2
    const ro = outsideDia / 2;
    const ri = insideDia / 2;
    const polarMoment = (Math.PI / 2) * (Math.pow(ro, 4) - Math.pow(ri, 4));

    // Shear Stress (tau) = (T * c) / J
    // where c = Ro
    const shearStress = (torque * ro) / polarMoment;

    // Shear Modulus (G) = E / (2 * (1 + nu))
    const shearModulus = modulus / (2 * (1 + poisson));

    // Shear Strain (gamma) = tau / G
    // Delphi code multiplies by 1E6 to get microstrain
    const shearStrain = (shearStress / shearModulus) * 1e6;

    // Normal Strain (epsilon) = gamma / 2 (for 45-deg alignment in torsion)
    const normalStrain = shearStrain / 2;

    // Full Span (mV/V) = (GageFactor * (2 * ShearStrain) / 4) * 1E-3
    // Note: The Delphi code uses: SpanResult := (FirstTerm * SecondTerm) * 1E-3;
    // where FirstTerm = GageFactor and SecondTerm = (2 * ShearE) / 4;
    // (ShearE here refers to calculated shear strain in microstrain)
    const fullSpanSensitivity = (gageFactor * (2 * shearStrain) / 4) * 1e-3;

    return {
      shearStrain,
      normalStrain,
      fullSpanSensitivity,
      isValid: true
    };
  } catch (err) {
    return {
      shearStrain: 0,
      normalStrain: 0,
      fullSpanSensitivity: 0,
      isValid: false,
      error: err instanceof Error ? err.message : 'Calculation error'
    };
  }
}
