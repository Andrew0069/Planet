export interface KeplerianElements {
  a: number;      // Semieje mayor (UA)
  e: number;      // Excentricidad
  i: number;      // Inclinación respecto a la eclíptica (grados)
  Omega: number;  // Longitud del nodo ascendente (grados)
  w: number;      // Argumento del perihelio (grados)
  L0: number;     // Longitud media en J2000 (grados)
  T: number;      // Periodo orbital (días terrestres)
}

export interface GeologicalLayer {
  name: string;
  depthKm: [number, number]; // [desde, hasta]
  thicknessKm: number;
  composition: string;
  temperatureK: [number, number];
  colorHex: string;
  description: string;
}

export interface AtmosphereData {
  surfacePressureAtm: number;
  greenhouseEffectDeltaK: number;
  scaleHeightKm: number;
  gases: { name: string; percentage: number }[];
  colorHex: string;
  description: string;
}

export interface MoonData {
  name: string;
  radiusKm: number;
  distanceKm: number;
  orbitalPeriodDays: number;
  colorHex: string;
  description: string;
}

export interface PlanetData {
  id: string;
  name: string;
  type: 'terrestrial' | 'gas_giant' | 'ice_giant' | 'dwarf';
  diameterKm: number;
  radiusKm: number;
  massKg: string;
  massEarthRelative: number;
  densityGcm3: number;
  gravityMs2: number;
  escapeVelocityKms: number;
  axialTiltDeg: number;
  rotationPeriodHours: number;
  albedoBond: number;
  baseSurfaceTempC: number;
  dayNightTempVarianceC: number;
  colorHex: string;
  emissiveColor?: string;
  isEllipsoid?: boolean; // Para cuerpos de rotación rápida como Haumea
  ringSystem?: { innerRadiusRatio: number; outerRadiusRatio: number; colorHex: string; opacity: number };
  elements: KeplerianElements;
  atmosphere: AtmosphereData;
  geology: {
    layers: GeologicalLayer[];
    tectonics: string;
    volcanism: string;
    magneticField: string;
  };
  moons: MoonData[];
}

