/**
 * Transducer spring element materials.
 *
 * Property data from Micro-Measurements Application Note VMM-26,
 * "Strain Gage Based Transducers", Table: Materials Selection Guide
 * for Transducer Spring Elements (p. 20–21).
 *
 * Unit conversions applied per VMM-26 footnotes:
 *   E:   Mpsi × 6.895  → GPa
 *   σy:  ksi  × 6.895  → MPa
 *   ρ:   lb/in³ × 27,680 → kg/m³
 *   T:   (°F − 32) × 5/9 → °C
 *
 * Poisson ratios: standard engineering references (not listed in VMM-26).
 * Figure-of-merit ratings (0–10) from VMM-26 Table of Relative Figure of Merit.
 */

export interface Material {
  id: string
  name: string
  /** Young's modulus (GPa) */
  eGPa: number
  /** Poisson's ratio */
  nu: number
  /** Density (kg/m³) */
  densityKgM3: number
  /** 0.2% offset yield strength (MPa). undefined = unknown / not rated */
  yieldMPa?: number
  /** Max recommended operating temperature (°C) per VMM-26 */
  maxTempC?: number
  /** VMM-26 remarks string */
  remarks?: string
  /**
   * VMM-26 relative figure-of-merit ratings (0–10, higher = better).
   * Not all materials have all fields.
   */
  merit?: {
    linearity?: number
    hysteresis?: number
    creepRelaxation?: number
    machinability?: number
    hardeningDistortion?: number
    corrosionResistance?: number
    lotConsistency?: number
  }
}

