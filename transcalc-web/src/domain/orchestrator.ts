/**
 * Workflow orchestrator — unified dispatch for design, compensation, and trim realization.
 *
 * Three stateless functions tie the domain modules together:
 *   runDesign()        — dispatches to the appropriate beam/column/shear/torque/pressure module
 *   runCompensation()  — dispatches to the appropriate compensation module
 *   realizeTrim()      — dispatches to the appropriate ladder inverse solver
 */

// ── Design imports ─────────────────────────────────────────────────────────────
import {
  calculateCantileverMinStrain,
  calculateCantileverMaxStrain,
  calculateCantileverAvgStrain,
  calculateCantileverGradient,
  calculateCantileverNaturalFrequency,
  validateCantilever,
} from './beams'
import { calculateBinobeamStrain, type BinobeamInput } from './binobeam'
import { calculateDualbeamStrain, type DualbeamInput } from './dualbeam'
import { calculateReversebeamStrain, type ReversebeamInput } from './reversebeam'
import { calculateSbeamStrain, type SbeamInput } from './sbeam'
import { calculateSquareColumnStrain, type SquareColumnInput } from './sqrcol'
import { calculateRoundSolidColumnStrain, type RoundSolidColumnInput } from './rndsldc'
import { calculateRoundHollowColumnStrain, type RoundHollowColumnInput } from './rndhlwc'
import {
  calculateSquareShearSpan,
  calculateRoundShearSpan,
  calculateRoundSBeamSpan,
  type ShearSpanParams,
} from './shearBeams'
import { calculateSqTorque, type SqTorqueInput } from './sqtorque'
import { calculateRoundSolidTorqueStrain, type RoundSolidTorqueInput } from './rndsldtq'
import { calculateRoundHollowTorqueStrain, type RoundHollowTorqueInput } from './rndhlwtq'
import { computePressureStrains } from './pressure'

// ── Compensation imports ───────────────────────────────────────────────────────
import { calculateZeroVsTemp, type ZeroVsTempParams } from './zeroVsTemp'
import { calculateZeroBalance, type ZeroBalanceInput } from './zeroBalance'
import { calculateSpanTemperature2Pt, type SpanTemperature2PtInput } from './spanTemperature2Pt'
import { calculateSpanTemperature3Pt, type SpanTemperature3PtInput } from './spanTemperature3Pt'
import { calculateOptimalShuntResistance } from './shuntoptim'
import { calculateSpanSetResistance } from './spanSet'
import { calculateSimultaneousSpan, type SimultaneousSpanInput } from './simspan'

// ── Trim imports ────────────────────────────────────────────────────────────────
import {
  solveC01Rungs,
  solveC11Rungs,
  solveC12Rungs,
  solveD01Rungs,
  solveE01SideRungs,
  type C01UnitKey,
  type C11UnitKey,
  type C12UnitKey,
  type D01UnitKey,
  type E01UnitKey,
  type LadderSolveResult,
} from './ladderResistors'

// ══════════════════════════════════════════════════════════════════════════════
// DESIGN
// ══════════════════════════════════════════════════════════════════════════════

export type TransducerType =
  | 'cantilever'
  | 'reverseBeam'
  | 'dualBeam'
  | 'binoBeam'
  | 'sBeam'
  | 'squareColumn'
  | 'roundSolidColumn'
  | 'roundHollowColumn'
  | 'squareShear'
  | 'roundShear'
  | 'roundSBeamShear'
  | 'squareTorque'
  | 'roundSolidTorque'
  | 'roundHollowTorque'
  | 'pressure'

export type BridgeConfig = 
  | 'quarter'
  | 'halfBending'
  | 'fullBending'
  | 'poissonHalf'
  | 'poissonFullTop'
  | 'poissonFullDifferential'

/** Cantilever-specific params (beams.ts takes positional args; this groups them). */
export interface CantileverDesignParams {
  /** Applied load (N, SI) */
  loadN: number
  /** Distance from load application to gage centre (mm) */
  momentArmMm: number
  /** Gage element length (mm) */
  gageLengthMm: number
  /** Young's modulus (Pa; values < 1e6 are treated as GPa and auto-converted) */
  youngsModulusPa: number
  /** Poisson's Ratio (dimensionless, default: 0.3) */
  poissonRatio?: number
  /** Beam width (mm) */
  beamWidthMm: number
  /** Beam thickness (mm) */
  thicknessMm: number
  /** Gage factor (dimensionless) */
  gageFactor: number
  /** Bridge configuration (default: 'fullBending' — 4 active arms, most common for transducers) */
  bridgeConfig?: BridgeConfig
}

