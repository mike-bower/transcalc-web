# Transcalc Agent Guide

This file is the working guide for Claude Code or any coding agent modifying this repository. It is the source of truth for the current product surface, architecture, and extension strategy.

Last verified: April 2026 — 1096 tests passing / 57 files.

---

## Project Intent

Transcalc is a web rewrite of the legacy Borland Delphi Transcalc/Xcalc application for strain-gage transducer design, compensation, and trim realization.

The target product is:

- a browser-based engineering design environment
- testable domain logic separated from UI code
- interactive geometry, sketch, and FEA visualization
- progressive replacement of legacy Delphi workflows with modern, reusable TS modules

---

## Repository Structure

```
transcalc/
├── CLAUDE.md                        ← this file
├── transcalc-web/                   ← active development lives here
│   ├── src/
│   │   ├── App.tsx                  ← app shell, routing, unit system state
│   │   ├── main.tsx                 ← React 18 entry point
│   │   ├── domain/                  ← pure engineering logic (no React)
│   │   │   ├── fea/                 ← FEA solvers (CST 2D)
│   │   │   └── inverse/             ← inverse design solvers
│   │   ├── components/              ← React UI
│   │   │   ├── calculators/         ← one component per transducer type
│   │   │   ├── compensation/        ← compensation workflow forms
│   │   │   └── diagrams/            ← 2D engineering sketches
│   │   ├── tests/                   ← Vitest test files
│   │   └── wasm/                    ← Rust/WASM scaffold (not yet built into app)
│   ├── public/legacy-help/          ← ported Delphi HTML help files
│   ├── package.json
│   └── vite.config.ts
├── delphi_source/Transcalc/         ← legacy reference only; do not modify
└── docs/                            ← migration notes; codebase is ahead of some docs
```

---

## Current Product Surface (April 2026)

- **18 transducer design calculators** with 3D preview, 2D sketch, and FEA
- **7 compensation workflow forms**
- **Trim network realization** via C01/C11/C12/D01/E01 ladder resistor solvers
- **Unified workflow orchestrator** (`orchestrator.ts`) dispatching design → compensation → trim
- **Project persistence** via JSON (`.tcalc.json`)
- **FEA infrastructure** — 9 linear CST 2D solvers wired into calculators
- **1096 tests** / 57 files, all passing
- `npm run build` passes
- `npx tsc --noEmit` has one known false failure (WASM import; see Known Problems)

---

## Calculator Inventory

All calculators are routed by `calcKey` in `WorkspaceRouter.tsx`.

### Beam Calculators

| calcKey  | Component                    | Domain File      | Description                                           |
|----------|------------------------------|------------------|-------------------------------------------------------|
| `bbcant` | `CantileverCalc.tsx`         | `beams.ts`       | Cantilever bending; gage at fixed end                 |
| `bino`   | `BinocularBeamWorkspace.tsx` | `binobeam.ts`    | Dual-hole bending beam; full FEA + inverse + 2D sketch |
| `dualbb` | `DualBeamCalc.tsx`           | `dualbeam.ts`    | Parallel dual flexure; off-center load compensation   |
| `revbb`  | `ReverseBeamCalc.tsx`        | `reversebeam.ts` | Simply-supported beam; center load                    |
| `sbbeam` | `SBeamCalc.tsx`              | `sbeam.ts`       | S-shaped bending flexure; tension/compression         |

### Column Calculators

| calcKey   | Component                   | Domain File   | Description                       |
|-----------|-----------------------------|---------------|-----------------------------------|
| `sqrcol`  | `SquareColumnCalc.tsx`      | `sqrcol.ts`   | Square section axial pillar       |
| `rndsldc` | `RoundSolidColumnCalc.tsx`  | `rndsldc.ts`  | Solid round section axial pillar  |
| `rndhlwc` | `RoundHollowColumnCalc.tsx` | `rndhlwc.ts`  | Hollow round section axial pillar |

### Shear Calculators

