import { describe, it, expect } from 'vitest'
import {
  fToC,
  cToF,
  mmToInches,
  inchesToMm,
  cmToInches,
  inchesToCm,
  kgToLbs,
  lbsToKg,
  nToLbf,
  lbfToN,
  psiToPa,
  paToPsi,
  psiToGpa,
  gpaToPsi,
  psiToMpa,
  mpaToPsi,
  parseNumber,
} from '../domain/convert'

// ---------------------------------------------------------------------------
// Temperature
// ---------------------------------------------------------------------------
describe('fToC', () => {
  it('freezing point: 32 °F → 0 °C', () => {
    expect(fToC(32)).toBeCloseTo(0, 10)
  })
  it('boiling point: 212 °F → 100 °C', () => {
    expect(fToC(212)).toBeCloseTo(100, 10)
  })
  it('body temp: 98.6 °F → 37 °C', () => {
    expect(fToC(98.6)).toBeCloseTo(37, 5)
  })
  it('below freezing: -40 °F → -40 °C (cross-over point)', () => {
    expect(fToC(-40)).toBeCloseTo(-40, 10)
  })
})

describe('cToF', () => {
  it('0 °C → 32 °F', () => {
    expect(cToF(0)).toBeCloseTo(32, 10)
  })
  it('100 °C → 212 °F', () => {
    expect(cToF(100)).toBeCloseTo(212, 10)
  })
  it('-40 °C → -40 °F (cross-over point)', () => {
    expect(cToF(-40)).toBeCloseTo(-40, 10)
  })
})

describe('fToC / cToF round-trip', () => {
  it('fToC(cToF(x)) === x for a range of values', () => {
    for (const t of [-100, 0, 37, 100, 500]) {
      expect(fToC(cToF(t))).toBeCloseTo(t, 8)
    }
  })
  it('cToF(fToC(x)) === x for a range of values', () => {
    for (const t of [-73, 0, 25, 100, 260]) {
      expect(cToF(fToC(t))).toBeCloseTo(t, 8)
    }
  })
})

// ---------------------------------------------------------------------------
// Length — mm / inches
// ---------------------------------------------------------------------------
describe('mmToInches / inchesToMm', () => {
  it('25.4 mm = 1 inch', () => {
    expect(mmToInches(25.4)).toBeCloseTo(1, 6)
    expect(inchesToMm(1)).toBeCloseTo(25.4, 6)
  })
  it('round-trip: inchesToMm(mmToInches(x)) ≈ x', () => {
    // The constant 0.039370078 is an approximation, so round-trip error is ~1.9e-6/unit
    for (const v of [1, 10, 100, 254]) {
      expect(inchesToMm(mmToInches(v))).toBeCloseTo(v, 4)
    }
  })
  it('zero converts to zero', () => {
    expect(mmToInches(0)).toBe(0)
    expect(inchesToMm(0)).toBe(0)
  })
})

// ---------------------------------------------------------------------------
// Length — cm / inches
// ---------------------------------------------------------------------------
describe('cmToInches / inchesToCm', () => {
  it('2.54 cm = 1 inch', () => {
    expect(cmToInches(2.54)).toBeCloseTo(1, 5)
    expect(inchesToCm(1)).toBeCloseTo(2.54, 6)
  })
  it('round-trip: inchesToCm(cmToInches(x)) ≈ x', () => {
    for (const v of [1, 10, 100]) {
      expect(inchesToCm(cmToInches(v))).toBeCloseTo(v, 5)
    }
  })
})

// ---------------------------------------------------------------------------
// Mass — kg / lbs
// ---------------------------------------------------------------------------
describe('kgToLbs / lbsToKg', () => {
  it('1 kg ≈ 2.20462 lbs', () => {
    expect(kgToLbs(1)).toBeCloseTo(2.20462, 4)
  })
  it('1 lb ≈ 0.45359 kg', () => {
    expect(lbsToKg(1)).toBeCloseTo(0.45359237, 6)
  })
  it('round-trip: lbsToKg(kgToLbs(x)) ≈ x', () => {
    // The constants 2.20462 and 0.45359237 are approximate, so round-trip error is ~1.2e-6/unit
    for (const v of [0.5, 1, 10, 100]) {
      expect(lbsToKg(kgToLbs(v))).toBeCloseTo(v, 3)
    }
  })
})