export const PLANETS_DATA: PlanetData[] = [
  // ================= 8 PLANETAS PRINCIPALES =================
  {
    id: 'mercury',
    name: 'Mercurio',
    type: 'terrestrial',
    diameterKm: 4879,
    radiusKm: 2439.7,
    massKg: '3.301 × 10²³ kg',
    massEarthRelative: 0.0553,
    densityGcm3: 5.43,
    gravityMs2: 3.7,
    escapeVelocityKms: 4.3,
    axialTiltDeg: 0.034,
    rotationPeriodHours: 1407.6,
    albedoBond: 0.068,
    baseSurfaceTempC: 167,
    dayNightTempVarianceC: 600,
    colorHex: '#9c958f',
    elements: {
      a: 0.387098,
      e: 0.205630,
      i: 7.005,
      Omega: 48.331,
      w: 29.124,
      L0: 252.251,
      T: 87.969
    },
    atmosphere: {
      surfacePressureAtm: 1e-14,
      greenhouseEffectDeltaK: 0,
      scaleHeightKm: 0,
      gases: [
        { name: 'Oxígeno (O)', percentage: 42 },
        { name: 'Sodio (Na)', percentage: 29 },
        { name: 'Hidrógeno (H₂)', percentage: 22 },
        { name: 'Helio (He)', percentage: 6 }
      ],
      colorHex: '#444444',
      description: 'Exosfera extremadamente tenue sostenida por el viento solar.'
    },
    geology: {
      tectonics: 'Inactiva globalmente; escarpes de contracción por enfriamiento del núcleo.',
      volcanism: 'Extinto hace ~3,500 millones de años.',
      magneticField: 'Débil pero activo (~1% del terrestre), generado por núcleo metálico parcialmente fluido.',
      layers: [
        {
          name: 'Corteza de Silicatos',
          depthKm: [0, 35],
          thicknessKm: 35,
          composition: 'Silicatos de magnesio y aluminio, rica en azufre.',
          temperatureK: [100, 700],
          colorHex: '#8b8378',
          description: 'Corteza sólida densamente craterizada por impactos tempranos.'
        },
        {
          name: 'Manto Rocoso',
          depthKm: [35, 400],
          thicknessKm: 365,
          composition: 'Peridotita y silicatos de alta presión.',
          temperatureK: [700, 1400],
          colorHex: '#b26e3c',
          description: 'Manto muy delgado en comparación con la Tierra.'
        },
        {
          name: 'Núcleo Metálico Gigante',
          depthKm: [400, 2440],
          thicknessKm: 2040,
          composition: 'Hierro y níquel con alta concentración de azufre.',
          temperatureK: [1400, 2200],
          colorHex: '#d85a2a',
          description: 'Núcleo masivo (70% del radio planetario) con capa externa líquida generadora de dínamo magnético.'
        }
      ]
    },
    moons: []
  },
  {
    id: 'venus',
    name: 'Venus',
    type: 'terrestrial',
    diameterKm: 12104,
    radiusKm: 6051.8,
    massKg: '4.867 × 10²⁴ kg',
    massEarthRelative: 0.815,
    densityGcm3: 5.24,
    gravityMs2: 8.87,
    escapeVelocityKms: 10.36,
    axialTiltDeg: 177.36,
    rotationPeriodHours: -5832.5,
    albedoBond: 0.77,
    baseSurfaceTempC: 464,
    dayNightTempVarianceC: 5,
    colorHex: '#e8be74',
    elements: {
      a: 0.723332,
      e: 0.006773,
      i: 3.3947,
      Omega: 76.680,
      w: 54.884,
      L0: 181.979,
      T: 224.701
    },
    atmosphere: {
      surfacePressureAtm: 92.0,
      greenhouseEffectDeltaK: 500,
      scaleHeightKm: 15.9,
      gases: [
        { name: 'Dióxido de Carbono (CO₂)', percentage: 96.5 },
        { name: 'Nitrógeno (N₂)', percentage: 3.5 },
        { name: 'Dióxido de Azufre (SO₂)', percentage: 0.015 }
      ],
      colorHex: '#eed58b',
      description: 'Atmósfera hiperdensa con nubes de ácido sulfúrico y efecto invernadero desbocado.'
    },
    geology: {
      tectonics: 'Sin placas tectónicas activas; renovación cortical episódica.',
      volcanism: 'Activo con miles de volcanes (Maat Mons).',
      magneticField: 'Casi nulo por lenta rotación y falta de convección.',
      layers: [
        {
          name: 'Corteza Basáltica',
          depthKm: [0, 50],
          thicknessKm: 50,
          composition: 'Basaltos volcánicos.',
          temperatureK: [735, 900],
          colorHex: '#997343',
          description: 'Corteza rígida y seca.'
        },
        {
          name: 'Manto de Silicatos',
          depthKm: [50, 3000],
          thicknessKm: 2950,
          composition: 'Silicatos en régimen convectivo lento.',
          temperatureK: [900, 3000],
          colorHex: '#c7692a',
          description: 'Gran capa de convección.'
        },
        {
          name: 'Núcleo de Hierro-Níquel',
          depthKm: [3000, 6052],
          thicknessKm: 3052,
          composition: 'Hierro y níquel parcialmente sólido.',
          temperatureK: [3000, 4500],
          colorHex: '#eb4423',
          description: 'Núcleo metálico similar al terrestre.'
        }
      ]
    },
    moons: []
  },
  {
    id: 'earth',
    name: 'Tierra',
    type: 'terrestrial',
    diameterKm: 12756,
    radiusKm: 6371.0,
    massKg: '5.972 × 10²⁴ kg',
    massEarthRelative: 1.0,
    densityGcm3: 5.51,
    gravityMs2: 9.807,
    escapeVelocityKms: 11.19,
    axialTiltDeg: 23.44,
    rotationPeriodHours: 23.934,
    albedoBond: 0.306,
    baseSurfaceTempC: 15,
    dayNightTempVarianceC: 25,
    colorHex: '#3a88e9',
    elements: {
      a: 1.000000,
      e: 0.016709,
      i: 0.000,
      Omega: 0.000,
      w: 102.947,
      L0: 100.464,
      T: 365.256
    },
    atmosphere: {
      surfacePressureAtm: 1.0,
      greenhouseEffectDeltaK: 33,
      scaleHeightKm: 8.5,
      gases: [
        { name: 'Nitrógeno (N₂)', percentage: 78.08 },
        { name: 'Oxígeno (O₂)', percentage: 20.95 },
        { name: 'Argón (Ar)', percentage: 0.93 },
        { name: 'Dióxido de Carbono (CO₂)', percentage: 0.04 }
      ],
      colorHex: '#5297ff',
      description: 'Atmósfera equilibrada con ciclo del agua, ozono protector y vida.'
    },
    geology: {
      tectonics: 'Tectónica de placas dinámica activa.',
      volcanism: 'Altamente activo en bordes de placa y puntos calientes.',
      magneticField: 'Potente dínamo dipolar generado en el núcleo externo líquido.',
      layers: [
        {
          name: 'Corteza Continental y Oceánica',
          depthKm: [0, 40],
          thicknessKm: 40,
          composition: 'Granitos y basaltos.',
          temperatureK: [288, 700],
          colorHex: '#647e62',
          description: 'Corteza fragmentada en placas tectónicas.'
        },
        {
          name: 'Manto Superior y Astenosfera',
          depthKm: [40, 670],
          thicknessKm: 630,
          composition: 'Peridotita dúctil rica en olivino.',
          temperatureK: [700, 1800],
          colorHex: '#a8652d',
          description: 'Capa plástico-viscosa con convección térmica.'
        },
        {
          name: 'Manto Inferior (Mesosfera)',
          depthKm: [670, 2890],
          thicknessKm: 2220,
          composition: 'Bridgmanita y ferropericlasa.',
          temperatureK: [1800, 3200],
          colorHex: '#c7521e',
          description: 'Roca sólida a altas presiones.'
        },
        {
          name: 'Núcleo Externo Líquido',
          depthKm: [2890, 5150],
          thicknessKm: 2260,
          composition: 'Hierro y níquel fundidos.',
          temperatureK: [3200, 5000],
          colorHex: '#f05b18',
          description: 'Generador del geodínamo magnético.'
        },
        {
          name: 'Núcleo Interno Sólido',
          depthKm: [5150, 6371],
          thicknessKm: 1221,
          composition: 'Hierro cristalizado.',
          temperatureK: [5000, 6000],
          colorHex: '#ffd054',
          description: 'Esfera sólida casi tan caliente como la fotosfera solar.'
        }
      ]
    },
    moons: [
      {
        name: 'Luna',
        radiusKm: 1737.4,
        distanceKm: 384400,
        orbitalPeriodDays: 27.32,
        colorHex: '#d2d2d8',
        description: 'Estabiliza el eje terrestre y genera las mareas oceánicas.'
      }
    ]
  },
  {
    id: 'mars',
    name: 'Marte',
    type: 'terrestrial',
    diameterKm: 6792,
    radiusKm: 3389.5,
    massKg: '6.417 × 10²³ kg',
    massEarthRelative: 0.107,
    densityGcm3: 3.93,
    gravityMs2: 3.72,
    escapeVelocityKms: 5.03,
    axialTiltDeg: 25.19,
    rotationPeriodHours: 24.623,
    albedoBond: 0.25,
    baseSurfaceTempC: -63,
    dayNightTempVarianceC: 80,
    colorHex: '#c75836',
    elements: {
      a: 1.523662,
      e: 0.093412,
      i: 1.8506,
      Omega: 49.579,
      w: 286.502,
      L0: 355.447,
      T: 686.980
    },
    atmosphere: {
      surfacePressureAtm: 0.006,
      greenhouseEffectDeltaK: 5,
      scaleHeightKm: 11.1,
      gases: [
        { name: 'Dióxido de Carbono (CO₂)', percentage: 95.32 },
        { name: 'Nitrógeno (N₂)', percentage: 2.7 },
        { name: 'Argón (Ar)', percentage: 1.6 },
        { name: 'Oxígeno (O₂)', percentage: 0.13 }
      ],
      colorHex: '#d8916d',
      description: 'Atmósfera muy delgada con polvo en suspensión y casquetes polares de hielo.'
    },
    geology: {
      tectonics: 'Inactiva; corteza gruesa de placa única.',
      volcanism: 'Inactivo actualmente; albergó el Monte Olimpo.',
      magneticField: 'Campos remanentes fosilizados en la corteza.',
      layers: [
        {
          name: 'Corteza de Óxidos de Hierro',
          depthKm: [0, 50],
          thicknessKm: 50,
          composition: 'Basaltos y hematita.',
          temperatureK: [210, 600],
          colorHex: '#ab4a24',
          description: 'Corteza asimétrica con dicotomía hemisférica.'
        },
        {
          name: 'Manto de Silicatos',
          depthKm: [50, 1550],
          thicknessKm: 1500,
          composition: 'Silicatos ricos en hierro.',
          temperatureK: [600, 1800],
          colorHex: '#78381c',
          description: 'Manto rígido poco convectivo.'
        },
        {
          name: 'Núcleo Líquido de Hierro-Azufre',
          depthKm: [1550, 3390],
          thicknessKm: 1840,
          composition: 'Hierro, níquel y azufre.',
          temperatureK: [1800, 2400],
          colorHex: '#e04a1f',
          description: 'Núcleo fluido confirmado por la sonda InSight.'
        }
      ]
    },
    moons: [
      {
        name: 'Fobos',
        radiusKm: 11.2,
        distanceKm: 9377,
        orbitalPeriodDays: 0.319,
        colorHex: '#8e7f72',
        description: 'Asteroide capturado en órbita cercana.'
      },
      {
        name: 'Deimos',
        radiusKm: 6.2,
        distanceKm: 23460,
        orbitalPeriodDays: 1.263,
        colorHex: '#9f9486',
        description: 'Pequeña luna externa cubierta por regolito.'
      }
    ]
  },
  {
    id: 'jupiter',
    name: 'Júpiter',
    type: 'gas_giant',
    diameterKm: 142984,
    radiusKm: 71492.0,
    massKg: '1.898 × 10²⁷ kg',
    massEarthRelative: 317.8,
    densityGcm3: 1.33,
    gravityMs2: 24.79,
    escapeVelocityKms: 59.5,
    axialTiltDeg: 3.13,
    rotationPeriodHours: 9.925,
    albedoBond: 0.343,
    baseSurfaceTempC: -110,
    dayNightTempVarianceC: 0,
    colorHex: '#d89b65',
    elements: {
      a: 5.203363,
      e: 0.048393,
      i: 1.3053,
      Omega: 100.556,
      w: 273.877,
      L0: 34.404,
      T: 4332.589
    },
    atmosphere: {
      surfacePressureAtm: 1000.0,
      greenhouseEffectDeltaK: 0,
      scaleHeightKm: 27.0,
      gases: [
        { name: 'Hidrógeno (H₂)', percentage: 89.8 },
        { name: 'Helio (He)', percentage: 10.2 },
        { name: 'Metano (CH₄)', percentage: 0.3 }
      ],
      colorHex: '#ddad7b',
      description: 'Bandas nubosas turbulentas y la Gran Mancha Roja.'
    },
    geology: {
      tectonics: 'No aplicable (Gigante Gaseoso).',
      volcanism: 'No aplicable en el planeta (altísimo en Ío).',
      magneticField: 'El más potente del Sistema Solar (20,000 veces el terrestre).',
      layers: [
        {
          name: 'Atmósfera Gaseosa Exterior',
          depthKm: [0, 1000],
          thicknessKm: 1000,
          composition: 'Hidrógeno y helio moleculares.',
          temperatureK: [165, 1000],
          colorHex: '#c7925b',
          description: 'Capa con bandas nubosas visibles.'
        },
        {
          name: 'Manto de Hidrógeno Líquido',
          depthKm: [1000, 20000],
          thicknessKm: 19000,
          composition: 'Hidrógeno en estado fluido supercrítico.',
          temperatureK: [1000, 10000],
          colorHex: '#a86c35',
          description: 'Transición continua de gas a líquido.'
        },
        {
          name: 'Manto de Hidrógeno Metálico',
          depthKm: [20000, 60000],
          thicknessKm: 40000,
          composition: 'Hidrógeno metálico conductor eléctrico.',
          temperatureK: [10000, 20000],
          colorHex: '#804618',
          description: 'Generador del campo magnético joviano.'
        },
        {
          name: 'Núcleo Denso y Diluido',
          depthKm: [60000, 71492],
          thicknessKm: 11492,
          composition: 'Rocas y hielos presurizados diluidos.',
          temperatureK: [20000, 30000],
          colorHex: '#ffd56b',
          description: 'Núcleo descubierto por la sonda Juno.'
        }
      ]
    },
    moons: [
      {
        name: 'Ío',
        radiusKm: 1821.6,
        distanceKm: 421700,
        orbitalPeriodDays: 1.769,
        colorHex: '#e2cf4b',
        description: 'Cuerpo volcánico más activo del Sistema Solar.'
      },
      {
        name: 'Europa',
        radiusKm: 1560.8,
        distanceKm: 670900,
        orbitalPeriodDays: 3.551,
        colorHex: '#dfd2ba',
        description: 'Océano subterráneo global de agua líquida bajo hielo.'
      },
      {
        name: 'Ganímedes',
        radiusKm: 2634.1,
        distanceKm: 1070400,
        orbitalPeriodDays: 7.155,
        colorHex: '#b4a292',
        description: 'La luna más grande del Sistema Solar con campo magnético propio.'
      },
      {
        name: 'Calisto',
        radiusKm: 2410.3,
        distanceKm: 1882700,
        orbitalPeriodDays: 16.689,
        colorHex: '#8a7d73',
        description: 'Superficie antigua densamente craterizada.'
      }
    ]
  },
  {
    id: 'saturn',
    name: 'Saturno',
    type: 'gas_giant',
    diameterKm: 120536,
    radiusKm: 58232.0,
    massKg: '5.683 × 10²⁶ kg',
    massEarthRelative: 95.16,
    densityGcm3: 0.687,
    gravityMs2: 10.44,
    escapeVelocityKms: 35.5,
    axialTiltDeg: 26.73,
    rotationPeriodHours: 10.656,
    albedoBond: 0.342,
    baseSurfaceTempC: -140,
    dayNightTempVarianceC: 0,
    colorHex: '#dfcc8e',
    ringSystem: {
      innerRadiusRatio: 1.25,
      outerRadiusRatio: 2.3,
      colorHex: '#ccb67a',
      opacity: 0.85
    },
    elements: {
      a: 9.537070,
      e: 0.054151,
      i: 2.4845,
      Omega: 113.663,
      w: 339.392,
      L0: 49.944,
      T: 10759.22
    },
    atmosphere: {
      surfacePressureAtm: 1000.0,
      greenhouseEffectDeltaK: 0,
      scaleHeightKm: 59.5,
      gases: [
        { name: 'Hidrógeno (H₂)', percentage: 96.3 },
        { name: 'Helio (He)', percentage: 3.25 },
        { name: 'Metano (CH₄)', percentage: 0.45 }
      ],
      colorHex: '#edd798',
      description: 'Atmósfera dorada con vientos supersónicos y hexágono polar norte.'
    },
    geology: {
      tectonics: 'No aplicable (Gigante Gaseoso).',
      volcanism: 'Crióvolcanismo presente en Encélado.',
      magneticField: 'Dipolar casi simétrico con el eje de rotación.',
      layers: [
        {
          name: 'Atmósfera Gaseosa Superior',
          depthKm: [0, 1000],
          thicknessKm: 1000,
          composition: 'Hidrógeno molecular y amoníaco.',
          temperatureK: [134, 800],
          colorHex: '#dfcc8e',
          description: 'Capa exterior con nubes doradas.'
        },
        {
          name: 'Hidrógeno Líquido y Lluvia de Helio',
          depthKm: [1000, 30000],
          thicknessKm: 29000,
          composition: 'Hidrógeno y gotas de helio condensado.',
          temperatureK: [800, 9000],
          colorHex: '#b59a53',
          description: 'Lluvia de helio que libera calor gravitatorio.'
        },
        {
          name: 'Manto de Hidrógeno Metálico',
          depthKm: [30000, 48000],
          thicknessKm: 18000,
          composition: 'Hidrógeno metálico fluido.',
          temperatureK: [9000, 15000],
          colorHex: '#7e6428',
          description: 'Capa generadora del campo magnético.'
        },
        {
          name: 'Núcleo Rocoso de Hielos y Metales',
          depthKm: [48000, 58232],
          thicknessKm: 10232,
          composition: 'Silicatos, hierro y hielos presurizados.',
          temperatureK: [15000, 22000],
          colorHex: '#e2ac42',
          description: 'Núcleo con temperatura central de 15,000 K.'
        }
      ]
    },
    moons: [
      {
        name: 'Titán',
        radiusKm: 2574.7,
        distanceKm: 1221870,
        orbitalPeriodDays: 15.945,
        colorHex: '#d89b43',
        description: 'Luna con densa atmósfera de nitrógeno y lagos de metano líquido.'
      },
      {
        name: 'Encélado',
        radiusKm: 252.1,
        distanceKm: 238040,
        orbitalPeriodDays: 1.370,
        colorHex: '#edf2f7',
        description: 'Emite géiseres de vapor de agua y sales desde su océano global.'
      }
    ]
  },
  {
    id: 'uranus',
    name: 'Urano',
    type: 'ice_giant',
    diameterKm: 51118,
    radiusKm: 25362.0,
    massKg: '8.681 × 10²⁵ kg',
    massEarthRelative: 14.54,
    densityGcm3: 1.27,
    gravityMs2: 8.69,
    escapeVelocityKms: 21.3,
    axialTiltDeg: 97.77,
    rotationPeriodHours: -17.24,
    albedoBond: 0.300,
    baseSurfaceTempC: -195,
    dayNightTempVarianceC: 0,
    colorHex: '#93d4db',
    ringSystem: {
      innerRadiusRatio: 1.4,
      outerRadiusRatio: 2.0,
      colorHex: '#6a9ea4',
      opacity: 0.4
    },
    elements: {
      a: 19.19126,
      e: 0.047168,
      i: 0.7699,
      Omega: 74.230,
      w: 96.734,
      L0: 313.232,
      T: 30685.4
    },
    atmosphere: {
      surfacePressureAtm: 100.0,
      greenhouseEffectDeltaK: 0,
      scaleHeightKm: 27.7,
      gases: [
        { name: 'Hidrógeno (H₂)', percentage: 82.5 },
        { name: 'Helio (He)', percentage: 15.2 },
        { name: 'Metano (CH₄)', percentage: 2.3 }
      ],
      colorHex: '#b1e5ec',
      description: 'Atmósfera cian por metano. La atmósfera planetaria más fría (-224°C).'
    },
    geology: {
      tectonics: 'No aplicable (Gigante Helado).',
      volcanism: 'Crióvolcanismo en lunas como Miranda.',
      magneticField: 'Inclinado 59° del eje de rotación y descentrado.',
      layers: [
        {
          name: 'Atmósfera Externa',
          depthKm: [0, 4000],
          thicknessKm: 4000,
          composition: 'Hidrógeno, helio y nubes de metano.',
          temperatureK: [55, 300],
          colorHex: '#93d4db',
          description: 'Capa con tonalidad aguamarina.'
        },
        {
          name: 'Manto de Fluidos Iónicos',
          depthKm: [4000, 20000],
          thicknessKm: 16000,
          composition: 'Océano de agua, amoníaco y metano en estado supercrítico.',
          temperatureK: [300, 5000],
          colorHex: '#3b8b99',
          description: 'Fluido conductor generador del campo magnético.'
        },
        {
          name: 'Núcleo Rocoso',
          depthKm: [20000, 25362],
          thicknessKm: 5362,
          composition: 'Hierro, níquel y silicatos.',
          temperatureK: [5000, 7000],
          colorHex: '#1d5a66',
          description: 'Núcleo metálico con masa similar a la Tierra.'
        }
      ]
    },
    moons: [
      {
        name: 'Miranda',
        radiusKm: 235.8,
        distanceKm: 129390,
        orbitalPeriodDays: 1.413,
        colorHex: '#b2c8d2',
        description: 'Alberga Verona Rupes, el acantilado más alto del Sistema Solar (20 km).'
      },
      {
        name: 'Titania',
        radiusKm: 788.4,
        distanceKm: 435910,
        orbitalPeriodDays: 8.706,
        colorHex: '#c7b8aa',
        description: 'Luna más grande de Urano con inmensos cañones tectónicos.'
      }
    ]
  },
  {
    id: 'neptune',
    name: 'Neptuno',
    type: 'ice_giant',
    diameterKm: 49528,
    radiusKm: 24622.0,
    massKg: '1.024 × 10²⁶ kg',
    massEarthRelative: 17.15,
    densityGcm3: 1.64,
    gravityMs2: 11.15,
    escapeVelocityKms: 23.5,
    axialTiltDeg: 28.32,
    rotationPeriodHours: 16.11,
    albedoBond: 0.290,
    baseSurfaceTempC: -200,
    dayNightTempVarianceC: 0,
    colorHex: '#4163d8',
    ringSystem: {
      innerRadiusRatio: 1.3,
      outerRadiusRatio: 2.5,
      colorHex: '#2f49aa',
      opacity: 0.35
    },
    elements: {
      a: 30.06896,
      e: 0.008586,
      i: 1.7692,
      Omega: 131.722,
      w: 273.187,
      L0: 304.880,
      T: 60189.0
    },
    atmosphere: {
      surfacePressureAtm: 100.0,
      greenhouseEffectDeltaK: 0,
      scaleHeightKm: 19.7,
      gases: [
        { name: 'Hidrógeno (H₂)', percentage: 80.0 },
        { name: 'Helio (He)', percentage: 19.0 },
        { name: 'Metano (CH₄)', percentage: 1.5 }
      ],
      colorHex: '#4f72ff',
      description: 'Azul cobalto con los vientos más veloces (2,100 km/h) y manchas oscuras.'
    },
    geology: {
      tectonics: 'No aplicable (Gigante Helado).',
      volcanism: 'Crióvolcanismo activo en Tritón.',
      magneticField: 'Inclinado 47° respecto al eje de rotación.',
      layers: [
        {
          name: 'Atmósfera Superior Dinámica',
          depthKm: [0, 4000],
          thicknessKm: 4000,
          composition: 'Hidrógeno, helio y cirros de metano.',
          temperatureK: [55, 300],
          colorHex: '#4163d8',
          description: 'Capa con vientos supersónicos.'
        },
        {
          name: 'Manto Supercrítico de Hielos',
          depthKm: [4000, 19000],
          thicknessKm: 15000,
          composition: 'Océano iónico de agua, amoníaco y metano (lluvia de diamantes).',
          temperatureK: [300, 5200],
          colorHex: '#253f9e',
          description: 'Cristalización y precipitación de carbono en diamantes.'
        },
        {
          name: 'Núcleo de Roca y Metal',
          depthKm: [19000, 24622],
          thicknessKm: 5622,
          composition: 'Silicatos de magnesio, hierro y níquel.',
          temperatureK: [5200, 7000],
          colorHex: '#121f57',
          description: 'Núcleo caliente que irradia calor interno al espacio.'
        }
      ]
    },
    moons: [
      {
        name: 'Tritón',
        radiusKm: 1353.4,
        distanceKm: 354760,
        orbitalPeriodDays: -5.877,
        colorHex: '#c7dee2',
        description: 'Objeto capturado del Cinturón de Kuiper con órbita retrógrada y géiseres de nitrógeno.'
      }
    ]
  },

  // ================= PLANETAS ENANOS Y CUERPOS MENORES =================
  {
    id: 'ceres',
    name: 'Ceres',
    type: 'dwarf',
    diameterKm: 939,
    radiusKm: 469.7,
    massKg: '9.39 × 10²⁰ kg',
    massEarthRelative: 0.000157,
    densityGcm3: 2.16,
    gravityMs2: 0.28,
    escapeVelocityKms: 0.51,
    axialTiltDeg: 4.0,
    rotationPeriodHours: 9.074,
    albedoBond: 0.09,
    baseSurfaceTempC: -106,
    dayNightTempVarianceC: 80,
    colorHex: '#8c8884',
    elements: {
      a: 2.769,
      e: 0.0758,
      i: 10.59,
      Omega: 80.33,
      w: 73.60,
      L0: 153.9,
      T: 1682.0
    },
    atmosphere: {
      surfacePressureAtm: 1e-12,
      greenhouseEffectDeltaK: 0,
      scaleHeightKm: 0,
      gases: [{ name: 'Vapor de Agua (H₂O)', percentage: 100 }],
      colorHex: '#888888',
      description: 'Exosfera transitoria producida por sublimación de hielo y criovolcanismo.'
    },
    geology: {
      tectonics: 'Inactiva; fracturas por relajación viscosa de hielo.',
      volcanism: 'Crióvolcanismo activo en el pasado reciente (Monte Ahuna y Cráter Occator).',
      magneticField: 'Nulo.',
      layers: [
        {
          name: 'Corteza Regolítica de Hielos y Arcillas',
          depthKm: [0, 40],
          thicknessKm: 40,
          composition: 'Mezcla de hielo de agua, carbonatos de sodio y silicatos hidratados.',
          temperatureK: [130, 240],
          colorHex: '#75716e',
          description: 'Corteza rica en sales brillantes y criomagma.'
        },
        {
          name: 'Manto Lodoso de Salmuera y Hielo',
          depthKm: [40, 200],
          thicknessKm: 160,
          composition: 'Hielo hidratado y vestigios de un océano subterráneo salado fósil.',
          temperatureK: [240, 400],
          colorHex: '#526673',
          description: 'Manto rico en agua que albergó un océano global temprano.'
        },
        {
          name: 'Núcleo Rocoso de Silicatos',
          depthKm: [200, 470],
          thicknessKm: 270,
          composition: 'Rocas de silicatos deshidratados y metales.',
          temperatureK: [400, 650],
          colorHex: '#4a4440',
          description: 'Núcleo rocoso denso.'
        }
      ]
    },
    moons: []
  },
  {
    id: 'pluto',
    name: 'Plutón',
    type: 'dwarf',
    diameterKm: 2376,
    radiusKm: 1188.3,
    massKg: '1.303 × 10²² kg',
    massEarthRelative: 0.00218,
    densityGcm3: 1.86,
    gravityMs2: 0.62,
    escapeVelocityKms: 1.21,
    axialTiltDeg: 122.53, // Retrógrado
    rotationPeriodHours: -153.29, // 6.38 días
    albedoBond: 0.72,
    baseSurfaceTempC: -229,
    dayNightTempVarianceC: 15,
    colorHex: '#c7a385',
    elements: {
      a: 39.482,
      e: 0.2488,
      i: 17.16,
      Omega: 110.30,
      w: 113.76,
      L0: 14.86,
      T: 90560.0
    },
    atmosphere: {
      surfacePressureAtm: 1e-5,
      greenhouseEffectDeltaK: 0,
      scaleHeightKm: 50.0,
      gases: [
        { name: 'Nitrógeno (N₂)', percentage: 99.0 },
        { name: 'Metano (CH₄)', percentage: 0.5 },
        { name: 'Monóxido de Carbono (CO)', percentage: 0.5 }
      ],
      colorHex: '#88b5d6',
      description: 'Tenue neblina atmosférica azul de tolínas y nitrógeno descubierta por New Horizons.'
    },
    geology: {
      tectonics: 'Actividad extensional reciente por congelación de un océano subterráneo.',
      volcanism: 'Criovolcanismo masivo de hielo de agua y amoníaco (Wright Mons).',
      magneticField: 'Nulo.',
      layers: [
        {
          name: 'Corteza Glaciar de Nitrógeno y Metano',
          depthKm: [0, 100],
          thicknessKm: 100,
          composition: 'Hielos volátiles de N₂, CH₄ y CO flotando sobre hielo de agua rígido como roca.',
          temperatureK: [35, 120],
          colorHex: '#dfbf9e',
          description: 'Corteza dinámica con glaciares convectivos de nitrógeno en Sputnik Planitia.'
        },
        {
          name: 'Manto de Hielo de Agua / Océano Líquido',
          depthKm: [100, 300],
          thicknessKm: 200,
          composition: 'Hielo de agua y probable capa delgada de agua líquida rica en amoníaco.',
          temperatureK: [120, 260],
          colorHex: '#4d7c99',
          description: 'Océano subsuperficial aislado térmicamente por la corteza glaciar.'
        },
        {
          name: 'Núcleo Rocoso Denso',
          depthKm: [300, 1188],
          thicknessKm: 888,
          composition: 'Silicatos densos hidratados y metales pesados.',
          temperatureK: [260, 600],
          colorHex: '#695a4c',
          description: 'Representa el 70% de la masa total de Plutón.'
        }
      ]
    },
    moons: [
      {
        name: 'Caronte',
        radiusKm: 606.0,
        distanceKm: 19596,
        orbitalPeriodDays: 6.387,
        colorHex: '#99948e',
        description: 'Satélite masivo (mitad del tamaño de Plutón) en rotación sincrónica mutua (sistema binario).'
      }
    ]
  },
  {
    id: 'haumea',
    name: 'Haumea',
    type: 'dwarf',
    diameterKm: 1632,
    radiusKm: 816.0,
    massKg: '4.006 × 10²¹ kg',
    massEarthRelative: 0.00067,
    densityGcm3: 2.6,
    gravityMs2: 0.44,
    escapeVelocityKms: 0.84,
    axialTiltDeg: 28.0,
    rotationPeriodHours: 3.915, // Rotación ultra veloz (elipsoide)
    albedoBond: 0.70,
    baseSurfaceTempC: -241,
    dayNightTempVarianceC: 5,
    colorHex: '#d8dbe0',
    isEllipsoid: true,
    ringSystem: {
      innerRadiusRatio: 1.8,
      outerRadiusRatio: 2.2,
      colorHex: '#9cb5c4',
      opacity: 0.5
    },
    elements: {
      a: 43.218,
      e: 0.1913,
      i: 28.19,
      Omega: 121.90,
      w: 240.20,
      L0: 210.00,
      T: 103774.0
    },
    atmosphere: {
      surfacePressureAtm: 0,
      greenhouseEffectDeltaK: 0,
      scaleHeightKm: 0,
      gases: [],
      colorHex: '#666666',
      description: 'Sin atmósfera detectable.'
    },
    geology: {
      tectonics: 'Inactiva.',
      volcanism: 'Criovolcanismo pasado derivado de colisión gigante.',
      magneticField: 'Nulo.',
      layers: [
        {
          name: 'Manto de Hielo Cristalino Puro',
          depthKm: [0, 80],
          thicknessKm: 80,
          composition: 'Hielo de agua cristalina pura con mancha oscura rica en minerales.',
          temperatureK: [32, 50],
          colorHex: '#e8edf5',
          description: 'Hielo altamente reflectante mantenido cristalino por decaimiento radiactivo.'
        },
        {
          name: 'Núcleo Rocoso Denso Elipsoidal',
          depthKm: [80, 816],
          thicknessKm: 736,
          composition: 'Rocas de silicatos densos.',
          temperatureK: [50, 200],
          colorHex: '#73706d',
          description: 'Deformado en elipsoide triaxial por su rotación de menos de 4 horas.'
        }
      ]
    },
    moons: [
      {
        name: "Hi'iaka",
        radiusKm: 160.0,
        distanceKm: 49880,
        orbitalPeriodDays: 49.12,
        colorHex: '#b2bcc2',
        description: 'Luna exterior de hielo de agua puro desprendida en el impacto originario.'
      }
    ]
  },
  {
    id: 'makemake',
    name: 'Makemake',
    type: 'dwarf',
    diameterKm: 1430,
    radiusKm: 715.0,
    massKg: '3.1 × 10²¹ kg',
    massEarthRelative: 0.00052,
    densityGcm3: 1.7,
    gravityMs2: 0.5,
    escapeVelocityKms: 0.8,
    axialTiltDeg: 29.0,
    rotationPeriodHours: 22.83,
    albedoBond: 0.81,
    baseSurfaceTempC: -243,
    dayNightTempVarianceC: 5,
    colorHex: '#d88b65',
    elements: {
      a: 45.791,
      e: 0.1559,
      i: 28.96,
      Omega: 79.62,
      w: 294.83,
      L0: 160.00,
      T: 113187.0
    },
    atmosphere: {
      surfacePressureAtm: 1e-8,
      greenhouseEffectDeltaK: 0,
      scaleHeightKm: 0,
      gases: [{ name: 'Metano (CH₄)', percentage: 100 }],
      colorHex: '#aa7755',
      description: 'Atmósfera colapsable congelada en la superficie durante el afelio.'
    },
    geology: {
      tectonics: 'Inactiva.',
      volcanism: 'Crióvolcanismo fósil.',
      magneticField: 'Nulo.',
      layers: [
        {
          name: 'Corteza Glaciar Rojiza de Metano y Tolinas',
          depthKm: [0, 120],
          thicknessKm: 120,
          composition: 'Hielos de metano, etano y tolínas de hidrocarburos orgánicos.',
          temperatureK: [30, 45],
          colorHex: '#d88b65',
          description: 'Corteza con granos de hielo de metano de gran tamaño.'
        },
        {
          name: 'Núcleo Rocoso de Silicatos',
          depthKm: [120, 715],
          thicknessKm: 595,
          composition: 'Silicatos y metales.',
          temperatureK: [45, 180],
          colorHex: '#5e5149',
          description: 'Núcleo rocoso denso.'
        }
      ]
    },
    moons: []
  },
  {
    id: 'eris',
    name: 'Eris',
    type: 'dwarf',
    diameterKm: 2326,
    radiusKm: 1163.0,
    massKg: '1.66 × 10²² kg',
    massEarthRelative: 0.00278,
    densityGcm3: 2.52,
    gravityMs2: 0.82,
    escapeVelocityKms: 1.38,
    axialTiltDeg: 78.0,
    rotationPeriodHours: 25.9,
    albedoBond: 0.96, // Uno de los cuerpos más reflectantes del sistema solar
    baseSurfaceTempC: -243,
    dayNightTempVarianceC: 3,
    colorHex: '#f0f4f8',
    elements: {
      a: 67.781,
      e: 0.4407,
      i: 44.04,
      Omega: 35.95,
      w: 151.63,
      L0: 200.00,
      T: 203830.0
    },
    atmosphere: {
      surfacePressureAtm: 1e-9,
      greenhouseEffectDeltaK: 0,
      scaleHeightKm: 0,
      gases: [{ name: 'Metano congelado', percentage: 100 }],
      colorHex: '#d8e5f2',
      description: 'Atmósfera actualmente congelada en una capa superficial ultrabrillante.'
    },
    geology: {
      tectonics: 'Inactiva.',
      volcanism: 'Criovolcanismo.',
      magneticField: 'Nulo.',
      layers: [
        {
          name: 'Capa Superficial de Escarcha de Metano',
          depthKm: [0, 50],
          thicknessKm: 50,
          composition: 'Escarcha fresca de metano y nitrógeno de alta reflectividad (albedo 96%).',
          temperatureK: [30, 42],
          colorHex: '#ffffff',
          description: 'Superficie extremadamente brillante y pura.'
        },
        {
          name: 'Manto de Hielo de Agua',
          depthKm: [50, 300],
          thicknessKm: 250,
          composition: 'Hielo de agua comprimido.',
          temperatureK: [42, 160],
          colorHex: '#809ba8',
          description: 'Manto de hielo de agua.'
        },
        {
          name: 'Núcleo Rocoso Masivo',
          depthKm: [300, 1163],
          thicknessKm: 863,
          composition: 'Silicatos densos y metales.',
          temperatureK: [160, 400],
          colorHex: '#4d4b47',
          description: 'Representa la mayor parte de su elevada masa y densidad.'
        }
      ]
    },
    moons: [
      {
        name: 'Disnomia',
        radiusKm: 350.0,
        distanceKm: 37350,
        orbitalPeriodDays: 15.77,
        colorHex: '#737a82',
        description: 'Satélite que permitió calcular con precisión la masa de Eris.'
      }
    ]
  },
  {
    id: 'sedna',
    name: 'Sedna',
    type: 'dwarf',
    diameterKm: 995,
    radiusKm: 497.5,
    massKg: '1.0 × 10²¹ kg',
    massEarthRelative: 0.00017,
    densityGcm3: 2.0,
    gravityMs2: 0.33,
    escapeVelocityKms: 0.6,
    axialTiltDeg: 20.0,
    rotationPeriodHours: 10.27,
    albedoBond: 0.32,
    baseSurfaceTempC: -261,
    dayNightTempVarianceC: 2,
    colorHex: '#9c3823',
    elements: {
      a: 525.8, // Objeto del disco disperso / Oort interior
      e: 0.855,
      i: 11.93,
      Omega: 144.55,
      w: 311.41,
      L0: 358.00,
      T: 4163500.0 // ~11,400 años
    },
    atmosphere: {
      surfacePressureAtm: 0,
      greenhouseEffectDeltaK: 0,
      scaleHeightKm: 0,
      gases: [],
      colorHex: '#552211',
      description: 'Sin atmósfera detectable a distancias de cientos de UA.'
    },
    geology: {
      tectonics: 'Inactiva.',
      volcanism: 'Inactivo.',
      magneticField: 'Nulo.',
      layers: [
        {
          name: 'Corteza Roja de Tolinas y Hielo Primitivo',
          depthKm: [0, 80],
          thicknessKm: 80,
          composition: 'Compuestos orgánicos complejos (tolinas) formados por radiación cósmica sobre hielos.',
          temperatureK: [12, 25],
          colorHex: '#802613',
          description: 'Uno de los objetos más rojos del Sistema Solar por su exposición milenaria al espacio profundo.'
        },
        {
          name: 'Núcleo Rocoso Silicatado',
          depthKm: [80, 497],
          thicknessKm: 417,
          composition: 'Silicatos y metales pesados.',
          temperatureK: [25, 100],
          colorHex: '#42332e',
          description: 'Cuerpo fósil intacto desde el origen del Sistema Solar.'
        }
      ]
    },
    moons: []
  }
];
