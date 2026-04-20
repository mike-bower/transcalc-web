# Transcalc Agent Guide

This file is the working guide for Claude Code or any coding agent modifying this repository. Treat it as the source of truth for how to extend the application safely and productively.

## Project Intent

Transcalc is a web rewrite of the legacy Borland Delphi Transcalc/Xcalc application for strain-gage transducer design, compensation, and trim realization.

The rewrite is not just a UI port. The target product is:

- a browser-based engineering design environment
- testable domain logic separated from UI code
- interactive geometry, sketch, and FEA visualization
- progressive replacement of legacy Delphi workflows with modern, reusable TS modules

## Repository Reality

- Active development happens in `transcalc-web/`
- `delphi_source/Transcalc/` is legacy reference material only
- `docs/` contains useful migration notes and audits, but the codebase is ahead of some docs
- `transcalc-web/README.md` is stale starter content and should not be used as a status guide

## Current Product Surface

The application currently includes:

- 15 design/transducer definitions in `transcalc-web/src/domain/transducerDefinitions.ts`
- 7 compensation workflows
- trim-network realization via ladder resistor solvers
- a workflow orchestrator in `transcalc-web/src/domain/orchestrator.ts`
- project persistence via JSON (`.tcalc.json`)
- multiple geometry/model preview components
- early FEA support for cantilever, binocular beam, shear web, and selected column workflows

As of April 13, 2026:

- `npm test -- --run` passes: 941 tests / 54 files
- `npm run build` passes
- `npx tsc --noEmit` is not currently clean because `src/wasm/wasmLoader.ts` imports `../../wasm/pkg` before the optional WASM bundle exists

## Architecture Rules

### 1. Domain first

Put engineering logic in `transcalc-web/src/domain/`.

That includes:

- formulas
- validation
- unit normalization
- inverse solving
- FEA solving
- workflow dispatch
- geometry builders used by multiple views

Do not bury calculation logic in React components.

### 2. UI should compose, not invent math

React components should:

- gather inputs
- call domain functions
- render results
- provide view-mode switching and interaction

React components should not:

- duplicate engineering formulas
- silently reinterpret units
- rebuild the same geometry independently in multiple places

### 3. Prefer canonical shared models

When multiple views represent the same physical object, create one shared intermediate model and have all views consume it.

Current example:

- `transcalc-web/src/domain/binocularGeometry.ts`

This pattern should be reused for:

- transducer geometry
- FEA output schemas
- gage placement metadata
- load/support boundary-condition metadata

### 4. Delphi is a reference, not an implementation template

Use Delphi code to verify:

- formulas
- bridge conventions
- warning thresholds
- naming/mapping

Do not port Delphi structure mechanically. The web version should converge on reusable TS modules, not form-specific Pascal-era fragmentation.

## Important Code Areas

### Core workflow

- `transcalc-web/src/domain/orchestrator.ts`
- `transcalc-web/src/components/WorkflowWizard.tsx`

These tie design, compensation, and trim together. Changes here affect the entire app.

### Domain

- `transcalc-web/src/domain/`
- `transcalc-web/src/domain/inverse/`
- `transcalc-web/src/domain/fea/`

Keep these modules pure and testable.

### Visualization

- `transcalc-web/src/components/`
- `transcalc-web/src/components/calculators/`
- `transcalc-web/src/components/compensation/`
- `transcalc-web/src/components/StepMeshViewer.tsx`
- `transcalc-web/src/components/BinobeamFeaViewer.tsx`

### Legacy help and persistence

- `transcalc-web/src/components/ProjectPanel.tsx`
- `transcalc-web/public/legacy-help/`
- `transcalc-web/src/domain/projectSchema.ts`
- `transcalc-web/src/domain/persistence.ts`

## Preferred Implementation Strategy

When building new features, follow this order:

1. Define or update the domain contract.
2. Add tests for the new behavior.
3. Implement or extend the domain module.
4. Build a shared geometry/result model if multiple views need it.
5. Update the UI to consume the shared model.
6. Verify with targeted tests, then broader tests/build.
7. Update this file if the workflow, architecture, or verification story changed.

Do not start by patching UI details if the underlying data contract is still unstable.

## Visualization Guidance

This app is becoming an engineering visualization tool, not just a calculator form set. That means the visual system must help the user reason about geometry, mesh, loads, gage locations, and results.

### Preferred viewer pattern