| calcKey   | Component                  | Domain File     | Description                     |
|-----------|----------------------------|-----------------|---------------------------------|
| `shrsqr`  | `SquareShearCalc.tsx`      | `shearBeams.ts` | Square section transverse shear |
| `shrrnd`  | `RoundShearCalc.tsx`       | `shearBeams.ts` | Round section transverse shear  |
| `shrrnd1` | `RoundSBeamShearCalc.tsx`  | `shearBeams.ts` | S-beam transverse shear         |

### Torque Calculators

| calcKey  | Component                    | Domain File   | Description                             |
|----------|------------------------------|---------------|-----------------------------------------|
| `sqrtor` | `SquareTorqueCalc.tsx`       | `sqtorque.ts` | Torsional strain in square shaft        |
| `rndsld` | `RoundSolidTorqueCalc.tsx`   | `rndsldtq.ts` | Torsional strain in solid round shaft   |
| `rndhlw` | `RoundHollowTorqueCalc.tsx`  | `rndhlwtq.ts` | Torsional strain in hollow round shaft  |

### Pressure Calculator

| calcKey    | Component          | Domain File   | Description                                   |
|------------|--------------------|---------------|-----------------------------------------------|
| `pressure` | `PressureCalc.tsx` | `pressure.ts` | Circular diaphragm radial/tangential strain   |

### Multi-Axis F/T Calculators

| calcKey     | Component              | Domain File             | Description                                       |
|-------------|------------------------|-------------------------|---------------------------------------------------|
| `sixaxisft` | `SixAxisFTCalc.tsx`    | `sixAxisForceTorque.ts` | Maltese-cross 4-arm flexure; full 6-DOF sensing  |
| `hexapod`   | `HexapodFTCalc.tsx`    | `hexapodFT.ts`          | 6-strut Stewart platform (ATI/JR3 topology)       |
| `jts`       | `JointTorqueCalc.tsx`  | `jointTorqueSensor.ts`  | Spoke-flexure disk for torque in SEA drives       |
| `triaxisft` | `ThreeBeamFTCalc.tsx`  | `threeBeamFT.ts`        | 3-arm 120° symmetric cross-beam; 6-axis decoding  |

### Compensation Calculators

| calcKey    | Component             | Domain File             | Description                              |
|------------|-----------------------|-------------------------|------------------------------------------|
| `zvstemp`  | `ZeroVsTempCalc.tsx`  | `zeroVsTemp.ts`         | Zero offset temperature polynomial       |
| `zerobal`  | `ZeroBalanceCalc.tsx` | `zeroBalance.ts`        | Bridge zero balance via wire resistors   |
| `span2pt`  | `SpanTemp2PtCalc.tsx` | `spanTemperature2Pt.ts` | 2-point span + temperature correction    |
| `span3pt`  | `SpanTemp3PtCalc.tsx` | `spanTemperature3Pt.ts` | 3-point span + polynomial temp fit       |
| `optshunt` | `ShuntOptimCalc.tsx`  | `shuntoptim.ts`         | Optimal shunt resistance for trim ladder |
| `spanset`  | `SpanSetCalc.tsx`     | `spanSet.ts`            | Fixed span via series/shunt resistance   |
| `simspan`  | `SimSpanCalc.tsx`     | `simspan.ts`            | Simulated span load simulation circuit   |

---

## Domain Module Index

All domain modules live in `transcalc-web/src/domain/`. They are pure TypeScript — no React, no side effects.

### Beam Mechanics

