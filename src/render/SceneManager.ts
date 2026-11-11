import * as THREE from 'three';
import { applyMilkyWaySky, setTextureAnisotropy } from './catalogTextures';
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

export type PerformanceProfileName = 'quality' | 'low-spec';

export interface ScenePerformanceSettings {
  lowSpec: boolean;
  bloomEnabled: boolean;
  shadowsEnabled: boolean;
  pixelRatio: number;
}

export type ScenePerformanceProfile = PerformanceProfileName | Partial<ScenePerformanceSettings>;

function profilePreset(name: PerformanceProfileName): ScenePerformanceSettings {
  if (name === 'low-spec') {
    return {
      lowSpec: true,
      bloomEnabled: false,
      shadowsEnabled: false,
      pixelRatio: 1
    };
  }

  return {
    lowSpec: false,
    bloomEnabled: true,
    shadowsEnabled: true,
    pixelRatio: Math.min(window.devicePixelRatio, 2)
  };
}

function resolveProfile(
  profile: ScenePerformanceProfile,
  current?: ScenePerformanceSettings
): ScenePerformanceSettings {
  if (typeof profile === 'string') return profilePreset(profile);

  const base = profile.lowSpec === undefined
    ? (current ?? profilePreset('quality'))
    : profilePreset(profile.lowSpec ? 'low-spec' : 'quality');
  const pixelRatio = Math.min(2, Math.max(0.5, profile.pixelRatio ?? base.pixelRatio));

  return { ...base, ...profile, pixelRatio };
}

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
  private softPointTexture: THREE.CanvasTexture | null = null;
  private lastElapsed = 0;
  private performanceSettings: ScenePerformanceSettings;

  // Callbacks para eventos con la UI
  public onPlanetSelected?: (planet: PlanetData | null) => void;
  public onLandmarkSelected?: (landmark: GeographicLandmark) => void;

  private onWindowResize = () => this.handleResize();
  private onWindowMouseUp = () => {
    this.isDragging = false;
  };

  constructor(container: HTMLElement, profile: ScenePerformanceProfile = 'quality') {
    this.container = container;
    this.performanceSettings = resolveProfile(profile);

    // 1. Escena
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x07080a);
    applyMilkyWaySky(this.scene);

    // 2. Cámara
    const aspect = container.clientWidth / container.clientHeight || 16 / 9;
    this.camera = new THREE.PerspectiveCamera(45, aspect, 0.1, 8000);
    this.updateCameraPosition();

    // 3. Renderizador WebGL
    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: false,
      powerPreference: 'high-performance'
    });
    this.renderer.setSize(container.clientWidth || window.innerWidth, container.clientHeight || window.innerHeight);
    this.renderer.setPixelRatio(this.performanceSettings.pixelRatio);
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.12;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;

    // 3b. Sombras: mapa cúbico para eclipses de lunas; las de anillos son analíticas
    this.renderer.shadowMap.enabled = this.performanceSettings.shadowsEnabled;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    // 3c. Filtrado anisotrópico al máximo que soporte la GPU (tope 16×)
    setTextureAnisotropy(this.renderer.capabilities.getMaxAnisotropy());

    container.appendChild(this.renderer.domElement);

    // 4. Iluminación ambiental
    // 4. Luz de relleno. Con solo la luz puntual del Sol el hemisferio nocturno
    //    quedaba negro puro en los primeros planos. Se combina:
    //    - un ambiente frío tenue (≈3 % de la luz solar: "luz de las estrellas"), y
    //    - un relleno direccional suave solidario a la cámara (≈7 %), que da
    //      volumen al lado nocturno sin aplanar el terminador ni proyectar sombras.
    const ambientLight = new THREE.AmbientLight(0x93a7cc, 0.26);
    this.scene.add(ambientLight);

    const fillLight = new THREE.DirectionalLight(0xa9bbdc, 0.24);
    fillLight.position.set(0.35, 0.45, 1);
    fillLight.target.position.set(0, 0, 0);
    this.camera.add(fillLight, fillLight.target);
    this.scene.add(this.camera);

    // 5. Sol
    this.sun = new SunBody(3.2);
    this.scene.add(this.sun.mesh);

    // 5b. La luz del Sol proyecta sombras (mapa cúbico de 1024² por cara)
    this.sun.pointLight.castShadow = this.performanceSettings.shadowsEnabled;
    this.sun.pointLight.shadow.mapSize.set(1024, 1024);
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

    // 14. Fondo de estrellas nítidas con distribución de magnitudes
    this.createStarfield(6000);

    // 14b. Estrellas fugaces ocasionales
    this.meteors = new Meteors(this.scene);

    // 14c. Postprocesado cinematográfico (bloom + tone mapping final)
    this.postFX = new PostFX(
      this.renderer,
      this.scene,
      this.camera,
      this.performanceSettings.bloomEnabled
    );

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
      size: 1.6,
      map: this.getSoftPointTexture(),
      vertexColors: true,
      transparent: true,
      opacity: 0.65,
      depthWrite: false
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
      size: 1.4,
      map: this.getSoftPointTexture(),
      vertexColors: true,
      transparent: true,
      opacity: 0.4,
      depthWrite: false
    });

    const points = new THREE.Points(geo, mat);
    this.oortCloudGroup.add(points);
    this.scene.add(this.oortCloudGroup);
  }

  /**
   * Disco suave compartido para las nubes de puntos (Kuiper, Oort): sin textura,
   * `PointsMaterial` dibuja cuadrados duros que se confundían con estrellas pixeladas.
   */
  private getSoftPointTexture(): THREE.CanvasTexture {
    if (this.softPointTexture) return this.softPointTexture;
    const canvas = document.createElement('canvas');
    canvas.width = 64;
    canvas.height = 64;
    const ctx = canvas.getContext('2d')!;
    const grad = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
    grad.addColorStop(0, 'rgba(255, 255, 255, 1)');
    grad.addColorStop(0.35, 'rgba(255, 255, 255, 0.75)');
    grad.addColorStop(1, 'rgba(255, 255, 255, 0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 64, 64);
    this.softPointTexture = new THREE.CanvasTexture(canvas);
    return this.softPointTexture;
  }

  private createStarfield(count: number): void {
    const geo = new THREE.BufferGeometry();
    const positions = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);
    const phases = new Float32Array(count);
    const speeds = new Float32Array(count);
    const sizes = new Float32Array(count);
    const tint = new THREE.Color();

    for (let i = 0; i < count; i++) {
      const radius = 3000;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(Math.random() * 2 - 1);

      positions[i * 3] = radius * Math.sin(phi) * Math.cos(theta);
      positions[i * 3 + 1] = radius * Math.sin(phi) * Math.sin(theta);
      positions[i * 3 + 2] = radius * Math.cos(phi);

      // Distribución de magnitudes: muchas estrellas débiles, pocas brillantes
      const mag = Math.pow(Math.random(), 3.2);
      sizes[i] = 1.3 + mag * 3.4;
      const brightness = 0.22 + 0.78 * Math.pow(mag, 0.7);

      // Color por clase espectral aproximada (azuladas ↔ anaranjadas)
      const warmth = Math.random();
      if (warmth < 0.2) tint.setRGB(0.72, 0.82, 1.0);
      else if (warmth < 0.7) tint.setRGB(1.0, 0.97, 0.92);
      else if (warmth < 0.92) tint.setRGB(1.0, 0.86, 0.66);
      else tint.setRGB(1.0, 0.7, 0.5);
      colors[i * 3] = tint.r * brightness;
      colors[i * 3 + 1] = tint.g * brightness;
      colors[i * 3 + 2] = tint.b * brightness;

      phases[i] = Math.random() * Math.PI * 2;
      speeds[i] = 0.6 + Math.random() * 2.4;
    }

    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    geo.setAttribute('aPhase', new THREE.BufferAttribute(phases, 1));
    geo.setAttribute('aSpeed', new THREE.BufferAttribute(speeds, 1));
    geo.setAttribute('aSize', new THREE.BufferAttribute(sizes, 1));

    const material = new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uScale: { value: this.starPointScale(this.container.clientHeight) }
      },
      vertexShader: `
        attribute vec3 color;
        attribute float aPhase;
        attribute float aSpeed;
        attribute float aSize;
        uniform float uTime;
        uniform float uScale;
        varying vec3 vColor;
        void main() {
          float twinkle = 0.82 + 0.18 * sin(uTime * aSpeed + aPhase);
          vColor = color * twinkle;
          vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
          // Tamaño en píxeles de pantalla (las estrellas están "en el infinito")
          gl_PointSize = max(2.0, aSize * uScale * 1.5);
          gl_Position = projectionMatrix * mvPosition;
        }
      `,
      fragmentShader: `
        varying vec3 vColor;
        void main() {
          float d = length(gl_PointCoord - 0.5) * 2.0;
          // Núcleo gaussiano + halo tenue: disco suave en lugar de un cuadrado
          float core = exp(-d * d * 7.0);
          float alpha = core * (1.0 - smoothstep(0.75, 1.0, d));
          gl_FragColor = vec4(vColor * alpha, 1.0);
          #include <tonemapping_fragment>
          #include <colorspace_fragment>
        }
      `,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending
    });

    this.starfield = new THREE.Points(geo, material);
    this.starfield.frustumCulled = false;
    this.scene.add(this.starfield);
  }

  /** Escala de los puntos estelares: píxeles físicos, normalizada a 900 px de alto. */
  private starPointScale(heightPx: number): number {
    const resolutionScale = Math.min(1.6, Math.max(0.8, heightPx / 900));
    return this.renderer.getPixelRatio() * resolutionScale;
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
    // Solo las lunas del sistema enfocado proyectan sombra (eclipses nítidos en
    // primer plano, sin sombras cruzadas entre planetas en la vista general).
    this.planets.forEach((body) => body.setShadowFocus(body === next));
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

  public setPerformanceProfile(profile: ScenePerformanceProfile): void {
    const next = resolveProfile(profile, this.performanceSettings);
    this.performanceSettings = next;

    this.setBloomEnabled(next.bloomEnabled);
    this.setShadowsEnabled(next.shadowsEnabled);
    this.setPixelRatio(next.pixelRatio);
  }

  public getPerformanceSettings(): ScenePerformanceSettings {
    return { ...this.performanceSettings };
  }

  public setBloomEnabled(enabled: boolean): void {
    this.performanceSettings.bloomEnabled = enabled;
    this.postFX?.setBloomEnabled(enabled);
  }

  public setShadowsEnabled(enabled: boolean): void {
    this.performanceSettings.shadowsEnabled = enabled;
    this.renderer.shadowMap.enabled = enabled;
    this.sun.pointLight.castShadow = enabled;
  }

  public setPixelRatio(pixelRatio: number): void {
    const clampedRatio = Math.min(2, Math.max(0.5, pixelRatio));
    this.performanceSettings.pixelRatio = clampedRatio;
    this.renderer.setPixelRatio(clampedRatio);
    this.postFX?.setPixelRatio(clampedRatio);
    this.handleResize();
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
    if (material?.uniforms?.uScale) material.uniforms.uScale.value = this.starPointScale(height);
  }

  public update(daysSinceJ2000: number, deltaDays: number, elapsedTime: number): void {
    this.sun.animate(elapsedTime);

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
