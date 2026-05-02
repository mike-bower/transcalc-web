# Transcalc Agent Guide

This file is the working guide for Claude Code or any coding agent modifying this repository. It is the source of truth for the current product surface, architecture, and extension strategy.

Last verified: May 2026 — 1117 tests passing / 58 files.

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
- **3D FEA infrastructure** — T10 tetrahedral solver running in a Web Worker; wired into Cantilever, Square Column, Binocular, and 6-DOF Cross-Beam calculators; `FeaViewer3D` with jet color scale bar and XYZ axes widget
- **1117 tests** / 58 files, all passing
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
| `materials.ts` | Material property database (60+ materials: E, ν, ρ, yield, temp limits, figure-of-merit); `getMaterial(id)`, `MATERIALS` array |
| `materialAppearance.ts` | PBR appearance lookup for 3D previews; `getMaterialAppearance(id?)`, `makeBodyMaterial(id?, overrides?)`, `swatchStyle(hex, size)`; `CATEGORY_ORDER` for modal grouping |
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

FEA lives in two tiers: the original 2D CST plane-stress solvers (reference / legacy), and the current 3D T10 tetrahedral solver (production, runs in a Web Worker).

### 3D FEA infrastructure (current, production)

| File | Purpose |
|------|---------|
| `domain/fea/sparseMatrix.ts` | CSR sparse matrix + PCG solver with progress callbacks every 200 iterations |
| `domain/fea/paramMesh.ts` | Parametric hex→T10 mesh generator; `maskFn` for arbitrary void geometry; optional `yPositions`/`zPositions` for non-uniform node spacing; exports `Tet10Mesh` |
| `domain/fea/tet10Solver.ts` | T10 element stiffness, global assembly, penalty BCs, nodal strain recovery, von Mises |
| `domain/fea/feaWorker.ts` | Web Worker entry point; reconstructs `maskFn` from serialized params; computes graded node positions for `'round'`/`'round-hollow'` masks via `gradePositions()`; posts `progress` / `result` / `error` messages; transfers typed arrays zero-copy |
| `hooks/useFeaSolver.ts` | React hook wrapping the worker lifecycle; exposes `{ solve, solving, progress, solved, error, reset }` |
| `components/FeaViewer3D.tsx` | Three.js 3D result viewer; jet color scale bar (bottom-left), XYZ axes widget (bottom-left), scalar field selector, deformation scale, wireframe toggle |
| `components/FeaProgressPanel.tsx` | Shared progress display panel with PCG iteration bar; used by all *Fea3DCalc sub-components |

**Mask types** (`feaWorker.ts`): `'none'` | `'binocular'` (two cylindrical holes) | `'crossbeam'` (Maltese-cross hub+arms) | `'sbeam'` (two offset holes) | `'threebeam'` (3-arm 120° hub) | `'round'` (solid cylinder) | `'round-hollow'` (annular tube) | `'dualbeam'` (two parallel beam strips) | `'shearweb'` (I-section flanges+web).

**Circular section grading**: `'round'` and `'round-hollow'` masks automatically receive density-graded `yPositions`/`zPositions` (via `gradePositions()` in `feaWorker.ts`) that cluster nodes near the cylinder boundary. Spread is `r × 0.4` for solid sections and `max(wall × 0.5, outerR × 0.1)` for hollow sections. All other masks use uniform node spacing.

**FEA sub-components** (one per calculator that has 3D FEA):

| Component | Calculator | Load case |
|-----------|------------|-----------|
| `CantileverFea3DCalc.tsx` | CantileverCalc | Transverse Fy at tip |
| `SquareColumnFea3DCalc.tsx` | SquareColumnCalc | Axial Fx compression |
| `BinocularFea3DCalc.tsx` | BinocularBeamWorkspace | Transverse Fy bending |
| `CrossBeamFea3DCalc.tsx` | SixAxisFTCalc | Axial Fz at hub |

### 2D CST solvers (legacy, still used for 2D strain field views)

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

### 2D FEA viewers

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

### Calculator UX pattern (all calculators)

Every calculator follows this section order — **do not deviate**:

