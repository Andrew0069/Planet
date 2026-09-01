export interface ConstellationLine {
  fromStarId: string;
  toStarId: string;
}

export interface Constellation {
  id: string;
  name: string;
  abbreviation: string;
  /** Estrella de BRIGHT_STARS usada como ancla para la etiqueta del nombre. */
  labelStarId: string;
  lines: ConstellationLine[];
}

function line(fromStarId: string, toStarId: string): ConstellationLine {
  return { fromStarId, toStarId };
}

/**
 * Set curado de 12 constelaciones icónicas, visibles a lo largo del año desde Santa Tecla
 * (13.7°N). Las líneas conectan IDs de BRIGHT_STARS (brightStars.data.ts) — no llevan
 * coordenadas propias, así SkyEngine ya proyecta cada extremo a alt/az cada frame.
 */
export const CONSTELLATIONS: Constellation[] = [
  {
    id: "orion",
    name: "Orión",
    abbreviation: "Ori",
    labelStarId: "betelgeuse",
    lines: [
      line("betelgeuse", "bellatrix"),
      line("betelgeuse", "alnitak"),
      line("bellatrix", "mintaka"),
      line("mintaka", "alnilam"),
      line("alnilam", "alnitak"),
      line("alnitak", "saiph"),
      line("mintaka", "rigel"),
    ],
  },
  {
    id: "ursa-major",
    name: "Osa Mayor",
    abbreviation: "UMa",
    labelStarId: "dubhe",
    lines: [
      line("dubhe", "merak"),
      line("merak", "phecda"),
      line("phecda", "megrez"),
      line("megrez", "dubhe"),
      line("megrez", "alioth"),
      line("alioth", "mizar"),
      line("mizar", "alkaid"),
    ],
  },
  {
    id: "cassiopeia",
    name: "Casiopea",
    abbreviation: "Cas",
    labelStarId: "schedar",
    lines: [
      line("caph", "schedar"),
      line("schedar", "navi"),
      line("navi", "ruchbah"),
      line("ruchbah", "segin"),
    ],
  },
  {
    id: "crux",
    name: "Cruz del Sur",
    abbreviation: "Cru",
    labelStarId: "acrux",
    lines: [line("gacrux", "acrux"), line("mimosa", "imai")],
  },
  {
    id: "scorpius",
    name: "Escorpión",
    abbreviation: "Sco",
    labelStarId: "antares",
    lines: [
      line("acrab", "dschubba"),
      line("dschubba", "antares"),
      line("antares", "sargas"),
      line("sargas", "shaula"),
      line("shaula", "lesath"),
    ],
  },
  {
    id: "taurus",
    name: "Tauro",
    abbreviation: "Tau",
    labelStarId: "aldebaran",
    lines: [line("ain", "aldebaran"), line("aldebaran", "elnath"), line("aldebaran", "zeta-tauri")],
  },
  {
    id: "gemini",
    name: "Géminis",
    abbreviation: "Gem",
    labelStarId: "castor",
    lines: [
      line("castor", "pollux"),
      line("pollux", "wasat"),
      line("wasat", "alhena"),
      line("castor", "mebsuta"),
    ],
  },
  {
    id: "cygnus",
    name: "Cisne",
    abbreviation: "Cyg",
    labelStarId: "deneb",
    lines: [
      line("deneb", "sadr"),
      line("sadr", "albireo"),
      line("sadr", "gienah-cygni"),
      line("sadr", "delta-cygni"),
    ],
  },
  {
    id: "leo",
    name: "Leo",
    abbreviation: "Leo",
    labelStarId: "regulus",
    lines: [
      line("regulus", "algieba"),
      line("algieba", "zosma"),
      line("zosma", "denebola"),
      line("zosma", "chertan"),
      line("chertan", "regulus"),
    ],
  },
  {
    id: "canis-major",
    name: "Can Mayor",
    abbreviation: "CMa",
    labelStarId: "sirius",
    lines: [line("mirzam", "sirius"), line("sirius", "adhara"), line("adhara", "wezen"), line("wezen", "aludra")],
  },
  {
    id: "aquila",
    name: "Águila",
    abbreviation: "Aql",
    labelStarId: "altair",
    lines: [line("tarazed", "altair"), line("altair", "alshain"), line("altair", "deneb-el-okab")],
  },
  {
    id: "virgo",
    name: "Virgo",
    abbreviation: "Vir",
    labelStarId: "spica",
    lines: [line("spica", "heze"), line("heze", "porrima"), line("porrima", "vindemiatrix")],
  },
];
