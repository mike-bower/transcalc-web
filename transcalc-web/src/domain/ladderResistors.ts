export type RungState = boolean | 0 | 1

const S_KEYS = [
  'S1','S2','S3','S4','S5','S6','S7','S8','S9','S10','S11','S12','S13','S14','S15','S16','S17','S18','S19','S20','S21','S22','S23'
] as const

type SKey = typeof S_KEYS[number]

export interface LadderConstants extends Record<SKey, number> {
  totalSquares: number
}

const makeConstants = (values: Partial<Record<SKey, number>> & { totalSquares: number }): LadderConstants => {
  const constants = { totalSquares: values.totalSquares } as LadderConstants
  for (const key of S_KEYS) {
    constants[key] = values[key] ?? 0
  }
  return constants
}

const rungValue = (state: RungState | undefined): number => {
  if (state === undefined) return 1
  if (typeof state === 'number') return state ? 1 : 0
  return state ? 0 : 1
}

const normalizeRungs = (rungs: RungState[] | undefined, length: number): RungState[] => {
  const result: RungState[] = new Array(length)
  for (let i = 0; i < length; i += 1) {
    result[i] = rungs?.[i] ?? false
  }
  return result
}

export interface LadderResult {
  squares: number
  ohmsPerSquare: number
  totalResistance: number
}

export interface LadderC01Rungs {
  fa: RungState[]
  sa: RungState[]
  b: RungState[]
  fc: RungState[]
  sc: RungState[]
}

export interface LadderC11Rungs {
  a: RungState[]
  b: RungState[]
  c: RungState[]
  d: RungState[]
}

export interface LadderC12Rungs {
  fa: RungState[]
  sa: RungState[]
  b: RungState[]
  c: RungState[]
}

export interface LadderD01Rungs {
  fa: RungState[]
  fb: RungState[]
  fc: RungState[]
}

export interface LadderE01SideRungs {
  a: RungState[]
  b: RungState[]
  c: RungState[]
  g: RungState
}

export interface LadderE01Rungs {
  left: LadderE01SideRungs
  right: LadderE01SideRungs
}

export interface E01ZeroResult {
  resistance12: number
  resistance23: number
  difference: number
  squares12: number
  squares23: number
}

const calcOhmsPerSquare = (startResistance: number, totalSquares: number): number => {
  if (totalSquares === 0) throw new Error('totalSquares must be non-zero')
  return startResistance / totalSquares
}

const calculateC01Ladder = (constants: LadderConstants, rungs: LadderC01Rungs, startResistance: number): LadderResult => {
  const fa = normalizeRungs(rungs.fa, 10)
  const sa = normalizeRungs(rungs.sa, 10)
  const b = normalizeRungs(rungs.b, 4)
  const fc = normalizeRungs(rungs.fc, 2)
  const sc = normalizeRungs(rungs.sc, 2)

  let C = (rungValue(fa[0]) / constants.S3) + (1 / (2 * constants.S7 + constants.S6))
  for (let i = 1; i <= 8; i += 1) {
    C = (rungValue(fa[i]) / constants.S3) + (1 / (2 * constants.S5 + constants.S3 + 1 / C))
  }
  const CFA = (rungValue(fa[9]) / constants.S10) + (1 / (2 * constants.S2 + 1 / C))

  C = (rungValue(sa[0]) / constants.S3) + (1 / (2 * constants.S7 + constants.S6))
  for (let i = 1; i <= 8; i += 1) {
    C = (rungValue(sa[i]) / constants.S3) + (1 / (2 * constants.S5 + constants.S3 + 1 / C))
  }
  const CSA = (rungValue(sa[9]) / constants.S10) + (1 / (2 * constants.S2 + 1 / C))

  C = (rungValue(b[0]) / constants.S10) + (1 / constants.S12)
  C = (rungValue(b[1]) / constants.S11) + (1 / (constants.S9 + constants.S13 + 1 / C))
  C = (rungValue(b[2]) / constants.S10) + (1 / (constants.S9 + constants.S13 + 1 / C))
  const CB = (rungValue(b[3]) / constants.S18) + (1 / (constants.S9 + constants.S14 + 1 / C))

  C = (rungValue(fc[0]) / constants.S17) + (1 / constants.S16)
  const CFC = (rungValue(fc[1]) / constants.S18) + (1 / (constants.S15 + constants.S19 + 1 / C))

  C = (rungValue(sc[0]) / constants.S17) + (1 / constants.S16)
  const CSC = (rungValue(sc[1]) / constants.S18) + (1 / (constants.S15 + constants.S19 + 1 / C))

  const squares = (1 / CFA) + (1 / CSA) + (1 / CB) + (1 / CFC) + (1 / CSC)
    + constants.S20 + constants.S8 + constants.S8 + constants.S8 + constants.S8
    + constants.S4 + constants.S21 + constants.S22 + constants.S1 + constants.S23

  const ohmsPerSquare = calcOhmsPerSquare(startResistance, constants.totalSquares)
  return {
    squares,
    ohmsPerSquare,
    totalResistance: ohmsPerSquare * squares,
  }
}

