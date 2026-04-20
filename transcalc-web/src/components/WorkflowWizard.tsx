/**
 * WorkflowWizard — guided 3-step workflow: Design → Compensation → Trim
 *
 * Uses orchestrator.ts to chain the three domain functions:
 *   Step 1: runDesign()       — pick transducer type + enter geometry
 *   Step 2: runCompensation() — pick method, measuredSpan pre-filled
 *   Step 3: realizeTrim()     — pick ladder family, targetResistance pre-filled
 */

import { useEffect, useMemo, useState } from 'react'
import {
  runDesign,
  runCompensation,
  realizeTrim,
  type TransducerType,
  type CompensationMethod,
  type DesignResult,
  type CompensationResult,
  type DesignInput,
  type CompensationInput,
  type TrimParams,
} from '../domain/orchestrator'
import { commonWireTypes } from '../domain/zeroBalance'
import { spanWireTypes } from '../domain/spanTemperature2Pt'
import { LADDER_UNIT_KEYS } from '../domain/ladderResistors'
import {
  solveCantileverForTargetSpan,
} from '../domain/inverse/cantileverInverse'
import {
  solveBinoBeamForTargetSpan,
} from '../domain/inverse/binoBeamInverse'
import {
  solveReverseBeamForTargetSpan,
  solveDualBeamForTargetSpan,
  solveSBeamForTargetSpan,
  solveSquareColumnForTargetSpan,
  solveRoundSolidColumnForTargetSpan,
  solveRoundHollowColumnForTargetSpan,
  solveSquareShearForTargetSpan,
  solveRoundShearForTargetSpan,
  solveRoundSBeamShearForTargetSpan,
  solveSquareTorqueForTargetSpan,
  solveRoundSolidTorqueForTargetSpan,
  solveRoundHollowTorqueForTargetSpan,
  solvePressureForTargetSpan,
} from '../domain/inverse/designInverse'
import CantileverModelPreview from './CantileverModelPreview'
import CantileverDiagram from './diagrams/CantileverDiagram'
import ReverseBeamModelPreview from './ReverseBeamModelPreview'
import ReverseBeamDiagram from './diagrams/ReverseBeamDiagram'
import ReverseBeamBridgeDiagram from './diagrams/ReverseBeamBridgeDiagram'
import { BinocularSketch2D } from './BinocularSketch2D'
import { TorqueHollowSketch2D } from './diagrams/TorqueHollowSketch2D'
import { TorqueHollow3D } from './diagrams/TorqueHollow3D'
import { BinocularModelPreview } from './BinocularModelPreview'
import { TRANSDUCER_DEFINITIONS, TRANSDUCER_CATEGORIES } from '../domain/transducerDefinitions'

// ── Constants ────────────────────────────────────────────────────────────────

const N_PER_LBF   = 4.4482216152605
const MM_PER_IN   = 25.4
const GPA_PER_MPSI = 6.8947572932

// ── Types ────────────────────────────────────────────────────────────────────

type UnitSystem = 'SI' | 'US'
type TrimFamily = 'C01' | 'C11' | 'C12' | 'D01' | 'E01_side'
type Step = 1 | 2 | 3
type DesignMode = 'forward' | 'targetDriven'

type UnitKind = 'length' | 'force' | 'modulus' | 'pressure' | 'none'

interface FieldDef {
  key: string
  label: string
  unit: UnitKind
  si: number
  step?: number          // step for number inputs (default 0.01)
  min?: number
}

// ── Unit helpers ─────────────────────────────────────────────────────────────

function toDisplay(siVal: number, unit: UnitKind, us: boolean): number {
  if (!us || unit === 'none') return siVal
  let val = 0
  switch (unit) {
    case 'length':   val = siVal / MM_PER_IN; break
    case 'force':    val = siVal / N_PER_LBF; break
    case 'modulus':  val = siVal / GPA_PER_MPSI; break
    case 'pressure': val = siVal / 0.006894757; break
    default: return siVal
  }
  // Round to 4 decimal places to avoid floating point artifacts like 0.999999999
  return Math.round(val * 10000) / 10000
}

function toSI(displayVal: number, unit: UnitKind, us: boolean): number {
  if (!us || unit === 'none') return displayVal
  let val = 0
  switch (unit) {
    case 'length':   val = displayVal * MM_PER_IN; break
    case 'force':    val = displayVal * N_PER_LBF; break
    case 'modulus':  val = displayVal * GPA_PER_MPSI; break
    case 'pressure': val = displayVal * 0.006894757; break
    default: return displayVal
  }
  // Round to 6 decimal places for SI storage to minimize precision loss 
  // while still cleaning up artifacts (e.g. 25.400000000000002)
  return Math.round(val * 1000000) / 1000000
}

function unitLabel(unit: UnitKind, us: boolean, fieldKey?: string): string {
  switch (unit) {
    case 'length':   return us ? 'in' : 'mm'
    case 'force':    return us ? 'lbf' : 'N'
    case 'modulus':  return us ? 'Mpsi' : 'GPa'
    case 'pressure': return us ? 'psi' : 'MPa'
    case 'none':     
      if (fieldKey === 'appliedTorque') return us ? 'in·lb' : 'N·m'
      return ''
    default: return ''
  }
}

const show = (v: number, d: number) => (Number.isFinite(v) ? v.toFixed(d) : '—')

type InverseMeta = { key: string; label: string; fieldKey: string }
type GenericInverseResult = {
  isValid: boolean
  solvedValue?: number
  solvedKey?: string
  solvedFieldKey?: string
  designResult?: DesignResult
  warnings: string[]
  error?: string
}

const INVERSE_META: Partial<Record<TransducerType, InverseMeta[]>> = {
  cantilever: [
    { key: 'loadN', label: 'Applied Load', fieldKey: 'load' },
    { key: 'momentArmMm', label: 'Moment Arm', fieldKey: 'momentArm' },
    { key: 'beamWidthMm', label: 'Beam Width', fieldKey: 'width' },
    { key: 'thicknessMm', label: 'Thickness', fieldKey: 'thickness' },
    { key: 'gageFactor', label: 'Gage Factor', fieldKey: 'gageFactor' },
    { key: 'youngsModulusGPa', label: 'Modulus', fieldKey: 'modulus' },
  ],
  binoBeam: [
    { key: 'loadN', label: 'Applied Load', fieldKey: 'load' },
    { key: 'minimumThicknessMm', label: 'Min. Thickness', fieldKey: 'minThick' },
  ],
  reverseBeam: [
    { key: 'loadN', label: 'Applied Load', fieldKey: 'load' },
    { key: 'thicknessMm', label: 'Thickness', fieldKey: 'thickness' },
  ],
  dualBeam: [
    { key: 'loadN', label: 'Applied Load', fieldKey: 'load' },
    { key: 'thicknessMm', label: 'Thickness', fieldKey: 'thickness' },
  ],
  sBeam: [
    { key: 'loadN', label: 'Applied Load', fieldKey: 'load' },
    { key: 'thicknessMm', label: 'Thickness', fieldKey: 'thickness' },
  ],
  squareColumn: [
    { key: 'loadN', label: 'Applied Load', fieldKey: 'load' },
    { key: 'widthMm', label: 'Width', fieldKey: 'width' },
  ],
  roundSolidColumn: [
    { key: 'loadN', label: 'Applied Load', fieldKey: 'load' },
    { key: 'diameterMm', label: 'Diameter', fieldKey: 'diameter' },
  ],
  roundHollowColumn: [
    { key: 'loadN', label: 'Applied Load', fieldKey: 'load' },
    { key: 'outerDiameterMm', label: 'Outer Diameter', fieldKey: 'outerDiameter' },
  ],
  squareShear: [
    { key: 'loadN', label: 'Applied Load', fieldKey: 'load' },
    { key: 'thicknessMm', label: 'Thickness', fieldKey: 'thickness' },
  ],
  roundShear: [
    { key: 'loadN', label: 'Applied Load', fieldKey: 'load' },
    { key: 'thicknessMm', label: 'Thickness', fieldKey: 'thickness' },
  ],
  roundSBeamShear: [
    { key: 'loadN', label: 'Applied Load', fieldKey: 'load' },
    { key: 'thicknessMm', label: 'Thickness', fieldKey: 'thickness' },
  ],
  squareTorque: [
    { key: 'appliedTorqueNmm', label: 'Applied Torque', fieldKey: 'appliedTorque' },
    { key: 'widthMm', label: 'Width', fieldKey: 'width' },
  ],
  roundSolidTorque: [
    { key: 'appliedTorqueNm', label: 'Applied Torque', fieldKey: 'appliedTorque' },
    { key: 'diameterMm', label: 'Diameter', fieldKey: 'diameter' },
  ],
  roundHollowTorque: [
    { key: 'appliedTorqueNm', label: 'Applied Torque', fieldKey: 'appliedTorque' },
    { key: 'outerDiameterMm', label: 'Outer Diameter', fieldKey: 'outerDiameter' },
  ],
  pressure: [
    { key: 'appliedPressureMPa', label: 'Applied Pressure', fieldKey: 'pressure' },
    { key: 'thicknessMm', label: 'Diaphragm Thickness', fieldKey: 'thickness' },
  ],
}

// ── Design field definitions ─────────────────────────────────────────────────