/**
 * Pressure diaphragm params.  Extends the pressure.ts fields with gageFactor
 * so fullSpanSensitivity can be computed.
 */
export interface PressureDesignParams {
  appliedPressure: number
  thickness: number
  diameter: number
  poisson: number
  modulus: number
  /** Gage factor (dimensionless) */
  gageFactor: number
}

export type DesignInput =
  | { type: 'cantilever';        params: CantileverDesignParams }
  | { type: 'reverseBeam';       params: ReversebeamInput }
  | { type: 'dualBeam';          params: DualbeamInput }
  | { type: 'binoBeam';          params: BinobeamInput }
  | { type: 'sBeam';             params: SbeamInput }
  | { type: 'squareColumn';      params: SquareColumnInput }
  | { type: 'roundSolidColumn';  params: RoundSolidColumnInput }
  | { type: 'roundHollowColumn'; params: RoundHollowColumnInput }
  | { type: 'squareShear';       params: ShearSpanParams }
  | { type: 'roundShear';        params: ShearSpanParams }
  | { type: 'roundHollowShear';  params: ShearSpanParams }
  | { type: 'roundSBeamShear';   params: ShearSpanParams }
  | { type: 'squareTorque';      params: SqTorqueInput }
  | { type: 'roundSolidTorque';  params: RoundSolidTorqueInput }
  | { type: 'roundHollowTorque'; params: RoundHollowTorqueInput }
  | { type: 'pressure';          params: PressureDesignParams }

export interface DesignResult {
  type: TransducerType
  /** Full-span bridge output (mV/V).  Formula: avgStrain × GF × 1e-3 */
  fullSpanSensitivity: number
  /** Average strain across the gage (microstrain) */
  avgStrain: number
  minStrain?: number
  maxStrain?: number
  /** Strain gradient across the gage (%) */
  gradient?: number
  /** Natural frequency (Hz, cantilever-specific) */
  naturalFrequency?: number
  isValid: boolean
  error?: string
}

/**
 * Quarter-bridge baseline sensitivity from average strain.
 * = (GF × ε × 1e-3) / 4 — the single-gage Wheatstone bridge output.
 * Multiply by bridgeGain (1, 2, 4, (1+ν), 2(1+ν)…) to get the config-specific output.
 * Derived from the standard Wheatstone formula: Eo/E = (GF/4) × Σεi
 */
const sensitivityFromStrain = (avgStrain: number, gageFactor: number): number =>
  (avgStrain * gageFactor * 1e-3) / 4