1. **Controls bar** (`workspace-controls`) — SI/US toggle; Analytical|3D FEA mode toggle if the calc has 3D FEA; any calc-specific toggles (e.g. Bending-null).
2. **Diagrams** — 2D engineering sketch + bridge wiring diagram; analytical mode only; default **open**.
3. **Inputs** — always visible in both modes; uses `SectionToggle` from `components/SectionToggle.tsx`; default **open**. `MaterialSelector` is the **mandatory first element** inside the Inputs grid for every design calculator (see Material System section below).
4. **Results / Design Metrics** — analytical numbers; hidden in 3D FEA mode; default **open**.
5. **3D FEA sub-component** — rendered after Inputs when `mode === '3d-fea'`; not shown in analytical mode.
6. **3D Model** — parametric preview; default **closed**.
7. **Calibration Export / Advanced** — bottom of page; default **closed**.

**Shared `SectionToggle` component** lives at `components/SectionToggle.tsx`. Import it with `import SectionToggle from '../SectionToggle'`. Do **not** define a local copy inside a calculator file.

#### Material wiring (mandatory for every design calculator)

Every design calculator must wire the material selector end-to-end in exactly this pattern:

```typescript
// 1. State (top of component, alongside other inputs)
const DEFAULT_MATERIAL_ID = 'steel-4340'   // or whichever is most appropriate
const [materialId, setMaterialId] = useState(DEFAULT_MATERIAL_ID)

// 2. Material lookup (after result useMemo, before JSX)
const mat = getMaterial(materialId)   // NEVER a partial alias like { densityKgM3, yieldMPa }

// 3. MaterialSelector — first element inside the Inputs grid
<MaterialSelector
  materialId={materialId}
  unitSystem={unitSystem}
  onSelect={sel => setMaterialId(sel.id)}
/>

// 4. Pass materialId to the 3D preview
<XxxModelPreview ... materialId={materialId} />
```

`mat` provides `mat.name`, `mat.eGPa`, `mat.densityKgM3`, `mat.yieldMPa`, `mat.nu`.
Do **not** partially destructure material props and alias them as `mat` — this omits `name` and causes a runtime crash.

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

### Material System

The material system spans domain, context, and UI layers. All three must be consistent.

#### Domain layer

| File | Role |
|------|------|
| `domain/materials.ts` | Built-in material database; `getMaterial(id)` is the authoritative lookup |
| `domain/materialAppearance.ts` | PBR appearance table keyed by material ID; `makeBodyMaterial(id?)`, `swatchStyle(hex, size)`, `CATEGORY_ORDER` |

`makeBodyMaterial(materialId?)` returns a `THREE.MeshStandardMaterial` with realistic PBR values (color, roughness, metalness). Import it in every `*ModelPreview.tsx`. If `materialId` is unknown, it falls back to `DEFAULT_APPEARANCE` (gray metal).

#### Context layer (`components/MaterialContext.tsx`)

Wraps the built-in database with user overrides and hides, stored in `localStorage`:

| Key | Content |
|-----|---------|
| `transcalc_material_overrides` | JSON `Record<id, Partial<Material>>` — shadows built-ins |
| `transcalc_hidden_materials` | JSON `string[]` — suppresses built-ins from dropdowns |
| `transcalc_user_materials` | JSON `UserMaterial[]` — fully user-defined entries |

Provides: `allMaterials`, `addMaterial`, `editMaterial`, `deleteMaterial`, `resetBuiltIn`, `restoreBuiltIn`, `isBuiltIn`, `isModified`, `isHiddenBuiltIn`.

`allMaterials` = built-ins (with overrides applied, hidden filtered out) + user materials. This is the source of truth for `MaterialSelector`.

#### UI layer

| Component | Role |
|-----------|------|
| `components/MaterialSelector.tsx` | Dropdown + swatch sphere + "Library" button; first element of every design calc's Inputs section |
| `components/MaterialLibraryModal.tsx` | Full-screen modal; searchable; category-grouped; per-row Edit/Reset/Hide/Restore/Select actions; editor sub-modal for creating or modifying materials |

