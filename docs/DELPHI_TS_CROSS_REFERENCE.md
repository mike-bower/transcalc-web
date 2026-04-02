# Delphi to TypeScript Cross-Reference

This table maps Delphi source files (*.pas) in `delphi_source/Transcalc/` to their equivalents in the TypeScript project `transcalc-web/src/domain/`.

| Delphi File (.pas) | TypeScript Equivalent (.ts) | Status / Notes |
| :--- | :--- | :--- |
| `about.pas` | N/A | UI/Dialog (About dialog) |
| `ACLIST.PAS` | N/A | Utility/List |
| `ACSTREAM.PAS` | N/A | Stream Utility |
| `apattern.pas` | N/A | UI/Dialog (Patterns) |
| `bbcant.pas` | `beams.ts` | Beam calculations |
| `BINO.PAS` | `binobeam.ts` | Binocular beam calculations |
| `bpattern.pas` | N/A | UI/Dialog (Patterns) |
| `COMPENST.PAS` | `temperature.ts` | Compensation/Temperature logic |
| `config.pas` | N/A | App Configuration |
| `CONVERT.PAS` | `convert.ts` | Unit conversions |
| `cpattern.pas` | N/A | UI/Dialog (Patterns) |
| `cutD01.pas` | N/A | UI/Dialog (Cut D01) |
| `cute01.pas` | N/A | UI/Dialog (Cute 01) |
| `D012PT.PAS` | `spanTemperature2Pt.ts` | 2-Point Span/Temperature |
| `D013PT.PAS` | `spanTemperature3Pt.ts` | 3-Point Span/Temperature |
| `D01SPANS.PAS` | `simspan.ts` | Sim span calculations |
| `DESIGN.PAS` | `projectSchema.ts` | Domain models/Core |
| `diapragm.pas` | `pressure.ts` | Diaphragm/Pressure calculations |
| `dpattern.pas` | N/A | UI/Dialog (Patterns) |
| `DUALBB.PAS` | `dualbeam.ts` | Dual bending beam |
| `E01ZERO.PAS` | `zeroBalance.ts` | Zero balance calculations |
| `example.pas` | N/A | Example/Test |
| `ladders.pas` | `ladderResistors.ts` | Ladder resistors |
| `log.pas` | N/A | Logging |
| `logitem.pas` | N/A | Logging |
| `logstrm.pas` | N/A | Logging |
| `MAIN.PAS` | N/A | Main UI |
| `MAINMENU.PAS` | N/A | Main Menu UI |
| `MATH.PAS` | `math.ts` | Math helpers |
| `OPSH1210.PAS` | `shuntoptim.ts` | Shunt Optimization |
| `OPSH1220.PAS` | `shuntoptim.ts` | Shunt Optimization |
| `OPTSHC01.PAS` | `shuntoptim.ts` | Shunt Optimization |
| `OPTSHC11.PAS` | `shuntoptim.ts` | Shunt Optimization |
| `OPTSHD01.PAS` | `shuntoptim.ts` | Shunt Optimization |
| `optshunt.pas` | `shuntoptim.ts` | Shunt Optimization |
| `outlinex.pas` | N/A | UI Helper |
| `PRESSURE.PAS` | `pressure.ts` | Pressure/Diaphragm calculations |
| `register.pas` | N/A | Registration UI |
| `RESISTOR.PAS` | `core.ts` / `bridges.ts` | Resistor/Bridge logic |
| `REVBB.PAS` | `reversebeam.ts` | Reverse bending beam |
| `ringbb.pas` | `ringbb.ts` | Ring bending beam |
| `RNDHLWC.PAS` | `rndhlwc.ts` | Round hollow column |
| `RNDHLWTQ.PAS` | `rndhlwtq.ts` | Round hollow torque |
| `RNDSLDC.PAS` | `rndsldc.ts` | Round solid column |
| `RNDSLDTQ.PAS` | `rndsldtq.ts` | Round solid torque |
| `sample.pas` | N/A | Sample/Test |
| `SBBEAM.PAS` | `sbeam.ts` | S-Beam calculations |
| `SETD01.PAS` | N/A | Configuration/Settings |
| `shearrnd.pas` | `shear.ts` | Shear (round) |
| `SHEARSB.PAS` | `shearBeams.ts` | Shear Beams |
| `SHEARSQR.PAS` | `shear.ts` | Shear (square) |
| `SHERRND1.PAS` | `shear.ts` | Shear (round) |
| `simspan.pas` | `simspan.ts` | Sim span |
| `SPAN2C01.PAS` | `span2pt.ts` | 2-Point Span |
| `SPAN2C11.PAS` | `span2pt.ts` | 2-Point Span |
| `SPAN2PT.PAS` | `span2pt.ts` | 2-Point Span |
| `SPAN3C01.PAS` | `span3pt.ts` | 3-Point Span |
| `SPAN3C11.PAS` | `span3pt.ts` | 3-Point Span |
| `span3pt.pas` | `span3pt.ts` | 3-Point Span |
| `SPANSC11.PAS` | `spanTemperature2Pt.ts` | Span vs Temp |
| `SPANSC13.PAS` | `spanTemperature3Pt.ts` | Span vs Temp |
| `spanset.pas` | `spanSet.ts` | Span Set logic |
| `SpanWire.pas` | `spanwire.ts` | Span wire calculation |
| `splash.pas` | N/A | Splash Screen UI |
| `SPN21210.PAS` | `span2pt.ts` | 2-Point Span |
| `SPN21220.PAS` | `span2pt.ts` | 2-Point Span |
| `SPN31210.PAS` | `span3pt.ts` | 3-Point Span |
| `SPN31220.PAS` | `span3pt.ts` | 3-Point Span |
| `SPNS1210.PAS` | `simspan.ts` | Sim span |
| `SPNS1220.PAS` | `simspan.ts` | Sim span |
| `SQRCOL.PAS` | `sqrcol.ts` | Square column |
| `SQTORQUE.PAS` | `sqtorque.ts` | Square torque |
| `TCRatio.pas` | `TCRatio.ts` | TCR Ratio |
| `warning.pas` | N/A | Warning Dialog UI |
| `wire2pt.pas` | `wire2pt.ts` | 2-Point Wire |
| `wire3pt.pas` | `wire3pt.ts` | 3-Point Wire |
| `WireOpt.pas` | `wireOpt.ts` | Wire Optimization |
| `wiretbl.pas` | `wire.ts` | Wire table data |
| `ZBWIRE.PAS` | `zbwire.ts` | Zero balance wire |
| `zerobal.pas` | `zerobal.ts` | Zero balance |
| `ZVSTEMP.PAS` | `zeroVsTemp.ts` | Zero vs Temperature |

