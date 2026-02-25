import { describe, it, expect } from 'vitest'
import {
  // Forward calculators (used to verify round-trips)
  calculateC01Unit,
  calculateC11Unit,
  calculateC12Unit,
  calculateD01Unit,
  calculateE01Unit,
  // Inverse solvers
  solveC01Rungs,
  solveC11Rungs,
  solveC12Rungs,
  solveD01Rungs,
  solveE01SideRungs,
  // Key lists for parametric coverage
  LADDER_UNIT_KEYS,
  // Types
  LadderSolveResult,
  LadderC01Rungs,
  LadderC12Rungs,
  LadderE01SideRungs,
} from '../domain/ladderResistors'

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

/** All rungs uncut → minimum resistance for the given forward function. */
const allFalse = (n: number) => new Array(n).fill(false)

/** All rungs cut → maximum resistance for the given forward function. */
const allTrue = (n: number) => new Array(n).fill(true)

/** Assert that solve result metadata is self-consistent. */
function assertResultConsistency<T>(result: LadderSolveResult<T>) {
  expect(result.achievedResistance).toBeGreaterThan(0)
  expect(result.absoluteError).toBeCloseTo(
    Math.abs(result.achievedResistance - result.targetResistance), 8,
  )
  const expectedPct =
    result.targetResistance === 0
      ? 0
      : (result.absoluteError / Math.abs(result.targetResistance)) * 100
  expect(result.relativeErrorPct).toBeCloseTo(expectedPct, 6)
}

// ─────────────────────────────────────────────────────────────────────────────
// D01 — simplest network (23 rungs, relatively coarse resolution)
// ─────────────────────────────────────────────────────────────────────────────

describe('solveD01Rungs — core behaviour', () => {
  const unit = 'd012pt'
  const start = 5

  it('round-trip: forward calc of solved rungs equals achievedResistance', () => {
    const target = 3.5
    const result = solveD01Rungs(unit, { startResistance: start, targetResistance: target })
    const forward = calculateD01Unit(unit, { startResistance: start, rungs: result.rungs })
    expect(forward.totalResistance).toBeCloseTo(result.achievedResistance, 8)
  })

  it('metadata fields are self-consistent', () => {
    const result = solveD01Rungs(unit, { startResistance: start, targetResistance: 3.5 })
    assertResultConsistency(result)
    expect(result.targetResistance).toBe(3.5)
  })

  it('achieves resistance within 10 % of mid-range target', () => {
    // Determine range dynamically using all-uncut / all-cut patterns
    const rmin = calculateD01Unit(unit, {
      startResistance: start,
      rungs: { fa: allFalse(7), fb: allFalse(9), fc: allFalse(7) },
    }).totalResistance
    const rmax = calculateD01Unit(unit, {
      startResistance: start,
      rungs: { fa: allTrue(7), fb: allTrue(9), fc: allTrue(7) },
    }).totalResistance

    const target = (rmin + rmax) / 2
    const result = solveD01Rungs(unit, { startResistance: start, targetResistance: target })
    expect(result.relativeErrorPct).toBeLessThan(10)
    expect(result.clipped).toBe('none')
  })

  it('clips to all-uncut when target is below minimum resistance', () => {
    const result = solveD01Rungs(unit, { startResistance: start, targetResistance: 0.001 })
    expect(result.clipped).toBe('below-min')
    // All rungs should be uncut (false)
    const rungs = result.rungs
    expect(rungs.fa.every(r => r === false)).toBe(true)
    expect(rungs.fb.every(r => r === false)).toBe(true)
    expect(rungs.fc.every(r => r === false)).toBe(true)
  })

  it('clips to all-cut when target exceeds maximum resistance', () => {
    const result = solveD01Rungs(unit, { startResistance: start, targetResistance: 9999 })
    expect(result.clipped).toBe('above-max')
    const rungs = result.rungs
    expect(rungs.fa.every(r => r === true)).toBe(true)
    expect(rungs.fb.every(r => r === true)).toBe(true)
    expect(rungs.fc.every(r => r === true)).toBe(true)
  })

  it('target equal to minimum returns below-min clip', () => {
    const rmin = calculateD01Unit(unit, {
      startResistance: start,
      rungs: { fa: allFalse(7), fb: allFalse(9), fc: allFalse(7) },
    }).totalResistance
    const result = solveD01Rungs(unit, { startResistance: start, targetResistance: rmin })
    expect(result.clipped).toBe('below-min')
    expect(result.achievedResistance).toBeCloseTo(rmin, 6)
  })

  it('achieved resistance is >= min resistance (never cuts below floor)', () => {
    const rmin = calculateD01Unit(unit, {
      startResistance: start,
      rungs: { fa: allFalse(7), fb: allFalse(9), fc: allFalse(7) },
    }).totalResistance
    const result = solveD01Rungs(unit, { startResistance: start, targetResistance: 4.0 })
    expect(result.achievedResistance).toBeGreaterThanOrEqual(rmin - 1e-10)
  })
})

