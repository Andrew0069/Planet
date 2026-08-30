import { SI } from '../scientific.types';

export interface KerrParameters {
  massKg: number;
  spin: number;
  inclinationRad: number;
}

export interface KerrConstants {
  energy: number;
  axialAngularMomentum: number;
  carterConstant: number;
  particleMass: 0 | 1;
}

export interface KerrState {
  affine: number;
  t: number;
  r: number;
  theta: number;
  phi: number;
  radialSign: -1 | 1;
  polarSign: -1 | 1;
}

export interface KerrTrajectory {
  parameters: KerrParameters;
  constants: KerrConstants;
  points: KerrState[];
  captured: boolean;
  escaped: boolean;
  maxConstraintError: number;
}

export interface KerrGeometry {
  gravitationalRadiusM: number;
  horizonOuterRg: number;
  horizonInnerRg: number;
  ergosphereEquatorRg: number;
  iscoProgradeRg: number;
  iscoRetrogradeRg: number;
}

export class KerrEngine {
  public static geometry(parameters: KerrParameters): KerrGeometry {
    validateParameters(parameters);
    const a = parameters.spin;
    const root = Math.sqrt(1 - a * a);
    return {
      gravitationalRadiusM: (SI.G * parameters.massKg) / (SI.C * SI.C),
      horizonOuterRg: 1 + root,
      horizonInnerRg: 1 - root,
      ergosphereEquatorRg: 2,
      iscoProgradeRg: isco(a, true),
      iscoRetrogradeRg: isco(a, false)
    };
  }

  public static trace(
    parameters: KerrParameters,
    constants: KerrConstants,
    initial: KerrState,
    options: { maxSteps?: number; step?: number; escapeRadiusRg?: number } = {}
  ): KerrTrajectory {
    validateParameters(parameters);
    validateConstants(constants);
    const geometry = this.geometry(parameters);
    const maxSteps = options.maxSteps ?? 12_000;
    const baseStep = options.step ?? 0.015;
    const escapeRadius = options.escapeRadiusRg ?? 120;
    let state = { ...initial };
    const points: KerrState[] = [{ ...state }];
    let captured = false;
    let escaped = false;
    let maxConstraintError = 0;

    for (let index = 0; index < maxSteps; index += 1) {
      const derivative = this.derivatives(parameters.spin, constants, state);
      maxConstraintError = Math.max(maxConstraintError, derivative.constraintError);
      const safeScale = Math.max(0.05, Math.min(1, Math.abs(state.r - geometry.horizonOuterRg) / 2));
      const h = baseStep * safeScale;
      const next = rk4(state, h, (candidate) => this.derivatives(parameters.spin, constants, candidate));

      const nextPotential = potentials(parameters.spin, constants, next);
      if (nextPotential.radial < 0) {
        state.radialSign = state.radialSign === 1 ? -1 : 1;
        continue;
      }
      if (nextPotential.polar < 0) {
        state.polarSign = state.polarSign === 1 ? -1 : 1;
        continue;
      }
      state = next;
      if (index % 3 === 0) points.push({ ...state });
      if (state.r <= geometry.horizonOuterRg * 1.0005) {
        captured = true;
        break;
      }
      if (state.r >= escapeRadius && state.radialSign > 0) {
        escaped = true;
        break;
      }
      if (![state.r, state.theta, state.phi, state.t].every(Number.isFinite)) break;
    }
    return { parameters, constants, points, captured, escaped, maxConstraintError };
  }

  private static derivatives(spin: number, constants: KerrConstants, state: KerrState): Derivatives {
    const { radial, polar, delta, sigma, p } = potentials(spin, constants, state);
    const sinTheta = Math.max(1e-9, Math.sin(state.theta));
    const dr = state.radialSign * Math.sqrt(Math.max(0, radial)) / sigma;
    const dtheta = state.polarSign * Math.sqrt(Math.max(0, polar)) / sigma;
    const dphi = (-(spin * constants.energy - constants.axialAngularMomentum / (sinTheta * sinTheta)) + spin * p / delta) / sigma;
    const dt = (-spin * (spin * constants.energy * sinTheta * sinTheta - constants.axialAngularMomentum) + (state.r * state.r + spin * spin) * p / delta) / sigma;
    const normalizedRadial = radial === 0 ? 0 : Math.abs((sigma * dr) ** 2 - radial) / Math.max(1, Math.abs(radial));
    const normalizedPolar = polar === 0 ? 0 : Math.abs((sigma * dtheta) ** 2 - polar) / Math.max(1, Math.abs(polar));
    return { affine: 1, t: dt, r: dr, theta: dtheta, phi: dphi, constraintError: Math.max(normalizedRadial, normalizedPolar) };
  }
}

