import { ObservationMetadata, OrbitalBody, SI, StellarBody, SystemDefinition } from '../core/scientific.types';

interface NasaRow {
  hostname: string;
  pl_name: string;
  discoverymethod: string | null;
  pl_orbper: number | null;
  pl_orbsmax: number | null;
  pl_orbeccen: number | null;
  pl_orbincl: number | null;
  pl_bmasse: number | null;
  pl_rade: number | null;
  pl_eqt: number | null;
  st_mass: number | null;
  st_rad: number | null;
  st_teff: number | null;
  st_lum: number | null;
  st_spectype: string | null;
  sy_dist: number | null;
}

const TAP_ENDPOINT = 'https://exoplanetarchive.ipac.caltech.edu/TAP/sync';
const SOURCE_URL = 'https://exoplanetarchive.ipac.caltech.edu/';

export class NasaExoplanetClient {
  public async refreshSystems(hostNames: string[], signal?: AbortSignal): Promise<SystemDefinition[]> {
    const safeHosts = hostNames.map((name) => `'${name.replaceAll("'", "''")}'`).join(',');
    const query = [
      'select hostname,pl_name,discoverymethod,pl_orbper,pl_orbsmax,pl_orbeccen,pl_orbincl,',
      'pl_bmasse,pl_rade,pl_eqt,st_mass,st_rad,st_teff,st_lum,st_spectype,sy_dist ',
      `from pscomppars where hostname in (${safeHosts}) order by hostname,pl_orbper`
    ].join('');
    const url = `${TAP_ENDPOINT}?query=${encodeURIComponent(query)}&format=json`;
    const response = await fetch(url, { signal });
    if (!response.ok) throw new Error(`NASA Exoplanet Archive respondió ${response.status}`);
    const rows = (await response.json()) as NasaRow[];
    if (!Array.isArray(rows) || rows.length === 0) throw new Error('La consulta no devolvió sistemas.');
    return this.normalize(rows);
  }

  private normalize(rows: NasaRow[]): SystemDefinition[] {
    const grouped = new Map<string, NasaRow[]>();
    for (const row of rows) grouped.set(row.hostname, [...(grouped.get(row.hostname) ?? []), row]);
    const accessedAt = new Date().toISOString();
    const source = (evidence: ObservationMetadata['evidence'], note?: string): ObservationMetadata => ({
      evidence,
      source: 'NASA Exoplanet Archive — Planetary Systems Composite Parameters',
      sourceUrl: SOURCE_URL,
      accessedAt,
      note
    });

    return [...grouped.entries()].map(([hostname, planets]) => {
      const first = planets[0];
      const stellarMass = first.st_mass ?? 1;
      const stellarRadius = first.st_rad ?? Math.pow(stellarMass, 0.8);
      const temperature = first.st_teff ?? 5772;
      const luminosity = first.st_lum == null ? stellarRadius ** 2 * (temperature / 5772) ** 4 : 10 ** first.st_lum;
      const host: StellarBody = {
        id: `${slug(hostname)}-star`,
        name: hostname,
        massKg: stellarMass * SI.SOLAR_MASS_KG,
        radiusM: stellarRadius * SI.SOLAR_RADIUS_M,
        effectiveTemperatureK: temperature,
        luminositySolar: luminosity,
        spectralClass: first.st_spectype ?? 'no publicada',
        activity: 'unknown',
        colorHex: temperature < 3800 ? '#ff704d' : temperature < 5300 ? '#ffb45c' : temperature < 6500 ? '#fff0c2' : '#d8e8ff',
        metadata: source(first.st_mass == null || first.st_rad == null ? 'derived' : 'observed')
      };

      const bodies: OrbitalBody[] = planets.map((row, index) => {
        const periodSeconds = (row.pl_orbper ?? 365.25) * SI.DAY_S;
        const derivedAxis = Math.cbrt(
          (SI.G * host.massKg * periodSeconds * periodSeconds) / (4 * Math.PI * Math.PI)
        );
        const missingGeometry = row.pl_orbincl == null;
        return {
          id: slug(row.pl_name),
          name: row.pl_name,
          kind: 'planet',
          massKg: (row.pl_bmasse ?? estimateMass(row.pl_rade)) * SI.EARTH_MASS_KG,
          radiusM: (row.pl_rade ?? 1) * SI.EARTH_RADIUS_M,
          colorHex: palette(index),
          discoveryMethod: row.discoverymethod ?? undefined,
          equilibriumTemperatureK: row.pl_eqt ?? undefined,
          elements: {
            semiMajorAxisM: row.pl_orbsmax == null ? derivedAxis : row.pl_orbsmax * SI.AU_M,
            eccentricity: row.pl_orbeccen ?? 0,
            inclinationRad: ((row.pl_orbincl ?? 90) * Math.PI) / 180,
            ascendingNodeRad: 0,
            argumentOfPeriapsisRad: 0,
            meanAnomalyAtEpochRad: 0,
            epochJulianDate: 2451545,
            periodSeconds
          },
          metadata: source(
            row.pl_bmasse == null || row.pl_orbsmax == null || missingGeometry ? 'derived' : 'observed',
            missingGeometry ? 'Orientación y fase 3D asumidas para visualización.' : 'La fase orbital se representa desde una época común ilustrativa.'
          )
        };
      });

      return {
        id: slug(hostname),
        name: hostname,
        distanceLightYears: first.sy_dist == null ? undefined : first.sy_dist * 3.26156,
        description: `${bodies.length} planeta${bodies.length === 1 ? '' : 's'} confirmado${bodies.length === 1 ? '' : 's'}; actualización de sesión.`,
        star: host,
        bodies,
        metadata: source('observed'),
        immutable: true
      };
    });
  }
}

function slug(value: string): string {
  return value.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}

function estimateMass(radiusEarth: number | null): number {
  if (radiusEarth == null) return 1;
  if (radiusEarth < 1.5) return radiusEarth ** 3.7;
  if (radiusEarth < 4) return 2.7 * radiusEarth ** 1.3;
  return Math.min(318, 0.8 * radiusEarth ** 2.2);
}

function palette(index: number): string {
  return ['#62a9e8', '#db8155', '#7cc6a3', '#c7a56a', '#9e83d8', '#79bed1', '#d4788f', '#a9b26e'][index % 8];
}
