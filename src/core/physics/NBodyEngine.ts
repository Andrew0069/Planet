import {
  OrbitalBody,
  PhysicsEngine,
  SI,
  SimulationConfig,
  SimulationEvent,
  SimulationMetrics,
  SimulationSnapshot,
  StateVector,
  SystemDefinition,
  Vector3SI
} from '../scientific.types';

interface Particle {
  id: string;
  name: string;
  massKg: number;
  radiusM: number;
  position: Float64Array;
  velocity: Float64Array;
  initialPosition: Float64Array;
  initialVelocity: Float64Array;
  escaped: boolean;
}

const DEFAULT_CONFIG: SimulationConfig = {
  stepSeconds: SI.DAY_S / 48,
  softeningM: 1_000,
  closeEncounterFactor: 3,
  escapeRadiusM: 1_000 * SI.AU_M,
  diagnosticsEverySteps: 1
};

export class NBodyEngine implements PhysicsEngine {
  private particles: Particle[] = [];
  private config: SimulationConfig = { ...DEFAULT_CONFIG };
  private initialEnergy = 0;
  private initialAngularMagnitude = 0;
  private elapsedSeconds = 0;
  private sequence = 0;
  private paused = true;
  private lastEvents: SimulationEvent[] = [];

  public initialize(system: SystemDefinition, config: Partial<SimulationConfig> = {}): void {
    const recommended = recommendedStepSeconds(system);
    this.config = { ...DEFAULT_CONFIG, stepSeconds: recommended, ...config };
    validateConfig(this.config);
    this.particles = buildParticles(system);
    this.elapsedSeconds = 0;
    this.sequence = 0;
    this.paused = false;
    this.lastEvents = [];
    const metrics = this.calculateMetrics();
    this.initialEnergy = metrics.totalEnergyJ;
    this.initialAngularMagnitude = magnitude(metrics.angularMomentumKgM2s);
  }

  public step(stepCount = 1): SimulationSnapshot {
    if (this.particles.length === 0) throw new Error('El motor N-cuerpos no está inicializado.');
    if (this.paused) return this.getSnapshot();
    const count = Math.max(1, Math.min(50_000, Math.floor(stepCount)));
    this.lastEvents = [];
    for (let step = 0; step < count && !this.paused; step += 1) {
      this.leapfrog(this.config.stepSeconds);
      this.elapsedSeconds += this.config.stepSeconds;
      this.sequence += 1;
      const events = this.detectEvents();
      this.lastEvents.push(...events);
      if (events.some((event) => event.type === 'collision' || event.type === 'close-encounter' || event.type === 'invalid-state')) {
        this.paused = true;
      }
    }
    return this.getSnapshot();
  }

  public reset(): SimulationSnapshot {
    for (const particle of this.particles) {
      particle.position.set(particle.initialPosition);
      particle.velocity.set(particle.initialVelocity);
      particle.escaped = false;
    }
    this.elapsedSeconds = 0;
    this.sequence = 0;
    this.paused = true;
    this.lastEvents = [];
    return this.getSnapshot();
  }

  public getSnapshot(): SimulationSnapshot {
    const states: Record<string, StateVector> = {};
    for (const particle of this.particles) {
      states[particle.id] = {
        positionM: arrayToVector(particle.position),
        velocityMps: arrayToVector(particle.velocity)
      };
    }
    return {
      sequence: this.sequence,
      states,
      metrics: this.calculateMetrics(),
      events: [...this.lastEvents],
      paused: this.paused
    };
  }

  public setPaused(paused: boolean): void {
    this.paused = paused;
  }

  public updateMass(bodyId: string, massKg: number): void {
    if (!Number.isFinite(massKg) || massKg <= 0) throw new Error('La masa debe ser positiva y finita.');
    const particle = this.particles.find((item) => item.id === bodyId);
    if (!particle) throw new Error(`No existe el cuerpo ${bodyId}.`);
    particle.massKg = massKg;
  }

