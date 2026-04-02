/**
 * Recommended Geometric Parameters for the 3D Binocular Load Cell Model
 */
export const BINOCULAR_MODEL_PARAMS = {
  // Overall Envelope
  beamWidthMm: 25.0,    // (W) Transverse depth of the cell
  beamHeightMm: 50.0,   // (H) Vertical height
  totalLengthMm: 120.0, // (L) Full span
  
  // Flexure Specifics (The "Binocular" part)
  holeRadiusMm: 12.0,   // (R) Radius of the circular ends of the slots
  distHolesMm: 60.0,    // (D) Distance between centerlines of the two vertical slots
  webThicknessMm: 4.0,  // (t) The thin horizontal section connecting the holes
  
  // Mounting
  fixedEndDepthMm: 20.0, // Length of the solid block on the fixed side
  loadEndDepthMm: 20.0,  // Length of the solid block on the active side
  
  // Sensing Zone
  gageXOffsetMm: 30.0,   // Center of the flexure web where strain is uniform
};

/**
 * Material Constants for a typical Aluminum (2024-T4) Load Cell
 */
export const BINOCULAR_MATERIAL_DEFAULTS = {
  modulusGPa: 73.1,      // Young's Modulus
  poissonRatio: 0.33,
  yieldStrengthMPa: 324, // Safety limit for deflection visualization
};
