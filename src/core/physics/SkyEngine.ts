import { PLANETS_DATA, PlanetData } from "../../data/planets.data";
import { BRIGHT_STARS } from "../../data/brightStars.data";
import { KeplerianEngine } from "./KeplerianEngine";
import type { EvidenceKind } from "../scientific.types";

export interface ObserverSite {
  name: string;
  latitudeDeg: number;
  longitudeDeg: number;
  elevationM: number;
  utcOffsetHours: number;
}

export const SANTA_TECLA: ObserverSite = {
  name: "Santa Tecla",
  latitudeDeg: 13.6769,
  longitudeDeg: -89.2797,
  elevationM: 790,
  utcOffsetHours: -6,
};

export type SkyObjectKind = "sun" | "moon" | "planet" | "star";

export interface Vec3 {
  x: number;
  y: number;
  z: number;
}

export interface SkyObject {
  id: string;
  name: string;
  kind: SkyObjectKind;
  colorHex: string;
  raDeg: number;
  decDeg: number;
  altitudeDeg: number;
  azimuthDeg: number;
  distanceAU: number;
  elongationDeg: number;
  phase: number;
  phaseAngleDeg: number;
  angularSizeArcsec: number;
  magnitude: number;
  aboveHorizon: boolean;
  evidence: EvidenceKind;
  note?: string;
}

export interface TwilightState {
  sunAltitudeDeg: number;
  condition: "day" | "civil" | "nautical" | "astronomical" | "night";
  label: string;
}

export interface RiseSetTransit {
  rise: Date | null;
  transit: Date | null;
  set: Date | null;
  circumpolar: boolean;
  neverRises: boolean;
}

export interface SkyObservation {
  site: ObserverSite;
  date: Date;
  lstHours: number;
  gmstHours: number;
  twilight: TwilightState;
  objects: SkyObject[];
}

const DEG2RAD = Math.PI / 180;
const RAD2DEG = 180 / Math.PI;
const AU_KM = 149597870.7;
const OBLIQUITY = 23.43929111 * DEG2RAD;
const STORAGE_KEY = "planeta-observer-v1";

const PLANET_H: Record<string, number> = {
  mercury: -0.4,
  venus: -4.4,
  mars: -1.6,
  jupiter: -9.4,
  saturn: -8.88,
  uranus: -7.19,
  neptune: -6.87,
};

const PLANET_RADIUS_KM: Record<string, number> = Object.fromEntries(
  PLANETS_DATA.map((p) => [p.id, p.radiusKm]),
);