describe('solveD01Rungs — all unit keys produce valid results', () => {
  for (const unit of LADDER_UNIT_KEYS.d01) {
    it(`${unit}: round-trip and error < 10 %`, () => {
      const start = 5
      const rmin = calculateD01Unit(unit, {
        startResistance: start,
        rungs: { fa: allFalse(7), fb: allFalse(9), fc: allFalse(7) },
      }).totalResistance
      const rmax = calculateD01Unit(unit, {
        startResistance: start,
        rungs: { fa: allTrue(7), fb: allTrue(9), fc: allTrue(7) },
      }).totalResistance

      const target = rmin + (rmax - rmin) * 0.6
      const result = solveD01Rungs(unit, { startResistance: start, targetResistance: target })

      // Round-trip
      const fwd = calculateD01Unit(unit, { startResistance: start, rungs: result.rungs })
      expect(fwd.totalResistance).toBeCloseTo(result.achievedResistance, 8)
      expect(result.relativeErrorPct).toBeLessThan(10)
      assertResultConsistency(result)
    })
  }
})

// ─────────────────────────────────────────────────────────────────────────────
// C11 — medium network (28 rungs, 5 Ω start)
// ─────────────────────────────────────────────────────────────────────────────

describe('solveC11Rungs — core behaviour', () => {
  const unit = 'span2c11'
  const start = 5

  it('round-trip: forward calc equals achievedResistance', () => {
    const result = solveC11Rungs(unit, { startResistance: start, targetResistance: 4.0 })
    const fwd = calculateC11Unit(unit, { startResistance: start, rungs: result.rungs })
    expect(fwd.totalResistance).toBeCloseTo(result.achievedResistance, 8)
  })

  it('achieves resistance within 10 % of mid-range target', () => {
    const rmin = calculateC11Unit(unit, {
      startResistance: start,
      rungs: { a: allFalse(10), b: allFalse(10), c: allFalse(4), d: allFalse(4) },
    }).totalResistance
    const rmax = calculateC11Unit(unit, {
      startResistance: start,
      rungs: { a: allTrue(10), b: allTrue(10), c: allTrue(4), d: allTrue(4) },
    }).totalResistance

    const target = (rmin + rmax) / 2
    const result = solveC11Rungs(unit, { startResistance: start, targetResistance: target })
    expect(result.relativeErrorPct).toBeLessThan(10)
    expect(result.clipped).toBe('none')
  })

  it('clips below', () => {
    const result = solveC11Rungs(unit, { startResistance: start, targetResistance: 0.001 })
    expect(result.clipped).toBe('below-min')
  })

  it('clips above', () => {
    const result = solveC11Rungs(unit, { startResistance: start, targetResistance: 9999 })
    expect(result.clipped).toBe('above-max')
  })
})