`MaterialSelector` emits `MaterialSelection` on change: `{ id, name, eGPaDisplay, nu, densityKgM3, yieldMPa }`. Calculators should call `setMaterialId(sel.id)` and derive all properties from `getMaterial(materialId)`, not from the selection object.

#### Adding a new design calculator — material checklist

- [ ] `useState` for `materialId` initialized to a sensible default (e.g. `'steel-4340'`)
- [ ] `<MaterialSelector>` as the first element inside the Inputs `SectionToggle`
- [ ] `const mat = getMaterial(materialId)` — **full object, not destructured alias**
- [ ] `materialId` in the `useMemo` dependency array for any result that depends on E, ν, or density
- [ ] `materialId={materialId}` passed to the `*ModelPreview` component
- [ ] `makeBodyMaterial(materialId)` called inside the preview; `RoomEnvironment` wired (see 3D viewer section)

---

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

**1117 tests / 58 files** as of April 2026.

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

Use raw Three.js (not `@react-three/fiber`) with a `useEffect`-managed render loop and a `useRef` host div. Every `*ModelPreview.tsx` must follow the standards below exactly so all previews are visually consistent.

#### Scene

| Property | Value |
|----------|-------|
| Background | `new THREE.Color(0xffffff)` |
| Ambient light | `AmbientLight(0xffffff, 0.75)` |
| Directional light | `DirectionalLight(0xffffff, 1.0)`, position `(4, 5, 3)` |
| Floor grid | `GridHelper(6, 14, 0xcccccc, 0xeeeeee)` — scale size up for large models |

For models larger than ~100 mm in any dimension, scale the GridHelper proportionally (e.g. `size = 8, divisions = 16`), but keep the same grid colors.

#### Camera

| Property | Value |
|----------|-------|
| Type | `PerspectiveCamera` |
| FOV | `45` |
| Near / Far | `0.1` / `100` |
| Initial position | Set per-model so the geometry fills ~60–70% of the viewport |

#### OrbitControls

```typescript
controls.enableDamping = true
controls.dampingFactor = 0.08
controls.enablePan = true
controls.enableZoom = true
```

Always call `controls.update()` each animation frame when damping is enabled.

#### Renderer

```typescript
renderer.setPixelRatio(window.devicePixelRatio)
renderer.setSize(host.clientWidth, host.clientHeight)
renderer.shadowMap.enabled = false   // keep performance predictable

// Immediately after setSize — required for realistic material appearance:
const pmrem = new THREE.PMREMGenerator(renderer)
scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture
pmrem.dispose()
```

Import `RoomEnvironment` from `three/examples/jsm/environments/RoomEnvironment.js`.

#### Container / overlay

```tsx
// Outer wrapper
<div style={{ position: 'relative', width: '100%', height: '100%', minHeight: 0, overflow: 'hidden' }}>
  {/* Canvas mount point */}
  <div ref={hostRef} style={{ height: '100%', border: 'none', background: 'transparent' }} />
  {/* Control overlay — top-right */}
  <div style={{
    position: 'absolute', top: 10, right: 10, zIndex: 10,
    backgroundColor: 'rgba(30,41,59,0.7)', padding: '4px 8px',
    borderRadius: 4, fontSize: 11, display: 'flex', alignItems: 'center', gap: 6,
    border: '1px solid rgba(71,85,105,0.5)', color: '#f8fafc', pointerEvents: 'auto',
  }}>
    …toggle buttons…
  </div>
</div>
```

Toggle buttons (active / inactive):
- Active: `border: '1px solid rgba(96,165,250,0.7)'`, `background: 'rgba(37,99,235,0.55)'`
- Inactive: `border: '1px solid rgba(71,85,105,0.4)'`, `background: 'rgba(51,65,85,0.35)'`
- Text: `color: '#f8fafc'` in both states

#### Material palette

**Main body — do not hardcode; use `makeBodyMaterial(materialId)`.**

```typescript
import { makeBodyMaterial } from '../domain/materialAppearance'

// Inside useMemo or useEffect where geometry is built:
const bodyMat = makeBodyMaterial(materialId)   // PBR properties derived from selected material
```

