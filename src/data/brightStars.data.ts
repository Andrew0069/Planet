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

  // Ampliación para líneas de constelación (ver constellations.data.ts): estrellas adicionales
  // necesarias para completar figuras reconocibles de las 12 constelaciones curadas.
  // Orión (completa cinturón + pies)
  star("mintaka", "Mintaka", "Orión", 5.5335, -0.2992, 2.23, "O9.5II", 1200, "#cfe0ff"),
  star("saiph", "Saiph", "Orión", 5.796, -9.6699, 2.09, "B0.5Ia", 650, "#cfe2ff"),
  // Osa Mayor (el Carro / Big Dipper completo)
  star("merak", "Merak", "Osa Mayor", 11.0307, 56.3825, 2.37, "A1V", 79.7, "#eef3ff"),
  star("phecda", "Phecda", "Osa Mayor", 11.8972, 53.6947, 2.44, "A0Ve", 83.2, "#eef3ff"),
  star("megrez", "Megrez", "Osa Mayor", 12.2571, 57.0325, 3.31, "A3V", 80.5, "#f0f4ff"),
  star("mizar", "Mizar", "Osa Mayor", 13.3988, 54.9253, 2.23, "A2V", 82.9, "#eef3ff"),
  star("alkaid", "Alkaid", "Osa Mayor", 13.7924, 49.3133, 1.86, "B3V", 103.9, "#d7e5ff"),
  // Casiopea (la W)
  star("schedar", "Schedar", "Casiopea", 0.6751, 56.5372, 2.24, "K0IIIa", 228, "#ffb266"),
  star("caph", "Caph", "Casiopea", 0.153, 59.1497, 2.28, "F2III-IV", 54.7, "#fff1c8"),
  star("navi", "Navi", "Casiopea", 0.9451, 60.7167, 2.47, "B0.5IVe", 610, "#cfe2ff"),
  star("ruchbah", "Ruchbah", "Casiopea", 1.4303, 60.2353, 2.68, "A5V", 99.4, "#eef3ff"),
  star("segin", "Segin", "Casiopea", 1.9066, 63.67, 3.35, "B3III", 440, "#d7e5ff"),
  // Cruz del Sur (completa la cruz)
  star("gacrux", "Gacrux", "Cruz del Sur", 12.5194, -57.1133, 1.63, "M3.5III", 88.6, "#ff9e58"),
  star("imai", "Imai", "Cruz del Sur", 12.2524, -58.7489, 2.79, "B2IV", 345, "#d4e5ff"),
  // Escorpión (cuerpo y aguijón)
  star("dschubba", "Dschubba", "Escorpión", 16.0056, -22.6217, 2.29, "B0.3IV", 400, "#cfe0ff"),
  star("sargas", "Sargas", "Escorpión", 17.622, -42.9978, 1.87, "F1II", 272, "#fff1c8"),
  star("acrab", "Acrab", "Escorpión", 16.0906, -19.8056, 2.56, "B1V", 530, "#cfe0ff"),
  star("lesath", "Lesath", "Escorpión", 17.5128, -37.2958, 2.69, "B2IV", 520, "#d4e5ff"),
  // Tauro (cuernos del toro)
  star("zeta-tauri", "Tianguan", "Tauro", 5.6274, 21.1425, 3.0, "B2III", 440, "#d4e5ff"),
  star("ain", "Ain", "Tauro", 4.4769, 19.1806, 3.53, "K0III", 146, "#ffb266"),
  // Géminis (los gemelos)
  star("alhena", "Alhena", "Géminis", 6.6285, 16.3992, 1.93, "A0IV", 109, "#eef3ff"),
  star("wasat", "Wasat", "Géminis", 7.3353, 21.9822, 3.53, "F0IV", 61, "#fff1d0"),
  star("mebsuta", "Mebsuta", "Géminis", 6.7322, 25.1311, 3.06, "G8Ib", 840, "#ffe7a8"),
  // Cisne (Cruz del Norte)
  star("sadr", "Sadr", "Cisne", 20.3705, 40.2567, 2.23, "F8Ib", 1800, "#fff1d0"),
  star("gienah-cygni", "Gienah", "Cisne", 20.7702, 33.9703, 2.48, "K0III", 72, "#ffb266"),
  star("delta-cygni", "Fawaris", "Cisne", 19.7496, 45.1308, 2.87, "A0IV", 165, "#eef3ff"),
  star("albireo", "Albireo", "Cisne", 19.512, 27.9597, 3.18, "K3II", 430, "#ffb266"),
  // Leo (la hoz)
  star("algieba", "Algieba", "Leo", 10.3329, 19.8414, 2.01, "K1III", 130, "#ffb266"),
  star("denebola", "Denébola", "Leo", 11.8177, 14.5719, 2.14, "A3V", 36, "#eef3ff"),
  star("zosma", "Zosma", "Leo", 11.2351, 20.5236, 2.56, "A4V", 58, "#eef3ff"),
  star("chertan", "Chertan", "Leo", 11.2373, 15.4294, 3.34, "A2V", 165, "#eef3ff"),
  // Can Mayor (completa la figura del perro)
  star("mirzam", "Mirzam", "Can Mayor", 6.3783, -17.9558, 1.98, "B1II-III", 500, "#cfe0ff"),
  star("wezen", "Wezen", "Can Mayor", 7.1398, -26.3933, 1.83, "F8Ia", 1800, "#fff1d0"),
  star("aludra", "Aludra", "Can Mayor", 7.4016, -29.3031, 2.45, "B5Ia", 2000, "#d4e5ff"),
  // Águila
  star("tarazed", "Tarazed", "Águila", 19.771, 10.6133, 2.72, "K3II", 460, "#ffb266"),
  star("alshain", "Alshain", "Águila", 19.9219, 6.4067, 3.71, "G8IV", 45, "#ffe7a8"),
  star("deneb-el-okab", "Deneb el Okab", "Águila", 19.0902, 13.8636, 2.99, "A0IV-Vn", 83, "#eef3ff"),
  // Virgo (la Y)
  star("porrima", "Porrima", "Virgo", 12.6944, -1.4494, 2.74, "F0V", 38, "#fff1d0"),
  star("vindemiatrix", "Vindemiatrix", "Virgo", 13.0363, 10.9592, 2.83, "G8III", 110, "#ffe7a8"),
  star("heze", "Heze", "Virgo", 13.5782, -0.5958, 3.37, "A2IV-V", 74, "#eef3ff"),
];
