import { describe, expect, it } from 'vitest';
import { ThermodynamicsEngine } from '../src/core/thermodynamics/ThermodynamicsEngine';
import { CURATED_SYSTEMS } from '../src/data/exoplanets.data';
import { SI } from '../src/core/scientific.types';

describe('catálogo científico', () => {
  it('incluye los nueve sistemas curados con cantidades SI válidas', () => {
    expect(CURATED_SYSTEMS).toHaveLength(9);
    for (const system of CURATED_SYSTEMS) {
      expect(system.immutable).toBe(true);
      expect(system.star.massKg).toBeGreaterThan(0);
      expect(system.star.radiusM).toBeGreaterThan(0);
      expect(system.bodies.length).toBeGreaterThan(0);
      for (const body of system.bodies) {
        expect(body.massKg).toBeGreaterThan(0);
        expect(body.elements.semiMajorAxisM).toBeGreaterThan(0);
        expect(body.elements.eccentricity).toBeGreaterThanOrEqual(0);
        expect(body.elements.eccentricity).toBeLessThan(1);
      }
    }
  });

  it('la zona habitable depende del espectro y luminosidad reales de la estrella', () => {
    const solar = CURATED_SYSTEMS.find((system) => system.id === 'solar')!;
    const trappist = CURATED_SYSTEMS.find((system) => system.id === 'trappist-1')!;
    const solarHz = ThermodynamicsEngine.calculateSpectralHabitableZone(solar.star);
    const trappistHz = ThermodynamicsEngine.calculateSpectralHabitableZone(trappist.star);
    expect(solarHz.innerM / SI.AU_M).toBeGreaterThan(0.9);
    expect(solarHz.outerM / SI.AU_M).toBeGreaterThan(1.5);
    expect(trappistHz.outerM).toBeLessThan(solarHz.innerM);
  });
});
