export type EvidenceKind = 'observed' | 'derived' | 'simulated' | 'assumed' | 'visual';

export interface ObservationMetadata {
  evidence: EvidenceKind;
  source: string;
  sourceUrl?: string;
  accessedAt: string;
  uncertainty?: number;
  uncertaintyUnit?: string;
  note?: string;
}

export interface Vector3SI {
  x: number;
  y: number;
  z: number;
}

export interface StateVector {
  positionM: Vector3SI;
  velocityMps: Vector3SI;
}

export interface StellarBody {
  id: string;
  name: string;
  massKg: number;
  radiusM: number;
  effectiveTemperatureK: number;
  luminositySolar: number;
  spectralClass: string;
  ageGyr?: number;
  activity: 'low' | 'moderate' | 'high' | 'unknown';
  colorHex: string;
  metadata: ObservationMetadata;
}

export interface OrbitalElementsSI {
  semiMajorAxisM: number;
  eccentricity: number;
  inclinationRad: number;
  ascendingNodeRad: number;
  argumentOfPeriapsisRad: number;
  meanAnomalyAtEpochRad: number;
  epochJulianDate: number;
  periodSeconds?: number;
}

export interface OrbitalBody {
  id: string;
  name: string;
  kind: 'planet' | 'dwarf' | 'moon' | 'test-particle';
  massKg: number;
  radiusM: number;
  colorHex: string;
  albedoBond?: number;
  rotationPeriodSeconds?: number;
  atmosphereGreenhouseK?: number;
  elements: OrbitalElementsSI;
  state?: StateVector;
  discoveryMethod?: string;
  equilibriumTemperatureK?: number;
  metadata: ObservationMetadata;
}

export interface SystemDefinition {
  id: string;
  name: string;
  distanceLightYears?: number;
  description: string;
  star: StellarBody;
  bodies: OrbitalBody[];
  metadata: ObservationMetadata;
  immutable: boolean;
}

export interface SimulationConfig {
  stepSeconds: number;
  softeningM: number;
  closeEncounterFactor: number;
  escapeRadiusM: number;
  diagnosticsEverySteps: number;
}

export interface SimulationMetrics {
  elapsedSeconds: number;
  relativeEnergyError: number;
  relativeAngularMomentumError: number;
  barycenterM: Vector3SI;
  totalEnergyJ: number;
  angularMomentumKgM2s: Vector3SI;
}

export interface SimulationEvent {
  type: 'collision' | 'close-encounter' | 'escape' | 'invalid-state';
  bodyIds: string[];
  message: string;
}

export interface SimulationSnapshot {
  sequence: number;
  states: Record<string, StateVector>;
  metrics: SimulationMetrics;
  events: SimulationEvent[];
  paused: boolean;
}

export interface PhysicsEngine {
  initialize(system: SystemDefinition, config?: Partial<SimulationConfig>): void;
  step(stepCount?: number): SimulationSnapshot;
  reset(): SimulationSnapshot;
  getSnapshot(): SimulationSnapshot;
}

export const SI = {
  G: 6.67430e-11,
  C: 299_792_458,
  AU_M: 149_597_870_700,
  DAY_S: 86_400,
  YEAR_S: 31_557_600,
  SOLAR_MASS_KG: 1.98847e30,
  SOLAR_RADIUS_M: 6.957e8,
  EARTH_MASS_KG: 5.9722e24,
  EARTH_RADIUS_M: 6.371e6,
  SOLAR_LUMINOSITY_W: 3.828e26
} as const;

export function evidenceLabel(kind: EvidenceKind): string {
  return ({
    observed: 'observada',
    derived: 'derivada',
    simulated: 'simulada',
    assumed: 'asumida',
    visual: 'solo visual'
  } as const)[kind];
}
