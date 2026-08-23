import { PlanetData } from '../../data/planets.data';
import { BASE_SUN_DATA } from '../../data/star.data';
import { OrbitalBody, SI, StellarBody } from '../scientific.types';

export interface PlanetThermodynamicsResult {
  planetId: string;
  planetName: string;
  distanceAU: number;
  solarIrradianceWm2: number;        // Flujo solar incidente S (W/m²)
  solarIrradianceEarthRatio: number; // En comparación con la Tierra (1.0)
  equilibriumTempK: number;          // Temperatura de equilibrio de cuerpo negro (K)
  equilibriumTempC: number;          // Teq en Celsius (°C)
  surfaceTempEstimatedK: number;     // Temperatura superficial con efecto invernadero (K)
  surfaceTempEstimatedC: number;     // Tsurf en Celsius (°C)
  greenhouseContributionK: number;   // Aporte del efecto invernadero en Kelvin
  habitabilityStatus: 'too_hot' | 'habitable' | 'optimistic_habitable' | 'too_cold';
  statusLabel: string;
}

export interface HabitableZoneLimits {
  relativeLuminosity: number;        // L / L_sun
  conservativeInnerAU: number;      // 0.95 * sqrt(L) - Límite invernadero desbocado
  conservativeOuterAU: number;      // 1.68 * sqrt(L) - Límite invernadero máximo (hielo)
  optimisticInnerAU: number;        // 0.75 * sqrt(L) - Venus reciente
  optimisticOuterAU: number;        // 1.77 * sqrt(L) - Marte temprano
}

export interface ScientificClimateResult {
  luminositySolar: number;
  irradianceWm2: number;
  equilibriumTemperatureK: number;
  estimatedSurfaceTemperatureK: number;
  greenhouseContributionK: number;
  conservativeInnerM: number;
  conservativeOuterM: number;
  modelUncertaintyK: number;
  note: string;
}

export class ThermodynamicsEngine {
  // Constante de Stefan-Boltzmann en W / (m² · K⁴)
  public static readonly STEFAN_BOLTZMANN = 5.670374419e-8;
  public static readonly BASE_SUN_TEMP_K = BASE_SUN_DATA.baseTempK; // 5778 K
  public static readonly SOLAR_CONSTANT_EARTH = BASE_SUN_DATA.solarConstantEarthWm2; // 1361 W/m²

  /**
   * Calcula la luminosidad estelar relativa (L / L_sun) a partir de la temperatura en Kelvin.
   * Ley de Stefan-Boltzmann: L = 4 * PI * R² * sigma * T⁴
   * Asumiendo radio estelar solar constante para el experimento termodinámico.
   */
  public static calculateRelativeLuminosity(starTempK: number): number {
    const tempRatio = starTempK / ThermodynamicsEngine.BASE_SUN_TEMP_K;
    return Math.pow(tempRatio, 4);
  }

  public static luminosityForStar(star: StellarBody): number {
    if (Number.isFinite(star.luminositySolar) && star.luminositySolar > 0) return star.luminositySolar;
    const radiusRatio = star.radiusM / SI.SOLAR_RADIUS_M;
    const temperatureRatio = star.effectiveTemperatureK / 5772;
    return radiusRatio * radiusRatio * Math.pow(temperatureRatio, 4);
  }

  /** Kopparapu et al. polynomial effective flux for a one Earth-mass planet. */
  public static calculateSpectralHabitableZone(star: StellarBody): { innerM: number; outerM: number } {
    const t = Math.max(-3200, Math.min(2800, star.effectiveTemperatureK - 5780));
    const effectiveFlux = (coefficients: [number, number, number, number, number]): number => {
      const [seff, a, b, c, d] = coefficients;
      return seff + a * t + b * t ** 2 + c * t ** 3 + d * t ** 4;
    };
    const runawayGreenhouse = effectiveFlux([1.107, 1.332e-4, 1.58e-8, -8.308e-12, -1.931e-15]);
    const maximumGreenhouse = effectiveFlux([0.356, 6.171e-5, 1.698e-9, -3.198e-12, -5.575e-16]);
    const luminosity = this.luminosityForStar(star);
    return {
      innerM: Math.sqrt(luminosity / runawayGreenhouse) * SI.AU_M,
      outerM: Math.sqrt(luminosity / maximumGreenhouse) * SI.AU_M
    };
  }

