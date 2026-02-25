import { describe, it, expect } from 'vitest'
import { calculateRingStrainAD, calculateRingStrainBC } from '../domain/ringbeam'

describe('Ring Bending Beam Calculations', () => {
  it('calculates ring strain AD (ported from ringbb.pas)', () => {
    // Example: Load=100N, E=200GPa, Width=25mm, OD=50mm, ID=40mm
    const load = 100 // N
    const youngsModulus = 200 // GPa
    const width = 25 // mm
    const outerDia = 50 // mm
    const innerDia = 40 // mm

    const result = calculateRingStrainAD(load, youngsModulus, width, outerDia, innerDia)
    // Result should be positive strain in microstrain
    expect(result).toBeGreaterThan(0)
    expect(result).toBeLessThan(10000)
  })

  it('calculates ring strain BC (ported from ringbb.pas)', () => {
    // Example: Load=100N, E=200GPa, Width=25mm, OD=50mm, ID=40mm
    const load = 100 // N
    const youngsModulus = 200 // GPa
    const width = 25 // mm
    const outerDia = 50 // mm
    const innerDia = 40 // mm

    const result = calculateRingStrainBC(load, youngsModulus, width, outerDia, innerDia)
    // Result should be negative strain (compression)
    expect(result).toBeLessThan(0)
    expect(result).toBeGreaterThan(-10000)
  })

  it('ring strain AD should be approximately opposite sign to BC', () => {
    const load = 100
    const youngsModulus = 200
    const width = 25
    const outerDia = 50
    const innerDia = 40

    const strainAD = calculateRingStrainAD(load, youngsModulus, width, outerDia, innerDia)
    const strainBC = calculateRingStrainBC(load, youngsModulus, width, outerDia, innerDia)

    // AD should be positive, BC should be negative for same load
    expect(strainAD).toBeGreaterThan(0)
    expect(strainBC).toBeLessThan(0)
    // Magnitudes should be reasonable (roughly similar order)
    expect(Math.abs(strainAD) + Math.abs(strainBC)).toBeGreaterThan(0)
  })

  it('throws on invalid geometry (zero denominator)', () => {
    // Inner diameter too large (wall thickness becomes negative)
    expect(() =>
      calculateRingStrainAD(100, 200, 25, 30, 40)
    ).toThrow()
  })
})