// ---------------------------------------------------------------------------
// Force — N / lbf
// ---------------------------------------------------------------------------
describe('nToLbf / lbfToN', () => {
  it('4.44822 N ≈ 1 lbf', () => {
    expect(nToLbf(4.44822)).toBeCloseTo(1, 3)
  })
  it('1 lbf ≈ 4.44822 N', () => {
    expect(lbfToN(1)).toBeCloseTo(4.44822, 4)
  })
  it('round-trip: lbfToN(nToLbf(x)) ≈ x', () => {
    for (const v of [1, 10, 100]) {
      expect(lbfToN(nToLbf(v))).toBeCloseTo(v, 3)
    }
  })
})

// ---------------------------------------------------------------------------
// Pressure — PSI / Pa
// ---------------------------------------------------------------------------
describe('psiToPa / paToPsi', () => {
  it('1 PSI ≈ 6894.76 Pa', () => {
    expect(psiToPa(1)).toBeCloseTo(6894.76, 2)
  })
  it('6894.76 Pa ≈ 1 PSI', () => {
    expect(paToPsi(6894.76)).toBeCloseTo(1, 4)
  })
  it('round-trip: paToPsi(psiToPa(x)) ≈ x', () => {
    // 6894.76 × 0.000145038 ≈ 1.000022, so round-trip error ~2.2e-5 relative
    for (const v of [1, 10, 1000]) {
      expect(paToPsi(psiToPa(v))).toBeCloseTo(v, 2)
    }
  })
})

// ---------------------------------------------------------------------------
// Pressure — PSI / GPa
// ---------------------------------------------------------------------------
describe('psiToGpa / gpaToPsi', () => {
  it('1 PSI → Pa/GPa scale: 6894.76e-9 GPa', () => {
    expect(psiToGpa(1)).toBeCloseTo(6894.76e-9, 15)
  })
  it('round-trip: gpaToPsi(psiToGpa(x)) ≈ x', () => {
    for (const v of [1000, 10000, 100000]) {
      expect(gpaToPsi(psiToGpa(v))).toBeCloseTo(v, 0)
    }
  })
})

// ---------------------------------------------------------------------------
// Pressure — PSI / MPa
// ---------------------------------------------------------------------------
describe('psiToMpa / mpaToPsi', () => {
  it('1 PSI ≈ 0.006895 MPa', () => {
    expect(psiToMpa(1)).toBeCloseTo(0.0068948, 5)
  })
  it('round-trip: mpaToPsi(psiToMpa(x)) ≈ x', () => {
    for (const v of [1000, 10000]) {
      expect(mpaToPsi(psiToMpa(v))).toBeCloseTo(v, 1)
    }
  })
})

// ---------------------------------------------------------------------------
// parseNumber
// ---------------------------------------------------------------------------
describe('parseNumber', () => {
  it('parses an integer string', () => {
    expect(parseNumber('42')).toEqual({ value: 42, ok: true })
  })
  it('parses a decimal string', () => {
    expect(parseNumber('3.14')).toEqual({ value: 3.14, ok: true })
  })
  it('parses a negative number', () => {
    expect(parseNumber('-7.5')).toEqual({ value: -7.5, ok: true })
  })
  it('parses scientific notation', () => {
    const result = parseNumber('1.5e3')
    expect(result.ok).toBe(true)
    expect(result.value).toBeCloseTo(1500, 6)
  })
  it('trims leading/trailing whitespace', () => {
    expect(parseNumber('  10  ')).toEqual({ value: 10, ok: true })
  })
  it('returns ok=false for empty string', () => {
    expect(parseNumber('')).toEqual({ value: NaN, ok: false })
  })
  it('returns ok=false for whitespace-only string', () => {
    expect(parseNumber('   ')).toEqual({ value: NaN, ok: false })
  })
  it('returns ok=false for non-numeric string', () => {
    const r = parseNumber('abc')
    expect(r.ok).toBe(false)
  })
  it('returns ok=false for null-like input', () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expect(parseNumber(null as any)).toEqual({ value: NaN, ok: false })
  })
  it('parses zero', () => {
    expect(parseNumber('0')).toEqual({ value: 0, ok: true })
  })
})
