import * as THREE from 'three';
import { GeographicLandmark } from '../data/geography.data';
import { GeologyEngine } from '../core/geology/GeologyEngine';

export class GeographyPins {
  public mesh: THREE.Group;
  public pinHitboxes: THREE.Mesh[] = [];
  private landmarks: GeographicLandmark[];
  private planetRadiusScene: number;

  constructor(landmarks: GeographicLandmark[], planetRadiusScene: number) {
    this.mesh = new THREE.Group();
    this.landmarks = landmarks;
    this.planetRadiusScene = planetRadiusScene;
    this.mesh.visible = true;

    this.createPins();
  }

  private createPins(): void {
    const pinHeadGeo = new THREE.SphereGeometry(0.04 * this.planetRadiusScene, 16, 16);
    const hitboxGeo = new THREE.SphereGeometry(0.12 * this.planetRadiusScene, 16, 16);

    this.landmarks.forEach((lm) => {
      const pos = GeologyEngine.latLonToVector3(lm.latDeg, lm.lonDeg, this.planetRadiusScene * 1.02);

      const pinGroup = new THREE.Group();
      pinGroup.position.copy(pos);

      // Color según categoría
      let pinColor = 0x4da3ff;
      if (lm.category === 'volcano') pinColor = 0xff4422;
      else if (lm.category === 'canyon' || lm.category === 'trench') pinColor = 0xffaa00;
      else if (lm.category === 'crater') pinColor = 0xdddddd;
      else if (lm.category === 'mountain') pinColor = 0x55ee99;
      else if (lm.category === 'storm') pinColor = 0xff66bb;

      // 1. Cabeza brillante del pin
      const pinHeadMat = new THREE.MeshBasicMaterial({
        color: pinColor
      });
      const pinHead = new THREE.Mesh(pinHeadGeo, pinHeadMat);
      pinGroup.add(pinHead);

      // 2. Halo pulsante
      const haloGeo = new THREE.RingGeometry(0.03 * this.planetRadiusScene, 0.07 * this.planetRadiusScene, 24);
      const haloMat = new THREE.MeshBasicMaterial({
        color: pinColor,
        transparent: true,
        opacity: 0.7,
        side: THREE.DoubleSide
      });
      const halo = new THREE.Mesh(haloGeo, haloMat);
      halo.lookAt(pos.clone().multiplyScalar(2));
      pinGroup.add(halo);

      // 3. Hitbox invisible para raycasting
      const hitboxMat = new THREE.MeshBasicMaterial({ visible: false });
      const hitbox = new THREE.Mesh(hitboxGeo, hitboxMat);
      hitbox.userData = { landmark: lm };
      pinGroup.add(hitbox);
      this.pinHitboxes.push(hitbox);

      this.mesh.add(pinGroup);
    });
  }

  public setVisible(visible: boolean): void {
    this.mesh.visible = visible;
  }

  public getVisible(): boolean {
    return this.mesh.visible;
  }
}
