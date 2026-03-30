import { runDesign, type DesignResult } from '../orchestrator'

type InverseResult<TInput, TUnknown extends string> = {
  isValid: boolean
  solvedValue?: number
  solvedKey?: TUnknown
  solvedInput?: TInput
  designResult?: DesignResult
  warnings: string[]
  error?: string
}

const MM_TO_M = 1e-3
const GPA_TO_PA = 1e9

function requirePositive(name: string, value: number): void {
  if (!Number.isFinite(value) || value <= 0) {
    throw new Error(`${name} must be a positive finite value`)
  }
}

function scaleSolve(
  targetMvV: number,
  evaluateAtUnit: () => DesignResult
): { value: number; design: DesignResult } {
  const atUnit = evaluateAtUnit()
  if (!atUnit.isValid) throw new Error(atUnit.error ?? 'Design evaluation failed at unit load.')
  if (!Number.isFinite(atUnit.fullSpanSensitivity) || atUnit.fullSpanSensitivity <= 0) {
    throw new Error('Unit-load sensitivity must be positive and finite.')
  }
  const value = targetMvV / atUnit.fullSpanSensitivity
  if (!Number.isFinite(value) || value <= 0) throw new Error('Solved value is not physically valid.')
  return { value, design: atUnit }
}

function sampleBracket(
  fn: (x: number) => number,
  min: number,
  max: number,
  target: number
): { low: number; high: number } | null {
  const n = 100
  let prevX = min
  let prevF = fn(prevX) - target
  for (let i = 1; i <= n; i += 1) {
    const t = i / n
    const x = min * Math.pow(max / min, t)
    const f = fn(x) - target
    if (Number.isFinite(prevF) && Number.isFinite(f) && prevF * f <= 0) return { low: prevX, high: x }
    prevX = x
    prevF = f
  }
  return null
}

function bisectionSolve(
  fn: (x: number) => number,
  target: number,
  min: number,
  max: number,
  tol = 1e-6
): number {
  const bracket = sampleBracket(fn, min, max, target)
  if (!bracket) throw new Error('Target span is outside achievable range for this unknown.')
  let low = bracket.low
  let high = bracket.high
  let fLow = fn(low) - target

  for (let i = 0; i < 80; i += 1) {
    const mid = 0.5 * (low + high)
    const fMid = fn(mid) - target
    if (Math.abs(fMid) <= tol || Math.abs(high - low) <= 1e-9) return mid
    if (fLow * fMid <= 0) {
      high = mid
    } else {
      low = mid
      fLow = fMid
    }
  }
  return 0.5 * (low + high)
}

function finalize<TInput, TUnknown extends string>(
  unknown: TUnknown,
  solvedValue: number,
  solvedInput: TInput,
  evaluateSolved: () => DesignResult
): InverseResult<TInput, TUnknown> {
  const designResult = evaluateSolved()
  if (!designResult.isValid) {
    return {
      isValid: false,
      warnings: [],
      error: designResult.error ?? 'Design validation failed at solved value.',
    }
  }
  return {
    isValid: true,
    solvedValue,
    solvedKey: unknown,
    solvedInput,
    designResult,
    warnings: [],
  }
}

// Reverse Bending Beam
export type ReverseBeamUnknown = 'loadN' | 'thicknessMm'
export type ReverseBeamInverseInput = {
  targetMvV: number
  unknown: ReverseBeamUnknown
  loadN: number
  beamWidthMm: number
  thicknessMm: number
  distanceBetweenGagesMm: number
  modulusGPa: number
  gageLengthMm: number
  gageFactor: number
}

