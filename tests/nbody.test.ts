import { describe, expect, it } from 'vitest';
import { elementsToState, NBodyEngine } from '../src/core/physics/NBodyEngine';
import { OrbitalBody, SI, SystemDefinition } from '../src/core/scientific.types';

const meta = { evidence: 'simulated' as const, source: 'test', accessedAt: '2026-08-22' };

function earth(axisAU = 1): OrbitalBody {
  return {
    id: 'earth', name: 'Tierra', kind: 'planet', massKg: SI.EARTH_MASS_KG, radiusM: SI.EARTH_RADIUS_M,
    colorHex: '#58a6df', metadata: meta,
    elements: {
      semiMajorAxisM: axisAU * SI.AU_M, eccentricity: 0, inclinationRad: 0, ascendingNodeRad: 0,
      argumentOfPeriapsisRad: 0, meanAnomalyAtEpochRad: 0, epochJulianDate: 2451545, periodSeconds: SI.YEAR_S
    }
  };
}

function solarSystem(body = earth()): SystemDefinition {
  return {
    id: 'test', name: 'Prueba', description: 'Dos cuerpos', immutable: false, metadata: meta,
    star: {
      id: 'sun', name: 'Sol', massKg: SI.SOLAR_MASS_KG, radiusM: SI.SOLAR_RADIUS_M,
      effectiveTemperatureK: 5772, luminositySolar: 1, spectralClass: 'G2V', activity: 'moderate', colorHex: '#fff1ba', metadata: meta
    },
    bodies: [body]
  };
}

describe('NBodyEngine', () => {
  it('conserva energía y momento en una órbita de dos cuerpos', () => {
    const engine = new NBodyEngine();
    engine.initialize(solarSystem(), { stepSeconds: SI.YEAR_S / 2000, softeningM: 0 });
    const snapshot = engine.step(20_000);
    expect(snapshot.metrics.relativeEnergyError).toBeLessThan(1e-4);
    expect(snapshot.metrics.relativeAngularMomentumError).toBeLessThan(1e-10);
    expect(Math.hypot(snapshot.metrics.barycenterM.x, snapshot.metrics.barycenterM.y, snapshot.metrics.barycenterM.z)).toBeLessThan(1e-3);
  });

  it('la masa estelar cambia la velocidad orbital', () => {
    const body = earth();
    const solar = elementsToState(body, SI.SOLAR_MASS_KG);
    const doubleMass = elementsToState(body, SI.SOLAR_MASS_KG * 2);
    const vSolar = Math.hypot(solar.velocityMps.x, solar.velocityMps.y, solar.velocityMps.z);
    const vDouble = Math.hypot(doubleMass.velocityMps.x, doubleMass.velocityMps.y, doubleMass.velocityMps.z);
    expect(vDouble / vSolar).toBeCloseTo(Math.sqrt(2), 4);
  });

  it('pausa ante una colisión', () => {
    const body = earth(0.001);
    body.radiusM = 0.002 * SI.AU_M;
    const engine = new NBodyEngine();
    engine.initialize(solarSystem(body), { stepSeconds: 1, closeEncounterFactor: 1 });
    const snapshot = engine.step();
    expect(snapshot.paused).toBe(true);
    expect(snapshot.events.some((event) => event.type === 'collision')).toBe(true);
  });
});