| File | Key Exports | Notes |
|------|-------------|-------|
| `beams.ts` | `calculateCantileverMinStrain`, `calculateCantileverMaxStrain`, `calculateCantileverAvgStrain`, `calculateCantileverGradient`, `calculateCantileverNaturalFrequency` | Validates engineering limits |
| `binobeam.ts` | `calculateBinobeamStrain`, `BinobeamResult` | `g = H/2 − (r + t_min)`; constraint: g must be < r for valid binocular geometry |
| `dualbeam.ts` | `calculateDualBeamStrain` | Parallel arms for off-center load |
| `reversebeam.ts` | `calculateReverseBeamStrain` | Simply-supported center load |
| `sbeam.ts` | `calculateSBeamStrain` | S-flexure tension/compression |
| `binocularGeometry.ts` | `buildBinocularGeometry`, `BinocularRawParams`, `BinocularGeometry` | Shared geometry model consumed by sketch, 3D viewer, FEA, and inverse |

### Compression

| File | Key Exports |
|------|-------------|
| `sqrcol.ts` | `calculateSquareColumnStrain` |
| `rndsldc.ts` | `calculateRoundSolidColumnStrain` |
| `rndhlwc.ts` | `calculateRoundHollowColumnStrain` |

### Shear and Torsion

| File | Key Exports |
|------|-------------|
| `shearBeams.ts` | `calculateSquareShearStrain`, `calculateRoundShearStrain`, `calculateSBeamShearStrain` |
| `shearweb.ts` | Shear web FEA integration utilities |
| `sqtorque.ts` | `calculateSqTorque` |
| `rndsldtq.ts` | `calculateRoundSolidTorqueStrain` |
| `rndhlwtq.ts` | `calculateRoundHollowTorqueStrain` |
| `torqueHollow.ts` | Hollow shaft torsion sub-formulas |

### Pressure

| File | Key Exports |
|------|-------------|
| `pressure.ts` | `calculateRadial`, `calculateTangential` |

### Multi-Axis F/T Sensors

| File | Key Exports | Notes |
|------|-------------|-------|
| `sixAxisForceTorque.ts` | `calculateCrossBeamFT`, `CrossBeamFTResult` | 4-arm Maltese cross; 6×6 sensitivity matrix; natural frequencies for Fz/Fx/Fy/Mz |
| `hexapodFT.ts` | `calculateHexapodFT`, `HexapodFTResult` | 6-strut Stewart platform; Jacobian wrench decoding; Jacobian inverse |
| `jointTorqueSensor.ts` | `calculateJointTorqueSensor` | N-spoke radial flexure disk; torque + Fx/Fy crosstalk |
| `threeBeamFT.ts` | `calculateThreeBeamFT` | 3-arm 120° symmetric; Fx/Fy/Fz/Mz decoding |

### Compensation

| File | Key Exports |
|------|-------------|
| `zeroVsTemp.ts` | `calculateZeroVsTemp` |
| `zeroBalance.ts` | `calculateZeroBalance` |
| `spanTemperature2Pt.ts` | `calculateSpanTemperature2Pt` |
| `spanTemperature3Pt.ts` | `calculateSpanTemperature3Pt` |
| `spanSet.ts` | `calculateSpanSet` |
| `shuntoptim.ts` | `calculateOptimalShunt` |
| `simspan.ts` | `calculateSimSpan` |

### Calibration (Wire)

| File | Notes |
|------|-------|
| `wire2pt.ts` | 2-point wire calibration |
| `wire3pt.ts` | 3-point wire calibration |
| `wireOpt.ts` | Wire resistance optimization |
| `wire.ts` | AWG wire properties (resistance, voltage drop, skin effect) |

### Trim Networks

| File | Key Exports |
|------|-------------|
| `ladderResistors.ts` | `solveC01Rungs`, `solveC11Rungs`, `solveC12Rungs`, `solveD01Rungs`, `solveE01SideRungs`; rung state management |

### Materials and Bridges

| File | Key Exports |
|------|-------------|
| `materials.ts` | Material property database (60+ materials: E, ν, ρ, yield, temp limits, figure-of-merit) |
| `bridges.ts` | Wheatstone bridge configuration gains (quarter/half/full bending, Poisson variants) |
| `sensorCoeffs.ts` | Polynomial coefficient evaluator up to 7th order; SI/US dual coefficient sets |

### Utilities