export function solveReverseBeamForTargetSpan(
  input: ReverseBeamInverseInput
): InverseResult<ReverseBeamInverseInput, ReverseBeamUnknown> {
  try {
    requirePositive('Target span', input.targetMvV)
    requirePositive('Beam width', input.beamWidthMm)
    requirePositive('Distance between gages', input.distanceBetweenGagesMm)
    requirePositive('Modulus', input.modulusGPa)
    requirePositive('Gage length', input.gageLengthMm)
    requirePositive('Gage factor', input.gageFactor)

    const evalSpan = (loadN: number, thicknessMm: number): DesignResult =>
      runDesign({
        type: 'reverseBeam',
        params: {
          appliedLoad: loadN,
          beamWidth: input.beamWidthMm * MM_TO_M,
          thickness: thicknessMm * MM_TO_M,
          distanceBetweenGages: input.distanceBetweenGagesMm * MM_TO_M,
          modulus: input.modulusGPa * GPA_TO_PA,
          gageLength: input.gageLengthMm * MM_TO_M,
          gageFactor: input.gageFactor,
        },
      })

    if (input.unknown === 'loadN') {
      const solved = scaleSolve(input.targetMvV, () => evalSpan(1, input.thicknessMm)).value
      return finalize(input.unknown, solved, { ...input, loadN: solved }, () => evalSpan(solved, input.thicknessMm))
    }

    requirePositive('Load', input.loadN)
    const solved = bisectionSolve(
      (thicknessMm) => {
        const r = evalSpan(input.loadN, thicknessMm)
        if (!r.isValid) throw new Error(r.error ?? 'Invalid reverse beam thickness')
        return r.fullSpanSensitivity
      },
      input.targetMvV,
      1e-4,
      1e4
    )
    return finalize(input.unknown, solved, { ...input, thicknessMm: solved }, () => evalSpan(input.loadN, solved))
  } catch (err) {
    return { isValid: false, warnings: [], error: err instanceof Error ? err.message : String(err) }
  }
}

// Dual Beam
export type DualBeamUnknown = 'loadN' | 'thicknessMm'
export type DualBeamInverseInput = {
  targetMvV: number
  unknown: DualBeamUnknown
  loadN: number
  beamWidthMm: number
  thicknessMm: number
  distanceBetweenGagesMm: number
  distanceLoadToClMm: number
  modulusGPa: number
  gageLengthMm: number
  gageFactor: number
}

export function solveDualBeamForTargetSpan(
  input: DualBeamInverseInput
): InverseResult<DualBeamInverseInput, DualBeamUnknown> {
  try {
    requirePositive('Target span', input.targetMvV)
    requirePositive('Beam width', input.beamWidthMm)
    requirePositive('Distance between gages', input.distanceBetweenGagesMm)
    requirePositive('Modulus', input.modulusGPa)
    requirePositive('Gage length', input.gageLengthMm)
    requirePositive('Gage factor', input.gageFactor)

    const evalSpan = (loadN: number, thicknessMm: number): DesignResult =>
      runDesign({
        type: 'dualBeam',
        params: {
          appliedLoad: loadN,
          beamWidth: input.beamWidthMm * MM_TO_M,
          thickness: thicknessMm * MM_TO_M,
          distanceBetweenGages: input.distanceBetweenGagesMm * MM_TO_M,
          distanceLoadToCL: input.distanceLoadToClMm * MM_TO_M,
          modulus: input.modulusGPa * GPA_TO_PA,
          gageLength: input.gageLengthMm * MM_TO_M,
          gageFactor: input.gageFactor,
        },
      })

    if (input.unknown === 'loadN') {
      const solved = scaleSolve(input.targetMvV, () => evalSpan(1, input.thicknessMm)).value
      return finalize(input.unknown, solved, { ...input, loadN: solved }, () => evalSpan(solved, input.thicknessMm))
    }

    requirePositive('Load', input.loadN)
    const solved = bisectionSolve(
      (thicknessMm) => {
        const r = evalSpan(input.loadN, thicknessMm)
        if (!r.isValid) throw new Error(r.error ?? 'Invalid dual beam thickness')
        return r.fullSpanSensitivity
      },
      input.targetMvV,
      1e-4,
      1e4
    )
    return finalize(input.unknown, solved, { ...input, thicknessMm: solved }, () => evalSpan(input.loadN, solved))
  } catch (err) {
    return { isValid: false, warnings: [], error: err instanceof Error ? err.message : String(err) }
  }
}

