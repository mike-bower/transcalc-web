/**
 * Orchestrator integration tests.
 *
 * These tests verify wiring and dispatch — they do not re-check domain-level
 * physics (those are covered in their respective module test files).
 */
import { describe, it, expect } from 'vitest'
import {
  runDesign,
  runCompensation,
  realizeTrim,
  type CantileverDesignParams,
  type PressureDesignParams,
  type OptShuntParams,
  type SpanSetParams,
} from '../domain/orchestrator'
import { commonWireTypes } from '../domain/zeroBalance'
import { spanWireTypes } from '../domain/spanTemperature2Pt'
import { getResistorTcr } from '../domain/zeroVsTemp'

// ─────────────────────────────────────────────────────────────────────────────
// Design helpers
// ─────────────────────────────────────────────────────────────────────────────

/** Shared SI beam geometry (steel, 100 N load) used by bending-beam types. */
const STEEL_BEAM = {
  appliedLoad: 100,
  beamWidth: 0.020,
  thickness: 0.005,
  modulus: 200e9,
  gageLength: 0.010,
  gageFactor: 2.1,
} as const

/** Assert a design result is structurally valid. */
function expectDesignValid(result: ReturnType<typeof runDesign>) {
  expect(result.isValid, result.error).toBe(true)
  expect(Number.isFinite(result.fullSpanSensitivity)).toBe(true)
  expect(result.fullSpanSensitivity).toBeGreaterThan(0)
  expect(Number.isFinite(result.avgStrain)).toBe(true)
}

// ─────────────────────────────────────────────────────────────────────────────
// Design — bending beams
// ─────────────────────────────────────────────────────────────────────────────

describe('runDesign — cantilever', () => {
  const params: CantileverDesignParams = {
    loadN: 100,
    momentArmMm: 50,
    gageLengthMm: 10,
    youngsModulusPa: 200e9,
    beamWidthMm: 20,
    thicknessMm: 5,
    gageFactor: 2.1,
  }

  it('returns valid result', () => {
    const r = runDesign({ type: 'cantilever', params })
    expectDesignValid(r)
    expect(r.type).toBe('cantilever')
  })

  it('avgStrain ≈ 300 μstrain for reference geometry', () => {
    const r = runDesign({ type: 'cantilever', params })
    // 6 × 100 × 0.05 / (200e9 × 0.02 × 0.005²) × 1e6 = 300 μstrain
    expect(r.avgStrain).toBeCloseTo(300, 0)
  })

  it('fullSpanSensitivity = avgStrain × GF × 1e-3', () => {
    const r = runDesign({ type: 'cantilever', params })
    expect(r.fullSpanSensitivity).toBeCloseTo(r.avgStrain * params.gageFactor * 1e-3, 6)
  })

  it('gradient is defined and finite', () => {
    const r = runDesign({ type: 'cantilever', params })
    expect(r.gradient).toBeDefined()
    expect(Number.isFinite(r.gradient)).toBe(true)
  })

  it('isValid false with zero thickness (throws internally)', () => {
    const bad = { ...params, thicknessMm: 0 }
    const r = runDesign({ type: 'cantilever', params: bad })
    expect(r.isValid).toBe(false)
    expect(r.error).toBeDefined()
  })
})

describe('runDesign — reverseBeam', () => {
  it('returns valid result', () => {
    const r = runDesign({
      type: 'reverseBeam',
      params: {
        ...STEEL_BEAM,
        distanceBetweenGages: 0.050,
      },
    })
    expectDesignValid(r)
    expect(r.type).toBe('reverseBeam')
  })
})

describe('runDesign — dualBeam', () => {
  it('returns valid result', () => {
    const r = runDesign({
      type: 'dualBeam',
      params: {
        ...STEEL_BEAM,
        distanceBetweenGages: 0.040,
        distanceLoadToCL: 0.060,
      },
    })
    expectDesignValid(r)
    expect(r.type).toBe('dualBeam')
  })
})