| File | Purpose |
|------|---------|
| `convert.ts` | Unit conversions (length, force, pressure, temperature, modulus) |
| `temperature.ts` | Thermal strain, thermal stress, gage factor temperature correction, creep |
| `fatigue.ts` | S-N fatigue life (Morrow equation); vibration analysis |
| `math.ts` | Matrix inversion, Gaussian elimination, cubic/polynomial roots |
| `core.ts` | Cross-cutting stress computation utilities |
| `TCRatio.ts` | Strain-gage TC ratio calculations for thermal output |

### Workflow and Persistence

| File | Purpose |
|------|---------|
| `orchestrator.ts` | Stateless unified dispatch: `runDesign`, `runCompensation`, `realizeTrim` |
| `transducerDefinitions.ts` | 15 named transducer type definitions (IDs, labels, categories) |
| `projectSchema.ts` | `.tcalc.json` schema v1.0; `newProject`, `serialiseProject`, `parseProject` |
| `persistence.ts` | Project state management (load/save hooks) |

### Inverse Design

| File | Purpose |
|------|---------|
| `inverse/designInverse.ts` | Beam section sizing given target strain (iterative root-find) |
| `inverse/cantileverInverse.ts` | Solve for load/geometry given target cantilever strain |
| `inverse/binoBeamInverse.ts` | Solve for binocular beam design parameters given target strain |

---

## FEA Architecture

All FEA solvers live in `transcalc-web/src/domain/fea/`. All use linear CST (Constant Strain Triangle) 2D plane-stress with rectangular meshes.

### Solvers

| File | Geometry | Boundary Conditions | Loading |
|------|----------|---------------------|---------|
| `cantileverSolver.ts` | Rectangular | Fixed left edge (all DOFs) | Point load at free end |
| `binobeamSolver.ts` | Binocular (dual-hole mesh) | Symmetric bending | Axial tension/compression |
| `dualBeamSolver.ts` | Dual parallel arms | Symmetric dual-arm bending | Moment/tension on both arms |
| `reverseBeamSolver.ts` | Rectangular | Pinned left, roller right | Center point load |
| `squareColumnSolver.ts` | Rectangular | Clamped base | Uniform axial compression at top |
| `roundSolidColumnSolver.ts` | Circular cross-section approx | Axial column BC | Axial compression |
| `roundHollowColumnSolver.ts` | Annular cross-section approx | Axial column BC | Axial compression |
| `shearWebSolver.ts` | Rectangular | Cantilever-like | Transverse shear force |
| `rectangularCstSolver.ts` | Generic rectangular | Injected via `RectBcSpec` callbacks | Injected via `applyForces` callback |
| `stepExport.ts` | Any mesh | — | STEP/CAD mesh export (Abaqus/Nastran) |

### Solver Output (target schema)

```typescript
{
  nodes: number[][]              // [n × 2] x,y coordinates
  elements: number[][]           // [m × 3] node index triples
  displacements: number[]        // [ux0, uy0, ux1, uy1, ...]
  nodalStrains: { exx, eyy, exy }[]
  elementStrains: { exx, eyy, exy }[]
  sampleStrain: (x: number, y: number) => { exx, eyy, exy }
}
```

### FEA Viewers

| Component | Purpose |
|-----------|---------|
| `CstFeaViewer.tsx` | Shared 3D viewer for CST solutions; modes: mesh / strain contour / deformed / boundary; strain key selectable (exx/eyy/exy) |
| `BinobeamFeaViewer.tsx` | Binocular beam FEA result viewer with strain profile line graph |
| `StrainFieldViewer.tsx` | 2D canvas heatmap for strain field; blue→red color scale; gage markers |
| `StepMeshViewer.tsx` | STEP CAD mesh import and 3D visualization |

### `CantileverFeaSolution` import note
`CantileverFeaSolution` is exported from `cantileverSolver.ts`, **not** from `cantilever.ts`. Getting this wrong is a recurring mistake.

---

## Component Architecture