interface Derivatives {
  affine: number;
  t: number;
  r: number;
  theta: number;
  phi: number;
  constraintError: number;
}

function potentials(spin: number, constants: KerrConstants, state: KerrState): { radial: number; polar: number; delta: number; sigma: number; p: number } {
  const r2 = state.r * state.r;
  const a2 = spin * spin;
  const cosTheta = Math.cos(state.theta);
  const sinTheta = Math.max(1e-9, Math.sin(state.theta));
  const delta = Math.max(1e-9, r2 - 2 * state.r + a2);
  const sigma = r2 + a2 * cosTheta * cosTheta;
  const p = constants.energy * (r2 + a2) - spin * constants.axialAngularMomentum;
  const radial = p * p - delta * (
    constants.particleMass * constants.particleMass * r2 +
    (constants.axialAngularMomentum - spin * constants.energy) ** 2 +
    constants.carterConstant
  );
  const polar = constants.carterConstant - cosTheta * cosTheta * (
    a2 * (constants.particleMass * constants.particleMass - constants.energy * constants.energy) +
    constants.axialAngularMomentum ** 2 / (sinTheta * sinTheta)
  );
  return { radial, polar, delta, sigma, p };
}

function rk4(state: KerrState, h: number, derivative: (state: KerrState) => Derivatives): KerrState {
  const k1 = derivative(state);
  const k2 = derivative(add(state, k1, h / 2));
  const k3 = derivative(add(state, k2, h / 2));
  const k4 = derivative(add(state, k3, h));
  return {
    affine: state.affine + h,
    t: state.t + (h / 6) * (k1.t + 2 * k2.t + 2 * k3.t + k4.t),
    r: state.r + (h / 6) * (k1.r + 2 * k2.r + 2 * k3.r + k4.r),
    theta: clampTheta(state.theta + (h / 6) * (k1.theta + 2 * k2.theta + 2 * k3.theta + k4.theta)),
    phi: state.phi + (h / 6) * (k1.phi + 2 * k2.phi + 2 * k3.phi + k4.phi),
    radialSign: state.radialSign,
    polarSign: state.polarSign
  };
}

function add(state: KerrState, derivative: Derivatives, scale: number): KerrState {
  return {
    affine: state.affine + derivative.affine * scale,
    t: state.t + derivative.t * scale,
    r: state.r + derivative.r * scale,
    theta: clampTheta(state.theta + derivative.theta * scale),
    phi: state.phi + derivative.phi * scale,
    radialSign: state.radialSign,
    polarSign: state.polarSign
  };
}

function clampTheta(theta: number): number {
  return Math.max(1e-7, Math.min(Math.PI - 1e-7, theta));
}

function isco(spin: number, prograde: boolean): number {
  const z1 = 1 + Math.cbrt(1 - spin * spin) * (Math.cbrt(1 + spin) + Math.cbrt(1 - spin));
  const z2 = Math.sqrt(3 * spin * spin + z1 * z1);
  const term = Math.sqrt((3 - z1) * (3 + z1 + 2 * z2));
  return 3 + z2 + (prograde ? -1 : 1) * term;
}

function validateParameters(parameters: KerrParameters): void {
  if (!(parameters.massKg > 0) || !Number.isFinite(parameters.massKg)) throw new Error('La masa del agujero negro debe ser positiva.');
  if (!Number.isFinite(parameters.spin) || Math.abs(parameters.spin) >= 1) throw new Error('El espín de Kerr debe cumplir |a*| < 1.');
}

function validateConstants(constants: KerrConstants): void {
  if (![constants.energy, constants.axialAngularMomentum, constants.carterConstant].every(Number.isFinite)) throw new Error('Constantes de movimiento inválidas.');
  if (constants.carterConstant < 0) throw new Error('La constante de Carter debe ser no negativa en este laboratorio.');
}
