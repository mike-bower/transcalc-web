import { describe, expect, it } from 'vitest'
import { generateCantileverMeshStep } from '../domain/fea/stepExport'

describe('STEP export', () => {
  it('generates STEP text with expected envelope and mesh entities', () => {
    const step = generateCantileverMeshStep(
      {
        appliedForceN: 100,
        beamWidthMm: 25,
        thicknessMm: 2,
        loadPointToGageClLengthMm: 100,
        modulusGPa: 200,
        gageLengthMm: 5,
        gageFactor: 2.1,
      },
      {
        elementsAlongLength: 4,
        elementsThroughThickness: 2,
        elementsAcrossWidth: 1,
      }
    )

    expect(step).toContain('ISO-10303-21;')
    expect(step).toContain('FILE_SCHEMA')
    expect(step).toContain('CARTESIAN_POINT')
    expect(step).toContain('POLYLINE')
    expect(step).toContain('GEOMETRIC_CURVE_SET')
    expect(step).toContain('END-ISO-10303-21;')
  })
})
