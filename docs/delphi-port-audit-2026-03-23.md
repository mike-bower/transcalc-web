# Delphi Port Audit

Date: 2026-03-23

Scope:
- Main Delphi project: `delphi_source/Transcalc/XCALCPRO.DPR`
- Bridge subproject: `delphi_source/Transcalc/Bridge/BridgeAp.dpr`
- Existing TypeScript/Node port: `transcalc-web/src`, `src`

This note is the working reference for the Delphi-to-TypeScript port. It records:
- The `.pas` units included in the Delphi project and whether they have an associated `.dfm`
- A short summary of what each unit does
- A practical porting specification for a Node/TypeScript implementation
- A gap analysis against the current TypeScript codebase

## 1. Authoritative Delphi project inventory

The main project is driven by [`XCALCPRO.DPR`](../delphi_source/Transcalc/XCALCPRO.DPR). The bridge calculator is a separate subproject driven by [`BridgeAp.dpr`](../delphi_source/Transcalc/Bridge/BridgeAp.dpr).

### 1.1 Main project units

| Unit | `.dfm` | Purpose | TS target | Status |
|---|---|---|---|---|
| `ABOUT.PAS` | `ABOUT.DFM` | About dialog and hidden button handlers. | None | Missing |
| `ACLIST.PAS` | None | Object list / streamable collection infrastructure. | None | Missing |
| `ACSTREAM.PAS` | None | Custom binary object stream and persistence base classes. | None | Missing |
| `APATTERN.PAS` | `APATTERN.DFM` | Pattern dialog for A-style trim display. | None | Missing |
| `BBCANT.PAS` | `BBCANT.DFM` | Cantilever beam design calculator and persistence object. | `transcalc-web/src/domain/beams.ts` | Partial |
| `BINO.PAS` | `BINO.DFM` | Binocular beam calculator and persistence object. | `transcalc-web/src/domain/binobeam.ts` | Partial |
| `BPATTERN.PAS` | `BPATTERN.DFM` | Pattern dialog for B-style trim display. | None | Missing |
| `COMPENST.PAS` | `COMPENST.DFM` | Compensation method chooser dialog. | Workflow/UI only | Missing |
| `CONVERT.PAS` | None | Unit conversions and safe numeric parsing. | `transcalc-web/src/domain/convert.ts` | Present |
| `CPATTERN.PAS` | `CPATTERN.DFM` | Pattern dialog for C-family trim resistors. | None | Missing |
| `CUTE01.PAS` | `CUTE01.DFM` | E01 zero-balance cut-adjustment network form. | `transcalc-web/src/domain/ladderResistors.ts` | Partial |
| `D012PT.PAS` | `D012PT.DFM` | D01 2-point span-temp trim network. | `transcalc-web/src/domain/ladderResistors.ts` | Partial |
| `D013PT.PAS` | `D013PT.DFM` | D01 3-point span-temp trim network. | `transcalc-web/src/domain/ladderResistors.ts` | Partial |
| `D01SPANS.PAS` | `D01SPANS.DFM` | D01 span/span trim network variant. | `transcalc-web/src/domain/ladderResistors.ts` | Partial |
| `DESIGN.PAS` | `DESIGN.DFM` | Design-category launcher dialog. | Workflow/UI only | Missing |
| `DIAPRAGM.PAS` | `DIAPRAGM.DFM` | Strain distribution / diaphragm helper dialog. | None | Missing |
| `DPATTERN.PAS` | `DPATTERN.DFM` | Pattern dialog for D-family trim resistors. | None | Missing |
| `DUALBB.PAS` | `DUALBB.DFM` | Dual bending beam calculator and persistence object. | `transcalc-web/src/domain/dualbeam.ts` | Partial |
| `E01ZERO.PAS` | `E01ZERO.DFM` | E01 zero-balance ladder realization. | `transcalc-web/src/domain/ladderResistors.ts` | Partial |
| `LOG.PAS` | None | Application log container and item management. | None | Missing |
| `LOGITEM.PAS` | None | Base persisted calculation object. | None | Missing |
| `LOGSTRM.PAS` | None | Logging stream support. | None | Missing |
| `MAINMENU.PAS` | `MAINMENU.DFM` | Main application shell / menu. | App shell only | Missing |
| `MATH.PAS` | None | Numeric helpers including cubic solver. | `transcalc-web/src/domain/math.ts` | Present |
| `OPSH1210.PAS` | `OPSH1210.DFM` | C12-10 optimum shunt trim realization. | `transcalc-web/src/domain/ladderResistors.ts` | Partial |
| `OPSH1220.PAS` | `OPSH1220.DFM` | C12-20 optimum shunt trim realization. | `transcalc-web/src/domain/ladderResistors.ts` | Partial |
| `OPTSHC01.PAS` | `OPTSHC01.DFM` | C01 optimum shunt trim realization. | `transcalc-web/src/domain/ladderResistors.ts` | Partial |
| `OPTSHC11.PAS` | `OPTSHC11.DFM` | C11 optimum shunt trim realization. | `transcalc-web/src/domain/ladderResistors.ts` | Partial |
| `OPTSHD01.PAS` | `OPTSHD01.DFM` | D01 optimum shunt trim realization. | `transcalc-web/src/domain/ladderResistors.ts` | Partial |
| `OPTSHUNT.PAS` | `OPTSHUNT.DFM` | Optimum shunt compensation calculator. | `transcalc-web/src/domain/shuntoptim.ts` | Partial |
| `PRESSURE.PAS` | `PRESSURE.DFM` | Circular diaphragm pressure transducer calculator. | `transcalc-web/src/domain/pressure.ts` | Partial |
| `RESISTOR.PAS` | `RESISTOR.DFM` | Base resistor/trim model classes shared by trim families. | No direct TS equivalent | Missing |
| `REVBB.PAS` | `REVBB.DFM` | Reverse bending beam calculator and persistence object. | `transcalc-web/src/domain/reversebeam.ts` | Partial |
| `RNDHLWC.PAS` | `RNDHLWC.DFM` | Round hollow column calculator. | `transcalc-web/src/domain/rndhlwc.ts` | Partial |
| `RNDHLWTQ.PAS` | `RNDHLWTQ.DFM` | Round hollow torque shaft calculator. | `transcalc-web/src/domain/rndhlwtq.ts` | Partial |
| `RNDSLDC.PAS` | `RNDSLDC.DFM` | Round solid column calculator. | `transcalc-web/src/domain/rndsldc.ts` | Partial |
| `RNDSLDTQ.PAS` | `RNDSLDTQ.DFM` | Round solid torque shaft calculator. | `transcalc-web/src/domain/rndsldtq.ts` | Partial |
| `SBBEAM.PAS` | `SBBEAM.DFM` | S-beam design calculator. | `transcalc-web/src/domain/sbeam.ts` | Partial |
| `SETD01.PAS` | `SETD01.DFM` | D01 realization for span-set workflow. | `transcalc-web/src/domain/ladderResistors.ts` | Partial |
| `SHEARSB.PAS` | `SHEARSB.DFM` | Round S-beam shear span calculator. | `transcalc-web/src/domain/shearBeams.ts` | Partial |
| `SHEARSQR.PAS` | `SHEARSQR.DFM` | Square shear-web span calculator. | `transcalc-web/src/domain/shearBeams.ts` | Partial |
| `SHERRND1.PAS` | `SHERRND1.DFM` | Round shear-web span calculator. | `transcalc-web/src/domain/shearBeams.ts` | Partial |
| `SIMSPAN.PAS` | `SIMSPAN.DFM` | Simultaneous span compensation calculator. | `transcalc-web/src/domain/simspan.ts` | Partial |
| `SPAN2C01.PAS` | `SPAN2C01.DFM` | C01 2-point span-temp trim realization. | `transcalc-web/src/domain/ladderResistors.ts` | Partial |
| `SPAN2C11.PAS` | `SPAN2C11.DFM` | C11 2-point span-temp trim realization. | `transcalc-web/src/domain/ladderResistors.ts` | Partial |
| `SPAN2PT.PAS` | `SPAN2PT.DFM` | 2-point span-vs-temp compensation solver. | `transcalc-web/src/domain/spanTemperature2Pt.ts` | Partial |
| `SPAN3C01.PAS` | `SPAN3C01.DFM` | C01 3-point span-temp trim realization. | `transcalc-web/src/domain/ladderResistors.ts` | Partial |
| `SPAN3C11.PAS` | `SPAN3C11.DFM` | C11 3-point span-temp trim realization. | `transcalc-web/src/domain/ladderResistors.ts` | Partial |
| `SPAN3PT.PAS` | `SPAN3PT.DFM` | 3-point span-vs-temp compensation solver. | `transcalc-web/src/domain/spanTemperature3Pt.ts` | Partial |
| `SPANSC11.PAS` | `SPANSC11.DFM` | C11 span/span trim realization. | `transcalc-web/src/domain/ladderResistors.ts` | Partial |
| `SPANSC13.PAS` | `SPANSC13.DFM` | C01/C13 span/span trim realization. | `transcalc-web/src/domain/ladderResistors.ts` | Partial |
| `SPANSET.PAS` | `SPANSET.DFM` | Span-set resistor calculation. | `transcalc-web/src/domain/spanSet.ts` | Partial |
| `SPANWIRE.PAS` | `SPANWIRE.DFM` | Span-set wire-length realization. | `transcalc-web/src/domain/spanwire.ts` | Partial |
| `SPLASH.PAS` | `SPLASH.DFM` | Splash screen. | None | Missing |
| `SPN21210.PAS` | `SPN21210.DFM` | C12-10 2-point span-temp trim realization. | `transcalc-web/src/domain/ladderResistors.ts` | Partial |
| `SPN21220.PAS` | `SPN21220.DFM` | C12-20 2-point span-temp trim realization. | `transcalc-web/src/domain/ladderResistors.ts` | Partial |
| `SPN31210.PAS` | `SPN31210.DFM` | C12-10 3-point span-temp trim realization. | `transcalc-web/src/domain/ladderResistors.ts` | Partial |
| `SPN31220.PAS` | `SPN31220.DFM` | C12-20 3-point span-temp trim realization. | `transcalc-web/src/domain/ladderResistors.ts` | Partial |
| `SPNS1210.PAS` | `SPNS1210.DFM` | C12-10 span/span trim realization. | `transcalc-web/src/domain/ladderResistors.ts` | Partial |
| `SPNS1220.PAS` | `SPNS1220.DFM` | C12-20 span/span trim realization. | `transcalc-web/src/domain/ladderResistors.ts` | Partial |
| `SQRCOL.PAS` | `SQRCOL.DFM` | Square column calculator. | `transcalc-web/src/domain/sqrcol.ts` | Partial |
| `SQTORQUE.PAS` | `SQTORQUE.DFM` | Square torque shaft calculator. | `transcalc-web/src/domain/sqtorque.ts` | Partial |
| `WARNING.PAS` | `WARNING.DFM` | Startup warning dialog. | None | Missing |
| `WIRE2PT.PAS` | `WIRE2PT.DFM` | 2-point wire-length realization. | `transcalc-web/src/domain/wire2pt.ts` | Partial |
| `WIRETBL.PAS` | `WIRETBL.DFM` | Base wire table and resistance/length calculator. | `transcalc-web/src/domain/wire.ts` | Partial |
| `ZBWIRE.PAS` | `ZBWIRE.DFM` | Zero-balance wire-length realization. | `transcalc-web/src/domain/zbwire.ts` | Partial |
| `ZEROBAL.PAS` | `ZEROBAL.DFM` | Zero-balance compensation calculator. | `transcalc-web/src/domain/zeroBalance.ts`, `transcalc-web/src/domain/zerobal.ts` | Partial |
| `ZVSTEMP.PAS` | `ZVSTEMP.DFM` | Zero-vs-temperature compensation calculator. | `transcalc-web/src/domain/zeroVsTemp.ts`, `transcalc-web/src/domain/zerovstemp.ts` | Partial |

