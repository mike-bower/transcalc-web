# Transcalc User Guide

Transcalc is a browser-based engineering environment for designing and compensating strain-gage transducers. It replaces the legacy Delphi Xcalc application with a modern, interactive interface.

---

## Contents

1. [Getting Started](#getting-started)
2. [The Calculator Gallery](#the-calculator-gallery)
3. [Inside a Calculator](#inside-a-calculator)
4. [Unit System — SI and US](#unit-system)
5. [Design Calculators](#design-calculators)
   - [Bending Beams](#bending-beams)
   - [Column (Axial) Transducers](#column-axial-transducers)
   - [Shear Transducers](#shear-transducers)
   - [Torque Transducers](#torque-transducers)
   - [Pressure Diaphragm](#pressure-diaphragm)
   - [Multi-Axis Force/Torque Sensors](#multi-axis-forcetorque-sensors)
6. [Compensation Calculators](#compensation-calculators)
7. [Trim Visualizer](#trim-visualizer)
8. [Project Save and Load](#project-save-and-load)
9. [Printing a Report](#printing-a-report)
10. [Help System](#help-system)

---

## Getting Started

Open Transcalc in any modern browser. The home screen shows the **Calculator Gallery** — a grid of all available transducer types organized by category. Click any card to open that calculator.

To return to the gallery from inside a calculator, click the **← back arrow** in the top-left corner next to the calculator name.

---

## The Calculator Gallery

The gallery groups calculators into eight categories:

| Category | Calculators |
|----------|-------------|
| **Bending** | Cantilever Beam, Binocular Beam, Dual Bending Beam, Reverse Bending Beam, S-Beam |
| **Column** | Square Column, Round Solid Column, Round Hollow Column |
| **Shear** | Square Shear Beam, Round Shear Beam, S-Beam Shear |
| **Torque** | Square Torque, Round Solid Torque, Round Hollow Torque |
| **Pressure** | Pressure Diaphragm |
| **Multi-Axis** | 6-DOF F/T Cross-Beam, Joint Torque Sensor, Hexapod F/T Sensor, 3-Arm F/T Cross-Beam |
| **Compensation** | Zero vs Temperature, Zero Balance, Span Temp 2-Point, Span Temp 3-Point, Shunt Optimization, Span Set, Simulated Span |
| **Trim** | Trim Visualizer |

Each card shows a miniature diagram of the transducer geometry and a one-line description.

---

## Inside a Calculator

Every design calculator follows the same layout:

### 3D Model
An interactive 3D preview of the transducer geometry. The model updates as you change input parameters, so you can visually confirm the geometry is what you intend. You can orbit, zoom, and pan with the mouse. Click **3D Model** to collapse or expand this section.

### Inputs
A grid of labeled numeric fields. All inputs accept direct typing. Fields update results immediately — there is no Compute button.

Input fields that are out of engineering range may be highlighted to indicate a problem.

### Results
A table of calculated values. Results update live as you change any input.

### 2D Sketch (Binocular Beam only)
The Binocular Beam calculator includes a full 2D engineering sketch (side view + top view) with dimensions, centerlines, gage locations, and load arrows, all driven by the input parameters.

### FEA (selected calculators)
The Binocular Beam calculator and several others include a finite-element analysis viewer. FEA mode shows mesh, strain contours, deformed shape, and boundary conditions. Switch between modes using the buttons in the viewer.

---

## Unit System

The **SI / US** toggle in the top-right corner switches the entire application between metric and US customary units. Values in all open calculators convert automatically — you do not need to re-enter numbers.

| Quantity | SI | US |
|----------|----|----|
| Length | mm | in |
| Force | N | lbf |
| Torque | N·mm | in·lb |
| Pressure | kPa | PSI |
| Modulus | GPa | Mpsi |
| Strain | µε | µε (unchanged) |
| Sensitivity | mV/V | mV/V (unchanged) |

The toggle is also available inside each calculator next to the input section.

---

## Design Calculators

Design calculators compute gage strain, sensitivity (mV/V full-span), and related design parameters for a given transducer geometry and loading.

All design calculators share the following common outputs:

- **Average gage strain** (µε) — the expected signal strain at the gage location
- **Min / Max gage strain** (µε) — strain range across the gage length (indicates gradient)
- **Full-span sensitivity** (mV/V) — bridge output at rated load, given the gage factor
- **Natural frequency** (Hz) — first resonant mode of the loaded transducer

---

### Bending Beams

#### Cantilever Beam
A beam fixed at one end with a transverse load at the free end. Gages are bonded to the top and bottom surfaces near the fixed support where bending stress is highest.

**Key inputs:** Beam length, cross-section width and height, applied force, material modulus, Poisson's ratio, gage factor, gage length, gage offset from the wall.

**Key outputs:** Min/Max/Average strain, strain gradient across gage length, natural frequency, full-span sensitivity.

---

#### Binocular Beam
A rectangular beam with two circular holes aligned along the beam centerline, connected by a narrow slot. The geometry concentrates bending stress in the thin wall above and below the holes. This is a high-sensitivity bending element used in precision load cells.

**Key inputs:** Total beam length, beam height, beam width (depth), hole radius, hole spacing, minimum wall thickness, applied force, gage length, material modulus, gage factor.

**Key outputs:** Gage strain, full-span sensitivity, natural frequency.

**Additional features:** Full 2D engineering sketch with dimensions, 3D model, FEA mode with strain contour maps.

The **minimum wall thickness** (t) is the distance from the top of each hole to the reference bending plane K2. Decreasing t concentrates more stress and increases sensitivity but reduces stiffness and may cause yielding at lower loads.

> **Geometry constraint:** The slot half-height must be less than the hole radius for a valid binocular shape. If the beam height is too large relative to hole radius and wall thickness, the calculator will still compute but the geometry becomes degenerate.

---

#### Dual Bending Beam
Two parallel beams connected at both ends, loaded at the midpoint of the connecting structure. This design is insensitive to off-center loading and is common in platform-style load cells.

**Key inputs:** Beam length, cross-section, applied force, gage position.

**Key outputs:** Gage strain, full-span sensitivity.

---

#### Reverse Bending Beam
A simply-supported beam (supported at both ends) with a center load. Gages are placed near the supports where bending stress is highest. The bending moment is opposite in sign to a cantilever, hence "reverse."

**Key inputs:** Beam length, cross-section width and height, applied force, material properties, gage position from support.

**Key outputs:** Gage strain, full-span sensitivity.

---

#### S-Beam
An S-shaped flexure element used in tension/compression load cells. The S-shape creates bending in two sections simultaneously, allowing both surfaces of the beam to carry active gages for a full-bridge output.

**Key inputs:** Beam dimensions, applied force (tension or compression), material properties, gage factor.

**Key outputs:** Gage strain, full-span sensitivity.

---

### Column (Axial) Transducers

Column transducers carry axial (compressive or tensile) loads. Gages are bonded to the column surface at 0° (active, along the load axis) and 90° (passive, Poisson compensation).

#### Square Column
A solid square-section axial pillar.

**Key inputs:** Cross-section width, active length, applied force, material modulus, Poisson's ratio, gage factor.

**Key outputs:** Axial strain (active gage), transverse strain (Poisson gage), full-span sensitivity.

---

#### Round Solid Column
A solid circular-section axial pillar.

**Key inputs:** Diameter, active length, applied force, material properties.

**Key outputs:** Same as Square Column.

---

#### Round Hollow Column
A hollow annular section axial pillar. The hollow bore reduces weight and increases the surface strain for a given load, improving sensitivity.

**Key inputs:** Outer diameter, inner diameter (bore), active length, applied force, material properties.

**Key outputs:** Axial strain, transverse strain, full-span sensitivity.

---

### Shear Transducers

Shear transducers measure the transverse shear force in a beam. Gages are oriented at ±45° to the beam axis, where principal strains from shear are maximized.

#### Square Shear Beam
A rectangular-section shear web element.

**Key inputs:** Beam length, cross-section width and height, applied shear force, gage location, material properties.

**Key outputs:** Shear strain, full-span sensitivity.

---

#### Round Shear Beam
A circular-section beam in transverse shear. The shear stress distribution across a circular section is non-uniform; the calculator accounts for this.

**Key inputs:** Diameter, active length, applied force, material properties.

---

#### S-Beam Shear
An S-beam used in shear mode rather than bending mode. The gage orientation is ±45°.

---

### Torque Transducers

Torque transducers measure applied torsional moment. Gages are oriented at ±45° to the shaft axis where shear stress from torque appears as equal and opposite principal strains.

All torque calculators report:
- **Shear strain** (µε) — the principal strain measured by each gage
- **Normal strain** (µε) — the perpendicular principal strain
- **Full-span bridge output** (mV/V) — for a full-bridge with four ±45° gages

#### Square Torque
A solid square cross-section shaft under torsion. The stress distribution in a square section is non-uniform (highest at the midpoint of each side); the calculator uses the appropriate section-shape correction.

**Key inputs:** Applied torque, shaft width, modulus, Poisson's ratio, gage length (for gradient), gage factor.

**Key outputs:** Average shear strain, min/max shear strain, strain gradient (%), full-span sensitivity.

---

#### Round Solid Torque
A solid circular shaft under torsion. This is the simplest case — stress is proportional to radius and highest at the outer surface.

**Key inputs:** Applied torque, shaft diameter, modulus, Poisson's ratio, gage factor.

---

#### Round Hollow Torque
A hollow circular shaft under torsion. The bore removes low-stress material from the center, increasing strain at the outer surface for a given torque.

**Key inputs:** Applied torque, outer diameter, inner diameter, modulus, Poisson's ratio, gage factor.

---

### Pressure Diaphragm

A flat circular diaphragm clamped at its perimeter, loaded by uniform differential pressure. Gages bonded near the center measure tangential strain; gages near the rim measure radial strain.

**Key inputs:** Applied pressure, diaphragm diameter, diaphragm thickness, material modulus, Poisson's ratio.

**Key outputs:**
- **Radial strain** (µε) — principal strain in the radial direction
- **Tangential strain** (µε) — principal strain in the circumferential direction

The gage location determines which of these dominates the bridge output. Radial gages near the clamped edge and tangential gages near the center form a common full-bridge configuration.

---

### Multi-Axis Force/Torque Sensors

Multi-axis sensors measure multiple components of force and moment simultaneously. They use more complex flexure geometries and wiring schemes, and they output a sensitivity matrix rather than a single sensitivity value.

#### 6-DOF F/T Cross-Beam
A Maltese-cross flexure with four arms, each instrumented with bending and shear gages. This is the standard topology for robot wrist and ankle force/torque sensors.

**Measures:** Fx, Fy, Fz, Mx, My, Mz simultaneously.

**Key inputs:** Outer ring radius, inner hub radius, arm width, arm thickness, arm length, material properties, applied load (for sensitivity scaling).

**Key outputs:**
- Sensitivity for each DOF (mV/V per N or N·mm)
- Full 6×6 sensitivity matrix
- Natural frequencies: Fz mode, Fx/Fy lateral modes, Mz torsional mode
- Working bandwidth (1/4 of the lowest natural frequency)
- Cross-sensitivity (coupling) estimates

---

#### Joint Torque Sensor (JTS)
A spoke-flexure disk used in series-elastic actuators and compliant robot joints. Radial spokes carry torsional load by bending; the hub and rim are stiff.

**Measures:** Primarily torque; also Fx/Fy lateral forces (as crosstalk).

**Key inputs:** Number of spokes, outer/inner radius, spoke width, spoke thickness, material properties.

**Key outputs:** Torque sensitivity (mV/V per N·mm), lateral force sensitivity, natural frequencies.

---

#### Hexapod F/T Sensor
A Stewart-platform geometry with six struts arranged in three co-planar pairs. Each strut carries only axial load. The 6×6 Jacobian matrix maps strut forces to the six-component wrench (Fx, Fy, Fz, Mx, My, Mz).

**Measures:** All six DOFs.

**Key inputs:** Top ring radius, bottom ring radius, strut angle, material properties.

**Key outputs:**
- 6×6 Jacobian matrix
- Jacobian inverse (calibration matrix)
- Per-DOF sensitivity
- Isotropy index (measure of how uniformly sensitive the sensor is across all DOFs)

---

#### 3-Arm F/T Cross-Beam
A three-arm flexure with arms at 120° spacing. More compact than the 4-arm cross-beam; uses six gages (two per arm: one bending, one shear). Decodes all six DOFs via a 6×6 sensitivity matrix.

**Measures:** Fx, Fy, Fz, Mx, My, Mz.

**Key inputs:** Arm geometry, material properties, applied load.

**Key outputs:** Full 6×6 sensitivity matrix, natural frequencies.

---

## Compensation Calculators

After designing a transducer, compensation calculates the resistor values needed to correct for bridge unbalance, temperature drift of zero output, and temperature variation of span (sensitivity).

### Zero vs Temperature (`zvstemp`)
Determines the resistance of a temperature-sensitive wire (e.g., Balco or Nickel) to be placed in a bridge arm to cancel the zero-shift that occurs as temperature changes.

**Inputs:** Zero output at two or three temperatures, bridge resistance, wire material TC (temperature coefficient of resistance).

**Outputs:** Required compensation wire resistance and length.

---

### Zero Balance (`zerobal`)
Computes the shunt or series resistor needed to null a fixed bridge unbalance (zero offset at room temperature).

**Inputs:** Bridge unbalance (in mV/V or µε equivalent), bridge resistance.

**Outputs:** Null resistor value (in series or shunt configuration).

---

### Span Temp 2-Point (`span2pt`)
Computes a resistor to correct the span (sensitivity) at two temperatures using a 2-point linear fit.

**Inputs:** Span at two temperatures, modulus-temperature relationship of the specimen material.

**Outputs:** Compensation element value.

---

### Span Temp 3-Point (`span3pt`)
Computes a quadratic temperature correction for span using measurements at three temperatures.

**Inputs:** Span at three temperatures.

**Outputs:** Polynomial correction coefficients, compensation element value.

---

### Shunt Optimization (`optshunt`)
Finds the optimal shunt resistor value to realize a target span shift for a trim network ladder.

**Inputs:** Bridge resistance, target span shift (%), available shunt resistor range.

**Outputs:** Optimal shunt value, achieved span, trim network topology recommendation.

---

### Span Set (`spanset`)
Calculates a series or shunt resistor to scale the transducer output to a target full-span value after calibration.

**Inputs:** Measured span, target span, bridge resistance.

**Outputs:** Span-set resistor value.

---

### Simulated Span (`simspan`)
Computes a simulation circuit for verifying calibration without applying mechanical load. Uses a precision resistor in one bridge arm to simulate a known strain.

**Inputs:** Bridge resistance, target simulated output.

**Outputs:** Simulation resistor value.

---

## Trim Visualizer

The **Trim Visualizer** displays a ladder resistor network used for fine-tuning (trimming) a transducer's compensation resistors. Ladder networks have a series of parallel "rungs" that can be cut or left intact to achieve a target resistance.

The visualizer shows:
- The ladder topology (series rails with parallel rungs)
- Which rungs are cut (open) vs. intact (closed)
- The resulting equivalent resistance

Use this alongside the compensation calculators to translate a target resistance value into a specific rung-cut pattern for the physical trim network.

---

## Project Save and Load

Transcalc can save your current work to a `.tcalc.json` file and reload it later.

### Saving
Click **Project** in the top bar. A panel opens showing current metadata. Click **Save** to download a `.tcalc.json` file to your browser's default download location.

The saved file stores:
- The currently selected calculator
- The unit system (SI or US)
- Input values for each calculator you have visited

### Loading
Click **Project** → **Load**, then select a `.tcalc.json` file from disk. The app restores the unit system, navigates to the saved calculator, and restores all inputs.

> Projects are self-contained JSON files. No account or server connection is required.

---

## Printing a Report

Click **Print Report** in the top bar. Your browser's print dialog opens. The page is formatted to print the current calculator view, including the 3D model, inputs, and results table, suitable for an engineering work-record.

For best results, use landscape orientation and set margins to minimum.

---

## Help System

Click **Help** in the top bar to open the help panel. The panel shows a two-column view:

- **Left:** A searchable list of all calculator topics
- **Right:** The detailed help page for the selected topic (ported from the original Delphi application's CHM help system)

Type in the search box to filter topics by name or category. Click any topic to view its reference page, which includes formula descriptions, variable definitions, application notes, and wiring diagrams.

> The Multi-Axis calculators (6-DOF F/T, Hexapod, JTS, 3-Arm) do not yet have legacy help pages. Refer to this guide for those calculators.

---

## Quick Reference: Gage Color Coding

All 2D sketches and some 3D previews use a consistent color scheme for strain gage locations:

| Color | Role |
|-------|------|
| Orange | Active gage — positive strain (+ε) |
| Blue | Active gage — negative strain (−ε) |
| Gray | Passive (dummy) gage — temperature compensation, no signal strain |

In a full Wheatstone bridge, two orange gages and two blue gages (or orange + gray) are wired in opposing arms to maximize output and reject temperature effects.

---

## Quick Reference: Common Inputs

| Input | Meaning |
|-------|---------|
| Applied force / torque / pressure | The rated full-scale mechanical input |
| Modulus (E) | Young's modulus of the spring element material |
| Poisson's ratio (ν) | Lateral strain ratio for the material; typically 0.28–0.33 for steel, 0.33 for aluminum |
| Gage factor (GF) | Resistance sensitivity of the strain gage; typically 2.0–2.15 for foil gages |
| Gage length | Physical length of the gage grid along the strain axis |
| Gage offset | Distance from a reference point (fixed wall, support) to the gage center |

---

## Typical Workflow

1. **Select a transducer type** from the gallery based on how the sensor will be loaded (bending, axial, shear, torque, pressure, or multi-axis).

2. **Enter geometry and material parameters.** Start with approximate dimensions. Use the 3D model to visually confirm the geometry.

3. **Review the results.** Check that gage strain is in an appropriate range (typically 500–2000 µε at full scale for foil gages). Check that full-span sensitivity is acceptable (typically 1–3 mV/V for a 5–10 V excitation bridge).

4. **Iterate dimensions** to optimize sensitivity, stiffness, natural frequency, or safety factor against yield.

5. **Run a compensation calculator** if temperature compensation is required for the application. Start with Zero vs Temperature to correct zero drift, then apply a Span Temperature correction if span variation is significant.

6. **Use the Trim Visualizer** to convert the compensation resistor value into a specific ladder-network rung-cut pattern.

7. **Save the project** as a `.tcalc.json` file for records.

8. **Print a report** for documentation.
