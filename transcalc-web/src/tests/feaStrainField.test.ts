import { describe, expect, it } from 'vitest'
import {
  estimateCantileverExxRangeMicrostrain,
  evaluateCantileverBendingStrainTensorMicrostrain,
} from '../domain/fea/cantilever'

const INPUT = {
  appliedForceN: 100,
  beamWidthMm: 25,
  thicknessMm: 2,
  loadPointToGageClLengthMm: 100,
  modulusGPa: 200,
  gageLengthMm: 5,
  gageFactor: 2.1,
}

describe('cantilever strain field scaffold', () => {
  it('has larger |exx| near fixed end than free end', () => {
    const fixedTop = evaluateCantileverBendingStrainTensorMicrostrain(INPUT, 0, INPUT.thicknessMm / 2)
    const freeTop = evaluateCantileverBendingStrainTensorMicrostrain(
      INPUT,
      INPUT.loadPointToGageClLengthMm,
      INPUT.thicknessMm / 2
    )
    expect(Math.abs(fixedTop.exx)).toBeGreaterThan(Math.abs(freeTop.exx))
  })

  it('range includes both compression/tension at clamp surfaces', () => {
    const range = estimateCantileverExxRangeMicrostrain(INPUT)
    expect(range.minExx).toBeLessThanOrEqual(0)
    expect(range.maxExx).toBeGreaterThanOrEqual(0)
    expect(range.maxExx).toBeGreaterThan(Math.abs(range.minExx) * 0.9)
  })
})