### 1.2 Bridge subproject units

| Unit | `.dfm` | Purpose | TS target | Status |
|---|---|---|---|---|
| `BRIDGE.PAS` | `BRIDGE.DFM` | Bridge-type launcher dialog. | `transcalc-web/src/domain/bridges.ts` | Partial |
| `ACTIVE11.PAS` | `ACTIVE11.DFM` | One-active/one-poisson half-bridge output. | `transcalc-web/src/domain/bridges.ts` | Partial |
| `FULLFOUR.PAS` | `FULLFOUR.DFM` | Four-active full-bridge output. | `transcalc-web/src/domain/bridges.ts` | Partial |
| `FULLTWO.PAS` | `FULLTWO.DFM` | Two-active opposite-arm full-bridge output. | `transcalc-web/src/domain/bridges.ts` | Partial |
| `LINEAR.PAS` | `LINEAR.DFM` | Linear poisson full-bridge output. | `transcalc-web/src/domain/bridges.ts` | Partial |
| `NONLINE.PAS` | `NONLINE.DFM` | Non-linear poisson full-bridge output. | `transcalc-web/src/domain/bridges.ts` | Partial |
| `TWOADJ.PAS` | `TWOADJ.DFM` | Two-adjacent-active half-bridge output. | `transcalc-web/src/domain/bridges.ts` | Partial |
| `CONVERT.PAS` | None | Shared conversion helpers. | `transcalc-web/src/domain/convert.ts` | Present |

