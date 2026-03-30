import { runDesign, type DesignResult } from '../orchestrator'

export type BinoBeamUnknown = 'loadN' | 'minimumThicknessMm'

export interface BinoBeamInverseInput {
  targetMvV: number
  unknown: BinoBeamUnknown
  loadN: number
  distanceBetweenHolesMm: number
  radiusMm: number
  beamWidthMm: number
  beamHeightMm: number
  minimumThicknessMm: number
  youngsModulusGPa: number
  gageLengthMm: number
  gageFactor: number
}

export interface BinoBeamInverseResult {
  isValid: boolean
  solvedValue?: number
  solvedKey?: BinoBeamUnknown
  solvedInput?: BinoBeamInverseInput
  designResult?: DesignResult
  warnings: string[]
  error?: string
}

const MM_TO_M = 1e-3
const GPa_TO_PA = 1e9

function requirePositive(name: string, value: number): void {
  if (!Number.isFinite(value) || value <= 0) {
    throw new Error(`${name} must be a positive finite value`)
  }
}

function evaluate(input: BinoBeamInverseInput): DesignResult {
  return runDesign({
    type: 'binoBeam',
    params: {
      appliedLoad: input.loadN,
      distanceBetweenHoles: input.distanceBetweenHolesMm * MM_TO_M,
      radius: input.radiusMm * MM_TO_M,
      beamWidth: input.beamWidthMm * MM_TO_M,
      beamHeight: input.beamHeightMm * MM_TO_M,
      distanceLoadHole: 0,
      minimumThickness: input.minimumThicknessMm * MM_TO_M,
      modulus: input.youngsModulusGPa * GPa_TO_PA,
      gageLength: input.gageLengthMm * MM_TO_M,
      gageFactor: input.gageFactor,
    },
  })
}

function validateKnowns(input: BinoBeamInverseInput): void {
  requirePositive('Target span', input.targetMvV)
  requirePositive('Distance between holes', input.distanceBetweenHolesMm)
  requirePositive('Radius', input.radiusMm)
  requirePositive('Beam width', input.beamWidthMm)
  requirePositive('Beam height', input.beamHeightMm)
  requirePositive("Young's modulus", input.youngsModulusGPa)
  requirePositive('Gage length', input.gageLengthMm)
  requirePositive('Gage factor', input.gageFactor)

  if (input.unknown !== 'loadN') requirePositive('Load', input.loadN)
  if (input.unknown !== 'minimumThicknessMm') requirePositive('Minimum thickness', input.minimumThicknessMm)
}

function solveLoad(input: BinoBeamInverseInput): BinoBeamInverseResult {
  const warnings: string[] = []
  const seed = evaluate({ ...input, loadN: 1 })
  if (!seed.isValid || !Number.isFinite(seed.fullSpanSensitivity) || seed.fullSpanSensitivity <= 0) {
    return {
      isValid: false,
      warnings,
      error: seed.error ?? 'Unable to solve load from current bino geometry.',
    }
  }

  const solvedLoad = input.targetMvV / seed.fullSpanSensitivity
  if (!Number.isFinite(solvedLoad) || solvedLoad <= 0) {
    return {
      isValid: false,
      warnings,
      error: 'Solved load is not physically valid.',
    }
  }

  const solvedInput: BinoBeamInverseInput = { ...input, loadN: solvedLoad }
  const solvedDesign = evaluate(solvedInput)
  if (!solvedDesign.isValid) {
    return {
      isValid: false,
      warnings,
      error: solvedDesign.error ?? 'Bino load solve failed validation.',
    }
  }

  return {
    isValid: true,
    solvedValue: solvedLoad,
    solvedKey: 'loadN',
    solvedInput,
    designResult: solvedDesign,
    warnings,
  }
}

function solveMinimumThickness(input: BinoBeamInverseInput): BinoBeamInverseResult {
  const warnings: string[] = []
  const maxThickness = input.beamHeightMm / 2 - input.radiusMm
  if (!Number.isFinite(maxThickness) || maxThickness <= 0) {
    return {
      isValid: false,
      warnings,
      error: 'Beam geometry does not allow a positive minimum thickness.',
    }
  }

  const low = Math.max(1e-4, Math.min(input.minimumThicknessMm, maxThickness * 0.1))
  const high = Math.max(low + 1e-6, maxThickness - 1e-4)
  const lowEval = evaluate({ ...input, minimumThicknessMm: low })
  const highEval = evaluate({ ...input, minimumThicknessMm: high })

  if (!lowEval.isValid || !highEval.isValid) {
    return {
      isValid: false,
      warnings,
      error: lowEval.error ?? highEval.error ?? 'Bino geometry invalid across thickness bounds.',
    }
  }

  const fLow = lowEval.fullSpanSensitivity - input.targetMvV
  const fHigh = highEval.fullSpanSensitivity - input.targetMvV

  if (fLow === 0) {
    return {
      isValid: true,
      solvedValue: low,
      solvedKey: 'minimumThicknessMm',
      solvedInput: { ...input, minimumThicknessMm: low },
      designResult: lowEval,
      warnings,
    }
  }
  if (fHigh === 0) {
    return {
      isValid: true,
      solvedValue: high,
      solvedKey: 'minimumThicknessMm',
      solvedInput: { ...input, minimumThicknessMm: high },
      designResult: highEval,
      warnings,
    }
  }

  if (fLow * fHigh > 0) {
    return {
      isValid: false,
      warnings,
      error: 'Target span is outside achievable range for minimum thickness solve.',
    }
  }

  let lo = low
  let hi = high
  let loVal = fLow
  let mid = (lo + hi) / 2
  let midEval = evaluate({ ...input, minimumThicknessMm: mid })

  for (let i = 0; i < 80; i += 1) {
    if (!midEval.isValid) {
      return {
        isValid: false,
        warnings,
        error: midEval.error ?? 'Bino thickness solve failed while iterating.',
      }
    }
    const midVal = midEval.fullSpanSensitivity - input.targetMvV
    if (Math.abs(midVal) <= 1e-7 || Math.abs(hi - lo) <= 1e-6) {
      return {
        isValid: true,
        solvedValue: mid,
        solvedKey: 'minimumThicknessMm',
        solvedInput: { ...input, minimumThicknessMm: mid },
        designResult: midEval,
        warnings,
      }
    }

    if (loVal * midVal <= 0) {
      hi = mid
    } else {
      lo = mid
      loVal = midVal
    }
    mid = (lo + hi) / 2
    midEval = evaluate({ ...input, minimumThicknessMm: mid })
  }

  warnings.push('Thickness solve reached iteration limit; returning best midpoint estimate.')
  return {
    isValid: true,
    solvedValue: mid,
    solvedKey: 'minimumThicknessMm',
    solvedInput: { ...input, minimumThicknessMm: mid },
    designResult: midEval.isValid ? midEval : undefined,
    warnings,
  }
}

export function solveBinoBeamForTargetSpan(input: BinoBeamInverseInput): BinoBeamInverseResult {
  try {
    validateKnowns(input)
    if (input.unknown === 'loadN') {
      return solveLoad(input)
    }
    return solveMinimumThickness(input)
  } catch (err) {
    return {
      isValid: false,
      warnings: [],
      error: err instanceof Error ? err.message : String(err),
    }
  }
}
