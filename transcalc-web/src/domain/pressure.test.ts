import { describe, it, expect } from 'vitest';
import { calculateRadial, calculateTangential, type PressureParams } from './pressure';

describe('Pressure Diaphragm Module', () => {
  describe('Valid calculations - basic operation', () => {
    it('should calculate radial strain for typical US pressure parameters', () => {
      // Steel diaphragm: ν = 0.3, E = 30e6 PSI
      const pressure = 1000; // PSI
      const thickness = 0.1; // inches
      const diameter = 2.0; // inches
      const poisson = 0.3;
      const modulus = 30e6; // PSI

      const radial = calculateRadial(pressure, thickness, diameter, poisson, modulus);
      
      // Numerator = -3 * 1000 * (1.0)² * (1 - 0.09) = -3000 * 0.91 = -2730
      // Denominator = 4 * 0.01 * 30e6 = 1200000
      // Result = (-2730 / 1200000) * 1e6 = -2275 microstrains
      expect(radial).toBeLessThan(0); // Radial strain is always negative (compression)
      expect(Math.abs(radial)).toBeCloseTo(2275, -1);
    });

    it('should calculate tangential strain for typical US parameters', () => {
      const pressure = 1000;
      const thickness = 0.1;
      const diameter = 2.0;
      const poisson = 0.3;
      const modulus = 30e6;

      const tangential = calculateTangential(pressure, thickness, diameter, poisson, modulus);
      
      // Numerator = 3 * 1000 * (1.0)² * (1 - 0.09) = 3000 * 0.91 = 2730
      // Denominator = 8 * 0.01 * 30e6 = 2400000
      // Result = (2730 / 2400000) * 1e6 = 1137.5 microstrains
      expect(tangential).toBeGreaterThan(0); // Tangential strain is positive (tension)
      expect(tangential).toBeCloseTo(1137.5, 0);
    });

    it('should calculate strains with low pressure', () => {
      const pressure = 10; // Low pressure
      const thickness = 0.1;
      const diameter = 2.0;
      const poisson = 0.3;
      const modulus = 30e6;

      const radial = calculateRadial(pressure, thickness, diameter, poisson, modulus);
      
      // Proportional to pressure, so ~22.75 microstrain (1/100th of 1000 PSI case)
      expect(radial).toBeCloseTo(-22.75, 0);
    });

    it('should calculate strains with thick diaphragm', () => {
      const pressure = 1000;
      const thickness = 0.5; // Thicker → lower strain
      const diameter = 2.0;
      const poisson = 0.3;
      const modulus = 30e6;

      const radial = calculateRadial(pressure, thickness, diameter, poisson, modulus);
      
      // Thickness in denominator, so thicker = lower strain (inverse square)
      // 0.5 vs 0.1 = 25x thicker = 1/25 strain
      expect(Math.abs(radial)).toBeCloseTo(2275 / 25, 0);
    });

    it('should calculate strains with small diameter', () => {
      const pressure = 1000;
      const thickness = 0.1;
      const diameter = 0.5; // Small diameter → lower strain
      const poisson = 0.3;
      const modulus = 30e6;

      const radial = calculateRadial(pressure, thickness, diameter, poisson, modulus);
      const tangential = calculateTangential(pressure, thickness, diameter, poisson, modulus);
      
      // Diameter in numerator squared, so 0.5 vs 2.0 = 0.25 radius → 1/16 of strain
      expect(Math.abs(radial)).toBeLessThan(Math.abs(-2275));
      expect(tangential).toBeLessThan(1137.5);
    });

    it('should calculate strains with different material (low Poisson)', () => {
      const pressure = 1000;
      const thickness = 0.1;
      const diameter = 2.0;
      const poisson = 0.2; // Lower Poisson ratio (e.g., aluminum)
      const modulus = 10e6; // Lower modulus (softer material)

      const radial = calculateRadial(pressure, thickness, diameter, poisson, modulus);
      
      // Lower modulus → higher strain
      expect(Math.abs(radial)).toBeGreaterThan(Math.abs(-2275));
    });
  });

  describe('Input boundary testing', () => {
    it('should handle zero pressure', () => {
      const radial = calculateRadial(0, 0.1, 2.0, 0.3, 30e6);
      expect(radial).toBeCloseTo(0, 5); // Zero within floating-point precision
    });

    it('should handle zero thickness (edge case)', () => {
      // Zero thickness should cause Infinity or error-like behavior
      const radial = calculateRadial(1000, 0, 2.0, 0.3, 30e6);
      expect(Math.abs(radial)).toBeGreaterThan(1e10); // Very large value
    });

    it('should calculate strains with maximum diameter', () => {
      const pressure = 1000;
      const thickness = 0.1;
      const diameter = 10.0; // Large diameter → high strain
      const poisson = 0.3;
      const modulus = 30e6;

      const radial = calculateRadial(pressure, thickness, diameter, poisson, modulus);
      
      // Diameter squared, so 10 vs 2 = 25x larger
      expect(Math.abs(radial)).toBeCloseTo(2275 * 25, -1);
    });

    it('should calculate strains with extreme modulus', () => {
      const pressure = 1000;
      const thickness = 0.1;
      const diameter = 2.0;
      const poisson = 0.3;
      const modulus = 50e6; // Very stiff material

      const radial = calculateRadial(pressure, thickness, diameter, poisson, modulus);
      
      // Higher modulus → lower strain
      expect(Math.abs(radial)).toBeLessThan(2275);
    });
  });

  describe('Poisson ratio effects', () => {
    it('should handle minimum Poisson ratio (0.1)', () => {
      const pressure = 1000;
      const thickness = 0.1;
      const diameter = 2.0;
      const poisson = 0.1;
      const modulus = 30e6;

      const radial = calculateRadial(pressure, thickness, diameter, poisson, modulus);
      
      // Lower Poisson → lower (1-ν²) factor → lower magnitude
      expect(radial).toBeLessThan(0);
    });

    it('should handle maximum Poisson ratio (0.5 for rubber)', () => {
      const pressure = 1000;
      const thickness = 0.1;
      const diameter = 2.0;
      const poisson = 0.49; // Near-incompressible material
      const modulus = 1e6; // Soft material

      const radial = calculateRadial(pressure, thickness, diameter, poisson, modulus);
      
      // High Poisson → higher (1-ν²) factor → larger magnitude
      expect(Math.abs(radial)).toBeGreaterThan(0);
    });

    it('should show relationship between radial and tangential strain', () => {
      const pressure = 1000;
      const thickness = 0.1;
      const diameter = 2.0;
      const poisson = 0.3;
      const modulus = 30e6;

      const radial = calculateRadial(pressure, thickness, diameter, poisson, modulus);
      const tangential = calculateTangential(pressure, thickness, diameter, poisson, modulus);
      
      // Tangential/Radial ratio should be constant: (3*1)/(8) / (3*1)/(4) = (3/8)/(3/4) = 1/2
      expect(tangential / Math.abs(radial)).toBeCloseTo(0.5, 1);
    });
  });

  describe('Strain relationships and physics', () => {
    it('radial strain should always be negative (compression)', () => {
      const pressures = [10, 100, 1000, 10000];
      for (const p of pressures) {
        const radial = calculateRadial(p, 0.1, 2.0, 0.3, 30e6);
        expect(radial).toBeLessThanOrEqual(0);
      }
    });

    it('tangential strain should be positive (tension)', () => {
      const pressures = [10, 100, 1000, 10000];
      for (const p of pressures) {
        const tangential = calculateTangential(p, 0.1, 2.0, 0.3, 30e6);
        expect(tangential).toBeGreaterThanOrEqual(0);
      }
    });

    it('magnitude of radial strain should be proportional to pressure', () => {
      const thickness = 0.1;
      const diameter = 2.0;
      const poisson = 0.3;
      const modulus = 30e6;

      const radial1 = calculateRadial(1000, thickness, diameter, poisson, modulus);
      const radial2 = calculateRadial(2000, thickness, diameter, poisson, modulus);
      
      // Double pressure should double strain magnitude
      expect(Math.abs(radial2)).toBeCloseTo(Math.abs(radial1) * 2, 1);
    });

    it('strain should be inversely proportional to thickness squared', () => {
      const pressure = 1000;
      const diameter = 2.0;
      const poisson = 0.3;
      const modulus = 30e6;

      const radial1 = calculateRadial(pressure, 0.1, diameter, poisson, modulus);
      const radial2 = calculateRadial(pressure, 0.2, diameter, poisson, modulus);
      
      // 2x thickness = 4x area, so 1/4 strain
      expect(Math.abs(radial2)).toBeCloseTo(Math.abs(radial1) / 4, 1);
    });

    it('strain should be proportional to diameter squared', () => {
      const pressure = 1000;
      const thickness = 0.1;
      const poisson = 0.3;
      const modulus = 30e6;

      const radial1 = calculateRadial(pressure, thickness, 2.0, poisson, modulus);
      const radial2 = calculateRadial(pressure, thickness, 4.0, poisson, modulus);
      
      // 2x diameter = 4x area, so 4x strain
      expect(Math.abs(radial2)).toBeCloseTo(Math.abs(radial1) * 4, 0);
    });
  });

  describe('Material property effects', () => {
    it('stiffer material (higher modulus) should show lower strain', () => {
      const pressure = 1000;
      const thickness = 0.1;
      const diameter = 2.0;
      const poisson = 0.3;

      const radialSoft = calculateRadial(pressure, thickness, diameter, poisson, 20e6);
      const radialStiff = calculateRadial(pressure, thickness, diameter, poisson, 40e6);
      
      expect(Math.abs(radialStiff)).toBeLessThan(Math.abs(radialSoft));
    });

    it('should match standard material combinations', () => {
      // Steel: ν ≈ 0.3, E ≈ 30 MPa
      // Aluminum: ν ≈ 0.33, E ≈ 70 MPa
      // Copper: ν ≈ 0.34, E ≈ 110 MPa
      
      const pressure = 1000;
      const thickness = 0.1;
      const diameter = 2.0;

      const steel = calculateRadial(pressure, thickness, diameter, 0.3, 30e6);
      const aluminum = calculateRadial(pressure, thickness, diameter, 0.33, 70e6);
      
      // Aluminum has higher modulus, so lower strain magnitude
      expect(Math.abs(aluminum)).toBeLessThan(Math.abs(steel));
    });
  });

  describe('Symmetry and consistency checks', () => {
    it('tangential and radial strains should have consistent ratio', () => {
      const params: [number, number, number, number, number][] = [
        [100, 0.05, 1.0, 0.3, 30e6],
        [1000, 0.1, 2.0, 0.3, 30e6],
        [5000, 0.2, 3.0, 0.3, 30e6],
      ];

      for (const [p, t, d, ν, E] of params) {
        const r = calculateRadial(p, t, d, ν, E);
        const tan = calculateTangential(p, t, d, ν, E);
        
        // Ratio should be 0.5 (tangential / |radial|)
        expect(tan / Math.abs(r)).toBeCloseTo(0.5, 1);
      }
    });

    it('should handle edge case: very thin diaphragm', () => {
      const pressure = 1000;
      const thickness = 0.001; // Very thin
      const diameter = 2.0;
      const poisson = 0.3;
      const modulus = 30e6;

      const radial = calculateRadial(pressure, thickness, diameter, poisson, modulus);
      
      // Very thin → very high strain
      expect(Math.abs(radial)).toBeGreaterThan(100000);
    });
  });

  describe('Real-world scenarios', () => {
    it('should model pressure sensor with typical parameters', () => {
      // Typical pressure sensor: 0.5mm stainless steel, 10mm diameter, 1000 PSI
      const pressure = 1000; // PSI
      const thickness = 0.5 / 25.4; // 0.5mm → inches
      const diameter = 10 / 25.4; // 10mm → inches
      const poisson = 0.3;
      const modulus = 28e6; // Stainless steel

      const radial = calculateRadial(pressure, thickness, diameter, poisson, modulus);
      
      // Should produce reasonable strain in sensor range (100-10000 microstrains)
      expect(Math.abs(radial)).toBeGreaterThan(100);
      expect(Math.abs(radial)).toBeLessThan(100000);
    });

    it('should model low-pressure sensor with thin diaphragm', () => {
      // Low-pressure sensor: 0.1mm, 5mm diameter, 100 PSI
      const pressure = 100;
      const thickness = 0.1 / 25.4; // 0.1mm → inches
      const diameter = 5 / 25.4; // 5mm → inches
      const poisson = 0.3;
      const modulus = 30e6;

      const radial = calculateRadial(pressure, thickness, diameter, poisson, modulus);
      
      // Should still produce measurable strain
      expect(Math.abs(radial)).toBeGreaterThan(10);
    });
  });
});
