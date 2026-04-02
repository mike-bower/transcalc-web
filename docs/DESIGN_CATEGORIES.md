# Transducer Design Categorization

This document classifies the various transducer designs from the legacy Delphi `Transcalc` codebase into logical categories for the modern TypeScript/Web implementation.

## 1. Bending Beams
These designs rely on cantilever or simply-supported bending mechanics.

| Type | Delphi Source | TS Module | Description |
| :--- | :--- | :--- | :--- |
| **Cantilever** | `bbcant.pas` | `beams.ts` | Single cantilever with gage at root. |
| **Binocular Beam** | `BINO.PAS` | `binobeam.ts` | Dual-hole bending beam for high sensitivity. |
| **Dual Bending** | `DUALBB.PAS` | `dualbeam.ts` | Parallel flexure system. |
| **Reverse Bending** | `REVBB.PAS` | `reversebeam.ts` | Simply supported beam with center load. |
| **Ring Bending** | `ringbb.pas` | `ringbb.ts` | Proving ring / circular bending. |
| **S-Beam** | `SBBEAM.PAS` | `sbeam.ts` | S-shaped bending flexure. |

## 2. Columns (Axial)
These designs measure axial compression or tension in a vertical member.

| Type | Delphi Source | TS Module | Description |
| :--- | :--- | :--- | :--- |
| **Square Column** | `SQRCOL.PAS` | `sqrcol.ts` | Solid square section axial pillar. |
| **Round Solid** | `RNDSLDC.PAS` | `rndsldc.ts` | Solid round section axial pillar. |
| **Round Hollow** | `RNDHLWC.PAS` | `rndhlwc.ts` | Hollow round section (tube) axial pillar. |

## 3. Shear & Torque
These designs measure transverse shear strain or torsional shear.

| Type | Delphi Source | TS Module | Description |
| :--- | :--- | :--- | :--- |
| **Shear (Round)** | `shearrnd.pas` | `shear.ts` | Round beam shear strain. |
| **Shear (Square)** | `SHEARSQR.PAS` | `shear.ts` | Square beam shear strain. |
| **Shear Beam** | `SHEARSB.PAS` | `shearBeams.ts` | Specialized low-profile shear beam. |
| **Square Torque** | `SQTORQUE.PAS` | `sqtorque.ts` | Torsional strain in square shaft. |
| **Round Solid Tq** | `RNDSLDTQ.PAS` | `rndsldtq.ts` | Torsional strain in solid round shaft. |
| **Round Hollow Tq**| `RNDHLWTQ.PAS` | `rndhlwtq.ts` | Torsional strain in hollow round shaft. |

## 4. Pressure & Diaphragm
These designs measure strain on a pressurized membrane.

| Type | Delphi Source | TS Module | Description |
| :--- | :--- | :--- | :--- |
| **Diaphragm** | `diapragm.pas` | `pressure.ts` | Flat circular diaphragm. |
| **Pressure Cell** | `PRESSURE.PAS` | `pressure.ts` | Integrated pressure transducer. |

## 5. Multi-Axis (Planned)
*Note: These represent advanced designs synthesized from multiple calculation units.*

| Type | Components Used | Description |
| :--- | :--- | :--- |
| **XY Shear** | `shear.ts` | Dual-axis transverse shear sensing. |
| **Force/Torque** | `columns.ts` + `torque.ts` | Combined axial and torsional measurement. |

---
*Updated: March 30, 2026*
