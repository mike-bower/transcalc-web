import { describe, expect, it } from 'vitest'
import {
  postProcessGaugeStrainContract,
  runCantileverFeaScaffold,
} from '../domain/fea/cantilever'

describe('cantilever FEA scaffold', () => {
  it('postProcessGaugeStrainContract computes nominal, variation, and span', () => {
    const result = postProcessGaugeStrainContract({
      samples: [
        { xMm: 97.5, strainMicrostrain: 100 },
        { xMm: 100, strainMicrostrain: 110 },
        { xMm: 102.5, strainMicrostrain: 120 },
      ],
      gageFactor: 2,
    })

    expect(result.nominalStrainMicrostrain).toBeCloseTo(110, 9)
    expect(result.minStrainMicrostrain).toBeCloseTo(100, 9)
    expect(result.maxStrainMicrostrain).toBeCloseTo(120, 9)
    expect(result.strainVariationPercent).toBeCloseTo((20 / 120) * 100, 9)
    expect(result.spanMvV).toBeCloseTo(0.22, 9)
  })

  it('runCantileverFeaScaffold returns mesh + gauge outputs', () => {
    const result = runCantileverFeaScaffold({
      appliedForceN: 100,
      beamWidthMm: 25,
      thicknessMm: 2,
      loadPointToGageClLengthMm: 100,
      modulusGPa: 200,
      gageLengthMm: 5,
      gageFactor: 2.1,
    })

    expect(result.solver).toBe('linear-cst-2d')
    expect(result.mesh.elements).toBeGreaterThan(0)
    expect(result.mesh.nodes).toBeGreaterThan(0)
    expect(result.samples.length).toBeGreaterThan(0)
    expect(result.solution.solver).toBe('linear-cst-2d')
    expect(result.gauge.nominalStrainMicrostrain).toBeGreaterThan(0)
    expect(result.gauge.strainVariationPercent).toBeGreaterThan(0)
    expect(result.gauge.spanMvV).toBeGreaterThan(0)
    expect(result.warnings.length).toBeGreaterThan(0)
  })
})
