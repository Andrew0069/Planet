import * as THREE from 'three';

/**
 * Estrellas fugaces ocasionales: trazados lineales aditivos que cruzan la
 * bóveda celeste con desvanecimiento, sin coste perceptible (2-3 líneas).
 */
const MAX_METEORS = 3;
const WORLD_RADIUS_MIN = 1400;
const WORLD_RADIUS_MAX = 2300;

interface Meteor {
  line: THREE.Line;
  material: THREE.LineBasicMaterial;
  start: THREE.Vector3;
  direction: THREE.Vector3;
  speed: number;
  length: number;
  life: number;
  age: number;
  alive: boolean;
}

export class Meteors {
  private readonly meteors: Meteor[] = [];
  private nextSpawnIn = 3 + Math.random() * 6;

  constructor(scene: THREE.Scene) {
    for (let i = 0; i < MAX_METEORS; i++) {
      const material = new THREE.LineBasicMaterial({
        color: 0xdfe9ff,
        transparent: true,
        opacity: 0,
        blending: THREE.AdditiveBlending,
        depthWrite: false
      });
      const geometry = new THREE.BufferGeometry();
      geometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array(6), 3));
      const line = new THREE.Line(geometry, material);
      line.visible = false;
      scene.add(line);
      this.meteors.push({
        line,
        material,
        start: new THREE.Vector3(),
        direction: new THREE.Vector3(),
        speed: 0,
        length: 0,
        life: 0,
        age: 0,
        alive: false
      });
    }
  }

  public update(deltaSeconds: number): void {
    if (deltaSeconds <= 0) return;
    this.nextSpawnIn -= deltaSeconds;
    if (this.nextSpawnIn <= 0) {
      this.nextSpawnIn = 7 + Math.random() * 15;
      this.spawn();
    }

    this.meteors.forEach((meteor) => {
      if (!meteor.alive) return;
      meteor.age += deltaSeconds;
      if (meteor.age >= meteor.life) {
        meteor.alive = false;
        meteor.line.visible = false;
        return;
      }
      const traveled = meteor.speed * meteor.age;
      const head = meteor.start.clone().addScaledVector(meteor.direction, traveled);
      const tail = head.clone().addScaledVector(meteor.direction, -meteor.length);

      const positions = meteor.line.geometry.attributes.position.array as Float32Array;
      positions[0] = tail.x;
      positions[1] = tail.y;
      positions[2] = tail.z;
      positions[3] = head.x;
      positions[4] = head.y;
      positions[5] = head.z;
      meteor.line.geometry.attributes.position.needsUpdate = true;

      const fade = Math.max(0, 1 - meteor.age / meteor.life);
      meteor.material.opacity = fade * 0.9;
    });
  }

  private spawn(): void {
    const meteor = this.meteors.find((item) => !item.alive);
    if (!meteor) return;

    const theta = Math.random() * Math.PI * 2;
    const phi = Math.acos(Math.random() * 1.8 - 0.9);
    const radius = WORLD_RADIUS_MIN + Math.random() * (WORLD_RADIUS_MAX - WORLD_RADIUS_MIN);

    meteor.start.set(
      radius * Math.sin(phi) * Math.cos(theta),
      radius * Math.sin(phi) * Math.sin(theta),
      radius * Math.cos(phi)
    );

    // Dirección aleatoria con leve sesgo hacia "caer" a través de la bóveda.
    meteor.direction
      .setFromSphericalCoords(1, Math.acos(Math.random() * 1.5 - 0.25), Math.random() * Math.PI * 2)
      .normalize();
    meteor.speed = 900 + Math.random() * 800;
    meteor.length = 60 + Math.random() * 100;
    meteor.life = 0.45 + Math.random() * 0.6;
    meteor.age = 0;
    meteor.alive = true;
    meteor.line.visible = true;
    meteor.material.opacity = 0.9;
  }

  public dispose(): void {
    this.meteors.forEach((meteor) => {
      meteor.line.geometry.dispose();
      meteor.material.dispose();
      meteor.line.removeFromParent();
    });
    this.meteors.length = 0;
  }
}
