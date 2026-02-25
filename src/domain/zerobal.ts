/**
 * Zero Balance Module
 * Calculates resistance based on bridge imbalance and related parameters.
 * Used in strain gauge bridge measurement and equilibration calculations.
 */

export interface WireType {
  name: string;
  resistivity: number; // ohms/meter
  tcr: number; // temperature coefficient of resistance
}

export const WIRE_TYPES: Record<number, WireType> = {
  0: {
    name: 'Constantan (A Alloy)',
    resistivity: 294,
    tcr: 0.00004,
  },
  1: {
    name: 'Manganin',
    resistivity: 290,
    tcr: 0.000015,
  },
  2: {
    name: 'Modified Karma (K Alloy)',
    resistivity: 800,
    tcr: 0.00002,
  },
};

const MIN_UNBALANCE = -10;
const MAX_UNBALANCE = 10;
const MIN_RBRIDGE = 50;
const MAX_RBRIDGE = 10000;

export interface ZeroBalanceInput {
  unbalance: number; // mV (millivolts)
  rBridge: number; // Ω (ohms)
  wireTypeIndex: number; // 0-2 (Constantan, Manganin, Modified Karma)
}

export interface ZeroBalanceResult {
  success: boolean;
  error?: string;
  resistance?: number; // calculated resistance in ohms
  bridgeArm?: string; // P-S- or P+S- indicating polarity configuration
}

/**
 * Validates input parameters
 */
function validateInput(input: ZeroBalanceInput): string | null {
  if (input.unbalance < MIN_UNBALANCE || input.unbalance > MAX_UNBALANCE) {
    return `Unbalance must be between ${MIN_UNBALANCE} and ${MAX_UNBALANCE} mV`;
  }

  if (input.rBridge < MIN_RBRIDGE || input.rBridge > MAX_RBRIDGE) {
    return `Bridge resistance must be between ${MIN_RBRIDGE} and ${MAX_RBRIDGE} ohms`;
  }

  if (input.wireTypeIndex < 0 || input.wireTypeIndex > 2) {
    return 'Wire type index must be 0, 1, or 2';
  }

  if (input.unbalance === 0) {
    return 'Unbalance cannot be zero (bridge is already balanced)';
  }

  return null;
}

/**
 * Calculates the resistance needed to balance the bridge
 * Formula: Resistance = Unbalance × 4.0 × RBridge × 1E-3
 * Where:
 *   - Unbalance is in millivolts
 *   - RBridge is the bridge arm resistance in ohms
 *   - Result is in ohms
 */
function calculateResistance(unbalance: number, rBridge: number): number {
  return unbalance * 4.0 * rBridge * 1e-3;
}

/**
 * Determines the bridge arm configuration based on resistance sign
 * P-S- indicates P arm minus S arm configuration
 * P+S- indicates P arm plus S arm configuration
 */
function calculateBridgeArm(resistanceValue: number): string {
  return resistanceValue > 0 ? 'P-S-' : 'P+S-';
}

/**
 * Performs zero balance calculation
 * Calculates the resistance needed to balance a strain gauge bridge
 * given the unbalance voltage, bridge arm resistance, and wire type
 */
export function calculateZeroBalance(
  input: ZeroBalanceInput
): ZeroBalanceResult {
  const errorMsg = validateInput(input);
  if (errorMsg) {
    return { success: false, error: errorMsg };
  }

  const resistance = calculateResistance(input.unbalance, input.rBridge);
  const bridgeArm = calculateBridgeArm(resistance);

  return {
    success: true,
    resistance: Math.abs(resistance),
    bridgeArm: bridgeArm,
  };
}

/**
 * Retrieves wire type properties by index
 */
export function getWireType(index: number): WireType | null {
  return WIRE_TYPES[index] ?? null;
}
