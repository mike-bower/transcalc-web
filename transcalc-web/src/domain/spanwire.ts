export type SpanWireUnits = 'US' | 'SI'

export interface SpanWireLengthParams {
  resistance: number
  resistivity: number
  units: SpanWireUnits
}

export const calculateSpanWireLength = (params: SpanWireLengthParams): number => {
  if (params.resistance <= 0 || params.resistivity <= 0) {
    throw new Error('Resistance and resistivity must be positive')
  }

  if (params.units === 'US') {
    const resistivityPerInch = params.resistivity / 12
    return params.resistance / resistivityPerInch
  }

  const resistivityPerMm = params.resistivity / 1000
  return params.resistance / resistivityPerMm
}

export const SPANWIRE_LIMITS = {
  minLengthUs: 0.01,
  maxLengthUs: 100.0,
  minResistance: 0.01,
  maxResistance: 1000.0,
}