const DESIGN_FIELDS: Record<string, FieldDef[]> = {
  cantilever: [
    { key: 'load',      label: 'Applied Load',  unit: 'force',   si: 100 },
    { key: 'momentArm', label: 'Moment Arm',     unit: 'length',  si: 100 },
    { key: 'gageOffset',label: 'Gage CL from Fixed End', unit: 'length', si: 6 },
    { key: 'thickness', label: 'Thickness',      unit: 'length',  si: 2 },
    { key: 'width',     label: 'Beam Width',     unit: 'length',  si: 25 },
    { key: 'clampLength', label: 'Clamp Length', unit: 'length', si: 20 },
    { key: 'modulus',   label: 'Modulus',        unit: 'modulus', si: 200 },
    { key: 'poisson',   label: 'Poisson Ratio',  unit: 'none',    si: 0.3 },
    { key: 'gageLen',   label: 'Gage Length',    unit: 'length',  si: 5 },
    { key: 'gageFactor',label: 'Gage Factor',    unit: 'none',    si: 2.0 },
    { key: 'bridgeConfig', label: 'Bridge Config', unit: 'none', si: 0 }, // Placeholder for mapping
  ],
  reverseBeam: [
    { key: 'load',       label: 'Applied Load',         unit: 'force',   si: 100 },
    { key: 'width',      label: 'Beam Width',           unit: 'length',  si: 25 },
    { key: 'thickness',  label: 'Thickness',            unit: 'length',  si: 2 },
    { key: 'beamLength', label: 'Beam Length, L',       unit: 'length',  si: 150 },
    { key: 'distGages',  label: 'Dist. Between Gages, D', unit: 'length', si: 50 },
    { key: 'modulus',    label: 'Modulus',              unit: 'modulus', si: 200 },
    { key: 'gageLen',    label: 'Gage Length',          unit: 'length',  si: 5 },
    { key: 'gageFactor', label: 'Gage Factor',          unit: 'none',    si: 2.0 },
  ],
  dualBeam: [
    { key: 'load',       label: 'Applied Load',       unit: 'force',   si: 100 },
    { key: 'width',      label: 'Beam Width',         unit: 'length',  si: 25 },
    { key: 'thickness',  label: 'Thickness',          unit: 'length',  si: 2 },
    { key: 'distGages',  label: 'Dist. Between Gages',unit: 'length',  si: 40 },
    { key: 'distLoadCl', label: 'Load to CL Distance',unit: 'length',  si: 60 },
    { key: 'modulus',    label: 'Modulus',            unit: 'modulus', si: 200 },
    { key: 'gageLen',    label: 'Gage Length',        unit: 'length',  si: 5 },
    { key: 'gageFactor', label: 'Gage Factor',        unit: 'none',    si: 2.0 },
  ],
  sBeam: [
    { key: 'load',       label: 'Applied Load',       unit: 'force',   si: 1000 },
    { key: 'holeRadius', label: 'Hole Radius',        unit: 'length',  si: 8 },
    { key: 'width',      label: 'Beam Width',         unit: 'length',  si: 40 },
    { key: 'thickness',  label: 'Thickness',          unit: 'length',  si: 10 },
    { key: 'distGages',  label: 'Dist. Between Gages',unit: 'length',  si: 50 },
    { key: 'modulus',    label: 'Modulus',            unit: 'modulus', si: 200 },
    { key: 'gageLen',    label: 'Gage Length',        unit: 'length',  si: 10 },
    { key: 'gageFactor', label: 'Gage Factor',        unit: 'none',    si: 2.1 },
  ],
  squareColumn: [
    { key: 'load',      label: 'Applied Load',  unit: 'force',   si: 5000 },
    { key: 'width',     label: 'Width',          unit: 'length',  si: 25 },
    { key: 'depth',     label: 'Depth',          unit: 'length',  si: 25 },
    { key: 'modulus',   label: 'Modulus',        unit: 'modulus', si: 200 },
    { key: 'poisson',   label: 'Poisson Ratio',  unit: 'none',    si: 0.3 },
    { key: 'gageFactor',label: 'Gage Factor',    unit: 'none',    si: 2.1 },
  ],
  roundSolidColumn: [
    { key: 'load',      label: 'Applied Load',   unit: 'force',   si: 5000 },
    { key: 'diameter',  label: 'Diameter',       unit: 'length',  si: 25 },
    { key: 'modulus',   label: 'Modulus',        unit: 'modulus', si: 200 },
    { key: 'poisson',   label: 'Poisson Ratio',  unit: 'none',    si: 0.3 },
    { key: 'gageFactor',label: 'Gage Factor',    unit: 'none',    si: 2.1 },
  ],
  roundHollowColumn: [
    { key: 'load',         label: 'Applied Load',    unit: 'force',   si: 5000 },
    { key: 'outerDiameter',label: 'Outer Diameter',  unit: 'length',  si: 30 },
    { key: 'innerDiameter',label: 'Inner Diameter',  unit: 'length',  si: 20 },
    { key: 'modulus',      label: 'Modulus',         unit: 'modulus', si: 200 },
    { key: 'poisson',      label: 'Poisson Ratio',   unit: 'none',    si: 0.3 },
    { key: 'gageFactor',   label: 'Gage Factor',     unit: 'none',    si: 2.1 },
  ],
  binoBeam: [
    { key: 'load',        label: 'Applied Load',      unit: 'force',   si: 100 },
    { key: 'distHoles',   label: 'Hole CL Distance',  unit: 'length',  si: 100 },
    { key: 'radius',      label: 'Hole Radius',       unit: 'length',  si: 5 },
    { key: 'cutThick',    label: 'Cut Thickness',     unit: 'length',  si: 2 },
    { key: 'beamWidth',   label: 'Beam Width',        unit: 'length',  si: 25 },
    { key: 'beamHeight',  label: 'Beam Height',       unit: 'length',  si: 14 },
    { key: 'minThick',    label: 'Min. Thickness',    unit: 'length',  si: 2 },
    { key: 'modulus',     label: 'Modulus',           unit: 'modulus', si: 200 },
    { key: 'gageLen',     label: 'Gage Length',       unit: 'length',  si: 5 },
    { key: 'gageFactor',  label: 'Gage Factor',       unit: 'none',    si: 2.0 },
  ],
  squareShear: [
    { key: 'load',      label: 'Applied Load',   unit: 'force',   si: 5000 },
    { key: 'width',     label: 'Width',          unit: 'length',  si: 30 },
    { key: 'height',    label: 'Height',         unit: 'length',  si: 50 },
    { key: 'diameter',  label: 'Hole Diameter',  unit: 'length',  si: 30 },
    { key: 'thickness', label: 'Web Thickness',  unit: 'length',  si: 5 },
    { key: 'modulus',   label: 'Modulus',        unit: 'modulus', si: 200 },
    { key: 'poisson',   label: 'Poisson Ratio',  unit: 'none',    si: 0.3 },
    { key: 'gageFactor',label: 'Gage Factor',    unit: 'none',    si: 2.1 },
  ],
  roundShear: [
    { key: 'load',      label: 'Applied Load',   unit: 'force',   si: 5000 },
    { key: 'width',     label: 'Width',          unit: 'length',  si: 30 },
    { key: 'height',    label: 'Height',         unit: 'length',  si: 50 },
    { key: 'diameter',  label: 'Hole Diameter',  unit: 'length',  si: 30 },
    { key: 'thickness', label: 'Web Thickness',  unit: 'length',  si: 5 },
    { key: 'modulus',   label: 'Modulus',        unit: 'modulus', si: 200 },
    { key: 'poisson',   label: 'Poisson Ratio',  unit: 'none',    si: 0.3 },
    { key: 'gageFactor',label: 'Gage Factor',    unit: 'none',    si: 2.1 },
  ],
  roundHollowShear: [
    { key: 'load',      label: 'Applied Load',   unit: 'force',   si: 5000 },
    { key: 'width',     label: 'Width',          unit: 'length',  si: 30 },
    { key: 'height',    label: 'Height',         unit: 'length',  si: 50 },
    { key: 'diameter',  label: 'Hole Diameter',  unit: 'length',  si: 30 },
    { key: 'thickness', label: 'Web Thickness',  unit: 'length',  si: 5 },
    { key: 'modulus',   label: 'Modulus',        unit: 'modulus', si: 200 },
    { key: 'poisson',   label: 'Poisson Ratio',  unit: 'none',    si: 0.3 },
    { key: 'gageFactor',label: 'Gage Factor',    unit: 'none',    si: 2.1 },
  ],
  roundSBeamShear: [
    { key: 'load',      label: 'Applied Load',   unit: 'force',   si: 5000 },
    { key: 'width',     label: 'Width',          unit: 'length',  si: 30 },
    { key: 'height',    label: 'Height',         unit: 'length',  si: 50 },
    { key: 'diameter',  label: 'Hole Diameter',  unit: 'length',  si: 30 },
    { key: 'thickness', label: 'Web Thickness',  unit: 'length',  si: 5 },
    { key: 'modulus',   label: 'Modulus',        unit: 'modulus', si: 200 },
    { key: 'poisson',   label: 'Poisson Ratio',  unit: 'none',    si: 0.3 },
    { key: 'gageFactor',label: 'Gage Factor',    unit: 'none',    si: 2.1 },
  ],
  squareTorque: [
    { key: 'appliedTorque', label: 'Applied Torque (N·mm)', unit: 'none',    si: 5000 },
    { key: 'width',         label: 'Width',                 unit: 'length',  si: 25 },
    { key: 'poisson',       label: 'Poisson Ratio',         unit: 'none',    si: 0.3 },
    { key: 'modulus',       label: 'Modulus (GPa)',         unit: 'none',    si: 50000 },
    { key: 'gageLen',       label: 'Gage Length',           unit: 'length',  si: 12 },
    { key: 'gageFactor',    label: 'Gage Factor',           unit: 'none',    si: 2.1 },
  ],
  roundSolidTorque: [
    { key: 'appliedTorque', label: 'Applied Torque (N·m)', unit: 'none',    si: 50 },
    { key: 'diameter',      label: 'Diameter',             unit: 'length',  si: 25 },
    { key: 'modulus',       label: 'Modulus',              unit: 'modulus', si: 200 },
    { key: 'poisson',       label: 'Poisson Ratio',        unit: 'none',    si: 0.3 },
    { key: 'gageFactor',    label: 'Gage Factor',          unit: 'none',    si: 2.1 },
  ],
  roundHollowTorque: [
    { key: 'appliedTorque', label: 'Applied Torque',       unit: 'none',    si: 50 },
    { key: 'outerDiameter', label: 'Outer Diameter',       unit: 'length',  si: 30 },
    { key: 'innerDiameter', label: 'Inner Diameter',       unit: 'length',  si: 20 },
    { key: 'modulus',       label: 'Modulus',              unit: 'modulus', si: 200 },
    { key: 'poisson',       label: 'Poisson Ratio',        unit: 'none',    si: 0.3 },
    { key: 'gageFactor',    label: 'Gage Factor',          unit: 'none',    si: 2.1 },
  ],
  pressure: [
    { key: 'pressure',   label: 'Applied Pressure',      unit: 'pressure', si: 1 },
    { key: 'thickness',  label: 'Diaphragm Thickness',   unit: 'length',   si: 2 },
    { key: 'diameter',   label: 'Diaphragm Diameter',    unit: 'length',   si: 50 },
    { key: 'poisson',    label: 'Poisson Ratio',         unit: 'none',     si: 0.28 },
    { key: 'modulus',    label: 'Modulus',               unit: 'modulus',  si: 200 },
    { key: 'gageFactor', label: 'Gage Factor',           unit: 'none',     si: 2.0 },
  ],
}