const calculateC11Ladder = (constants: LadderConstants, rungs: LadderC11Rungs, startResistance: number): LadderResult => {
  const a = normalizeRungs(rungs.a, 10)
  const b = normalizeRungs(rungs.b, 10)
  const c = normalizeRungs(rungs.c, 4)
  const d = normalizeRungs(rungs.d, 4)

  let C = (rungValue(a[0]) / constants.S3) + (1 / (2 * constants.S7 + constants.S6))
  for (let i = 1; i <= 8; i += 1) {
    C = (rungValue(a[i]) / constants.S3) + (1 / (2 * constants.S5 + constants.S3 + 1 / C))
  }
  const CA = (rungValue(a[9]) / constants.S10) + (1 / (2 * constants.S2 + 1 / C))

  C = (rungValue(b[0]) / constants.S3) + (1 / (2 * constants.S7 + constants.S6))
  for (let i = 1; i <= 8; i += 1) {
    C = (rungValue(b[i]) / constants.S3) + (1 / (2 * constants.S5 + constants.S3 + 1 / C))
  }
  const CB = (rungValue(b[9]) / constants.S10) + (1 / (2 * constants.S2 + 1 / C))

  C = (rungValue(c[0]) / constants.S10) + (1 / constants.S12)
  C = (rungValue(c[1]) / constants.S11) + (1 / (constants.S9 + constants.S13 + 1 / C))
  C = (rungValue(c[2]) / constants.S10) + (1 / (constants.S9 + constants.S13 + 1 / C))
  const CC = (rungValue(c[3]) / constants.S18) + (1 / (constants.S9 + constants.S14 + 1 / C))

  C = (rungValue(d[0]) / constants.S17) + (1 / constants.S16)
  C = (rungValue(d[1]) / constants.S18) + (1 / (constants.S15 + constants.S19 + 1 / C))
  C = (rungValue(d[2]) / constants.S17) + (1 / (constants.S15 + constants.S19 + 1 / C))
  const CD = (rungValue(d[3]) / constants.S18) + (1 / (constants.S15 + constants.S19 + 1 / C))

  const squares = (1 / CA) + (1 / CB) + (1 / CC) + (1 / CD)
    + constants.S20 + constants.S8 + constants.S8 + constants.S8 + constants.S8
    + constants.S4 + constants.S21 + constants.S22 + constants.S1 + constants.S23

  const ohmsPerSquare = calcOhmsPerSquare(startResistance, constants.totalSquares)
  return {
    squares,
    ohmsPerSquare,
    totalResistance: ohmsPerSquare * squares,
  }
}

const calculateC12Ladder = (constants: LadderConstants, rungs: LadderC12Rungs, startResistance: number): LadderResult => {
  const fa = normalizeRungs(rungs.fa, 10)
  const sa = normalizeRungs(rungs.sa, 10)
  const b = normalizeRungs(rungs.b, 4)
  const c = normalizeRungs(rungs.c, 4)

  let C = (rungValue(fa[0]) / constants.S3) + (1 / (2 * constants.S7 + constants.S6))
  for (let i = 1; i <= 8; i += 1) {
    C = (rungValue(fa[i]) / constants.S3) + (1 / (2 * constants.S5 + constants.S3 + 1 / C))
  }
  const CFA = (rungValue(fa[9]) / constants.S10) + (1 / (2 * constants.S2 + 1 / C))

  C = (rungValue(sa[0]) / constants.S3) + (1 / (2 * constants.S7 + constants.S6))
  for (let i = 1; i <= 8; i += 1) {
    C = (rungValue(sa[i]) / constants.S3) + (1 / (2 * constants.S5 + constants.S3 + 1 / C))
  }
  const CSA = (rungValue(sa[9]) / constants.S10) + (1 / (2 * constants.S2 + 1 / C))

  const CB1 = (rungValue(b[0]) / constants.S12) + (1 / constants.S13)
  const CB2 = (rungValue(b[1]) / constants.S12) + (1 / constants.S13)
  const CB3 = (rungValue(b[2]) / constants.S12) + (1 / constants.S13)
  const CB4 = (rungValue(b[3]) / constants.S12) + (1 / constants.S13)

  const CC1 = (rungValue(c[0]) / constants.S12) + (1 / constants.S14)
  const CC2 = (rungValue(c[1]) / constants.S12) + (1 / constants.S14)
  const CC3 = (rungValue(c[2]) / constants.S12) + (1 / constants.S14)
  const CC4 = (rungValue(c[3]) / constants.S12) + (1 / constants.S14)

  const squares = (1 / CFA) + (1 / CSA)
    + (1 / CB1) + (1 / CB2) + (1 / CB3) + (1 / CB4)
    + (1 / CC1) + (1 / CC2) + (1 / CC3) + (1 / CC4)
    + constants.S20 + constants.S8 + constants.S4 + constants.S22 + constants.S1 + constants.S23

  const ohmsPerSquare = calcOhmsPerSquare(startResistance, constants.totalSquares)
  return {
    squares,
    ohmsPerSquare,
    totalResistance: ohmsPerSquare * squares,
  }
}

const calculateD01Ladder = (constants: LadderConstants, rungs: LadderD01Rungs, startResistance: number): LadderResult => {
  const fa = normalizeRungs(rungs.fa, 7)
  const fb = normalizeRungs(rungs.fb, 9)
  const fc = normalizeRungs(rungs.fc, 7)

  let C = (rungValue(fa[0]) / constants.S9) + (1 / (2 * constants.S8 + constants.S7))
  for (let i = 1; i <= 5; i += 1) {
    C = (rungValue(fa[i]) / constants.S9) + (1 / (2 * constants.S10 + 1 / C))
  }
  const CA = (rungValue(fa[6]) / constants.S9) + (1 / (2 * constants.S14 + 1 / C))

  C = (rungValue(fb[0]) / constants.S3) + (1 / (2 * constants.S2 + constants.S1))
  for (let i = 1; i <= 7; i += 1) {
    C = (rungValue(fb[i]) / constants.S3) + (1 / (2 * constants.S4 + 1 / C))
  }
  const CB = (rungValue(fb[8]) / constants.S6) + (1 / (2 * constants.S5 + 1 / C))

  C = (rungValue(fc[0]) / constants.S9) + (1 / (2 * constants.S8 + constants.S7))
  for (let i = 1; i <= 5; i += 1) {
    C = (rungValue(fc[i]) / constants.S9) + (1 / (2 * constants.S10 + 1 / C))
  }
  const CC = (rungValue(fc[6]) / constants.S9) + (1 / (2 * constants.S14 + 1 / C))

  const squares = (1 / CA) + (1 / CB) + (1 / CC) + 2 * (constants.S11 + constants.S12 + constants.S13)

  const ohmsPerSquare = calcOhmsPerSquare(startResistance, constants.totalSquares)
  return {
    squares,
    ohmsPerSquare,
    totalResistance: ohmsPerSquare * squares,
  }
}

