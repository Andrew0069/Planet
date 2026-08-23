import * as THREE from 'three';
import { PlanetData, GeologicalLayer } from '../../data/planets.data';

export interface ProcessedLayer3D {
  layer: GeologicalLayer;
  innerRadiusNormalized: number;
  outerRadiusNormalized: number;
  volumeFraction: number;
}

export class GeologyEngine {
  private static readonly DEG2RAD = Math.PI / 180;

  /**
   * Convierte coordenadas geográficas esféricas (latitud [-90..90], longitud [-180..180])
   * a un vector cartesiano 3D sobre una esfera de radio R.
   * Sistema de coordenadas: +Y hacia el polo norte, +Z hacia meridiano 0°, +X hacia longitud 90° Este.
   */
  public static latLonToVector3(latDeg: number, lonDeg: number, radius: number): THREE.Vector3 {
    const latRad = latDeg * GeologyEngine.DEG2RAD;
    const lonRad = lonDeg * GeologyEngine.DEG2RAD;

    const x = radius * Math.cos(latRad) * Math.sin(lonRad);
    const y = radius * Math.sin(latRad);
    const z = radius * Math.cos(latRad) * Math.cos(lonRad);

    return new THREE.Vector3(x, y, z);
  }

  /**
   * Calcula las fracciones de volumen y radios normalizados de cada capa geológica.
   */
  public static computeLayerFractions(planet: PlanetData): ProcessedLayer3D[] {
    const totalRadiusKm = planet.radiusKm;
    const layers = planet.geology.layers;
    const result: ProcessedLayer3D[] = [];

    const totalVolume = (4 / 3) * Math.PI * Math.pow(totalRadiusKm, 3);

    for (const layer of layers) {
      const topDepth = layer.depthKm[0];
      const bottomDepth = layer.depthKm[1];

      const outerR = Math.max(0, totalRadiusKm - topDepth);
      const innerR = Math.max(0, totalRadiusKm - bottomDepth);

      const outerNorm = outerR / totalRadiusKm;
      const innerNorm = innerR / totalRadiusKm;

      const layerVolume = (4 / 3) * Math.PI * (Math.pow(outerR, 3) - Math.pow(innerR, 3));
      const volumeFraction = layerVolume / totalVolume;

      result.push({
        layer,
        innerRadiusNormalized: innerNorm,
        outerRadiusNormalized: outerNorm,
        volumeFraction
      });
    }

    return result;
  }
}