### App Shell (`App.tsx`)
- Global state: `unitSystem` (SI/US), `selectedCalcKey`, help modal open/closed
- No `selectedCalcKey`: renders `TransducerGallery` (icon grid with search and category filter)
- `selectedCalcKey` set: renders `WorkspaceRouter`
- `ProjectPanel` handles save/load of `.tcalc.json`
- `WorkflowWizard` is a 3-step guided flow: Design → Compensation → Trim

### WorkspaceRouter (`WorkspaceRouter.tsx`)
Dispatch switch from `calcKey` → calculator component. Passes `{ unitSystem, onUnitChange }` to all calculators. See Calculator Inventory tables above for the complete routing map.

### 2D Diagram Components (`components/diagrams/`)
One SVG engineering sketch per transducer type. Standards for all diagrams:
- Orthographic views (side + top)
- Dimensions with witness lines and tick marks
- Centerlines (dashed)
- Load arrows (red) and support hatching (gray hatch fill)
- Gage location rectangles: orange = active +ε, blue = active −ε, gray = passive
- Labelled annotations for key dimensions

Current diagram files: `CantileverDiagram`, `DualBeamDiagram`, `ReverseBeamDiagram`, `ReverseBeamBridgeDiagram`, `SBeamDiagram`, `SquareColumnDiagram`, `RoundSolidColumnDiagram`, `RoundHollowColumnDiagram`, `SquareShearDiagram`, `RoundShearDiagram`, `RoundSBeamShearDiagram`, `TorqueHollowSketch2D`, `TorqueHollow3D`, `CrossBeamSketch2D`, `HexapodSketch2D`, `JTSSketch2D`, `BinocularStrainProfile`.

`BinocularSketch2D.tsx` lives in `components/` (not `diagrams/`) because it consumes the shared geometry model.

### 3D Model Preview Components (`components/`)
One `*ModelPreview.tsx` per transducer type using Three.js / `@react-three/fiber`:
`CantileverModelPreview`, `BinocularModelPreview`, `DualBeamModelPreview`, `ReverseBeamModelPreview`, `SBeamModelPreview`, `SquareColumnModelPreview`, `RoundSolidColumnModelPreview`, `RoundHollowColumnModelPreview`, `SquareShearModelPreview`, `RoundShearModelPreview`, `RoundSBeamShearModelPreview`, `SquareTorqueModelPreview`, `RoundSolidTorqueModelPreview`, `RoundHollowTorqueModelPreview`, `PressureModelPreview`, `HexapodModelPreview`, `JTSModelPreview`, `ThreeBeamModelPreview`.

### Binocular Beam Workspace — reference architecture
The binocular beam path demonstrates the preferred multi-view architecture for geometry-rich calculators:

| File | Role |
|------|------|
| `domain/binocularGeometry.ts` | Single shared geometry builder; all views consume this |
| `BinocularSketch2D.tsx` | 2D engineering sketch driven by shared geometry |
| `BinocularModelPreview.tsx` | 3D visualization driven by shared geometry |
| `BinobeamFeaViewer.tsx` | FEA result viewer |
| `BinocularBeamWorkspace.tsx` | Workspace orchestrating all views with tab/mode switching |

Use this pattern for any new calculator that has geometry + sketch + FEA.

---

## Workflow Orchestrator (`domain/orchestrator.ts`)

Stateless. Three top-level functions:

### `runDesign(input: DesignInput): DesignResult`
Dispatches on `input.type`. Supports 18 transducer types:
`cantilever`, `reverseBeam`, `dualBeam`, `binoBeam`, `sBeam`, `squareColumn`, `roundSolidColumn`, `roundHollowColumn`, `squareShear`, `roundShear`, `roundSBeamShear`, `squareTorque`, `roundSolidTorque`, `roundHollowTorque`, `pressure`, `sixAxisFTCrossBeam`, `jointTorqueSensor`, `hexapodFT`.

