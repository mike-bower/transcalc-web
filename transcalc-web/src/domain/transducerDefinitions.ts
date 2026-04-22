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

  // Multi-Axis
  { type: 'sixAxisFTCrossBeam', label: '6-DOF F/T Cross-Beam', category: 'Multi-Axis', description: 'Maltese-cross flexure for simultaneous Fx/Fy/Fz/Mx/My/Mz sensing. Used in robot wrists and ankles.' },
  { type: 'jointTorqueSensor',  label: 'Joint Torque Sensor',  category: 'Multi-Axis', description: 'Spoke-flexure disk for torsional stiffness and torque sensing in compliant actuators and SEA drives.' },
  { type: 'hexapodFT',          label: 'Hexapod F/T Sensor',   category: 'Multi-Axis', description: '6-strut Stewart platform (ATI/JR3 topology) for 6-DOF force/torque sensing with axial-only strut loading.' },
];

export const TRANSDUCER_CATEGORIES: TransducerCategory[] = ['Bending', 'Column', 'Shear', 'Pressure', 'Multi-Axis'];

export function getDefinitionsByCategory(category: TransducerCategory): TransducerDefinition[] {
  return TRANSDUCER_DEFINITIONS.filter(d => d.category === category);
}
