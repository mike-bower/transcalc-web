# Delphi Port Backlog

Date: 2026-03-23

Source references:
- [`docs/delphi-port-audit-2026-03-23.md`](./delphi-port-audit-2026-03-23.md)
- [`delphi_source/Transcalc/XCALCPRO.DPR`](../delphi_source/Transcalc/XCALCPRO.DPR)
- [`delphi_source/Transcalc/Bridge/BridgeAp.dpr`](../delphi_source/Transcalc/Bridge/BridgeAp.dpr)

This backlog is ordered by execution priority, not by Delphi unit name. Priority is based on:
- user-visible parity risk
- current test risk
- how many Delphi units depend on the work
- whether the work unlocks later steps

## P0. Stabilize Current Dispatch Layer

Objective:
- Make the current TypeScript status trustworthy before adding more port surface.

Why first:
- Live tests are `893/895` passing.
- The remaining failures are in the orchestration layer, which is the glue for the whole port.

### P0.1 Fix `runDesign` orchestrator parity failures

Source units:
- `BINO.PAS`
- `SQTORQUE.PAS`

TS targets:
- [`transcalc-web/src/domain/orchestrator.ts`](c:\Users\Mike\OneDrive\MM Projects\transcalc\transcalc-web\src\domain\orchestrator.ts)
- [`transcalc-web/src/tests/orchestrator.test.ts`](c:\Users\Mike\OneDrive\MM Projects\transcalc\transcalc-web\src\tests\orchestrator.test.ts)

Tasks:
- Align the binocular-beam orchestrator fixture with the actual `binobeam` validation rules, or relax orchestration input normalization if Delphi accepted the old shape.
- Align the square-torque orchestrator fixture with the actual `sqtorque` unit expectations and unit conventions.
- Confirm the orchestrator preserves Delphi-valid inputs instead of inventing a second validation layer.

Acceptance criteria:
- `npm test -- --run` passes with no orchestrator failures.
- Orchestrator tests use physically valid fixtures that match domain constraints.

### P0.2 Remove stale test-status artifacts or regenerate them

TS targets:
- [`transcalc-web/test-output.json`](c:\Users\Mike\OneDrive\MM Projects\transcalc\transcalc-web\test-output.json)
- [`transcalc-web/test_output.txt`](c:\Users\Mike\OneDrive\MM Projects\transcalc\transcalc-web\test_output.txt)

Tasks:
- Decide whether these files are meant to be checked in.
- If yes, regenerate them from the current test run.
- If no, remove them from tracked status and document the canonical verification command.

Acceptance criteria:
- Repo artifacts reflect current test reality.
- No one needs to infer status from stale snapshots.

## P1. Finish Compensation -> Trim/Wire Workflow Parity

Objective:
- Reproduce the Delphi compensation workflows end-to-end, not just isolated formulas.

Why here:
- This is the highest-value missing parity in the shipped Delphi app.
- The core formulas already exist.
- It unlocks several Delphi units at once.

### P1.1 Wire compensation calculators into trim realization

Source units:
- `ZVSTEMP.PAS`
- `ZEROBAL.PAS`
- `SPAN2PT.PAS`
- `SPAN3PT.PAS`
- `OPTSHUNT.PAS`
- `SPANSET.PAS`
- `SIMSPAN.PAS`
- `CUTE01.PAS`
- `E01ZERO.PAS`
- `D012PT.PAS`
- `D013PT.PAS`
- `D01SPANS.PAS`
- `SETD01.PAS`
- `OPTSHD01.PAS`
- `SPAN2C01.PAS`
- `SPAN3C01.PAS`
- `SPANSC13.PAS`
- `OPTSHC01.PAS`
- `SPAN2C11.PAS`
- `SPAN3C11.PAS`
- `SPANSC11.PAS`
- `OPTSHC11.PAS`
- `SPN21210.PAS`
- `SPN31210.PAS`
- `SPNS1210.PAS`
- `OPSH1210.PAS`
- `SPN21220.PAS`
- `SPN31220.PAS`
- `SPNS1220.PAS`
- `OPSH1220.PAS`
- `WIRE2PT.PAS`
- `SPANWIRE.PAS`
- `ZBWIRE.PAS`

TS targets:
- [`transcalc-web/src/domain/orchestrator.ts`](c:\Users\Mike\OneDrive\MM Projects\transcalc\transcalc-web\src\domain\orchestrator.ts)
- [`transcalc-web/src/domain/ladderResistors.ts`](c:\Users\Mike\OneDrive\MM Projects\transcalc\transcalc-web\src\domain\ladderResistors.ts)
- calculator UI components under [`transcalc-web/src/components`](c:\Users\Mike\OneDrive\MM Projects\transcalc\transcalc-web\src\components)

