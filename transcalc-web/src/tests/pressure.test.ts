import { describe, it, expect } from 'vitest'
import { calculateRadial, calculateTangential } from '../domain/pressure'

// Use a simple numeric check derived from the Delphi formula
// For a small example: pressure=1, thickness=1, diameter=2, poisson=0.3, elasticity=200000
// radial = (-3 * 1 * (1)^2 * (1 - 0.09)) / (4 * 1^2 * 200000) * 1e6

describe('pressure solvers', () => {
  it('calculateRadial matches expected', () => {
    const pressure = 1
    const thickness = 1
    const diameter = 2
    const poisson = 0.3
    const elasticity = 200000
    const radial = calculateRadial(pressure, thickness, diameter, poisson, elasticity)
    const expected = (-3 * pressure * Math.pow(diameter / 2, 2) * (1 - Math.pow(poisson, 2))) / (4 * Math.pow(thickness, 2) * elasticity) * 1e6
    expect(radial).toBeCloseTo(expected, 9)
  })

  it('calculateTangential matches expected', () => {
    const pressure = 1
    const thickness = 1
    const diameter = 2
    const poisson = 0.3
    const elasticity = 200000
    const tangent = calculateTangential(pressure, thickness, diameter, poisson, elasticity)
    const expected = (3 * pressure * Math.pow(diameter / 2, 2) * (1 - Math.pow(poisson, 2))) / (8 * Math.pow(thickness, 2) * elasticity) * 1e6
    expect(tangent).toBeCloseTo(expected, 9)
  })
})
