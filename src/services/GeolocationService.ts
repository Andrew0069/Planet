export interface GeoResult {
  latitudeDeg: number;
  longitudeDeg: number;
  accuracyM: number | null;
}

export type GeoErrorReason = 'unsupported' | 'denied' | 'unavailable' | 'timeout';

export class GeoError extends Error {
  constructor(public readonly reason: GeoErrorReason) {
    super(`geolocation-${reason}`);
  }
}

/** Acceso a la geolocalización del navegador, aislado del motor físico (SkyEngine debe seguir sin DOM). */
export class GeolocationService {
  public static isSupported(): boolean {
    return typeof navigator !== 'undefined' && !!navigator.geolocation;
  }

  public static request(timeoutMs = 8000): Promise<GeoResult> {
    return new Promise((resolve, reject) => {
      if (!this.isSupported()) {
        reject(new GeoError('unsupported'));
        return;
      }
      navigator.geolocation.getCurrentPosition(
        (position) => {
          resolve({
            latitudeDeg: position.coords.latitude,
            longitudeDeg: position.coords.longitude,
            accuracyM: position.coords.accuracy ?? null,
          });
        },
        (error) => {
          reject(new GeoError(mapErrorReason(error.code)));
        },
        { enableHighAccuracy: false, timeout: timeoutMs, maximumAge: 300_000 },
      );
    });
  }
}

function mapErrorReason(code: number): GeoErrorReason {
  if (code === 1) return 'denied';
  if (code === 3) return 'timeout';
  return 'unavailable';
}
