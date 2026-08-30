import * as THREE from 'three';
import { ThermodynamicsEngine, HabitableZoneLimits } from '../core/thermodynamics/ThermodynamicsEngine';
import { KeplerianEngine } from '../core/physics/KeplerianEngine';

export class HabitableZone {
  public mesh: THREE.Group;
  private ringMesh: THREE.Mesh;
  private innerLine: THREE.LineLoop;
  private outerLine: THREE.LineLoop;

  constructor() {
    this.mesh = new THREE.Group();

    // 1. Geometría inicial del anillo (se regenera dinámicamente)
    const initialGeo = new THREE.RingGeometry(10, 25, 96);
    const ringMat = new THREE.MeshBasicMaterial({
      color: 0x22ee77,
      transparent: true,
      opacity: 0.18,
      side: THREE.DoubleSide,
      depthWrite: false,
      blending: THREE.AdditiveBlending
    });

    this.ringMesh = new THREE.Mesh(initialGeo, ringMat);
    this.ringMesh.rotation.x = Math.PI / 2; // Plano horizontal XZ
    this.mesh.add(this.ringMesh);

    // 2. Líneas delimitadoras de borde interno y externo
    const innerGeo = new THREE.BufferGeometry();
    const outerGeo = new THREE.BufferGeometry();
    const lineMat = new THREE.LineBasicMaterial({
      color: 0x44ff88,
      transparent: true,
      opacity: 0.45
    });

    this.innerLine = new THREE.LineLoop(innerGeo, lineMat);
    this.innerLine.rotation.x = Math.PI / 2;
    this.mesh.add(this.innerLine);

    this.outerLine = new THREE.LineLoop(outerGeo, lineMat);
    this.outerLine.rotation.x = Math.PI / 2;
    this.mesh.add(this.outerLine);

    this.updateForTemperature(5778);
  }

  public updateForTemperature(tempK: number): void {
    const limits: HabitableZoneLimits = ThermodynamicsEngine.calculateHabitableZone(tempK);

    const innerRadiusScene = KeplerianEngine.scaleAUToScene(limits.conservativeInnerAU);
    const outerRadiusScene = KeplerianEngine.scaleAUToScene(limits.conservativeOuterAU);

    // Regenerar geometría del anillo
    this.ringMesh.geometry.dispose();
    this.ringMesh.geometry = new THREE.RingGeometry(innerRadiusScene, outerRadiusScene, 120);

    // Actualizar líneas circulares delimitadoras
    this.updateCircleLine(this.innerLine, innerRadiusScene, 96);
    this.updateCircleLine(this.outerLine, outerRadiusScene, 96);
  }

  private updateCircleLine(line: THREE.LineLoop, radius: number, segments: number): void {
    const positions = new Float32Array(segments * 3);
    for (let i = 0; i < segments; i++) {
      const theta = (i / segments) * Math.PI * 2;
      positions[i * 3] = radius * Math.cos(theta);
      positions[i * 3 + 1] = radius * Math.sin(theta);
      positions[i * 3 + 2] = 0;
    }
    line.geometry.dispose();
    line.geometry = new THREE.BufferGeometry();
    line.geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  }

  public setVisible(visible: boolean): void {
    this.mesh.visible = visible;
  }
}