// S-Beam
export type SBeamUnknown = 'loadN' | 'thicknessMm'
export type SBeamInverseInput = {
  targetMvV: number
  unknown: SBeamUnknown
  loadN: number
  holeRadiusMm: number
  beamWidthMm: number
  thicknessMm: number
  distanceBetweenGagesMm: number
  modulusGPa: number
  gageLengthMm: number
  gageFactor: number
}

export function solveSBeamForTargetSpan(
  input: SBeamInverseInput
): InverseResult<SBeamInverseInput, SBeamUnknown> {
  try {
    requirePositive('Target span', input.targetMvV)
    requirePositive('Hole radius', input.holeRadiusMm)
    requirePositive('Beam width', input.beamWidthMm)
    requirePositive('Distance between gages', input.distanceBetweenGagesMm)
    requirePositive('Modulus', input.modulusGPa)
    requirePositive('Gage length', input.gageLengthMm)
    requirePositive('Gage factor', input.gageFactor)

    const evalSpan = (loadN: number, thicknessMm: number): DesignResult =>
      runDesign({
        type: 'sBeam',
        params: {
          appliedLoad: loadN,
          holeRadius: input.holeRadiusMm * MM_TO_M,
          beamWidth: input.beamWidthMm * MM_TO_M,
          thickness: thicknessMm * MM_TO_M,
          distanceBetweenGages: input.distanceBetweenGagesMm * MM_TO_M,
          modulus: input.modulusGPa * GPA_TO_PA,
          gageLength: input.gageLengthMm * MM_TO_M,
          gageFactor: input.gageFactor,
        },
      })

    if (input.unknown === 'loadN') {
      const solved = scaleSolve(input.targetMvV, () => evalSpan(1, input.thicknessMm)).value
      return finalize(input.unknown, solved, { ...input, loadN: solved }, () => evalSpan(solved, input.thicknessMm))
    }

    requirePositive('Load', input.loadN)
    const low = Math.max(input.holeRadiusMm * 1.001, 1e-4)
    const solved = bisectionSolve(
      (thicknessMm) => {
        const r = evalSpan(input.loadN, thicknessMm)
        if (!r.isValid) throw new Error(r.error ?? 'Invalid S-beam thickness')
        return r.fullSpanSensitivity
      },
      input.targetMvV,
      low,
      1e4
    )
    return finalize(input.unknown, solved, { ...input, thicknessMm: solved }, () => evalSpan(input.loadN, solved))
  } catch (err) {
    return { isValid: false, warnings: [], error: err instanceof Error ? err.message : String(err) }
  }
}

// Square Column
export type SquareColumnUnknown = 'loadN' | 'widthMm'
export type SquareColumnInverseInput = {
  targetMvV: number
  unknown: SquareColumnUnknown
  loadN: number
  widthMm: number
  depthMm: number
  modulusGPa: number
  poissonRatio: number
  gageFactor: number
}

export function solveSquareColumnForTargetSpan(
  input: SquareColumnInverseInput
): InverseResult<SquareColumnInverseInput, SquareColumnUnknown> {
  try {
    requirePositive('Target span', input.targetMvV)
    requirePositive('Depth', input.depthMm)
    requirePositive('Modulus', input.modulusGPa)
    requirePositive('Gage factor', input.gageFactor)

    const evalSpan = (loadN: number, widthMm: number): DesignResult =>
      runDesign({
        type: 'squareColumn',
        params: {
          appliedLoad: loadN,
          width: widthMm,
          depth: input.depthMm,
          modulus: input.modulusGPa,
          poissonRatio: input.poissonRatio,
          gageFactor: input.gageFactor,
          usUnits: false,
        },
      })

    if (input.unknown === 'loadN') {
      const solved = scaleSolve(input.targetMvV, () => evalSpan(1, input.widthMm)).value
      return finalize(input.unknown, solved, { ...input, loadN: solved }, () => evalSpan(solved, input.widthMm))
    }

    requirePositive('Load', input.loadN)
    const solved = bisectionSolve(
      (widthMm) => {
        const r = evalSpan(input.loadN, widthMm)
        if (!r.isValid) throw new Error(r.error ?? 'Invalid square column width')
        return r.fullSpanSensitivity
      },
      input.targetMvV,
      1e-4,
      1e4
    )
    return finalize(input.unknown, solved, { ...input, widthMm: solved }, () => evalSpan(input.loadN, solved))
  } catch (err) {
    return { isValid: false, warnings: [], error: err instanceof Error ? err.message : String(err) }
  }
}

