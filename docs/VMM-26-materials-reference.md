# VMM-26 Materials Reference — Strain Gage Based Transducers

**Source:** Micro-Measurements Application Note VMM-26, "Strain Gage Based Transducers"  
**PDF:** `docs/2490_VMM-26.pdf`  
**Data used in:** `transcalc-web/src/domain/materials.ts`

---

## Unit Conversion Factors (VMM-26 footnotes)

| From | To | Factor |
|------|-----|--------|
| Mpsi | GPa | × 6.895 |
| ksi  | MPa | × 6.895 |
| lb/in³ | kg/m³ | × 27,680 |
| °F | °C | (F − 32) × 5/9 |

Poisson ratios are from standard engineering references (not listed in VMM-26).

---

## Spring Element Strain Level Guidelines (VMM-26, p. 15)

| Rating | Strain Range | Use Case |
|--------|-------------|----------|
| Optimum | 1000–1700 µε | Best sensitivity, fatigue endurance |
| Acceptable | 700–2000 µε | Reduced fatigue life at upper end |
| Marginal | < 700 or > 2000 µε | Avoid for precision transducers |

The 1500 µε target used in Transcalc's Strain Safety Factor is the center of the optimum range.

---

## Materials Selection Guide (VMM-26, Table pp. 20–21)

### High-Modulus Alloys (Steels)

Use for high-capacity transducers. Higher modulus → stiffer sections → less gage reinforcement error and creep.

| Material | E (GPa) | σy (MPa) | ρ (kg/m³) | Max T (°C) |
|----------|---------|----------|----------|-----------|
| 4340 Steel | 207 | 1448 | 7833 | 260 |
| 4140 Steel | 207 | 1379 | 7833 | 204 |
| 17-4 PH SS (630) | 197 | 1276 | 7750 | 204 |
| 17-7 PH SS (631) | 200 | 1517 | 7639 | 204 |
| PH 15-7 Mo SS (632) | 200 | 1517 | 7667 | 260 |
| 15-5 PH SS (S15500) | 197 | 1276 | 7750 | 204 |
| Maraging 18Ni (250) | 186 | 1689 | 7999 | 316 |
| 304 Stainless | 193 | 1034 | 8027 | 121 |

### Low-Modulus Alloys

Use for low-capacity transducers where thin steel sections would cause gage reinforcement error and creep. Also preferred where low mass or corrosion resistance matters.

| Material | E (GPa) | σy (MPa) | ρ (kg/m³) | Max T (°C) |
|----------|---------|----------|----------|-----------|
| Al 2024-T81 | 73.1 | 448 | 2796 | 121 |
| Al 2024-T4/T351 | 73.1 | 317 | 2796 | 93 |
| Al 7075-T6 | 71.7 | 483 | 2796 | 38 |
| Al 6061-T6 | 69.0 | 276 | 2713 | 66 |
| Al 2014-T6 | 73.1 | 414 | 2796 | 93 |
| Ti-6Al-4V | 113.8 | 1138 | 4429 | 149 |
| BeCu 25 (C17200) | 117 | 1172 | 8248 | 121 |

---

## Relative Figure of Merit Ratings (VMM-26, Table)

Scale: 0–10, higher = better. Blank = not rated by VMM-26.

| Material | Linearity | Hysteresis | Creep/Relax | Machinability | Harden Distortion | Corrosion Res | Lot Consistency |
|----------|-----------|-----------|-------------|---------------|-------------------|---------------|----------------|
| 4340 Steel | 8 | 8 | 8 | 5 | 3 | 1 | 8 |
| 4140 Steel | 8 | 8 | 7 | 5 | 3 | 1 | 6 |
| 17-4 PH SS | 7 | 7 | 7 | 6 | 8 | 7 | 3 |
| 17-7 PH SS | 8 | 8 | 7 | 6 | 8 | 7 | 5 |
| PH 15-7 Mo SS | 8 | 8 | 8 | 6 | 8 | 7 | 5 |
| 15-5 PH SS | 7 | 7 | 7 | 6 | 8 | 7 | 5 |
| Maraging 18Ni (250) | 8 | 8 | 7 | 5 | 8 | 2 | 5 |
| 304 Stainless | 5 | 4 | 4 | 3 | — | 8 | 6 |
| Al 2024-T81 | 7 | 8 | 7 | 8 | 9 | 3 | 6 |
| Al 2024-T4/T351 | 6 | 7 | 6 | 8 | 9 | 3 | 6 |
| Al 7075-T6 | 7 | 6 | 6 | 8 | 8 | 3 | 5 |
| Al 6061-T6 | 5 | 4 | 4 | 7 | 8 | 4 | 5 |
| Al 2014-T6 | 6 | 7 | 6 | 8 | 9 | 3 | 6 |
| Ti-6Al-4V | 7 | 7 | 7 | 3 | 2 | 8 | 5 |
| BeCu 25 (C17200) | 8 | 8 | 8 | 5 | 9 | 3 | 7 |

---

## Key VMM-26 Material Selection Guidance

**4340 Steel** — Excellent all-around; the standard for high-capacity precision transducers. Requires case hardening; low corrosion resistance.

**17-4 PH SS** — Widely used; low-temperature age-hardening (H900 condition) minimises distortion. Corrosion resistant. Lot-to-lot variability is the main limitation.

**17-7 PH SS** — Higher yield than 17-4. Supplied primarily as plate/sheet; machining from bar stock is less common.

**Maraging 18Ni (250)** — Highest yield strength in the table. Age-hardens at 480°C with near-zero distortion. Almost no corrosion resistance.

**304 Stainless** — Poor spring material. Not hardenable; high hysteresis and creep/relaxation. Use only when corrosion is overriding and accuracy requirements are modest.

**Al 2024-T81** — Best all-around aluminium for transducers per VMM-26. Superior to T4/T351 in creep/relaxation.

**Al 7075-T6** — Highest yield of the aluminium alloys but rated max 38°C (100°F). Poor elevated-temperature performance.

**Ti-6Al-4V** — Niche use only. Excellent corrosion, very low thermal conductivity causes thermal zero shift, very difficult to machine and harden without distortion.

**BeCu 25 (C17200)** — Best overall performance among low-modulus alloys. Age-hardens like PH stainless with minimal distortion. High cost and beryllium dust health hazard restrict use.

---

## Recommended Material for Robotics F/T Sensors

Per VMM-26 guidance and typical robotics requirements:

- **17-4 PH SS H900** — best combination of corrosion resistance, yield strength, and hardening distortion for robot wrist/ankle sensors
- **Al 7075-T6** — for lightweight designs at ambient temperature (avoid above 38°C)
- **Ti-6Al-4V** — corrosion-critical environments; accept machining cost and thermal sensitivity

The figure-of-merit creep/relaxation rating is critical for force-controlled robots: materials rated ≤ 5 (304 SS, Al 6061, Al 2024-T4) should be avoided where drift matters.