/** All materials from VMM-26 Table, organised by class. */
export const MATERIALS: Material[] = [

  // ── High-Modulus Alloys (Steels) ────────────────────────────────────────────

  {
    id: 'steel_4340',
    name: '4340 Steel',
    eGPa: 207, nu: 0.29, densityKgM3: 7833,
    yieldMPa: 1448, maxTempC: 260,
    remarks: 'Excellent steel alloy; widely used in high-capacity spring elements.',
    merit: { linearity: 8, hysteresis: 8, creepRelaxation: 8, machinability: 5, hardeningDistortion: 3, corrosionResistance: 1, lotConsistency: 8 },
  },
  {
    id: 'steel_4140',
    name: '4140 Steel',
    eGPa: 207, nu: 0.29, densityKgM3: 7833,
    yieldMPa: 1379, maxTempC: 204,
    remarks: 'Very good steel alloy; good choice for large elements.',
    merit: { linearity: 8, hysteresis: 8, creepRelaxation: 7, machinability: 5, hardeningDistortion: 3, corrosionResistance: 1, lotConsistency: 6 },
  },
  {
    id: 'ss_17_4_ph',
    name: '17-4 PH SS (630)',
    eGPa: 197, nu: 0.27, densityKgM3: 7750,
    yieldMPa: 1276, maxTempC: 204,
    remarks: 'Widely used. Low-temperature age-hardening minimises distortion. Corrosion resistant. Lot-to-lot variability is the main concern.',
    merit: { linearity: 7, hysteresis: 7, creepRelaxation: 7, machinability: 6, hardeningDistortion: 8, corrosionResistance: 7, lotConsistency: 3 },
  },
  {
    id: 'ss_17_7_ph',
    name: '17-7 PH SS (631)',
    eGPa: 200, nu: 0.28, densityKgM3: 7639,
    yieldMPa: 1517, maxTempC: 204,
    remarks: 'Widely used. Supplied primarily in plate/sheet form.',
    merit: { linearity: 8, hysteresis: 8, creepRelaxation: 7, machinability: 6, hardeningDistortion: 8, corrosionResistance: 7, lotConsistency: 5 },
  },
  {
    id: 'ss_ph_15_7_mo',
    name: 'PH 15-7 Mo SS (632)',
    eGPa: 200, nu: 0.28, densityKgM3: 7667,
    yieldMPa: 1517, maxTempC: 260,
    remarks: 'Excellent but seldom used. Higher max temperature than 17-4.',
    merit: { linearity: 8, hysteresis: 8, creepRelaxation: 8, machinability: 6, hardeningDistortion: 8, corrosionResistance: 7, lotConsistency: 5 },
  },
  {
    id: 'ss_15_5_ph',
    name: '15-5 PH SS (S15500)',
    eGPa: 197, nu: 0.27, densityKgM3: 7750,
    yieldMPa: 1276, maxTempC: 204,
    remarks: 'Improved version of 17-4 PH with better lot-to-lot consistency.',
    merit: { linearity: 7, hysteresis: 7, creepRelaxation: 7, machinability: 6, hardeningDistortion: 8, corrosionResistance: 7, lotConsistency: 5 },
  },
  {
    id: 'maraging_18ni_250',
    name: 'Maraging 18Ni (250)',
    eGPa: 186, nu: 0.30, densityKgM3: 7999,
    yieldMPa: 1689, maxTempC: 316,
    remarks: 'Good but seldom used. Very high yield strength. Excellent hardenability without distortion.',
    merit: { linearity: 8, hysteresis: 8, creepRelaxation: 7, machinability: 5, hardeningDistortion: 8, corrosionResistance: 2, lotConsistency: 5 },
  },
  {
    id: 'ss_304',
    name: '304 Stainless',
    eGPa: 193, nu: 0.29, densityKgM3: 8027,
    yieldMPa: 1034, maxTempC: 121,
    remarks: 'Poor spring material per VMM-26. Not hardenable. Use only when corrosion resistance is overriding.',
    merit: { linearity: 5, hysteresis: 4, creepRelaxation: 4, machinability: 3, corrosionResistance: 8, lotConsistency: 6 },
  },

  // ── Low-Modulus Alloys ───────────────────────────────────────────────────────

  {
    id: 'al_2024_t81',
    name: 'Al 2024-T81',
    eGPa: 73.1, nu: 0.33, densityKgM3: 2796,
    yieldMPa: 448, maxTempC: 121,
    remarks: 'Best all-around aluminium alloy for transducers per VMM-26.',
    merit: { linearity: 7, hysteresis: 8, creepRelaxation: 7, machinability: 8, hardeningDistortion: 9, corrosionResistance: 3, lotConsistency: 6 },
  },
  {
    id: 'al_2024_t4',
    name: 'Al 2024-T4/T351',
    eGPa: 73.1, nu: 0.33, densityKgM3: 2796,
    yieldMPa: 317, maxTempC: 93,
    remarks: 'Most readily available aluminium alloy; widely used.',
    merit: { linearity: 6, hysteresis: 7, creepRelaxation: 6, machinability: 8, hardeningDistortion: 9, corrosionResistance: 3, lotConsistency: 6 },
  },
  {
    id: 'al_7075_t6',
    name: 'Al 7075-T6',
    eGPa: 71.7, nu: 0.33, densityKgM3: 2796,
    yieldMPa: 483, maxTempC: 38,
    remarks: 'High strength aluminium. Poor performance at elevated temperatures — max 100°F (38°C).',
    merit: { linearity: 7, hysteresis: 6, creepRelaxation: 6, machinability: 8, hardeningDistortion: 8, corrosionResistance: 3, lotConsistency: 5 },
  },
  {
    id: 'al_6061_t6',
    name: 'Al 6061-T6',
    eGPa: 69.0, nu: 0.33, densityKgM3: 2713,
    yieldMPa: 276, maxTempC: 66,
    remarks: 'Fair performance per VMM-26. Good corrosion resistance and weldability.',
    merit: { linearity: 5, hysteresis: 4, creepRelaxation: 4, machinability: 7, hardeningDistortion: 8, corrosionResistance: 4, lotConsistency: 5 },
  },
  {
    id: 'al_2014_t6',
    name: 'Al 2014-T6',
    eGPa: 73.1, nu: 0.33, densityKgM3: 2796,
    yieldMPa: 414, maxTempC: 93,
    remarks: 'Good aluminium alloy.',
    merit: { linearity: 6, hysteresis: 7, creepRelaxation: 6, machinability: 8, hardeningDistortion: 9, corrosionResistance: 3, lotConsistency: 6 },
  },
  {
    id: 'ti_6al4v',
    name: 'Ti-6Al-4V',
    eGPa: 113.8, nu: 0.34, densityKgM3: 4429,
    yieldMPa: 1138, maxTempC: 149,
    remarks: 'Special applications only. Excellent corrosion resistance. Very low thermal conductivity; difficult to machine and harden without distortion.',
    merit: { linearity: 7, hysteresis: 7, creepRelaxation: 7, machinability: 3, hardeningDistortion: 2, corrosionResistance: 8, lotConsistency: 5 },
  },
  {
    id: 'becu_25',
    name: 'BeCu 25 (C17200)',
    eGPa: 117, nu: 0.30, densityKgM3: 8248,
    yieldMPa: 1172, maxTempC: 121,
    remarks: 'Excellent spring material — best overall performance of low-modulus alloys. Costly; machining requires special health precautions (beryllium dust hazard).',
    merit: { linearity: 8, hysteresis: 8, creepRelaxation: 8, machinability: 5, hardeningDistortion: 9, corrosionResistance: 3, lotConsistency: 7 },
  },

]

export const DEFAULT_MATERIAL_ID = 'steel_4340'

export function getMaterial(id: string): Material {
  return MATERIALS.find(m => m.id === id) ?? MATERIALS[0]
}