Tasks:
- Add explicit workflow functions that take compensation output and route it into the selected physical realization family.
- Support both resistor-trim and wire-trim branches where Delphi offered both.
- Preserve family-specific variant selection in the UI instead of treating `ladderResistors.ts` as an isolated utility.

Acceptance criteria:
- A user can complete the Delphi-equivalent flow from compensation inputs to physical trim recommendation in one UI path.
- The realized result includes target resistance, realized resistance, error, and selected family/variant.

### P1.2 Add integration tests for workflow parity

TS targets:
- new tests near [`transcalc-web/src/tests/orchestrator.test.ts`](c:\Users\Mike\OneDrive\MM Projects\transcalc\transcalc-web\src\tests\orchestrator.test.ts)

Tasks:
- Add end-to-end tests for:
  - zero-vs-temp -> E01
  - zero-vs-temp -> wire
  - zero-balance -> E01
  - zero-balance -> wire
  - span 2-point -> D01/C01/C11/C12
  - span 3-point -> D01/C01/C11/C12
  - optimum shunt -> matching trim family
  - span set -> resistor trim and wire trim

Acceptance criteria:
- Workflow tests validate the glue layer, not just the domain math.

## P2. Port Trim-Network UI Parity

Objective:
- Replace the missing Delphi `APATTERN/BPATTERN/CPATTERN/DPATTERN` and family-specific trim interaction with a reusable modern UI.

Why here:
- `ladderResistors.ts` already covers the hard math.
- The remaining gap is user-facing behavior.

### P2.1 Build a reusable trim visualizer

Source units:
- `APATTERN.PAS`
- `BPATTERN.PAS`
- `CPATTERN.PAS`
- `DPATTERN.PAS`
- all trim-family form units

TS targets:
- [`transcalc-web/src/components/TrimVisualizer.tsx`](c:\Users\Mike\OneDrive\MM Projects\transcalc\transcalc-web\src\components\TrimVisualizer.tsx)
- related calculator components

Tasks:
- Define a generic rung-state view model that covers C01/C11/C12/D01/E01 families.
- Support cut/fixed/uncut display states.
- Support reset/restore and family-specific labeling.
- Show realized resistance and error-to-target live as state changes.

Acceptance criteria:
- One component family can render all supported trim topologies.
- The user can inspect and manipulate rung states similarly to Delphi.

### P2.2 Add family-specific UI wrappers

Tasks:
- Expose separate calculator flows matching the Delphi families, even if they share one underlying renderer.
- Preserve terminology from the Delphi units so existing users can map workflows cleanly.

Acceptance criteria:
- The TS app can represent the intent of `CUTE01`, `E01ZERO`, `D012PT`, `SPAN2C01`, `SPAN2C11`, `SPN21210`, `SPN21220`, and their sibling variants without custom ad hoc UI per family.

## P3. Port Persistence Semantics

Objective:
- Preserve the useful parts of Delphi save/load behavior without porting Delphi binary streaming literally.

Why here:
- Many Delphi units are `TLogItem`-based.
- The current TS port has JSON persistence but not Delphi-semantic field coverage.

### P3.1 Define calculator-level saved state contracts

Source units:
- `LOG.PAS`
- `LOGITEM.PAS`
- `LOGSTRM.PAS`
- every design and compensation unit with `SaveToStream` / `ReadFromStream`

TS targets:
- [`transcalc-web/src/domain/projectSchema.ts`](c:\Users\Mike\OneDrive\MM Projects\transcalc\transcalc-web\src\domain\projectSchema.ts)

Tasks:
- Create field maps from Delphi persisted objects to JSON calculator state.
- Record which derived values are recomputed vs stored.
- Support all shipped `XCALCPRO` calculators before non-project extras.

Acceptance criteria:
- A saved TS project can round-trip the same user-entered state that Delphi persisted for core calculators.

### P3.2 Decide legacy import scope

Tasks:
- Decide whether `.xcl` / Delphi object-stream import is required.
- If required, implement one-way import into `ProjectState`.
- If not required, document that JSON save/load is the supported replacement.

Acceptance criteria:
- Legacy import is either implemented for core cases or explicitly documented as out of scope.

## P4. Tighten Design-Calculator Parity

Objective:
- Move design calculators from “formula present” to “Delphi-equivalent behavior present.”

Why here:
- The domain math is mostly present and tested.
- Remaining gaps are field mapping, reported outputs, and UI/report parity.

### P4.1 Normalize per-calculator result contracts