## 2. Source-tree units not included in the compiled Delphi project

These `.pas` files exist in `delphi_source/Transcalc` but are not referenced by `XCALCPRO.DPR` or `BridgeAp.dpr`.

| Unit | Present in TS | Notes |
|---|---|---|
| `CONFIG.PAS` | No | Configuration dialog; likely superseded by `.ini` handling inside `XCALCPRO.DPR`. |
| `CUTD01.PAS` | Indirectly | Base D01 ladder shell; TS has solver coverage in `ladderResistors.ts` but no UI equivalent. |
| `EXAMPLE.PAS` | No | Appears to be a sample/demo form, not part of shipped workflow. |
| `LADDERS.PAS` | No direct file | Legacy ladder helper code; TS logic is concentrated in `ladderResistors.ts`. |
| `MAIN.PAS` | No | Legacy shell not included in current project. |
| `OUTLINEX.PAS` | No | Not included; likely editor/outline helper. |
| `REGISTER.PAS` | No | Registration dialog / licensing support. |
| `RINGBB.PAS` | Yes | TS has `ringbb.ts` and `ringbeam.ts`, but Delphi unit is not wired into `XCALCPRO.DPR`. |
| `SAMPLE.PAS` | Indirectly | C01 sample-network variant documented in `PRIORITY1_ROUTINE_MAPPING.md`; no dedicated TS façade file. |
| `SHEARRND.PAS` | Indirectly | Related to shear-web family; current project uses `SHERRND1.PAS`. |
| `TCRATIO.PAS` | Yes | TS has `TCRatio.ts` / `sensorCoeffs.ts`; Delphi unit is outside the active project. |
| `WIRE3PT.PAS` | Yes | TS has `wire3pt.ts`; Delphi unit is outside the active project. |
| `WIREOPT.PAS` | Yes | TS has `wireOpt.ts`; Delphi unit is outside the active project. |

