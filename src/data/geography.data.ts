export interface GeographicLandmark {
  id: string;
  planetId: string;
  name: string;
  category: 'volcano' | 'canyon' | 'crater' | 'mountain' | 'trench' | 'plain' | 'storm' | 'sea_lake';
  latDeg: number;       // Latitud [-90 a +90]
  lonDeg: number;       // Longitud [-180 a +180]
  elevationKm: number;  // Elevación o profundidad respecto al datum medio
  dimensions: string;   // Dimensiones notables (diámetro, longitud, etc.)
  iconEmoji: string;
  description: string;
  geologicalSignificance: string;
}

export const GEOGRAPHIC_LANDMARKS: GeographicLandmark[] = [
  // --- TIERRA ---
  {
    id: 'earth_everest',
    planetId: 'earth',
    name: 'Monte Everest (Himalaya)',
    category: 'mountain',
    latDeg: 27.9881,
    lonDeg: 86.9250,
    elevationKm: 8.848,
    dimensions: '8,848.86 m sobre nivel del mar',
    iconEmoji: '🏔️',
    description: 'Punto más elevado de la superficie terrestre continental.',
    geologicalSignificance: 'Resultado de la colisión continental activa entre la placa Índica y la placa Euroasiática (orogenia).'
  },
  {
    id: 'earth_mariana',
    planetId: 'earth',
    name: 'Fosa de las Marianas (Abismo Challenger)',
    category: 'trench',
    latDeg: 11.3733,
    lonDeg: 142.1983,
    elevationKm: -10.994,
    dimensions: '10,994 m bajo nivel del mar · 2,550 km de longitud',
    iconEmoji: '🌊',
    description: 'Punto más profundo conocido en la hidrosfera de la Tierra.',
    geologicalSignificance: 'Zona de subducción donde la placa del Pacífico se hunde bajo la placa de las Marianas.'
  },
  {
    id: 'earth_grand_canyon',
    planetId: 'earth',
    name: 'Gran Cañón del Colorado',
    category: 'canyon',
    latDeg: 36.1069,
    lonDeg: -112.1129,
    elevationKm: 1.8,
    dimensions: '446 km de longitud · hasta 29 km de ancho',
    iconEmoji: '🏜️',
    description: 'Impresionante garganta fluvial que expone casi 2,000 millones de años de historia geológica.',
    geologicalSignificance: 'Ejemplo de erosión fluvial combinada con el levantamiento tectónico de la meseta del Colorado.'
  },

  // --- MARTE ---
  {
    id: 'mars_olympus_mons',
    planetId: 'mars',
    name: 'Monte Olimpo (Olympus Mons)',
    category: 'volcano',
    latDeg: 18.65,
    lonDeg: -133.8,
    elevationKm: 21.9,
    dimensions: '21.9 km de altura · 600 km de diámetro en la base',
    iconEmoji: '🌋',
    description: 'El volcán y la montaña más alta conocida en todo el Sistema Solar (casi 3 veces la altura del Everest).',
    geologicalSignificance: 'Volcán en escudo formado por una pluma mantélica estacionaria bajo una corteza sin placas tectónicas.'
  },
  {
    id: 'mars_valles_marineris',
    planetId: 'mars',
    name: 'Valles Marineris',
    category: 'canyon',
    latDeg: -14.0,
    lonDeg: -59.2,
    elevationKm: -8.0,
    dimensions: 'Más de 4,000 km de longitud · hasta 200 km de ancho · 7 km de profundidad',
    iconEmoji: '🏜️',
    description: 'El sistema de cañones más gigantesco del Sistema Solar.',
    geologicalSignificance: 'Falla tectónica gigante (rift) abierta por la tensión de la elevación volcánica del domo de Tharsis.'
  },

  // --- MERCURIO ---
  {
    id: 'mercury_caloris',
    planetId: 'mercury',
    name: 'Cuenca Caloris (Caloris Planitia)',
    category: 'crater',
    latDeg: 30.5,
    lonDeg: -170.2,
    elevationKm: -2.0,
    dimensions: '1,550 km de diámetro',
    iconEmoji: '☄️',
    description: 'Una de las mayores cuencas de impacto multianillo del Sistema Solar.',
    geologicalSignificance: 'Impacto colosal cuyas ondas de choque concentradas fracturaron la superficie en el punto antípoda.'
  },

  // --- VENUS ---
  {
    id: 'venus_maxwell_montes',
    planetId: 'venus',
    name: 'Maxwell Montes (Ishtar Terra)',
    category: 'mountain',
    latDeg: 65.2,
    lonDeg: 3.3,
    elevationKm: 11.0,
    dimensions: '11 km sobre el radio medio planetario · 853 km de extensión',
    iconEmoji: '⛰️',
    description: 'El macizo montañoso más alto de Venus, cubierto por nieve metálica brillante en radar.',
    geologicalSignificance: 'Formado por compresión y acortamiento cortical en el continente septentrional de Ishtar Terra.'
  },

  // --- JÚPITER ---
  {
    id: 'jupiter_great_red_spot',
    planetId: 'jupiter',
    name: 'La Gran Mancha Roja (Great Red Spot)',
    category: 'storm',
    latDeg: -22.1,
    lonDeg: 0.0,
    elevationKm: 8.0,
    dimensions: '16,350 km de ancho (más grande que la Tierra entera)',
    iconEmoji: '🌀',
    description: 'Anticiclón persistente con vientos de más de 430 km/h que lleva activo al menos 350 años.',
    geologicalSignificance: 'Impulsado por el calor interno del planeta y la cizalladura de chorros zonales.'
  },

  // --- PLUTÓN ---
  {
    id: 'pluto_sputnik_planitia',
    planetId: 'pluto',
    name: 'Sputnik Planitia (El Corazón de Plutón)',
    category: 'plain',
    latDeg: 19.5,
    lonDeg: 175.8,
    elevationKm: -3.5,
    dimensions: '1,050 km × 800 km de extensión',
    iconEmoji: '❤️',
    description: 'Inmenso glaciar de hielo de nitrógeno, metano y monóxido de carbono con forma de corazón.',
    geologicalSignificance: 'Células de convección térmica activas de 20-40 km que renuevan la superficie cada 500,000 años.'
  },
  {
    id: 'pluto_wright_mons',
    planetId: 'pluto',
    name: 'Wright Mons',
    category: 'volcano',
    latDeg: -21.4,
    lonDeg: 173.9,
    elevationKm: 4.5,
    dimensions: '150 km de base · 4.5 km de altura con depresión central de 56 km',
    iconEmoji: '❄️',
    description: 'Criovolcán gigante de hielo de agua y lodo salobre.',
    geologicalSignificance: 'Evidencia de actividad criovolcánica reciente impulsada por calor interno remanente.'
  },

  // --- CERES ---
  {
    id: 'ceres_occator',
    planetId: 'ceres',
    name: 'Cráter Occator (Faculae Brillantes)',
    category: 'crater',
    latDeg: 19.8,
    lonDeg: 239.3,
    elevationKm: -4.0,
    dimensions: '92 km de diámetro · 4 km de profundidad',
    iconEmoji: '✨',
    description: 'Cráter que contiene depósitos deslumbrantes de carbonato de sodio (sales brillantes) dejados por salmueras evaporadas.',
    geologicalSignificance: 'Criotectónica e hidrotermalismo salino procedente de un depósito profundo de salmuera subsuperficial.'
  },
  {
    id: 'ceres_ahuna_mons',
    planetId: 'ceres',
    name: 'Ahuna Mons',
    category: 'volcano',
    latDeg: -10.4,
    lonDeg: 316.2,
    elevationKm: 4.1,
    dimensions: '4.1 km de altura · 20 km de diámetro',
    iconEmoji: '🏔️',
    description: 'Domo volcánico de hielo (crióvolcan) con laderas empinadas de más de 35°.',
    geologicalSignificance: 'Cúpula formada por la extrusión de magma criogénico de hielo de agua, carbonatos y sales.'
  }
];
