export type DeepSkyType = "galaxy" | "globular-cluster" | "open-cluster" | "nebula" | "planetary-nebula";

export interface DeepSkyObject {
  id: string;
  messier?: string;
  ngc?: string;
  name: string;
  type: DeepSkyType;
  constellation: string;
  raDeg: number;
  decDeg: number;
  magnitude: number;
  angularSizeArcmin: number;
  distanceLy: number;
  colorHex: string;
}

/**
 * Catálogo curado de ~25 "grandes éxitos" del catálogo Messier más un puñado de objetos
 * no-Messier famosos y visibles desde El Salvador (13.7°N) — base para el modo telescopio.
 * Coordenadas ICRS J2000, estático (sin API en vivo), mismo patrón que brightStars.data.ts.
 */
export const DEEP_SKY_OBJECTS: DeepSkyObject[] = [
  { id: "m31", messier: "M31", ngc: "NGC 224", name: "Galaxia de Andrómeda", type: "galaxy",
    constellation: "Andrómeda", raDeg: 10.6847, decDeg: 41.269, magnitude: 3.44,
    angularSizeArcmin: 178, distanceLy: 2537000, colorHex: "#cdd6e8" },
  { id: "m42", messier: "M42", ngc: "NGC 1976", name: "Nebulosa de Orión", type: "nebula",
    constellation: "Orión", raDeg: 83.8221, decDeg: -5.3911, magnitude: 4.0,
    angularSizeArcmin: 85, distanceLy: 1344, colorHex: "#ff8fbf" },
  { id: "m45", messier: "M45", name: "Pléyades", type: "open-cluster",
    constellation: "Tauro", raDeg: 56.85, decDeg: 24.1167, magnitude: 1.6,
    angularSizeArcmin: 110, distanceLy: 444, colorHex: "#cfe0ff" },
  { id: "m13", messier: "M13", ngc: "NGC 6205", name: "Cúmulo de Hércules", type: "globular-cluster",
    constellation: "Hércules", raDeg: 250.4229, decDeg: 36.4603, magnitude: 5.8,
    angularSizeArcmin: 20, distanceLy: 22200, colorHex: "#ffe7a8" },
  { id: "m8", messier: "M8", ngc: "NGC 6523", name: "Nebulosa de la Laguna", type: "nebula",
    constellation: "Sagitario", raDeg: 270.9042, decDeg: -24.3867, magnitude: 6.0,
    angularSizeArcmin: 90, distanceLy: 4100, colorHex: "#ff8fbf" },
  { id: "m20", messier: "M20", ngc: "NGC 6514", name: "Nebulosa Trífida", type: "nebula",
    constellation: "Sagitario", raDeg: 270.6, decDeg: -23.03, magnitude: 6.3,
    angularSizeArcmin: 28, distanceLy: 5200, colorHex: "#ff8fbf" },
  { id: "m57", messier: "M57", ngc: "NGC 6720", name: "Nebulosa del Anillo", type: "planetary-nebula",
    constellation: "Lira", raDeg: 283.3963, decDeg: 33.0292, magnitude: 8.8,
    angularSizeArcmin: 1.4, distanceLy: 2570, colorHex: "#8fd6c9" },
  { id: "m27", messier: "M27", ngc: "NGC 6853", name: "Nebulosa de la Mancuerna", type: "planetary-nebula",
    constellation: "Vulpécula", raDeg: 299.9013, decDeg: 22.7211, magnitude: 7.5,
    angularSizeArcmin: 8, distanceLy: 1360, colorHex: "#8fd6c9" },
  { id: "m11", messier: "M11", ngc: "NGC 6705", name: "Cúmulo del Pato Salvaje", type: "open-cluster",
    constellation: "Escudo", raDeg: 282.7708, decDeg: -6.27, magnitude: 6.3,
    angularSizeArcmin: 14, distanceLy: 6200, colorHex: "#ffe7a8" },
  { id: "m4", messier: "M4", ngc: "NGC 6121", name: "Cúmulo M4", type: "globular-cluster",
    constellation: "Escorpión", raDeg: 245.8958, decDeg: -26.5253, magnitude: 5.6,
    angularSizeArcmin: 26, distanceLy: 7200, colorHex: "#ffe7a8" },
  { id: "m22", messier: "M22", ngc: "NGC 6656", name: "Cúmulo de Sagitario", type: "globular-cluster",
    constellation: "Sagitario", raDeg: 279.0996, decDeg: -23.9, magnitude: 5.1,
    angularSizeArcmin: 32, distanceLy: 10600, colorHex: "#ffe7a8" },
  { id: "jewel-box", ngc: "NGC 4755", name: "El Joyero", type: "open-cluster",
    constellation: "Cruz del Sur", raDeg: 193.4, decDeg: -60.365, magnitude: 4.2,
    angularSizeArcmin: 10, distanceLy: 6440, colorHex: "#d4e5ff" },
  { id: "omega-centauri", ngc: "NGC 5139", name: "Omega Centauri", type: "globular-cluster",
    constellation: "Centauro", raDeg: 201.6967, decDeg: -47.4769, magnitude: 3.9,
    angularSizeArcmin: 36, distanceLy: 17090, colorHex: "#ffe7a8" },
  { id: "m104", messier: "M104", ngc: "NGC 4594", name: "Galaxia del Sombrero", type: "galaxy",
    constellation: "Virgo", raDeg: 189.9976, decDeg: -11.6231, magnitude: 8.98,
    angularSizeArcmin: 8.7, distanceLy: 31100000, colorHex: "#cdd6e8" },
  { id: "m51", messier: "M51", ngc: "NGC 5194", name: "Galaxia del Remolino", type: "galaxy",
    constellation: "Canes Venatici", raDeg: 202.47, decDeg: 47.1952, magnitude: 8.4,
    angularSizeArcmin: 11, distanceLy: 31000000, colorHex: "#cdd6e8" },
  { id: "m81", messier: "M81", ngc: "NGC 3031", name: "Galaxia de Bode", type: "galaxy",
    constellation: "Osa Mayor", raDeg: 148.8888, decDeg: 69.0653, magnitude: 6.94,
    angularSizeArcmin: 26.9, distanceLy: 11800000, colorHex: "#cdd6e8" },
  { id: "m82", messier: "M82", ngc: "NGC 3034", name: "Galaxia del Cigarro", type: "galaxy",
    constellation: "Osa Mayor", raDeg: 148.9683, decDeg: 69.6797, magnitude: 8.41,
    angularSizeArcmin: 11.2, distanceLy: 11500000, colorHex: "#cdd6e8" },
  { id: "m17", messier: "M17", ngc: "NGC 6618", name: "Nebulosa Omega", type: "nebula",
    constellation: "Sagitario", raDeg: 275.1958, decDeg: -16.1717, magnitude: 6.0,
    angularSizeArcmin: 11, distanceLy: 5500, colorHex: "#ff8fbf" },
  { id: "m16", messier: "M16", ngc: "NGC 6611", name: "Nebulosa del Águila", type: "nebula",
    constellation: "Serpiente", raDeg: 274.7, decDeg: -13.8167, magnitude: 6.4,
    angularSizeArcmin: 7, distanceLy: 7000, colorHex: "#ff8fbf" },
  { id: "m6", messier: "M6", ngc: "NGC 6405", name: "Cúmulo de la Mariposa", type: "open-cluster",
    constellation: "Escorpión", raDeg: 265.0875, decDeg: -32.2533, magnitude: 4.2,
    angularSizeArcmin: 25, distanceLy: 1600, colorHex: "#ffe7a8" },
  { id: "m7", messier: "M7", ngc: "NGC 6475", name: "Cúmulo de Tolomeo", type: "open-cluster",
    constellation: "Escorpión", raDeg: 268.4625, decDeg: -34.7933, magnitude: 3.3,
    angularSizeArcmin: 80, distanceLy: 980, colorHex: "#ffe7a8" },
  { id: "m35", messier: "M35", ngc: "NGC 2168", name: "Cúmulo M35", type: "open-cluster",
    constellation: "Géminis", raDeg: 92.25, decDeg: 24.35, magnitude: 5.1,
    angularSizeArcmin: 28, distanceLy: 2800, colorHex: "#ffe7a8" },
  { id: "m44", messier: "M44", ngc: "NGC 2632", name: "Cúmulo de la Colmena", type: "open-cluster",
    constellation: "Cáncer", raDeg: 130.1, decDeg: 19.9833, magnitude: 3.7,
    angularSizeArcmin: 95, distanceLy: 577, colorHex: "#ffe7a8" },
  { id: "m3", messier: "M3", ngc: "NGC 5272", name: "Cúmulo M3", type: "globular-cluster",
    constellation: "Canes Venatici", raDeg: 205.5479, decDeg: 28.3772, magnitude: 6.2,
    angularSizeArcmin: 18, distanceLy: 33900, colorHex: "#ffe7a8" },
  { id: "m1", messier: "M1", ngc: "NGC 1952", name: "Nebulosa del Cangrejo", type: "nebula",
    constellation: "Tauro", raDeg: 83.6333, decDeg: 22.0145, magnitude: 8.4,
    angularSizeArcmin: 6, distanceLy: 6500, colorHex: "#ff8fbf" },
  { id: "double-cluster", ngc: "NGC 869 / 884", name: "Cúmulo Doble de Perseo", type: "open-cluster",
    constellation: "Perseo", raDeg: 35.0, decDeg: 57.1333, magnitude: 4.3,
    angularSizeArcmin: 60, distanceLy: 7600, colorHex: "#ffe7a8" },
];