Cantilever is the most complex path: computes min/max/avg strain, gradient, natural frequency; applies Wheatstone bridge gain (quarter/halfBending/fullBending/poissonHalf/poissonFullTop/poissonFullDifferential); returns `fullSpanSensitivity`.

### `runCompensation(input: CompensationInput): CompensationResult`
Dispatches on compensation type: `zeroVsTemp`, `zeroBalance`, `spanTemperature2Pt`, `spanTemperature3Pt`, `spanSet`, `optimalShunt`, `simultaneousSpan`.

### `realizeTrim(input: TrimInverseInput): TrimInverseResult`
Maps measurement → ladder network rung state (boolean array) via greedy solver for five topology families.

---

## Project Persistence

- Format: `.tcalc.json` (pretty-printed JSON, schema v1.0)
- No backend; download/upload via browser File API
- Schema: `{ meta: { schemaVersion, savedAt, description? }, unitSystem, selectedCalcKey, inputs: Record<calcKey, Record<field, value>> }`
- Only stores inputs for calculators the user has visited
- Entry points: `ProjectPanel.tsx` (UI), `projectSchema.ts` (types + validation), `persistence.ts` (hooks)

---

## Test Coverage

**1096 tests / 57 files** as of April 2026.

Key files by area:

| Area | File | Tests |
|------|------|-------|
| 6-DOF F/T cross-beam | `sixAxisForceTorque.test.ts` | 86 |
| Ladder trim solver | `ladderResistorsSolver.test.ts` | 71 |
| Hexapod F/T | `hexapodFT.test.ts` | 50 |
| Wheatstone bridges | `bridges.test.ts` | 36 |
| Unit conversions | `convert.test.ts` | 37 |
| Zero vs. temp | `zeroVsTemp.test.ts` | 37 |
| TC ratio | `TCRatio.test.ts` | 31 |
| Wire 2-point calibration | `wire2pt.test.ts` | 33 |
| Orchestrator integration | `orchestrator.test.ts` | 33 |
| Joint torque sensor | `jointTorqueSensor.test.ts` | 27 |
| Span 3-point | `spanTemperature3Pt.test.ts` | 26 |

Tests currently thin (smoke-only; worth expanding):
- `pressure.test.ts` (2), `domain.test.ts` (9), `feaCantilever.test.ts` (2), `binobeamFea.units.test.ts` (5)

---

## Architecture Rules

### 1. Domain first
Put engineering logic in `transcalc-web/src/domain/`. That includes formulas, validation, unit normalization, inverse solving, FEA solving, and geometry builders consumed by multiple views. Do not bury calculation logic in React components.

### 2. UI should compose, not invent math
React components should gather inputs, call domain functions, render results, and provide view-mode switching. They must not duplicate formulas or silently reinterpret units.

### 3. Prefer canonical shared models
When multiple views represent the same physical object, create one shared intermediate model and have all views consume it. The binocular beam (`binocularGeometry.ts`) is the reference example. Reuse this pattern for any new geometry-rich calculator.

### 4. Delphi is a reference, not an implementation template
Use Delphi code to verify formulas, bridge conventions, warning thresholds, and naming. Do not port Delphi structure mechanically.

---

## Preferred Implementation Strategy

When building new features, follow this order:

1. Define or update the domain contract (types + function signatures).
2. Add tests for the new behavior.
3. Implement the domain module.
4. Build a shared geometry/result model if multiple views need it.
5. Update the UI to consume the shared model.
6. Verify: targeted tests → full test suite → build.
7. Update this file if the workflow, architecture, or verification story changed.

Do not start by patching UI details if the underlying data contract is still unstable.

---

## Visualization Guidance

### Preferred viewer pattern
For any transducer with geometry + analysis, aim for a single workspace with explicit modes:
`Geometry` / `Sketch` / `Mesh` / `Results` / `Deformed` / `Boundary`