// ── Compensation field definitions ───────────────────────────────────────────

const COMP_FIELDS: Record<CompensationMethod, FieldDef[]> = {
  zeroVsTemp: [
    { key: 'lowTemp',          label: 'Low Temperature (°C)',    unit: 'none', si: -40 },
    { key: 'lowOutput',        label: 'Low Output (mV/V)',       unit: 'none', si: -0.5 },
    { key: 'highTemp',         label: 'High Temperature (°C)',   unit: 'none', si: 80 },
    { key: 'highOutput',       label: 'High Output (mV/V)',      unit: 'none', si: 0.5 },
    { key: 'resistorTcr',      label: 'Resistor TCR (%/°C)',     unit: 'none', si: 0.25 },
    { key: 'bridgeResistance', label: 'Bridge Resistance (Ω)',   unit: 'none', si: 350 },
  ],
  zeroBalance: [
    { key: 'unbalance',        label: 'Output Imbalance (mV/V)', unit: 'none', si: 5 },
    { key: 'bridgeResistance', label: 'Bridge Resistance (Ω)',   unit: 'none', si: 350 },
    { key: 'awgGauge',         label: 'AWG Gauge (30–50)',       unit: 'none', si: 36, min: 30, step: 1 },
  ],
  spanTemp2Pt: [
    { key: 'lowTemp',          label: 'Low Temperature (°C)',    unit: 'none', si: -40 },
    { key: 'lowOutput',        label: 'Low Output (mV/V)',       unit: 'none', si: 1.98 },
    { key: 'highTemp',         label: 'High Temperature (°C)',   unit: 'none', si: 80 },
    { key: 'highOutput',       label: 'High Output (mV/V)',      unit: 'none', si: 2.02 },
    { key: 'resistorTCR',      label: 'Resistor TCR (%/°C)',     unit: 'none', si: 0.25 },
    { key: 'bridgeResistance', label: 'Bridge Resistance (Ω)',   unit: 'none', si: 350 },
  ],
  spanTemp3Pt: [
    { key: 'lowTemp',          label: 'Low Temperature (°C)',    unit: 'none', si: -40 },
    { key: 'lowOutput',        label: 'Low Output (mV/V)',       unit: 'none', si: 1.98 },
    { key: 'midTemp',          label: 'Mid Temperature (°C)',    unit: 'none', si: 20 },
    { key: 'midOutput',        label: 'Mid Output (mV/V)',       unit: 'none', si: 2.00 },
    { key: 'highTemp',         label: 'High Temperature (°C)',   unit: 'none', si: 80 },
    { key: 'highOutput',       label: 'High Output (mV/V)',      unit: 'none', si: 2.02 },
    { key: 'resistorTCR',      label: 'Resistor TCR (%/°C)',     unit: 'none', si: 0.25 },
    { key: 'bridgeResistance', label: 'Bridge Resistance (Ω)',   unit: 'none', si: 350 },
  ],
  optShunt: [
    { key: 'rmBridge',       label: 'Bridge Resistance (Ω)',     unit: 'none', si: 350 },
    { key: 'rmTempCoeffPpm', label: 'Bridge TCR (ppm/°C)',       unit: 'none', si: 100 },
    { key: 'tempLowC',       label: 'Low Temperature (°C)',      unit: 'none', si: -40 },
    { key: 'tempAmbientC',   label: 'Ambient Temperature (°C)',  unit: 'none', si: 20 },
    { key: 'tempHighC',      label: 'High Temperature (°C)',     unit: 'none', si: 80 },
  ],
  spanSet: [
    { key: 'measuredSpan',    label: 'Measured Span (mV/V)',   unit: 'none', si: 2.0 },
    { key: 'bridgeResistance',label: 'Bridge Resistance (Ω)',  unit: 'none', si: 350 },
    { key: 'totalRm',         label: 'Total Series Rm (Ω)',    unit: 'none', si: 0 },
    { key: 'desiredSpan',     label: 'Desired Span (mV/V)',    unit: 'none', si: 2.0 },
  ],
  simultaneous: [
    { key: 'lowSpan',        label: 'Low Span (mV)',           unit: 'none', si: 1.98 },
    { key: 'lowRBridge',     label: 'Low Bridge Ω',            unit: 'none', si: 350 },
    { key: 'lowRMod',        label: 'Low Mod Ω',               unit: 'none', si: 1.0 },
    { key: 'ambientSpan',    label: 'Ambient Span (mV)',       unit: 'none', si: 2.00 },
    { key: 'ambientRBridge', label: 'Ambient Bridge Ω',        unit: 'none', si: 350 },
    { key: 'ambientRMod',    label: 'Ambient Mod Ω',           unit: 'none', si: 1.0 },
    { key: 'highSpan',       label: 'High Span (mV)',          unit: 'none', si: 2.02 },
    { key: 'highRBridge',    label: 'High Bridge Ω',           unit: 'none', si: 350 },
    { key: 'highRMod',       label: 'High Mod Ω',              unit: 'none', si: 1.0 },
    { key: 'desiredSpan',    label: 'Desired Span (mV)',       unit: 'none', si: 2.0 },
  ],
}

// ── Param initializers ───────────────────────────────────────────────────────

const BRIDGE_CONFIG_LABELS: Record<string, string> = {
  quarter: 'Quarter Bridge (1 gage)',
  halfBending: 'Half Bridge Bending (1 top / 1 bottom)',
  fullBending: 'Full Bridge Bending (2 top / 2 bottom)',
  poissonHalf: 'Poisson Half Bridge (1 active / 1 poisson)',
  poissonFullTop: 'Poisson Full Bridge (2 active / 2 poisson on top)',
  poissonFullDifferential: 'Poisson Full Bridge (1 active / 1 poisson top + bottom)',
}

function initParams(fields: FieldDef[]): Record<string, number | string> {
  const params: Record<string, number | string> = {};
  fields.forEach(f => {
    params[f.key] = f.key === 'bridgeConfig' ? 'quarter' : f.si;
  });
  return params;
}

// ── Build orchestrator inputs ─────────────────────────────────────────────────

function buildDesignInput(type: TransducerType, p: Record<string, any>): DesignInput {
  switch (type) {
    case 'cantilever':
      return {
        type: 'cantilever',
        params: {
          loadN: p.load,
          momentArmMm: p.momentArm,
          gageLengthMm: p.gageLen,
          youngsModulusPa: p.modulus * 1e9,
          poissonRatio: p.poisson ?? 0.3,
          beamWidthMm: p.width,
          thicknessMm: p.thickness,
          gageFactor: p.gageFactor,
          bridgeConfig: p.bridgeConfig || 'quarter',
        },
      }
    case 'reverseBeam':
      return {
        type: 'reverseBeam',
        params: {
          appliedLoad: p.load,
          beamWidth: p.width * 0.001,
          thickness: p.thickness * 0.001,
          beamLength: p.beamLength ? p.beamLength * 0.001 : undefined,
          distanceBetweenGages: p.distGages * 0.001,
          modulus: p.modulus * 1e9,
          gageLength: p.gageLen * 0.001,
          gageFactor: p.gageFactor,
        },
      }
    case 'dualBeam':
      return {
        type: 'dualBeam',
        params: {
          appliedLoad: p.load,
          beamWidth: p.width * 0.001,
          thickness: p.thickness * 0.001,
          distanceBetweenGages: p.distGages * 0.001,
          distanceLoadToCL: p.distLoadCl * 0.001,
          modulus: p.modulus * 1e9,
          gageLength: p.gageLen * 0.001,
          gageFactor: p.gageFactor,
        },
      }
    case 'sBeam':
      return {
        type: 'sBeam',
        params: {
          appliedLoad: p.load,
          holeRadius: p.holeRadius * 0.001,
          beamWidth: p.width * 0.001,
          thickness: p.thickness * 0.001,
          distanceBetweenGages: p.distGages * 0.001,
          modulus: p.modulus * 1e9,
          gageLength: p.gageLen * 0.001,
          gageFactor: p.gageFactor,
        },
      }
    case 'squareColumn':
      return {
        type: 'squareColumn',
        params: {
          appliedLoad: p.load,
          width: p.width,
          depth: p.depth,
          modulus: p.modulus,
          poissonRatio: p.poisson,
          gageFactor: p.gageFactor,
          usUnits: false,
        },
      }
    case 'roundSolidColumn':
      return {
        type: 'roundSolidColumn',
        params: {
          appliedLoad: p.load,
          diameter: p.diameter,
          modulus: p.modulus,
          poissonRatio: p.poisson,
          gageFactor: p.gageFactor,
          usUnits: false,
        },
      }
    case 'roundHollowColumn':
      return {
        type: 'roundHollowColumn',
        params: {
          appliedLoad: p.load,
          outerDiameter: p.outerDiameter,
          innerDiameter: p.innerDiameter,
          modulus: p.modulus,
          poissonRatio: p.poisson,
          gageFactor: p.gageFactor,
          usUnits: false,
        },
      }
    case 'binoBeam':
      return {
        type: 'binoBeam',
        params: {
          appliedLoad: p.load,
          distanceBetweenHoles: p.distHoles * 0.001,
          radius: p.radius * 0.001,
          beamWidth: p.beamWidth * 0.001,
          beamHeight: p.beamHeight * 0.001,
          distanceLoadHole: 0,
          minimumThickness: p.minThick * 0.001,
          modulus: p.modulus * 1e9,
          gageLength: p.gageLen * 0.001,
          gageFactor: p.gageFactor,
        },
      }
    case 'squareShear':
      return {
        type: 'squareShear',
        params: {
          load: p.load,
          width: p.width * 0.001,
          height: p.height * 0.001,
          diameter: p.diameter * 0.001,
          thickness: p.thickness * 0.001,
          modulus: p.modulus * 1e9,
          poisson: p.poisson,
          gageFactor: p.gageFactor,
        },
      }
    case 'roundShear':
      return {
        type: 'roundShear',
        params: {
          load: p.load,
          width: p.width * 0.001,
          height: p.height * 0.001,
          diameter: p.diameter * 0.001,
          thickness: p.thickness * 0.001,
          modulus: p.modulus * 1e9,
          poisson: p.poisson,
          gageFactor: p.gageFactor,
        },
      }
    case 'roundSBeamShear':
      return {
        type: 'roundSBeamShear',
        params: {
          load: p.load,
          width: p.width * 0.001,
          height: p.height * 0.001,
          diameter: p.diameter * 0.001,
          thickness: p.thickness * 0.001,
          modulus: p.modulus * 1e9,
          poisson: p.poisson,
          gageFactor: p.gageFactor,
        },
      }
    case 'squareTorque':
      return {
        type: 'squareTorque',
        params: {
          appliedTorque: p.appliedTorque,
          width: p.width,
          poisson: p.poisson,
          modulus: p.modulus,
          gageLength: p.gageLen,
          gageFactor: p.gageFactor,
          usUnits: false,
        },
      }
    case 'roundSolidTorque':
      return {
        type: 'roundSolidTorque',
        params: {
          appliedTorque: p.appliedTorque,
          diameter: p.diameter * 0.001,
          modulus: p.modulus * 1e9,
          poissonRatio: p.poisson,
          gageFactor: p.gageFactor,
        },
      }
    case 'roundHollowTorque':
      return {
        type: 'roundHollowTorque',
        params: {
          appliedTorque: p.appliedTorque,
          outerDiameter: p.outerDiameter * 0.001,
          innerDiameter: p.innerDiameter * 0.001,
          modulus: p.modulus * 1e9,
          poissonRatio: p.poisson,
          gageFactor: p.gageFactor,
        },
      }
    case 'pressure':
      return {
        type: 'pressure',
        params: {
          appliedPressure: p.pressure,
          thickness: p.thickness,
          diameter: p.diameter,
          poisson: p.poisson,
          modulus: p.modulus * 1000,
          gageFactor: p.gageFactor,
        },
      }
    default:
      throw new Error(`Unsupported design type in wizard: ${type}`)
  }
}

