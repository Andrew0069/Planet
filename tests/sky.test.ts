import { describe, expect, it } from 'vitest';
import { SANTA_TECLA, SkyEngine } from '../src/core/physics/SkyEngine';

describe('cielo local Santa Tecla', () => {
  const night = SkyEngine.fromLocalInputValue('2026-08-24T21:00', SANTA_TECLA.utcOffsetHours);

  it('interpreta la hora civil UTC-6', () => {
    expect(night.toISOString()).toBe('2026-08-25T03:00:00.000Z');
  });

  it('a las 21:00 local el Sol está bajo el horizonte', () => {
    const sky = SkyEngine.observe(SANTA_TECLA, night);
    const sun = sky.objects.find((item) => item.id === 'sun')!;
    expect(sun.altitudeDeg).toBeLessThan(-6);
    expect(sky.twilight.condition).toBe('night');
  });

  it('la Tierra queda a ~1 UA del Sol', () => {
    const sky = SkyEngine.observe(SANTA_TECLA, night);
    const sun = sky.objects.find((item) => item.id === 'sun')!;
    expect(sun.distanceAU).toBeGreaterThan(0.98);
    expect(sun.distanceAU).toBeLessThan(1.03);
  });

  it('Sirio tiene coordenadas J2000 reconocibles', () => {
    const sky = SkyEngine.observe(SANTA_TECLA, night);
    const sirius = sky.objects.find((item) => item.id === 'sirius')!;
    expect(sirius.raDeg).toBeGreaterThan(100);
    expect(sirius.raDeg).toBeLessThan(103);
    expect(sirius.decDeg).toBeLessThan(-16);
  });

  it('calcula salida y ocaso del Sol en la fecha civil', () => {
    const events = SkyEngine.events(SANTA_TECLA, night, 'sun');
    expect(events.neverRises).toBe(false);
    expect(events.rise).toBeTruthy();
    expect(events.set).toBeTruthy();
    expect(events.set!.getTime()).toBeGreaterThan(events.rise!.getTime());
  });
});