// Round Solid Column
export type RoundSolidColumnUnknown = 'loadN' | 'diameterMm'
export type RoundSolidColumnInverseInput = {
  targetMvV: number
  unknown: RoundSolidColumnUnknown
  loadN: number
  diameterMm: number
  modulusGPa: number
  poissonRatio: number
  gageFactor: number
}

export function solveRoundSolidColumnForTargetSpan(
  input: RoundSolidColumnInverseInput
): InverseResult<RoundSolidColumnInverseInput, RoundSolidColumnUnknown> {
  try {
    requirePositive('Target span', input.targetMvV)
    requirePositive('Modulus', input.modulusGPa)
    requirePositive('Poisson ratio surrogate', input.poissonRatio + 1)
    requirePositive('Gage factor', input.gageFactor)

    const evalSpan = (loadN: number, diameterMm: number): DesignResult =>
      runDesign({
        type: 'roundSolidColumn',
        params: {
          appliedLoad: loadN,
          diameter: diameterMm,
          modulus: input.modulusGPa,
          poissonRatio: input.poissonRatio,
          gageFactor: input.gageFactor,
          usUnits: false,
        },
      })

    if (input.unknown === 'loadN') {
      const solved = scaleSolve(input.targetMvV, () => evalSpan(1, input.diameterMm)).value
      return finalize(input.unknown, solved, { ...input, loadN: solved }, () => evalSpan(solved, input.diameterMm))
    }

    requirePositive('Load', input.loadN)
    const solved = bisectionSolve(
      (diameterMm) => {
        const r = evalSpan(input.loadN, diameterMm)
        if (!r.isValid) throw new Error(r.error ?? 'Invalid round solid column diameter')
        return r.fullSpanSensitivity
      },
      input.targetMvV,
      1e-4,
      1e4
    )
    return finalize(input.unknown, solved, { ...input, diameterMm: solved }, () => evalSpan(input.loadN, solved))
  } catch (err) {
    return { isValid: false, warnings: [], error: err instanceof Error ? err.message : String(err) }
  }
}

// Round Hollow Column
export type RoundHollowColumnUnknown = 'loadN' | 'outerDiameterMm'
export type RoundHollowColumnInverseInput = {
  targetMvV: number
  unknown: RoundHollowColumnUnknown
  loadN: number
  outerDiameterMm: number
  innerDiameterMm: number
  modulusGPa: number
  poissonRatio: number
  gageFactor: number
}

export function solveRoundHollowColumnForTargetSpan(
  input: RoundHollowColumnInverseInput
): InverseResult<RoundHollowColumnInverseInput, RoundHollowColumnUnknown> {
  try {
    requirePositive('Target span', input.targetMvV)
    requirePositive('Inner diameter', input.innerDiameterMm)
    requirePositive('Modulus', input.modulusGPa)
    requirePositive('Gage factor', input.gageFactor)

    const evalSpan = (loadN: number, outerDiameterMm: number): DesignResult =>
      runDesign({
        type: 'roundHollowColumn',
        params: {
          appliedLoad: loadN,
          outerDiameter: outerDiameterMm,
          innerDiameter: input.innerDiameterMm,
          modulus: input.modulusGPa,
          poissonRatio: input.poissonRatio,
          gageFactor: input.gageFactor,
          usUnits: false,
        },
      })

    if (input.unknown === 'loadN') {
      const solved = scaleSolve(input.targetMvV, () => evalSpan(1, input.outerDiameterMm)).value
      return finalize(input.unknown, solved, { ...input, loadN: solved }, () => evalSpan(solved, input.outerDiameterMm))
    }

    requirePositive('Load', input.loadN)
    const solved = bisectionSolve(
      (outerDiameterMm) => {
        const r = evalSpan(input.loadN, outerDiameterMm)
        if (!r.isValid) throw new Error(r.error ?? 'Invalid round hollow outer diameter')
        return r.fullSpanSensitivity
      },
      input.targetMvV,
      input.innerDiameterMm * 1.001,
      1e4
    )
    return finalize(input.unknown, solved, { ...input, outerDiameterMm: solved }, () => evalSpan(input.loadN, solved))
  } catch (err) {
    return { isValid: false, warnings: [], error: err instanceof Error ? err.message : String(err) }
  }
}

