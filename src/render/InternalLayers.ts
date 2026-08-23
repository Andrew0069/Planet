import * as THREE from 'three';
import { PlanetData } from '../data/planets.data';
import { GeologyEngine, ProcessedLayer3D } from '../core/geology/GeologyEngine';

export class InternalLayers {
  public mesh: THREE.Group;
  private layerMeshes: THREE.Mesh[] = [];
  private planetData: PlanetData;
  private sceneRadius: number;

  constructor(planetData: PlanetData, sceneRadius: number) {
    this.planetData = planetData;
    this.sceneRadius = sceneRadius;
    this.mesh = new THREE.Group();
    this.mesh.visible = false;

    this.buildLayers();
  }

  private buildLayers(): void {
    const processed: ProcessedLayer3D[] = GeologyEngine.computeLayerFractions(this.planetData);

    processed.forEach((item, index) => {
      const outerR = item.outerRadiusNormalized * this.sceneRadius;

      const geo = new THREE.SphereGeometry(
        outerR,
        48,
        48,
        0,
        Math.PI * 1.5,
        0,
        Math.PI
      );

      const color = new THREE.Color(item.layer.colorHex);
      const mat = new THREE.MeshStandardMaterial({
        color: color,
        roughness: 0.7,
        metalness: index === processed.length - 1 ? 0.8 : 0.2,
        emissive: index === processed.length - 1 ? color.clone().multiplyScalar(0.2) : new THREE.Color(0x000000),
        side: THREE.DoubleSide
      });

      const layerMesh = new THREE.Mesh(geo, mat);
      this.layerMeshes.push(layerMesh);
      this.mesh.add(layerMesh);
    });
  }

  public setVisible(visible: boolean): void {
    this.mesh.visible = visible;
  }

  public getVisible(): boolean {
    return this.mesh.visible;
  }
}