describe('solveC11Rungs — all unit keys produce valid results', () => {
  for (const unit of LADDER_UNIT_KEYS.c11) {
    it(`${unit}: round-trip and error < 10 %`, () => {
      const start = 5
      const rmin = calculateC11Unit(unit, {
        startResistance: start,
        rungs: { a: allFalse(10), b: allFalse(10), c: allFalse(4), d: allFalse(4) },
      }).totalResistance
      const rmax = calculateC11Unit(unit, {
        startResistance: start,
        rungs: { a: allTrue(10), b: allTrue(10), c: allTrue(4), d: allTrue(4) },
      }).totalResistance

      const target = rmin + (rmax - rmin) * 0.5
      const result = solveC11Rungs(unit, { startResistance: start, targetResistance: target })
      const fwd = calculateC11Unit(unit, { startResistance: start, rungs: result.rungs })
      expect(fwd.totalResistance).toBeCloseTo(result.achievedResistance, 8)
      expect(result.relativeErrorPct).toBeLessThan(10)
    })
  }
})

// ─────────────────────────────────────────────────────────────────────────────
// C01 — 28-rung network, ohm40 and ohm80 sets
// ─────────────────────────────────────────────────────────────────────────────

describe('solveC01Rungs — core behaviour', () => {
  const unit = 'span2c01'

  it('round-trip with ohm40 set (startResistance=40)', () => {
    const start = 40
    const result = solveC01Rungs(unit, { startResistance: start, targetResistance: 38 })
    const fwd = calculateC01Unit(unit, { startResistance: start, rungs: result.rungs })
    expect(fwd.totalResistance).toBeCloseTo(result.achievedResistance, 8)
  })

  it('round-trip with ohm80 set (startResistance=80)', () => {
    const start = 80
    const result = solveC01Rungs(unit, { startResistance: start, targetResistance: 75 })
    const fwd = calculateC01Unit(unit, { startResistance: start, rungs: result.rungs })
    expect(fwd.totalResistance).toBeCloseTo(result.achievedResistance, 8)
  })

  it('explicit ohmSet override is respected', () => {
    // When both sets are clipped below-min the achieved resistance equals each
    // set's minimum (all-uncut value), which differs between ohm40 and ohm80
    // constants.  We verify they are strictly unequal rather than checking a
    // numeric gap, because the difference is small (~0.002 Ω).
    const start = 40
    const rOhm40 = solveC01Rungs(unit, {
      startResistance: start, targetResistance: 0.001, ohmSet: 'ohm40',
    })
    const rOhm80 = solveC01Rungs(unit, {
      startResistance: start, targetResistance: 0.001, ohmSet: 'ohm80',
    })
    expect(rOhm40.clipped).toBe('below-min')
    expect(rOhm80.clipped).toBe('below-min')
    // The two constant sets have different S values → different minimum totals
    expect(rOhm40.achievedResistance).not.toBe(rOhm80.achievedResistance)
  })

  it('achieves resistance within 5 % of mid-range target (ohm40)', () => {
    const start = 40
    const emptyRungs: LadderC01Rungs = {
      fa: allFalse(10), sa: allFalse(10), b: allFalse(4), fc: allFalse(2), sc: allFalse(2),
    }
    const fullRungs: LadderC01Rungs = {
      fa: allTrue(10), sa: allTrue(10), b: allTrue(4), fc: allTrue(2), sc: allTrue(2),
    }
    const rmin = calculateC01Unit(unit, { startResistance: start, rungs: emptyRungs }).totalResistance
    const rmax = calculateC01Unit(unit, { startResistance: start, rungs: fullRungs }).totalResistance
    const target = rmin + (rmax - rmin) * 0.5

    const result = solveC01Rungs(unit, { startResistance: start, targetResistance: target })
    expect(result.relativeErrorPct).toBeLessThan(5)
    expect(result.clipped).toBe('none')
  })

  it('clips below', () => {
    const result = solveC01Rungs(unit, { startResistance: 40, targetResistance: 0.01 })
    expect(result.clipped).toBe('below-min')
  })

  it('clips above', () => {
    const result = solveC01Rungs(unit, { startResistance: 40, targetResistance: 99999 })
    expect(result.clipped).toBe('above-max')
  })
})

