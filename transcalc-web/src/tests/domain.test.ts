import { describe, it, expect } from 'vitest'
import { computeCantileverStress } from '../domain/core'

describe('computeCantileverStress', () => {
  it('computes expected stress for a simple case', () => {
    const stress = computeCantileverStress(100, 25, 2, 100)
    // manual calculation: moment=100*100=10000 Nmm; Z=(25*4)/6=100/6=16.6667; stress=10000/16.6667=600
    expect(Number(stress.toFixed(3))).toBeCloseTo(600, 1)
  })
})