const calculateE01SideSquares = (constants: LadderConstants, rungs: LadderE01SideRungs): number => {
  const a = normalizeRungs(rungs.a, 9)
  const b = normalizeRungs(rungs.b, 7)
  const c = normalizeRungs(rungs.c, 7)

  let C = (rungValue(a[0]) / constants.S3) + (1 / (2 * constants.S2 + constants.S1))
  for (let i = 1; i <= 7; i += 1) {
    C = (rungValue(a[i]) / constants.S3) + (1 / (2 * constants.S4 + 1 / C))
  }
  const CA = (rungValue(a[8]) / constants.S6) + (1 / (2 * constants.S5 + 1 / C))

  C = (rungValue(b[0]) / constants.S9) + (1 / (2 * constants.S8 + constants.S7))
  for (let i = 1; i <= 5; i += 1) {
    C = (rungValue(b[i]) / constants.S9) + (1 / (2 * constants.S10 + 1 / C))
  }
  const CB = (rungValue(b[6]) / constants.S9) + (1 / (2 * constants.S14 + 1 / C))

  C = (rungValue(c[0]) / constants.S9) + (1 / (2 * constants.S8 + constants.S7))
  for (let i = 1; i <= 5; i += 1) {
    C = (rungValue(c[i]) / constants.S9) + (1 / (2 * constants.S10 + 1 / C))
  }
  const CC = (rungValue(c[6]) / constants.S9) + (1 / (2 * constants.S14 + 1 / C))

  const Rp1 = constants.S13 + constants.S12 + (1 / CA) + constants.S11 + (1 / CB) + constants.S16
  const Rp2 = constants.S19 + constants.S15
  const Rs1 = constants.S17 + (1 / CC) + constants.S18

  if (rungValue(rungs.g) === 1) {
    return ((Rp1 * Rp2) / (Rp1 + Rp2)) + Rs1
  }
  return Rp1 + Rs1
}

const calculateE01Zero = (constants: LadderConstants, rungs: LadderE01Rungs, startResistance12: number, startResistance23: number): E01ZeroResult => {
  const squares12 = calculateE01SideSquares(constants, rungs.left)
  const squares23 = calculateE01SideSquares(constants, rungs.right)

  const ohmsPerSquare12 = calcOhmsPerSquare(startResistance12, constants.totalSquares)
  const ohmsPerSquare23 = calcOhmsPerSquare(startResistance23, constants.totalSquares)

  const resistance12 = ohmsPerSquare12 * squares12
  const resistance23 = ohmsPerSquare23 * squares23

  return {
    resistance12,
    resistance23,
    difference: Math.abs(resistance12 - resistance23),
    squares12,
    squares23,
  }
}