## Bridge Sub-directory
Located in `delphi_source/Transcalc/Bridge/`

| Delphi File (.pas) | TypeScript Equivalent (.ts) | Status / Notes |
| :--- | :--- | :--- |
| `Active11.pas` | `bridges.ts` | Bridge activation logic |
| `BRIDGE.PAS` | `bridges.ts` | Base bridge logic |
| `fullfour.pas` | `bridges.ts` | Full-four bridge logic |
| `fulltwo.pas` | `bridges.ts` | Full-two opposite arms |
| `linear.pas` | `bridges.ts` | Linear bridge |
| `nonline.pas` | `bridges.ts` | Non-linear bridge effects |
| `twoAdj.pas` | `bridges.ts` | Two adjacent arms |

## Wire Sub-directory
Located in `delphi_source/Transcalc/wire/`

| Delphi File (.pas) | TypeScript Equivalent (.ts) | Status / Notes |
| :--- | :--- | :--- |
| `wiretbl.pas` | `wire.ts` | Consolidated wire table |

## Summary
Most of the core business logic (Delphi files with calculation routines) has been mapped to functional equivalents in the `transcalc-web/src/domain/` directory. UI-related files (`About`, `Splash`, `Warning`, `Main`) generally do not have a 1:1 domain equivalent as they will be implemented as React/Web components.