## 3. Port specification by unit family

The Delphi code mixes three concerns inside most units:
- persisted model object (`TLogItem`-derived class)
- calculation logic
- VCL form event handlers and print/help code

The TypeScript port should separate those concerns consistently:
- `domain/*.ts`: pure calculations and validation
- `domain/projectSchema.ts`: serializable JSON state instead of Delphi object streams
- `components/calculators/*.tsx`: UI/forms
- `domain/orchestrator.ts`: workflow dispatch across design, compensation, and trim realization

### 3.1 Core infrastructure units

| Unit | Delphi summary | Port specification |
|---|---|---|
| `ACLIST` | Streamable object list with name/index operations and update notifications. | Replace with plain arrays/maps plus typed collection helpers. Do not recreate custom class streaming; use JSON and Zod-style runtime validation if needed. |
| `ACSTREAM` | Binary streaming framework for persisted objects, rectangles, and class tables. | Do not port the binary format first. Define a JSON schema and migration layer; if legacy import is needed later, build a one-way parser in a separate `legacy/` module. |
| `LOG`, `LOGITEM`, `LOGSTRM` | Shared persisted-calculation history model. | Port as TypeScript interfaces and plain objects in `projectSchema.ts`; preserve semantic fields, not Delphi inheritance. |
| `RESISTOR` | Base class hierarchy used by trim-network units. | Replace with typed `Ladder*Input`, `Ladder*Result`, and reusable solver helpers in `ladderResistors.ts`. |
| `CONVERT` | Conversions and `StrVal`. | Keep as pure functions; add a single parse helper returning `{ value, ok }` or a result object instead of mutating out-params. |
| `MATH` | Low-level numeric helpers, especially cubic solve. | Keep pure and deterministic; continue expanding tests with Delphi fixtures. |

