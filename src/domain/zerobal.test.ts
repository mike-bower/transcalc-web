import { describe, it, expect } from 'vitest';
import {
  calculateZeroBalance,
  getWireType,
  WIRE_TYPES,
  type ZeroBalanceInput,
} from './zerobal';

describe('zerobal module', () => {
  describe('Wire types', () => {
    it('should have Constantan wire type at index 0', () => {
      const wire = getWireType(0);
      expect(wire).not.toBeNull();
      expect(wire!.name).toBe('Constantan (A Alloy)');
      expect(wire!.resistivity).toBe(294);
      expect(wire!.tcr).toBe(0.00004);
    });

    it('should have Manganin wire type at index 1', () => {
      const wire = getWireType(1);
      expect(wire).not.toBeNull();
      expect(wire!.name).toBe('Manganin');
      expect(wire!.resistivity).toBe(290);
      expect(wire!.tcr).toBe(0.000015);
    });

    it('should have Modified Karma wire type at index 2', () => {
      const wire = getWireType(2);
      expect(wire).not.toBeNull();
      expect(wire!.name).toBe('Modified Karma (K Alloy)');
      expect(wire!.resistivity).toBe(800);
      expect(wire!.tcr).toBe(0.00002);
    });

    it('should return null for invalid wire type index', () => {
      const wire = getWireType(3);
      expect(wire).toBeNull();
    });

    it('should return null for negative wire type index', () => {
      const wire = getWireType(-1);
      expect(wire).toBeNull();
    });

    it('should have all wire types defined in WIRE_TYPES', () => {
      expect(WIRE_TYPES).toHaveProperty('0');
      expect(WIRE_TYPES).toHaveProperty('1');
      expect(WIRE_TYPES).toHaveProperty('2');
    });
  });

  describe('Valid calculations', () => {
    it('should calculate resistance with positive unbalance', () => {
      const input: ZeroBalanceInput = {
        unbalance: 5,
        rBridge: 350,
        wireTypeIndex: 0,
      };
      const result = calculateZeroBalance(input);
      expect(result.success).toBe(true);
      expect(result.error).toBeUndefined();
      expect(result.resistance).toBeDefined();
      // Formula: 5 * 4 * 350 * 1e-3 = 7
      expect(result.resistance).toBe(7);
    });

    it('should calculate resistance with negative unbalance', () => {
      const input: ZeroBalanceInput = {
        unbalance: -5,
        rBridge: 350,
        wireTypeIndex: 1,
      };
      const result = calculateZeroBalance(input);
      expect(result.success).toBe(true);
      expect(result.error).toBeUndefined();
      expect(result.resistance).toBeDefined();
      // Formula: abs(-5 * 4 * 350 * 1e-3) = 7
      expect(result.resistance).toBe(7);
    });

    it('should calculate resistance with minimum valid unbalance', () => {
      const input: ZeroBalanceInput = {
        unbalance: -10,
        rBridge: 100,
        wireTypeIndex: 0,
      };
      const result = calculateZeroBalance(input);
      expect(result.success).toBe(true);
      // Formula: abs(-10 * 4 * 100 * 1e-3) = 4
      expect(result.resistance).toBe(4);
    });

    it('should calculate resistance with maximum valid unbalance', () => {
      const input: ZeroBalanceInput = {
        unbalance: 10,
        rBridge: 100,
        wireTypeIndex: 0,
      };
      const result = calculateZeroBalance(input);
      expect(result.success).toBe(true);
      // Formula: 10 * 4 * 100 * 1e-3 = 4
      expect(result.resistance).toBe(4);
    });

    it('should calculate resistance with minimum bridge resistance', () => {
      const input: ZeroBalanceInput = {
        unbalance: 1,
        rBridge: 50,
        wireTypeIndex: 2,
      };
      const result = calculateZeroBalance(input);
      expect(result.success).toBe(true);
      // Formula: 1 * 4 * 50 * 1e-3 = 0.2
      expect(result.resistance).toBeCloseTo(0.2);
    });

    it('should calculate resistance with maximum bridge resistance', () => {
      const input: ZeroBalanceInput = {
        unbalance: 1,
        rBridge: 10000,
        wireTypeIndex: 1,
      };
      const result = calculateZeroBalance(input);
      expect(result.success).toBe(true);
      // Formula: 1 * 4 * 10000 * 1e-3 = 40
      expect(result.resistance).toBe(40);
    });

    it('should calculate resistance with high unbalance and high bridge', () => {
      const input: ZeroBalanceInput = {
        unbalance: 9.5,
        rBridge: 8500,
        wireTypeIndex: 0,
      };
      const result = calculateZeroBalance(input);
      expect(result.success).toBe(true);
      // Formula: 9.5 * 4 * 8500 * 1e-3 = 322.8
      expect(result.resistance).toBeCloseTo(9.5 * 4 * 8500 * 1e-3);
    });

    it('should calculate resistance with small unbalance and small bridge', () => {
      const input: ZeroBalanceInput = {
        unbalance: 0.1,
        rBridge: 75,
        wireTypeIndex: 0,
      };
      const result = calculateZeroBalance(input);
      expect(result.success).toBe(true);
      // Formula: 0.1 * 4 * 75 * 1e-3 = 0.03
      expect(result.resistance).toBeCloseTo(0.03);
    });

    it('should always return positive resistance (absolute value)', () => {
      const input: ZeroBalanceInput = {
        unbalance: -8,
        rBridge: 500,
        wireTypeIndex: 0,
      };
      const result = calculateZeroBalance(input);
      expect(result.success).toBe(true);
      expect(result.resistance).toBeGreaterThan(0);
    });
  });

  describe('Bridge arm determination', () => {
    it('should return P-S- for positive unbalance (positive resistance)', () => {
      const input: ZeroBalanceInput = {
        unbalance: 3,
        rBridge: 200,
        wireTypeIndex: 0,
      };
      const result = calculateZeroBalance(input);
      expect(result.success).toBe(true);
      expect(result.bridgeArm).toBe('P-S-');
    });

    it('should return P+S- for negative unbalance (negative resistance)', () => {
      const input: ZeroBalanceInput = {
        unbalance: -3,
        rBridge: 200,
        wireTypeIndex: 0,
      };
      const result = calculateZeroBalance(input);
      expect(result.success).toBe(true);
      expect(result.bridgeArm).toBe('P+S-');
    });

    it('should return correct bridge arm at boundary values', () => {
      const posInput: ZeroBalanceInput = {
        unbalance: 0.01,
        rBridge: 100,
        wireTypeIndex: 0,
      };
      const result = calculateZeroBalance(posInput);
      expect(result.success).toBe(true);
      expect(result.bridgeArm).toBe('P-S-');
    });
  });

  describe('Input validation - unbalance', () => {
    it('should reject unbalance below minimum', () => {
      const input: ZeroBalanceInput = {
        unbalance: -10.1,
        rBridge: 100,
        wireTypeIndex: 0,
      };
      const result = calculateZeroBalance(input);
      expect(result.success).toBe(false);
      expect(result.error).toContain('Unbalance must be between');
    });

    it('should reject unbalance above maximum', () => {
      const input: ZeroBalanceInput = {
        unbalance: 10.1,
        rBridge: 100,
        wireTypeIndex: 0,
      };
      const result = calculateZeroBalance(input);
      expect(result.success).toBe(false);
      expect(result.error).toContain('Unbalance must be between');
    });

    it('should reject zero unbalance', () => {
      const input: ZeroBalanceInput = {
        unbalance: 0,
        rBridge: 100,
        wireTypeIndex: 0,
      };
      const result = calculateZeroBalance(input);
      expect(result.success).toBe(false);
      expect(result.error).toContain('cannot be zero');
    });

    it('should accept minimum valid unbalance (-10)', () => {
      const input: ZeroBalanceInput = {
        unbalance: -10,
        rBridge: 100,
        wireTypeIndex: 0,
      };
      const result = calculateZeroBalance(input);
      expect(result.success).toBe(true);
    });

    it('should accept maximum valid unbalance (10)', () => {
      const input: ZeroBalanceInput = {
        unbalance: 10,
        rBridge: 100,
        wireTypeIndex: 0,
      };
      const result = calculateZeroBalance(input);
      expect(result.success).toBe(true);
    });
  });

  describe('Input validation - rBridge', () => {
    it('should reject bridge resistance below minimum', () => {
      const input: ZeroBalanceInput = {
        unbalance: 5,
        rBridge: 49.9,
        wireTypeIndex: 0,
      };
      const result = calculateZeroBalance(input);
      expect(result.success).toBe(false);
      expect(result.error).toContain('Bridge resistance must be between');
    });

    it('should reject bridge resistance above maximum', () => {
      const input: ZeroBalanceInput = {
        unbalance: 5,
        rBridge: 10000.1,
        wireTypeIndex: 0,
      };
      const result = calculateZeroBalance(input);
      expect(result.success).toBe(false);
      expect(result.error).toContain('Bridge resistance must be between');
    });

    it('should accept minimum valid bridge resistance (50)', () => {
      const input: ZeroBalanceInput = {
        unbalance: 5,
        rBridge: 50,
        wireTypeIndex: 0,
      };
      const result = calculateZeroBalance(input);
      expect(result.success).toBe(true);
    });

    it('should accept maximum valid bridge resistance (10000)', () => {
      const input: ZeroBalanceInput = {
        unbalance: 5,
        rBridge: 10000,
        wireTypeIndex: 0,
      };
      const result = calculateZeroBalance(input);
      expect(result.success).toBe(true);
    });

    it('should accept mid-range bridge resistance values', () => {
      const input: ZeroBalanceInput = {
        unbalance: 5,
        rBridge: 350,
        wireTypeIndex: 0,
      };
      const result = calculateZeroBalance(input);
      expect(result.success).toBe(true);
    });
  });

  describe('Input validation - wireTypeIndex', () => {
    it('should reject wire type index below valid range', () => {
      const input: ZeroBalanceInput = {
        unbalance: 5,
        rBridge: 100,
        wireTypeIndex: -1,
      };
      const result = calculateZeroBalance(input);
      expect(result.success).toBe(false);
      expect(result.error).toContain('Wire type index');
    });

    it('should reject wire type index above valid range', () => {
      const input: ZeroBalanceInput = {
        unbalance: 5,
        rBridge: 100,
        wireTypeIndex: 3,
      };
      const result = calculateZeroBalance(input);
      expect(result.success).toBe(false);
      expect(result.error).toContain('Wire type index');
    });

    it('should accept wire type 0 (Constantan)', () => {
      const input: ZeroBalanceInput = {
        unbalance: 5,
        rBridge: 100,
        wireTypeIndex: 0,
      };
      const result = calculateZeroBalance(input);
      expect(result.success).toBe(true);
    });

    it('should accept wire type 1 (Manganin)', () => {
      const input: ZeroBalanceInput = {
        unbalance: 5,
        rBridge: 100,
        wireTypeIndex: 1,
      };
      const result = calculateZeroBalance(input);
      expect(result.success).toBe(true);
    });

    it('should accept wire type 2 (Modified Karma)', () => {
      const input: ZeroBalanceInput = {
        unbalance: 5,
        rBridge: 100,
        wireTypeIndex: 2,
      };
      const result = calculateZeroBalance(input);
      expect(result.success).toBe(true);
    });
  });

  describe('Result structure', () => {
    it('should return well-formed success result', () => {
      const input: ZeroBalanceInput = {
        unbalance: 5,
        rBridge: 350,
        wireTypeIndex: 0,
      };
      const result = calculateZeroBalance(input);
      expect(result).toHaveProperty('success');
      expect(result).toHaveProperty('resistance');
      expect(result).toHaveProperty('bridgeArm');
      expect(result.success).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('should return well-formed error result', () => {
      const input: ZeroBalanceInput = {
        unbalance: 0,
        rBridge: 100,
        wireTypeIndex: 0,
      };
      const result = calculateZeroBalance(input);
      expect(result).toHaveProperty('success');
      expect(result).toHaveProperty('error');
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.resistance).toBeUndefined();
      expect(result.bridgeArm).toBeUndefined();
    });

    it('should have error message for all validation failures', () => {
      const invalidInputs: ZeroBalanceInput[] = [
        { unbalance: 11, rBridge: 100, wireTypeIndex: 0 },
        { unbalance: -11, rBridge: 100, wireTypeIndex: 0 },
        { unbalance: 0, rBridge: 100, wireTypeIndex: 0 },
        { unbalance: 5, rBridge: 49, wireTypeIndex: 0 },
        { unbalance: 5, rBridge: 10001, wireTypeIndex: 0 },
        { unbalance: 5, rBridge: 100, wireTypeIndex: -1 },
        { unbalance: 5, rBridge: 100, wireTypeIndex: 3 },
      ];

      for (const input of invalidInputs) {
        const result = calculateZeroBalance(input);
        expect(result.success).toBe(false);
        expect(result.error).toBeDefined();
        expect(result.error?.length).toBeGreaterThan(0);
      }
    });
  });

  describe('Edge cases and boundary conditions', () => {
    it('should handle very small positive unbalance', () => {
      const input: ZeroBalanceInput = {
        unbalance: 0.001,
        rBridge: 100,
        wireTypeIndex: 0,
      };
      const result = calculateZeroBalance(input);
      expect(result.success).toBe(true);
      expect(result.resistance).toBeGreaterThan(0);
    });

    it('should handle very small negative unbalance', () => {
      const input: ZeroBalanceInput = {
        unbalance: -0.001,
        rBridge: 100,
        wireTypeIndex: 0,
      };
      const result = calculateZeroBalance(input);
      expect(result.success).toBe(true);
      expect(result.resistance).toBeGreaterThan(0);
    });

    it('should calculate same magnitude resistance for opposite unbalances', () => {
      const posInput: ZeroBalanceInput = {
        unbalance: 5,
        rBridge: 350,
        wireTypeIndex: 0,
      };
      const negInput: ZeroBalanceInput = {
        unbalance: -5,
        rBridge: 350,
        wireTypeIndex: 0,
      };
      const posResult = calculateZeroBalance(posInput);
      const negResult = calculateZeroBalance(negInput);
      expect(posResult.success).toBe(true);
      expect(negResult.success).toBe(true);
      expect(posResult.resistance).toBe(negResult.resistance);
    });

    it('should have opposite bridge arms for opposite unbalances', () => {
      const posInput: ZeroBalanceInput = {
        unbalance: 5,
        rBridge: 350,
        wireTypeIndex: 0,
      };
      const negInput: ZeroBalanceInput = {
        unbalance: -5,
        rBridge: 350,
        wireTypeIndex: 0,
      };
      const posResult = calculateZeroBalance(posInput);
      const negResult = calculateZeroBalance(negInput);
      expect(posResult.success).toBe(true);
      expect(negResult.success).toBe(true);
      expect(posResult.bridgeArm).not.toBe(negResult.bridgeArm);
      expect(posResult.bridgeArm).toBe('P-S-');
      expect(negResult.bridgeArm).toBe('P+S-');
    });
  });

  describe('Numerical precision', () => {
    it('should maintain precision for decimal unbalance values', () => {
      const input: ZeroBalanceInput = {
        unbalance: 3.5,
        rBridge: 350,
        wireTypeIndex: 0,
      };
      const result = calculateZeroBalance(input);
      expect(result.success).toBe(true);
      // Formula: 3.5 * 4 * 350 * 1e-3 = 4.9
      expect(result.resistance).toBeCloseTo(4.9);
    });

    it('should maintain precision for decimal bridge resistance', () => {
      const input: ZeroBalanceInput = {
        unbalance: 5,
        rBridge: 333.33,
        wireTypeIndex: 0,
      };
      const result = calculateZeroBalance(input);
      expect(result.success).toBe(true);
      // Formula: 5 * 4 * 333.33 * 1e-3 ≈ 6.6666
      expect(result.resistance).toBeCloseTo(5 * 4 * 333.33 * 1e-3);
    });

    it('should handle very high precision calculations', () => {
      const input: ZeroBalanceInput = {
        unbalance: 9.999,
        rBridge: 9999.5,
        wireTypeIndex: 0,
      };
      const result = calculateZeroBalance(input);
      expect(result.success).toBe(true);
      expect(result.resistance).toBeCloseTo(
        9.999 * 4 * 9999.5 * 1e-3
      );
    });
  });
});
