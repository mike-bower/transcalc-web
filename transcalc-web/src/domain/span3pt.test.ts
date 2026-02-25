import { describe, it, expect } from 'vitest';
import { calculateSpan3pt, Span3ptInput } from './span3pt';

describe('Span3pt - Validation Tests', () => {
  describe('Input validation - span ranges', () => {
    it('should reject low span below minimum 0.1 mV', () => {
      const input: Span3ptInput = {
        lowSpan: 0.09,
        lowRBridge: 350.0,
        lowRMod: 100.0,
        ambientSpan: 5.0,
        ambientRBridge: 350.0,
        ambientRMod: 100.0,
        highSpan: 10.0,
        highRBridge: 350.0,
        highRMod: 100.0,
      };

      const result = calculateSpan3pt(input);
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('should reject high span above maximum 100 mV', () => {
      const input: Span3ptInput = {
        lowSpan: 1.0,
        lowRBridge: 350.0,
        lowRMod: 100.0,
        ambientSpan: 5.0,
        ambientRBridge: 350.0,
        ambientRMod: 100.0,
        highSpan: 100.1,
        highRBridge: 350.0,
        highRMod: 100.0,
      };

      const result = calculateSpan3pt(input);
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });
  });

  describe('Input validation - RBridge ranges', () => {
    it('should reject RBridge above maximum 5000 Ohms', () => {
      const input: Span3ptInput = {
        lowSpan: 1.0,
        lowRBridge: 5000.1,
        lowRMod: 100.0,
        ambientSpan: 5.0,
        ambientRBridge: 350.0,
        ambientRMod: 100.0,
        highSpan: 10.0,
        highRBridge: 350.0,
        highRMod: 100.0,
      };

      const result = calculateSpan3pt(input);
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('should reject ambient RBridge above maximum', () => {
      const input: Span3ptInput = {
        lowSpan: 1.0,
        lowRBridge: 350.0,
        lowRMod: 100.0,
        ambientSpan: 5.0,
        ambientRBridge: 5000.1,
        ambientRMod: 100.0,
        highSpan: 10.0,
        highRBridge: 350.0,
        highRMod: 100.0,
      };

      const result = calculateSpan3pt(input);
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });
  });

  describe('Input validation - RMod ranges', () => {
    it('should reject RMod above maximum 10000 Ohms', () => {
      const input: Span3ptInput = {
        lowSpan: 1.0,
        lowRBridge: 350.0,
        lowRMod: 10000.1,
        ambientSpan: 5.0,
        ambientRBridge: 350.0,
        ambientRMod: 100.0,
        highSpan: 10.0,
        highRBridge: 350.0,
        highRMod: 100.0,
      };

      const result = calculateSpan3pt(input);
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('should reject ambient RMod above maximum', () => {
      const input: Span3ptInput = {
        lowSpan: 1.0,
        lowRBridge: 350.0,
        lowRMod: 100.0,
        ambientSpan: 5.0,
        ambientRBridge: 350.0,
        ambientRMod: 10000.1,
        highSpan: 10.0,
        highRBridge: 350.0,
        highRMod: 100.0,
      };

      const result = calculateSpan3pt(input);
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });
  });

  describe('Input validation - span ordering', () => {
    it('should reject when low span equals ambient span', () => {
      const input: Span3ptInput = {
        lowSpan: 5.0,
        lowRBridge: 350.0,
        lowRMod: 100.0,
        ambientSpan: 5.0,
        ambientRBridge: 350.0,
        ambientRMod: 100.0,
        highSpan: 10.0,
        highRBridge: 350.0,
        highRMod: 100.0,
      };

      const result = calculateSpan3pt(input);
      expect(result.success).toBe(false);
      expect(result.error).toContain('low span must be less than ambient span');
    });

    it('should reject when low span greater than ambient span', () => {
      const input: Span3ptInput = {
        lowSpan: 10.0,
        lowRBridge: 350.0,
        lowRMod: 100.0,
        ambientSpan: 5.0,
        ambientRBridge: 350.0,
        ambientRMod: 100.0,
        highSpan: 15.0,
        highRBridge: 350.0,
        highRMod: 100.0,
      };

      const result = calculateSpan3pt(input);
      expect(result.success).toBe(false);
      expect(result.error).toContain('low span must be less than ambient span');
    });

    it('should reject when ambient span equals high span', () => {
      const input: Span3ptInput = {
        lowSpan: 1.0,
        lowRBridge: 350.0,
        lowRMod: 100.0,
        ambientSpan: 10.0,
        ambientRBridge: 350.0,
        ambientRMod: 100.0,
        highSpan: 10.0,
        highRBridge: 350.0,
        highRMod: 100.0,
      };

      const result = calculateSpan3pt(input);
      expect(result.success).toBe(false);
      expect(result.error).toContain('ambient span must be less than high span');
    });

    it('should reject when ambient span greater than high span', () => {
      const input: Span3ptInput = {
        lowSpan: 1.0,
        lowRBridge: 350.0,
        lowRMod: 100.0,
        ambientSpan: 15.0,
        ambientRBridge: 350.0,
        ambientRMod: 100.0,
        highSpan: 10.0,
        highRBridge: 350.0,
        highRMod: 100.0,
      };

      const result = calculateSpan3pt(input);
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });
  });

  describe('Input validation - zero low span', () => {
    it('should reject zero low span', () => {
      const input: Span3ptInput = {
        lowSpan: 0,
        lowRBridge: 350.0,
        lowRMod: 100.0,
        ambientSpan: 5.0,
        ambientRBridge: 350.0,
        ambientRMod: 100.0,
        highSpan: 10.0,
        highRBridge: 350.0,
        highRMod: 100.0,
      };

      const result = calculateSpan3pt(input);
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });
  });

  describe('Result structure', () => {
    it('should define success property on validation failure', () => {
      const input: Span3ptInput = {
        lowSpan: 0,
        lowRBridge: 350.0,
        lowRMod: 100.0,
        ambientSpan: 5.0,
        ambientRBridge: 350.0,
        ambientRMod: 100.0,
        highSpan: 10.0,
        highRBridge: 350.0,
        highRMod: 100.0,
      };

      const result = calculateSpan3pt(input);
      expect(result).toHaveProperty('success');
      expect(typeof result.success).toBe('boolean');
      expect(result.success).toBe(false);
    });

    it('should return error message when validation fails', () => {
      const input: Span3ptInput = {
        lowSpan: 100.5,
        lowRBridge: 350.0,
        lowRMod: 100.0,
        ambientSpan: 5.0,
        ambientRBridge: 350.0,
        ambientRMod: 100.0,
        highSpan: 10.0,
        highRBridge: 350.0,
        highRMod: 100.0,
      };

      const result = calculateSpan3pt(input);
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      expect(typeof result.error).toBe('string');
      expect(result.error!.length).toBeGreaterThan(0);
    });
  });

  describe('Valid parameter ranges', () => {
    it('should accept span at minimum boundary', () => {
      const input: Span3ptInput = {
        lowSpan: 0.1,
        lowRBridge: 350.0,
        lowRMod: 100.0,
        ambientSpan: 1.0,
        ambientRBridge: 350.0,
        ambientRMod: 100.0,
        highSpan: 10.0,
        highRBridge: 350.0,
        highRMod: 100.0,
      };

      const result = calculateSpan3pt(input);
      // Should pass validation, may or may not succeed in calculation
      expect(result.error).not.toContain('must be between');
      expect(result.error).not.toContain('cannot be zero');
    });

    it('should accept span at maximum boundary', () => {
      const input: Span3ptInput = {
        lowSpan: 1.0,
        lowRBridge: 350.0,
        lowRMod: 100.0,
        ambientSpan: 50.0,
        ambientRBridge: 350.0,
        ambientRMod: 100.0,
        highSpan: 100.0,
        highRBridge: 350.0,
        highRMod: 100.0,
      };

      const result = calculateSpan3pt(input);
      // Should pass validation
      expect(result.error).not.toContain('must be between');
    });

    it('should accept RBridge at maximum boundary', () => {
      const input: Span3ptInput = {
        lowSpan: 1.0,
        lowRBridge: 5000.0,
        lowRMod: 100.0,
        ambientSpan: 5.0,
        ambientRBridge: 5000.0,
        ambientRMod: 100.0,
        highSpan: 10.0,
        highRBridge: 5000.0,
        highRMod: 100.0,
      };

      const result = calculateSpan3pt(input);
      // Should pass validation
      expect(result.error).not.toContain('must be between');
    });

    it('should accept RMod at maximum boundary', () => {
      const input: Span3ptInput = {
        lowSpan: 1.0,
        lowRBridge: 350.0,
        lowRMod: 10000.0,
        ambientSpan: 5.0,
        ambientRBridge: 350.0,
        ambientRMod: 10000.0,
        highSpan: 10.0,
        highRBridge: 350.0,
        highRMod: 10000.0,
      };

      const result = calculateSpan3pt(input);
      // Should pass validation
      expect(result.error).not.toContain('must be between');
    });
  });
});
