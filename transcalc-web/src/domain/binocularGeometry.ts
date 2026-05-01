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
  // true when g >= radius (4 holes needed to achieve t_min)
  isFourArm: boolean
  // g = H/2 - R - t_min (BeamHoleDist). Y coord of upper holes in 4-arm; slot half-height in 2-arm.
  g: number
  // Y coordinate of the upper hole centres (0 for 2-arm, g for 4-arm)
  holeCenterY: number
  holeLeftX: number
  holeRightX: number
  // 2-arm: half-height of connecting slot = R (slot height = 2R = hole diameter); 0 for 4-arm
  centerSlotHalfHeight: number
  // 4-arm: half-height of the outer rectangular cuts (g − R); 0 for 2-arm
  outerCutHalfHeight: number
  // 4-arm: half-height of the center horizontal slot (= t_min); 0 for 2-arm
  innerSlotHalfHeight: number
  // Gage X positions (at hole CLs, on top/bottom faces)
  leftActiveX: number
  rightActiveX: number
  leftPassiveX: number
  rightPassiveX: number
  // Y midpoint of the thin outer bridges (for hotspot visualization)
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

  const g = Math.max(0, beamHeight / 2 - radius - minThickness)
  const isFourArm = g >= radius
  const holeCenterY = isFourArm ? g : 0

  const holeLeftX = -holeSpacing / 2
  const holeRightX = holeSpacing / 2

  const centerSlotHalfHeight = isFourArm ? 0 : radius
  const outerCutHalfHeight = isFourArm ? Math.max(0, beamHeight / 2 - holeCenterY) : 0
  const innerSlotHalfHeight = isFourArm ? minThickness : 0

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
    isFourArm,
    g,
    holeCenterY,
    holeLeftX,
    holeRightX,
    centerSlotHalfHeight,
    outerCutHalfHeight,
    innerSlotHalfHeight,
    leftActiveX: holeLeftX,
    rightActiveX: holeRightX,
    leftPassiveX: holeLeftX,
    rightPassiveX: holeRightX,
    topLigamentY: beamHeight / 2 - minThickness / 2,
    bottomLigamentY: -(beamHeight / 2 - minThickness / 2),
    xMin: -totalLength / 2,
    xMax: totalLength / 2,
    yMin: -beamHeight / 2,
    yMax: beamHeight / 2,
  }
}
