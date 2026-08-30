import * as THREE from 'three';
import { applyMilkyWaySky } from './catalogTextures';
import { PLANETS_DATA, PlanetData } from '../data/planets.data';
import { GeographicLandmark } from '../data/geography.data';
import { KeplerianEngine } from '../core/physics/KeplerianEngine';
import { SunBody } from './SunBody';
import { CelestialBody } from './CelestialBody';
import { HabitableZone } from './HabitableZone';
import { OrbitsRenderer } from './OrbitsRenderer';
import { PostFX } from './PostFX';
import { Meteors } from './Meteors';
import { applyMoonVisuals, createMoonOrbitRings } from './MoonFX';

export class SceneManager {
  public scene: THREE.Scene;
  public camera: THREE.PerspectiveCamera;
  public renderer: THREE.WebGLRenderer;

  public sun: SunBody;
  public habitableZone: HabitableZone;
  public orbitsRenderer: OrbitsRenderer;
  public planets: Map<string, CelestialBody> = new Map();

  private container: HTMLElement;
  private raycaster: THREE.Raycaster = new THREE.Raycaster();
  private mousePos: THREE.Vector2 = new THREE.Vector2();

  // Controles de cámara orbital y seguimiento
  private cameraTarget: THREE.Vector3 = new THREE.Vector3(0, 0, 0);
  private followedBody: CelestialBody | null = null;
  private cutawayBody: CelestialBody | null = null;
  private isDragging: boolean = false;
  private previousMousePosition: { x: number; y: number } = { x: 0, y: 0 };
  private sphericalCoords: THREE.Spherical = new THREE.Spherical(95, Math.PI / 2.8, Math.PI / 4.5);

  // Grupos 3D para cinturones y nubes
  private asteroidBeltGroup: THREE.Group = new THREE.Group();
  private kuiperBeltGroup: THREE.Group = new THREE.Group();
  private oortCloudGroup: THREE.Group = new THREE.Group();
  private constellationGroup: THREE.Group = new THREE.Group();
  private celestialGrid: THREE.GridHelper | null = null;

  // Postprocesado (bloom) y estrellas fugaces
  private postFX: PostFX | null = null;
  private meteors: Meteors | null = null;
  private starfield: THREE.Points | null = null;
  private lastElapsed = 0;

  // Callbacks para eventos con la UI
  public onPlanetSelected?: (planet: PlanetData | null) => void;
  public onLandmarkSelected?: (landmark: GeographicLandmark) => void;

  private onWindowResize = () => this.handleResize();
  private onWindowMouseUp = () => {
    this.isDragging = false;
  };

  constructor(container: HTMLElement) {
    this.container = container;

    // 1. Escena
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x07080a);
    applyMilkyWaySky(this.scene);

    // 2. Cámara
    const aspect = container.clientWidth / container.clientHeight || 16 / 9;
    this.camera = new THREE.PerspectiveCamera(45, aspect, 0.1, 8000);
    this.updateCameraPosition();