`makeBodyMaterial` returns a `THREE.MeshStandardMaterial` whose color, roughness, and metalness reflect the chosen engineering material (steel, aluminium, titanium, BeCu, etc.). Combine it with the `RoomEnvironment` above for specular reflections.

Non-body roles keep fixed colors:

| Role | Color | Roughness | Metalness |
|------|-------|-----------|-----------|
| Secondary / flanges | `makeBodyMaterial(materialId)` with `color` darkened 15% | 0.50 | 0.15 |
| Active gage (+ε) | `0xf0a451` | 0.55 | 0.06 |
| Active gage (−ε) | `0x51a4f0` | 0.55 | 0.06 |
| Passive gage | `0x8aa7be` | 0.55 | 0.05 |
| Force / load arrow | `0xff4444` (red) | — | — |
| Dimension lines | `0x5898c8`, opacity 0.9 | — | — |

`materialId` must be in the `useMemo`/`useEffect` dependency array so the preview re-renders when the material changes.

#### Controls exposed per preview

Every preview must expose at minimum:
- **Dimensions** toggle — shows/hides dimension annotation sprites and lines
- **Forces & BCs** toggle — shows/hides load arrows and support indicators

Additional toggles (e.g. Gages, Section) are encouraged where relevant.

#### What to avoid

- Do not hard-code geometry sizes unrelated to the actual input parameters.
- Do not hard-code the body material color — always use `makeBodyMaterial(materialId)` so the preview reflects the selected engineering material.
- Do not omit `RoomEnvironment` setup — without it, `MeshStandardMaterial` renders flat and metalness has no effect.
- Do not add decorative lighting effects (bloom, tone-mapping, shadows) that are not present in other previews.
- Do not use `@react-three/fiber`; all previews use raw Three.js for consistency.

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

### 6. `getMaterial(materialId)` — never use a partial alias
Calculator components that reference material properties in JSX (e.g. `mat.name` for the yield safety factor row) must declare `const mat = getMaterial(materialId)` — the full object returned by the domain lookup. A partial destructured alias like `const mat = { densityKgM3, yieldMPa }` silently omits `name` and other fields, causing a runtime "mat is not defined" or "mat.name is not a function" crash. This bug has already been fixed in SixAxisFTCalc, HexapodFTCalc, and ThreeBeamFTCalc — do not reintroduce it. The `'custom'` built-in material entry has been removed. User-defined materials are created and managed via the Library button in `MaterialSelector` → `MaterialLibraryModal`.

### 7. Binocular beam geometry constraint
`centerSlotHalfHeight = H/2 − r − t_min`. When this exceeds `r`, the geometry is degenerate — the slot is wider than the holes and no tangent connection exists. The domain does not currently validate this. The sketch guards against it: `tdx = Math.sqrt(Math.max(0, rPx² − (cY−sT)²))` and slot wall lines only render when `tdx > 0`.

---

## Verification Commands

```bash
cd transcalc-web
npm test -- --run          # must pass (currently 1117 / 58 files)
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
| Adding or editing a calculator section | Follow the UX pattern: Controls → Diagrams → Inputs → Results → 3D Model; use shared `SectionToggle` |
| Adding collapsible sections to a calculator | Import from `components/SectionToggle.tsx`; defaults: Diagrams/Inputs/Results open, 3D/Calibration closed |
| Adding a new design calculator | Follow the material checklist in the Material System section: `materialId` state, `MaterialSelector` first in Inputs, `const mat = getMaterial(materialId)`, `materialId` prop on `*ModelPreview` |
| Adding a new `*ModelPreview.tsx` | Call `makeBodyMaterial(materialId)` for body mesh; wire `RoomEnvironment` after `renderer.setSize()`; add `materialId` to deps array |
| Material appears wrong in 3D preview | Check: (1) `RoomEnvironment` wired, (2) `makeBodyMaterial(materialId)` used (not hardcoded color), (3) `materialId` in `useMemo`/`useEffect` deps |
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
