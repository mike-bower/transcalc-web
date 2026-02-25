Delphi → TypeScript mapping (initial)

Scope: files reviewed: `MATH.PAS`, `TCRatio.pas`, `CONVERT.PAS`, `wiretbl.pas`, `PRESSURE.PAS`.

Goal: map Delphi public routines and types to equivalent TS modules, prioritize deterministic numeric code (domain core) for porting to TypeScript or Rust→WASM.

1) `MATH.PAS`
- Delphi exports: `function Cube(v: double): double;` and `function Cubic(var S1,S2,S3: double; A,B,C,D: double): boolean;`
- TS equivalent: `src/domain/math.ts` with `export function cube(v:number): number` and `export function solveCubic(A,B,C,D): {roots:number[], ok:boolean}`
- Notes: port algorithm exactly (pay attention to numerical edge cases and error handling). Add unit tests using legacy sample coefficients.

Priority: High — low-level numeric helper used by other routines.

2) `TCRatio.pas`
- Delphi contains: `TCoefficient` (polynomial coefficients, `GetValue(t)`), `TCoeffSet`, UI handlers that read `RRSensor.txt` and compute resistance ratios.
- TS equivalent: `src/domain/sensorCoeffs.ts`
  - `class Coefficient { constructor(c0..c6); getValue(t:number):number }`
  - `type CoeffSet = { us: Coefficient; si: Coefficient }`
  - `parser` for `RRSensor.txt` to build sensor list (migrate into JSON assets)
  - `service` to compute R_low/R_ambient/R_high and return ratio results.
- Notes: Keep parsing separate from calculation. Provide JSON fixtures for CI.

Priority: High — core application feature (sensor conversions).

3) `CONVERT.PAS`
- Delphi functions: many unit conversions (F_to_C, mm_to_inches, Kg_to_lbs, N_to_lbf, Psi_to_Pa, etc.) and `StrVal` (string->number safe parse).
- TS equivalent: `src/domain/convert.ts` exporting pure conversion functions and `parseNumber(s:string): {value:number, ok:boolean}`.
- Notes: canonicalize units (use `uom` types or lightweight wrapper) and centralize units to avoid duplicated logic.

Priority: High — used across UI and numeric code.

4) `wiretbl.pas`
- Delphi provides AWG table data, UI grid filling, and recalculation (length from resistance) using `Inches_To_mm` etc.
- TS equivalent: `src/domain/wire.ts` with:
  - `const AWG_TABLE: Array<{awg:number, diameter_mm:number, cmils:number}>`
  - `function lengthFromResistance(resistance:number, resistivity:number, units:'US'|'SI')`
  - UI binding components: `WireTable` React component.
- Notes: Extract static tables to JSON and port conversion formulas.

Priority: Medium — domain table + conversions used in some dialogs.

5) `PRESSURE.PAS`
- Delphi exports `TPressure` (model + serialization), `TPressureFrm` with methods `CalculateRadial` and `CalculateTangential` implementing formulas.
- TS equivalent: `src/domain/pressure.ts` with `interface PressureModel` and `function calculateRadial(params):number`, `function calculateTangential(params):number` plus serialization helpers for migration.
- Notes: Ensure unit consistency and add tests against legacy sample values to detect drift.

Priority: High — complex engineering calculation with deliverable outputs.

6) `Bridge units` (linear.pas, fulltwo.pas, fullfour.pas, etc.)
- Delphi exports various bridge configuration calculations (linear, full-two opposite arms, full-four, half-bridge).
- TS equivalent: `src/domain/bridges.ts` with `calculateLinearBridge`, `calculateFullTwoBridge`, `calculateFullFourBridge`, `calculateHalfBridge` and dispatcher.
- Notes: Formulas vary by bridge configuration; validate against known test cases from legacy files.

Priority: High — core sensor measurement feature used across many dialogs.

7) `Cantilever and beam solvers` (various SPNS/D01 files)
- Delphi implements cantilever stress/deflection, simple-supported beam stress/deflection, and strain-from-stress conversions.
- TS equivalent: `src/domain/beams.ts` with `calculateCantileverStress`, `calculateCantileverDeflection`, `calculateSimpleSupportedStress`, `stressToStrain`, etc.
- Notes: These are fundamental mechanics formulas; add robust unit tests with standard engineering examples.

Priority: Medium-High — used by span/cantilever calculators.

Cross-file concerns and next mapping steps
- Create a canonical JSON schema for projects; map Delphi saved fields to schema keys (eg `TPressure.AppliedPressure` → `pressure.appliedPressure`).
- Generate a baseline tests directory with a set of legacy sample values and expected numeric outputs for each mapped routine.
- For heavy numeric algorithms (e.g., cubic solver, diaphragm/bridge calculations), consider Rust→WASM module (`src/wasm/*`) exposing pure functions; otherwise port to TypeScript with rigorous tests.
- Build a migration tool to read legacy object streams or text files (`*.xcl`, `RRSensor.txt`, saved project files) and produce JSON conforming to the new schema.

Implementation status (as of Feb 6, 2026)
- ✅ `convert.ts` — all unit conversion functions + tests
- ✅ `math.ts` — `cube`, `solveCubic` + tests
- ✅ `pressure.ts` — `calculateRadial`, `calculateTangential` + tests
- ✅ `sensorCoeffs.ts` — `Coefficient` and `CoeffSet` classes + tests
- ✅ `bridges.ts` — linear, full-two, full-four, half-bridge calculators + tests
- ✅ `beams.ts` — cantilever & simple-supported beam solvers + tests
- ✅ `wasm/` — Rust→WASM example for cubic solver scaffold (ready to build)

Next: Run full test suite and build WASM module.
