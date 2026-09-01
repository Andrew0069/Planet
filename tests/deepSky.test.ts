import { describe, expect, it } from 'vitest';
import { DEEP_SKY_OBJECTS } from '../src/data/deepSky.data';
import { SANTA_TECLA, SkyEngine } from '../src/core/physics/SkyEngine';

describe('catálogo de cielo profundo', () => {
  it('tiene entre 20 y 30 objetos curados', () => {
    expect(DEEP_SKY_OBJECTS.length).toBeGreaterThanOrEqual(20);
    expect(DEEP_SKY_OBJECTS.length).toBeLessThanOrEqual(30);
  });

  it('los ids son únicos', () => {
    const ids = DEEP_SKY_OBJECTS.map((o) => o.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('coordenadas y tamaños dentro de rangos válidos', () => {
    for (const obj of DEEP_SKY_OBJECTS) {
      expect(obj.raDeg).toBeGreaterThanOrEqual(0);
      expect(obj.raDeg).toBeLessThan(360);
      expect(obj.decDeg).toBeGreaterThanOrEqual(-90);
      expect(obj.decDeg).toBeLessThanOrEqual(90);
      expect(obj.angularSizeArcmin).toBeGreaterThan(0);
      expect(obj.distanceLy).toBeGreaterThan(0);
    }
  });

  it('M31 (Andrómeda) tiene coordenadas J2000 reconocibles', () => {
    const m31 = DEEP_SKY_OBJECTS.find((o) => o.id === 'm31')!;
    expect(m31.raDeg).toBeGreaterThan(10);
    expect(m31.raDeg).toBeLessThan(11);
    expect(m31.decDeg).toBeGreaterThan(41);
    expect(m31.decDeg).toBeLessThan(42);
  });

  it('SkyEngine.observe() proyecta los objetos de cielo profundo con kind "deepsky"', () => {
    const night = SkyEngine.fromLocalInputValue('2026-08-24T21:00', SANTA_TECLA.utcOffsetHours);
    const sky = SkyEngine.observe(SANTA_TECLA, night);
    const projected = sky.objects.filter((item) => item.kind === 'deepsky');
    expect(projected.length).toBe(DEEP_SKY_OBJECTS.length);

    const m42 = projected.find((item) => item.id === 'm42')!;
    expect(m42.messier).toBe('M42');
    expect(m42.altitudeDeg).toBeGreaterThanOrEqual(-90);
    expect(m42.altitudeDeg).toBeLessThanOrEqual(90);
  });
});