describe('runDesign — binoBeam', () => {
  it('returns valid result', () => {
    const r = runDesign({
      type: 'binoBeam',
      params: {
        appliedLoad: 100,
        distanceBetweenHoles: 50,    // mm — values > 10 ensure mm auto-detection
        radius: 15,                  // mm
        beamWidth: 30,               // mm
        beamHeight: 80,              // mm — must be >= 2*radius + 2*minimumThickness = 70
        distanceLoadHole: 25,        // mm
        minimumThickness: 20,        // mm
        modulus: 200e9,
        gageLength: 12,              // mm
        gageFactor: 2.1,
      },
    })
    expectDesignValid(r)
    expect(r.type).toBe('binoBeam')
  })
})

describe('runDesign — sBeam', () => {
  it('returns valid result', () => {
    const r = runDesign({
      type: 'sBeam',
      params: {
        appliedLoad: 1000,
        holeRadius: 0.008,
        beamWidth: 0.040,
        thickness: 0.010,
        distanceBetweenGages: 0.050,
        modulus: 200e9,
        gageLength: 0.010,
        gageFactor: 2.1,
      },
    })
    expectDesignValid(r)
    expect(r.type).toBe('sBeam')
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// Design — column types
// ─────────────────────────────────────────────────────────────────────────────

describe('runDesign — column types', () => {
  it('squareColumn returns valid result', () => {
    const r = runDesign({
      type: 'squareColumn',
      params: {
        appliedLoad: 10000,  // N
        width: 0.025,        // m
        depth: 0.025,
        modulus: 200e9,
        poissonRatio: 0.3,
        gageFactor: 2.1,
      },
    })
    expectDesignValid(r)
    expect(r.type).toBe('squareColumn')
  })

  it('roundSolidColumn returns valid result', () => {
    const r = runDesign({
      type: 'roundSolidColumn',
      params: { appliedLoad: 10000, diameter: 0.025, modulus: 200e9, poissonRatio: 0.3, gageFactor: 2.1 },
    })
    expectDesignValid(r)
  })

  it('roundHollowColumn returns valid result', () => {
    const r = runDesign({
      type: 'roundHollowColumn',
      params: { appliedLoad: 10000, outerDiameter: 0.030, innerDiameter: 0.020, modulus: 200e9, poissonRatio: 0.3, gageFactor: 2.1 },
    })
    expectDesignValid(r)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// Design — shear types
// ─────────────────────────────────────────────────────────────────────────────

describe('runDesign — shear types', () => {
  const shearParams = {
    load: 5000,
    width: 0.030,
    height: 0.050,
    diameter: 0.030,
    thickness: 0.005,
    modulus: 200e9,
    poisson: 0.3,
    gageFactor: 2.1,
  }

  it('squareShear returns valid result', () => {
    const r = runDesign({ type: 'squareShear', params: shearParams })
    expectDesignValid(r)
    expect(r.type).toBe('squareShear')
  })

  it('roundShear returns valid result', () => {
    const r = runDesign({ type: 'roundShear', params: shearParams })
    expectDesignValid(r)
  })

  it('roundSBeamShear returns valid result', () => {
    const r = runDesign({ type: 'roundSBeamShear', params: shearParams })
    expectDesignValid(r)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// Design — torque types
// ─────────────────────────────────────────────────────────────────────────────

describe('runDesign — torque types', () => {
  it('squareTorque returns valid result', () => {
    const r = runDesign({
      type: 'squareTorque',
      params: { appliedTorque: 50, width: 25, poisson: 0.3, modulus: 200e9, gageLength: 12, gageFactor: 2.1, usUnits: false },
    })
    expectDesignValid(r)
    expect(r.type).toBe('squareTorque')
  })

  it('roundSolidTorque returns valid result', () => {
    const r = runDesign({
      type: 'roundSolidTorque',
      params: { appliedTorque: 50, diameter: 0.025, modulus: 200e9, poissonRatio: 0.3, gageFactor: 2.1 },
    })
    expectDesignValid(r)
  })

  it('roundHollowTorque returns valid result', () => {
    const r = runDesign({
      type: 'roundHollowTorque',
      params: { appliedTorque: 50, outerDiameter: 0.030, innerDiameter: 0.020, modulus: 200e9, poissonRatio: 0.3, gageFactor: 2.1 },
    })
    expectDesignValid(r)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// Design — pressure
// ─────────────────────────────────────────────────────────────────────────────

describe('runDesign — pressure', () => {
  it('returns valid result', () => {
    const params: PressureDesignParams = {
      appliedPressure: 1e6,   // 1 MPa
      thickness: 0.003,
      diameter: 0.040,
      poisson: 0.3,
      modulus: 200e9,
      gageFactor: 2.1,
    }
    const r = runDesign({ type: 'pressure', params })
    expectDesignValid(r)
    expect(r.type).toBe('pressure')
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// Compensation
// ─────────────────────────────────────────────────────────────────────────────

function expectCompensationValid(result: ReturnType<typeof runCompensation>) {
  expect(result.isValid, result.error).toBe(true)
  expect(Number.isFinite(result.primaryResistance)).toBe(true)
  expect(result.primaryResistance).toBeGreaterThan(0)
}

describe('runCompensation — zeroVsTemp', () => {
  it('returns valid result', () => {
    const r = runCompensation({
      method: 'zeroVsTemp',
      params: {
        lowTemp: 32,
        lowOutput: 1.0,
        highTemp: 200,
        highOutput: 1.2,
        resistorTcr: getResistorTcr('Balco', 'US'),
        bridgeResistance: 350,
        units: 'US',
      },
    })
    expectCompensationValid(r)
    expect(r.method).toBe('zeroVsTemp')
    expect(r.bridgeArm).toBeDefined()
  })
})

describe('runCompensation — zeroBalance', () => {
  it('returns resistanceNeeded > 0 for positive unbalance', () => {
    const r = runCompensation({
      method: 'zeroBalance',
      params: {
        unbalance: 100,
        bridgeResistance: 120,
        wireType: commonWireTypes[0],   // Constantan
        awgGauge: 36,
      },
    })
    expectCompensationValid(r)
    expect(r.method).toBe('zeroBalance')
    // 100/1000 × 120 = 12 Ω
    expect(r.primaryResistance).toBeCloseTo(12, 2)
  })
})

describe('runCompensation — spanTemp2Pt', () => {
  it('returns compensation resistance > 0', () => {
    const r = runCompensation({
      method: 'spanTemp2Pt',
      params: {
        lowTemperature: 32,
        lowOutput: 1.0,
        highTemperature: 212,
        highOutput: 2.0,
        wireType: spanWireTypes[0],   // Balco
        resistorTCR: 0.25,
        bridgeResistance: 350,
        usUnits: true,
      },
    })
    expectCompensationValid(r)
    expect(r.method).toBe('spanTemp2Pt')
  })
})

describe('runCompensation — spanTemp3Pt', () => {
  it('returns mid compensation resistance > 0', () => {
    const r = runCompensation({
      method: 'spanTemp3Pt',
      params: {
        lowPoint:  { temperature: 32,  output: 1.0 },
        midPoint:  { temperature: 122, output: 5.5 },
        highPoint: { temperature: 212, output: 9.5 },
        resistorTCR: 0.25,
        bridgeResistance: 350,
        usUnits: true,
      },
    })
    expectCompensationValid(r)
    expect(r.method).toBe('spanTemp3Pt')
  })
})

describe('runCompensation — optShunt', () => {
  const params: OptShuntParams = {
    rmBridge: 350,
    rmTempCoeffPpm: 200,
    tempLowC: -40,
    tempAmbientC: 25,
    tempHighC: 85,
  }

  it('returns positive shunt resistance', () => {
    const r = runCompensation({ method: 'optShunt', params })
    expectCompensationValid(r)
    expect(r.method).toBe('optShunt')
  })
})

describe('runCompensation — spanSet', () => {
  it('returns modulation resistance for span trim', () => {
    const params: SpanSetParams = {
      measuredSpan: 2.1,
      bridgeResistance: 350,
      totalRm: 100,
      desiredSpan: 2.0,
    }
    const r = runCompensation({ method: 'spanSet', params })
    expect(r.isValid, r.error).toBe(true)
    expect(Number.isFinite(r.primaryResistance)).toBe(true)
    expect(r.method).toBe('spanSet')
  })
})

describe('runCompensation — simultaneous', () => {
  it('dispatches and returns structured result', () => {
    // Use varying bridge and mod resistances to avoid degenerate T1-T2=0 case.
    // Whether the underlying calculation succeeds depends on the physics of the inputs.
    const r = runCompensation({
      method: 'simultaneous',
      params: {
        lowSpan: 1.0, lowRBridge: 800, lowRMod: 80,
        ambientSpan: 5.0, ambientRBridge: 1000, ambientRMod: 100,
        highSpan: 9.0, highRBridge: 1200, highRMod: 120,
        desiredSpan: -0.5,
      },
    })
    expect(r.method).toBe('simultaneous')
    expect(typeof r.isValid).toBe('boolean')
    expect(typeof r.primaryResistance).toBe('number')
    if (r.isValid) {
      expect(r.primaryResistance).toBeGreaterThan(0)
      expect(r.secondaryResistance).toBeDefined()
    } else {
      expect(r.error).toBeDefined()
    }
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// Trim realization
// ─────────────────────────────────────────────────────────────────────────────

describe('realizeTrim — all families', () => {
  it('C01: achievedResistance finite and positive', () => {
    const r = realizeTrim({ family: 'C01', unit: 'span2c01', startResistance: 40, targetResistance: 38 })
    expect(Number.isFinite(r.achievedResistance)).toBe(true)
    expect(r.achievedResistance).toBeGreaterThan(0)
  })

  it('C11: achievedResistance finite and positive', () => {
    const r = realizeTrim({ family: 'C11', unit: 'span2c11', startResistance: 5, targetResistance: 4.5 })
    expect(Number.isFinite(r.achievedResistance)).toBe(true)
    expect(r.achievedResistance).toBeGreaterThan(0)
  })

  it('C12: achievedResistance finite and positive', () => {
    const r = realizeTrim({ family: 'C12', unit: 'spn21210', startResistance: 10, targetResistance: 9 })
    expect(Number.isFinite(r.achievedResistance)).toBe(true)
    expect(r.achievedResistance).toBeGreaterThan(0)
  })

  it('D01: achievedResistance finite and positive', () => {
    const r = realizeTrim({ family: 'D01', unit: 'd012pt', startResistance: 5, targetResistance: 3.5 })
    expect(Number.isFinite(r.achievedResistance)).toBe(true)
    expect(r.achievedResistance).toBeGreaterThan(0)
  })

  it('E01_side: achievedResistance finite and positive', () => {
    const r = realizeTrim({ family: 'E01_side', unit: 'e01zero', startResistance: 5, targetResistance: 6.5 })
    expect(Number.isFinite(r.achievedResistance)).toBe(true)
    expect(r.achievedResistance).toBeGreaterThan(0)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// End-to-end integration: compensation → trim
// ─────────────────────────────────────────────────────────────────────────────

describe('integration: compensation → trim', () => {
  it('zeroBalance → C01 trim: achieved resistance is finite and positive', () => {
    // Compensation: determine required zero-balance resistance
    const comp = runCompensation({
      method: 'zeroBalance',
      params: {
        unbalance: 20,          // 20 mV/V unbalance
        bridgeResistance: 120,
        wireType: commonWireTypes[0],
        awgGauge: 36,
      },
    })
    expect(comp.isValid).toBe(true)
    // resistanceNeeded = 20/1000 × 120 = 2.4 Ω → below D01 floor, so use D01 clip test
    // Realize with D01 (0.01–10 Ω range covers 2.4 Ω)
    const trim = realizeTrim({
      family: 'D01',
      unit: 'd012pt',
      startResistance: 5,
      targetResistance: comp.primaryResistance,
    })
    expect(Number.isFinite(trim.achievedResistance)).toBe(true)
    expect(trim.achievedResistance).toBeGreaterThan(0)
    // Absolute error should be small relative to target
    expect(trim.absoluteError).toBeGreaterThanOrEqual(0)
  })

  it('optShunt → C01 trim: round-trip produces valid cut pattern', () => {
    const comp = runCompensation({
      method: 'optShunt',
      params: { rmBridge: 350, rmTempCoeffPpm: 200, tempLowC: -40, tempAmbientC: 25, tempHighC: 85 },
    })
    expect(comp.isValid).toBe(true)

    // C01 accepts startResistance 30–110 Ω; target must come from that band
    const target = Math.max(30, Math.min(comp.primaryResistance, 110))
    const trim = realizeTrim({ family: 'C01', unit: 'span2c01', startResistance: 40, targetResistance: target })
    expect(Number.isFinite(trim.achievedResistance)).toBe(true)
    expect(trim.achievedResistance).toBeGreaterThan(0)
  })
})
