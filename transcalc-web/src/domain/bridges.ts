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
 * Output (mV/V) = ε × Fg × 1e-3
 * 
 * @param strain Strain in microstrain (με)
 * @param gageFactor Gauge factor of strain gages (unitless)
 * @returns Bridge output in mV/V (millivolts per volt excitation)
 */
export function calculateFullFourBridge(
  strain: number,
  gageFactor: number
): number {
  return strain * gageFactor * 1e-3
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

// Generic bridge calculator dispatcher
export function calculateBridgeOutput(
  bridgeType: 'linear' | 'fullTwo' | 'fullFour' | 'halfBridge',
  params: BridgeParams
): number {
  switch (bridgeType) {
    case 'linear':
      return calculateLinearBridge(params.strain, params.gageFactor, params.poisson ?? 0.3)
    case 'fullTwo':
      return calculateFullTwoBridge(params.strain, params.strainL ?? 0, params.gageFactor)
    case 'fullFour':
      return calculateFullFourBridge(params.strain, params.gageFactor)
    case 'halfBridge':
      return calculateHalfBridge(params.strain, params.gageFactor)
    default:
      throw new Error(`Unknown bridge type: ${bridgeType}`)
  }
}