  public rebalanceCircularOrbits(centralBodyId: string): void {
    const central = this.particles.find((item) => item.id === centralBodyId);
    if (!central) throw new Error('No se encontró el cuerpo central.');
    for (const body of this.particles) {
      if (body === central) continue;
      const dx = body.position[0] - central.position[0];
      const dy = body.position[1] - central.position[1];
      const dz = body.position[2] - central.position[2];
      const r = Math.hypot(dx, dy, dz);
      if (r === 0) continue;
      let tx = -dz / r;
      let ty = 0;
      let tz = dx / r;
      if (Math.hypot(tx, tz) < 1e-12) {
        tx = 0;
        ty = 1;
        tz = 0;
      }
      const speed = Math.sqrt((SI.G * (central.massKg + body.massKg)) / r);
      body.velocity[0] = central.velocity[0] + tx * speed;
      body.velocity[1] = central.velocity[1] + ty * speed;
      body.velocity[2] = central.velocity[2] + tz * speed;
    }
    recenter(this.particles);
  }

  private leapfrog(dt: number): void {
    const acceleration = accelerations(this.particles, this.config.softeningM);
    for (let i = 0; i < this.particles.length; i += 1) {
      const particle = this.particles[i];
      for (let axis = 0; axis < 3; axis += 1) {
        particle.velocity[axis] += acceleration[i][axis] * dt * 0.5;
        particle.position[axis] += particle.velocity[axis] * dt;
      }
    }
    const nextAcceleration = accelerations(this.particles, this.config.softeningM);
    for (let i = 0; i < this.particles.length; i += 1) {
      const particle = this.particles[i];
      for (let axis = 0; axis < 3; axis += 1) particle.velocity[axis] += nextAcceleration[i][axis] * dt * 0.5;
    }
  }

  private detectEvents(): SimulationEvent[] {
    const events: SimulationEvent[] = [];
    for (let i = 0; i < this.particles.length; i += 1) {
      const a = this.particles[i];
      if (![...a.position, ...a.velocity].every(Number.isFinite)) {
        events.push({ type: 'invalid-state', bodyIds: [a.id], message: `Estado numérico inválido en ${a.name}.` });
      }
      const radialDistance = Math.hypot(...a.position);
      if (!a.escaped && radialDistance > this.config.escapeRadiusM) {
        a.escaped = true;
        events.push({ type: 'escape', bodyIds: [a.id], message: `${a.name} superó el límite espacial del experimento.` });
      }
      for (let j = i + 1; j < this.particles.length; j += 1) {
        const b = this.particles[j];
        const distance = Math.hypot(
          a.position[0] - b.position[0],
          a.position[1] - b.position[1],
          a.position[2] - b.position[2]
        );
        const contact = a.radiusM + b.radiusM;
        if (distance <= contact) {
          events.push({ type: 'collision', bodyIds: [a.id, b.id], message: `Colisión detectada entre ${a.name} y ${b.name}; simulación pausada.` });
        } else if (distance <= contact * this.config.closeEncounterFactor) {
          events.push({ type: 'close-encounter', bodyIds: [a.id, b.id], message: `Encuentro cercano entre ${a.name} y ${b.name}; reduzca el paso temporal.` });
        }
      }
    }
    return events;
  }