### 3.2 App-shell and navigation units

| Unit | Delphi summary | Port specification |
|---|---|---|
| `MAINMENU` | Main launcher for design, compensation, help, and about. | Map to React workspace/router shell. Preserve calculator taxonomy and default entry points; ignore printer-specific code. |
| `DESIGN` | Chooses design calculator category. | Fold into calculator navigation and workflow wizard. |
| `COMPENST` | Chooses compensation calculator category. | Fold into compensation selector and wizard flow. |
| `ABOUT`, `SPLASH`, `WARNING` | Cosmetic dialogs and startup messaging. | Recreate only if they matter to user experience; otherwise record as non-blocking parity gap. |

### 3.3 Design calculators

| Unit | Delphi summary | Port specification |
|---|---|---|
| `BBCANT` | Cantilever beam model with min/max/avg strain, gradient, full bridge sensitivity, print helpers. | TS module should expose each engineering function plus one aggregate `calculateCantilever(...)` result object. Add persistence mapping from Delphi fields to JSON calculator state. |
| `BINO` | Binocular beam model with separate beam section strain calculations and full-span sensitivity. | Keep pure geometry/strain solver. Preserve geometric validation from Delphi, and keep inverse/FEA extensions as additive, not a rewrite of the closed-form solver. |
| `REVBB` | Reverse beam model. | Keep pure closed-form solver with one aggregate result. Ensure UI exposes the same dimensional constraints as Delphi. |
| `DUALBB` | Dual beam model. | Same pattern as `REVBB`; retain Delphi-equivalent formulas before adding FEA tooling. |
| `SBBEAM` | S-beam model with min/max/avg strain, gradient, full-span sensitivity. | Keep aggregate design solver returning all reported metrics; continue matching Delphi sign conventions. |
| `SQRCOL` | Square column axial/transverse strain and full-span output. | Keep axial/transverse/full-span calculation entry points; preserve Poisson-ratio handling and bridge output assumptions. |
| `RNDSLDC` | Round solid column strain solver. | Keep pure solver returning strains and full-span output. |
| `RNDHLWC` | Round hollow column strain solver. | Keep pure solver returning strains and full-span output, including inside/outside diameter validation. |
| `SQTORQUE` | Square torque shaft min/max/avg strain, gradient, full-span output. | Preserve all four reported metrics and not just full-span. |
| `RNDSLDTQ` | Round solid torque shaft shear/full-span solver. | Keep pure solver and bridge output calculation together. |
| `RNDHLWTQ` | Round hollow torque shaft solver. | Same as round solid torque, with hollow-shaft validation. |
| `PRESSURE` | Circular diaphragm pressure solver for radial/tangential strains. | Keep separate low-level strain functions plus aggregate bridge-output helper. Preserve sign convention: radial compressive, tangential tensile. |
| `SHEARSQR`, `SHERRND1`, `SHEARSB` | Shear-web / shear-beam span calculators with shared helper routines. | Keep a shared `shearBeams.ts` core with thin wrappers per geometry. Return full-span output as primary value and add intermediate values only if required for UI parity. |