    // 3. Renderizador WebGL
    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    this.renderer.setSize(container.clientWidth || window.innerWidth, container.clientHeight || window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.05;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;

    // 3b. Sombras reales (lunas proyectan sobre planetas, anillos sobre Saturno)
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    container.appendChild(this.renderer.domElement);

    // 4. Iluminación ambiental
    const ambientLight = new THREE.AmbientLight(0x1c1e24, 0.28);
    this.scene.add(ambientLight);

    // 5. Sol
    this.sun = new SunBody(3.2);
    this.scene.add(this.sun.mesh);

    // 5b. La luz del Sol proyecta sombras (mapa de 2048², alcance al sistema interior)
    this.sun.pointLight.castShadow = true;
    this.sun.pointLight.shadow.mapSize.set(2048, 2048);
    this.sun.pointLight.shadow.camera.near = 1.0;
    this.sun.pointLight.shadow.camera.far = 4000;
    // Obligatorio: sin esto la matriz de proyección de la sombra queda obsoleta
    // en los valores por defecto (0.5/500) y los objetos lejanos se recortan.
    this.sun.pointLight.shadow.camera.updateProjectionMatrix();
    // El bias está normalizado por (far - near) ≈ 3999: -0.0004 desplazaba las
    // sombras ~1.6 unidades de mundo (peter-panning). Se usa un bias mínimo
    // (~0.04 u) y normalBias (unidades de mundo) contra el acné de sombra.
    this.sun.pointLight.shadow.bias = -0.00001;
    this.sun.pointLight.shadow.normalBias = 0.03;

    // 6. Zona de Habitabilidad 3D
    this.habitableZone = new HabitableZone();
    this.scene.add(this.habitableZone.mesh);

    // 7. Trazado de Órbitas 3D
    this.orbitsRenderer = new OrbitsRenderer(PLANETS_DATA);
    this.scene.add(this.orbitsRenderer.group);

    // 8. Cuerpos Celestes (Planetas y Planetas Enanos)
    PLANETS_DATA.forEach((pData) => {
      const celestial = new CelestialBody(pData);
      this.planets.set(pData.id, celestial);
      this.scene.add(celestial.group);
    });

    // 8b. Capa de mejora gráfica (MoonFX): texturas procedurales de lunas
    // y anillos de órbita sutiles en el plano ecuatorial de cada planeta.
    const celestialBodies = Array.from(this.planets.values());
    applyMoonVisuals(celestialBodies);
    createMoonOrbitRings(celestialBodies);

    // 9. Rejilla Cósmica de la Eclíptica
    this.createCelestialGrid();

    // 10. Constelaciones en la bóveda celeste
    this.createConstellations();

    // 11. Cinturón Principal de Asteroides (Marte-Júpiter)
    this.create3DAsteroidBelt(700);

    // 12. Cinturón de Kuiper (30 a 55 UA)
    this.createKuiperBelt(1400);

    // 13. Nube de Oort (Esfera helada exterior distante)
    this.createOortCloud(2800);

    // 14. Fondo de 3,500 estrellas
    this.createStarfield(3500);

    // 14b. Estrellas fugaces ocasionales
    this.meteors = new Meteors(this.scene);

    // 14c. Postprocesado cinematográfico (bloom + tone mapping final)
    this.postFX = new PostFX(this.renderer, this.scene, this.camera);

    // 15. Event Listeners
    this.setupEventListeners();
  }

  private createCelestialGrid(): void {
    const size = 500;
    const divisions = 80;
    this.celestialGrid = new THREE.GridHelper(size, divisions, 0x2a2c32, 0x16181c);
    (this.celestialGrid.material as THREE.Material).transparent = true;
    (this.celestialGrid.material as THREE.Material).opacity = 0.1;
    this.celestialGrid.position.y = -0.5;
    this.scene.add(this.celestialGrid);
  }