const C01_UNITS = {
  span2c01: {
    ranges: [
      { min: 30, max: 50, set: 'ohm40' },
      { min: 60, max: 110, set: 'ohm80' },
    ],
    sets: {
      ohm40: makeConstants({
        S1: 1.6, S2: 4.37, S3: 3.0, S4: 1.5, S5: 2.2, S6: 2.5, S7: 4.337899543378995,
        S8: 1.5, S9: 52.0, S10: 2.0, S11: 3.5, S12: 76.0, S13: 18.6, S14: 18.6,
        S15: 119.0, S16: 163.0, S17: 2.0, S18: 3.0, S19: 17.9, S20: 776.8, S21: 0, S22: 1.5, S23: 1.5,
        totalSquares: 801.0,
      }),
      ohm80: makeConstants({
        S1: 1.6, S2: 8.74, S3: 3.0, S4: 1.5, S5: 4.4, S6: 2.5, S7: 8.67579908675799,
        S8: 1.5, S9: 104.0, S10: 2.0, S11: 3.5, S12: 140.0, S13: 37.2, S14: 37.2,
        S15: 260.0, S16: 300.0, S17: 2.0, S18: 3.0, S19: 35.8, S20: 1575.4, S21: 0, S22: 1.5, S23: 1.5,
        totalSquares: 1600.0,
      }),
    },
  },
  span3c01: {
    ranges: [
      { min: 30, max: 50, set: 'ohm40' },
      { min: 60, max: 110, set: 'ohm80' },
    ],
    sets: {
      ohm40: makeConstants({
        S1: 1.6, S2: 4.37, S3: 3.0, S4: 1.5, S5: 2.2, S6: 2.5, S7: 4.337899543378995,
        S8: 1.5, S9: 52.0, S10: 2.0, S11: 3.5, S12: 76.0, S13: 18.6, S14: 18.6,
        S15: 119.0, S16: 163.0, S17: 2.0, S18: 3.0, S19: 17.9, S20: 776.8, S21: 0, S22: 1.5, S23: 1.5,
        totalSquares: 801.0,
      }),
      ohm80: makeConstants({
        S1: 1.6, S2: 8.74, S3: 3.0, S4: 1.5, S5: 4.4, S6: 2.5, S7: 8.67579908675799,
        S8: 1.5, S9: 104.0, S10: 2.0, S11: 3.5, S12: 140.0, S13: 37.2, S14: 37.2,
        S15: 260.0, S16: 300.0, S17: 2.0, S18: 3.0, S19: 35.8, S20: 1575.4, S21: 0, S22: 1.5, S23: 1.5,
        totalSquares: 1600.0,
      }),
    },
  },
  spansc13: {
    ranges: [
      { min: 30, max: 50, set: 'ohm40' },
      { min: 60, max: 110, set: 'ohm80' },
    ],
    sets: {
      ohm40: makeConstants({
        S1: 1.6, S2: 4.37, S3: 3.0, S4: 1.5, S5: 2.2, S6: 2.5, S7: 4.337899543378995,
        S8: 1.5, S9: 52.0, S10: 2.0, S11: 3.5, S12: 76.0, S13: 18.6, S14: 18.6,
        S15: 119.0, S16: 163.0, S17: 2.0, S18: 3.0, S19: 17.9, S20: 776.8, S21: 0, S22: 1.5, S23: 1.5,
        totalSquares: 801.0,
      }),
      ohm80: makeConstants({
        S1: 1.6, S2: 8.74, S3: 3.0, S4: 1.5, S5: 4.4, S6: 2.5, S7: 8.67579908675799,
        S8: 1.5, S9: 104.0, S10: 2.0, S11: 3.5, S12: 140.0, S13: 37.2, S14: 37.2,
        S15: 260.0, S16: 300.0, S17: 2.0, S18: 3.0, S19: 35.8, S20: 1575.4, S21: 0, S22: 1.5, S23: 1.5,
        totalSquares: 1600.0,
      }),
    },
  },
  optshc01: {
    ranges: [
      { min: 30, max: 50, set: 'ohm40' },
      { min: 60, max: 110, set: 'ohm80' },
    ],
    sets: {
      ohm40: makeConstants({
        S1: 1.6, S2: 4.37, S3: 3.0, S4: 1.5, S5: 2.2, S6: 2.5, S7: 4.337899543378995,
        S8: 1.5, S9: 52.0, S10: 2.0, S11: 3.5, S12: 76.0, S13: 18.6, S14: 18.6,
        S15: 119.0, S16: 163.0, S17: 2.0, S18: 3.0, S19: 17.9, S20: 776.8, S21: 0, S22: 1.5, S23: 1.5,
        totalSquares: 801.0,
      }),
      ohm80: makeConstants({
        S1: 1.6, S2: 8.74, S3: 3.0, S4: 1.5, S5: 4.4, S6: 2.5, S7: 8.67579908675799,
        S8: 1.5, S9: 104.0, S10: 2.0, S11: 3.5, S12: 140.0, S13: 37.2, S14: 37.2,
        S15: 260.0, S16: 300.0, S17: 2.0, S18: 3.0, S19: 35.8, S20: 1575.4, S21: 0, S22: 1.5, S23: 1.5,
        totalSquares: 1600.0,
      }),
    },
  },
  sample: {
    ranges: [
      { min: 30, max: 50, set: 'ohm40' },
      { min: 60, max: 110, set: 'ohm80' },
    ],
    sets: {
      ohm40: makeConstants({
        S1: 1.6, S2: 4.37, S3: 3.0, S4: 1.5, S5: 2.2, S6: 2.5, S7: 4.337899543378995,
        S8: 1.5, S9: 52.0, S10: 2.0, S11: 3.5, S12: 76.0, S13: 18.6, S14: 18.6,
        S15: 119.0, S16: 163.0, S17: 2.0, S18: 3.0, S19: 17.9, S20: 788.9, S21: 0, S22: 1.5, S23: 1.5,
        totalSquares: 801.0,
      }),
      ohm80: makeConstants({
        S1: 1.6, S2: 8.74, S3: 3.0, S4: 1.5, S5: 4.4, S6: 2.5, S7: 8.67579908675799,
        S8: 1.5, S9: 104.0, S10: 2.0, S11: 3.5, S12: 140.0, S13: 37.2, S14: 37.2,
        S15: 260.0, S16: 300.0, S17: 2.0, S18: 3.0, S19: 35.8, S20: 1587.5, S21: 0, S22: 1.5, S23: 1.5,
        totalSquares: 1600.0,
      }),
    },
  },
} as const