### 3.4 Compensation calculators

| Unit | Delphi summary | Port specification |
|---|---|---|
| `ZVSTEMP` | Solves resistor needed for zero-shift vs temperature and bridge-arm placement; optionally hands off to E01 or wire realization. | Keep pure solver returning `{ resistance, bridgeArm }`. UI then dispatches to either ladder or wire realization path. |
| `ZEROBAL` | Solves resistor needed for zero-balance correction and allows E01 or wire realization. | Keep pure solver returning `{ resistanceNeeded, bridgeArm? }` plus validation state. |
| `SPAN2PT` | 2-point span-vs-temperature compensation. | Keep pure solver returning target compensation resistance and supporting outputs. |
| `SPAN3PT` | 3-point span-vs-temperature compensation. | Keep pure solver returning low/mid/high compensation values and interpolation helpers. |
| `OPTSHUNT` | Optimum shunt calculator producing target trim value. | Keep pure solver returning recommended shunt resistance; leave physical trim realization to ladder modules. |
| `SPANSET` | Computes resistor required to move measured span to target span. | Keep pure scalar solver; then route result into ladder or wire realization. |
| `SIMSPAN` | Simultaneous compensation producing `rShunt` and `rMod`. | Keep pure solver returning both values and failure reason. |

### 3.5 Ladder trim realization units

All of the units below share the same port shape:
- input: `startResistance`, `targetResistance`, family-specific constants, and optional ohm-set selector
- output: best rung pattern, realized resistance, error from target, and any family-specific side metrics
- UI behavior: show cut/fixed state graphically, reset/restore, print, help

The correct TS split is:
- `ladderResistors.ts`: forward formulas and inverse search
- `TrimVisualizer.tsx`: presentation of rung states
- workflow modules or `orchestrator.ts`: connect compensation outputs to the selected trim family

| Unit | Delphi summary | Port specification |
|---|---|---|
| `CUTE01` | E01 cut-adjustment realization form. | Map to `solveE01SideRungs` plus a paired-side UI state for left/right networks. |
| `E01ZERO` | E01 zero-balance realization form. | Keep dedicated helper returning `R12`, `R23`, and mismatch. |
| `D012PT`, `D013PT`, `D01SPANS`, `SETD01`, `OPTSHD01` | D01 family variants for 2-point, 3-point, span/span, span-set, and optimum shunt flows. | Reuse one D01 solver with variant metadata. Variant modules only differ in who supplies the target resistance and what labels the UI displays. |
| `SPAN2C01`, `SPAN3C01`, `SPANSC13`, `OPTSHC01` | C01/C13 family variants. | Reuse one C01 solver with a variant key and optional 40/80-ohm selection. |
| `SPAN2C11`, `SPAN3C11`, `SPANSC11`, `OPTSHC11` | C11 family variants. | Reuse one C11 solver keyed by workflow variant. |
| `SPN21210`, `SPN31210`, `SPNS1210`, `OPSH1210` | C12 10-ohm family variants. | Reuse one C12 solver with a fixed constant set for 10-ohm hardware. |
| `SPN21220`, `SPN31220`, `SPNS1220`, `OPSH1220` | C12 20-ohm family variants. | Reuse one C12 solver with the 20-ohm constant set. |
| `APATTERN`, `BPATTERN`, `CPATTERN`, `DPATTERN` | Auxiliary pattern-display forms for the trim families. | Do not create separate domain modules. Implement as reusable React visualization components fed by a generic rung-state view model. |