Source units:
- `BBCANT.PAS`
- `BINO.PAS`
- `REVBB.PAS`
- `DUALBB.PAS`
- `SBBEAM.PAS`
- `SQRCOL.PAS`
- `RNDSLDC.PAS`
- `RNDHLWC.PAS`
- `SQTORQUE.PAS`
- `RNDSLDTQ.PAS`
- `RNDHLWTQ.PAS`
- `PRESSURE.PAS`
- `SHEARSQR.PAS`
- `SHERRND1.PAS`
- `SHEARSB.PAS`

TS targets:
- domain modules under [`transcalc-web/src/domain`](c:\Users\Mike\OneDrive\MM Projects\transcalc\transcalc-web\src\domain)
- [`transcalc-web/src/domain/orchestrator.ts`](c:\Users\Mike\OneDrive\MM Projects\transcalc\transcalc-web\src\domain\orchestrator.ts)

Tasks:
- Ensure each calculator exposes the same primary outputs Delphi reported: min/max/avg strain, gradient, bridge output, and validation errors where applicable.
- Audit unit handling so the orchestrator does not mask Delphi semantics.
- Separate legacy parity mode from newer inverse/FEA features where the behaviors differ.

Acceptance criteria:
- Each design calculator has a documented result contract tied back to its Delphi form outputs.

### P4.2 Add fixture-based regression tests from Delphi examples

Tasks:
- Build a small reference fixture set from legacy help/examples for each shipped calculator.
- Use those fixtures in tests so parity is measured against Delphi behaviors rather than only synthetic unit tests.

Acceptance criteria:
- Core calculators have Delphi-derived golden cases.

## P5. Recreate App-Shell Parity

Objective:
- Restore the Delphi application structure in the web app where it still matters.

Why here:
- This is lower risk than workflow and persistence parity.
- It becomes easier once the underlying workflows are stable.

### P5.1 Recreate launcher flows

Source units:
- `MAINMENU.PAS`
- `DESIGN.PAS`
- `COMPENST.PAS`
- `BRIDGE.PAS`

TS targets:
- app shell and navigation components in [`transcalc-web/src/components`](c:\Users\Mike\OneDrive\MM Projects\transcalc\transcalc-web\src\components)
- [`transcalc-web/src/App.tsx`](c:\Users\Mike\OneDrive\MM Projects\transcalc\transcalc-web\src\App.tsx)

Tasks:
- Ensure the app has clear entry points for Design, Compensation, and Bridge workflows.
- Preserve the calculator taxonomy from the Delphi menus, even if the visual design is modernized.

Acceptance criteria:
- A Delphi user can navigate the port using the same mental model as the original app.

### P5.2 Decide on low-value shell dialogs

Source units:
- `ABOUT.PAS`
- `SPLASH.PAS`
- `WARNING.PAS`

Tasks:
- Decide whether to implement, simplify, or drop these dialogs.
- Document the decision explicitly to avoid re-litigating them later.

Acceptance criteria:
- No ambiguous “maybe later” shell items remain.

## P6. Non-Project Delphi Extras

Objective:
- Triage useful Delphi source-tree assets that are not in the compiled `XCALCPRO` project.

Why last:
- They are not part of the authoritative shipped project inventory.

### P6.1 Decide support level for extra source-tree units

Units:
- `TCRATIO.PAS`
- `WIRE3PT.PAS`
- `WIREOPT.PAS`
- `RINGBB.PAS`
- `CONFIG.PAS`
- `CUTD01.PAS`
- `SAMPLE.PAS`
- `SHEARRND.PAS`

Tasks:
- Keep `TCRATIO`, `WIRE3PT`, `WIREOPT`, and `RINGBB` as “supported extensions” if they are already useful in TS.
- Treat the rest as archival unless there is a user requirement.

Acceptance criteria:
- The repo has a documented policy for included vs extra Delphi units.

## Suggested execution sequence

1. P0.1 `runDesign` orchestrator fixes
2. P0.2 test artifact cleanup
3. P1.1 compensation -> trim/wire workflow wiring
4. P1.2 workflow integration tests
5. P2.1 reusable trim visualizer
6. P2.2 family-specific trim wrappers
7. P3.1 JSON persistence parity
8. P3.2 legacy import decision
9. P4.1 design result-contract audit
10. P4.2 Delphi-derived regression fixtures
11. P5.1 launcher-flow parity
12. P5.2 low-value shell-dialog decision
13. P6.1 extra-unit triage

## Definition of done for the port

The port should be considered functionally complete when:
- all shipped `XCALCPRO` and `BridgeAp` workflows have a usable TS path
- domain and orchestrator tests are green
- compensation flows can drive trim/wire realization end-to-end
- saved TS projects preserve the practical state of the shipped calculators
- the remaining non-ported Delphi units are either intentionally dropped or explicitly documented