  private calculateMetrics(): SimulationMetrics {
    let kinetic = 0;
    let potential = 0;
    let totalMass = 0;
    const barycenter = new Float64Array(3);
    const angular = new Float64Array(3);
    for (let i = 0; i < this.particles.length; i += 1) {
      const a = this.particles[i];
      totalMass += a.massKg;
      kinetic += 0.5 * a.massKg * squaredMagnitude(a.velocity);
      for (let axis = 0; axis < 3; axis += 1) barycenter[axis] += a.massKg * a.position[axis];
      angular[0] += a.massKg * (a.position[1] * a.velocity[2] - a.position[2] * a.velocity[1]);
      angular[1] += a.massKg * (a.position[2] * a.velocity[0] - a.position[0] * a.velocity[2]);
      angular[2] += a.massKg * (a.position[0] * a.velocity[1] - a.position[1] * a.velocity[0]);
      for (let j = i + 1; j < this.particles.length; j += 1) {
        const b = this.particles[j];
        const distance = Math.hypot(
          a.position[0] - b.position[0],
          a.position[1] - b.position[1],
          a.position[2] - b.position[2]
        );
        if (distance > 0) potential -= (SI.G * a.massKg * b.massKg) / distance;
      }
    }
    if (totalMass > 0) for (let axis = 0; axis < 3; axis += 1) barycenter[axis] /= totalMass;
    const energy = kinetic + potential;
    const angularMagnitude = Math.hypot(...angular);
    return {
      elapsedSeconds: this.elapsedSeconds,
      relativeEnergyError: this.initialEnergy === 0 ? 0 : Math.abs((energy - this.initialEnergy) / this.initialEnergy),
      relativeAngularMomentumError: this.initialAngularMagnitude === 0 ? 0 : Math.abs((angularMagnitude - this.initialAngularMagnitude) / this.initialAngularMagnitude),
      barycenterM: arrayToVector(barycenter),
      totalEnergyJ: energy,
      angularMomentumKgM2s: arrayToVector(angular)
    };
  }
}

export function recommendedStepSeconds(system: SystemDefinition): number {
  const periods = system.bodies.map((body) => body.elements.periodSeconds).filter((value): value is number => value != null && value > 0);
  return periods.length === 0 ? SI.DAY_S / 48 : Math.min(...periods) / 1000;
}

export function elementsToState(body: OrbitalBody, centralMassKg: number): StateVector {
  const el = body.elements;
  if (!(el.semiMajorAxisM > 0) || !(el.eccentricity >= 0 && el.eccentricity < 1)) throw new Error(`Órbita inválida para ${body.name}.`);
  let eccentricAnomaly = el.meanAnomalyAtEpochRad;
  for (let i = 0; i < 20; i += 1) {
    const delta = (eccentricAnomaly - el.eccentricity * Math.sin(eccentricAnomaly) - el.meanAnomalyAtEpochRad) /
      (1 - el.eccentricity * Math.cos(eccentricAnomaly));
    eccentricAnomaly -= delta;
    if (Math.abs(delta) < 1e-12) break;
  }
  const cosE = Math.cos(eccentricAnomaly);
  const sinE = Math.sin(eccentricAnomaly);
  const xOrb = el.semiMajorAxisM * (cosE - el.eccentricity);
  const yOrb = el.semiMajorAxisM * Math.sqrt(1 - el.eccentricity ** 2) * sinE;
  const meanMotion = Math.sqrt((SI.G * (centralMassKg + body.massKg)) / el.semiMajorAxisM ** 3);
  const vxOrb = (-el.semiMajorAxisM * meanMotion * sinE) / (1 - el.eccentricity * cosE);
  const vyOrb = (el.semiMajorAxisM * meanMotion * Math.sqrt(1 - el.eccentricity ** 2) * cosE) /
    (1 - el.eccentricity * cosE);
  const rotate = rotationMatrix(el.ascendingNodeRad, el.inclinationRad, el.argumentOfPeriapsisRad);
  return {
    positionM: multiplyMatrix(rotate, [xOrb, yOrb, 0]),
    velocityMps: multiplyMatrix(rotate, [vxOrb, vyOrb, 0])
  };
}

function buildParticles(system: SystemDefinition): Particle[] {
  const particles: Particle[] = [{
    id: system.star.id,
    name: system.star.name,
    massKg: system.star.massKg,
    radiusM: system.star.radiusM,
    position: new Float64Array(3),
    velocity: new Float64Array(3),
    initialPosition: new Float64Array(3),
    initialVelocity: new Float64Array(3),
    escaped: false
  }];
  for (const body of system.bodies) {
    const state = body.state ?? elementsToState(body, system.star.massKg);
    const position = new Float64Array([state.positionM.x, state.positionM.y, state.positionM.z]);
    const velocity = new Float64Array([state.velocityMps.x, state.velocityMps.y, state.velocityMps.z]);
    particles.push({
      id: body.id,
      name: body.name,
      massKg: body.massKg,
      radiusM: body.radiusM,
      position,
      velocity,
      initialPosition: new Float64Array(position),
      initialVelocity: new Float64Array(velocity),
      escaped: false
    });
  }
  recenter(particles);
  for (const particle of particles) {
    particle.initialPosition.set(particle.position);
    particle.initialVelocity.set(particle.velocity);
  }
  return particles;
}

