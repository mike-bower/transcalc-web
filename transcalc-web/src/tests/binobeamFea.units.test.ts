import { describe, it, expect } from 'vitest'
import { solveBinobeamFea } from '../domain/fea/binobeamSolver'

describe('binobeam FEA units', () => {
  it('solves equivalent US and SI inputs from the binocular defaults', () => {
    const us = solveBinobeamFea({
      unitSystem: 'US',
      appliedForce: 22.4809,
      distanceBetweenGageCls: 3.937,
      radius: 0.1969,
      beamWidth: 0.9843,
      beamHeight: 0.5512,
      minimumThickness: 0.0787,
      modulus: 29.0075,
      gageLength: 0.1969,
      gageFactor: 2.1,
    })

    const si = solveBinobeamFea({
      unitSystem: 'SI',
      appliedForce: 99.99996611,
      distanceBetweenGageCls: 99.9998,
      radius: 5.00126,
      beamWidth: 25.00122,
      beamHeight: 14.00048,
      minimumThickness: 1.99898,
      modulus: 200.00005441,
      gageLength: 5.00126,
      gageFactor: 2.1,
    })

    expect(us.nodes).toBeGreaterThan(0)
    expect(si.nodes).toBeGreaterThan(0)
    expect(si.gaugeNominalStrainMicrostrain).toBeGreaterThan(0)
  })

  it('stays solvable under 4-decimal SI rounding from UI unit toggle', () => {
    expect(() =>
      solveBinobeamFea({
        unitSystem: 'SI',
        appliedForce: 100,
        distanceBetweenGageCls: 99.9998,
        radius: 5.0013,
        beamWidth: 25.0012,
        beamHeight: 14.0005,
        minimumThickness: 1.999,
        modulus: 200.0001,
        gageLength: 5.0013,
        gageFactor: 2.1,
      })
    ).not.toThrow()
  })

  it('removes material in the center slot between hole centerlines', () => {
    const result = solveBinobeamFea({
      unitSystem: 'US',
      appliedForce: 22.4809,
      distanceBetweenGageCls: 3.937,
      radius: 0.1969,
      beamWidth: 0.9843,
      beamHeight: 0.5512,
      minimumThickness: 0.0787,
      modulus: 29.0075,
      gageLength: 0.1969,
      gageFactor: 2.1,
    })

    const nearCenterNodes = result.meshNodes.filter((n) => Math.abs(n.xM) < 0.01 && Math.abs(n.yM) < 0.003)
    expect(nearCenterNodes.length).toBe(0)
  })

  it('includes key geometry anchors from user input in the generated mesh', () => {
    const distanceBetweenGageCls = 3.937
    const radius = 0.1969
    const result = solveBinobeamFea({
      unitSystem: 'US',
      appliedForce: 22.4809,
      distanceBetweenGageCls,
      radius,
      beamWidth: 0.9843,
      beamHeight: 0.5512,
      minimumThickness: 0.0787,
      modulus: 29.0075,
      gageLength: 0.1969,
      gageFactor: 2.1,
    })

    const mPerIn = 0.0254
    const halfL = (distanceBetweenGageCls * mPerIn) / 2
    const rM = radius * mPerIn
    const tol = 1e-12

    const xSet = new Set(result.meshNodes.map((n) => n.xM.toFixed(12)))
    expect(xSet.has((-halfL).toFixed(12))).toBe(true)
    expect(xSet.has((halfL).toFixed(12))).toBe(true)
    expect(xSet.has((-(halfL + rM)).toFixed(12))).toBe(true)
    expect(xSet.has((-(halfL - rM)).toFixed(12))).toBe(true)
    expect(xSet.has(((halfL - rM)).toFixed(12))).toBe(true)
    expect(xSet.has(((halfL + rM)).toFixed(12))).toBe(true)

    const slotInteriorNodes = result.meshNodes.filter(
      (n) => n.xM > -halfL + tol && n.xM < halfL - tol && Math.abs(n.yM) < rM - tol
    )
    expect(slotInteriorNodes.length).toBe(0)
  })

  it('matches binocular outer profile length from design parameters', () => {
    const distanceBetweenGageCls = 3.937
    const radius = 0.1969
    const minimumThickness = 0.0787
    const result = solveBinobeamFea({
      unitSystem: 'US',
      appliedForce: 22.4809,
      distanceBetweenGageCls,
      radius,
      beamWidth: 0.9843,
      beamHeight: 0.5512,
      minimumThickness,
      modulus: 29.0075,
      gageLength: 0.1969,
      gageFactor: 2.1,
    })

    const mPerIn = 0.0254
    const expectedLength = (distanceBetweenGageCls + 2 * (radius + minimumThickness)) * mPerIn
    const minX = Math.min(...result.meshNodes.map((n) => n.xM))
    const maxX = Math.max(...result.meshNodes.map((n) => n.xM))
    const actualLength = maxX - minX
    expect(actualLength).toBeCloseTo(expectedLength, 12)
  })
})
