import {
  ObservationMetadata,
  OrbitalBody,
  SI,
  StellarBody,
  SystemDefinition
} from '../core/scientific.types';

const NASA_URL = 'https://exoplanetarchive.ipac.caltech.edu/';
const ACCESSED = '2026-08-22';
const deg = (value: number): number => (value * Math.PI) / 180;

function metadata(evidence: ObservationMetadata['evidence'], note?: string): ObservationMetadata {
  return {
    evidence,
    source: 'NASA Exoplanet Archive / literatura de descubrimiento',
    sourceUrl: NASA_URL,
    accessedAt: ACCESSED,
    note
  };
}

function star(
  id: string,
  name: string,
  massSolar: number,
  radiusSolar: number,
  tempK: number,
  luminositySolar: number,
  spectralClass: string,
  activity: StellarBody['activity'] = 'unknown'
): StellarBody {
  return {
    id,
    name,
    massKg: massSolar * SI.SOLAR_MASS_KG,
    radiusM: radiusSolar * SI.SOLAR_RADIUS_M,
    effectiveTemperatureK: tempK,
    luminositySolar,
    spectralClass,
    activity,
    colorHex: tempK < 3800 ? '#ff704d' : tempK < 5300 ? '#ffb45c' : tempK < 6500 ? '#fff0c2' : '#d8e8ff',
    metadata: metadata('observed')
  };
}

function planet(
  id: string,
  name: string,
  massEarth: number,
  radiusEarth: number,
  semiMajorAU: number,
  periodDays: number,
  options: Partial<Pick<OrbitalBody, 'discoveryMethod' | 'equilibriumTemperatureK'>> & {
    eccentricity?: number;
    inclinationDeg?: number;
    evidence?: ObservationMetadata['evidence'];
    colorHex?: string;
  } = {}
): OrbitalBody {
  return {
    id,
    name,
    kind: 'planet',
    massKg: massEarth * SI.EARTH_MASS_KG,
    radiusM: radiusEarth * SI.EARTH_RADIUS_M,
    colorHex: options.colorHex ?? '#65a9dc',
    discoveryMethod: options.discoveryMethod,
    equilibriumTemperatureK: options.equilibriumTemperatureK,
    elements: {
      semiMajorAxisM: semiMajorAU * SI.AU_M,
      eccentricity: options.eccentricity ?? 0,
      inclinationRad: deg(options.inclinationDeg ?? 90),
      ascendingNodeRad: 0,
      argumentOfPeriapsisRad: 0,
      meanAnomalyAtEpochRad: 0,
      epochJulianDate: 2451545,
      periodSeconds: periodDays * SI.DAY_S
    },
    metadata: metadata(options.evidence ?? 'observed', 'La fase y orientación 3D se asumen cuando no están publicadas.')
  };
}

function system(
  id: string,
  name: string,
  distanceLightYears: number | undefined,
  description: string,
  host: StellarBody,
  bodies: OrbitalBody[]
): SystemDefinition {
  return { id, name, distanceLightYears, description, star: host, bodies, metadata: metadata('observed'), immutable: true };
}

const solarStar = star('sun', 'Sol', 1, 1, 5772, 1, 'G2V', 'moderate');

