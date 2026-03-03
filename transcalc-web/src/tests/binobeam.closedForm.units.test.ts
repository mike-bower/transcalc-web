import { describe, it, expect } from 'vitest'
import { calculateBinobeamStrainExplicit } from '../domain/binobeam'

describe('binobeam closed-form unit switching', () => {
  it('accepts SI values converted from US defaults near geometric limit', () => {
    expect(() =>
      calculateBinobeamStrainExplicit(
        {
          appliedLoad: 99.99996611,
          distanceBetweenHoles: 99.9998,
          radius: 5.00126,
          beamWidth: 25.00122,
          beamHeight: 14.00048,
          distanceLoadHole: 0,
          minimumThickness: 1.99898,
          modulus: 200.00005441,
          gageLength: 5.00126,
          gageFactor: 2.1,
        },
        'SI'
      )
    ).not.toThrow()
  })
})
