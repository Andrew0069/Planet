import { afterEach, describe, expect, it, vi } from 'vitest';
import { GeoError, GeolocationService } from '../src/services/GeolocationService';
import { SkyEngine } from '../src/core/physics/SkyEngine';

describe('GeolocationService', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('reporta no soportado cuando no hay navigator.geolocation', async () => {
    vi.stubGlobal('navigator', {});
    expect(GeolocationService.isSupported()).toBe(false);
    await expect(GeolocationService.request()).rejects.toMatchObject({ reason: 'unsupported' });
  });

  it('resuelve con lat/lon/precisión en éxito', async () => {
    vi.stubGlobal('navigator', {
      geolocation: {
        getCurrentPosition: (success: PositionCallback) => {
          success({ coords: { latitude: 13.5, longitude: -89.1, accuracy: 25 } } as GeolocationPosition);
        },
      },
    });
    const result = await GeolocationService.request();
    expect(result.latitudeDeg).toBe(13.5);
    expect(result.longitudeDeg).toBe(-89.1);
    expect(result.accuracyM).toBe(25);
  });

  it('mapea el código de error 1 (denegado) a reason "denied"', async () => {
    vi.stubGlobal('navigator', {
      geolocation: {
        getCurrentPosition: (_success: PositionCallback, error: PositionErrorCallback) => {
          error({ code: 1 } as GeolocationPositionError);
        },
      },
    });
    await expect(GeolocationService.request()).rejects.toBeInstanceOf(GeoError);
    await expect(GeolocationService.request()).rejects.toMatchObject({ reason: 'denied' });
  });

  it('mapea el código de error 3 (timeout) a reason "timeout"', async () => {
    vi.stubGlobal('navigator', {
      geolocation: {
        getCurrentPosition: (_success: PositionCallback, error: PositionErrorCallback) => {
          error({ code: 3 } as GeolocationPositionError);
        },
      },
    });
    await expect(GeolocationService.request()).rejects.toMatchObject({ reason: 'timeout' });
  });

  it('mapea cualquier otro código a reason "unavailable"', async () => {
    vi.stubGlobal('navigator', {
      geolocation: {
        getCurrentPosition: (_success: PositionCallback, error: PositionErrorCallback) => {
          error({ code: 2 } as GeolocationPositionError);
        },
      },
    });
    await expect(GeolocationService.request()).rejects.toMatchObject({ reason: 'unavailable' });
  });
});

describe('SkyEngine.estimateUtcOffsetHours', () => {
  it('aproxima el huso horario real de Santa Tecla (-6)', () => {
    expect(SkyEngine.estimateUtcOffsetHours(-89.2797)).toBe(-6);
  });

  it('clampa a los límites -12..14', () => {
    expect(SkyEngine.estimateUtcOffsetHours(-200)).toBe(-12);
    expect(SkyEngine.estimateUtcOffsetHours(400)).toBe(14);
  });
});
