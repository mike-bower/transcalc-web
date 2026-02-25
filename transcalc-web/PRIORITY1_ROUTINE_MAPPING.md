# Priority 1 Delphi Routine Mapping

This file maps **Priority 1** Delphi units to concrete TypeScript targets at routine level.

## Conventions
- `Math routine`: method that performs computation (not UI event wiring).
- `Direct TS target`: where the computation should live.
- `Workflow TS target`: upstream/downstream module that provides or consumes the computed value.

## A) D01 trim network family

| Delphi unit | Math routine(s) | Direct TS target | Workflow TS target | Notes |
|---|---|---|---|---|
| `cutd01.pas` | `TD01Resistor.answer` (stub/no body) | `ladderResistors.ts` (`calculateD01Unit('cutd01', ...)`) | `spanSet.ts` | Delphi has no implemented math body; treat as legacy shell around D01 ladder model. |
| `d012pt.pas` | `TCutD012ptForm.Recalculate` | `ladderResistors.ts` (`calculateD01Unit('d012pt', ...)`) | `spanTemperature2Pt.ts` | 2-point D01 trim network. |
| `d013pt.pas` | `TCutD013PointFrm.ReCalculate` | `ladderResistors.ts` (`calculateD01Unit('d013pt', ...)`) | `spanTemperature3Pt.ts` | 3-point D01 trim network. |
| `d01spans.pas` | `TCutD01SpansFrm.ReCalculate` | `ladderResistors.ts` (`calculateD01Unit('d01spans', ...)`) | `spanTemperature3Pt.ts` | Span-specific 3-point D01 variant. |
| `setd01.pas` | `TSpanSetD01ResistorForm.Recalculate` | `ladderResistors.ts` (`calculateD01Unit('setd01', ...)`) | `spanSet.ts` | D01 branch launched by Span Set workflow. |
| `optshd01.pas` | `TOptShuntD01ResistorForm.ReCalculate` | `ladderResistors.ts` (`calculateD01Unit('optshd01', ...)`) | `shuntoptim.ts` | D01 physical trim realization for optimum shunt outputs. |

## B) C01/C13 trim network family

| Delphi unit | Math routine(s) | Direct TS target | Workflow TS target | Notes |
|---|---|---|---|---|
| `span2c01.pas` | `TSpan2PtC01Form.ReCalculate` | `ladderResistors.ts` (`calculateC01Unit('span2c01', ...)`) | `spanTemperature2Pt.ts` | Uses dual 40/80-ohm constant sets selected by start resistance. |
| `span3c01.pas` | `TSpan3PtC01Form.ReCalculate` | `ladderResistors.ts` (`calculateC01Unit('span3c01', ...)`) | `spanTemperature3Pt.ts` | 3-point C01 trim realization. |
| `spansc13.pas` | `TSpanSC13Form.ReCalculate` | `ladderResistors.ts` (`calculateC01Unit('spansc13', ...)`) | `spanTemperature3Pt.ts` | Span/Span 3-point C13 variant of same network form. |
| `optshc01.pas` | `TOptShuntCutC01Frm.ReCalculate` | `ladderResistors.ts` (`calculateC01Unit('optshc01', ...)`) | `shuntoptim.ts` | C01 physical trim for optimum shunt scenarios. |
| `sample.pas` | `TSpan2PtC01Form.ReCalculate` | `ladderResistors.ts` (`calculateC01Unit('sample', ...)`) | `spanTemperature2Pt.ts` | C01 sample network with slightly different fixed constants. |

## C) C11 trim network family

| Delphi unit | Math routine(s) | Direct TS target | Workflow TS target | Notes |
|---|---|---|---|---|
| `span2c11.pas` | `TSpan2ptC11Form.ReCalculate` | `ladderResistors.ts` (`calculateC11Unit('span2c11', ...)`) | `spanTemperature2Pt.ts` | 2-point C11 trim network. |
| `span3c11.pas` | `TSpan3ptC11Form.ReCalculate` | `ladderResistors.ts` (`calculateC11Unit('span3c11', ...)`) | `spanTemperature3Pt.ts` | 3-point C11 trim network. |
| `spansc11.pas` | `TSpanSC11Form.ReCalculate` | `ladderResistors.ts` (`calculateC11Unit('spansc11', ...)`) | `spanTemperature3Pt.ts` | Span/Span 3-point C11 variant. |
| `optshc11.pas` | `TOptShuntC11Form.ReCalculate` | `ladderResistors.ts` (`calculateC11Unit('optshc11', ...)`) | `shuntoptim.ts` | C11 trim for optimum shunt outputs. |

## D) C12 (10-ohm / 20-ohm) trim network family

