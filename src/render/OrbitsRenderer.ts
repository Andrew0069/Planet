import * as THREE from 'three';
import { PlanetData } from '../data/planets.data';
import { KeplerianEngine } from '../core/physics/KeplerianEngine';

export class OrbitsRenderer {
  public group: THREE.Group;
  private orbitLines: Map<string, THREE.Line> = new Map();
  private isVisible: boolean = true;

  constructor(planets: PlanetData[]) {
    this.group = new THREE.Group();

    planets.forEach((planet) => {
      const points = KeplerianEngine.generateOrbitPathPoints(planet.elements, 240);
      const geometry = new THREE.BufferGeometry().setFromPoints(points);

      const color = new THREE.Color(planet.colorHex);
      const material = new THREE.LineBasicMaterial({
        color: color,
        transparent: true,
        opacity: 0.35,
        blending: THREE.AdditiveBlending
      });

      const line = new THREE.Line(geometry, material);
      this.orbitLines.set(planet.id, line);
      this.group.add(line);
    });
  }

  public setVisible(visible: boolean): void {
    this.isVisible = visible;
    this.group.visible = visible;
  }

  public getVisible(): boolean {
    return this.isVisible;
  }

  public highlightPlanetOrbit(planetId: string | null): void {
    this.orbitLines.forEach((line, id) => {
      const mat = line.material as THREE.LineBasicMaterial;
      if (planetId === null) {
        mat.opacity = 0.35;
      } else if (id === planetId) {
        mat.opacity = 0.9;
      } else {
        mat.opacity = 0.15;
      }
    });
  }
}