export const CURATED_SYSTEMS: SystemDefinition[] = [
  system('solar', 'Sistema Solar', undefined, 'Referencia local con los ocho planetas principales.', solarStar, [
    planet('mercury', 'Mercurio', 0.0553, 0.383, 0.3871, 87.969, { eccentricity: 0.2056, inclinationDeg: 7.005, colorHex: '#9b948c' }),
    planet('venus', 'Venus', 0.815, 0.949, 0.7233, 224.701, { eccentricity: 0.0068, inclinationDeg: 3.395, colorHex: '#e9bd72' }),
    planet('earth', 'Tierra', 1, 1, 1, 365.256, { eccentricity: 0.0167, inclinationDeg: 0, colorHex: '#3f83d1' }),
    planet('mars', 'Marte', 0.1074, 0.532, 1.5237, 686.98, { eccentricity: 0.0934, inclinationDeg: 1.85, colorHex: '#c75a35' }),
    planet('jupiter', 'Júpiter', 317.83, 11.21, 5.2026, 4332.59, { eccentricity: 0.0489, inclinationDeg: 1.304, colorHex: '#d5ad82' }),
    planet('saturn', 'Saturno', 95.16, 9.45, 9.5549, 10759.2, { eccentricity: 0.0565, inclinationDeg: 2.485, colorHex: '#e6cc8c' }),
    planet('uranus', 'Urano', 14.54, 4.01, 19.218, 30688.5, { eccentricity: 0.0463, inclinationDeg: 0.773, colorHex: '#80d7df' }),
    planet('neptune', 'Neptuno', 17.15, 3.88, 30.11, 60182, { eccentricity: 0.009, inclinationDeg: 1.77, colorHex: '#4169d8' })
  ]),
  system('proxima', 'Próxima Centauri', 4.2465, 'El sistema planetario conocido más cercano al Sol.', star('proxima-a', 'Próxima Centauri', 0.122, 0.154, 3042, 0.0017, 'M5.5Ve', 'high'), [
    planet('proxima-b', 'Próxima b', 1.07, 1.03, 0.04856, 11.186, { eccentricity: 0.02, discoveryMethod: 'Velocidad radial', evidence: 'derived', colorHex: '#b86f52' }),
    planet('proxima-d', 'Próxima d', 0.26, 0.75, 0.02885, 5.123, { discoveryMethod: 'Velocidad radial', evidence: 'derived', colorHex: '#9d8070' })
  ]),
  system('trappist-1', 'TRAPPIST-1', 40.66, 'Siete mundos rocosos en resonancias compactas alrededor de una enana ultrafría.', star('trappist-1-a', 'TRAPPIST-1', 0.0898, 0.1192, 2566, 0.000553, 'M8V', 'high'), [
    planet('trappist-1-b', 'TRAPPIST-1 b', 1.374, 1.116, 0.01154, 1.5109, { discoveryMethod: 'Tránsito' }),
    planet('trappist-1-c', 'TRAPPIST-1 c', 1.308, 1.097, 0.0158, 2.4218, { discoveryMethod: 'Tránsito' }),
    planet('trappist-1-d', 'TRAPPIST-1 d', 0.388, 0.788, 0.02227, 4.0496, { discoveryMethod: 'Tránsito' }),
    planet('trappist-1-e', 'TRAPPIST-1 e', 0.692, 0.92, 0.02925, 6.0996, { discoveryMethod: 'Tránsito', colorHex: '#4f90bd' }),
    planet('trappist-1-f', 'TRAPPIST-1 f', 1.039, 1.045, 0.03849, 9.2067, { discoveryMethod: 'Tránsito', colorHex: '#6686a5' }),
    planet('trappist-1-g', 'TRAPPIST-1 g', 1.321, 1.129, 0.04683, 12.3529, { discoveryMethod: 'Tránsito' }),
    planet('trappist-1-h', 'TRAPPIST-1 h', 0.326, 0.755, 0.06189, 18.767, { discoveryMethod: 'Tránsito' })
  ]),
  system('toi-700', 'TOI-700', 101.4, 'Enana M con varios planetas pequeños; d y e reciben flujos de interés climático.', star('toi-700-a', 'TOI-700', 0.416, 0.42, 3480, 0.023, 'M2V', 'low'), [
    planet('toi-700-b', 'TOI-700 b', 1.07, 0.914, 0.067, 9.978, { discoveryMethod: 'Tránsito' }),
    planet('toi-700-c', 'TOI-700 c', 7.48, 2.6, 0.0929, 16.051, { discoveryMethod: 'Tránsito' }),
    planet('toi-700-d', 'TOI-700 d', 1.72, 1.073, 0.163, 37.424, { discoveryMethod: 'Tránsito', colorHex: '#4d89b5' }),
    planet('toi-700-e', 'TOI-700 e', 0.818, 0.953, 0.134, 27.81, { discoveryMethod: 'Tránsito', colorHex: '#5d9ab8' })
  ]),
  system('kepler-186', 'Kepler-186', 579, 'Sistema compacto conocido por su planeta terrestre exterior Kepler-186 f.', star('kepler-186-a', 'Kepler-186', 0.544, 0.523, 3788, 0.055, 'M1V', 'unknown'), [
    planet('kepler-186-b', 'Kepler-186 b', 1.24, 1.07, 0.0343, 3.887, { discoveryMethod: 'Tránsito' }),
    planet('kepler-186-c', 'Kepler-186 c', 2.1, 1.25, 0.0451, 7.267, { discoveryMethod: 'Tránsito' }),
    planet('kepler-186-d', 'Kepler-186 d', 2.54, 1.4, 0.0781, 13.343, { discoveryMethod: 'Tránsito' }),
    planet('kepler-186-e', 'Kepler-186 e', 2.15, 1.27, 0.11, 22.408, { discoveryMethod: 'Tránsito' }),
    planet('kepler-186-f', 'Kepler-186 f', 1.71, 1.17, 0.432, 129.945, { discoveryMethod: 'Tránsito', evidence: 'derived', colorHex: '#5a86a3' })
  ]),
  system('kepler-90', 'Kepler-90', 2840, 'Ocho planetas conocidos alrededor de una estrella semejante al Sol.', star('kepler-90-a', 'Kepler-90', 1.2, 1.2, 6080, 1.7, 'G0V', 'unknown'), [
    planet('kepler-90-b', 'Kepler-90 b', 2.4, 1.31, 0.074, 7.009, { discoveryMethod: 'Tránsito' }),
    planet('kepler-90-c', 'Kepler-90 c', 1.7, 1.18, 0.089, 8.719, { discoveryMethod: 'Tránsito' }),
    planet('kepler-90-i', 'Kepler-90 i', 2.5, 1.32, 0.123, 14.449, { discoveryMethod: 'Tránsito' }),
    planet('kepler-90-d', 'Kepler-90 d', 8.6, 2.88, 0.32, 59.737, { discoveryMethod: 'Tránsito' }),
    planet('kepler-90-e', 'Kepler-90 e', 7.8, 2.67, 0.42, 91.94, { discoveryMethod: 'Tránsito' }),
    planet('kepler-90-f', 'Kepler-90 f', 12, 2.89, 0.48, 124.91, { discoveryMethod: 'Tránsito' }),
    planet('kepler-90-g', 'Kepler-90 g', 80, 8.1, 0.71, 210.6, { discoveryMethod: 'Tránsito' }),
    planet('kepler-90-h', 'Kepler-90 h', 203, 11.3, 1.01, 331.6, { discoveryMethod: 'Tránsito' })
  ]),
  system('55-cancri', '55 Cancri', 41, 'Sistema diverso con una supertierra ultracercana y gigantes exteriores.', star('55-cancri-a', '55 Cancri A', 0.905, 0.943, 5196, 0.582, 'K0IV-V', 'low'), [
    planet('55-cancri-e', '55 Cancri e', 8.59, 1.88, 0.01544, 0.7365, { discoveryMethod: 'Velocidad radial / tránsito', eccentricity: 0.05, colorHex: '#d66b3e' }),
    planet('55-cancri-b', '55 Cancri b', 263, 10.9, 0.115, 14.651, { discoveryMethod: 'Velocidad radial' }),
    planet('55-cancri-c', '55 Cancri c', 54.5, 6.2, 0.24, 44.398, { discoveryMethod: 'Velocidad radial' }),
    planet('55-cancri-f', '55 Cancri f', 47.8, 5.8, 0.77, 259.9, { discoveryMethod: 'Velocidad radial' }),
    planet('55-cancri-d', '55 Cancri d', 1200, 13, 5.96, 4867, { discoveryMethod: 'Velocidad radial' })
  ]),
  system('hd-209458', 'HD 209458', 159, 'Sistema del primer exoplaneta transitante con atmósfera estudiada.', star('hd-209458-a', 'HD 209458', 1.148, 1.203, 6065, 1.77, 'F8V', 'low'), [
    planet('hd-209458-b', 'HD 209458 b', 220, 15.4, 0.04707, 3.5247, { discoveryMethod: 'Tránsito / velocidad radial', equilibriumTemperatureK: 1450, colorHex: '#dd9c5f' })
  ]),
  system('hr-8799', 'HR 8799', 133.3, 'Cuatro gigantes fotografiados directamente en órbitas amplias.', star('hr-8799-a', 'HR 8799', 1.47, 1.34, 7430, 5.05, 'F0V', 'unknown'), [
    planet('hr-8799-e', 'HR 8799 e', 2500, 13, 16.4, 18200, { discoveryMethod: 'Imagen directa', evidence: 'derived' }),
    planet('hr-8799-d', 'HR 8799 d', 2500, 13, 27, 37000, { discoveryMethod: 'Imagen directa', evidence: 'derived' }),
    planet('hr-8799-c', 'HR 8799 c', 2200, 13, 42.9, 75000, { discoveryMethod: 'Imagen directa', evidence: 'derived' }),
    planet('hr-8799-b', 'HR 8799 b', 1800, 13, 68, 170000, { discoveryMethod: 'Imagen directa', evidence: 'derived' })
  ])
];

export function cloneSystemForLab(source: SystemDefinition): SystemDefinition {
  return structuredClone({ ...source, id: `lab-${source.id}`, name: `${source.name} · experimento`, immutable: false });
}