| Delphi unit | Math routine(s) | Direct TS target | Workflow TS target | Notes |
|---|---|---|---|---|
| `spn21210.pas` | `TSpan2ptC1210Form.ReCalculate` | `ladderResistors.ts` (`calculateC12Unit('spn21210', ...)`) | `spanTemperature2Pt.ts` | 2-point C12-10ohm network. |
| `spn31210.pas` | `TSpan3ptC1210Form.ReCalculate` | `ladderResistors.ts` (`calculateC12Unit('spn31210', ...)`) | `spanTemperature3Pt.ts` | 3-point C12-10ohm network. |
| `spns1210.pas` | `TSpanS1210Form.ReCalculate` | `ladderResistors.ts` (`calculateC12Unit('spns1210', ...)`) | `spanTemperature3Pt.ts` | Span/Span-vs-temp C12-10ohm variant. |
| `opsh1210.pas` | `TOptShuntC1210Form.ReCalculate` | `ladderResistors.ts` (`calculateC12Unit('opsh1210', ...)`) | `shuntoptim.ts` | C12-10ohm trim for shunt optimization. |
| `spn21220.pas` | `TSpan2ptC1220Form.ReCalculate` | `ladderResistors.ts` (`calculateC12Unit('spn21220', ...)`) | `spanTemperature2Pt.ts` | 2-point C12-20ohm network. |
| `spn31220.pas` | `TSpan3ptC1220Form.ReCalculate` | `ladderResistors.ts` (`calculateC12Unit('spn31220', ...)`) | `spanTemperature3Pt.ts` | 3-point C12-20ohm network. |
| `spns1220.pas` | `TSpanS1220Form.ReCalculate` | `ladderResistors.ts` (`calculateC12Unit('spns1220', ...)`) | `spanTemperature3Pt.ts` | Span/Span C12-20ohm variant. |
| `opsh1220.pas` | `TOptShuntC1220Form.ReCalculate` | `ladderResistors.ts` (`calculateC12Unit('opsh1220', ...)`) | `shuntoptim.ts` | C12-20ohm trim for shunt optimization. |

## E) Zero-balance trim family

| Delphi unit | Math routine(s) | Direct TS target | Workflow TS target | Notes |
|---|---|---|---|---|
| `e01zero.pas` | `TE01ZeroBalanceForm.ReCalculate` | `ladderResistors.ts` (`calculateE01Unit('e01zero', ...)`) | `zeroBalance.ts` | Computes R12, R23, and absolute difference using twin side networks plus G-branch selection. |
| `cute01.pas` | `TE01AdjustmentFrm.ReCalculate` | `ladderResistors.ts` (`calculateE01Unit('cute01', ...)`) | `zeroBalance.ts` | Same core network family as `e01zero` with cut adjustment use case. |

## F) Span set and wire support

| Delphi unit | Math routine(s) | Direct TS target | Workflow TS target | Notes |
|---|---|---|---|---|
| `spanset.pas` | `TSpanSetForm.CalculateResistance` | `spanSet.ts` (`calculateSpanSetResistance`) | `spanTemperature2Pt.ts`, `spanTemperature3Pt.ts` | Produces required trim resistance from measured/desired span and bridge terms. |
| `spanwire.pas` | `TWireTableSpanForm.ReCalculate`, resistance-per-length conversion in `CB_WireTypeChange` | `spanwire.ts` (`calculateSpanWireLength`) | `wire.ts` | Computes required wire length from resistance and selected wire resistivity table. |

## G) Shear beam/span family

| Delphi unit | Math routine(s) | Direct TS target | Workflow TS target | Notes |
|---|---|---|---|---|
| `shearsb.pas` | `CalculateSpan`, `Avg_Strain` (delegates), `CalculateGradient`, `FullBridgeSensitivity` | `shearBeams.ts` (`calculateRoundSBeamSpan`) | `shear.ts`, `bridges.ts` | Core retained math is `CalculateSpan`; other methods are either derived or legacy/disabled. |
| `shearsqr.pas` | `CalculateSpan`, `Avg_Strain`, `CalculateGradient`, `FullBridgeSensitivity` | `shearBeams.ts` (`calculateSquareShearSpan`) | `shear.ts`, `bridges.ts` | Square-web variant of same span model. |
| `sherrnd1.pas` | `CalculateSpan`, `Avg_Strain`, `CalculateGradient`, `FullBridgeSensitivity` | `shearBeams.ts` (`calculateRoundShearSpan`) | `shear.ts`, `bridges.ts` | Round-web variant of same span model. |

## Explicit integration targets (next wiring layer)

These are the direct module-to-module connections needed so workflow is explicit:

1. `spanTemperature2Pt.ts` -> `ladderResistors.ts`
   - add helper that takes `compensationResistance` and chosen resistor family (`D01`, `C01`, `C11`, `C12-10`, `C12-20`) and returns best-trim rung pattern + realized resistance.

2. `spanTemperature3Pt.ts` -> `ladderResistors.ts`
   - same as above for 3-point flow.

3. `shuntoptim.ts` -> `ladderResistors.ts`
   - use `recommendedShunt`/`calculateOptimalShuntResistance` outputs as trim target for `optsh*` families.

4. `zeroBalance.ts` -> `ladderResistors.ts`
   - reconcile computed balance target with `calculateE01Unit` rung states and expose mismatch/error metric.

5. `spanSet.ts` + `spanwire.ts` -> (`ladderResistors.ts` or wire-table selection)
   - route `calculateSpanSetResistance` result into either resistor trim or wire-length trim path.

## Current gaps to address

1. `ladderResistors` and `shearBeams` tests currently fail because test assertions assume larger deltas than the model is producing and because sign handling/units in shear tests need Delphi-parity fixtures.
2. No explicit optimizer exists yet to solve rung-state selection (`cut` pattern search) for a target resistance; current APIs are forward-calculation only.
3. Workflow glue between `spanTemperature*`/`shuntoptim`/`zeroBalance` and ladder realization is documented but not yet implemented as orchestrator functions.