### 3.6 Wire realization units

| Unit | Delphi summary | Port specification |
|---|---|---|
| `WIRETBL` | Wire gauge table, resistance/length conversion, wire selection UI. | Keep static AWG/material tables in data objects and expose pure conversion helpers. |
| `WIRE2PT` | 2-point compensation wire realization. | Thin workflow wrapper around shared wire table logic. |
| `SPANWIRE` | Span-set wire realization. | Same shared wire core; only input labels differ. |
| `ZBWIRE` | Zero-balance wire realization. | Same shared wire core with zero-balance-specific labels/limits. |

### 3.7 Bridge subproject

| Unit | Delphi summary | Port specification |
|---|---|---|
| `BRIDGE` | Bridge-mode chooser dialog. | Replace with calculator selector plus a `bridgeType` enum in TS. |
| `ACTIVE11`, `FULLFOUR`, `FULLTWO`, `LINEAR`, `NONLINE`, `TWOADJ` | Individual bridge output formulas with nearly identical UI shells. | Keep one `bridges.ts` module exporting pure functions per bridge topology plus a dispatcher. UI should be a single calculator with selectable topology, not six separate forms. |

## 4. Current TypeScript gap analysis

### 4.1 Units with no TS equivalent yet

These units are completely absent or only represented indirectly:

- `ABOUT`
- `ACLIST`
- `ACSTREAM`
- `APATTERN`
- `BPATTERN`
- `COMPENST`
- `CPATTERN`
- `DESIGN`
- `DIAPRAGM`
- `DPATTERN`
- `LOG`
- `LOGITEM`
- `LOGSTRM`
- `MAINMENU`
- `RESISTOR`
- `SPLASH`
- `WARNING`

Impact:
- The engineering math can still be ported without them.
- Full desktop-app parity, legacy file import, print support, and trim-visualization parity are not complete until at least part of this layer is rebuilt.

### 4.2 Units with domain logic present but workflow parity incomplete

These calculators have TypeScript domain modules, but the TS code does not yet fully reproduce the original Delphi unit behavior end-to-end.

| Unit family | Current state | Gap |
|---|---|---|
| Design calculators (`BBCANT`, `BINO`, `REVBB`, `DUALBB`, `SBBEAM`, `SQRCOL`, `RNDSLDC`, `RNDHLWC`, `SQTORQUE`, `RNDSLDTQ`, `RNDHLWTQ`, `PRESSURE`, shear units) | Domain solvers and tests exist. Some calculators also have new FEA and inverse-design extensions. | Missing Delphi-style persisted object model, print/report parity, and in several cases one-form-one-workflow parity. |
| Compensation calculators (`ZVSTEMP`, `ZEROBAL`, `SPAN2PT`, `SPAN3PT`, `OPTSHUNT`, `SPANSET`, `SIMSPAN`) | Core formulas exist and `orchestrator.ts` dispatches them. | Legacy UI flow, bridge-arm selection UX, and save/load parity are incomplete. |
| Ladder trim units | `ladderResistors.ts` now contains forward and inverse solvers for C01/C11/C12/D01/E01 families. | Delphi visual cut/fix interaction, family-specific forms, restore/print/help flows, and some exact variant labeling are missing. |
| Wire realization units | `wire.ts`, `wire2pt.ts`, `wire3pt.ts`, `wireOpt.ts`, `zbwire.ts`, `spanwire.ts` exist. | Only `WIRETBL`, `WIRE2PT`, `SPANWIRE`, and `ZBWIRE` are in the compiled Delphi project; UI parity is still partial. |
| Bridge subproject | `bridges.ts` exists and tests pass. | No explicit bridge-subproject UI equivalent matching the original standalone Delphi app. |

### 4.3 Evidence of incomplete or inconsistent implementation

