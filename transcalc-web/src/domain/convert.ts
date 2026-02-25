/**
 * Unit conversion utilities
 * Ported from Delphi Convert.pas
 * Converts between US customary and SI metric units for common engineering quantities
 */

/**
 * Convert temperature from Fahrenheit to Celsius
 * T(°C) = (T(°F) - 32) × 5/9
 * @param degF Temperature in degrees Fahrenheit
 * @returns Temperature in degrees Celsius
 */
export function fToC(degF: number): number {
  return (degF - 32) * (5.0 / 9.0)
}

/**
 * Convert temperature from Celsius to Fahrenheit
 * T(°F) = (T(°C) × 9/5) + 32
 * @param degC Temperature in degrees Celsius
 * @returns Temperature in degrees Fahrenheit
 */
export function cToF(degC: number): number {
  return (9.0 / 5.0) * degC + 32
}

/**
 * Convert length from millimeters to inches
 * 1 inch = 25.4 mm
 * @param mm Length in millimeters
 * @returns Length in inches
 */
export function mmToInches(mm: number): number {
  return mm * 0.039370078
}

/**
 * Convert length from inches to millimeters
 * 1 inch = 25.4 mm
 * @param inches Length in inches
 * @returns Length in millimeters
 */
export function inchesToMm(inches: number): number {
  return inches * 25.4
}

/**
 * Convert length from centimeters to inches
 * @param cm Length in centimeters
 * @returns Length in inches
 */
export function cmToInches(cm: number): number {
  return cm * 0.39370078
}

/**
 * Convert length from inches to centimeters
 * @param inches Length in inches
 * @returns Length in centimeters
 */
export function inchesToCm(inches: number): number {
  return inches * 2.54
}

/**
 * Convert mass from kilograms to pounds
 * @param kg Mass in kilograms
 * @returns Mass in pounds
 */
export function kgToLbs(kg: number): number {
  return kg * 2.20462
}

/**
 * Convert mass from pounds to kilograms
 * @param lbs Mass in pounds
 * @returns Mass in kilograms
 */
export function lbsToKg(lbs: number): number {
  return lbs * 0.45359237
}

/**
 * Convert force from Newtons to pound-force
 * 1 lbf = 4.44822 N
 * @param n Force in Newtons
 * @returns Force in pound-force (lbf)
 */
export function nToLbf(n: number): number {
  return n * 0.224809
}

/**
 * Convert force from pound-force to Newtons
 * 1 lbf = 4.44822 N
 * @param lbf Force in pound-force
 * @returns Force in Newtons
 */
export function lbfToN(lbf: number): number {
  return lbf * 4.44822
}

/**
 * Convert pressure from PSI (pounds per square inch) to Pascals
 * 1 PSI = 6894.76 Pa
 * @param psi Pressure in pounds per square inch
 * @returns Pressure in Pascals (Pa)
 */
export function psiToPa(psi: number): number {
  return psi * 6894.76
}

/**
 * Convert pressure from Pascals to PSI (pounds per square inch)
 * 1 PSI = 6894.76 Pa
 * @param pa Pressure in Pascals
 * @returns Pressure in pounds per square inch (PSI)
 */
export function paToPsi(pa: number): number {
  return pa * 0.000145038
}

export function psiToGpa(psi: number): number {
  return psi * 6894.76 * 1.0e-9
}

export function gpaToPsi(gpa: number): number {
  return gpa * 0.145038 * 1e6
}

export function psiToMpa(psi: number): number {
  return psi * 6894.76 * 1e-6
}

export function mpaToPsi(mpa: number): number {
  return mpa * 145.03773773020923 // approximate invert
}

export function parseNumber(s: string): { value: number; ok: boolean } {
  if (s == null) return { value: NaN, ok: false }
  const trimmed = s.trim()
  if (trimmed.length === 0) return { value: NaN, ok: false }
  const v = Number(trimmed)
  if (Number.isFinite(v)) return { value: v, ok: true }
  return { value: NaN, ok: false }
}