// Shear family
export type ShearUnknown = 'loadN' | 'thicknessMm'
export type ShearInverseInput = {
  targetMvV: number
  unknown: ShearUnknown
  loadN: number
  widthMm: number
  heightMm: number
  diameterMm: number
  thicknessMm: number
  modulusGPa: number
  poisson: number
  gageFactor: number
}

function solveShearType(
  type: 'squareShear' | 'roundShear' | 'roundSBeamShear',
  input: ShearInverseInput
): InverseResult<ShearInverseInput, ShearUnknown> {
  try {
    requirePositive('Target span', input.targetMvV)
    requirePositive('Width', input.widthMm)
    requirePositive('Height', input.heightMm)
    requirePositive('Diameter', input.diameterMm)
    requirePositive('Modulus', input.modulusGPa)
    requirePositive('Gage factor', input.gageFactor)

    const evalSpan = (loadN: number, thicknessMm: number): DesignResult =>
      runDesign({
        type,
        params: {
          load: loadN,
          width: input.widthMm * MM_TO_M,
          height: input.heightMm * MM_TO_M,
          diameter: input.diameterMm * MM_TO_M,
          thickness: thicknessMm * MM_TO_M,
          modulus: input.modulusGPa * GPA_TO_PA,
          poisson: input.poisson,
          gageFactor: input.gageFactor,
        },
      })

    if (input.unknown === 'loadN') {
      const solved = scaleSolve(input.targetMvV, () => evalSpan(1, input.thicknessMm)).value
      return finalize(input.unknown, solved, { ...input, loadN: solved }, () => evalSpan(solved, input.thicknessMm))
    }

    requirePositive('Load', input.loadN)
    const solved = bisectionSolve(
      (thicknessMm) => {
        const r = evalSpan(input.loadN, thicknessMm)
        if (!r.isValid) throw new Error(r.error ?? 'Invalid shear thickness')
        return r.fullSpanSensitivity
      },
      input.targetMvV,
      1e-4,
      input.widthMm * 0.999
    )
    return finalize(input.unknown, solved, { ...input, thicknessMm: solved }, () => evalSpan(input.loadN, solved))
  } catch (err) {
    return { isValid: false, warnings: [], error: err instanceof Error ? err.message : String(err) }
  }
}

export const solveSquareShearForTargetSpan = (input: ShearInverseInput) => solveShearType('squareShear', input)
export const solveRoundShearForTargetSpan = (input: ShearInverseInput) => solveShearType('roundShear', input)
export const solveRoundSBeamShearForTargetSpan = (input: ShearInverseInput) => solveShearType('roundSBeamShear', input)

// Square Torque
export type SquareTorqueUnknown = 'appliedTorqueNmm' | 'widthMm'
export type SquareTorqueInverseInput = {
  targetMvV: number
  unknown: SquareTorqueUnknown
  appliedTorqueNmm: number
  widthMm: number
  poisson: number
  modulusGPa: number
  gageLengthMm: number
  gageFactor: number
}