1. Checked-in test artifacts are stale.
   - `transcalc-web/test-output.json` still shows an older `74/74` passing snapshot.
   - A live `npm test -- --run` on 2026-03-23 produced `893/895` passing tests, with 2 failures in `src/tests/orchestrator.test.ts`.

2. The remaining live failures are orchestration/parity issues, not broad domain failures.
   - `runDesign — binoBeam` fails because the orchestrator fixture violates the current binocular-beam geometry guard: `Distance between holes / Width ratio 1.666... must be >= 2`.
   - `runDesign — torque types` fails because the square-torque fixture hits a modulus-range validation error: `Modulus must be between 34474 and 344737 GPa`.
   - The dedicated domain suites for `span3pt`, ladder resistors, zero-balance, zero-vs-temp, bridges, beams, wire families, and the newer inverse/FEA work all passed in the live run.

3. Legacy persistence is not ported.
   - Delphi relies on `ACSTREAM`, `ACLIST`, `LOGITEM`, and object-stream save/load methods in nearly every calculator unit.
   - TS currently uses JSON project state in `projectSchema.ts`, but there is no importer for Delphi object streams or legacy `.xcl` artifacts.

4. Trim-family UI parity is not ported.
   - Delphi family units contain `TRung` click handling, redraw, cut/fix state changes, image capture, and print workflows.
   - TS has solver logic, but not the complete family-specific interactive experience.

5. Navigation parity is incomplete.
   - Delphi has explicit launcher forms for `MAINMENU`, `DESIGN`, `COMPENST`, and `BRIDGE`.
   - TS has modernized routing and wizard flows, but not a strict one-for-one recreation of those launchers.

### 4.4 Recommended priority order

1. Finish workflow parity before adding more new features.
   - Wire `runCompensation` and `realizeTrim` consistently into the UI for each compensation family.

2. Close the trim-family presentation gap.
   - Build a reusable trim-network visualization that can represent A/B/C/D/E families and expose cut/fix/reset interactions.

3. Define legacy-to-JSON migration.
   - Either document `.xcl` as unsupported or implement a one-way importer from Delphi persistence to `ProjectState`.

4. Recreate the missing app shell only after domain parity is stable.
   - `MAINMENU`, `DESIGN`, `COMPENST`, and `BRIDGE` are the only launcher forms worth porting directly.

5. Clean up test drift.
   - Replace stale exported test artifacts.
   - Fix the two remaining orchestrator test failures so the dispatch layer matches the validated domain constraints.

## 5. Unit-by-unit practical next actions

### Missing entirely

- Infrastructure: `ACLIST`, `ACSTREAM`, `LOG`, `LOGITEM`, `LOGSTRM`, `RESISTOR`
- Launchers/UI: `ABOUT`, `MAINMENU`, `DESIGN`, `COMPENST`, `SPLASH`, `WARNING`
- Trim visuals: `APATTERN`, `BPATTERN`, `CPATTERN`, `DPATTERN`
- Helper dialog: `DIAPRAGM`

### Present but incomplete

- Design domains: preserve Delphi save/load fields and reported outputs, not just headline sensitivity.
- Compensation domains: finish UI orchestration to the downstream trim or wire realization steps.
- Ladder families: complete interactive rung visualization and variant-specific flows.
- Wire families: align active UI coverage with Delphi project-included units.
- Bridge family: add a dedicated UI flow if strict Delphi parity matters.

## 6. Notes for future reference

- Treat the Delphi `.dpr` files as the source of truth for what was actually part of the shipped project.
- Treat `ringbb`, `wire3pt`, `wireopt`, and `tcratio` as useful source-tree assets, but not part of the compiled `XCALCPRO` inventory.
- Do not port Delphi streaming classes verbatim unless legacy-file import becomes a hard requirement.
- Keep formulas in pure TypeScript modules and isolate UI concerns; the Delphi units are tightly coupled, and copying that structure into Node/TS would make the port harder to maintain.
- When in doubt, port the Delphi calculation semantics first, then normalize naming and UX second.
