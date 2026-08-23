import { describe, expect, it } from 'vitest';
import { KerrEngine } from '../src/core/relativity/KerrEngine';
import { SI } from '../src/core/scientific.types';

describe('KerrEngine', () => {
  it('recupera los radios de Schwarzschild cuando a*=0', () => {
    const geometry = KerrEngine.geometry({ massKg: 10 * SI.SOLAR_MASS_KG, spin: 0, inclinationRad: Math.PI / 2 });
    expect(geometry.horizonOuterRg).toBeCloseTo(2, 12);
    expect(geometry.iscoProgradeRg).toBeCloseTo(6, 12);
    expect(geometry.iscoRetrogradeRg).toBeCloseTo(6, 12);
  });

  it('separa los ISCO prógrado y retrógrado con espín', () => {
    const geometry = KerrEngine.geometry({ massKg: SI.SOLAR_MASS_KG, spin: 0.9, inclinationRad: Math.PI / 3 });
    expect(geometry.iscoProgradeRg).toBeLessThan(6);
    expect(geometry.iscoRetrogradeRg).toBeGreaterThan(6);
  });

  it('integra una geodésica nula con restricciones finitas', () => {
    const trajectory = KerrEngine.trace(
      { massKg: 10 * SI.SOLAR_MASS_KG, spin: 0.5, inclinationRad: Math.PI / 2 },
      { energy: 1, axialAngularMomentum: 3, carterConstant: 1, particleMass: 0 },
      { affine: 0, t: 0, r: 20, theta: Math.PI / 2, phi: 0, radialSign: -1, polarSign: 1 },
      { maxSteps: 1000, step: 0.02 }
    );
    expect(trajectory.points.length).toBeGreaterThan(10);
    expect(Number.isFinite(trajectory.maxConstraintError)).toBe(true);
    expect(trajectory.maxConstraintError).toBeLessThan(1e-10);
  });
});