describe('solveC01Rungs — all unit keys produce valid results', () => {
  for (const unit of LADDER_UNIT_KEYS.c01) {
    it(`${unit}: round-trip and error < 5 %`, () => {
      const start = 40
      const emptyRungs: LadderC01Rungs = {
        fa: allFalse(10), sa: allFalse(10), b: allFalse(4), fc: allFalse(2), sc: allFalse(2),
      }
      const fullRungs: LadderC01Rungs = {
        fa: allTrue(10), sa: allTrue(10), b: allTrue(4), fc: allTrue(2), sc: allTrue(2),
      }
      const rmin = calculateC01Unit(unit, { startResistance: start, rungs: emptyRungs }).totalResistance
      const rmax = calculateC01Unit(unit, { startResistance: start, rungs: fullRungs }).totalResistance
      const target = rmin + (rmax - rmin) * 0.6

      const result = solveC01Rungs(unit, { startResistance: start, targetResistance: target })
      const fwd = calculateC01Unit(unit, { startResistance: start, rungs: result.rungs })
      expect(fwd.totalResistance).toBeCloseTo(result.achievedResistance, 8)
      expect(result.relativeErrorPct).toBeLessThan(5)
    })
  }
})

// ─────────────────────────────────────────────────────────────────────────────
// C12 — 10-ohm and 20-ohm variants
// ─────────────────────────────────────────────────────────────────────────────

describe('solveC12Rungs — 10-ohm variant', () => {
  const unit = 'spn21210'
  const start = 10

  it('round-trip', () => {
    const emptyRungs: LadderC12Rungs = {
      fa: allFalse(10), sa: allFalse(10), b: allFalse(4), c: allFalse(4),
    }
    const fullRungs: LadderC12Rungs = {
      fa: allTrue(10), sa: allTrue(10), b: allTrue(4), c: allTrue(4),
    }
    const rmin = calculateC12Unit(unit, { startResistance: start, rungs: emptyRungs }).totalResistance
    const rmax = calculateC12Unit(unit, { startResistance: start, rungs: fullRungs }).totalResistance
    const target = rmin + (rmax - rmin) * 0.4

    const result = solveC12Rungs(unit, { startResistance: start, targetResistance: target })
    const fwd = calculateC12Unit(unit, { startResistance: start, rungs: result.rungs })
    expect(fwd.totalResistance).toBeCloseTo(result.achievedResistance, 8)
    expect(result.relativeErrorPct).toBeLessThan(5)
  })
})

describe('solveC12Rungs — 20-ohm variant', () => {
  const unit = 'spn21220'
  const start = 20

  it('round-trip', () => {
    const emptyRungs: LadderC12Rungs = {
      fa: allFalse(10), sa: allFalse(10), b: allFalse(4), c: allFalse(4),
    }
    const fullRungs: LadderC12Rungs = {
      fa: allTrue(10), sa: allTrue(10), b: allTrue(4), c: allTrue(4),
    }
    const rmin = calculateC12Unit(unit, { startResistance: start, rungs: emptyRungs }).totalResistance
    const rmax = calculateC12Unit(unit, { startResistance: start, rungs: fullRungs }).totalResistance
    const target = rmin + (rmax - rmin) * 0.4

    const result = solveC12Rungs(unit, { startResistance: start, targetResistance: target })
    const fwd = calculateC12Unit(unit, { startResistance: start, rungs: result.rungs })
    expect(fwd.totalResistance).toBeCloseTo(result.achievedResistance, 8)
    expect(result.relativeErrorPct).toBeLessThan(5)
  })
})

