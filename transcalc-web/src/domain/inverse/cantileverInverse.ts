import { runDesign, type DesignResult } from '../orchestrator'

export type CantileverUnknown =
  | 'loadN'
  | 'momentArmMm'
  | 'beamWidthMm'
  | 'thicknessMm'
  | 'gageFactor'
  | 'youngsModulusGPa'

export interface CantileverInverseInput {
  targetMvV: number
  unknown: CantileverUnknown
  loadN: number
  momentArmMm: number
  beamWidthMm: number
  thicknessMm: number
  youngsModulusGPa: number
  gageLengthMm: number
  gageFactor: number
}

export interface CantileverInverseResult {
  isValid: boolean
  solvedValue?: number
  solvedKey?: CantileverUnknown
  solvedInput?: CantileverInverseInput
  designResult?: DesignResult
  warnings: string[]
  error?: string
}

const MM_TO_M = 1e-3
const GPA_TO_PA = 1e9
const SPAN_SCALE = 1e3

function requirePositive(name: string, value: number): void {
  if (!Number.isFinite(value) || value <= 0) {
    throw new Error(`${name} must be a positive finite value`)
  }
}

function validateKnowns(input: CantileverInverseInput): void {
  requirePositive('Target span', input.targetMvV)
  requirePositive('Gage length', input.gageLengthMm)

  if (input.unknown !== 'loadN') requirePositive('Load', input.loadN)
  if (input.unknown !== 'momentArmMm') requirePositive('Moment arm', input.momentArmMm)
  if (input.unknown !== 'beamWidthMm') requirePositive('Beam width', input.beamWidthMm)
  if (input.unknown !== 'thicknessMm') requirePositive('Thickness', input.thicknessMm)
  if (input.unknown !== 'youngsModulusGPa') requirePositive("Young's modulus", input.youngsModulusGPa)
  if (input.unknown !== 'gageFactor') requirePositive('Gage factor', input.gageFactor)
}

export function solveCantileverForTargetSpan(input: CantileverInverseInput): CantileverInverseResult {
  try {
    validateKnowns(input)

    const warnings: string[] = []

    const loadN = input.loadN
    const momentArmM = input.momentArmMm * MM_TO_M
    const beamWidthM = input.beamWidthMm * MM_TO_M
    const thicknessM = input.thicknessMm * MM_TO_M
    const modulusPa = input.youngsModulusGPa * GPA_TO_PA
    const gageFactor = input.gageFactor

    let solved = 0
    switch (input.unknown) {
      case 'loadN':
        solved = (input.targetMvV * modulusPa * beamWidthM * thicknessM * thicknessM) /
          (6 * momentArmM * gageFactor * SPAN_SCALE)
        break
      case 'momentArmMm':
        solved = (
          (input.targetMvV * modulusPa * beamWidthM * thicknessM * thicknessM) /
          (6 * loadN * gageFactor * SPAN_SCALE)
        ) / MM_TO_M
        break
      case 'beamWidthMm':
        solved = (
          (6 * loadN * momentArmM * gageFactor * SPAN_SCALE) /
          (modulusPa * thicknessM * thicknessM * input.targetMvV)
        ) / MM_TO_M
        break
      case 'thicknessMm':
        solved = (
          Math.sqrt(
            (6 * loadN * momentArmM * gageFactor * SPAN_SCALE) /
            (modulusPa * beamWidthM * input.targetMvV)
          )
        ) / MM_TO_M
        break
      case 'gageFactor':
        solved = (input.targetMvV * modulusPa * beamWidthM * thicknessM * thicknessM) /
          (6 * loadN * momentArmM * SPAN_SCALE)
        break
      case 'youngsModulusGPa':
        solved = (
          (6 * loadN * momentArmM * gageFactor * SPAN_SCALE) /
          (beamWidthM * thicknessM * thicknessM * input.targetMvV)
        ) / GPA_TO_PA
        break
    }

    requirePositive('Solved value', solved)

    const solvedInput: CantileverInverseInput = {
      ...input,
      [input.unknown]: solved,
    }

    if (solvedInput.momentArmMm <= solvedInput.gageLengthMm * 0.5) {
      warnings.push('Moment arm is less than half gage length; min strain may change sign.')
    }

    const designResult = runDesign({
      type: 'cantilever',
      params: {
        loadN: solvedInput.loadN,
        momentArmMm: solvedInput.momentArmMm,
        gageLengthMm: solvedInput.gageLengthMm,
        youngsModulusPa: solvedInput.youngsModulusGPa * GPA_TO_PA,
        beamWidthMm: solvedInput.beamWidthMm,
        thicknessMm: solvedInput.thicknessMm,
        gageFactor: solvedInput.gageFactor,
      },
    })

    if (!designResult.isValid) {
      return {
        isValid: false,
        warnings,
        error: designResult.error ?? 'Cantilever solve failed',
      }
    }

    const targetError = Math.abs(designResult.fullSpanSensitivity - input.targetMvV)
    if (targetError > 1e-6) {
      warnings.push(`Solved span differs from target by ${targetError.toExponential(2)} mV/V.`)
    }

    return {
      isValid: true,
      solvedValue: solved,
      solvedKey: input.unknown,
      solvedInput,
      designResult,
      warnings,
    }
  } catch (err) {
    return {
      isValid: false,
      warnings: [],
      error: err instanceof Error ? err.message : String(err),
    }
  }
}