export class SkyEngine {
  public static loadSite(): ObserverSite {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return { ...SANTA_TECLA };
      const parsed = JSON.parse(raw) as Partial<ObserverSite>;
      return {
        name: parsed.name?.trim() || SANTA_TECLA.name,
        latitudeDeg: clamp(Number(parsed.latitudeDeg), -90, 90) || SANTA_TECLA.latitudeDeg,
        longitudeDeg: clamp(Number(parsed.longitudeDeg), -180, 180) || SANTA_TECLA.longitudeDeg,
        elevationM: Number.isFinite(Number(parsed.elevationM))
          ? Number(parsed.elevationM)
          : SANTA_TECLA.elevationM,
        utcOffsetHours: Number.isFinite(Number(parsed.utcOffsetHours))
          ? Number(parsed.utcOffsetHours)
          : SANTA_TECLA.utcOffsetHours,
      };
    } catch {
      return { ...SANTA_TECLA };
    }
  }

  public static saveSite(site: ObserverSite): void {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(site));
  }

  public static daysSinceJ2000(date: Date): number {
    return (date.getTime() - Date.UTC(2000, 0, 1, 12)) / 86400000;
  }

  public static julianDate(date: Date): number {
    return 2451545.0 + this.daysSinceJ2000(date);
  }

  public static gmstDeg(date: Date): number {
    const d = this.daysSinceJ2000(date);
    return wrap360(280.46061837 + 360.98564736629 * d);
  }

  public static lstDeg(date: Date, longitudeDeg: number): number {
    return wrap360(this.gmstDeg(date) + longitudeDeg);
  }

  public static toLocalInputValue(date: Date, utcOffsetHours: number): string {
    const shifted = new Date(date.getTime() + utcOffsetHours * 3600000);
    const p = (n: number) => String(n).padStart(2, "0");
    return `${shifted.getUTCFullYear()}-${p(shifted.getUTCMonth() + 1)}-${p(shifted.getUTCDate())}T${p(shifted.getUTCHours())}:${p(shifted.getUTCMinutes())}`;
  }

  public static fromLocalInputValue(value: string, utcOffsetHours: number): Date {
    const [datePart, timePart = "00:00"] = value.split("T");
    const [y, m, d] = datePart.split("-").map(Number);
    const [hh, mm] = timePart.split(":").map(Number);
    return new Date(Date.UTC(y, m - 1, d, hh, mm) - utcOffsetHours * 3600000);
  }

  public static equatorialToHorizontal(
    raDeg: number,
    decDeg: number,
    lstDeg: number,
    latitudeDeg: number,
  ): { altitudeDeg: number; azimuthDeg: number } {
    const ha = (lstDeg - raDeg) * DEG2RAD;
    const dec = decDeg * DEG2RAD;
    const lat = latitudeDeg * DEG2RAD;
    const sinAlt =
      Math.sin(dec) * Math.sin(lat) + Math.cos(dec) * Math.cos(lat) * Math.cos(ha);
    const altitudeDeg = Math.asin(clamp(sinAlt, -1, 1)) * RAD2DEG;
    const y = -Math.cos(dec) * Math.sin(ha);
    const x =
      Math.sin(dec) * Math.cos(lat) - Math.cos(dec) * Math.sin(lat) * Math.cos(ha);
    const azimuthDeg = wrap360(Math.atan2(y, x) * RAD2DEG);
    return { altitudeDeg, azimuthDeg };
  }

  public static observe(site: ObserverSite, date: Date): SkyObservation {
    const days = this.daysSinceJ2000(date);
    const lstDeg = this.lstDeg(date, site.longitudeDeg);
    const earth = eclipticOf("earth", days);
    const sunGeo = scale(earth, -1);
    const sunEq = eclipticToEquatorial(sunGeo);
    const sunHoriz = this.equatorialToHorizontal(
      sunEq.raDeg,
      sunEq.decDeg,
      lstDeg,
      site.latitudeDeg,
    );
    const sunDistance = length(sunGeo);
    const sun: SkyObject = {
      id: "sun",
      name: "Sol",
      kind: "sun",
      colorHex: "#f4e3b0",
      raDeg: sunEq.raDeg,
      decDeg: sunEq.decDeg,
      altitudeDeg: sunHoriz.altitudeDeg,
      azimuthDeg: sunHoriz.azimuthDeg,
      distanceAU: sunDistance,
      elongationDeg: 0,
      phase: 1,
      phaseAngleDeg: 0,
      angularSizeArcsec: angularSizeArcsec(695700, sunDistance),
      magnitude: -26.74,
      aboveHorizon: sunHoriz.altitudeDeg > 0,
      evidence: "derived",
      note: "Geocéntrico a partir de elementos J2000 de la Tierra.",
    };

    const objects: SkyObject[] = [sun];

    const moonEcl = add(earth, moonOffsetEcliptic(days));
    objects.push(
      this.buildBody("moon", "Luna", "moon", "#d2d2d8", moonEcl, earth, sunGeo, lstDeg, site, 1737.4, {
        evidence: "derived",
        note: "Luna: modelo medio de Meeus (longitud, anomalía y latitud). Precisión de unos pocos grados.",
      }),
    );

    for (const planet of visiblePlanets()) {
      const helio = eclipticOf(planet.id, days);
      objects.push(
        this.buildBody(
          planet.id,
          planet.name,
          "planet",
          planet.colorHex,
          helio,
          earth,
          sunGeo,
          lstDeg,
          site,
          PLANET_RADIUS_KM[planet.id] ?? planet.radiusKm,
          {
            evidence: "derived",
            note: "Posición kepleriana J2000 · magnitud visual estimada.",
          },
        ),
      );
    }

    for (const star of BRIGHT_STARS) {
      const horiz = this.equatorialToHorizontal(star.raDeg, star.decDeg, lstDeg, site.latitudeDeg);
      objects.push({
        id: star.id,
        name: star.name,
        kind: "star",
        colorHex: star.colorHex,
        raDeg: star.raDeg,
        decDeg: star.decDeg,
        altitudeDeg: horiz.altitudeDeg,
        azimuthDeg: horiz.azimuthDeg,
        distanceAU: star.distanceLy * 63241.1,
        elongationDeg: 0,
        phase: 1,
        phaseAngleDeg: 0,
        angularSizeArcsec: 0,
        magnitude: star.magnitude,
        aboveHorizon: horiz.altitudeDeg > 0,
        evidence: "observed",
        note: `${star.constellation} · ${star.spectralType} · catálogo J2000.`,
      });
    }

    return {
      site,
      date,
      lstHours: wrap360(lstDeg) / 15,
      gmstHours: this.gmstDeg(date) / 15,
      twilight: twilightFromAltitude(sun.altitudeDeg),
      objects,
    };
  }

  public static events(site: ObserverSite, date: Date, objectId: string): RiseSetTransit {
    const localMidnight = this.fromLocalInputValue(
      `${this.toLocalInputValue(date, site.utcOffsetHours).slice(0, 10)}T00:00`,
      site.utcOffsetHours,
    );
    const samples: { t: Date; alt: number }[] = [];
    for (let i = 0; i <= 144; i++) {
      const t = new Date(localMidnight.getTime() + i * 10 * 60 * 1000);
      const obs = this.observe(site, t);
      const obj = obs.objects.find((item) => item.id === objectId);
      samples.push({ t, alt: obj?.altitudeDeg ?? -90 });
    }
    let rise: Date | null = null;
    let set: Date | null = null;
    let transit = samples[0]!;
    for (const sample of samples) {
      if (sample.alt > transit.alt) transit = sample;
    }
    for (let i = 1; i < samples.length; i++) {
      const prev = samples[i - 1]!;
      const next = samples[i]!;
      if (prev.alt < 0 && next.alt >= 0 && !rise) {
        rise = interpolateTime(prev.t, prev.alt, next.t, next.alt, 0);
      }
      if (prev.alt >= 0 && next.alt < 0 && !set) {
        set = interpolateTime(prev.t, prev.alt, next.t, next.alt, 0);
      }
    }
    const alwaysUp = samples.every((s) => s.alt > 0);
    const alwaysDown = samples.every((s) => s.alt < 0);
    return {
      rise,
      transit: alwaysDown ? null : transit.t,
      set,
      circumpolar: alwaysUp,
      neverRises: alwaysDown,
    };
  }

  public static eclipticPath(
    site: ObserverSite,
    date: Date,
    steps = 72,
  ): { altitudeDeg: number; azimuthDeg: number }[] {
    const lstDeg = this.lstDeg(date, site.longitudeDeg);
    const points: { altitudeDeg: number; azimuthDeg: number }[] = [];
    for (let i = 0; i <= steps; i++) {
      const lon = (i / steps) * 2 * Math.PI;
      const eq = eclipticToEquatorial({ x: Math.cos(lon), y: Math.sin(lon), z: 0 });
      points.push(
        this.equatorialToHorizontal(eq.raDeg, eq.decDeg, lstDeg, site.latitudeDeg),
      );
    }
    return points;
  }

  public static equatorPath(
    site: ObserverSite,
    date: Date,
    steps = 72,
  ): { altitudeDeg: number; azimuthDeg: number }[] {
    const lstDeg = this.lstDeg(date, site.longitudeDeg);
    const points: { altitudeDeg: number; azimuthDeg: number }[] = [];
    for (let i = 0; i <= steps; i++) {
      const ra = (i / steps) * 360;
      points.push(this.equatorialToHorizontal(ra, 0, lstDeg, site.latitudeDeg));
    }
    return points;
  }

  private static buildBody(
    id: string,
    name: string,
    kind: SkyObjectKind,
    colorHex: string,
    helio: Vec3,
    earth: Vec3,
    sunGeo: Vec3,
    lstDeg: number,
    site: ObserverSite,
    radiusKm: number,
    meta: { evidence: EvidenceKind; note: string },
  ): SkyObject {
    const geo = sub(helio, earth);
    const eq = eclipticToEquatorial(geo);
    const horiz = this.equatorialToHorizontal(eq.raDeg, eq.decDeg, lstDeg, site.latitudeDeg);
    const distanceAU = Math.max(length(geo), 1e-8);
    const rHelio = Math.max(length(helio), 1e-8);
    const earthSun = Math.max(length(sunGeo), 1e-8);
    const elongationDeg =
      Math.acos(clamp(dot(sunGeo, geo) / (earthSun * distanceAU), -1, 1)) * RAD2DEG;
    const phaseAngleDeg =
      Math.acos(clamp((rHelio ** 2 + distanceAU ** 2 - earthSun ** 2) / (2 * rHelio * distanceAU), -1, 1)) *
      RAD2DEG;
    const phase = (1 + Math.cos(phaseAngleDeg * DEG2RAD)) / 2;
    return {
      id,
      name,
      kind,
      colorHex,
      raDeg: eq.raDeg,
      decDeg: eq.decDeg,
      altitudeDeg: horiz.altitudeDeg,
      azimuthDeg: horiz.azimuthDeg,
      distanceAU,
      elongationDeg,
      phase,
      phaseAngleDeg,
      angularSizeArcsec: angularSizeArcsec(radiusKm, distanceAU),
      magnitude: visualMagnitude(id, rHelio, distanceAU, phaseAngleDeg),
      aboveHorizon: horiz.altitudeDeg > 0,
      evidence: meta.evidence,
      note: meta.note,
    };
  }
}