### 2D sketches
Must look like engineering drawings, not decorative illustrations:
- Orthographic side + top views
- Dimensions with witness lines and tick marks
- Centerlines (dashed)
- Load arrows and support hatching
- Gage rectangles color-coded by role
- Annotations for radius, spacing, thickness, etc.

All geometry must be driven from the domain model. Do not hard-code pixel values unrelated to actual input parameters.

### 3D viewers
Use Three.js / `@react-three/fiber`. Expose camera presets, dimension toggles, gage visibility. Avoid purely decorative detail.

### FEA viewers
Standardize on `CstFeaViewer.tsx` where possible. Target a reusable result schema (nodes, elements, nodal/element fields, displacements, BCs, loads, probe metadata). The binocular beam FEA path is the experimental pathfinder, not the finished framework.

---

## Known Problems / Traps

### 1. Optional WASM import breaks `tsc --noEmit`
`src/wasm/wasmLoader.ts` imports `../../wasm/pkg` which does not exist on a normal checkout. `npx tsc --noEmit` fails on this. Do not misread it as a regression from recent feature work.

### 2. Sandbox limitations can cause false negatives
Vite/Vitest/esbuild may fail inside the sandbox with `spawn EPERM`. Rerun outside the sandbox if verification is uncertain.

### 3. The worktree may already be dirty
Expect in-flight changes. Do not revert them unless explicitly asked.

### 4. `transcalc-web/README.md` is stale
It is starter content. This file (`CLAUDE.md`) is the authoritative reference.

### 5. `CantileverFeaSolution` import location
Import from `cantileverSolver.ts`, **not** from `cantilever.ts`. Getting this wrong is a recurring mistake.

### 6. Binocular beam geometry constraint
`centerSlotHalfHeight = H/2 − r − t_min`. When this exceeds `r`, the geometry is degenerate — the slot is wider than the holes and no tangent connection exists. The domain does not currently validate this. The sketch guards against it: `tdx = Math.sqrt(Math.max(0, rPx² − (cY−sT)²))` and slot wall lines only render when `tdx > 0`.

---

## Verification Commands

```bash
cd transcalc-web
npm test -- --run          # must pass (currently 1096 / 57 files)
npm run build              # must pass cleanly
npx tsc --noEmit           # one known WASM failure expected; anything else is new
```

For focused work, run a single test file first:
```bash
npm test -- --run src/tests/sixAxisForceTorque.test.ts
```

---

## Coding Rules

- Keep TypeScript strict. Avoid `any`.
- Prefer named exports.
- Keep business logic out of React components.
- Do not modify `delphi_source/`.
- Do not hard-code US/SI assumptions in domain logic.
- If you add a new shared viewer/data contract, keep it explicit and typed.
- If multiple components need the same derived geometry or solver metadata, extract it.

---

## What To Optimize For

Optimize for:
- Correctness over visual polish
- Reusable domain contracts over one-off component hacks
- Parity with legacy formulas where needed
- Engineering interpretability in viewers
- Targeted tests before broad edits
- Convergence toward shared geometry and shared FEA result schemas

Do not optimize for:
- Copying Delphi structure verbatim
- Ad hoc UI logic that bypasses domain modules
- Isolated viewer implementations that cannot be reused elsewhere

---

## Short Decision Heuristics

| Situation | Action |
|-----------|--------|
| Task touches formulas | Work in `src/domain/` first |
| Task touches multiple views of the same part | Create or update a shared geometry/result model first |
| Task touches mesh or contour rendering | Move toward `CstFeaViewer` reuse, not a one-off scene |
| Task changes workflow behavior | Inspect `orchestrator.ts` and `WorkflowWizard.tsx` |
| Verification command fails | Determine whether it is the known WASM problem, a sandbox issue, or a real regression |

---

## Maintenance

Update this file when any of the following changes:
- Active architecture patterns or canonical viewer contracts
- Calculator inventory (new `calcKey` added or removed)
- Domain module inventory (new file or renamed key export)
- FEA solver inventory
- Verification story (test counts, known failures)
- Major workflow structure