  public static evaluateScientificPlanet(star: StellarBody, planet: OrbitalBody, distanceM: number): ScientificClimateResult {
    const luminositySolar = this.luminosityForStar(star);
    const distanceAU = distanceM / SI.AU_M;
    const irradianceWm2 = distanceAU <= 0 ? 0 : (1361 * luminositySolar) / (distanceAU * distanceAU);
    const albedo = planet.albedoBond ?? 0.3;
    const equilibriumTemperatureK = this.calculateEquilibriumTemp(irradianceWm2, albedo);
    const greenhouseContributionK = planet.atmosphereGreenhouseK ?? 0;
    const hz = this.calculateSpectralHabitableZone(star);
    const modelUncertaintyK = planet.atmosphereGreenhouseK == null ? 50 : Math.max(10, Math.abs(greenhouseContributionK) * 0.25);
    return {
      luminositySolar,
      irradianceWm2,
      equilibriumTemperatureK,
      estimatedSurfaceTemperatureK: equilibriumTemperatureK + greenhouseContributionK,
      greenhouseContributionK,
      conservativeInnerM: hz.innerM,
      conservativeOuterM: hz.outerM,
      modelUncertaintyK,
      note: 'Estimación radiativa 1-D; no sustituye un modelo climático con circulación, nubes y química atmosférica.'
    };
  }

  /**
   * Calcula los límites de la Zona de Habitabilidad (Goldilocks Zone) según el modelo Kopparapu et al.
   */
  public static calculateHabitableZone(starTempK: number): HabitableZoneLimits {
    const relLum = ThermodynamicsEngine.calculateRelativeLuminosity(starTempK);
    const sqrtL = Math.sqrt(relLum);

    return {
      relativeLuminosity: relLum,
      conservativeInnerAU: 0.95 * sqrtL,
      conservativeOuterAU: 1.68 * sqrtL,
      optimisticInnerAU: 0.75 * sqrtL,
      optimisticOuterAU: 1.77 * sqrtL
    };
  }

  /**
   * Calcula la irradiancia solar incidente en un planeta a una distancia d (en UA)
   * S = (S0 / d²) * (T / T0)⁴
   */
  public static calculateIrradiance(distanceAU: number, starTempK: number): number {
    if (distanceAU <= 0) return 0;
    const relLum = ThermodynamicsEngine.calculateRelativeLuminosity(starTempK);
    return (ThermodynamicsEngine.SOLAR_CONSTANT_EARTH / (distanceAU * distanceAU)) * relLum;
  }

  /**
   * Calcula la temperatura de equilibrio de cuerpo negro de un planeta:
   * Teq = [ S * (1 - A) / (4 * sigma) ]^(1/4)
   */
  public static calculateEquilibriumTemp(irradianceWm2: number, albedoBond: number): number {
    const absorbedFlux = irradianceWm2 * (1.0 - albedoBond);
    if (absorbedFlux <= 0) return 3; // Fondo cósmico de microondas 3K
    const teq4 = absorbedFlux / (4 * ThermodynamicsEngine.STEFAN_BOLTZMANN);
    return Math.pow(teq4, 0.25);
  }