function visiblePlanets(): PlanetData[] {
  return PLANETS_DATA.filter((planet) =>
    ["mercury", "venus", "mars", "jupiter", "saturn", "uranus", "neptune"].includes(planet.id),
  );
}

function eclipticOf(planetId: string, days: number): Vec3 {
  const planet = PLANETS_DATA.find((item) => item.id === planetId);
  if (!planet) return { x: 0, y: 0, z: 0 };
  const p = KeplerianEngine.calculatePosition(planet.elements, days).positionAU;
  return { x: p.x, y: p.z, z: p.y };
}

function moonOffsetEcliptic(days: number): Vec3 {
  const L = wrap360(218.316 + 13.176396 * days) * DEG2RAD;
  const M = wrap360(134.963 + 13.064993 * days) * DEG2RAD;
  const F = wrap360(93.272 + 13.22935 * days) * DEG2RAD;
  const lambda = L + 6.289 * DEG2RAD * Math.sin(M);
  const beta = 5.128 * DEG2RAD * Math.sin(F);
  const distAU = (385001 - 20905 * Math.cos(M)) / AU_KM;
  const cosB = Math.cos(beta);
  return {
    x: distAU * cosB * Math.cos(lambda),
    y: distAU * cosB * Math.sin(lambda),
    z: distAU * Math.sin(beta),
  };
}

