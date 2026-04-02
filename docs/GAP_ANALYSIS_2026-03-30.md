# Gap Analysis: Delphi to TypeScript Porting

This document outlines the findings of a gap analysis between the legacy Delphi source codebase and the new TypeScript/Web implementation.

## 1. Missing Source Mapping (Delphi Files Not Ported)

The following groups of files were identified as missing from the initial cross-reference or lacking an equivalent implementation in TypeScript:

### A. Bridge Sub-directory (`delphi_source/Transcalc/Bridge/`)
The original application has specialized bridge configuration handlers that are more granular than the current `transcalc-web/src/domain/bridges.ts`:
- `linear.pas` (Linear Bridge)
- `fulltwo.pas` (Full-Two opposite arms)
- `fullfour.pas` (Full-Four configuration)
- `twoAdj.pas` (Two adjacent arms)
- `nonline.pas` (Non-linear bridge effects)
- **Gap:** While `bridges.ts` in TS has functions for these, the specific sensitivity and nonlinearity calculations in `nonline.pas` and `twoAdj.pas` need to be verified for parity.

### B. Persistence & Serialization (`ACSTREAM.PAS`, `logstrm.pas`, `logitem.pas`)
Delphi uses custom object streams (`TStream`) for saving project data.
- **Gap:** Currently, `transcalc-web/src/domain/projectSchema.ts` defines the data model, but there is no "Orchestrator" or "Storage Service" that handles the legacy project conversion or session persistence in the same way.

### C. Visual/Drawing Logic (`Drawings/`, `*.WMF`)
The Delphi source contains many Windows Metafiles (`.WMF`) and a `Drawings/` folder.
- **Gap:** The web version lacks a strategy for rendering these diagrams (e.g., SVG, Canvas, or WebGL-based component for load cell geometry visualization).

### D. Missing Logical Units
- `SETD01.PAS`: Specific configuration/settings logic for "D01" style load cells.
- `register.pas`: Licensing/User registration logic (likely deferred for web).

## 2. Incomplete Domain Porting

### A. Practical Limit Validation
Delphi calculation units (e.g., `SBBEAM.PAS`, `RINGBB.PAS`) contain "Impossibility" or "Impractical" checks (e.g., `if Height/Width < 5 then ShowWarning`).
- **Gap:** The TS domain files contain core formulas but only partial implementation of these validation heuristics.

### B. Multi-Language Strings (`STRINGS.RC`, `Strings.inc`)
Delphi uses resource files for all UI strings.
- **Gap:** The TS version currently uses hardcoded strings in its domain models or mock UI. A localization (i18n) strategy is required.

## 3. New Features in TypeScript (No Delphi Ancestor)

The TS project includes the following enhancements that were not present in the original Delphi source:
- `fatigue.ts`: Fatigue life estimation.
- `fea/`: Mini Finite Element Analysis engine for stress concentrations.
- `inverse/`: Iterative solvers for reverse engineering load cell geometry from target strain.

## 4. Prioritized Action Items

1.  **Verification of Bridge Formulas**: Compare `nonline.pas` and `twoAdj.pas` against `bridges.ts`.
2.  **Persistence Layer**: Implement a JSON-based load/save service to replace the old `TStream` logic.
3.  **Visualization Strategy**: Decide on an SVG-based approach to replace legacy `.WMF` graphics for geometry previews.
4.  **Practical Heuristics**: Port the warning/validation thresholds from Pascal `Calculate` routines into TS `validators`.
5.  **Sub-folder Refinement**: Update the [DELPHI_TS_CROSS_REFERENCE.md](../docs/DELPHI_TS_CROSS_REFERENCE.md) to explicitly include the `Bridge/` and `wire/` subdirectories.

---
*Generated: March 30, 2026*