const C11_UNITS = {
  span2c11: makeConstants({
    S1: 1.6, S2: 0.6, S3: 1.3, S4: 2.0, S5: 0.3, S6: 3.0, S7: 0.8, S8: 2.0, S9: 8.1,
    S10: 2.0, S11: 2.0, S12: 20.0, S13: 8.8, S14: 8.8, S15: 17.2, S16: 35.0, S17: 2.0,
    S18: 2.0, S19: 17.2, S20: 90.6, S21: 39.0, S22: 1.5, S23: 1.5,
    totalSquares: 150.0,
  }),
  span3c11: makeConstants({
    S1: 1.6, S2: 0.6, S3: 1.3, S4: 2.0, S5: 0.3, S6: 3.0, S7: 0.8, S8: 2.0, S9: 8.8,
    S10: 2.0, S11: 2.0, S12: 20.0, S13: 8.8, S14: 8.8, S15: 17.2, S16: 35.0, S17: 2.0,
    S18: 2.0, S19: 17.2, S20: 90.5, S21: 39.0, S22: 1.5, S23: 1.5,
    totalSquares: 150.0,
  }),
  spansc11: makeConstants({
    S1: 1.6, S2: 0.6, S3: 1.3, S4: 2.0, S5: 0.3, S6: 3.0, S7: 0.8, S8: 2.0, S9: 8.8,
    S10: 2.0, S11: 2.0, S12: 20.0, S13: 8.8, S14: 8.8, S15: 17.2, S16: 35.0, S17: 2.0,
    S18: 2.0, S19: 17.2, S20: 90.5, S21: 39.0, S22: 1.5, S23: 1.5,
    totalSquares: 150.0,
  }),
  optshc11: makeConstants({
    S1: 1.6, S2: 0.6, S3: 1.3, S4: 2.0, S5: 0.3, S6: 3.0, S7: 0.8, S8: 2.0, S9: 8.8,
    S10: 2.0, S11: 2.0, S12: 20.0, S13: 8.8, S14: 8.8, S15: 17.2, S16: 35.0, S17: 2.0,
    S18: 2.0, S19: 17.2, S20: 90.5, S21: 39.0, S22: 1.5, S23: 1.5,
    totalSquares: 150.0,
  }),
} as const

const C12_UNITS = {
  spn21210: makeConstants({
    S1: 1.6, S2: 1.0, S3: 1.8, S4: 1.0, S5: 0.26, S6: 2.7, S7: 1.0, S8: 6.375, S9: 0.0,
    S10: 1.0, S11: 0.0, S12: 1.5, S13: 26.1, S14: 52.3, S15: 0.0, S16: 0.0, S17: 2.0,
    S18: 2.0, S19: 0.0, S20: 195.3, S21: 6.9, S22: 1.5, S23: 1.5,
    totalSquares: 220.0,
  }),
  spn31210: makeConstants({
    S1: 1.6, S2: 1.0, S3: 1.8, S4: 1.0, S5: 0.26, S6: 2.7, S7: 1.0, S8: 6.375, S9: 0.0,
    S10: 1.0, S11: 0.0, S12: 1.5, S13: 26.1, S14: 52.3, S15: 0.0, S16: 0.0, S17: 2.0,
    S18: 2.0, S19: 0.0, S20: 195.3, S21: 6.9, S22: 1.5, S23: 1.5,
    totalSquares: 220.0,
  }),
  spns1210: makeConstants({
    S1: 1.6, S2: 1.0, S3: 1.8, S4: 1.0, S5: 0.26, S6: 2.7, S7: 1.0, S8: 6.375, S9: 0.0,
    S10: 1.0, S11: 0.0, S12: 1.5, S13: 26.1, S14: 52.3, S15: 0.0, S16: 0.0, S17: 2.0,
    S18: 2.0, S19: 0.0, S20: 195.3, S21: 6.9, S22: 1.5, S23: 1.5,
    totalSquares: 220.0,
  }),
  opsh1210: makeConstants({
    S1: 1.6, S2: 1.0, S3: 1.8, S4: 1.0, S5: 0.26, S6: 2.7, S7: 1.0, S8: 6.375, S9: 0.0,
    S10: 1.0, S11: 0.0, S12: 1.5, S13: 26.1, S14: 52.3, S15: 0.0, S16: 0.0, S17: 2.0,
    S18: 2.0, S19: 0.0, S20: 195.3, S21: 6.9, S22: 1.5, S23: 1.5,
    totalSquares: 220.0,
  }),
  spn21220: makeConstants({
    S1: 1.6, S2: 2.9, S3: 2.5, S4: 1.0, S5: 1.3, S6: 3.5, S7: 2.0, S8: 1.0, S9: 19.2,
    S10: 2.0, S11: 2.0, S12: 42.0, S13: 19.5, S14: 19.5, S15: 41.2, S16: 85.4, S17: 2.0,
    S18: 3.0, S19: 41.2, S20: 393.7, S21: 25, S22: 1.5, S23: 1.5,
    totalSquares: 440.0,
  }),
  spn31220: makeConstants({
    S1: 1.6, S2: 2.9, S3: 2.5, S4: 1.0, S5: 1.3, S6: 3.5, S7: 2.0, S8: 1.0, S9: 19.2,
    S10: 2.0, S11: 2.0, S12: 42.0, S13: 19.5, S14: 19.5, S15: 41.2, S16: 85.4, S17: 2.0,
    S18: 3.0, S19: 41.2, S20: 393.7, S21: 25, S22: 1.5, S23: 1.5,
    totalSquares: 440.0,
  }),
  spns1220: makeConstants({
    S1: 1.6, S2: 2.9, S3: 2.5, S4: 1.0, S5: 1.3, S6: 3.5, S7: 2.0, S8: 1.0, S9: 19.2,
    S10: 2.0, S11: 2.0, S12: 42.0, S13: 19.5, S14: 19.5, S15: 41.2, S16: 85.4, S17: 2.0,
    S18: 3.0, S19: 41.2, S20: 393.7, S21: 25, S22: 1.5, S23: 1.5,
    totalSquares: 440.0,
  }),
  opsh1220: makeConstants({
    S1: 1.6, S2: 2.9, S3: 2.5, S4: 1.0, S5: 1.3, S6: 3.5, S7: 2.0, S8: 1.0, S9: 19.2,
    S10: 2.0, S11: 2.0, S12: 42.0, S13: 19.5, S14: 19.5, S15: 41.2, S16: 85.4, S17: 2.0,
    S18: 3.0, S19: 41.2, S20: 393.7, S21: 25, S22: 1.5, S23: 1.5,
    totalSquares: 440.0,
  }),
} as const

