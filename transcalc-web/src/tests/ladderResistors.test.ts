import { describe, expect, it } from 'vitest'
import {
  calculateC01Unit,
  calculateC11Unit,
  calculateC12Unit,
  calculateD01Unit,
  calculateE01Unit,
  LADDER_UNIT_KEYS,
} from '../domain/ladderResistors'

const makeRungs = (length: number, cut: boolean = false) => Array.from({ length }, () => cut)

const expectPositive = (value: number) => {
  expect(Number.isFinite(value)).toBe(true)
  expect(value).toBeGreaterThan(0)
}

describe('ladderResistors - C01 units', () => {
  for (const unit of LADDER_UNIT_KEYS.c01) {
    it(`${unit} computes resistance and responds to cuts`, () => {
      const base = calculateC01Unit(unit, {
        startResistance: 40,
        rungs: {
          fa: makeRungs(10),
          sa: makeRungs(10),
          b: makeRungs(4),
          fc: makeRungs(2),
          sc: makeRungs(2),
        },
      })

      expectPositive(base.totalResistance)

      const cut = calculateC01Unit(unit, {
        startResistance: 40,
        rungs: {
          fa: [true, ...makeRungs(9)],
          sa: makeRungs(10),
          b: makeRungs(4),
          fc: makeRungs(2),
          sc: makeRungs(2),
        },
      })

      expectPositive(cut.totalResistance)
      expect(cut.totalResistance).not.toEqual(base.totalResistance)
    })
  }
})

describe('ladderResistors - C11 units', () => {
  for (const unit of LADDER_UNIT_KEYS.c11) {
    it(`${unit} computes resistance and responds to cuts`, () => {
      const base = calculateC11Unit(unit, {
        startResistance: 5,
        rungs: {
          a: makeRungs(10),
          b: makeRungs(10),
          c: makeRungs(4),
          d: makeRungs(4),
        },
      })

      expectPositive(base.totalResistance)

      const cut = calculateC11Unit(unit, {
        startResistance: 5,
        rungs: {
          a: [true, ...makeRungs(9)],
          b: makeRungs(10),
          c: makeRungs(4),
          d: makeRungs(4),
        },
      })

      expectPositive(cut.totalResistance)
      expect(cut.totalResistance).not.toEqual(base.totalResistance)
    })
  }
})

describe('ladderResistors - C12 units', () => {
  for (const unit of LADDER_UNIT_KEYS.c12) {
    const startResistance = (unit === 'spn21220' || unit === 'spn31220' || unit === 'spns1220' || unit === 'opsh1220') ? 20 : 10
    it(`${unit} computes resistance and responds to cuts`, () => {
      const base = calculateC12Unit(unit, {
        startResistance,
        rungs: {
          fa: makeRungs(10),
          sa: makeRungs(10),
          b: makeRungs(4),
          c: makeRungs(4),
        },
      })

      expectPositive(base.totalResistance)

      const cut = calculateC12Unit(unit, {
        startResistance,
        rungs: {
          fa: [true, ...makeRungs(9)],
          sa: makeRungs(10),
          b: makeRungs(4),
          c: makeRungs(4),
        },
      })

      expectPositive(cut.totalResistance)
      expect(cut.totalResistance).not.toEqual(base.totalResistance)
    })
  }
})

describe('ladderResistors - D01 units', () => {
  for (const unit of LADDER_UNIT_KEYS.d01) {
    it(`${unit} computes resistance and responds to cuts`, () => {
      const base = calculateD01Unit(unit, {
        startResistance: 5,
        rungs: {
          fa: makeRungs(7),
          fb: makeRungs(9),
          fc: makeRungs(7),
        },
      })

      expectPositive(base.totalResistance)

      const cut = calculateD01Unit(unit, {
        startResistance: 5,
        rungs: {
          fa: [true, ...makeRungs(6)],
          fb: makeRungs(9),
          fc: makeRungs(7),
        },
      })

      expectPositive(cut.totalResistance)
      expect(cut.totalResistance).not.toEqual(base.totalResistance)
    })
  }
})

describe('ladderResistors - E01 units', () => {
  for (const unit of LADDER_UNIT_KEYS.e01) {
    it(`${unit} computes both sides and difference`, () => {
      const base = calculateE01Unit(unit, {
        startResistance12: 5,
        startResistance23: 5,
        rungs: {
          left: {
            a: makeRungs(9),
            b: makeRungs(7),
            c: makeRungs(7),
            g: false,
          },
          right: {
            a: makeRungs(9),
            b: makeRungs(7),
            c: makeRungs(7),
            g: false,
          },
        },
      })

      expectPositive(base.resistance12)
      expectPositive(base.resistance23)
      expect(base.difference).toBeGreaterThanOrEqual(0)

      const cut = calculateE01Unit(unit, {
        startResistance12: 5,
        startResistance23: 5,
        rungs: {
          left: {
            a: [true, ...makeRungs(8)],
            b: makeRungs(7),
            c: makeRungs(7),
            g: false,
          },
          right: {
            a: makeRungs(9),
            b: makeRungs(7),
            c: makeRungs(7),
            g: false,
          },
        },
      })

      expectPositive(cut.resistance12)
      expectPositive(cut.resistance23)
      expect(cut.resistance12).not.toEqual(base.resistance12)
    })
  }
})
