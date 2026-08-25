export interface BrightStar {
  id: string;
  name: string;
  constellation: string;
  raDeg: number;
  decDeg: number;
  magnitude: number;
  spectralType: string;
  distanceLy: number;
  colorHex: string;
}

function star(
  id: string,
  name: string,
  constellation: string,
  raHours: number,
  decDeg: number,
  magnitude: number,
  spectralType: string,
  distanceLy: number,
  colorHex: string,
): BrightStar {
  return {
    id,
    name,
    constellation,
    raDeg: raHours * 15,
    decDeg,
    magnitude,
    spectralType,
    distanceLy,
    colorHex,
  };
}

/** Estrellas más brillantes, coordenadas ICRS J2000. Suficientes para orientar el cielo a ojo. */
export const BRIGHT_STARS: BrightStar[] = [
  star("sirius", "Sirio", "Can Mayor", 6.7525, -16.7161, -1.46, "A1V", 8.6, "#eaf2ff"),
  star("canopus", "Canopus", "Carina", 6.3992, -52.6956, -0.74, "A9II", 310, "#fff4d8"),
  star("rigil-kentaurus", "Rigil Kentaurus", "Centauro", 14.6601, -60.8353, -0.27, "G2V", 4.4, "#fff1c2"),
  star("arcturus", "Arturo", "Boyero", 14.261, 19.1824, -0.05, "K1.5III", 37, "#ffb56a"),
  star("vega", "Vega", "Lira", 18.6156, 38.7836, 0.03, "A0V", 25, "#e8f1ff"),
  star("capella", "Capella", "Auriga", 5.2782, 45.998, 0.08, "G8III", 43, "#ffe7a8"),
  star("rigel", "Rigel", "Orión", 5.2423, -8.2016, 0.13, "B8Ia", 860, "#cfe4ff"),
  star("procyon", "Proción", "Can Menor", 7.655, 5.225, 0.34, "F5IV", 11.5, "#fff3d0"),
  star("achernar", "Achernar", "Eridano", 1.6286, -57.2367, 0.46, "B6Vep", 139, "#d4e8ff"),
  star("betelgeuse", "Betelgeuse", "Orión", 5.9195, 7.407, 0.5, "M1-2Ia", 550, "#ff8a4a"),
  star("hadar", "Hadar", "Centauro", 14.0637, -60.373, 0.61, "B1III", 390, "#cfe0ff"),
  star("altair", "Altair", "Águila", 19.8464, 8.8683, 0.76, "A7V", 16.7, "#eef4ff"),
  star("acrux", "Acrux", "Cruz del Sur", 12.4433, -63.0991, 0.77, "B0.5IV", 320, "#d7e7ff"),
  star("aldebaran", "Aldebarán", "Tauro", 4.5987, 16.5093, 0.85, "K5III", 65, "#ff9a52"),
  star("antares", "Antares", "Escorpión", 16.4901, -26.432, 0.96, "M1.5Iab", 550, "#ff7040"),
  star("spica", "Spica", "Virgo", 13.4199, -11.1614, 0.98, "B1V", 250, "#d2e5ff"),
  star("pollux", "Pólux", "Géminis", 7.7553, 28.0262, 1.14, "K0III", 34, "#ffb266"),
  star("fomalhaut", "Fomalhaut", "Piscis Austrinus", 22.9608, -29.6222, 1.16, "A4V", 25, "#eef3ff"),
  star("mimosa", "Mimosa", "Cruz del Sur", 12.7953, -59.6888, 1.25, "B0.5III", 280, "#d4e6ff"),
  star("deneb", "Deneb", "Cisne", 20.6901, 45.2803, 1.25, "A2Ia", 1400, "#eaf2ff"),
  star("regulus", "Regulus", "Leo", 10.1395, 11.9672, 1.35, "B8IVn", 79, "#dce8ff"),
  star("adhara", "Adhara", "Can Mayor", 6.9771, -28.9721, 1.5, "B2II", 430, "#d3e4ff"),
  star("castor", "Cástor", "Géminis", 7.5767, 31.8883, 1.58, "A1V", 51, "#eaf2ff"),
  star("shaula", "Shaula", "Escorpión", 17.5601, -37.1038, 1.62, "B2IV", 570, "#d5e6ff"),
  star("bellatrix", "Bellatrix", "Orión", 5.4188, 6.3497, 1.64, "B2III", 250, "#d4e5ff"),
  star("elnath", "Elnath", "Tauro", 5.4381, 28.6075, 1.65, "B7III", 130, "#dce8ff"),
  star("alnilam", "Alnilam", "Orión", 5.6036, -1.2019, 1.69, "B0Ia", 2000, "#cfe2ff"),
  star("alnitak", "Alnitak", "Orión", 5.6794, -1.9426, 1.77, "O9.5Iab", 800, "#c9ddff"),
  star("alioth", "Alioth", "Osa Mayor", 12.9004, 55.9598, 1.76, "A1III", 83, "#eef3ff"),
  star("dubhe", "Dubhe", "Osa Mayor", 11.0621, 61.751, 1.79, "K0III", 123, "#ffb266"),
  star("mirfak", "Mirfak", "Perseo", 3.4054, 49.8612, 1.79, "F5Ib", 590, "#fff1c8"),
  star("alnair", "Alnair", "Grulla", 22.1372, -46.961, 1.74, "B6V", 101, "#d6e7ff"),
  star("peacock", "Peacock", "Pavo", 20.4275, -56.735, 1.91, "B2IV", 180, "#d4e5ff"),
  star("polaris", "Polaris", "Osa Menor", 2.5303, 89.2641, 1.98, "F7Ib", 430, "#fff4d2"),
  star("alphard", "Alphard", "Hidra", 9.4597, -8.6586, 1.99, "K3II-III", 177, "#ff9e58"),
  star("hamal", "Hamal", "Aries", 2.1196, 23.4628, 2.0, "K2III", 66, "#ffb266"),
];
