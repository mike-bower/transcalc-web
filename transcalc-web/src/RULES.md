# Source Rules

These rules apply to everything under `transcalc-web/src/`.

## Purpose

This source tree implements a web-based engineering application, not a generic dashboard. Optimize for correctness, reuse, and interpretability.

## Global Rules

- Put engineering logic in `domain/`, not in React components.
- Treat Delphi as a formula/parity reference, not a structural template.
- Prefer shared typed contracts when multiple views represent the same thing.
- Keep unit handling explicit and centralized.
- Do not introduce hidden conversions or UI-only business rules.
- Prefer targeted tests for touched behavior before broader verification.

## Preferred Build Order

1. Define or update the domain contract.
2. Add or update tests.
3. Implement the domain logic.
4. Update components to consume the domain contract.
5. Run targeted tests and `npm run build`.

## Known Verification Caveat

`npx tsc --noEmit` currently fails because `src/wasm/wasmLoader.ts` references an optional generated WASM package that may not exist on a clean checkout.