describe('solveC12Rungs — all unit keys produce valid results', () => {
  for (const unit of LADDER_UNIT_KEYS.c12) {
    const is20ohm = unit === 'spn21220' || unit === 'spn31220' || unit === 'spns1220' || unit === 'opsh1220'
    const start = is20ohm ? 20 : 10

    it(`${unit}: round-trip and error < 5 %`, () => {
      const emptyRungs: LadderC12Rungs = {
        fa: allFalse(10), sa: allFalse(10), b: allFalse(4), c: allFalse(4),
      }
      const fullRungs: LadderC12Rungs = {
        fa: allTrue(10), sa: allTrue(10), b: allTrue(4), c: allTrue(4),
      }
      const rmin = calculateC12Unit(unit, { startResistance: start, rungs: emptyRungs }).totalResistance
      const rmax = calculateC12Unit(unit, { startResistance: start, rungs: fullRungs }).totalResistance
      const target = rmin + (rmax - rmin) * 0.5

      const result = solveC12Rungs(unit, { startResistance: start, targetResistance: target })
      const fwd = calculateC12Unit(unit, { startResistance: start, rungs: result.rungs })
      expect(fwd.totalResistance).toBeCloseTo(result.achievedResistance, 8)
      expect(result.relativeErrorPct).toBeLessThan(5)
    })
  }
})

// ─────────────────────────────────────────────────────────────────────────────
// E01 — dual-sided, solved one side at a time
// ─────────────────────────────────────────────────────────────────────────────

describe('solveE01SideRungs — core behaviour', () => {
  const unit = 'e01zero'
  const start = 5

  it('round-trip: resistance computed via calculateE01Unit left side matches achievedResistance', () => {
    const target = 3.0
    const result = solveE01SideRungs(unit, { startResistance: start, targetResistance: target })

    // Use calculateE01Unit with solved left-side rungs and all-uncut right side to
    // verify the left-side achieved resistance matches
    const rightUncut: LadderE01SideRungs = {
      a: allFalse(9), b: allFalse(7), c: allFalse(7), g: false,
    }
    const fwd = calculateE01Unit(unit, {
      startResistance12: start,
      startResistance23: start,
      rungs: { left: result.rungs, right: rightUncut },
    })
    expect(fwd.resistance12).toBeCloseTo(result.achievedResistance, 8)
  })

  it('achieves resistance within 10 % of mid-range target', () => {
    const rmin = (() => {
      const r = calculateE01Unit(unit, {
        startResistance12: start, startResistance23: start,
        rungs: {
          left:  { a: allFalse(9), b: allFalse(7), c: allFalse(7), g: false },
          right: { a: allFalse(9), b: allFalse(7), c: allFalse(7), g: false },
        },
      })
      return r.resistance12
    })()
    const rmax = (() => {
      const r = calculateE01Unit(unit, {
        startResistance12: start, startResistance23: start,
        rungs: {
          left:  { a: allTrue(9), b: allTrue(7), c: allTrue(7), g: true },
          right: { a: allFalse(9), b: allFalse(7), c: allFalse(7), g: false },
        },
      })
      return r.resistance12
    })()

    const target = (rmin + rmax) / 2
    const result = solveE01SideRungs(unit, { startResistance: start, targetResistance: target })
    expect(result.relativeErrorPct).toBeLessThan(10)
    expect(result.clipped).toBe('none')
  })

  it('clips below', () => {
    const result = solveE01SideRungs(unit, { startResistance: start, targetResistance: 0.001 })
    expect(result.clipped).toBe('below-min')
  })

  it('clips above', () => {
    const result = solveE01SideRungs(unit, { startResistance: start, targetResistance: 9999 })
    expect(result.clipped).toBe('above-max')
  })

  it('both sides solved independently produce distinct results for different targets', () => {
    // E01 min resistance with startResistance=5 is ~5.02 Ω, so pick targets
    // above that floor to ensure the solver actually applies cuts.
    const leftResult  = solveE01SideRungs(unit, { startResistance: start, targetResistance: 6.0 })
    const rightResult = solveE01SideRungs(unit, { startResistance: start, targetResistance: 9.0 })
    expect(leftResult.clipped).toBe('none')
    expect(rightResult.clipped).toBe('none')
    expect(leftResult.achievedResistance).not.toBeCloseTo(rightResult.achievedResistance, 0)
  })
})

