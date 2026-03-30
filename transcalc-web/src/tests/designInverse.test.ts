import { describe, expect, it } from 'vitest'
import { runDesign } from '../domain/orchestrator'
import {
  solveDualBeamForTargetSpan,
  solveReverseBeamForTargetSpan,
  solveSBeamForTargetSpan,
  solveSquareColumnForTargetSpan,
  solveRoundSolidColumnForTargetSpan,
  solveRoundHollowColumnForTargetSpan,
  solveSquareShearForTargetSpan,
  solveRoundShearForTargetSpan,
  solveRoundSBeamShearForTargetSpan,
  solveSquareTorqueForTargetSpan,
  solveRoundSolidTorqueForTargetSpan,
  solveRoundHollowTorqueForTargetSpan,
  solvePressureForTargetSpan,
} from '../domain/inverse/designInverse'

describe('design inverse solvers', () => {
  it('solves reverse beam load from target span', () => {
    const base = runDesign({
      type: 'reverseBeam',
      params: {
        appliedLoad: 100,
        beamWidth: 0.02,
        thickness: 0.005,
        distanceBetweenGages: 0.05,
        modulus: 200e9,
        gageLength: 0.01,
        gageFactor: 2.1,
      },
    })
    const r = solveReverseBeamForTargetSpan({
      targetMvV: base.fullSpanSensitivity,
      unknown: 'loadN',
      loadN: 1,
      beamWidthMm: 20,
      thicknessMm: 5,
      distanceBetweenGagesMm: 50,
      modulusGPa: 200,
      gageLengthMm: 10,
      gageFactor: 2.1,
    })
    expect(r.isValid, r.error).toBe(true)
    expect(r.solvedValue).toBeCloseTo(100, 6)
  })

  it('solves dual beam load from target span', () => {
    const base = runDesign({
      type: 'dualBeam',
      params: {
        appliedLoad: 100,
        beamWidth: 0.02,
        thickness: 0.005,
        distanceBetweenGages: 0.04,
        distanceLoadToCL: 0.06,
        modulus: 200e9,
        gageLength: 0.01,
        gageFactor: 2.1,
      },
    })
    const r = solveDualBeamForTargetSpan({
      targetMvV: base.fullSpanSensitivity,
      unknown: 'loadN',
      loadN: 1,
      beamWidthMm: 20,
      thicknessMm: 5,
      distanceBetweenGagesMm: 40,
      distanceLoadToClMm: 60,
      modulusGPa: 200,
      gageLengthMm: 10,
      gageFactor: 2.1,
    })
    expect(r.isValid, r.error).toBe(true)
    expect(r.solvedValue).toBeCloseTo(100, 6)
  })

  it('solves S-beam load from target span', () => {
    const base = runDesign({
      type: 'sBeam',
      params: {
        appliedLoad: 1000,
        holeRadius: 0.008,
        beamWidth: 0.04,
        thickness: 0.01,
        distanceBetweenGages: 0.05,
        modulus: 200e9,
        gageLength: 0.01,
        gageFactor: 2.1,
      },
    })
    const r = solveSBeamForTargetSpan({
      targetMvV: base.fullSpanSensitivity,
      unknown: 'loadN',
      loadN: 1,
      holeRadiusMm: 8,
      beamWidthMm: 40,
      thicknessMm: 10,
      distanceBetweenGagesMm: 50,
      modulusGPa: 200,
      gageLengthMm: 10,
      gageFactor: 2.1,
    })
    expect(r.isValid, r.error).toBe(true)
    expect(r.solvedValue).toBeCloseTo(1000, 4)
  })

  it('solves square column load from target span', () => {
    const base = runDesign({
      type: 'squareColumn',
      params: {
        appliedLoad: 10000,
        width: 25,
        depth: 25,
        modulus: 200,
        poissonRatio: 0.3,
        gageFactor: 2.1,
        usUnits: false,
      },
    })
    const r = solveSquareColumnForTargetSpan({
      targetMvV: base.fullSpanSensitivity,
      unknown: 'loadN',
      loadN: 1,
      widthMm: 25,
      depthMm: 25,
      modulusGPa: 200,
      poissonRatio: 0.3,
      gageFactor: 2.1,
    })
    expect(r.isValid, r.error).toBe(true)
    expect(r.solvedValue).toBeCloseTo(10000, 3)
  })

  it('solves round solid column load from target span', () => {
    const base = runDesign({
      type: 'roundSolidColumn',
      params: { appliedLoad: 10000, diameter: 25, modulus: 200, poissonRatio: 0.3, gageFactor: 2.1, usUnits: false },
    })
    const r = solveRoundSolidColumnForTargetSpan({
      targetMvV: base.fullSpanSensitivity,
      unknown: 'loadN',
      loadN: 1,
      diameterMm: 25,
      modulusGPa: 200,
      poissonRatio: 0.3,
      gageFactor: 2.1,
    })
    expect(r.isValid, r.error).toBe(true)
    expect(r.solvedValue).toBeCloseTo(10000, 3)
  })

  it('solves round hollow column load from target span', () => {
    const base = runDesign({
      type: 'roundHollowColumn',
      params: { appliedLoad: 10000, outerDiameter: 30, innerDiameter: 20, modulus: 200, poissonRatio: 0.3, gageFactor: 2.1, usUnits: false },
    })
    const r = solveRoundHollowColumnForTargetSpan({
      targetMvV: base.fullSpanSensitivity,
      unknown: 'loadN',
      loadN: 1,
      outerDiameterMm: 30,
      innerDiameterMm: 20,
      modulusGPa: 200,
      poissonRatio: 0.3,
      gageFactor: 2.1,
    })
    expect(r.isValid, r.error).toBe(true)
    expect(r.solvedValue).toBeCloseTo(10000, 3)
  })

  it('solves shear family load from target span', () => {
    const shearForward = (type: 'squareShear' | 'roundShear' | 'roundSBeamShear') =>
      runDesign({
        type,
        params: {
          load: 5000,
          width: 0.03,
          height: 0.05,
          diameter: 0.03,
          thickness: 0.005,
          modulus: 200e9,
          poisson: 0.3,
          gageFactor: 2.1,
        },
      }).fullSpanSensitivity

    const commonInput = {
      unknown: 'loadN' as const,
      loadN: 1,
      widthMm: 30,
      heightMm: 50,
      diameterMm: 30,
      thicknessMm: 5,
      modulusGPa: 200,
      poisson: 0.3,
      gageFactor: 2.1,
    }

    const sq = solveSquareShearForTargetSpan({ ...commonInput, targetMvV: shearForward('squareShear') })
    const rd = solveRoundShearForTargetSpan({ ...commonInput, targetMvV: shearForward('roundShear') })
    const rs = solveRoundSBeamShearForTargetSpan({ ...commonInput, targetMvV: shearForward('roundSBeamShear') })
    expect(sq.isValid, sq.error).toBe(true)
    expect(rd.isValid, rd.error).toBe(true)
    expect(rs.isValid, rs.error).toBe(true)
    expect(sq.solvedValue).toBeCloseTo(5000, 3)
    expect(rd.solvedValue).toBeCloseTo(5000, 3)
    expect(rs.solvedValue).toBeCloseTo(5000, 3)
  })

  it('solves square torque applied torque from target span', () => {
    const base = runDesign({
      type: 'squareTorque',
      params: {
        appliedTorque: 5000,
        width: 25,
        poisson: 0.3,
        modulus: 50000,
        gageLength: 12,
        gageFactor: 2.1,
        usUnits: false,
      },
    })
    const r = solveSquareTorqueForTargetSpan({
      targetMvV: base.fullSpanSensitivity,
      unknown: 'appliedTorqueNmm',
      appliedTorqueNmm: 1,
      widthMm: 25,
      poisson: 0.3,
      modulusGPa: 50000,
      gageLengthMm: 12,
      gageFactor: 2.1,
    })
    expect(r.isValid, r.error).toBe(true)
    expect(r.solvedValue).toBeCloseTo(5000, 2)
  })

  it('solves round solid torque applied torque from target span', () => {
    const base = runDesign({
      type: 'roundSolidTorque',
      params: { appliedTorque: 50, diameter: 0.025, modulus: 200e9, poissonRatio: 0.3, gageFactor: 2.1 },
    })
    const r = solveRoundSolidTorqueForTargetSpan({
      targetMvV: base.fullSpanSensitivity,
      unknown: 'appliedTorqueNm',
      appliedTorqueNm: 1,
      diameterMm: 25,
      modulusGPa: 200,
      poissonRatio: 0.3,
      gageFactor: 2.1,
    })
    expect(r.isValid, r.error).toBe(true)
    expect(r.solvedValue).toBeCloseTo(50, 4)
  })

  it('solves round hollow torque applied torque from target span', () => {
    const base = runDesign({
      type: 'roundHollowTorque',
      params: { appliedTorque: 50, outerDiameter: 0.03, innerDiameter: 0.02, modulus: 200e9, poissonRatio: 0.3, gageFactor: 2.1 },
    })
    const r = solveRoundHollowTorqueForTargetSpan({
      targetMvV: base.fullSpanSensitivity,
      unknown: 'appliedTorqueNm',
      appliedTorqueNm: 1,
      outerDiameterMm: 30,
      innerDiameterMm: 20,
      modulusGPa: 200,
      poissonRatio: 0.3,
      gageFactor: 2.1,
    })
    expect(r.isValid, r.error).toBe(true)
    expect(r.solvedValue).toBeCloseTo(50, 4)
  })

  it('solves pressure applied pressure from target span', () => {
    const base = runDesign({
      type: 'pressure',
      params: {
        appliedPressure: 1,
        thickness: 3,
        diameter: 40,
        poisson: 0.3,
        modulus: 200000,
        gageFactor: 2.1,
      },
    })
    const r = solvePressureForTargetSpan({
      targetMvV: base.fullSpanSensitivity,
      unknown: 'appliedPressureMPa',
      appliedPressureMPa: 1,
      thicknessMm: 3,
      diameterMm: 40,
      poisson: 0.3,
      modulusGPa: 200,
      gageFactor: 2.1,
    })
    expect(r.isValid, r.error).toBe(true)
    expect(r.solvedValue).toBeCloseTo(1, 6)
  })

  it('solves representative geometry unknowns via bisection', () => {
    const reverseBase = runDesign({
      type: 'reverseBeam',
      params: {
        appliedLoad: 100,
        beamWidth: 0.02,
        thickness: 0.005,
        distanceBetweenGages: 0.05,
        modulus: 200e9,
        gageLength: 0.01,
        gageFactor: 2.1,
      },
    })
    const reverse = solveReverseBeamForTargetSpan({
      targetMvV: reverseBase.fullSpanSensitivity,
      unknown: 'thicknessMm',
      loadN: 100,
      beamWidthMm: 20,
      thicknessMm: 2,
      distanceBetweenGagesMm: 50,
      modulusGPa: 200,
      gageLengthMm: 10,
      gageFactor: 2.1,
    })
    expect(reverse.isValid, reverse.error).toBe(true)
    expect(reverse.solvedValue).toBeCloseTo(5, 5)

    const squareBase = runDesign({
      type: 'squareColumn',
      params: {
        appliedLoad: 10000,
        width: 25,
        depth: 25,
        modulus: 200,
        poissonRatio: 0.3,
        gageFactor: 2.1,
        usUnits: false,
      },
    })
    const square = solveSquareColumnForTargetSpan({
      targetMvV: squareBase.fullSpanSensitivity,
      unknown: 'widthMm',
      loadN: 10000,
      widthMm: 40,
      depthMm: 25,
      modulusGPa: 200,
      poissonRatio: 0.3,
      gageFactor: 2.1,
    })
    expect(square.isValid, square.error).toBe(true)
    expect(square.solvedValue).toBeCloseTo(25, 3)

    const pressureBase = runDesign({
      type: 'pressure',
      params: {
        appliedPressure: 1,
        thickness: 3,
        diameter: 40,
        poisson: 0.3,
        modulus: 200000,
        gageFactor: 2.1,
      },
    })
    const pressure = solvePressureForTargetSpan({
      targetMvV: pressureBase.fullSpanSensitivity,
      unknown: 'thicknessMm',
      appliedPressureMPa: 1,
      thicknessMm: 1,
      diameterMm: 40,
      poisson: 0.3,
      modulusGPa: 200,
      gageFactor: 2.1,
    })
    expect(pressure.isValid, pressure.error).toBe(true)
    expect(pressure.solvedValue).toBeCloseTo(3, 4)
  })
})