export function runDesign(input: DesignInput): DesignResult {
  try {
    switch (input.type) {
      case 'cantilever': {
        const p = input.params
        const minStrain = calculateCantileverMinStrain(p.loadN, p.momentArmMm, p.gageLengthMm, p.youngsModulusPa, p.beamWidthMm, p.thicknessMm)
        const maxStrain = calculateCantileverMaxStrain(p.loadN, p.momentArmMm, p.gageLengthMm, p.youngsModulusPa, p.beamWidthMm, p.thicknessMm)
        const avgStrain = calculateCantileverAvgStrain(p.loadN, p.momentArmMm, p.youngsModulusPa, p.beamWidthMm, p.thicknessMm)
        const gradient  = calculateCantileverGradient(maxStrain, minStrain)
        const naturalFrequency = calculateCantileverNaturalFrequency(p.youngsModulusPa, p.beamWidthMm, p.thicknessMm, p.momentArmMm, p.loadN)

        // bridgeGain is relative to the quarter-bridge baseline (sensitivityFromStrain ÷ 4).
        // Confirmed against Delphi source (Active11.pas, linear.pas, fullfour.pas, twoAdj.pas):
        //   quarter:                 (GF/4) × ε × 1e-3
        //   halfBending:             (GF/2) × ε × 1e-3    (twoAdj.pas)
        //   fullBending:              GF    × ε × 1e-3    (fullfour.pas, strain12=+ε, strain34=-ε)
        //   poissonHalf:        (GF/4) × ε × (1+ν) × 1e-3 (Active11.pas, denominator=4)
        //   poissonFullTop:     (GF/2) × ε × (1+ν) × 1e-3 (linear.pas / nonline.pas)
        //   poissonFullDiff:    (GF/2) × ε × (1+ν) × 1e-3 (same bridge topology as poissonFullTop)
        const nu = p.poissonRatio ?? 0.3;
        let bridgeGain = 4.0; // default: 'fullBending'

        switch (p.bridgeConfig) {
          case 'quarter':                bridgeGain = 1.0; break;
          case 'halfBending':            bridgeGain = 2.0; break;
          case 'fullBending':            bridgeGain = 4.0; break;
          case 'poissonHalf':            bridgeGain = 1.0 + nu; break;
          case 'poissonFullTop':         bridgeGain = 2.0 * (1.0 + nu); break;
          case 'poissonFullDifferential':bridgeGain = 2.0 * (1.0 + nu); break;
        }

        const validation = validateCantilever(
          { loadN: p.loadN, momentArmMm: p.momentArmMm, youngsModulusPa: p.youngsModulusPa, beamWidthMm: p.beamWidthMm, thicknessMm: p.thicknessMm },
          p.gageLengthMm,
          avgStrain
        )

        return {
          type: 'cantilever',
          fullSpanSensitivity: sensitivityFromStrain(avgStrain, p.gageFactor) * bridgeGain,
          avgStrain,
          minStrain,
          maxStrain,
          gradient,
          naturalFrequency,
          isValid: validation.isValid,
          error: validation.errorMessage || validation.warnings[0], // fallback to first warning if no error but we need a string
        }
      }

      case 'reverseBeam': {
        const r = calculateReversebeamStrain(input.params)
        return { type: 'reverseBeam', fullSpanSensitivity: r.fullSpanSensitivity, avgStrain: r.avgStrain, minStrain: r.minStrain, maxStrain: r.maxStrain, gradient: r.gradient, isValid: true }
      }

      case 'dualBeam': {
        const r = calculateDualbeamStrain(input.params)
        return { type: 'dualBeam', fullSpanSensitivity: r.fullSpanSensitivity, avgStrain: r.avgStrain, isValid: true }
      }

      case 'binoBeam': {
        const r = calculateBinobeamStrain(input.params)
        return { type: 'binoBeam', fullSpanSensitivity: r.fullSpanSensitivity, avgStrain: r.avgStrain, minStrain: r.minStrain, maxStrain: r.maxStrain, gradient: r.gradient, isValid: true }
      }

      case 'sBeam': {
        const r = calculateSbeamStrain(input.params)
        return { type: 'sBeam', fullSpanSensitivity: r.fullSpanSensitivity, avgStrain: r.avgStrain, minStrain: r.minStrain, maxStrain: r.maxStrain, gradient: r.gradient, isValid: true }
      }

      case 'squareColumn': {
        const r = calculateSquareColumnStrain(input.params)
        if (!r.isValid) return { type: 'squareColumn', fullSpanSensitivity: 0, avgStrain: 0, isValid: false, error: 'Invalid column geometry' }
        return { type: 'squareColumn', fullSpanSensitivity: r.fullSpanOutput, avgStrain: r.axialStrain, isValid: true }
      }

      case 'roundSolidColumn': {
        const r = calculateRoundSolidColumnStrain(input.params)
        if (!r.isValid) return { type: 'roundSolidColumn', fullSpanSensitivity: 0, avgStrain: 0, isValid: false, error: 'Invalid column geometry' }
        return { type: 'roundSolidColumn', fullSpanSensitivity: r.fullSpanOutput, avgStrain: r.axialStrain, isValid: true }
      }

      case 'roundHollowColumn': {
        const r = calculateRoundHollowColumnStrain(input.params)
        if (!r.isValid) return { type: 'roundHollowColumn', fullSpanSensitivity: 0, avgStrain: 0, isValid: false, error: 'Invalid column geometry' }
        return { type: 'roundHollowColumn', fullSpanSensitivity: r.fullSpanOutput, avgStrain: r.axialStrain, isValid: true }
      }

      case 'squareShear': {
        const span = calculateSquareShearSpan(input.params)
        return { type: 'squareShear', fullSpanSensitivity: span, avgStrain: 0, isValid: true }
      }

      case 'roundShear': {
        const span = calculateRoundShearSpan(input.params)
        return { type: 'roundShear', fullSpanSensitivity: span, avgStrain: (span / input.params.gageFactor) * 1000, isValid: true }
      }

      case 'roundHollowShear': {
        const span = calculateRoundShearSpan(input.params)
        return { type: 'roundHollowShear', fullSpanSensitivity: span, avgStrain: (span / input.params.gageFactor) * 1000, isValid: true }
      }

      case 'roundSBeamShear': {
        const span = calculateRoundSBeamSpan(input.params)
        return { type: 'roundSBeamShear', fullSpanSensitivity: span, avgStrain: (span / input.params.gageFactor) * 1000, isValid: true }
      }

      case 'squareTorque': {
        const r = calculateSqTorque(input.params)
        if (!r.success) return { type: 'squareTorque', fullSpanSensitivity: 0, avgStrain: 0, isValid: false, error: r.error }
        return {
          type: 'squareTorque',
          fullSpanSensitivity: r.fullSpan ?? 0,
          avgStrain: r.avgStrain ?? 0,
          minStrain: r.minStrain,
          maxStrain: r.maxStrain,
          gradient: r.gradient,
          isValid: true,
        }
      }

      case 'roundSolidTorque': {
        const r = calculateRoundSolidTorqueStrain(input.params)
        if (!r.isValid) return { type: 'roundSolidTorque', fullSpanSensitivity: 0, avgStrain: 0, isValid: false, error: 'Invalid torque geometry' }
        return { type: 'roundSolidTorque', fullSpanSensitivity: r.fullSpanOutput, avgStrain: r.shearStrain, isValid: true }
      }

      case 'roundHollowTorque': {
        const r = calculateRoundHollowTorqueStrain(input.params)
        if (!r.isValid) return { type: 'roundHollowTorque', fullSpanSensitivity: 0, avgStrain: 0, isValid: false, error: 'Invalid torque geometry' }
        return { 
          type: 'roundHollowTorque', 
          fullSpanSensitivity: r.fullSpanOutput, 
          avgStrain: r.shearStrain, 
          minStrain: r.normalStrain, // Normal strain for output display
          isValid: true 
        }
      }

      case 'pressure': {
        const { appliedPressure, thickness, diameter, poisson, modulus, gageFactor } = input.params
        const { radial, tangential } = computePressureStrains({ appliedPressure, thickness, diameter, poisson, modulus })
        // pressure.ts: radial is compressive (< 0), tangential is tensile (> 0).
        // Full bridge (2 radial + 2 tangential gages): output = (tangential - radial) × GF × 1e-3
        const fullSpanSensitivity = (tangential - radial) * gageFactor * 1e-3
        return { type: 'pressure', fullSpanSensitivity, avgStrain: tangential, minStrain: radial, maxStrain: tangential, isValid: true }
      }
    }
  } catch (err) {
    return {
      type: input.type,
      fullSpanSensitivity: 0,
      avgStrain: 0,
      isValid: false,
      error: err instanceof Error ? err.message : String(err),
    }
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// COMPENSATION
// ══════════════════════════════════════════════════════════════════════════════

export type CompensationMethod =
  | 'zeroVsTemp'
  | 'zeroBalance'
  | 'spanTemp2Pt'
  | 'spanTemp3Pt'
  | 'optShunt'
  | 'spanSet'
  | 'simultaneous'

export interface OptShuntParams {
  rmBridge: number
  rmTempCoeffPpm: number
  tempLowC: number
  tempAmbientC: number
  tempHighC: number
}

export interface SpanSetParams {
  measuredSpan: number
  bridgeResistance: number
  totalRm: number
  desiredSpan: number
}

export type CompensationInput =
  | { method: 'zeroVsTemp';   params: ZeroVsTempParams }
  | { method: 'zeroBalance';  params: ZeroBalanceInput }
  | { method: 'spanTemp2Pt';  params: SpanTemperature2PtInput }
  | { method: 'spanTemp3Pt';  params: SpanTemperature3PtInput }
  | { method: 'optShunt';     params: OptShuntParams }
  | { method: 'spanSet';      params: SpanSetParams }
  | { method: 'simultaneous'; params: SimultaneousSpanInput }

export interface CompensationResult {
  method: CompensationMethod
  /**
   * Primary resistance to realize in the trim network (Ohms).
   * For 'simultaneous', this is rShunt; use secondaryResistance for rMod.
   * For 'spanTemp3Pt', this is the mid-point compensation resistance.
   */
  primaryResistance: number
  /** rMod from 'simultaneous' only. */
  secondaryResistance?: number
  /** Which bridge arm to place the resistor ('zeroVsTemp' only). */
  bridgeArm?: string
  isValid: boolean
  error?: string
}

export function runCompensation(input: CompensationInput): CompensationResult {
  try {
    switch (input.method) {
      case 'zeroVsTemp': {
        const r = calculateZeroVsTemp(input.params)
        return { method: 'zeroVsTemp', primaryResistance: r.resistance, bridgeArm: r.bridgeArm, isValid: true }
      }

      case 'zeroBalance': {
        const r = calculateZeroBalance(input.params)
        return { method: 'zeroBalance', primaryResistance: r.resistanceNeeded, isValid: r.isValid }
      }

      case 'spanTemp2Pt': {
        const r = calculateSpanTemperature2Pt(input.params)
        return { method: 'spanTemp2Pt', primaryResistance: r.compensationResistance, isValid: r.isValid }
      }

      case 'spanTemp3Pt': {
        const r = calculateSpanTemperature3Pt(input.params)
        // Use mid-point compensation as the primary; all three are finite
        return { method: 'spanTemp3Pt', primaryResistance: r.midCompensation, isValid: r.isValid }
      }

      case 'optShunt': {
        const { rmBridge, rmTempCoeffPpm, tempLowC, tempAmbientC, tempHighC } = input.params
        const resistance = calculateOptimalShuntResistance(rmBridge, rmTempCoeffPpm, tempLowC, tempAmbientC, tempHighC)
        return { method: 'optShunt', primaryResistance: resistance, isValid: true }
      }

      case 'spanSet': {
        const { measuredSpan, bridgeResistance, totalRm, desiredSpan } = input.params
        const resistance = calculateSpanSetResistance(measuredSpan, bridgeResistance, totalRm, desiredSpan)
        return { method: 'spanSet', primaryResistance: resistance, isValid: true }
      }

      case 'simultaneous': {
        const r = calculateSimultaneousSpan(input.params)
        if (!r.success) return { method: 'simultaneous', primaryResistance: 0, isValid: false, error: r.error }
        return { method: 'simultaneous', primaryResistance: r.rShunt, secondaryResistance: r.rMod, isValid: true }
      }
    }
  } catch (err) {
    return {
      method: input.method,
      primaryResistance: 0,
      isValid: false,
      error: err instanceof Error ? err.message : String(err),
    }
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// TRIM REALIZATION
// ══════════════════════════════════════════════════════════════════════════════

export type TrimParams =
  | { family: 'C01';      unit: C01UnitKey; startResistance: number; targetResistance: number; ohmSet?: 'ohm40' | 'ohm80' }
  | { family: 'C11';      unit: C11UnitKey; startResistance: number; targetResistance: number }
  | { family: 'C12';      unit: C12UnitKey; startResistance: number; targetResistance: number }
  | { family: 'D01';      unit: D01UnitKey; startResistance: number; targetResistance: number }
  | { family: 'E01_side'; unit: E01UnitKey; startResistance: number; targetResistance: number }

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function realizeTrim(params: TrimParams): LadderSolveResult<any> {
  switch (params.family) {
    case 'C01':
      return solveC01Rungs(params.unit, {
        startResistance: params.startResistance,
        targetResistance: params.targetResistance,
        ohmSet: params.ohmSet,
      })
    case 'C11':
      return solveC11Rungs(params.unit, {
        startResistance: params.startResistance,
        targetResistance: params.targetResistance,
      })
    case 'C12':
      return solveC12Rungs(params.unit, {
        startResistance: params.startResistance,
        targetResistance: params.targetResistance,
      })
    case 'D01':
      return solveD01Rungs(params.unit, {
        startResistance: params.startResistance,
        targetResistance: params.targetResistance,
      })
    case 'E01_side':
      return solveE01SideRungs(params.unit, {
        startResistance: params.startResistance,
        targetResistance: params.targetResistance,
      })
  }
}