const D01_UNITS = {
  cutd01: makeConstants({
    S1: 2.38, S2: 2.678571428571429, S3: 4.76, S4: 4.464285714285714, S5: 4.464285714285714, S6: 2.94,
    S7: 1.1764705882352942, S8: 2.678571428571429, S9: 1.7600000000000002, S10: 2.678571428571429,
    S11: 1.8399999999999999, S12: 2.678571428571429, S13: 1.85, S14: 2.410714285714286,
    totalSquares: 17.855829278,
  }),
  d012pt: makeConstants({
    S1: 2.38, S2: 2.678571428571429, S3: 4.76, S4: 4.464285714285714, S5: 4.464285714285714, S6: 2.94,
    S7: 1.1764705882352942, S8: 2.678571428571429, S9: 1.7600000000000002, S10: 2.678571428571429,
    S11: 1.8399999999999999, S12: 2.678571428571429, S13: 1.85, S14: 2.410714285714286,
    totalSquares: 17.855829278,
  }),
  d013pt: makeConstants({
    S1: 2.38, S2: 2.678571428571429, S3: 4.76, S4: 4.464285714285714, S5: 4.464285714285714, S6: 2.94,
    S7: 1.1764705882352942, S8: 2.678571428571429, S9: 1.7600000000000002, S10: 2.678571428571429,
    S11: 1.8399999999999999, S12: 2.678571428571429, S13: 1.85, S14: 2.410714285714286,
    totalSquares: 17.855829278,
  }),
  d01spans: makeConstants({
    S1: 2.38, S2: 2.678571428571429, S3: 4.76, S4: 4.464285714285714, S5: 4.464285714285714, S6: 2.94,
    S7: 1.1764705882352942, S8: 2.678571428571429, S9: 1.7600000000000002, S10: 2.678571428571429,
    S11: 1.8399999999999999, S12: 2.678571428571429, S13: 1.85, S14: 2.410714285714286,
    totalSquares: 17.855829278,
  }),
  setd01: makeConstants({
    S1: 2.38, S2: 2.678571428571429, S3: 4.76, S4: 4.464285714285714, S5: 4.464285714285714, S6: 2.94,
    S7: 1.1363636363636362, S8: 2.678571428571429, S9: 1.7600000000000002, S10: 2.678571428571429,
    S11: 1.8399999999999999, S12: 2.678571428571429, S13: 1.85, S14: 2.410714285714286,
    totalSquares: 17.855829278,
  }),
  optshd01: makeConstants({
    S1: 2.38, S2: 2.678571428571429, S3: 4.76, S4: 4.464285714285714, S5: 4.464285714285714, S6: 2.94,
    S7: 1.1764705882352942, S8: 2.678571428571429, S9: 1.7600000000000002, S10: 2.678571428571429,
    S11: 1.8399999999999999, S12: 2.678571428571429, S13: 1.85, S14: 2.410714285714286,
    totalSquares: 17.855829278,
  }),
} as const

const E01_UNITS = {
  e01zero: makeConstants({
    S1: 2.38, S2: 2.678571, S3: 4.76, S4: 4.464286, S5: 4.464286, S6: 2.94, S7: 1.176471, S8: 2.678571,
    S9: 1.76, S10: 2.678571, S11: 1.84, S12: 2.678571, S13: 1.85, S14: 2.410714, S15: 18,
    S16: 2.12, S17: 2.12, S18: 0.4, S19: 1.85,
    totalSquares: 11.407340954,
  }),
  cute01: makeConstants({
    S1: 2.38, S2: 2.678571, S3: 4.76, S4: 4.464286, S5: 4.464286, S6: 2.94, S7: 1.176471, S8: 2.678571,
    S9: 1.76, S10: 2.678571, S11: 1.84, S12: 2.678571, S13: 1.85, S14: 2.410714, S15: 18,
    S16: 2.12, S17: 2.12, S18: 0.4, S19: 1.85,
    totalSquares: 11.407340954,
  }),
} as const

export type C01UnitKey = keyof typeof C01_UNITS
export type C11UnitKey = keyof typeof C11_UNITS
export type C12UnitKey = keyof typeof C12_UNITS
export type D01UnitKey = keyof typeof D01_UNITS
export type E01UnitKey = keyof typeof E01_UNITS

const selectC01Set = (unit: C01UnitKey, startResistance: number, explicitSet?: 'ohm40' | 'ohm80') => {
  const config = C01_UNITS[unit]
  if (explicitSet) return config.sets[explicitSet]
  for (const range of config.ranges) {
    if (startResistance >= range.min && startResistance <= range.max) {
      return config.sets[range.set]
    }
  }
  throw new Error(`startResistance ${startResistance} is out of range for ${unit}`)
}

const assertRange = (value: number, min: number, max: number, label: string) => {
  if (value < min || value > max) {
    throw new Error(`${label} must be between ${min} and ${max}`)
  }
}

export const calculateC01Unit = (unit: C01UnitKey, params: { startResistance: number; rungs: LadderC01Rungs; ohmSet?: 'ohm40' | 'ohm80' }): LadderResult => {
  const constants = selectC01Set(unit, params.startResistance, params.ohmSet)
  return calculateC01Ladder(constants, params.rungs, params.startResistance)
}

export const calculateC11Unit = (unit: C11UnitKey, params: { startResistance: number; rungs: LadderC11Rungs }): LadderResult => {
  assertRange(params.startResistance, 3, 7, 'startResistance')
  return calculateC11Ladder(C11_UNITS[unit], params.rungs, params.startResistance)
}

