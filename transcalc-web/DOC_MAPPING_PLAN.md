# Web Implementation Plan: Documentation Mapping & Validation

This plan outlines the mapping of Delphi documentation (CHM) to the TypeScript/Web implementation, focusing on validating the engineering logic and adding missing documentation-driven constraints.

## 1. Core Engineering Logic Validation (Binocular Beam)
**Source**: `bending_beam___binocular_element.htm`, `BINO.PAS`
**Target**: `transcalc-web/src/domain/binobeam.ts`

### Comparison of Calculation Formulas
| Constant/Formula | Delphi Implementation (`BINO.PAS`) | TypeScript Implementation (`binobeam.ts`) | Parity |
|---|---|---|---|
| **g** (Hole Distance) | `(H/2) - (r + t_min)` | `H / 2 - (r + t_min)` | ✅ |
| **K2** | `(H/2) - g` | `H / 2 - g` | ✅ |
| **K1** | `L_hd / (H - (H - 2r - 2g)/2)` | `L_hd / (H - (H - 2*r - 2*g)/2)` | ✅ |
| **Iteration count** | 1000 steps | 1000 steps | ✅ |
| **Avg Strain** | `Abs(strainSum / 1000)` | `Math.abs(strainSum / iterations)` | ✅ |

### Missing Documentation Constraints (To be added)
The CHM documentation specifies warning/error thresholds that should be surfaced in the UI and validated in the domain logic:
1. **Nominal Gage Strain Warning**: If strain > 1700 µ-strain, show advisory.
2. **Critical Strain Error**: If strain > 5000 µ-strain, block bridge output calculation.
3. **Strain Variation Warning**: If gradient > 15%, show performance advisory.
4. **Aspect Ratio Error**: If `DistanceBetweenHoles / BeamWidth < 2`, show recommended minimum ratio.

## 2. Unit System Consistency
**Source**: `bending_beam___binocular_element.htm`
**Target**: `transcalc-web/src/domain/binobeam.ts`

- **Constraint**: Documentation specifies `Modulus of Elasticity` range: `5E+6 to 50E+6 psi` (34.5 to 345 GPa).
- **Validation**: Ensure `calculateBinobeamStrainExplicit` correctly handles `Mpsi` vs `psi` vs `Pa`. Current implementation uses `modulus * 6.8947572932e9` for US mode, which correctly converts `Mpsi` to `Pa`.

## 3. Recommended Gage Offset
**Source**: `bending_beam___binocular_element.htm`
**Goal**: Surface the `zOffset` (where max strain occurs) as the "Recommended Distance Between Gage Centerlines" in the UI.

- **Current State**: `zOffset` is calculated but needs to be displayed in `BinocularBeamWorkspace.tsx`.

## 4. Implementation Tasks

### Task 4.1: Update `binobeam.ts` with Documentation-Based Warnings
- Add advisory return fields to `BinobeamOutput` for strain range and gradient.
- Implement the 5000 µ-strain cutoff for sensitivity calculation.

### Task 4.2: Update `BinocularBeamWorkspace.tsx`
- Display "Recommended Distance Between Gage CLs" using `zOffset`.
- Show visual warnings for strain (>1700) and gradient (>15%).

### Task 4.3: Add Validation Tests
- Create `transcalc-web/src/tests/binobeam.documentation.test.ts` to verify the 1700/5000 µ-strain and 15% gradient logic using documented limits.
