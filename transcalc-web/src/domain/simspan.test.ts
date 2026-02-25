import { describe, it, expect } from 'vitest';
import { calculateSimultaneousSpan, SimultaneousSpanInput } from './simspan';

describe('SimultaneousSpan', () => {
  it('should export calculateSimultaneousSpan function', () => {
    expect(typeof calculateSimultaneousSpan).toBe('function');
  });

  it('should return object with success property', () => {
    const input: SimultaneousSpanInput = {
      lowSpan: 1.0,
      lowRBridge: 800,
      lowRMod: 80,
      ambientSpan: 5.0,
      ambientRBridge: 1000,
      ambientRMod: 100,
      highSpan: 9.0,
      highRBridge: 1200,
      highRMod: 120,
      desiredSpan: -0.5,
    };

    const result = calculateSimultaneousSpan(input);
    expect(result).toHaveProperty('success');
    expect(result).toHaveProperty('rShunt');
    expect(result).toHaveProperty('rMod');
    expect(result).toHaveProperty('span');
  });

  it('should reject invalid low span (-10.1)', () => {
    const input: SimultaneousSpanInput = {
      lowSpan: -10.1,
      lowRBridge: 1000,
      lowRMod: 100,
      ambientSpan: 5.0,
      ambientRBridge: 1000,
      ambientRMod: 100,
      highSpan: 8.0,
      highRBridge: 1000,
      highRMod: 100,
      desiredSpan: 0.0,
    };

    const result = calculateSimultaneousSpan(input);
    expect(result.success).toBe(false);
    expect(result.error).toBeDefined();
  });

  it('should reject invalid span ordering', () => {
    const input: SimultaneousSpanInput = {
      lowSpan: 5.0,
      lowRBridge: 1000,
      lowRMod: 100,
      ambientSpan: 3.0,
      ambientRBridge: 1000,
      ambientRMod: 100,
      highSpan: 8.0,
      highRBridge: 1000,
      highRMod: 100,
      desiredSpan: 0.0,
    };

    const result = calculateSimultaneousSpan(input);
    expect(result.success).toBe(false);
  });

  it('should reject invalid RBridge values', () => {
    const input: SimultaneousSpanInput = {
      lowSpan: 1.0,
      lowRBridge: 49,
      lowRMod: 100,
      ambientSpan: 5.0,
      ambientRBridge: 1000,
      ambientRMod: 100,
      highSpan: 8.0,
      highRBridge: 1000,
      highRMod: 100,
      desiredSpan: 0.0,
    };

    const result = calculateSimultaneousSpan(input);
    expect(result.success).toBe(false);
  });

  it('should reject invalid RMod values', () => {
    const input: SimultaneousSpanInput = {
      lowSpan: 1.0,
      lowRBridge: 1000,
      lowRMod: 0.0001,
      ambientSpan: 5.0,
      ambientRBridge: 1000,
      ambientRMod: 100,
      highSpan: 8.0,
      highRBridge: 1000,
      highRMod: 100,
      desiredSpan: 0.0,
    };

    const result = calculateSimultaneousSpan(input);
    expect(result.success).toBe(false);
  });

  it('should validate span ordering constraints', () => {
    const input: SimultaneousSpanInput = {
      lowSpan: 1.0,
      lowRBridge: 1000,
      lowRMod: 100,
      ambientSpan: 5.0,
      ambientRBridge: 1000,
      ambientRMod: 100,
      highSpan: 8.0,
      highRBridge: 1000,
      highRMod: 100,
      desiredSpan: 9.0,
    };

    const result = calculateSimultaneousSpan(input);
    expect(result.success).toBe(false);
  });
});
