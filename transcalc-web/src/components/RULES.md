# Component Rules

These rules apply to everything under `transcalc-web/src/components/`.

## Mission

Components should present engineering workflows clearly while staying thin over the domain layer.

## Rules

- Components may gather input, orchestrate view state, and render results.
- Components should not invent formulas or duplicate domain calculations.
- If two or more components reconstruct the same geometry, stop and extract a shared builder in `domain/`.
- Prefer explicit viewer modes over separate disconnected widgets when showing geometry, sketch, mesh, and results for the same transducer.
- Use UI state to control presentation, not engineering meaning.

## Viewer Guidance

- 2D sketches should be drafting-style and dimensionally meaningful.
- 3D views should expose useful controls like camera presets and overlays.
- FEA viewers should make mesh, boundary conditions, and results separately inspectable.
- Favor interpretability over decorative complexity.

## Workflow Components

- `WorkflowWizard.tsx` and calculator workspaces are orchestration layers.
- Keep them compositional: call domain modules, build view models, render sections.
- If a workspace grows too large, split it into smaller input/viewer/summary panels before adding more logic.