export function solveSquareTorqueForTargetSpan(
  input: SquareTorqueInverseInput
): InverseResult<SquareTorqueInverseInput, SquareTorqueUnknown> {
  try {
    requirePositive('Target span', input.targetMvV)
    requirePositive('Poisson surrogate', input.poisson + 1)
    requirePositive('Modulus', input.modulusGPa)
    requirePositive('Gage length', input.gageLengthMm)
    requirePositive('Gage factor', input.gageFactor)

    const evalSpan = (appliedTorqueNmm: number, widthMm: number): DesignResult =>
      runDesign({
        type: 'squareTorque',
        params: {
          appliedTorque: appliedTorqueNmm,
          width: widthMm,
          poisson: input.poisson,
          modulus: input.modulusGPa,
          gageLength: input.gageLengthMm,
          gageFactor: input.gageFactor,
          usUnits: false,
        },
      })

    if (input.unknown === 'appliedTorqueNmm') {
      const solved = scaleSolve(input.targetMvV, () => evalSpan(1, input.widthMm)).value
      return finalize(input.unknown, solved, { ...input, appliedTorqueNmm: solved }, () => evalSpan(solved, input.widthMm))
    }

    requirePositive('Applied torque', input.appliedTorqueNmm)
    const solved = bisectionSolve(
      (widthMm) => {
        const r = evalSpan(input.appliedTorqueNmm, widthMm)
        if (!r.isValid) throw new Error(r.error ?? 'Invalid square torque width')
        return r.fullSpanSensitivity
      },
      input.targetMvV,
      5.08,
      508
    )
    return finalize(input.unknown, solved, { ...input, widthMm: solved }, () => evalSpan(input.appliedTorqueNmm, solved))
  } catch (err) {
    return { isValid: false, warnings: [], error: err instanceof Error ? err.message : String(err) }
  }
}

// Round Solid Torque
export type RoundSolidTorqueUnknown = 'appliedTorqueNm' | 'diameterMm'
export type RoundSolidTorqueInverseInput = {
  targetMvV: number
  unknown: RoundSolidTorqueUnknown
  appliedTorqueNm: number
  diameterMm: number
  modulusGPa: number
  poissonRatio: number
  gageFactor: number
}

export function solveRoundSolidTorqueForTargetSpan(
  input: RoundSolidTorqueInverseInput
): InverseResult<RoundSolidTorqueInverseInput, RoundSolidTorqueUnknown> {
  try {
    requirePositive('Target span', input.targetMvV)
    requirePositive('Modulus', input.modulusGPa)
    requirePositive('Gage factor', input.gageFactor)

    const evalSpan = (appliedTorqueNm: number, diameterMm: number): DesignResult =>
      runDesign({
        type: 'roundSolidTorque',
        params: {
          appliedTorque: appliedTorqueNm,
          diameter: diameterMm * MM_TO_M,
          modulus: input.modulusGPa * GPA_TO_PA,
          poissonRatio: input.poissonRatio,
          gageFactor: input.gageFactor,
        },
      })

    if (input.unknown === 'appliedTorqueNm') {
      const solved = scaleSolve(input.targetMvV, () => evalSpan(1, input.diameterMm)).value
      return finalize(input.unknown, solved, { ...input, appliedTorqueNm: solved }, () => evalSpan(solved, input.diameterMm))
    }

    requirePositive('Applied torque', input.appliedTorqueNm)
    const solved = bisectionSolve(
      (diameterMm) => {
        const r = evalSpan(input.appliedTorqueNm, diameterMm)
        if (!r.isValid) throw new Error(r.error ?? 'Invalid round solid torque diameter')
        return r.fullSpanSensitivity
      },
      input.targetMvV,
      1e-4,
      1e4
    )
    return finalize(input.unknown, solved, { ...input, diameterMm: solved }, () => evalSpan(input.appliedTorqueNm, solved))
  } catch (err) {
    return { isValid: false, warnings: [], error: err instanceof Error ? err.message : String(err) }
  }
}

// Round Hollow Torque
export type RoundHollowTorqueUnknown = 'appliedTorqueNm' | 'outerDiameterMm'
export type RoundHollowTorqueInverseInput = {
  targetMvV: number
  unknown: RoundHollowTorqueUnknown
  appliedTorqueNm: number
  outerDiameterMm: number
  innerDiameterMm: number
  modulusGPa: number
  poissonRatio: number
  gageFactor: number
}

