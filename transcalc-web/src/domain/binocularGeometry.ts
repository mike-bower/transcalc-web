export type BinocularRawParams = Record<string, number>

export type BinocularGeometry = {
  beamWidth: number
  beamHeight: number
  beamDepth: number
  radius: number
  holeSpacing: number
  minThickness: number
  gageLength: number
  load: number
  totalLength: number
  centerSlotHalfHeight: number
  holeLeftX: number
  holeRightX: number
  gageOffsetX: number
  leftActiveX: number
  rightActiveX: number
  leftPassiveX: number
  rightPassiveX: number
  topLigamentY: number
  bottomLigamentY: number
  xMin: number
  xMax: number
  yMin: number
  yMax: number
}

function positiveValue(raw: BinocularRawParams, key: string, fallback: number): number {
  const value = raw[key]
  return Number.isFinite(value) && value > 0 ? value : fallback
}

export function buildBinocularGeometry(params: BinocularRawParams): BinocularGeometry {
  const beamWidth = positiveValue(params, 'beamWidth', 25)
  const beamHeight = positiveValue(params, 'beamHeight', 50)
  const radius = positiveValue(params, 'radius', 12)
  const holeSpacing = positiveValue(params, 'distHoles', 60)
  const minThickness = positiveValue(params, 'minThick', 4)
  const gageLength = positiveValue(params, 'gageLen', 5)
  const load = positiveValue(params, 'load', 100)
  const totalLength = positiveValue(
    params,
    'totalLength',
    holeSpacing + 2 * (radius + minThickness)
  )

  const centerSlotHalfHeight = Math.max(0, beamHeight / 2 - radius - minThickness)
  const holeLeftX = -holeSpacing / 2
  const holeRightX = holeSpacing / 2
  const gageOffsetX = Math.max(gageLength * 0.3, radius * 0.42)

  return {
    beamWidth,
    beamHeight,
    beamDepth: beamWidth,
    radius,
    holeSpacing,
    minThickness,
    gageLength,
    load,
    totalLength,
    centerSlotHalfHeight,
    holeLeftX,
    holeRightX,
    gageOffsetX,
    leftActiveX: holeLeftX + gageOffsetX,
    rightActiveX: holeRightX - gageOffsetX,
    leftPassiveX: holeLeftX,
    rightPassiveX: holeRightX,
    topLigamentY: beamHeight / 2 - minThickness / 2,
    bottomLigamentY: -beamHeight / 2 + minThickness / 2,
    xMin: -totalLength / 2,
    xMax: totalLength / 2,
    yMin: -beamHeight / 2,
    yMax: beamHeight / 2,
  }
}
