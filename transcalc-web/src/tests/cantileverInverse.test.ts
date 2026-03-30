import { describe, expect, it } from 'vitest'
import {
  solveCantileverForTargetSpan,
  type CantileverInverseInput,
} from '../domain/inverse/cantileverInverse'

function baseInput(): CantileverInverseInput {
  return {
    targetMvV: 2.0,
    unknown: 'loadN',
    loadN: 100,
    momentArmMm: 25.4,
    beamWidthMm: 25.4,
    thicknessMm: 3.175,
    youngsModulusGPa: 69,
    gageLengthMm: 5,
    gageFactor: 2.1,
  }
}

describe('solveCantileverForTargetSpan', () => {
  it('solves load for a target span', () => {
    const r = solveCantileverForTargetSpan(baseInput())
    expect(r.isValid, r.error).toBe(true)
    expect(r.solvedKey).toBe('loadN')
    expect(r.solvedValue).toBeGreaterThan(0)
    expect(r.designResult?.fullSpanSensitivity).toBeCloseTo(2.0, 8)
  })

  it('solves moment arm for a target span', () => {
    const r = solveCantileverForTargetSpan({
      ...baseInput(),
      unknown: 'momentArmMm',
      loadN: 110.406845238095,
      momentArmMm: 10,
    })
    expect(r.isValid, r.error).toBe(true)
    expect(r.solvedKey).toBe('momentArmMm')
    expect(r.solvedValue).toBeCloseTo(25.4, 8)
    expect(r.designResult?.fullSpanSensitivity).toBeCloseTo(2.0, 8)
  })

  it('solves thickness for a target span', () => {
    const r = solveCantileverForTargetSpan({
      ...baseInput(),
      unknown: 'thicknessMm',
      thicknessMm: 2,
    })
    expect(r.isValid, r.error).toBe(true)
    expect(r.solvedKey).toBe('thicknessMm')
    expect(r.solvedValue).toBeGreaterThan(0)
    expect(r.designResult?.fullSpanSensitivity).toBeCloseTo(2.0, 8)
  })

  it('solves gage factor for a target span', () => {
    const r = solveCantileverForTargetSpan({
      ...baseInput(),
      unknown: 'gageFactor',
      gageFactor: 2,
    })
    expect(r.isValid, r.error).toBe(true)
    expect(r.solvedKey).toBe('gageFactor')
    expect(r.solvedValue).toBeGreaterThan(0)
    expect(r.designResult?.fullSpanSensitivity).toBeCloseTo(2.0, 8)
  })

  it('returns invalid for non-positive target span', () => {
    const r = solveCantileverForTargetSpan({
      ...baseInput(),
      targetMvV: 0,
    })
    expect(r.isValid).toBe(false)
    expect(r.error).toContain('Target span')
  })
})