For any transducer with geometry + analysis, aim for a single viewer shell with explicit modes such as:

- `Geometry`
- `Sketch`
- `Mesh`
- `Results`
- `Deformed`
- `Boundary`

The same geometry and solver metadata should back all of them.

### 2D sketches

2D sketches should look like engineering references, not decorative illustrations.

Prefer:

- orthographic views
- dimensions
- centerlines
- support/load arrows
- gage locations
- active/passive strain labels
- detail callouts

Avoid:

- stylized strain cartoons without dimensional meaning
- geometry recreated with magic numbers unrelated to the actual inputs

### 3D viewers

3D viewers should expose controls useful for engineering review:

- camera presets
- dimensions on/off
- gages on/off
- hotspots on/off
- section or focus views where needed

Avoid 3D detail that looks impressive but does not improve interpretation.

### FEA viewers

FEA viewers should eventually standardize on one reusable result schema.

Target output shape should include:

- nodes
- elements
- nodal fields
- element fields
- displacements
- boundary conditions
- loads
- probe-ready metadata

The current binocular viewer is the experimental pathfinder, not the finished framework.

## Current Binocular Direction

The binocular beam path has been refactored toward the preferred architecture:

- shared geometry builder: `transcalc-web/src/domain/binocularGeometry.ts`
- engineering sketch: `transcalc-web/src/components/BinocularSketch2D.tsx`
- unified 3D geometry viewer: `transcalc-web/src/components/BinocularModelPreview.tsx`
- FEA mode separation: `transcalc-web/src/components/BinobeamFeaViewer.tsx`
- workspace integration: `transcalc-web/src/components/BinocularBeamWorkspace.tsx`

Use this as the model for future geometry + FEA-capable calculators.

## Known Problems / Traps

### 1. Optional WASM import breaks clean typecheck

`transcalc-web/src/wasm/wasmLoader.ts` imports `../../wasm/pkg`.

Implication:

- `npx tsc --noEmit` fails on a normal checkout unless the WASM bundle exists

Do not misread that failure as proof that recent feature work is broken.

### 2. Sandbox limitations can cause false negatives

In this environment, Vite/Vitest/esbuild may fail inside the sandbox with `spawn EPERM`.

Implication:

- if verification matters, rerun important build/test commands outside the sandbox

### 3. The worktree may already be dirty

Expect unrelated in-flight changes. Do not revert them unless explicitly asked.

### 4. Some docs lag the code

Especially:

- `transcalc-web/README.md`

Check the actual source before making assumptions.

## Verification Rules

When making nontrivial changes:

1. Run targeted tests for the touched domain/workflow area.
2. Run `npm run build`.
3. Report whether `npx tsc --noEmit` was run and whether the failure is the known WASM issue or something new.

Suggested commands:

```bash
cd transcalc-web
npm test -- --run
npm run build
npx tsc --noEmit
```

For focused work, prefer targeted Vitest runs first.

## Coding Rules

- Keep TypeScript strict.
- Avoid `any`.
- Prefer named exports.
- Keep business logic out of React components.
- Do not modify `delphi_source/`.
- Do not hard-code US/SI assumptions in domain logic.
- If you add a new shared viewer/data contract, keep it explicit and typed.
- If multiple components need the same derived geometry or solver metadata, extract it.

## What To Optimize For

Claude Code should optimize for:

- correctness over visual polish
- reusable domain contracts over one-off component hacks
- parity with legacy formulas where needed
- engineering interpretability in viewers
- targeted tests before broad edits
- convergence toward shared geometry and shared FEA result schemas

Do not optimize for:

- copying Delphi structure verbatim
- ad hoc UI logic that bypasses domain modules
- isolated viewer implementations that cannot be reused elsewhere

## Short Decision Heuristics

If a task touches formulas:

- work in `src/domain/` first

If a task touches multiple views of the same part:

- create or update a shared geometry/result model first

If a task touches mesh or contour rendering:

- move toward a reusable FEA viewer contract, not a one-off scene

If a task changes workflow behavior:

- inspect `orchestrator.ts` and `WorkflowWizard.tsx`

If a verification command fails:

- determine whether it is the known WASM problem, a sandbox issue, or a real regression

## Maintenance

Update this file when any of the following changes:

- active architecture patterns
- canonical viewer/data contracts
- verification story
- known blockers
- major workflow structure

This file should help a coding agent make good decisions without rediscovering the project structure from scratch.
