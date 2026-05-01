export type KbTopic =
  | 'Beam Mechanics'
  | 'Force/Torque Sensors'
  | 'Calibration'
  | 'Strain Gages'
  | 'Wheatstone Bridge'
  | 'Compensation'
  | 'Materials & Fatigue'
  | 'Robot Integration'

export interface KbEntry {
  id: string
  title: string
  authors: string
  year: number
  venue: string
  abstract: string
  url?: string
  topics: KbTopic[]
  calcKeys: string[]
  keyPoints: string[]
}

export const KB_TOPICS: KbTopic[] = [
  'Beam Mechanics',
  'Force/Torque Sensors',
  'Calibration',
  'Strain Gages',
  'Wheatstone Bridge',
  'Compensation',
  'Materials & Fatigue',
  'Robot Integration',
]

export const KB_ENTRIES: KbEntry[] = [

  // ── Beam Mechanics ────────────────────────────────────────────────────────────
  {
    id: 'timoshenko-goodier-1970',
    title: 'Theory of Elasticity',
    authors: 'Timoshenko, S. P. & Goodier, J. N.',
    year: 1970,
    venue: 'McGraw-Hill, 3rd edition',
    abstract:
      'The standard reference for elastic theory of beams, plates, and shells. Covers bending, shear, torsion, and stress concentrations fundamental to all transducer flexure design.',
    topics: ['Beam Mechanics', 'Materials & Fatigue'],
    calcKeys: ['bbcant', 'bino', 'dualbb', 'revbb', 'sbbeam', 'sqrcol', 'rndsldc', 'rndhlwc', 'shrsqr', 'shrrnd', 'sqrtor', 'rndsld', 'rndhlw'],
    keyPoints: [
      'Euler-Bernoulli bending: σ = M·c / I, ε = M·c / (E·I)',
      'Timoshenko shear correction for short beams: Φ = 12EI / (κGAL²), κ = 5/6 for rectangular cross-sections',
      'Torsion of rectangular cross-sections: τ_max = T / (α·b·t²), where α depends on b/t ratio',
      'Torsion of circular shafts: τ = T·r / J, J = π·r⁴/2 (solid), J = π(r_o⁴−r_i⁴)/2 (hollow)',
      'Stress concentration factors at fillets and holes — use for root radius design',
    ],
  },
  {
    id: 'timoshenko-plates-shells',
    title: 'Theory of Plates and Shells',
    authors: 'Timoshenko, S. P. & Woinowsky-Krieger, S.',
    year: 1959,
    venue: 'McGraw-Hill, 2nd edition',
    abstract:
      'The authoritative reference for thin plate bending theory. Provides exact solutions for circular diaphragm radial and tangential stress used in pressure transducer design.',
    topics: ['Beam Mechanics'],
    calcKeys: ['pressure'],
    keyPoints: [
      'Circular diaphragm, clamped edge, uniform pressure: σ_r(0) = 3pa²/4t² (center radial)',
      'Tangential stress at edge: σ_θ(a) = −3pa²/4t² (compressive, equal magnitude to center radial)',
      'Radial stress at edge: σ_r(a) = −3pa²/2t² (clamped edge, twice the center value)',
      'Max deflection: w_max = 3pa⁴(1−ν²) / (16Et³)',
      'For strain gage placement: radial gages near center (+), tangential gages near edge (−)',
    ],
  },
  {
    id: 'roarks-8th',
    title: "Roark's Formulas for Stress and Strain",
    authors: 'Young, W. C. & Budynas, R. G.',
    year: 2011,
    venue: 'McGraw-Hill, 8th edition',
    abstract:
      'Comprehensive formula reference for stress and deflection in beams, plates, shells, and pressure vessels. The primary look-up reference for analytical flexure design and validation.',
    topics: ['Beam Mechanics', 'Materials & Fatigue'],
    calcKeys: ['bbcant', 'bino', 'dualbb', 'revbb', 'sbbeam', 'sqrcol', 'rndsldc', 'rndhlwc', 'pressure'],
    keyPoints: [
      'Cantilever beam: δ = FL³/3EI, σ_max = FL/Z at root',
      'Simply-supported beam with center load: δ = FL³/48EI',
      'Circular diaphragm uniform load, clamped edge: radial and tangential stress tables',
      'Torsion constant tables for rectangular, hollow-circular, and non-standard sections',
      'Stress concentration factor charts for fillets, holes, grooves',
    ],
  },
  {
    id: 'boresi-schmidt-2003',
    title: 'Advanced Mechanics of Materials',
    authors: 'Boresi, A. P. & Schmidt, R. J.',
    year: 2003,
    venue: 'Wiley, 6th edition',
    abstract:
      'Graduate-level mechanics text covering shear center, warping torsion, thin-wall sections, and curved beam theory. Relevant for S-beam and hollow torsion shaft transducer design.',
    topics: ['Beam Mechanics'],
    calcKeys: ['sbbeam', 'sqrtor', 'rndsld', 'rndhlw', 'shrsqr', 'shrrnd'],
    keyPoints: [
      'Shear center location for open thin-wall sections (important for S-beam to avoid torsion coupling)',
      'Torsion of closed thin-wall sections: q = T / (2·A_enclosed), τ = q / t_wall',
      'Curved beam bending stress correction factor for beams with small radius of curvature',
      'Transverse shear stress distribution in solid and hollow rectangular sections',
      'Warping torsion in open sections — relevant for I-beam and channel flexures',
    ],
  },

  // ── Force / Torque Sensors ────────────────────────────────────────────────────
  {
    id: 'fu-song-2018',
    title: 'Dynamic Characteristics Analysis of the Six-Axis Force/Torque Sensor',
    authors: 'Fu, L. & Song, A.',
    year: 2018,
    venue: 'Journal of Sensors, Article ID 6216979',
    abstract:
      'Analyzes natural frequencies and dynamic bandwidth of a cross-beam elastomer six-axis F/T sensor using a simplified mechanical model and FEA. Establishes the first-natural-frequency / bandwidth rule cited throughout Transcalc.',
    url: 'https://doi.org/10.1155/2018/6216979',
    topics: ['Force/Torque Sensors', 'Beam Mechanics'],
    calcKeys: ['sixaxisft'],
    keyPoints: [
      'Cross-beam elastomer: 4 rectangular arms radiating from central hub to outer ring',
      'First natural frequency (Fz axial) > 1600 Hz for typical steel design',
      'Working bandwidth (±5% amplitude gain) > 400 Hz',
      'Bandwidth rule: f_working ≈ f_n / 4  (verified experimentally against FEA)',
      'SIM and differential-evolution algorithms for dynamic model identification from step response',
    ],
  },
  {
    id: 'wang-2017-timoshenko-ft',
    title: 'Design and Optimization of a Novel Wrist Six-Dimensional Force/Torque Sensor',
    authors: 'Wang, Z. et al.',
    year: 2017,
    venue: 'IEEE Sensors Journal, 17(17)',
    abstract:
      'Applies Timoshenko shear-deformation correction to the stiffness and natural frequency of a six-axis wrist force/torque sensor with short rectangular beam arms. Shows that the standard Euler-Bernoulli formula significantly overestimates stiffness when L/t < 10.',
    topics: ['Force/Torque Sensors', 'Beam Mechanics'],
    calcKeys: ['sixaxisft'],
    keyPoints: [
      'Timoshenko correction factor Φ = 12EI / (κGAL²), κ = 5/6 for rectangular section',
      'Corrected stiffness: k_TC = k_EB / (1 + Φ)',
      'Significant correction (Φ > 5%) when beam aspect ratio L/t < 10',
      'Bending moment distribution M(x) = F·L_eff is unchanged by shear correction → sensitivity formulas unaffected',
      'Natural frequency corrected: ω_n = sqrt(k_TC / m_eff)',
    ],
  },
  {
    id: 'kim-2019-decoupled',
    title: 'Decoupled Six-Axis Force–Moment Sensor with a Novel Strain Gauge Arrangement and Error Reduction Techniques',
    authors: 'Kim, U. et al.',
    year: 2019,
    venue: 'Sensors (MDPI), 19(13), 3012',
    abstract:
      'Presents a double-parallel strain gage arrangement that inherently reduces cross-axis coupling. A full 6×6 decoupling matrix via least-squares achieves max crosstalk 4.78%, calibration error 3.91%, and measurement error 1.78%.',
    url: 'https://doi.org/10.3390/s19133012',
    topics: ['Force/Torque Sensors', 'Strain Gages', 'Calibration'],
    calcKeys: ['sixaxisft', 'hexapod', 'triaxisft'],
    keyPoints: [
      'Double-parallel gage pairs in each bridge arm provide inherent signal averaging and coupling reduction',
      'Full 6×6 calibration matrix C via least-squares (C ≠ diagonal for real sensors)',
      'Max crosstalk: 4.78% FS; calibration error: 3.91%; measurement error: 1.78%',
      'Ideal symmetric geometry → diagonal C; manufacturing tolerances → off-diagonal terms needed',
      'Design target: cross-coupling < 5% is achievable with careful geometry and gaging',
    ],
  },
  {
    id: 'shape-optim-2014',
    title: 'Shape Optimization of a Mechanically Decoupled Six-Axis Force/Torque Sensor',
    authors: 'Nguyen, T. D. et al.',
    year: 2014,
    venue: 'Sensors and Actuators A: Physical, 209, 138–148',
    abstract:
      'Numerical shape optimization using 8 geometric design variables minimizes all 30 off-diagonal coupling terms simultaneously. The optimal cross-beam design achieves coupling < 0.019% FS while maintaining sensitivity isotropy.',
    url: 'https://www.sciencedirect.com/science/article/abs/pii/S092442471400003X',
    topics: ['Force/Torque Sensors', 'Calibration'],
    calcKeys: ['sixaxisft'],
    keyPoints: [
      '8 geometric design variables: arm length, width, thickness, hub radius, fillet radii, etc.',
      'Objective function penalizes all 30 off-diagonal terms of the 6×6 sensitivity matrix',
      'Optimal coupling < 0.019% FS — near-ideal mechanical decoupling',
      'Key finding: sensitivity isotropy and low coupling are competing objectives; a Pareto front exists',
      'Arm width-to-length ratio is the most influential parameter for Fz/Mz decoupling',
    ],
  },
  {
    id: 'ati-ft-reference',
    title: 'F/T Sensor Technical Reference',
    authors: 'ATI Industrial Automation',
    year: 2023,
    venue: 'ATI Industrial Automation Technical Documentation',
    abstract:
      'Commercial reference for the ATI/JR3-style hexapod (Stewart-platform) F/T sensor topology. Covers the 6-strut Jacobian wrench-decoding approach, mounting conventions, and typical performance specifications for collaborative robot applications.',
    url: 'https://www.ati-ia.com/products/ft/ft_literature.aspx',
    topics: ['Force/Torque Sensors', 'Calibration', 'Robot Integration'],
    calcKeys: ['hexapod'],
    keyPoints: [
      '6-strut Stewart-platform topology: pairs of struts arranged in ±β inclination angle',
      'Wrench decoding: F = J⁻¹ · V (Jacobian inverse maps strut axial forces to 6-DOF wrench)',
      'Optimal strut spread angle β ≈ 15°–20° for balanced Fx/Fy/Fz/Mx/My/Mz sensitivity',
      'Condition number of J quantifies channel balance — target < 10 for well-balanced design',
      'Output rated in mV/V; calibration matrix C maps bridge voltages to engineering units',
    ],
  },
  {
    id: 'merlet-2006-parallel-robots',
    title: 'Parallel Robots',
    authors: 'Merlet, J. P.',
    year: 2006,
    venue: 'Springer, 2nd edition',
    abstract:
      'Definitive reference for Stewart-platform and parallel-mechanism kinematics. Provides the Jacobian derivation for general hexapod geometries used in 6-DOF F/T sensors, including singularity analysis and workspace computation.',
    topics: ['Force/Torque Sensors', 'Robot Integration', 'Calibration'],
    calcKeys: ['hexapod'],
    keyPoints: [
      'Jacobian J maps strut velocities to platform twist (and by duality, strut forces to platform wrench)',
      'For force sensing: wrench W = J^T · f_struts; inverse: f = (J^T)^{-1} · W',
      'Singularities: configurations where J is rank-deficient → loss of one or more force-sensing channels',
      'Isotropic design: all singular values of J equal → equal sensitivity in all DOF',
      'General hexapod workspace analysis applicable to both manipulation and sensing applications',
    ],
  },
  {
    id: 'jts-seok-2018',
    title: 'Design and Analysis of a Compact Spoke-Type Force/Torque Sensor for a Robot Joint',
    authors: 'Seok, D. Y. et al.',
    year: 2018,
    venue: 'IEEE Sensors Journal, 18(20)',
    abstract:
      'N-spoke radial flexure disk design for joint torque sensing in series-elastic actuators. Analyzes torque sensitivity, Fx/Fy crosstalk, and overload protection for collaborative robot wrist applications.',
    topics: ['Force/Torque Sensors', 'Strain Gages'],
    calcKeys: ['jts'],
    keyPoints: [
      'Spoke count N trades stiffness vs. sensitivity: more spokes → stiffer, less sensitive',
      'Torque sensitivity: S_T ∝ GF·L_spoke / (E·b·t²)',
      'Fx/Fy crosstalk < 2% with symmetric N-spoke layout — verified by FEA and experiment',
      'Overload stops limit deflection to protect strain gages during shock loads',
      'Spoke torsional stiffness is negligible vs. bending stiffness for typical aspect ratios',
    ],
  },

  // ── Strain Gages ─────────────────────────────────────────────────────────────
  {
    id: 'murray-miller-1992',
    title: 'The Bonded Electrical Resistance Strain Gage: An Introduction',
    authors: 'Murray, W. M. & Miller, W. R.',
    year: 1992,
    venue: 'Oxford University Press',
    abstract:
      'The standard textbook on bonded foil strain gages. Covers gage factor, transverse sensitivity, temperature effects, Wheatstone bridge output derivation, and installation practice used throughout transducer design.',
    topics: ['Strain Gages', 'Wheatstone Bridge', 'Compensation'],
    calcKeys: ['bbcant', 'bino', 'dualbb', 'revbb', 'sbbeam', 'sqrcol', 'rndsldc', 'rndhlwc', 'shrsqr', 'shrrnd', 'sqrtor', 'rndsld', 'rndhlw', 'pressure', 'sixaxisft'],
    keyPoints: [
      'Gage factor GF = (ΔR/R) / ε; typical foil gage: GF ≈ 2.0 at room temperature',
      'Transverse sensitivity Kt ≈ 0.5–3%; corrected output = GF·(ε_a + Kt·ε_t)',
      'Full bridge output: V_out/V_ex = GF/4 · (ε₁ − ε₂ − ε₃ + ε₄)',
      'Temperature-induced apparent strain — self-temperature-compensated gages minimize this',
      'Lead wire resistance error: three-wire hookup compensates for lead resistance changes',
    ],
  },
  {
    id: 'hoffmann-1989',
    title: 'An Introduction to Measurements using Strain Gages',
    authors: 'Hoffmann, K.',
    year: 1989,
    venue: 'Hottinger Baldwin Messtechnik (HBM)',
    abstract:
      'Practical engineering guide covering gage selection, bridge configurations, zero and span compensation, and trim resistor networks. Directly corresponds to the compensation workflows in Transcalc.',
    topics: ['Strain Gages', 'Wheatstone Bridge', 'Compensation'],
    calcKeys: ['zvstemp', 'zerobal', 'span2pt', 'span3pt', 'optshunt', 'spanset', 'simspan'],
    keyPoints: [
      'Quarter, half, and full bridge output factors (×1, ×2, ×4 relative to quarter-bridge)',
      'Zero-balance compensation: series resistor in one bridge arm shifts offset',
      'Zero vs. temperature: temperature-sensitive wire (Balco, Nickel) in series with bridge arm',
      'Span adjustment: shunt resistor across a bridge arm reduces output',
      'Span vs. temperature compensation: temperature-sensitive shunt corrects modulus-driven span shift',
    ],
  },
  {
    id: 'vishay-tn501',
    title: 'Errors Due to Transverse Sensitivity in Strain Gages (Tech Note TN-509)',
    authors: 'Micro-Measurements (Vishay)',
    year: 2010,
    venue: 'Vishay Micro-Measurements Technical Note TN-509',
    abstract:
      'Quantifies and corrects the error introduced when a strain gage responds to transverse strain in addition to the intended axial strain. Critical for accurate reading in biaxial stress states such as pressure diaphragms and shear beams.',
    url: 'https://www.micro-measurements.com/resources/technical-notes/',
    topics: ['Strain Gages'],
    calcKeys: ['pressure', 'shrsqr', 'shrrnd', 'bino'],
    keyPoints: [
      'Transverse sensitivity error: δε_meas/ε_a = Kt·(ε_t/ε_a), where Kt ≈ 0.5–3%',
      'Error is largest in biaxial fields: pressure diaphragms (ε_r ≈ ε_θ), shear beams (ε_1 = −ε_2)',
      'Correction: ε_a_corrected = (ε_a_meas − Kt·ε_t) / (1 − ν_gage · Kt)',
      'For shear beams with ±45° gages: transverse sensitivity adds approximately Kt · GF · ε_shear to output',
      'Self-temperature-compensated gages matched to substrate alloy TCE minimize thermal apparent strain',
    ],
  },
  {
    id: 'vishay-tn514',
    title: 'Shunt Calibration of Strain Gage Instrumentation (Tech Note TN-514)',
    authors: 'Micro-Measurements (Vishay)',
    year: 2014,
    venue: 'Vishay Micro-Measurements Technical Note TN-514',
    abstract:
      'Defines shunt calibration methodology for strain gage bridges: connecting a precision resistor in parallel with one bridge arm to simulate a known strain. Standard method for span setting and verifying amplifier gain without physical loading.',
    url: 'https://www.micro-measurements.com/resources/technical-notes/',
    topics: ['Calibration', 'Strain Gages', 'Wheatstone Bridge'],
    calcKeys: ['optshunt', 'spanset', 'simspan'],
    keyPoints: [
      'Shunt resistor R_sh across arm R_g: simulated strain ε_sim = −R_g / (GF · (R_g + R_sh))',
      'Typical shunt: 59.88 kΩ across 350 Ω arm → simulates 1667 µε (≈ 1 mV/V half-bridge)',
      'Polarity: shunt on active arm produces negative output; shunt on adjacent arm produces positive output',
      'Optimal shunt resistance (Transcalc): minimizes sensitivity to absolute amplifier gain errors',
      'Simulated span load: shunt calibration can substitute for a known dead-weight load for field verification',
    ],
  },

  // ── Wheatstone Bridge ─────────────────────────────────────────────────────────
  {
    id: 'vishay-tn501-bridge',
    title: 'Strain Gage-Based Transducers: Their Design and Construction (Tech Note TN-501)',
    authors: 'Micro-Measurements (Vishay)',
    year: 2021,
    venue: 'Vishay Micro-Measurements Technical Note TN-501',
    abstract:
      'Reference guide for Wheatstone bridge configurations in transducer design: quarter, half, and full bridges; bending, column, shear, and torsion arrangements; bridge output gain factors for all standard configurations.',
    url: 'https://www.micro-measurements.com/resources/technical-notes/',
    topics: ['Wheatstone Bridge', 'Strain Gages'],
    calcKeys: ['bbcant', 'bino', 'dualbb', 'revbb', 'sbbeam', 'sqrcol', 'shrsqr', 'sqrtor'],
    keyPoints: [
      'Quarter bridge (1 active gage): V_out/V_ex = GF·ε / 4',
      'Half bridge, bending (2 active, opposite sign): V_out/V_ex = GF·ε / 2',
      'Full bridge, bending (4 active): V_out/V_ex = GF·ε',
      'Poisson half bridge: gain factor = GF·ε·(1+ν) / 4',
      'Shear/torsion full bridge with ±45° gages: V_out/V_ex ≈ GF·γ (shear strain)',
    ],
  },

  // ── Calibration ───────────────────────────────────────────────────────────────
  {
    id: 'astm-e251',
    title: 'ASTM E251 — Standard Test Methods for Performance Characteristics of Metallic Bonded Resistance Strain Gages',
    authors: 'ASTM International',
    year: 2019,
    venue: 'ASTM International, Annual Book of Standards Vol. 03.01',
    abstract:
      'Standard test procedures for measuring strain gage performance: gage factor, transverse sensitivity, fatigue life, zero drift, and temperature response. Defines the measurement conditions expected in gage manufacturer datasheets.',
    url: 'https://www.astm.org/e0251-19.html',
    topics: ['Calibration', 'Strain Gages'],
    calcKeys: ['bbcant', 'sixaxisft', 'pressure'],
    keyPoints: [
      'Gage factor calibration: cantilever beam method with known stress at gage location',
      'Transverse sensitivity measurement: biaxial stress state at known ε_a / ε_t ratio',
      'Fatigue life test: cyclic strain at ±1000 µε to 10⁷ cycles',
      'Zero drift test: unstrained gage resistance change over time at constant temperature',
      'Temperature coefficient of gage factor (TCGF): typically −0.01 to −0.02 %/°C for foil gages',
    ],
  },
  {
    id: 'shah-eastman-hong-2012',
    title: 'An Overview of Robot-Sensor Calibration Methods for Evaluation of Perception Systems',
    authors: 'Shah, M., Eastman, R. D. & Hong, T.',
    year: 2012,
    venue: 'PerMIS 2012 (ACM), NIST pub_id 910651',
    abstract:
      'Surveys hand-eye calibration methods solving AX=XB and AX=YB — the homogeneous transformation equations that locate a sensor relative to a robot kinematic chain. Covers separable, simultaneous, and iterative solutions.',
    url: 'https://tsapps.nist.gov/publication/get_pdf.cfm?pub_id=910651',
    topics: ['Calibration', 'Robot Integration'],
    calcKeys: ['sixaxisft', 'hexapod'],
    keyPoints: [
      'AX=XB: find fixed transform X between robot end-effector and mounted sensor (hand-eye calibration)',
      'AX=YB: simultaneous robot-world + hand-eye calibration (two unknowns)',
      'Separable solutions (Tsai-Lenz, Park-Martin): fast; orientation errors propagate to translation',
      'Simultaneous solutions (Daniilidis dual-quaternions): more accurate, scaling-sensitive',
      'Iterative solutions (Levenberg-Marquardt): most accurate, requires good initialization',
    ],
  },
  {
    id: 'oh-2018-deeplearning',
    title: 'Multi-Axial Force/Torque Sensor Calibration Method Based on Deep Learning',
    authors: 'Oh, H. S. et al.',
    year: 2018,
    venue: 'IEEE Transactions on Instrumentation and Measurement',
    abstract:
      'Replaces the conventional linear calibration matrix C = S⁻¹ with a deep neural network that captures nonlinear cross-coupling between channels. Demonstrates significant accuracy improvement over linear matrix calibration above ~60% rated load.',
    url: 'https://www.researchgate.net/publication/325058120',
    topics: ['Calibration', 'Force/Torque Sensors'],
    calcKeys: ['sixaxisft', 'hexapod'],
    keyPoints: [
      'Linear C = S⁻¹ assumes linear coupling — valid only for small strains and ideal geometry',
      'Nonlinear coupling arises from: large deflections, geometric imperfections, gage nonlinearity',
      'Neural network trained on labeled (applied load, bridge voltage) pairs outperforms linear matrix at high loads',
      'Transcalc uses diagonal linear C — adequate for design-phase sizing; physical calibration needed for production',
    ],
  },
  {
    id: 'oiml-r60',
    title: 'OIML R 60 — Metrological Regulation for Load Cells',
    authors: 'International Organization of Legal Metrology (OIML)',
    year: 2000,
    venue: 'OIML R 60, Edition 2000(E)',
    abstract:
      'International metrological standard for load cell performance. Defines accuracy classes (C1–C6), performance specifications (nonlinearity, hysteresis, creep, temperature sensitivity), and test procedures for weighing instrument load cells.',
    url: 'https://www.oiml.org/en/files/pdf_r/r060-e00.pdf',
    topics: ['Calibration', 'Compensation'],
    calcKeys: ['bbcant', 'sbbeam', 'bino', 'sqrcol'],
    keyPoints: [
      'Accuracy classes: OIML C1–C6 (C1 = low precision, C6 = high precision analytical)',
      'Nonlinearity specification: max permissible error as % of full-scale output',
      'Creep specification: output change over 30 minutes at constant load (typically < 0.05%)',
      'Temperature sensitivity: zero-point and sensitivity both specified vs. temperature',
      'Hysteresis: difference between increasing- and decreasing-load output at same load point',
    ],
  },

  // ── Compensation ──────────────────────────────────────────────────────────────
  {
    id: 'perry-1987-strain-gage',
    title: 'The Strain Gage Primer',
    authors: 'Perry, C. C. & Lissner, H. R.',
    year: 1987,
    venue: 'McGraw-Hill, 2nd edition',
    abstract:
      'Classic primer on strain gage measurement and compensation. Covers zero shift vs. temperature, span shift vs. temperature, and the resistor network approaches that map directly to Transcalc\'s compensation calculators.',
    topics: ['Compensation', 'Strain Gages', 'Wheatstone Bridge'],
    calcKeys: ['zvstemp', 'zerobal', 'span2pt', 'span3pt', 'spanset', 'simspan'],
    keyPoints: [
      'Zero shift vs. temperature: differential TCR between gage alloy and bridge dummy causes output drift',
      'Balco / Nickel wire in series with a bridge arm cancels zero-TCR drift',
      'Span shift vs. temperature: modulus E decreases ~0.024%/°C for steel → sensitivity drops with temperature',
      'Temperature-sensitive shunt across one arm compensates span thermal drift',
      'Interaction: zero compensation slightly affects span; iteration between adjustments required',
    ],
  },
  {
    id: 'vishay-tn507-span-temp',
    title: 'Span Temperature Compensation using Resistance Temperature Detectors (Tech Note TN-507)',
    authors: 'Micro-Measurements (Vishay)',
    year: 2007,
    venue: 'Vishay Micro-Measurements Technical Note TN-507',
    abstract:
      'Describes two-point and three-point methods for compensating the temperature coefficient of sensitivity (span vs. temperature). Uses RTD-type resistors in the bridge circuit to counteract the modulus-driven span change.',
    url: 'https://www.micro-measurements.com/resources/technical-notes/',
    topics: ['Compensation', 'Wheatstone Bridge'],
    calcKeys: ['span2pt', 'span3pt', 'zvstemp'],
    keyPoints: [
      'Two-point span compensation: RTD shunt selected to match the negative TC of modulus',
      'Three-point fit: polynomial RTD response matched to nonlinear modulus-vs-temperature curve',
      'TCR of compensation resistor must equal TC of output (sensitivity) for complete compensation',
      'Balco (resistance iron-nickel alloy): TCR ≈ +0.24%/°C — widely used for zero and span compensation',
      'Nickel wire: TCR ≈ +0.68%/°C — used when larger correction is needed',
    ],
  },

  // ── Materials & Fatigue ───────────────────────────────────────────────────────
  {
    id: 'morrow-fatigue',
    title: 'Cyclic Plastic Strain Energy and Fatigue of Metals',
    authors: 'Morrow, J.',
    year: 1965,
    venue: 'ASTM STP 378',
    abstract:
      'Establishes the strain-life (ε-N) fatigue framework and the Morrow mean-stress correction used to account for preload in fatigue life prediction. The Morrow equation is used in Transcalc\'s fatigue module for estimating transducer flexure life.',
    topics: ['Materials & Fatigue'],
    calcKeys: ['bbcant', 'bino', 'dualbb', 'revbb', 'sbbeam', 'sixaxisft'],
    keyPoints: [
      'Morrow equation: ε_a = (σ_f′ − σ_m)/E · (2N)^b + ε_f′ · (2N)^c',
      'Mean stress σ_m reduces fatigue life — important for preloaded transducer flexures',
      'Conservative design limit: 1500 µε for steel transducer flexures (used in Transcalc)',
      'Strain safety factor = 1500 µε / max_strain — Transcalc reports this for all beam calculators',
      'At 1500 µε with GF=2, full-bridge output ≈ 3 mV/V — typical high-performance transducer target',
    ],
  },
  {
    id: 'asm-metals-handbook',
    title: 'ASM Metals Handbook: Properties and Selection of Metals',
    authors: 'ASM International',
    year: 2005,
    venue: 'ASM International, 10th edition',
    abstract:
      'Authoritative material property database for metals used in transducer flexures: Young\'s modulus, Poisson\'s ratio, density, yield strength, fatigue limits, and temperature limits for steels, aluminum alloys, titanium, and beryllium copper.',
    topics: ['Materials & Fatigue'],
    calcKeys: ['bbcant', 'bino', 'dualbb', 'revbb', 'sbbeam', 'sqrcol', 'rndsldc', 'rndhlwc', 'shrsqr', 'shrrnd', 'sqrtor', 'rndsld', 'rndhlw', 'sixaxisft'],
    keyPoints: [
      '17-4 PH SS (H900): E=197 GPa, ν=0.27, σ_y=1310 MPa — preferred for high-performance transducers',
      '7075-T6 Al: E=72 GPa, ν=0.33, σ_y=503 MPa — lightweight, corrosion-sensitive',
      'Ti-6Al-4V: E=114 GPa, ν=0.34, σ_y=880 MPa — aerospace, biomedical applications',
      'BeCu C17200 (aged): E=128 GPa, ν=0.30, σ_y=1000 MPa — non-magnetic, excellent fatigue life',
      'Material figure-of-merit for strain gage transducers: σ_y / E — higher ratio → more strain at yield',
    ],
  },
  {
    id: 'shigley-machine-design',
    title: "Shigley's Mechanical Engineering Design",
    authors: 'Budynas, R. G. & Nisbett, J. K.',
    year: 2020,
    venue: 'McGraw-Hill, 11th edition',
    abstract:
      'Standard reference for machine element design including fatigue, stress concentration, combined loading, and safety factors. Provides the modified Goodman diagram and Miner\'s rule for variable-amplitude fatigue analysis.',
    topics: ['Materials & Fatigue', 'Beam Mechanics'],
    calcKeys: ['bbcant', 'bino', 'sbbeam', 'sixaxisft', 'sqrtor'],
    keyPoints: [
      'Modified Goodman criterion: σ_a/S_e + σ_m/S_ut = 1 (conservative fatigue-fracture boundary)',
      'Endurance limit S_e = k_a·k_b·k_c·k_d·k_e·S_e′ (surface, size, reliability, temp, stress-conc. factors)',
      'Miner\'s rule for variable amplitude: Σ(n_i / N_i) ≤ 1 for cumulative fatigue damage',
      'Stress concentration Kt: fatigue notch factor Kf = 1 + q·(Kt − 1), where q = notch sensitivity',
      'Combined loading: von Mises criterion σ_eff = sqrt(σ² + 3τ²) for bending + torsion',
    ],
  },

  // ── Robot Integration ─────────────────────────────────────────────────────────
  {
    id: 'siciliano-robotics-2009',
    title: 'Robotics: Modelling, Planning and Control',
    authors: 'Siciliano, B. et al.',
    year: 2009,
    venue: 'Springer',
    abstract:
      'Graduate robotics textbook covering forward/inverse kinematics, Jacobians, statics, and dynamics. Provides the wrench Jacobian framework used for decoding F/T sensor output into base-frame forces and moments.',
    topics: ['Robot Integration', 'Force/Torque Sensors'],
    calcKeys: ['sixaxisft', 'hexapod', 'jts', 'triaxisft'],
    keyPoints: [
      'Wrench transformation: W_base = Ad^T(T_sensor_base) · W_sensor (adjoint transport of wrenches)',
      'Jacobian statics: joint torques τ = J^T(q) · W_tip — dual of velocity Jacobian',
      'Force sensor at wrist: gravity compensation requires knowing end-effector mass and CoM',
      'Compliance control: F/T sensor feedback enables force-controlled assembly and contact tasks',
      'Calibration requirement: sensor frame pose relative to tool flange must be known to transform wrenches',
    ],
  },

]

export function searchKb(entries: KbEntry[], query: string, topic: KbTopic | 'All'): KbEntry[] {
  const q = query.trim().toLowerCase()
  return entries.filter(e => {
    if (topic !== 'All' && !e.topics.includes(topic)) return false
    if (!q) return true
    return (
      e.title.toLowerCase().includes(q) ||
      e.authors.toLowerCase().includes(q) ||
      e.venue.toLowerCase().includes(q) ||
      e.abstract.toLowerCase().includes(q) ||
      e.keyPoints.some(k => k.toLowerCase().includes(q)) ||
      String(e.year).includes(q)
    )
  })
}

export function getEntriesForCalc(calcKey: string): KbEntry[] {
  return KB_ENTRIES.filter(e => e.calcKeys.includes(calcKey))
}
