export interface SpectralClass {
  type: string;
  name: string;
  tempRange: [number, number];
  typicalTemp: number;
  colorHex: string;
  description: string;
  habitableZoneRelativeRadius: number; // Factor relativo respecto al Sol G2V
}

export const SPECTRAL_CLASSES: SpectralClass[] = [
  {
    type: 'M',
    name: 'Enana Roja (Tipo M)',
    tempRange: [2400, 3700],
    typicalTemp: 3000,
    colorHex: '#ff5e36',
    description: 'Estrella fría y longeva. Zona de habitabilidad muy cercana al astro, alta radiación UV de llamaradas.',
    habitableZoneRelativeRadius: 0.2
  },
  {
    type: 'K',
    name: 'Enana Naranja (Tipo K)',
    tempRange: [3700, 5200],
    typicalTemp: 4400,
    colorHex: '#ffaa44',
    description: 'Estrella muy estable, excelente candidata para albergar planetas con vida duradera.',
    habitableZoneRelativeRadius: 0.5
  },
  {
    type: 'G',
    name: 'Enana Amarilla (Tipo G - Como nuestro Sol)',
    tempRange: [5200, 6000],
    typicalTemp: 5778,
    colorHex: '#fff2b2',
    description: 'Clase estelar actual del Sol (G2V). Emite en el pico visible con zona habitable entre 0.95 y 1.68 UA.',
    habitableZoneRelativeRadius: 1.0
  },
  {
    type: 'F',
    name: 'Estrella Blanco-Amarilla (Tipo F)',
    tempRange: [6000, 7500],
    typicalTemp: 6800,
    colorHex: '#f4faff',
    description: 'Más masiva y luminosa que el Sol. Zona de habitabilidad desplazada hacia el exterior (1.5 - 2.8 UA).',
    habitableZoneRelativeRadius: 1.8
  },
  {
    type: 'A',
    name: 'Estrella Blanca / Azulada (Tipo A)',
    tempRange: [7500, 10000],
    typicalTemp: 8800,
    colorHex: '#bcdcff',
    description: 'Muy caliente y de vida corta. La zona de habitabilidad se desplaza más allá de Júpiter.',
    habitableZoneRelativeRadius: 3.5
  }
];

export const BASE_SUN_DATA = {
  name: 'Sol',
  baseTempK: 5778,
  minTempK: 2500,
  maxTempK: 10000,
  radiusKm: 696340,
  massKg: '1.989 × 10³⁰ kg',
  spectralType: 'G2V',
  absoluteMagnitude: 4.83,
  solarConstantEarthWm2: 1361
};
