import { describe, expect, it } from 'vitest'
import {
  solveBinoBeamForTargetSpan,
  type BinoBeamInverseInput,
} from '../domain/inverse/binoBeamInverse'
import { runDesign } from '../domain/orchestrator'

function baseInput(): BinoBeamInverseInput {
  return {
    targetMvV: 2.0,
    unknown: 'loadN',
    loadN: 100,
    distanceBetweenHolesMm: 100,
    radiusMm: 5,
    beamWidthMm: 25,
    beamHeightMm: 14,
    minimumThicknessMm: 2,
    youngsModulusGPa: 200,
    gageLengthMm: 5,
    gageFactor: 2.0,
  }
}

describe('solveBinoBeamForTargetSpan', () => {
  it('solves load for target span', () => {
    const r = solveBinoBeamForTargetSpan(baseInput())
    expect(r.isValid, r.error).toBe(true)
    expect(r.solvedKey).toBe('loadN')
    expect(r.solvedValue).toBeGreaterThan(0)
    expect(r.designResult?.fullSpanSensitivity).toBeCloseTo(2.0, 6)
  })

  it('solves minimum thickness for target span', () => {
    const lowEval = runDesign({
      type: 'binoBeam',
      params: {
        appliedLoad: 100,
        distanceBetweenHoles: 0.1,
        radius: 0.005,
        beamWidth: 0.025,
        beamHeight: 0.014,
        distanceLoadHole: 0,
        minimumThickness: 0.0002,
        modulus: 200e9,
        gageLength: 0.005,
        gageFactor: 2.0,
      },
    })
    const highEval = runDesign({
      type: 'binoBeam',
      params: {
        appliedLoad: 100,
        distanceBetweenHoles: 0.1,
        radius: 0.005,
        beamWidth: 0.025,
        beamHeight: 0.014,
        distanceLoadHole: 0,
        minimumThickness: 0.0019999,
        modulus: 200e9,
        gageLength: 0.005,
        gageFactor: 2.0,
      },
    })
    const feasibleTarget = (lowEval.fullSpanSensitivity + highEval.fullSpanSensitivity) / 2

    const r = solveBinoBeamForTargetSpan({
      ...baseInput(),
      unknown: 'minimumThicknessMm',
      targetMvV: feasibleTarget,
      minimumThicknessMm: 1.8,
    })
    expect(r.isValid, r.error).toBe(true)
    expect(r.solvedKey).toBe('minimumThicknessMm')
    expect(r.solvedValue).toBeGreaterThan(0)
    expect(r.designResult?.fullSpanSensitivity).toBeCloseTo(feasibleTarget, 0)
  })

  it('returns invalid when thickness target is outside achievable range', () => {
    const r = solveBinoBeamForTargetSpan({
      ...baseInput(),
      unknown: 'minimumThicknessMm',
      targetMvV: 200,
    })
    expect(r.isValid).toBe(false)
    expect(r.error).toContain('outside achievable range')
  })
})