export const calculateC12Unit = (unit: C12UnitKey, params: { startResistance: number; rungs: LadderC12Rungs }): LadderResult => {
  if (unit === 'spn21220' || unit === 'spn31220' || unit === 'spns1220' || unit === 'opsh1220') {
    assertRange(params.startResistance, 16, 24, 'startResistance')
  } else {
    assertRange(params.startResistance, 7, 13, 'startResistance')
  }
  return calculateC12Ladder(C12_UNITS[unit], params.rungs, params.startResistance)
}

export const calculateD01Unit = (unit: D01UnitKey, params: { startResistance: number; rungs: LadderD01Rungs }): LadderResult => {
  assertRange(params.startResistance, 0.01, 10, 'startResistance')
  return calculateD01Ladder(D01_UNITS[unit], params.rungs, params.startResistance)
}

export const calculateE01Unit = (unit: E01UnitKey, params: { startResistance12: number; startResistance23: number; rungs: LadderE01Rungs }): E01ZeroResult => {
  assertRange(params.startResistance12, 0.01, 10, 'startResistance12')
  assertRange(params.startResistance23, 0.01, 10, 'startResistance23')
  return calculateE01Zero(E01_UNITS[unit], params.rungs, params.startResistance12, params.startResistance23)
}

export const LADDER_UNIT_KEYS = {
  c01: Object.keys(C01_UNITS) as C01UnitKey[],
  c11: Object.keys(C11_UNITS) as C11UnitKey[],
  c12: Object.keys(C12_UNITS) as C12UnitKey[],
  d01: Object.keys(D01_UNITS) as D01UnitKey[],
  e01: Object.keys(E01_UNITS) as E01UnitKey[],
}

export const LADDER_UNITS = {
  C01_UNITS,
  C11_UNITS,
  C12_UNITS,
  D01_UNITS,
  E01_UNITS,
}

// ─────────────────────────────────────────────────────────────────────────────
// Inverse solver — find the rung-cut pattern closest to a target resistance
// ─────────────────────────────────────────────────────────────────────────────
//
// Strategy: greedy cut search.
//
// Cutting a rung (false → true) removes it from the ladder network.
// Because each rung only adds conductance when uncut, cutting can only
// increase resistance (or leave it unchanged).  Therefore:
//   • all rungs uncut (false) → minimum achievable resistance
//   • all rungs cut  (true)  → maximum achievable resistance
//
// Algorithm (O(N²), N ≤ 28 rungs):
//   1. Start from all-uncut (R_min).
//   2. At each step, trial-cut every remaining uncut rung.
//   3. Keep the cut that minimises |R_trial − target|.
//   4. Repeat until no single cut reduces the error further.
//
// This finds the locally optimal cut pattern.  For the discrete trim networks
// used here the greedy path reliably achieves sub-percent error on mid-range
// targets.

export interface LadderSolveResult<TRungs> {
  rungs: TRungs
  achievedResistance: number
  targetResistance: number
  /** |achieved − target| in ohms */
  absoluteError: number
  /** |achieved − target| / |target| × 100 */
  relativeErrorPct: number
  /**
   * 'none'       — target was inside the network's range
   * 'below-min'  — target ≤ R_min; result is the all-uncut pattern
   * 'above-max'  — target ≥ R_max; result is the all-cut pattern
   */
  clipped: 'none' | 'below-min' | 'above-max'
}

// Internal flat boolean representation: false = uncut, true = cut.
type FlatRungs = boolean[]

function solveGreedy(
  calcFromFlat: (flat: FlatRungs) => number,
  nRungs: number,
  target: number,
): { flat: FlatRungs; achieved: number; clipped: 'none' | 'below-min' | 'above-max' } {
  // Minimum resistance: all uncut
  const flatMin: FlatRungs = new Array(nRungs).fill(false)
  const Rmin = calcFromFlat(flatMin)
  if (target <= Rmin) {
    return { flat: flatMin, achieved: Rmin, clipped: 'below-min' }
  }

  // Maximum resistance: all cut
  const flatMax: FlatRungs = new Array(nRungs).fill(true)
  const Rmax = calcFromFlat(flatMax)
  if (target >= Rmax) {
    return { flat: flatMax, achieved: Rmax, clipped: 'above-max' }
  }

  // Greedy cut search
  const flat: FlatRungs = new Array(nRungs).fill(false)
  let R = Rmin
  let improved = true

  while (improved) {
    improved = false
    let bestIdx = -1
    let bestR = R
    let bestError = Math.abs(R - target)

    for (let i = 0; i < nRungs; i++) {
      if (flat[i]) continue          // already cut
      flat[i] = true
      const trial = calcFromFlat(flat)
      const err = Math.abs(trial - target)
      if (err < bestError) {
        bestError = err
        bestR = trial
        bestIdx = i
      }
      flat[i] = false                // restore
    }

    if (bestIdx >= 0) {
      flat[bestIdx] = true
      R = bestR
      improved = true
    }
  }

  return { flat, achieved: R, clipped: 'none' }
}

function makeSolveResult<TRungs>(
  rungs: TRungs,
  achieved: number,
  target: number,
  clipped: 'none' | 'below-min' | 'above-max',
): LadderSolveResult<TRungs> {
  const absoluteError = Math.abs(achieved - target)
  const relativeErrorPct = target === 0 ? 0 : (absoluteError / Math.abs(target)) * 100
  return { rungs, achievedResistance: achieved, targetResistance: target, absoluteError, relativeErrorPct, clipped }
}