function recenter(particles: Particle[]): void {
  const centerPosition = new Float64Array(3);
  const centerVelocity = new Float64Array(3);
  const totalMass = particles.reduce((sum, particle) => sum + particle.massKg, 0);
  for (const particle of particles) {
    for (let axis = 0; axis < 3; axis += 1) {
      centerPosition[axis] += particle.position[axis] * particle.massKg;
      centerVelocity[axis] += particle.velocity[axis] * particle.massKg;
    }
  }
  for (const particle of particles) {
    for (let axis = 0; axis < 3; axis += 1) {
      particle.position[axis] -= centerPosition[axis] / totalMass;
      particle.velocity[axis] -= centerVelocity[axis] / totalMass;
    }
  }
}

function accelerations(particles: Particle[], softeningM: number): Float64Array[] {
  const result = particles.map(() => new Float64Array(3));
  const eps2 = softeningM ** 2;
  for (let i = 0; i < particles.length; i += 1) {
    for (let j = i + 1; j < particles.length; j += 1) {
      const dx = particles[j].position[0] - particles[i].position[0];
      const dy = particles[j].position[1] - particles[i].position[1];
      const dz = particles[j].position[2] - particles[i].position[2];
      const inverseR3 = 1 / Math.pow(dx * dx + dy * dy + dz * dz + eps2, 1.5);
      const ai = SI.G * particles[j].massKg * inverseR3;
      const aj = SI.G * particles[i].massKg * inverseR3;
      result[i][0] += dx * ai; result[i][1] += dy * ai; result[i][2] += dz * ai;
      result[j][0] -= dx * aj; result[j][1] -= dy * aj; result[j][2] -= dz * aj;
    }
  }
  return result;
}

function rotationMatrix(node: number, inclination: number, periapsis: number): number[][] {
  const cO = Math.cos(node), sO = Math.sin(node), ci = Math.cos(inclination), si = Math.sin(inclination), cw = Math.cos(periapsis), sw = Math.sin(periapsis);
  return [
    [cO * cw - sO * sw * ci, -cO * sw - sO * cw * ci, sO * si],
    [sO * cw + cO * sw * ci, -sO * sw + cO * cw * ci, -cO * si],
    [sw * si, cw * si, ci]
  ];
}

function multiplyMatrix(matrix: number[][], vector: number[]): Vector3SI {
  return {
    x: matrix[0][0] * vector[0] + matrix[0][1] * vector[1] + matrix[0][2] * vector[2],
    y: matrix[1][0] * vector[0] + matrix[1][1] * vector[1] + matrix[1][2] * vector[2],
    z: matrix[2][0] * vector[0] + matrix[2][1] * vector[1] + matrix[2][2] * vector[2]
  };
}

function validateConfig(config: SimulationConfig): void {
  if (!(config.stepSeconds > 0) || !Number.isFinite(config.stepSeconds)) throw new Error('Paso temporal inválido.');
  if (config.softeningM < 0 || !Number.isFinite(config.softeningM)) throw new Error('Suavizado gravitacional inválido.');
}

function squaredMagnitude(value: Float64Array): number {
  return value[0] ** 2 + value[1] ** 2 + value[2] ** 2;
}

function magnitude(value: Vector3SI): number {
  return Math.hypot(value.x, value.y, value.z);
}

function arrayToVector(value: Float64Array): Vector3SI {
  return { x: value[0], y: value[1], z: value[2] };
}
