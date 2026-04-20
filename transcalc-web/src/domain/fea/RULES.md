# FEA Rules

These rules apply to everything under `transcalc-web/src/domain/fea/`.

## Mission

FEA modules should evolve toward a reusable analysis framework, not isolated one-off solvers.

## Rules

- Solvers should return both engineering summary values and visualization-ready artifacts.
- Prefer result contracts that can support:
  - nodes
  - elements
  - nodal fields
  - element fields
  - displacements
  - loads
  - boundary conditions
  - probe sampling
- Keep geometry assumptions explicit in the solver contract.
- Document approximation level and important limitations in warnings.
- When possible, align result shape across transducer solvers.

## Avoid

- Returning only a single scalar when the mesh/result field is needed by the UI.
- Burying mesh-generation assumptions in viewer code.
- Encoding display-only deformation logic as if it were real solver output.

## Next-step Bias

When extending an FEA solver, prefer improving the result schema first so viewers can become reusable across calculators.
