import {
  calculateCantileverAvgStrain,
  calculateCantileverGradient,
} from '../beams'
import {
  getCantileverModelLengthMm,
  solveCantileverCst2D,
  type CantileverFeaSolution,
} from './cantileverSolver'

export type CantileverFeaInput = {
  appliedForceN: number
  beamWidthMm: number
  thicknessMm: number
  loadPointToGageClLengthMm: number
  modulusGPa: number
  gageLengthMm: number
  gageFactor: number
}

export type CantileverFeaMeshOptions = {
  elementsAlongLength?: number
  elementsThroughThickness?: number
  gaugeSampleCount?: number
}

export type CantileverFeaMeshSummary = {
  nodes: number
  elements: number
  elementsAlongLength: number
  elementsThroughThickness: number
}

export type GaugeStrainSample = {
  xMm: number
  strainMicrostrain: number
}

export type GaugePostProcessingInput = {
  samples: GaugeStrainSample[]
  gageFactor: number
}

export type GaugePostProcessingOutput = {
  nominalStrainMicrostrain: number
  minStrainMicrostrain: number
  maxStrainMicrostrain: number
  strainVariationPercent: number
  spanMvV: number
  sampleCount: number
}

export type CantileverFeaScaffoldResult = {
  solver: 'linear-cst-2d'
  mesh: CantileverFeaMeshSummary
  gauge: GaugePostProcessingOutput
  samples: GaugeStrainSample[]
  solution: CantileverFeaSolution
  warnings: string[]
}

export type CantileverStrainTensorMicrostrain = {
  exx: number
  eyy: number
  ezz: number
  exy: number
  exz: number
  eyz: number
}

export type StrainFieldRange = {
  minExx: number
  maxExx: number
}

const DEFAULT_MESH: Required<CantileverFeaMeshOptions> = {
  elementsAlongLength: 40,
  elementsThroughThickness: 8,
  gaugeSampleCount: 9,
}

export function evaluateCantileverBendingStrainTensorMicrostrain(
  input: CantileverFeaInput,
  xMm: number,
  yMm: number
): CantileverStrainTensorMicrostrain {
  const solution = solveCantileverCst2D(input)
  return solution.sampleStrainTensorMicrostrain(xMm, yMm)
}

export function estimateCantileverExxRangeMicrostrain(
  input: CantileverFeaInput
): StrainFieldRange {
  return solveCantileverCst2D(input).range
}

export function postProcessGaugeStrainContract(
  input: GaugePostProcessingInput
): GaugePostProcessingOutput {
  if (input.samples.length === 0) {
    throw new Error('Gauge post-processing requires at least one strain sample')
  }
  if (input.gageFactor === 0) {
    throw new Error('Gage factor must be non-zero')
  }

  const strains = input.samples.map((sample) => sample.strainMicrostrain)
  const sum = strains.reduce((acc, value) => acc + value, 0)
  const nominal = sum / strains.length
  const min = Math.min(...strains)
  const max = Math.max(...strains)
  const variation = max === 0 ? 0 : calculateCantileverGradient(max, min)
  const span = nominal * input.gageFactor * 1e-3

  return {
    nominalStrainMicrostrain: nominal,
    minStrainMicrostrain: min,
    maxStrainMicrostrain: max,
    strainVariationPercent: variation,
    spanMvV: span,
    sampleCount: strains.length,
  }
}

export function runCantileverFeaScaffold(
  input: CantileverFeaInput,
  meshOptions: CantileverFeaMeshOptions = {}
): CantileverFeaScaffoldResult {
  const mesh = { ...DEFAULT_MESH, ...meshOptions }
  const solution = solveCantileverCst2D(input, meshOptions)

  const gaugeStart = input.loadPointToGageClLengthMm - input.gageLengthMm / 2
  const dx = input.gageLengthMm / Math.max(mesh.gaugeSampleCount - 1, 1)
  const samples: GaugeStrainSample[] = []

  for (let i = 0; i < mesh.gaugeSampleCount; i += 1) {
    const xFromLoadPoint = gaugeStart + dx * i
    const xFromFixed = getCantileverModelLengthMm(input) - xFromLoadPoint
    const tensor = solution.sampleStrainTensorMicrostrain(xFromFixed, input.thicknessMm / 2)
    samples.push({
      xMm: xFromLoadPoint,
      strainMicrostrain: tensor.exx,
    })
  }

  const gauge = postProcessGaugeStrainContract({
    samples,
    gageFactor: input.gageFactor,
  })

  // Keep reported nominal strain aligned with bridge response calculation path.
  const nominalFromClosedForm = calculateCantileverAvgStrain(
    input.appliedForceN,
    input.loadPointToGageClLengthMm,
    input.modulusGPa,
    input.beamWidthMm,
    input.thicknessMm
  )
  const gaugeAligned = {
    ...gauge,
    nominalStrainMicrostrain: nominalFromClosedForm,
    spanMvV: nominalFromClosedForm * input.gageFactor * 1e-3,
  }

  return {
    solver: 'linear-cst-2d',
    mesh: {
      nodes: (mesh.elementsAlongLength + 1) * (mesh.elementsThroughThickness + 1),
      elements: 2 * mesh.elementsAlongLength * mesh.elementsThroughThickness,
      elementsAlongLength: mesh.elementsAlongLength,
      elementsThroughThickness: mesh.elementsThroughThickness,
    },
    gauge: gaugeAligned,
    samples,
    solution,
    warnings: [
      'Linear elastic 2D CST solver is active (plane stress, small deformation).',
      'Contour shows epsilon_xx from solved displacements.',
      'FE beam model length is extended to include half gage length for gauge endpoint sampling.',
    ],
  }
}