function buildCompInput(
  method: CompensationMethod,
  p: Record<string, number>,
  wireIdx: number,
): CompensationInput {
  switch (method) {
    case 'zeroVsTemp':
      return {
        method: 'zeroVsTemp',
        params: {
          lowTemp: p.lowTemp,
          lowOutput: p.lowOutput,
          highTemp: p.highTemp,
          highOutput: p.highOutput,
          resistorTcr: p.resistorTcr,
          bridgeResistance: p.bridgeResistance,
          units: 'SI',
        },
      }
    case 'zeroBalance':
      return {
        method: 'zeroBalance',
        params: {
          unbalance: p.unbalance,
          bridgeResistance: p.bridgeResistance,
          wireType: commonWireTypes[wireIdx] ?? commonWireTypes[0],
          awgGauge: Math.round(p.awgGauge),
        },
      }
    case 'spanTemp2Pt':
      return {
        method: 'spanTemp2Pt',
        params: {
          lowTemperature: p.lowTemp,
          lowOutput: p.lowOutput,
          highTemperature: p.highTemp,
          highOutput: p.highOutput,
          wireType: spanWireTypes[wireIdx] ?? spanWireTypes[0],
          resistorTCR: p.resistorTCR,
          bridgeResistance: p.bridgeResistance,
          usUnits: false,
        },
      }
    case 'spanTemp3Pt':
      return {
        method: 'spanTemp3Pt',
        params: {
          lowPoint:  { temperature: p.lowTemp,  output: p.lowOutput },
          midPoint:  { temperature: p.midTemp,  output: p.midOutput },
          highPoint: { temperature: p.highTemp, output: p.highOutput },
          resistorTCR: p.resistorTCR,
          bridgeResistance: p.bridgeResistance,
          usUnits: false,
        },
      }
    case 'optShunt':
      return {
        method: 'optShunt',
        params: {
          rmBridge: p.rmBridge,
          rmTempCoeffPpm: p.rmTempCoeffPpm,
          tempLowC: p.tempLowC,
          tempAmbientC: p.tempAmbientC,
          tempHighC: p.tempHighC,
        },
      }
    case 'spanSet':
      return {
        method: 'spanSet',
        params: {
          measuredSpan: p.measuredSpan,
          bridgeResistance: p.bridgeResistance,
          totalRm: p.totalRm,
          desiredSpan: p.desiredSpan,
        },
      }
    case 'simultaneous':
      return {
        method: 'simultaneous',
        params: {
          lowSpan: p.lowSpan,
          lowRBridge: p.lowRBridge,
          lowRMod: p.lowRMod,
          ambientSpan: p.ambientSpan,
          ambientRBridge: p.ambientRBridge,
          ambientRMod: p.ambientRMod,
          highSpan: p.highSpan,
          highRBridge: p.highRBridge,
          highRMod: p.highRMod,
          desiredSpan: p.desiredSpan,
        },
      }
  }
}

// ── Design type metadata ─────────────────────────────────────────────────────

const COMP_METHODS: Array<{ key: CompensationMethod; label: string }> = [
  { key: 'zeroVsTemp',  label: 'Zero vs Temp' },
  { key: 'zeroBalance', label: 'Zero Balance' },
  { key: 'spanTemp2Pt', label: 'Span Temp 2-Pt' },
  { key: 'spanTemp3Pt', label: 'Span Temp 3-Pt' },
  { key: 'optShunt',    label: 'Optimal Shunt' },
  { key: 'spanSet',     label: 'Span Set' },
  { key: 'simultaneous',label: 'Simultaneous' },
]

const TRIM_FAMILIES: Array<{ key: TrimFamily; label: string; unitListKey: keyof typeof LADDER_UNIT_KEYS }> = [
  { key: 'C01',      label: 'C01',      unitListKey: 'c01' },
  { key: 'C11',      label: 'C11',      unitListKey: 'c11' },
  { key: 'C12',      label: 'C12',      unitListKey: 'c12' },
  { key: 'D01',      label: 'D01',      unitListKey: 'd01' },
  { key: 'E01_side', label: 'E01 Side', unitListKey: 'e01' },
]

// ── Component ─────────────────────────────────────────────────────────────────

type Props = {
  unitSystem: UnitSystem
  onUnitChange: (u: UnitSystem) => void
  initialStep?: Step
}