  private createConstellations(): void {
    this.constellationGroup = new THREE.Group();

    const constellationNodes = [
      // Osa Mayor
      [
        { x: -500, y: 700, z: -800 },
        { x: -400, y: 740, z: -820 },
        { x: -280, y: 720, z: -840 },
        { x: -200, y: 640, z: -850 },
        { x: -160, y: 520, z: -860 },
        { x: -260, y: 500, z: -850 },
        { x: -300, y: 620, z: -840 },
        { x: -200, y: 640, z: -850 }
      ],
      // Orión
      [
        { x: 800, y: 200, z: -700 },
        { x: 920, y: 180, z: -720 },
        { x: 860, y: 40, z: -710 },
        { x: 880, y: 50, z: -710 },
        { x: 900, y: 60, z: -710 },
        { x: 820, y: -120, z: -700 },
        { x: 950, y: -100, z: -720 }
      ],
      // Casiopea
      [
        { x: -700, y: 800, z: 400 },
        { x: -620, y: 860, z: 420 },
        { x: -540, y: 810, z: 440 },
        { x: -460, y: 870, z: 450 },
        { x: -380, y: 820, z: 460 }
      ],
      // Zodíaco
      [
        { x: -600, y: 50, z: 700 },
        { x: -450, y: 80, z: 800 },
        { x: -300, y: 30, z: 850 },
        { x: -100, y: 60, z: 900 },
        { x: 150, y: 40, z: 880 },
        { x: 350, y: 70, z: 820 },
        { x: 550, y: 20, z: 720 }
      ]
    ];

    const lineMat = new THREE.LineBasicMaterial({
      color: 0x8a9098,
      transparent: true,
      opacity: 0.18
    });

    const starNodeGeo = new THREE.SphereGeometry(2.5, 12, 12);
    const starNodeMat = new THREE.MeshBasicMaterial({ color: 0xc9d4dc });
    const starInstanced = new THREE.InstancedMesh(starNodeGeo, starNodeMat, 60);
    let starIdx = 0;
    const dummy = new THREE.Object3D();

    constellationNodes.forEach((chain) => {
      const points: THREE.Vector3[] = [];
      chain.forEach((pt) => {
        const v = new THREE.Vector3(pt.x, pt.y, pt.z);
        points.push(v);

        dummy.position.copy(v);
        dummy.updateMatrix();
        if (starIdx < 60) {
          starInstanced.setMatrixAt(starIdx++, dummy.matrix);
        }
      });

      const lineGeo = new THREE.BufferGeometry().setFromPoints(points);
      const line = new THREE.Line(lineGeo, lineMat);
      this.constellationGroup.add(line);
    });

    this.constellationGroup.add(starInstanced);
    this.scene.add(this.constellationGroup);
  }

  private create3DAsteroidBelt(count: number): void {
    const baseGeo = new THREE.DodecahedronGeometry(0.35, 1);
    const pos = baseGeo.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const vx = pos.getX(i);
      const vy = pos.getY(i);
      const vz = pos.getZ(i);
      const noise = 0.8 + Math.random() * 0.4;
      pos.setXYZ(i, vx * noise, vy * noise, vz * noise);
    }
    baseGeo.computeVertexNormals();

    const mat = new THREE.MeshStandardMaterial({
      color: 0x8a8580,
      roughness: 0.9,
      metalness: 0.1
    });

    const instancedMesh = new THREE.InstancedMesh(baseGeo, mat, count);
    const dummy = new THREE.Object3D();

    for (let i = 0; i < count; i++) {
      const au = 2.15 + Math.random() * 1.15;
      const sceneR = KeplerianEngine.scaleAUToScene(au);
      const angle = Math.random() * Math.PI * 2;
      const yOffset = (Math.random() - 0.5) * 2.8;

      dummy.position.set(
        Math.cos(angle) * sceneR,
        yOffset,
        Math.sin(angle) * sceneR
      );

      const scale = 0.4 + Math.random() * 0.9;
      dummy.scale.set(scale, scale * (0.8 + Math.random() * 0.4), scale);

      dummy.rotation.set(
        Math.random() * Math.PI,
        Math.random() * Math.PI,
        Math.random() * Math.PI
      );

      dummy.updateMatrix();
      instancedMesh.setMatrixAt(i, dummy.matrix);
    }

