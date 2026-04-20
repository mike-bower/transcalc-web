import { TransducerType } from './orchestrator';

export type TransducerCategory = 'Bending' | 'Column' | 'Shear' | 'Pressure' | 'Multi-Axis';

export interface TransducerDefinition {
  type: TransducerType;
  label: string;
  category: TransducerCategory;
  description: string;
}

export const TRANSDUCER_DEFINITIONS: TransducerDefinition[] = [
  // Bending
  { type: 'cantilever', label: 'Cantilever Beam', category: 'Bending', description: 'Simple cantilever bending member.' },
  { type: 'reverseBeam', label: 'Reverse Bending Beam', category: 'Bending', description: 'Simply supported beam with center load.' },
  { type: 'dualBeam', label: 'Dual Bending Beam', category: 'Bending', description: 'Parallel flexure for off-center load compensation.' },
  { type: 'binoBeam', label: 'Binocular Beam', category: 'Bending', description: 'Dual-hole bending beam for high sensitivity.' },
  { type: 'sBeam', label: 'S-Beam', category: 'Bending', description: 'S-shaped bending flexure for tension/compression.' },
  
  // Column
  { type: 'squareColumn', label: 'Square Column', category: 'Column', description: 'Solid square section axial pillar.' },
  { type: 'roundSolidColumn', label: 'Round Solid Column', category: 'Column', description: 'Solid round section axial pillar.' },
  { type: 'roundHollowColumn', label: 'Round Hollow Column', category: 'Column', description: 'Hollow round section axial pillar.' },

  // Shear & Torque
  { type: 'squareShear', label: 'Square Shear Beam', category: 'Shear', description: 'Square section transverse shear beam.' },
  { type: 'roundShear', label: 'Round Shear Beam', category: 'Shear', description: 'Round section transverse shear beam.' },
  { type: 'roundSBeamShear', label: 'S-Beam Shear', category: 'Shear', description: 'Shear-based S-beam transducer.' },
  { type: 'squareTorque', label: 'Square Torque', category: 'Shear', description: 'Torsional strain in square shaft.' },
  { type: 'roundSolidTorque', label: 'Round Solid Torque', category: 'Shear', description: 'Torsional strain in solid round shaft.' },
  { type: 'roundHollowTorque', label: 'Round Hollow Torque', category: 'Shear', description: 'Torsional strain in hollow round shaft.' },

  // Pressure
  { type: 'pressure', label: 'Pressure Diaphragm', category: 'Pressure', description: 'Flat circular diaphragm for pressure sensing.' },
];

export const TRANSDUCER_CATEGORIES: TransducerCategory[] = ['Bending', 'Column', 'Shear', 'Pressure', 'Multi-Axis'];

export function getDefinitionsByCategory(category: TransducerCategory): TransducerDefinition[] {
  return TRANSDUCER_DEFINITIONS.filter(d => d.category === category);
}