export default function WorkflowWizard({ unitSystem, onUnitChange, initialStep }: Props) {
  const us = unitSystem === 'US'

  // ── Step ──────────────────────────────────────────────────────
  const [step, setStep] = useState<Step>(initialStep ?? 1)

  useEffect(() => {
    if (initialStep !== undefined) {
      setStep(initialStep)
    }
  }, [initialStep])

  // ── Step 1: Design ────────────────────────────────────────────
  const [designType, setDesignType] = useState<TransducerType>('binoBeam')
  const [dp, setDp] = useState<Record<string, number>>(initParams(DESIGN_FIELDS.binoBeam) as unknown as Record<string, number>)
  const [designMode, setDesignMode] = useState<DesignMode>('forward')
  const [targetSpanMvV, setTargetSpanMvV] = useState(2.0)
  const [inverseUnknownByType, setInverseUnknownByType] = useState<Partial<Record<TransducerType, string>>>({
    cantilever: INVERSE_META.cantilever?.[0]?.key,
    reverseBeam: INVERSE_META.reverseBeam?.[0]?.key,
    dualBeam: INVERSE_META.dualBeam?.[0]?.key,
    sBeam: INVERSE_META.sBeam?.[0]?.key,
    squareColumn: INVERSE_META.squareColumn?.[0]?.key,
    roundSolidColumn: INVERSE_META.roundSolidColumn?.[0]?.key,
    roundHollowColumn: INVERSE_META.roundHollowColumn?.[0]?.key,
    binoBeam: INVERSE_META.binoBeam?.[0]?.key,
    squareShear: INVERSE_META.squareShear?.[0]?.key,
    roundShear: INVERSE_META.roundShear?.[0]?.key,
    roundSBeamShear: INVERSE_META.roundSBeamShear?.[0]?.key,
    squareTorque: INVERSE_META.squareTorque?.[0]?.key,
    roundSolidTorque: INVERSE_META.roundSolidTorque?.[0]?.key,
    roundHollowTorque: INVERSE_META.roundHollowTorque?.[0]?.key,
    pressure: INVERSE_META.pressure?.[0]?.key,
  })

  // ── Step 2: Compensation ──────────────────────────────────────
  const [compMethod, setCompMethod] = useState<CompensationMethod>('spanSet')
  const [cp, setCp] = useState<Record<string, number>>(initParams(COMP_FIELDS.spanSet) as unknown as Record<string, number>)
  const [wireIdx, setWireIdx] = useState(0)

  // ── Step 3: Trim ─────────────────────────────────────────────
  const [trimFamily, setTrimFamily] = useState<TrimFamily>('C01')
  const [trimUnit, setTrimUnit] = useState<string>(LADDER_UNIT_KEYS.c01[0])
  const [trimStart, setTrimStart] = useState(350)
  const [trimTarget, setTrimTarget] = useState(100)

  // ── Reset design params when type changes ─────────────────────
  useEffect(() => {
    if (DESIGN_FIELDS[designType]) {
      const newParams = initParams(DESIGN_FIELDS[designType]);
      console.log('Resetting params for:', designType, newParams);
      setDp(newParams as unknown as Record<string, number>);
    }
    const supported = Boolean(INVERSE_META[designType]?.length)
    if (!supported) setDesignMode('forward')
    setInverseUnknownByType(prev => {
      if (prev[designType]) return prev
      const fallback = INVERSE_META[designType]?.[0]?.key
      if (!fallback) return prev
      return { ...prev, [designType]: fallback }
    })
  }, [designType])

  // ── Reset comp params when method changes ─────────────────────
  useEffect(() => {
    setCp(initParams(COMP_FIELDS[compMethod]) as unknown as Record<string, number>)
    setWireIdx(0)
  }, [compMethod])

  // ── Auto-fill trim unit when family changes ───────────────────
  useEffect(() => {
    const meta = TRIM_FAMILIES.find(f => f.key === trimFamily)
    if (meta) setTrimUnit(LADDER_UNIT_KEYS[meta.unitListKey][0])
  }, [trimFamily])

  // ── Results ───────────────────────────────────────────────────
  const selectedInverseMeta = INVERSE_META[designType] ?? []
  const selectedUnknownKey = inverseUnknownByType[designType] ?? selectedInverseMeta[0]?.key

  const inverseResult = useMemo((): GenericInverseResult | null => {
    if (designMode !== 'targetDriven' || !selectedUnknownKey || selectedInverseMeta.length === 0) return null
    const toGeneric = <T extends { isValid: boolean; solvedValue?: number; solvedKey?: string; designResult?: DesignResult; warnings: string[]; error?: string }>(
      r: T
    ): GenericInverseResult => ({
      isValid: r.isValid,
      solvedValue: r.solvedValue,
      solvedKey: r.solvedKey,
      solvedFieldKey: selectedInverseMeta.find(m => m.key === r.solvedKey)?.fieldKey,
      designResult: r.designResult,
      warnings: r.warnings,
      error: r.error,
    })

    switch (designType) {
      case 'cantilever':
        return toGeneric(solveCantileverForTargetSpan({
          targetMvV: targetSpanMvV,
          unknown: selectedUnknownKey as 'loadN' | 'momentArmMm' | 'beamWidthMm' | 'thicknessMm' | 'gageFactor' | 'youngsModulusGPa',
          loadN: dp.load,
          momentArmMm: dp.momentArm,
          beamWidthMm: dp.width,
          thicknessMm: dp.thickness,
          youngsModulusGPa: dp.modulus,
          gageLengthMm: dp.gageLen,
          gageFactor: dp.gageFactor,
        }))
      case 'binoBeam':
        return toGeneric(solveBinoBeamForTargetSpan({
          targetMvV: targetSpanMvV,
          unknown: selectedUnknownKey as 'loadN' | 'minimumThicknessMm',
          loadN: dp.load,
          distanceBetweenHolesMm: dp.distHoles,
          radiusMm: dp.radius,
          beamWidthMm: dp.beamWidth,
          beamHeightMm: dp.beamHeight,
          minimumThicknessMm: dp.minThick,
          youngsModulusGPa: dp.modulus,
          gageLengthMm: dp.gageLen,
          gageFactor: dp.gageFactor,
        }))
      case 'reverseBeam':
        return toGeneric(solveReverseBeamForTargetSpan({
          targetMvV: targetSpanMvV,
          unknown: selectedUnknownKey as 'loadN' | 'thicknessMm',
          loadN: dp.load,
          beamWidthMm: dp.width,
          thicknessMm: dp.thickness,
          distanceBetweenGagesMm: dp.distGages,
          modulusGPa: dp.modulus,
          gageLengthMm: dp.gageLen,
          gageFactor: dp.gageFactor,
        }))
      case 'dualBeam':
        return toGeneric(solveDualBeamForTargetSpan({
          targetMvV: targetSpanMvV,
          unknown: selectedUnknownKey as 'loadN' | 'thicknessMm',
          loadN: dp.load,
          beamWidthMm: dp.width,
          thicknessMm: dp.thickness,
          distanceBetweenGagesMm: dp.distGages,
          distanceLoadToClMm: dp.distLoadCl,
          modulusGPa: dp.modulus,
          gageLengthMm: dp.gageLen,
          gageFactor: dp.gageFactor,
        }))
      case 'sBeam':
        return toGeneric(solveSBeamForTargetSpan({
          targetMvV: targetSpanMvV,
          unknown: selectedUnknownKey as 'loadN' | 'thicknessMm',
          loadN: dp.load,
          holeRadiusMm: dp.holeRadius,
          beamWidthMm: dp.width,
          thicknessMm: dp.thickness,
          distanceBetweenGagesMm: dp.distGages,
          modulusGPa: dp.modulus,
          gageLengthMm: dp.gageLen,
          gageFactor: dp.gageFactor,
        }))
      case 'squareColumn':
        return toGeneric(solveSquareColumnForTargetSpan({
          targetMvV: targetSpanMvV,
          unknown: selectedUnknownKey as 'loadN' | 'widthMm',
          loadN: dp.load,
          widthMm: dp.width,
          depthMm: dp.depth,
          modulusGPa: dp.modulus,
          poissonRatio: dp.poisson,
          gageFactor: dp.gageFactor,
        }))
      case 'roundSolidColumn':
        return toGeneric(solveRoundSolidColumnForTargetSpan({
          targetMvV: targetSpanMvV,
          unknown: selectedUnknownKey as 'loadN' | 'diameterMm',
          loadN: dp.load,
          diameterMm: dp.diameter,
          modulusGPa: dp.modulus,
          poissonRatio: dp.poisson,
          gageFactor: dp.gageFactor,
        }))
      case 'roundHollowColumn':
        return toGeneric(solveRoundHollowColumnForTargetSpan({
          targetMvV: targetSpanMvV,
          unknown: selectedUnknownKey as 'loadN' | 'outerDiameterMm',
          loadN: dp.load,
          outerDiameterMm: dp.outerDiameter,
          innerDiameterMm: dp.innerDiameter,
          modulusGPa: dp.modulus,
          poissonRatio: dp.poisson,
          gageFactor: dp.gageFactor,
        }))
      case 'squareShear':
        return toGeneric(solveSquareShearForTargetSpan({
          targetMvV: targetSpanMvV,
          unknown: selectedUnknownKey as 'loadN' | 'thicknessMm',
          loadN: dp.load,
          widthMm: dp.width,
          heightMm: dp.height,
          diameterMm: dp.diameter,
          thicknessMm: dp.thickness,
          modulusGPa: dp.modulus,
          poisson: dp.poisson,
          gageFactor: dp.gageFactor,
        }))
      case 'roundShear':
        return toGeneric(solveRoundShearForTargetSpan({
          targetMvV: targetSpanMvV,
          unknown: selectedUnknownKey as 'loadN' | 'thicknessMm',
          loadN: dp.load,
          widthMm: dp.width,
          heightMm: dp.height,
          diameterMm: dp.diameter,
          thicknessMm: dp.thickness,
          modulusGPa: dp.modulus,
          poisson: dp.poisson,
          gageFactor: dp.gageFactor,
        }))
      case 'roundSBeamShear':
        return toGeneric(solveRoundSBeamShearForTargetSpan({
          targetMvV: targetSpanMvV,
          unknown: selectedUnknownKey as 'loadN' | 'thicknessMm',
          loadN: dp.load,
          widthMm: dp.width,
          heightMm: dp.height,
          diameterMm: dp.diameter,
          thicknessMm: dp.thickness,
          modulusGPa: dp.modulus,
          poisson: dp.poisson,
          gageFactor: dp.gageFactor,
        }))
      case 'squareTorque':
        return toGeneric(solveSquareTorqueForTargetSpan({
          targetMvV: targetSpanMvV,
          unknown: selectedUnknownKey as 'appliedTorqueNmm' | 'widthMm',
          appliedTorqueNmm: dp.appliedTorque,
          widthMm: dp.width,
          poisson: dp.poisson,
          modulusGPa: dp.modulus,
          gageLengthMm: dp.gageLen,
          gageFactor: dp.gageFactor,
        }))
      case 'roundSolidTorque':
        return toGeneric(solveRoundSolidTorqueForTargetSpan({
          targetMvV: targetSpanMvV,
          unknown: selectedUnknownKey as 'appliedTorqueNm' | 'diameterMm',
          appliedTorqueNm: dp.appliedTorque,
          diameterMm: dp.diameter,
          modulusGPa: dp.modulus,
          poissonRatio: dp.poisson,
          gageFactor: dp.gageFactor,
        }))
      case 'roundHollowTorque':
        return toGeneric(solveRoundHollowTorqueForTargetSpan({
          targetMvV: targetSpanMvV,
          unknown: selectedUnknownKey as 'appliedTorqueNm' | 'outerDiameterMm',
          appliedTorqueNm: dp.appliedTorque,
          outerDiameterMm: dp.outerDiameter,
          innerDiameterMm: dp.innerDiameter,
          modulusGPa: dp.modulus,
          poissonRatio: dp.poisson,
          gageFactor: dp.gageFactor,
        }))
      case 'pressure':
        return toGeneric(solvePressureForTargetSpan({
          targetMvV: targetSpanMvV,
          unknown: selectedUnknownKey as 'appliedPressureMPa' | 'thicknessMm',
          appliedPressureMPa: dp.pressure,
          thicknessMm: dp.thickness,
          diameterMm: dp.diameter,
          poisson: dp.poisson,
          modulusGPa: dp.modulus,
          gageFactor: dp.gageFactor,
        }))
      default:
        return null
    }
  }, [designMode, designType, selectedUnknownKey, selectedInverseMeta, targetSpanMvV, dp])

  const designResult = useMemo((): DesignResult | null => {
    if (designMode === 'targetDriven' && selectedInverseMeta.length > 0) {
      if (!inverseResult) return null
      if (inverseResult.isValid) return inverseResult.designResult ?? null
      return {
        type: designType,
        fullSpanSensitivity: 0,
        avgStrain: 0,
        isValid: false,
        error: inverseResult.error ?? 'Unable to solve target-driven design.',
      }
    }
    const fields = DESIGN_FIELDS[designType]
    if (!fields) return null
    const allValid = fields.every(f => {
      if (f.key === 'bridgeConfig') return true
      return Number.isFinite(dp[f.key])
    })
    if (!allValid) return null
    try {
      return runDesign(buildDesignInput(designType, dp))
    } catch {
      return null
    }
  }, [designType, designMode, dp, inverseResult, selectedInverseMeta])

  const compResult = useMemo((): CompensationResult | null => {
    const fields = COMP_FIELDS[compMethod]
    if (!fields) return null
    const allValid = fields.every(f => {
      // Allow string for bridgeConfig if it accidentally leaks here, 
      // though COMP_FIELDS shouldn't have it.
      return typeof cp[f.key] === 'string' || Number.isFinite(cp[f.key])
    })
    if (!allValid) return null
    try {
      return runCompensation(buildCompInput(compMethod, cp, wireIdx))
    } catch {
      return null
    }
  }, [compMethod, cp, wireIdx])

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const trimResult = useMemo((): ReturnType<typeof realizeTrim> | null => {
    if (!Number.isFinite(trimStart) || !Number.isFinite(trimTarget)) return null
    try {
      const params: TrimParams = { family: trimFamily, unit: trimUnit as never, startResistance: trimStart, targetResistance: trimTarget }
      return realizeTrim(params)
    } catch {
      return null
    }
  }, [trimFamily, trimUnit, trimStart, trimTarget])

  // ── Field setter helpers ──────────────────────────────────────
  const setDesignField = (key: string, displayVal: number, unit: UnitKind) => {
    setDp(prev => ({ ...prev, [key]: toSI(displayVal, unit, us) }))
  }
  const setCompField = (key: string, val: number) => {
    setCp(prev => ({ ...prev, [key]: val }))
  }

  // ── Auto-fill measuredSpan on entering step 2 ─────────────────
  const handleGoToStep2 = () => {
    if (designResult?.isValid && Number.isFinite(designResult.fullSpanSensitivity)) {
      if (compMethod === 'spanSet') {
        setCp(prev => ({
          ...prev,
          measuredSpan: designResult.fullSpanSensitivity,
          desiredSpan: selectedInverseMeta.length > 0 && designMode === 'targetDriven'
            ? targetSpanMvV
            : prev.desiredSpan,
        }))
      }
    }
    setStep(2)
  }

  // ── Auto-fill targetResistance on entering step 3 ────────────
  const handleGoToStep3 = () => {
    if (compResult?.isValid && Number.isFinite(compResult.primaryResistance)) {
      setTrimTarget(Math.abs(compResult.primaryResistance))
    }
    setStep(3)
  }

  // ── Field renderer ────────────────────────────────────────────
  const renderField = (
    f: FieldDef,
    value: number,
    onChange: (key: string, val: number, unit: UnitKind) => void,
  ) => {
    const displayVal = toDisplay(value, f.unit, us)
    const suffix = unitLabel(f.unit, us)
    return (
      <label key={f.key}>
        {f.label}{suffix ? ` (${suffix})` : ''}
        <input
          type="number"
          value={Number.isFinite(displayVal) ? displayVal : ''}
          step={f.step ?? 0.01}
          min={f.min}
          onChange={e => onChange(f.key, Number(e.target.value), f.unit)}
        />
      </label>
    )
  }

  // ── Derived State for Model ───────────────────────────────────

  const dpWithSolved = useMemo(() => {
    if (designMode !== 'targetDriven' || !inverseResult?.isValid) return dp;
    const solvedFieldKey = inverseResult.solvedFieldKey;
    if (!solvedFieldKey) return dp;
    return {
      ...dp,
      [solvedFieldKey]: inverseResult.solvedValue,
      isTargetDriven: 1,
      targetOutput: targetSpanMvV
    } as Record<string, number>;
  }, [dp, designMode, inverseResult, targetSpanMvV]);

  // ── Render ────────────────────────────────────────────────────

  return (
    <div className="wizard-wrap">
      {/* Step indicator */}
      <div className="wizard-steps">
        {([1, 2, 3] as Step[]).map(s => (
          <button
            key={s}
            className={`wizard-step${step === s ? ' active' : step > s ? ' done' : ''}`}
            onClick={() => {
              if (s === 1) setStep(1)
              if (s === 2 && step >= 2) setStep(2)
              if (s === 3 && step >= 3) setStep(3)
            }}
            disabled={s > step}
          >
            {s === 1 ? '① Frame 1: Design' : s === 2 ? '② Frame 2: Compensation' : '③ Frame 3: Trim'}
          </button>
        ))}
      </div>

      {/* ── Step 1: Design ────────────────────────────────────── */}
      {step === 1 && (
        <div className="wizard-section">
          <div className="wizard-section-header">
            <h3>Step 1 — Transducer Design</h3>
            <div className="analysis-toggle">
              <button className={!us ? 'active' : ''} onClick={() => onUnitChange('SI')}>SI</button>
              <button className={us  ? 'active' : ''} onClick={() => onUnitChange('US')}>US</button>
            </div>
          </div>

          {/* Type picker grouped by category */}
          <div className="wizard-type-selection">
            {TRANSDUCER_CATEGORIES.map(category => {
              const typesInCat = TRANSDUCER_DEFINITIONS.filter(d => d.category === category);
              if (typesInCat.length === 0) return null;
              
              return (
                <div key={category} className="category-group">
                  <h4 className="category-header">{category}</h4>
                  <div className="wizard-type-grid">
                    {typesInCat.map(t => (
                      <button
                        key={t.type}
                        className={`tool-card${designType === t.type ? ' active' : ''}`}
                        onClick={() => setDesignType(t.type)}
                      >
                        {t.label}
                      </button>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>

          <div className="design-frame-grid">
            <div className="design-frame-main">
              {/* Target Driven Configuration */}
              {selectedInverseMeta.length > 0 && (
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 mb-2">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block">Design Mode</label>
                      <select
                        className="w-full bg-white border border-slate-300 text-slate-700 text-xs rounded-lg px-3 py-2 focus:ring-1 focus:ring-blue-500 outline-none"
                        value={designMode}
                        onChange={e => setDesignMode(e.target.value as DesignMode)}
                      >
                        <option value="forward">Forward (known geometry/load)</option>
                        <option value="targetDriven">Target-driven (solve one unknown)</option>
                      </select>
                    </div>

                    {designMode === 'targetDriven' && (
                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1">
                          <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block">Target (mV/V)</label>
                          <input
                            type="number"
                            className="w-full bg-white border border-slate-300 text-blue-700 font-mono font-bold text-xs rounded-lg px-3 py-2 focus:ring-1 focus:ring-blue-500 outline-none"
                            value={Number.isFinite(targetSpanMvV) ? targetSpanMvV : ''}
                            step={0.01}
                            min={0}
                            onChange={e => setTargetSpanMvV(Number(e.target.value))}
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block">Solve For</label>
                          <select
                            className="w-full bg-white border border-slate-300 text-slate-700 text-xs rounded-lg px-3 py-2 focus:ring-1 focus:ring-blue-500 outline-none"
                            value={selectedUnknownKey ?? ''}
                            onChange={e =>
                              setInverseUnknownByType(prev => ({ ...prev, [designType]: e.target.value }))
                            }
                          >
                            {selectedInverseMeta.map(m => (
                              <option key={m.key} value={m.key}>{m.label}</option>
                            ))}
                          </select>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Input Form Grid */}
              <div className="bg-white p-5 rounded-2xl border border-slate-200">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-3">
                  {(DESIGN_FIELDS[designType] ?? []).map(f => {
                    const solvedFieldKey = inverseResult?.solvedFieldKey
                    const isSolvedField =
                      selectedInverseMeta.length > 0 &&
                      designMode === 'targetDriven' &&
                      solvedFieldKey === f.key

                    const sourceValue = isSolvedField && Number.isFinite(inverseResult?.solvedValue)
                      ? inverseResult?.solvedValue ?? (dp[f.key] ?? f.si)
                      : (dp[f.key] ?? f.si)
                    const displayVal = toDisplay(sourceValue, f.unit, us)
                    const suffix = unitLabel(f.unit, us, f.key)

                    if (f.key === 'bridgeConfig') {
                      return (
                        <div key={f.key} className="flex flex-col space-y-1">
                          <label className="text-[11px] font-bold text-slate-700 uppercase tracking-tight">{f.label}</label>
                          <select
                            className="bg-white border border-slate-300 text-slate-700 text-xs rounded-lg px-3 py-2 focus:ring-1 focus:ring-blue-500 outline-none transition-all"
                            value={dp[f.key] ?? 'quarter'}
                            onChange={e => setDp(prev => ({ ...prev, [f.key]: e.target.value } as unknown as Record<string, number>))}
                          >
                            {Object.entries(BRIDGE_CONFIG_LABELS).map(([k, label]) => (
                              <option key={k} value={k}>{label}</option>
                            ))}
                          </select>
                        </div>
                      )
                    }

                    return (
                      <div key={f.key} className="flex items-center justify-between py-1.5 border-b border-slate-100 last:border-0">
                        <label className="text-[11px] font-bold text-slate-700 uppercase tracking-tight flex-1">
                          {f.label}
                          {suffix && <span className="ml-1 text-[9px] text-slate-400 lowercase font-normal">({suffix})</span>}
                          {isSolvedField && <span className="ml-2 text-[9px] text-emerald-600 font-black tracking-widest">SOLVED</span>}
                        </label>
                        <input
                          type="number"
                          className={`w-28 px-3 py-1.5 text-right text-xs font-mono font-bold rounded-lg transition-all outline-none border shadow-inner ${
                            isSolvedField 
                              ? 'bg-emerald-50 border-emerald-200 text-emerald-700 cursor-not-allowed' 
                              : 'bg-slate-50 border-slate-200 text-slate-900 focus:bg-white focus:ring-1 focus:ring-blue-500'
                          }`}
                          value={Number.isFinite(displayVal) ? displayVal : ''}
                          step={f.step ?? 0.01}
                          min={f.min}
                          disabled={isSolvedField}
                          onChange={e => setDesignField(f.key, Number(e.target.value), f.unit)}
                        />
                      </div>
                    )
                  })}
                </div>
              </div>

              {/* Design Analysis Results */}
              {designResult && (
                <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm mt-4">
                  <div className="flex items-center justify-between mb-4 border-b border-slate-100 pb-2">
                    <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Design Analysis Results</h3>
                    <div className="flex gap-2">
                       <span className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-tighter ${designResult.isValid ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' : 'bg-red-50 text-red-600 border border-red-100'}`}>
                         {designResult.isValid ? 'Valid Design' : 'Limit Violation'}
                       </span>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-4 gap-x-12">
                    {[
                      { label: 'Calculated Shear Strain', value: show(designResult.avgStrain, 1), unit: 'µε', color: 'text-blue-600', visible: true },
                      { label: 'Normal Strain (45°)', value: show(designResult.minStrain ?? 0, 1), unit: 'µε', color: 'text-slate-700', visible: designType === 'roundHollowTorque' },
                      { label: 'Min / Max Strain', value: `${show(designResult.minStrain ?? 0, 1)} / ${show(designResult.maxStrain ?? 0, 1)}`, unit: 'µε', color: 'text-slate-700', visible: designResult.minStrain !== undefined && designType !== 'roundHollowTorque' },
                      { label: 'Strain Variation', value: show(designResult.gradient ?? 0, 2), unit: '%', color: 'text-amber-600', visible: designResult.gradient !== undefined },
                      { label: 'Span at Applied Torque', value: show(designResult.fullSpanSensitivity, 4), unit: 'mV/V', color: 'text-emerald-600', visible: true },
                      { label: 'Natural Frequency', value: show(designResult.naturalFrequency || 0, 0), unit: 'Hz', color: 'text-purple-600', visible: designResult.naturalFrequency !== undefined },
                    ].filter(r => r.visible).map((res, i) => (
                      <div key={i} className="flex justify-between items-center group">
                        <span className="text-[11px] font-bold text-slate-600 uppercase tracking-tight">{res.label}</span>
                        <div className="flex items-baseline gap-2">
                          <span className={`text-sm font-black font-mono tracking-tight ${res.color}`}>{res.value}</span>
                          <span className="text-[9px] font-bold text-slate-400 italic uppercase w-8">{res.unit}</span>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Solved Parameter Highlight */}
                  {selectedInverseMeta.length > 0 && designMode === 'targetDriven' && inverseResult?.isValid && (
                    <div className="mt-6 pt-4 border-t border-slate-100 flex flex-col gap-2">
                       <div className="flex justify-between items-center bg-emerald-50 p-3 rounded-lg border border-emerald-100">
                          <span className="text-[10px] font-black text-emerald-600 uppercase tracking-widest">Solved Parameter</span>
                          <span className="text-xs font-mono font-black text-emerald-700 bg-emerald-100 px-3 py-1 rounded">
                            {(() => {
                                const meta = selectedInverseMeta.find(m => m.key === inverseResult.solvedKey)
                                const field = DESIGN_FIELDS[designType]?.find(f => f.key === meta?.fieldKey)
                                const displayValue = field ? toDisplay(inverseResult.solvedValue ?? NaN, field.unit, us) : (inverseResult.solvedValue ?? NaN)
                                const suffix = field ? unitLabel(field.unit, us, field.key) : ''
                                return `${meta?.label ?? 'Unknown'}: ${show(displayValue, 4)}${suffix ? ` ${suffix}` : ''}`
                            })()}
                          </span>
                       </div>
                    </div>
                  )}
                </div>
              )}

          {selectedInverseMeta.length > 0 && designMode === 'targetDriven' && inverseResult?.warnings.length ? (
            <p className="workspace-note">{inverseResult.warnings.join(' ')}</p>
          ) : null}
            </div>

            <aside className="design-frame-preview bg-slate-50 border-none p-0 flex flex-col gap-4">
              {designType === 'binoBeam' ? (
                <div className="calc-preview-pair">
                  <div className="calc-diagram-2d">
                    <BinocularSketch2D params={dpWithSolved} us={us} />
                  </div>
                  <div className="calc-model-3d">
                    <BinocularModelPreview params={dpWithSolved} us={us} />
                  </div>
                </div>
              ) : designType === 'reverseBeam' ? (
                <div className="calc-preview-pair">
                  <div className="calc-diagram-2d">
                    <ReverseBeamDiagram
                      load={toDisplay(dpWithSolved.load, 'force', us)}
                      width={toDisplay(dpWithSolved.width, 'length', us)}
                      thickness={toDisplay(dpWithSolved.thickness, 'length', us)}
                      beamLength={toDisplay(dpWithSolved.beamLength ?? 150, 'length', us)}
                      distBetweenGages={toDisplay(dpWithSolved.distGages, 'length', us)}
                      gageLength={toDisplay(dpWithSolved.gageLen, 'length', us)}
                      unitSystem={unitSystem}
                    />
                    <ReverseBeamBridgeDiagram />
                  </div>
                  <div className="calc-model-3d">
                    <ReverseBeamModelPreview
                      load={toDisplay(dpWithSolved.load, 'force', us)}
                      width={toDisplay(dpWithSolved.width, 'length', us)}
                      thickness={toDisplay(dpWithSolved.thickness, 'length', us)}
                      beamLength={toDisplay(dpWithSolved.beamLength ?? 150, 'length', us)}
                      distBetweenGages={toDisplay(dpWithSolved.distGages, 'length', us)}
                      gageLength={toDisplay(dpWithSolved.gageLen, 'length', us)}
                      unitSystem={unitSystem}
                    />
                  </div>
                </div>
              ) : designType === 'roundHollowTorque' ? (
                <div className="calc-preview-pair">
                  <div className="calc-diagram-2d">
                    <TorqueHollowSketch2D
                      outerDiameter={toDisplay(dpWithSolved.outerDiameter, 'length', us)}
                      innerDiameter={toDisplay(dpWithSolved.innerDiameter, 'length', us)}
                      appliedTorque={toDisplay(dpWithSolved.appliedTorque, 'none', us)}
                      us={us}
                    />
                  </div>
                  <div className="calc-model-3d">
                    <TorqueHollow3D
                      outerDiameter={toDisplay(dpWithSolved.outerDiameter, 'length', us)}
                      innerDiameter={toDisplay(dpWithSolved.innerDiameter, 'length', us)}
                      appliedTorque={toDisplay(dpWithSolved.appliedTorque, 'none', us)}
                      us={us}
                    />
                  </div>
                </div>
              ) : designType === 'cantilever' ? (
                <div className="calc-preview-pair">
                  <div className="calc-diagram-2d">
                    <CantileverDiagram
                      load={toDisplay(dpWithSolved.load, 'force', us)}
                      width={toDisplay(dpWithSolved.width, 'length', us)}
                      thickness={toDisplay(dpWithSolved.thickness, 'length', us)}
                      momentArm={toDisplay(dpWithSolved.momentArm, 'length', us)}
                      gageLength={toDisplay(dpWithSolved.gageLen, 'length', us)}
                      unitSystem={unitSystem}
                    />
                  </div>
                  <div className="calc-model-3d">
                    <CantileverModelPreview params={dpWithSolved} us={us} />
                  </div>
                </div>
              ) : (
                <div className="bg-white rounded-2xl border border-slate-200 p-1 overflow-hidden shadow-sm">
                  <div className="p-3 border-b border-slate-100 flex justify-between items-center">
                    <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-widest m-0">Interactive Model</h4>
                  </div>
                  <div className="h-[380px] w-full relative">
                    <div className="flex items-center justify-center h-full text-slate-400 text-xs uppercase tracking-tighter">Model preview coming soon</div>
                  </div>
                </div>
              )}
            </aside>
          </div>

          <div className="wizard-nav">
            <button
              className="wizard-next"
              disabled={!designResult?.isValid}
              onClick={handleGoToStep2}
            >
              Next: Compensation →
            </button>
          </div>
        </div>
      )}

      {/* ── Step 2: Compensation ──────────────────────────────── */}
      {step === 2 && (
        <div className="wizard-section">
          <div className="wizard-section-header">
            <h3>Step 2 — Compensation</h3>
            {designResult?.isValid && (
              <span className="wizard-carry">
                Design span: {show(designResult.fullSpanSensitivity, 4)} mV/V
              </span>
            )}
          </div>

          {/* Method picker */}
          <div className="wizard-type-grid border-b border-slate-200 pb-6 mb-6">
            {COMP_METHODS.map(m => (
              <button
                key={m.key}
                className={`tool-card transition-all duration-200 ${compMethod === m.key ? 'active bg-blue-600 border-blue-400 text-white shadow-md' : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300'}`}
                onClick={() => {
                  setCompMethod(m.key)
                  // Re-apply span auto-fill if switching to spanSet
                  if (m.key === 'spanSet' && designResult?.isValid) {
                    setCp({
                      ...initParams(COMP_FIELDS.spanSet),
                      measuredSpan: designResult.fullSpanSensitivity,
                      desiredSpan: selectedInverseMeta.length > 0 && designMode === 'targetDriven'
                        ? targetSpanMvV
                        : COMP_FIELDS.spanSet.find(f => f.key === 'desiredSpan')?.si ?? 2,
                    })
                  }
                }}
              >
                {m.label}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="space-y-6">
              {/* Wire type picker (for methods that need it) */}
              {(compMethod === 'zeroBalance' || compMethod === 'spanTemp2Pt') && (
                <div className="bg-white p-4 rounded-xl border border-slate-200">
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block text-left">Wire Architecture</label>
                    <select 
                       className="w-full bg-slate-50 border border-slate-300 text-slate-700 text-xs rounded-lg px-3 py-2 focus:ring-1 focus:ring-blue-500 outline-none"
                       value={wireIdx} 
                       onChange={e => setWireIdx(Number(e.target.value))}
                    >
                      {(compMethod === 'zeroBalance' ? commonWireTypes : spanWireTypes).map((w, i) => (
                        <option key={i} value={i}>{w.name}</option>
                      ))}
                    </select>
                  </div>
                </div>
              )}

              {/* Input form */}
              <div className="bg-white p-5 rounded-2xl border border-slate-200">
                <div className="grid grid-cols-1 gap-y-3">
                  {(COMP_FIELDS[compMethod] ?? []).map(f => {
                    const displayVal = toDisplay(cp[f.key] ?? f.si, f.unit, us)
                    const suffix = unitLabel(f.unit, us)
                    return (
                      <div key={f.key} className="flex items-center justify-between py-1.5 border-b border-slate-100 last:border-0">
                        <label className="text-[11px] font-bold text-slate-700 uppercase tracking-tight flex-1 text-left">
                          {f.label}
                          {suffix && <span className="ml-1 text-[9px] text-slate-400 lowercase font-normal">({suffix})</span>}
                        </label>
                        <input
                          type="number"
                          className="w-32 px-3 py-1.5 text-right text-xs font-mono font-bold rounded-lg bg-slate-50 border border-slate-300 text-blue-700 focus:bg-white focus:ring-1 focus:ring-blue-500 transition-all outline-none"
                          value={Number.isFinite(displayVal) ? displayVal : ''}
                          step={f.step ?? 0.01}
                          min={f.min}
                          onChange={e => setCompField(f.key, toSI(Number(e.target.value), f.unit, us))}
                        />
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>

            {/* Results */}
            <div className="space-y-4">
              {compResult && (
                <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm h-full">
                  <div className="flex items-center justify-between mb-4 border-b border-slate-100 pb-2">
                    <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Compensation Output</h3>
                    <span className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-tighter ${compResult.isValid ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' : 'bg-red-50 text-red-600 border border-red-100'}`}>
                      {compResult.isValid ? 'Computed' : 'Invalid'}
                    </span>
                  </div>

                  {compResult.isValid ? (
                    <div className="space-y-4">
                      <div className="p-4 bg-slate-50 rounded-xl border border-emerald-100 text-center">
                        <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-1">Target Resistor Value</span>
                        <div className="flex items-baseline justify-center gap-2">
                          <span className="text-2xl font-black text-emerald-600 font-mono tracking-tighter">{show(compResult.primaryResistance, 3)}</span>
                          <span className="text-xs font-bold text-slate-400 uppercase italic">Ω</span>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 gap-3">
                        {compResult.secondaryResistance !== undefined && (
                          <div className="flex justify-between items-center py-2 border-b border-slate-100">
                            <span className="text-[11px] font-bold text-slate-600 uppercase tracking-tight">Secondary Resistance</span>
                            <div className="flex items-baseline gap-2">
                              <span className="text-sm font-black text-slate-700 font-mono">{show(compResult.secondaryResistance, 3)}</span>
                              <span className="text-[9px] font-bold text-slate-500 uppercase italic">Ω</span>
                            </div>
                          </div>
                        )}
                        {compResult.bridgeArm !== undefined && (
                          <div className="flex justify-between items-center py-2 border-b border-slate-100">
                            <span className="text-[11px] font-bold text-slate-600 uppercase tracking-tight">Installation Point</span>
                            <span className="text-sm font-black text-blue-600 font-mono italic">{compResult.bridgeArm}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center py-8 gap-3">
                       <div className="w-10 h-10 rounded-full bg-red-50 flex items-center justify-center border border-red-200">
                          <span className="text-red-600 font-black">!</span>
                       </div>
                       <p className="text-xs text-red-600 font-bold max-w-[200px] text-center">{compResult.error ?? 'Missing calculation parameters'}</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          <div className="wizard-nav">
            <button className="wizard-back" onClick={() => setStep(1)}>← Back</button>
            <button
              className="wizard-next"
              disabled={!compResult?.isValid}
              onClick={handleGoToStep3}
            >
              Next: Trim Realization →
            </button>
          </div>
        </div>
      )}

      {/* ── Step 3: Trim Realization ──────────────────────────── */}
      {step === 3 && (
        <div className="wizard-section space-y-6">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-lg font-black text-slate-800 uppercase tracking-tight">Step 3 — Trim Realization</h3>
            {compResult?.isValid && (
              <span className="px-3 py-1 bg-blue-50 text-blue-700 text-[10px] font-bold rounded-full border border-blue-100 uppercase tracking-wider">
                Target: {show(compResult.primaryResistance, 3)} Ω
              </span>
            )}
          </div>

          {/* Family picker */}
          <div className="wizard-type-grid border-b border-slate-200 pb-6 mb-6">
            {TRIM_FAMILIES.map(f => (
              <button
                key={f.key}
                className={`tool-card transition-all duration-200 ${trimFamily === f.key ? 'active bg-blue-600 border-blue-400 text-white shadow-md' : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300'}`}
                onClick={() => setTrimFamily(f.key)}
              >
                {f.label}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="space-y-6">
              {/* Unit picker */}
              <div className="bg-white p-4 rounded-xl border border-slate-200">
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block text-left text-slate-500 uppercase tracking-widest block text-left">Network Unit</label>
                  <select
                    className="w-full bg-slate-50 border border-slate-300 text-slate-700 text-xs rounded-lg px-3 py-2 focus:ring-1 focus:ring-blue-500 outline-none"
                    value={trimUnit}
                    onChange={e => setTrimUnit(e.target.value)}
                  >
                    {(() => {
                      const meta = TRIM_FAMILIES.find(f => f.key === trimFamily)
                      if (!meta) return null
                      return LADDER_UNIT_KEYS[meta.unitListKey].map(u => (
                        <option key={u} value={u}>{u}</option>
                      ))
                    })()}
                  </select>
                </div>
              </div>

              {/* Inputs */}
              <div className="bg-white p-5 rounded-2xl border border-slate-200">
                <div className="grid grid-cols-1 gap-y-3">
                  <div className="flex items-center justify-between py-1.5 border-b border-slate-100 last:border-0">
                    <label className="text-[11px] font-bold text-slate-700 uppercase tracking-tight flex-1 text-left">
                      Start Resistance <span className="ml-1 text-[9px] text-slate-400 lowercase font-normal">(Ω)</span>
                    </label>
                    <input
                      type="number"
                      className="w-32 px-3 py-1.5 text-right text-xs font-mono font-bold rounded-lg bg-slate-50 border border-slate-300 text-blue-700 focus:bg-white focus:ring-1 focus:ring-blue-500 transition-all outline-none"
                      value={Number.isFinite(trimStart) ? trimStart : ''}
                      min={0}
                      step={1}
                      onChange={e => setTrimStart(Number(e.target.value))}
                    />
                  </div>
                  <div className="flex items-center justify-between py-1.5 border-b border-slate-100 last:border-0">
                    <label className="text-[11px] font-bold text-slate-700 uppercase tracking-tight flex-1 text-left">
                      Target Resistance <span className="ml-1 text-[9px] text-slate-400 lowercase font-normal">(Ω)</span>
                    </label>
                    <input
                      type="number"
                      className="w-32 px-3 py-1.5 text-right text-xs font-mono font-bold rounded-lg bg-slate-50 border border-slate-300 text-blue-700 focus:bg-white focus:ring-1 focus:ring-blue-500 transition-all outline-none"
                      value={Number.isFinite(trimTarget) ? trimTarget : ''}
                      min={0}
                      step={0.1}
                      onChange={e => setTrimTarget(Number(e.target.value))}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Results */}
            <div className="space-y-4">
              {trimResult && (
                <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm h-full">
                  <div className="flex items-center justify-between mb-4 border-b border-slate-100 pb-2">
                    <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Trim Outcome</h3>
                    <span className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-tighter ${trimResult.achievedResistance !== undefined ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' : 'bg-red-50 text-red-600 border border-red-100'}`}>
                      {trimResult.achievedResistance !== undefined ? 'Solved' : 'Failed'}
                    </span>
                  </div>

                  {trimResult.achievedResistance !== undefined ? (
                    <div className="space-y-4">
                      <div className="p-4 bg-slate-50 rounded-xl border border-emerald-100 text-center">
                        <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-1">Achieved Resistance</span>
                        <div className="flex items-baseline justify-center gap-2">
                          <span className="text-2xl font-black text-emerald-600 font-mono tracking-tighter">{show(trimResult.achievedResistance, 4)}</span>
                          <span className="text-xs font-bold text-slate-400 uppercase italic">Ω</span>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 gap-3">
                        <div className="flex justify-between items-center py-2 border-b border-slate-100">
                          <span className="text-[11px] font-bold text-slate-600 uppercase tracking-tight">Absolute Error</span>
                          <div className="flex items-baseline gap-2">
                            <span className="text-sm font-black text-slate-700 font-mono">{show(trimResult.absoluteError, 4)}</span>
                            <span className="text-[9px] font-bold text-slate-500 uppercase italic">Ω</span>
                          </div>
                        </div>
                        <div className="flex justify-between items-center py-2 border-b border-slate-100">
                          <span className="text-[11px] font-bold text-slate-600 uppercase tracking-tight">Relative Error</span>
                          <div className="flex items-baseline gap-2">
                            <span className="text-sm font-black text-blue-600 font-mono">
                              {show(trimTarget > 0 ? (trimResult.absoluteError / trimTarget) * 100 : 0, 3)}
                            </span>
                            <span className="text-[9px] font-bold text-slate-500 uppercase italic">%</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center py-8 gap-3 text-center">
                       <div className="w-10 h-10 rounded-full bg-red-50 flex items-center justify-center border border-red-200 text-red-600 font-black">!</div>
                       <p className="text-xs text-red-600 font-bold max-w-[200px]">Unable to solve trim for these inputs.</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          <div className="pt-4 border-t border-slate-100 flex justify-start">
            <button 
              className="px-6 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-black uppercase tracking-widest rounded-xl transition-all border border-slate-200 flex items-center gap-2"
              onClick={() => setStep(2)}
            >
              <span className="text-lg">←</span> Back to Compensation
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
