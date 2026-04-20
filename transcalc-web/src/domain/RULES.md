# Domain Rules

These rules apply to everything under `transcalc-web/src/domain/`.

## Mission

`domain/` is the source of truth for:

- formulas
- validation
- solver behavior
- inverse solving
- geometry builders
- FEA result contracts
- workflow dispatch

## Rules

- Keep domain modules pure and deterministic.
- Do not depend on React, DOM APIs, or rendering libraries here.
- Prefer explicit input/output types over loose records unless building a shared geometry adapter.
- Put shared geometry derivation here when more than one component needs it.
- Validate inputs close to the domain boundary.
- Keep unit conversion obvious and testable.
- Preserve legacy engineering behavior where Delphi parity matters.

## File Design

- One module should do one engineering job well.
- If several components need the same derived geometry or result metadata, extract it into a dedicated builder module.
- If a solver returns data for visualization, expose enough metadata for mesh, contour, displacement, and probes rather than only a final scalar answer.

## Testing

- Add or update tests whenever formulas, validation, or solver contracts change.
- Prefer direct domain tests over UI tests for engineering behavior.