describe('solveE01SideRungs — all unit keys produce valid results', () => {
  for (const unit of LADDER_UNIT_KEYS.e01) {
    it(`${unit}: round-trip`, () => {
      const start = 5
      const rightUncut: LadderE01SideRungs = {
        a: allFalse(9), b: allFalse(7), c: allFalse(7), g: false,
      }
      const rmin = calculateE01Unit(unit, {
        startResistance12: start, startResistance23: start,
        rungs: { left: rightUncut, right: rightUncut },
      }).resistance12

      const rmax = calculateE01Unit(unit, {
        startResistance12: start, startResistance23: start,
        rungs: {
          left:  { a: allTrue(9), b: allTrue(7), c: allTrue(7), g: true },
          right: rightUncut,
        },
      }).resistance12

      const target = rmin + (rmax - rmin) * 0.5
      const result = solveE01SideRungs(unit, { startResistance: start, targetResistance: target })

      const fwd = calculateE01Unit(unit, {
        startResistance12: start, startResistance23: start,
        rungs: { left: result.rungs, right: rightUncut },
      })
      expect(fwd.resistance12).toBeCloseTo(result.achievedResistance, 8)
      expect(result.relativeErrorPct).toBeLessThan(10)
    })
  }
})

// ─────────────────────────────────────────────────────────────────────────────
// Shared invariants across ALL families
// ─────────────────────────────────────────────────────────────────────────────

describe('solver invariants — clipping behaviour', () => {
  it('D01 below-min clipped result has zero absoluteError relative to achieved', () => {
    const r = solveD01Rungs('d012pt', { startResistance: 5, targetResistance: 0.0001 })
    expect(r.clipped).toBe('below-min')
    // absoluteError = |achieved - target|; target is tiny so error ≈ achieved
    expect(r.absoluteError).toBeCloseTo(Math.abs(r.achievedResistance - r.targetResistance), 8)
  })

  it('C11 above-max achieved resistance is finite and positive', () => {
    const r = solveC11Rungs('span2c11', { startResistance: 5, targetResistance: 1e9 })
    expect(r.clipped).toBe('above-max')
    expect(Number.isFinite(r.achievedResistance)).toBe(true)
    expect(r.achievedResistance).toBeGreaterThan(0)
  })

  it('solver result is deterministic (same inputs → same output)', () => {
    const params = { startResistance: 5, targetResistance: 3.8 }
    const r1 = solveD01Rungs('d012pt', params)
    const r2 = solveD01Rungs('d012pt', params)
    expect(r1.achievedResistance).toBe(r2.achievedResistance)
    expect(JSON.stringify(r1.rungs)).toBe(JSON.stringify(r2.rungs))
  })
})

describe('solver invariants — monotonicity check', () => {
  it('D01: more cuts produce equal-or-higher resistance than fewer cuts', () => {
    const unit = 'd012pt'
    const start = 5
    const rmin = calculateD01Unit(unit, {
      startResistance: start,
      rungs: { fa: allFalse(7), fb: allFalse(9), fc: allFalse(7) },
    }).totalResistance
    const rmax = calculateD01Unit(unit, {
      startResistance: start,
      rungs: { fa: allTrue(7), fb: allTrue(9), fc: allTrue(7) },
    }).totalResistance

    // Solve at three ascending targets and verify resistance is non-decreasing
    const t1 = rmin + (rmax - rmin) * 0.25
    const t2 = rmin + (rmax - rmin) * 0.5
    const t3 = rmin + (rmax - rmin) * 0.75

    const r1 = solveD01Rungs(unit, { startResistance: start, targetResistance: t1 }).achievedResistance
    const r2 = solveD01Rungs(unit, { startResistance: start, targetResistance: t2 }).achievedResistance
    const r3 = solveD01Rungs(unit, { startResistance: start, targetResistance: t3 }).achievedResistance

    expect(r1).toBeLessThanOrEqual(r2 + 1e-9)
    expect(r2).toBeLessThanOrEqual(r3 + 1e-9)
  })
})