    this.asteroidBeltGroup.add(instancedMesh);
    this.scene.add(this.asteroidBeltGroup);
  }

  private createKuiperBelt(count: number): void {
    // Toro de partículas heladas entre 30 UA (Neptuno) y 55 UA
    const geo = new THREE.BufferGeometry();
    const positions = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);

    for (let i = 0; i < count; i++) {
      const au = 30.0 + Math.random() * 25.0; // 30 - 55 UA
      const sceneR = KeplerianEngine.scaleAUToScene(au);
      const angle = Math.random() * Math.PI * 2;
      const verticalDispersion = (Math.random() - 0.5) * (sceneR * 0.28); // Gran inclinación en Kuiper

      positions[i * 3] = Math.cos(angle) * sceneR;
      positions[i * 3 + 1] = verticalDispersion;
      positions[i * 3 + 2] = Math.sin(angle) * sceneR;

      // Color azulado-hielo / marrón orgánico
      const isIcy = Math.random() > 0.35;
      colors[i * 3] = isIcy ? 0.75 : 0.85;
      colors[i * 3 + 1] = isIcy ? 0.88 : 0.65;
      colors[i * 3 + 2] = isIcy ? 1.0 : 0.45;
    }

    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    const mat = new THREE.PointsMaterial({
      size: 1.4,
      vertexColors: true,
      transparent: true,
      opacity: 0.65
    });

    const points = new THREE.Points(geo, mat);
    this.kuiperBeltGroup.add(points);
    this.scene.add(this.kuiperBeltGroup);
  }

  private createOortCloud(count: number): void {
    // Esfera exterior envolvente de cometas y fragmentos helados primordiales
    const geo = new THREE.BufferGeometry();
    const positions = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);

    for (let i = 0; i < count; i++) {
      const radius = 180 + Math.random() * 90; // Radio escalado exterior
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(Math.random() * 2 - 1);

      positions[i * 3] = radius * Math.sin(phi) * Math.cos(theta);
      positions[i * 3 + 1] = radius * Math.sin(phi) * Math.sin(theta);
      positions[i * 3 + 2] = radius * Math.cos(phi);

      colors[i * 3] = 0.65 + Math.random() * 0.35;
      colors[i * 3 + 1] = 0.85 + Math.random() * 0.15;
      colors[i * 3 + 2] = 1.0;
    }

    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    const mat = new THREE.PointsMaterial({
      size: 1.2,
      vertexColors: true,
      transparent: true,
      opacity: 0.4
    });

    const points = new THREE.Points(geo, mat);
    this.oortCloudGroup.add(points);
    this.scene.add(this.oortCloudGroup);
  }

  private createStarfield(count: number): void {
    const geo = new THREE.BufferGeometry();
    const positions = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);
    const phases = new Float32Array(count);
    const speeds = new Float32Array(count);

    for (let i = 0; i < count; i++) {
      const radius = 1200 + Math.random() * 2500;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(Math.random() * 2 - 1);

      positions[i * 3] = radius * Math.sin(phi) * Math.cos(theta);
      positions[i * 3 + 1] = radius * Math.sin(phi) * Math.sin(theta);
      positions[i * 3 + 2] = radius * Math.cos(phi);

      // Temperatura de color ligera (blanco-azuladas a blanco-cálidas)
      const warmth = Math.random();
      const base = 0.78 + Math.random() * 0.22;
      colors[i * 3] = base;
      colors[i * 3 + 1] = base * (0.94 + warmth * 0.06);
      colors[i * 3 + 2] = base * (0.92 + (1 - warmth) * 0.08);

      phases[i] = Math.random() * Math.PI * 2;
      speeds[i] = 0.6 + Math.random() * 2.4;
    }

    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    geo.setAttribute('aPhase', new THREE.BufferAttribute(phases, 1));
    geo.setAttribute('aSpeed', new THREE.BufferAttribute(speeds, 1));

    const material = new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uSize: { value: 1.9 },
        uScale: { value: Math.max(1, this.container.clientHeight) * 0.5 }
      },
      vertexShader: `
        attribute vec3 color;
        attribute float aPhase;
        attribute float aSpeed;
        uniform float uTime;
        uniform float uSize;
        uniform float uScale;
        varying vec3 vColor;
        varying float vTwinkle;
        void main() {
          vColor = color;
          vTwinkle = 0.7 + 0.3 * sin(uTime * aSpeed + aPhase);
          vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
          gl_PointSize = uSize * (uScale / -mvPosition.z);
          gl_Position = projectionMatrix * mvPosition;
        }
      `,
      fragmentShader: `
        varying vec3 vColor;
        varying float vTwinkle;
        void main() {
          vec2 uv = gl_PointCoord - 0.5;
          float d = length(uv);
          if (d > 0.5) discard;
          float alpha = smoothstep(0.5, 0.08, d);
          gl_FragColor = vec4(vColor * vTwinkle, alpha * 0.9);
        }
      `,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending
    });

    this.starfield = new THREE.Points(geo, material);
    this.scene.add(this.starfield);
  }

  private setupEventListeners(): void {
    const dom = this.renderer.domElement;

    dom.addEventListener('mousedown', (e) => {
      this.isDragging = true;
      this.previousMousePosition = { x: e.clientX, y: e.clientY };
    });

    window.addEventListener('mouseup', this.onWindowMouseUp);

    dom.addEventListener('mousemove', (e) => {
      if (this.isDragging) {
        const deltaX = e.clientX - this.previousMousePosition.x;
        const deltaY = e.clientY - this.previousMousePosition.y;

        this.sphericalCoords.theta -= deltaX * 0.005;
        this.sphericalCoords.phi = Math.max(
          0.05,
          Math.min(Math.PI - 0.05, this.sphericalCoords.phi - deltaY * 0.005)
        );

        this.previousMousePosition = { x: e.clientX, y: e.clientY };
        this.updateCameraPosition();
      }

      const rect = dom.getBoundingClientRect();
      this.mousePos.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      this.mousePos.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
    });

    dom.addEventListener('wheel', (e) => {
      e.preventDefault();
      const zoomFactor = e.deltaY > 0 ? 1.12 : 0.88;
      const minDistance = this.followedBody ? this.followedBody.sceneRadius * 2.5 : 8.0;
      const maxDistance = 1200.0;

      this.sphericalCoords.radius = Math.max(
        minDistance,
        Math.min(maxDistance, this.sphericalCoords.radius * zoomFactor)
      );
      this.updateCameraPosition();
    });

    dom.addEventListener('click', () => {
      this.handleRaycastClick();
    });

    window.addEventListener('resize', this.onWindowResize);

    dom.addEventListener('touchstart', (e) => {
      if (e.touches.length === 1) {
        this.isDragging = true;
        this.previousMousePosition = { x: e.touches[0].clientX, y: e.touches[0].clientY };
      }
    }, { passive: true });

    dom.addEventListener('touchmove', (e) => {
      if (!this.isDragging || e.touches.length !== 1) return;
      const touch = e.touches[0];
      const deltaX = touch.clientX - this.previousMousePosition.x;
      const deltaY = touch.clientY - this.previousMousePosition.y;
      this.sphericalCoords.theta -= deltaX * 0.005;
      this.sphericalCoords.phi = Math.max(
        0.05,
        Math.min(Math.PI - 0.05, this.sphericalCoords.phi - deltaY * 0.005)
      );
      this.previousMousePosition = { x: touch.clientX, y: touch.clientY };
      this.updateCameraPosition();
    }, { passive: true });

    dom.addEventListener('touchend', () => {
      this.isDragging = false;
    });
  }

  private updateCameraPosition(): void {
    const target = this.followedBody ? this.followedBody.group.position : this.cameraTarget;

    const offset = new THREE.Vector3().setFromSpherical(this.sphericalCoords);
    this.camera.position.copy(target).add(offset);
    this.camera.lookAt(target);
  }

  private handleRaycastClick(): void {
    this.raycaster.setFromCamera(this.mousePos, this.camera);

    if (this.followedBody) {
      const pinIntersects = this.raycaster.intersectObjects(this.followedBody.geographyPins.pinHitboxes);
      if (pinIntersects.length > 0) {
        const landmark = pinIntersects[0].object.userData.landmark as GeographicLandmark;
        if (landmark && this.onLandmarkSelected) {
          this.onLandmarkSelected(landmark);
          return;
        }
      }
    }

    const hitboxes = Array.from(this.planets.values()).map((p) => p.hitbox);
    const planetIntersects = this.raycaster.intersectObjects(hitboxes);

    if (planetIntersects.length > 0) {
      const body = planetIntersects[0].object.userData.celestialBody as CelestialBody;
      this.selectPlanet(body.data.id);
    }
  }

  public selectPlanet(planetId: string | null): void {
    const next = planetId ? (this.planets.get(planetId) ?? null) : null;
    if (this.cutawayBody && this.cutawayBody !== next) {
      this.cutawayBody.setGeologyCutawayMode(false);
      this.cutawayBody = null;
    }
    if (!planetId) {
      this.followedBody = null;
      this.cameraTarget.set(0, 0, 0);
      this.sphericalCoords.radius = 95;
      this.orbitsRenderer.highlightPlanetOrbit(null);
      if (this.onPlanetSelected) this.onPlanetSelected(null);
      return;
    }

    const celestial = this.planets.get(planetId);
    if (celestial) {
      this.followedBody = celestial;
      this.sphericalCoords.radius = celestial.sceneRadius * 4.5;
      this.sphericalCoords.phi = Math.PI / 2.5;
      this.orbitsRenderer.highlightPlanetOrbit(planetId);
      if (this.onPlanetSelected) this.onPlanetSelected(celestial.data);
    }
  }

  public focusOnLandmark(landmark: GeographicLandmark): void {
    const celestial = this.planets.get(landmark.planetId);
    if (!celestial) return;

    this.selectPlanet(celestial.data.id);
    this.sphericalCoords.radius = celestial.sceneRadius * 2.8;

    const latRad = (landmark.latDeg * Math.PI) / 180;
    const lonRad = (landmark.lonDeg * Math.PI) / 180;

    this.sphericalCoords.phi = Math.PI / 2 - latRad;
    this.sphericalCoords.theta = lonRad;
    this.updateCameraPosition();
  }

  public setSunTemperature(tempK: number): void {
    this.sun.updateTemperature(tempK);
    this.habitableZone.updateForTemperature(tempK);
  }

  public setHabitableZoneVisibility(visible: boolean): void {
    this.habitableZone.setVisible(visible);
  }

  public setOrbitsVisibility(visible: boolean): void {
    this.orbitsRenderer.setVisible(visible);
  }

  public setKuiperBeltVisibility(visible: boolean): void {
    this.kuiperBeltGroup.visible = visible;
  }

  public setOortCloudVisibility(visible: boolean): void {
    this.oortCloudGroup.visible = visible;
  }

  public setGeologyCutawayForSelected(enabled: boolean): void {
    if (this.followedBody) {
      this.followedBody.setGeologyCutawayMode(enabled);
      this.cutawayBody = enabled ? this.followedBody : null;
    } else if (!enabled && this.cutawayBody) {
      this.cutawayBody.setGeologyCutawayMode(false);
      this.cutawayBody = null;
    }
  }

  public handleResize(): void {
    const width = this.container.clientWidth;
    const height = this.container.clientHeight;
    if (width < 2 || height < 2) return;
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height);
    this.postFX?.setSize(width, height);
    const material = this.starfield?.material as THREE.ShaderMaterial | undefined;
    if (material?.uniforms?.uScale) material.uniforms.uScale.value = height * 0.5;
  }

  public update(daysSinceJ2000: number, deltaDays: number, elapsedTime: number): void {
    this.sun.animate(elapsedTime, this.camera);

    this.asteroidBeltGroup.rotation.y += deltaDays * 0.002;
    this.kuiperBeltGroup.rotation.y += deltaDays * 0.0004;
    this.oortCloudGroup.rotation.y += deltaDays * 0.00005;

    this.planets.forEach((celestial) => {
      const orbitalData = KeplerianEngine.calculatePosition(celestial.data.elements, daysSinceJ2000);
      celestial.group.position.copy(orbitalData.positionScene);
      celestial.update(deltaDays);
    });

    // Estrellas con twinkle y estrellas fugaces (tiempo real, no simulado)
    const material = this.starfield?.material as THREE.ShaderMaterial | undefined;
    if (material?.uniforms?.uTime) material.uniforms.uTime.value = elapsedTime;
    const realDt = Math.min(elapsedTime - this.lastElapsed, 0.1);
    this.lastElapsed = elapsedTime;
    this.meteors?.update(realDt);

    this.updateCameraPosition();
    if (this.postFX) this.postFX.render();
    else this.renderer.render(this.scene, this.camera);
  }

}