export function solveRoundHollowTorqueForTargetSpan(
  input: RoundHollowTorqueInverseInput
): InverseResult<RoundHollowTorqueInverseInput, RoundHollowTorqueUnknown> {
  try {
    requirePositive('Target span', input.targetMvV)
    requirePositive('Inner diameter', input.innerDiameterMm)
    requirePositive('Modulus', input.modulusGPa)
    requirePositive('Gage factor', input.gageFactor)

    const evalSpan = (appliedTorqueNm: number, outerDiameterMm: number): DesignResult =>
      runDesign({
        type: 'roundHollowTorque',
        params: {
          appliedTorque: appliedTorqueNm,
          outerDiameter: outerDiameterMm * MM_TO_M,
          innerDiameter: input.innerDiameterMm * MM_TO_M,
          modulus: input.modulusGPa * GPA_TO_PA,
          poissonRatio: input.poissonRatio,
          gageFactor: input.gageFactor,
        },
      })

    if (input.unknown === 'appliedTorqueNm') {
      const solved = scaleSolve(input.targetMvV, () => evalSpan(1, input.outerDiameterMm)).value
      return finalize(input.unknown, solved, { ...input, appliedTorqueNm: solved }, () => evalSpan(solved, input.outerDiameterMm))
    }

    requirePositive('Applied torque', input.appliedTorqueNm)
    const solved = bisectionSolve(
      (outerDiameterMm) => {
        const r = evalSpan(input.appliedTorqueNm, outerDiameterMm)
        if (!r.isValid) throw new Error(r.error ?? 'Invalid round hollow torque outer diameter')
        return r.fullSpanSensitivity
      },
      input.targetMvV,
      input.innerDiameterMm * 1.001,
      1e4
    )
    return finalize(input.unknown, solved, { ...input, outerDiameterMm: solved }, () => evalSpan(input.appliedTorqueNm, solved))
  } catch (err) {
    return { isValid: false, warnings: [], error: err instanceof Error ? err.message : String(err) }
  }
}

// Pressure diaphragm
export type PressureUnknown = 'appliedPressureMPa' | 'thicknessMm'
export type PressureInverseInput = {
  targetMvV: number
  unknown: PressureUnknown
  appliedPressureMPa: number
  thicknessMm: number
  diameterMm: number
  poisson: number
  modulusGPa: number
  gageFactor: number
}

export function solvePressureForTargetSpan(
  input: PressureInverseInput
): InverseResult<PressureInverseInput, PressureUnknown> {
  try {
    requirePositive('Target span', input.targetMvV)
    requirePositive('Diameter', input.diameterMm)
    requirePositive('Modulus', input.modulusGPa)
    requirePositive('Gage factor', input.gageFactor)

    const evalSpan = (appliedPressureMPa: number, thicknessMm: number): DesignResult =>
      runDesign({
        type: 'pressure',
        params: {
          appliedPressure: appliedPressureMPa,
          thickness: thicknessMm,
          diameter: input.diameterMm,
          poisson: input.poisson,
          // pressure.ts requires pressure/modulus consistent; MPa + MPa
          modulus: input.modulusGPa * 1000,
          gageFactor: input.gageFactor,
        },
      })

    if (input.unknown === 'appliedPressureMPa') {
      const solved = scaleSolve(input.targetMvV, () => evalSpan(1, input.thicknessMm)).value
      return finalize(input.unknown, solved, { ...input, appliedPressureMPa: solved }, () => evalSpan(solved, input.thicknessMm))
    }

    requirePositive('Applied pressure', input.appliedPressureMPa)
    const solved = bisectionSolve(
      (thicknessMm) => {
        const r = evalSpan(input.appliedPressureMPa, thicknessMm)
        if (!r.isValid) throw new Error(r.error ?? 'Invalid pressure diaphragm thickness')
        return r.fullSpanSensitivity
      },
      input.targetMvV,
      1e-4,
      1e4
    )
    return finalize(input.unknown, solved, { ...input, thicknessMm: solved }, () => evalSpan(input.appliedPressureMPa, solved))
  } catch (err) {
    return { isValid: false, warnings: [], error: err instanceof Error ? err.message : String(err) }
  }
}