function eclipticToEquatorial(v: Vec3): { raDeg: number; decDeg: number } {
  const y = v.y * Math.cos(OBLIQUITY) - v.z * Math.sin(OBLIQUITY);
  const z = v.y * Math.sin(OBLIQUITY) + v.z * Math.cos(OBLIQUITY);
  const raDeg = wrap360(Math.atan2(y, v.x) * RAD2DEG);
  const decDeg = Math.atan2(z, Math.hypot(v.x, y)) * RAD2DEG;
  return { raDeg, decDeg };
}

function visualMagnitude(id: string, rAU: number, deltaAU: number, phaseAngleDeg: number): number {
  if (id === "moon") {
    const a = Math.abs(phaseAngleDeg);
    return 0.213 * a + 4e-9 * a ** 4 - 12.73;
  }
  const H = PLANET_H[id];
  if (H == null) return 99;
  return H + 5 * Math.log10(Math.max(rAU * deltaAU, 1e-8)) + 0.026 * phaseAngleDeg;
}

function angularSizeArcsec(radiusKm: number, distanceAU: number): number {
  const distKm = distanceAU * AU_KM;
  if (distKm <= 0) return 0;
  return 2 * Math.atan(radiusKm / distKm) * RAD2DEG * 3600;
}

function twilightFromAltitude(sunAlt: number): TwilightState {
  if (sunAlt >= 0) return { sunAltitudeDeg: sunAlt, condition: "day", label: "Día" };
  if (sunAlt >= -6) return { sunAltitudeDeg: sunAlt, condition: "civil", label: "Crepúsculo civil" };
  if (sunAlt >= -12)
    return { sunAltitudeDeg: sunAlt, condition: "nautical", label: "Crepúsculo náutico" };
  if (sunAlt >= -18)
    return { sunAltitudeDeg: sunAlt, condition: "astronomical", label: "Crepúsculo astronómico" };
  return { sunAltitudeDeg: sunAlt, condition: "night", label: "Noche" };
}

function interpolateTime(t0: Date, a0: number, t1: Date, a1: number, target: number): Date {
  const u = (target - a0) / (a1 - a0 || 1);
  return new Date(t0.getTime() + u * (t1.getTime() - t0.getTime()));
}

function add(a: Vec3, b: Vec3): Vec3 {
  return { x: a.x + b.x, y: a.y + b.y, z: a.z + b.z };
}
function sub(a: Vec3, b: Vec3): Vec3 {
  return { x: a.x - b.x, y: a.y - b.y, z: a.z - b.z };
}
function scale(a: Vec3, s: number): Vec3 {
  return { x: a.x * s, y: a.y * s, z: a.z * s };
}
function dot(a: Vec3, b: Vec3): number {
  return a.x * b.x + a.y * b.y + a.z * b.z;
}
function length(a: Vec3): number {
  return Math.hypot(a.x, a.y, a.z);
}
function wrap360(value: number): number {
  const v = value % 360;
  return v < 0 ? v + 360 : v;
}
function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export function formatAzimuth(deg: number): string {
  const dirs = ["N", "NE", "E", "SE", "S", "SO", "O", "NO"];
  const idx = Math.round(wrap360(deg) / 45) % 8;
  return `${wrap360(deg).toFixed(0)}° ${dirs[idx]}`;
}

export function formatHours(hours: number): string {
  const h = wrap360(hours * 15) / 15;
  const hh = Math.floor(h);
  const mm = Math.floor((h - hh) * 60);
  return `${String(hh).padStart(2, "0")}h ${String(mm).padStart(2, "0")}m`;
}

export function cardinalFromAzimuth(deg: number): string {
  const dirs = ["Norte", "Noreste", "Este", "Sureste", "Sur", "Suroeste", "Oeste", "Noroeste"];
  return dirs[Math.round(wrap360(deg) / 45) % 8] ?? "Norte";
}