// Rung counts per family
const N_C01      = 28  // fa[10] + sa[10] + b[4] + fc[2] + sc[2]
const N_C11      = 28  // a[10]  + b[10]  + c[4] + d[4]
const N_C12      = 28  // fa[10] + sa[10] + b[4]  + c[4]
const N_D01      = 23  // fa[7]  + fb[9]  + fc[7]
const N_E01_SIDE = 24  // a[9]   + b[7]   + c[7]  + g[1]

// Unpack flat boolean arrays back into the typed rung structures
function unpackC01(flat: FlatRungs): LadderC01Rungs {
  return { fa: flat.slice(0, 10), sa: flat.slice(10, 20), b: flat.slice(20, 24), fc: flat.slice(24, 26), sc: flat.slice(26, 28) }
}

function unpackC11(flat: FlatRungs): LadderC11Rungs {
  return { a: flat.slice(0, 10), b: flat.slice(10, 20), c: flat.slice(20, 24), d: flat.slice(24, 28) }
}

function unpackC12(flat: FlatRungs): LadderC12Rungs {
  return { fa: flat.slice(0, 10), sa: flat.slice(10, 20), b: flat.slice(20, 24), c: flat.slice(24, 28) }
}

function unpackD01(flat: FlatRungs): LadderD01Rungs {
  return { fa: flat.slice(0, 7), fb: flat.slice(7, 16), fc: flat.slice(16, 23) }
}

function unpackE01Side(flat: FlatRungs): LadderE01SideRungs {
  return { a: flat.slice(0, 9), b: flat.slice(9, 16), c: flat.slice(16, 23), g: flat[23] }
}

// ── Public solver API ────────────────────────────────────────────────────────

/**
 * Find the C01-family cut pattern whose total resistance is closest to
 * `targetResistance`.
 */
export function solveC01Rungs(
  unit: C01UnitKey,
  params: { startResistance: number; targetResistance: number; ohmSet?: 'ohm40' | 'ohm80' },
): LadderSolveResult<LadderC01Rungs> {
  const constants = selectC01Set(unit, params.startResistance, params.ohmSet)
  const calc = (flat: FlatRungs) =>
    calculateC01Ladder(constants, unpackC01(flat), params.startResistance).totalResistance
  const { flat, achieved, clipped } = solveGreedy(calc, N_C01, params.targetResistance)
  return makeSolveResult(unpackC01(flat), achieved, params.targetResistance, clipped)
}

/**
 * Find the C11-family cut pattern whose total resistance is closest to
 * `targetResistance`.
 */
export function solveC11Rungs(
  unit: C11UnitKey,
  params: { startResistance: number; targetResistance: number },
): LadderSolveResult<LadderC11Rungs> {
  assertRange(params.startResistance, 3, 7, 'startResistance')
  const constants = C11_UNITS[unit]
  const calc = (flat: FlatRungs) =>
    calculateC11Ladder(constants, unpackC11(flat), params.startResistance).totalResistance
  const { flat, achieved, clipped } = solveGreedy(calc, N_C11, params.targetResistance)
  return makeSolveResult(unpackC11(flat), achieved, params.targetResistance, clipped)
}

/**
 * Find the C12-family cut pattern whose total resistance is closest to
 * `targetResistance`.
 */
export function solveC12Rungs(
  unit: C12UnitKey,
  params: { startResistance: number; targetResistance: number },
): LadderSolveResult<LadderC12Rungs> {
  if (unit === 'spn21220' || unit === 'spn31220' || unit === 'spns1220' || unit === 'opsh1220') {
    assertRange(params.startResistance, 16, 24, 'startResistance')
  } else {
    assertRange(params.startResistance, 7, 13, 'startResistance')
  }
  const constants = C12_UNITS[unit]
  const calc = (flat: FlatRungs) =>
    calculateC12Ladder(constants, unpackC12(flat), params.startResistance).totalResistance
  const { flat, achieved, clipped } = solveGreedy(calc, N_C12, params.targetResistance)
  return makeSolveResult(unpackC12(flat), achieved, params.targetResistance, clipped)
}

/**
 * Find the D01-family cut pattern whose total resistance is closest to
 * `targetResistance`.
 */
export function solveD01Rungs(
  unit: D01UnitKey,
  params: { startResistance: number; targetResistance: number },
): LadderSolveResult<LadderD01Rungs> {
  assertRange(params.startResistance, 0.01, 10, 'startResistance')
  const constants = D01_UNITS[unit]
  const calc = (flat: FlatRungs) =>
    calculateD01Ladder(constants, unpackD01(flat), params.startResistance).totalResistance
  const { flat, achieved, clipped } = solveGreedy(calc, N_D01, params.targetResistance)
  return makeSolveResult(unpackD01(flat), achieved, params.targetResistance, clipped)
}

/**
 * Find the E01-family cut pattern for ONE bridge side whose resistance is
 * closest to `targetResistance`.  Call twice (left side, right side) to solve
 * both halves of the E01 zero-balance network independently.
 */
export function solveE01SideRungs(
  unit: E01UnitKey,
  params: { startResistance: number; targetResistance: number },
): LadderSolveResult<LadderE01SideRungs> {
  assertRange(params.startResistance, 0.01, 10, 'startResistance')
  const constants = E01_UNITS[unit]
  const opp = calcOhmsPerSquare(params.startResistance, constants.totalSquares)
  const calc = (flat: FlatRungs) =>
    opp * calculateE01SideSquares(constants, unpackE01Side(flat))
  const { flat, achieved, clipped } = solveGreedy(calc, N_E01_SIDE, params.targetResistance)
  return makeSolveResult(unpackE01Side(flat), achieved, params.targetResistance, clipped)
}
