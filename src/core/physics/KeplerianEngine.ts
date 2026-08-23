import * as THREE from 'three';
import { KeplerianElements } from '../../data/planets.data';

export interface OrbitalPosition3D {
  positionAU: THREE.Vector3;     // Coordenadas cartesianas en UA (x, y, z heliocéntrico)
  positionScene: THREE.Vector3;  // Coordenadas escaladas para renderizado 3D en la escena
  distanceAU: number;            // Distancia radial al Sol en UA
  trueAnomalyRad: number;        // Anomalía verdadera (rad)
  eccentricAnomalyRad: number;   // Anomalía excéntrica (rad)
  orbitalVelocityKms: number;    // Velocidad orbital instantánea aproximada (km/s)
}

export class KeplerianEngine {
  private static readonly DEG2RAD = Math.PI / 180;
  private static readonly TWO_PI = Math.PI * 2;
  private static readonly AU_KM = 149597870.7; // 1 UA en km
  private static readonly GM_SUN = 1.32712440018e11; // km³/s²

  /**
   * Escala de compresión de distancia radial para visualización didáctica 3D.
   * Utiliza una escala exponencial suave (d^0.65) para que los planetas exteriores
   * (Júpiter a Neptuno) sean visibles sin dejar los planetas interiores invisibles.
   */
  public static scaleAUToScene(distanceAU: number): number {
    return 15.0 * Math.pow(distanceAU, 0.62);
  }

  /**
   * Calcula la posición 3D exacta de un cuerpo celeste en base a sus elementos orbitales J2000.
   */
  public static calculatePosition(el: KeplerianElements, daysSinceJ2000: number): OrbitalPosition3D {
    // 1. Longitud media y Anomalía Media (M)
    const n = (360.0 / el.T); // Movimiento medio en grados/día
    const L = el.L0 + n * daysSinceJ2000;
    const perihelionLong = el.Omega + el.w;
    let Mdeg = (L - perihelionLong) % 360.0;
    if (Mdeg < 0) Mdeg += 360.0;
    let M = Mdeg * KeplerianEngine.DEG2RAD;

    // 2. Resolver ecuación de Kepler: E - e*sin(E) = M usando Newton-Raphson
    const e = el.e;
    let E = e < 0.8 ? M : Math.PI;
    for (let iter = 0; iter < 15; iter++) {
      const f = E - e * Math.sin(E) - M;
      const fPrime = 1 - e * Math.cos(E);
      const delta = f / fPrime;
      E -= delta;
      if (Math.abs(delta) < 1e-7) break;
    }

    // 3. Anomalía Verdadera (nu) y Distancia Radial (r en UA)
    const sinHalfE = Math.sin(E / 2);
    const cosHalfE = Math.cos(E / 2);
    const nu = 2 * Math.atan2(
      Math.sqrt(1 + e) * sinHalfE,
      Math.sqrt(1 - e) * cosHalfE
    );
    const rAU = el.a * (1 - e * Math.cos(E));

    // 4. Posición en el plano orbital
    const xOrb = rAU * Math.cos(nu);
    const yOrb = rAU * Math.sin(nu);

    // 5. Rotación 3D al plano heliocéntrico de la eclíptica
    // Conversión de ángulos a radianes
    const inc = el.i * KeplerianEngine.DEG2RAD;
    const node = el.Omega * KeplerianEngine.DEG2RAD;
    const argPeri = el.w * KeplerianEngine.DEG2RAD;

    // Elementos de la matriz de rotación P-Q-W a Eclíptica
    const cosNode = Math.cos(node);
    const sinNode = Math.sin(node);
    const cosInc = Math.cos(inc);
    const sinInc = Math.sin(inc);
    const cosArg = Math.cos(argPeri);
    const sinArg = Math.sin(argPeri);

    const Px = cosNode * cosArg - sinNode * sinArg * cosInc;
    const Py = sinNode * cosArg + cosNode * sinArg * cosInc;
    const Pz = sinArg * sinInc;

    const Qx = -cosNode * sinArg - sinNode * cosArg * cosInc;
    const Qy = -sinNode * sinArg + cosNode * cosArg * cosInc;
    const Qz = cosArg * sinInc;

    // Coordenadas astronómicas reales en UA (plano XZ como plano orbital principal de Three.js)
    const helioX = xOrb * Px + yOrb * Qx;
    const helioY = xOrb * Pz + yOrb * Qz; // Inclinación en Y
    const helioZ = xOrb * Py + yOrb * Qy;

    const positionAU = new THREE.Vector3(helioX, helioY, helioZ);

    // Posición escalada en la escena 3D
    const scaledR = KeplerianEngine.scaleAUToScene(rAU);
    const direction = positionAU.clone().normalize();
    const positionScene = direction.multiplyScalar(scaledR);

    // Velocidad orbital instantánea: v = sqrt(GM * (2/r - 1/a))
    const rKm = rAU * KeplerianEngine.AU_KM;
    const aKm = el.a * KeplerianEngine.AU_KM;
    const vKms = Math.sqrt(KeplerianEngine.GM_SUN * (2 / rKm - 1 / aKm));

    return {
      positionAU,
      positionScene,
      distanceAU: rAU,
      trueAnomalyRad: nu,
      eccentricAnomalyRad: E,
      orbitalVelocityKms: vKms
    };
  }

  /**
   * Genera los puntos de la elipse orbital 3D completa para dibujar la trayectoria.
   */
  public static generateOrbitPathPoints(el: KeplerianElements, segments: number = 180): THREE.Vector3[] {
    const points: THREE.Vector3[] = [];
    const inc = el.i * KeplerianEngine.DEG2RAD;
    const node = el.Omega * KeplerianEngine.DEG2RAD;
    const argPeri = el.w * KeplerianEngine.DEG2RAD;

    const cosNode = Math.cos(node);
    const sinNode = Math.sin(node);
    const cosInc = Math.cos(inc);
    const sinInc = Math.sin(inc);
    const cosArg = Math.cos(argPeri);
    const sinArg = Math.sin(argPeri);

    const Px = cosNode * cosArg - sinNode * sinArg * cosInc;
    const Py = sinNode * cosArg + cosNode * sinArg * cosInc;
    const Pz = sinArg * sinInc;

    const Qx = -cosNode * sinArg - sinNode * cosArg * cosInc;
    const Qy = -sinNode * sinArg + cosNode * cosArg * cosInc;
    const Qz = cosArg * sinInc;

    for (let i = 0; i <= segments; i++) {
      const nu = (i / segments) * KeplerianEngine.TWO_PI;
      const rAU = (el.a * (1 - el.e * el.e)) / (1 + el.e * Math.cos(nu));
      const xOrb = rAU * Math.cos(nu);
      const yOrb = rAU * Math.sin(nu);

      const helioX = xOrb * Px + yOrb * Qx;
      const helioY = xOrb * Pz + yOrb * Qz;
      const helioZ = xOrb * Py + yOrb * Qy;

      const vecAU = new THREE.Vector3(helioX, helioY, helioZ);
      const scaledR = KeplerianEngine.scaleAUToScene(rAU);
      const scenePoint = vecAU.normalize().multiplyScalar(scaledR);

      points.push(scenePoint);
    }

    return points;
  }
}