  /**
   * Calcula el estado termodinámico completo de un planeta dado su estado orbital y la temperatura solar.
   */
  public static evaluatePlanet(
    planet: PlanetData,
    currentDistanceAU: number,
    starTempK: number
  ): PlanetThermodynamicsResult {
    const irradiance = ThermodynamicsEngine.calculateIrradiance(currentDistanceAU, starTempK);
    const irradianceEarthRatio = irradiance / ThermodynamicsEngine.SOLAR_CONSTANT_EARTH;
    const teqK = ThermodynamicsEngine.calculateEquilibriumTemp(irradiance, planet.albedoBond);

    // Modulación del efecto invernadero en función de la irradiancia incidente y la densidad atmosférica
    // Delta_T_eff = Delta_T_base * (S / S0)^0.25
    const fluxScaling = Math.pow(Math.max(0.01, irradianceEarthRatio), 0.25);
    const greenhouseEffect = planet.atmosphere.greenhouseEffectDeltaK * fluxScaling;
    const tsurfK = teqK + greenhouseEffect;

    const hz = ThermodynamicsEngine.calculateHabitableZone(starTempK);

    let habitabilityStatus: 'too_hot' | 'habitable' | 'optimistic_habitable' | 'too_cold';
    let statusLabel: string;

    if (currentDistanceAU < hz.optimisticInnerAU) {
      habitabilityStatus = 'too_hot';
      statusLabel = 'Zona Hipercaliente (Invernadero Desbocado)';
    } else if (currentDistanceAU >= hz.conservativeInnerAU && currentDistanceAU <= hz.conservativeOuterAU) {
      habitabilityStatus = 'habitable';
      statusLabel = 'Zona de Habitabilidad Óptima (Agua Líquida)';
    } else if (
      (currentDistanceAU >= hz.optimisticInnerAU && currentDistanceAU < hz.conservativeInnerAU) ||
      (currentDistanceAU > hz.conservativeOuterAU && currentDistanceAU <= hz.optimisticOuterAU)
    ) {
      habitabilityStatus = 'optimistic_habitable';
      statusLabel = 'Zona de Habitabilidad Marginal / Optimista';
    } else {
      habitabilityStatus = 'too_cold';
      statusLabel = 'Zona Glacial / Exterior (Hielo Permanente)';
    }

    return {
      planetId: planet.id,
      planetName: planet.name,
      distanceAU: currentDistanceAU,
      solarIrradianceWm2: irradiance,
      solarIrradianceEarthRatio: irradianceEarthRatio,
      equilibriumTempK: teqK,
      equilibriumTempC: teqK - 273.15,
      surfaceTempEstimatedK: tsurfK,
      surfaceTempEstimatedC: tsurfK - 273.15,
      greenhouseContributionK: greenhouseEffect,
      habitabilityStatus,
      statusLabel
    };
  }

  /**
   * Retorna el color espectral RGB aproximado de una estrella en función de su temperatura superficial (Kelvin).
   * Basado en la curva de Planck para emisión de cuerpo negro.
   */
  public static getStarColorFromTemp(tempK: number): { hex: string; r: number; g: number; b: number } {
    const t = tempK / 100;
    let r: number, g: number, b: number;

    // Rojo
    if (t <= 66) {
      r = 255;
    } else {
      r = t - 60;
      r = 329.698727446 * Math.pow(r, -0.1332047592);
      if (r < 0) r = 0;
      if (r > 255) r = 255;
    }

    // Verde
    if (t <= 66) {
      g = t;
      g = 99.4708025861 * Math.log(g) - 161.1195681661;
      if (g < 0) g = 0;
      if (g > 255) g = 255;
    } else {
      g = t - 60;
      g = 288.1221695283 * Math.pow(g, -0.0755148492);
      if (g < 0) g = 0;
      if (g > 255) g = 255;
    }

    // Azul
    if (t >= 66) {
      b = 255;
    } else if (t <= 19) {
      b = 0;
    } else {
      b = t - 10;
      b = 138.5177312231 * Math.log(b) - 305.0447927307;
      if (b < 0) b = 0;
      if (b > 255) b = 255;
    }

    const toHex = (n: number) => Math.round(n).toString(16).padStart(2, '0');
    const hex = `#${toHex(r)}${toHex(g)}${toHex(b)}`;

    return { hex, r: r / 255, g: g / 255, b: b / 255 };
  }
}
