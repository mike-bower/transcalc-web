export interface ShearSpanParams {
  load: number
  width: number
  height: number
  diameter: number
  thickness: number
  modulus: number
  poisson: number
  gageFactor: number
}

const calculateInertia = (width: number, height: number, diameter: number, thickness: number): number => {
  const x = height / 2
  const d = diameter / 2
  return (width * Math.pow(2 * x, 3)) / 12 - ((width - thickness) * Math.pow(2 * d, 3)) / 12
}

const calculateMaxStrain = (
  load: number,
  width: number,
  height: number,
  diameter: number,
  thickness: number,
  modulus: number,
  poisson: number,
  factor1: number
): number => {
  const d = diameter / 2
  const factor2 = thickness * d * (d / 2)
  const inertia = calculateInertia(width, height, diameter, thickness)
  if (inertia === 0 || thickness === 0 || modulus === 0) {
    throw new Error('Invalid geometry or modulus for shear span calculation')
  }
  const maxStress = (load * (factor1 + factor2)) / (inertia * thickness)
  return (maxStress / modulus) * (2 * (1 + poisson)) * 1e6 / 2
}

const calculateSpanFromStrain = (maxStrain: number, gageFactor: number): number => {
  return maxStrain * gageFactor * 0.001
}

export const calculateRoundSBeamSpan = (params: ShearSpanParams): number => {
  const d = params.diameter / 2
  const flange = (params.height - params.diameter) / 2
  const factor1 = flange * params.width * (d - 2 * flange / 2)
  const maxStrain = calculateMaxStrain(
    params.load,
    params.width,
    params.height,
    params.diameter,
    params.thickness,
    params.modulus,
    params.poisson,
    factor1
  )
  return calculateSpanFromStrain(maxStrain, params.gageFactor)
}

export const calculateSquareShearSpan = (params: ShearSpanParams): number => {
  const d = params.diameter / 2
  const flange = (params.height - params.diameter) / 2
  const factor1 = flange * params.width * (d - 2 * flange / 2)
  const maxStrain = calculateMaxStrain(
    params.load,
    params.width,
    params.height,
    params.diameter,
    params.thickness,
    params.modulus,
    params.poisson,
    factor1
  )
  return calculateSpanFromStrain(maxStrain, params.gageFactor)
}

export const calculateRoundShearSpan = (params: ShearSpanParams): number => {
  const d = params.diameter / 2
  const flange = (params.height - params.diameter) / 2
  const factor1 = flange * params.width * (d - 2 * flange / 2)
  const maxStrain = calculateMaxStrain(
    params.load,
    params.width,
    params.height,
    params.diameter,
    params.thickness,
    params.modulus,
    params.poisson,
    factor1
  )
  return calculateSpanFromStrain(maxStrain, params.gageFactor)
}
