/**
 * Bridge/strain measurement solvers
 * Ported from Delphi Bridge units (linear.pas, fulltwo.pas, fullfour.pas, etc.)
 * Handles full and half-bridge strain measurement configurations with Poisson coupling
 */

export interface BridgeParams {
  strain: number // microstrain (με = 1e-6 strain)
  gageFactor: number // unitless (typical: 2.0-2.1 for strain gages)
  poisson?: number // Poisson's ratio (typical: 0.3 for steel)
  strainL?: number // alternative strain input for differential bridges (microstrain)
  strain12?: number // strain for arms 1 & 2 in full 4-arm bridge
  strain34?: number // strain for arms 3 & 4 in full 4-arm bridge
}

/**
 * Calculate non-linear Poisson bridge output (2 + 2v arms, Axial/Bending)
 * Based on the Delphi implementation in nonline.pas:
 * Output = (strain - (-strain * poisson) + strain - (-strain * poisson)) / 4 * gageFactor * 1e-3
 * which simplifies to: strain * (1 + poisson) * gageFactor * 1e-3
 */
export function calculateNonLinearPoissonBridge(
  strain: number,
  gageFactor: number,
  poisson: number
): number {
  // Original formula from nonline.pas:
  // Numerator := TheStrain - (-TheStrain * ThePoisson) + TheStrain -(-TheStrain * ThePoisson);
  // Denominator := 4;
  // OutValue := (Numerator / Denominator) * TheGageFactor * 1e-3;
  const numerator = strain * (1 + poisson) + strain * (1 + poisson)
  const denominator = 4
  return (numerator / denominator) * gageFactor * 1e-3
}

/**
 * Calculate linear Poisson bridge output (2 + 2v bending arms)
 * Used for single active gage with Poisson coupling to orthogonal direction
 * 
 * Output (mV/V) = (ε × Fg × (1 + ν) × 1e-3) / 2
 * where ε is strain in microstrain, Fg is gauge factor, ν is Poisson's ratio
 * 
 * @param strain Strain in microstrain (με)
 * @param gageFactor Gauge factor of strain gage (unitless, typically 2.0-2.1)
 * @param poisson Poisson's ratio (unitless, typically 0.3 for steel)
 * @returns Bridge output in mV/V (millivolts per volt excitation)
 */
export function calculateLinearBridge(
  strain: number,
  gageFactor: number,
  poisson: number
): number {
  const numerator = strain * gageFactor * (1 + poisson) * 1e-3
  const denominator = 2
  return numerator / denominator
}

/**
 * Calculate full two-arm bridge output (opposite active arms, full differential)
 * Two active gages on opposite arms (tension and compression), two dummy arms
 * 
 * Output (mV/V) = ((ε₁ - ε₂) / 2) × Fg × 1e-3
 * where ε₁ and ε₂ are strains in opposite directions
 * 
 * @param strain First strain in microstrain (με, e.g., tension side)
 * @param strainL Second strain in microstrain (με, e.g., compression side, opposite sign)
 * @param gageFactor Gauge factor of strain gages (unitless)
 * @returns Bridge output in mV/V (millivolts per volt excitation)
 */
export function calculateFullTwoBridge(
  strain: number,
  strainL: number,
  gageFactor: number
): number {
  const firstValue = (strain - strainL) / 2
  return firstValue * gageFactor * 1e-3
}

/**
 * Calculate full four-arm bridge output (all arms active, fully balanced)
 * All four arms are active strain gages: two in tension, two in compression
 * Provides maximum sensitivity and internal temperature compensation
 * 
 * Output (mV/V) = ((ε12 - ε34) / 2) × Fg × 1e-3
 * 
 * @param strain12 Strain for arms 1 & 2 in microstrain (με)
 * @param strain34 Strain for arms 3 & 4 in microstrain (με)
 * @param gageFactor Gauge factor of strain gages (unitless)
 * @returns Bridge output in mV/V (millivolts per volt excitation)
 */
export function calculateFullFourBridge(
  strain12: number,
  strain34: number,
  gageFactor: number
): number {
  return ((strain12 - strain34) / 2) * gageFactor * 1e-3
}

/**
 * Calculate half-bridge output (one active gage, one dummy/passive arm)
 * Single active gage with one dummy or passive arm for basic compensation
 * Lower sensitivity than full bridges but simpler installation
 * 
 * Output (mV/V) = (ε × Fg / 2) × 1e-3
 * 
 * @param strain Strain in microstrain (με)
 * @param gageFactor Gauge factor of strain gage (unitless)
 * @returns Bridge output in mV/V (millivolts per volt excitation)
 */
export function calculateHalfBridge(
  strain: number,
  gageFactor: number
): number {
  return (strain * gageFactor) / 2 * 1e-3
}

/**
 * Calculate quarter-bridge output (single active gage, nonlinear)
 * TN-507-1 Case 1: single active gage in uniaxial tension or compression
 *
 * Output (mV/V) = (F × ε × 10⁻³) / (4 + 2 × F × ε × 10⁻⁶)
 *
 * Intrinsically nonlinear — denominator grows with strain. The linear
 * approximation (K = F/4) overestimates output in tension and underestimates
 * in compression. Error ≈ 0.1% at 1000 με, 1% at 10 000 με (TN-507-1 §3).
 *
 * @param strain Strain in microstrain (με)
 * @param gageFactor Gauge factor (unitless)
 * @returns Bridge output in mV/V
 */
export function calculateQuarterBridge(
  strain: number,
  gageFactor: number
): number {
  return (gageFactor * strain * 1e-3) / (4 + 2 * gageFactor * strain * 1e-6)
}

// Generic bridge calculator dispatcher
export function calculateBridgeOutput(
  bridgeType: 'linear' | 'nonLinearPoisson' | 'fullTwo' | 'fullFour' | 'halfBridge' | 'quarterBridge',
  params: BridgeParams
): number {
  switch (bridgeType) {
    case 'linear':
      return calculateLinearBridge(params.strain, params.gageFactor, params.poisson ?? 0.3)
    case 'nonLinearPoisson':
      return calculateNonLinearPoissonBridge(params.strain, params.gageFactor, params.poisson ?? 0.3)
    case 'fullTwo':
      return calculateFullTwoBridge(params.strain, params.strainL ?? 0, params.gageFactor)
    case 'fullFour':
      return calculateFullFourBridge(params.strain12 ?? params.strain, params.strain34 ?? 0, params.gageFactor)
    case 'halfBridge':
      return calculateHalfBridge(params.strain, params.gageFactor)
    case 'quarterBridge':
      return calculateQuarterBridge(params.strain, params.gageFactor)
    default:
      throw new Error(`Unknown bridge type: ${bridgeType}`)
  }
}
