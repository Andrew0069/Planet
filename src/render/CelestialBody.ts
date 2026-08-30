import * as THREE from 'three';
import { applyCatalogTexture, applyEarthClouds } from './catalogTextures';
import { PlanetData, MoonData } from '../data/planets.data';
import { GEOGRAPHIC_LANDMARKS, GeographicLandmark } from '../data/geography.data';
import { InternalLayers } from './InternalLayers';
import { GeographyPins } from './GeographyPins';

export class CelestialBody {
  /**
   * Escala visual global de las rotaciones. Las proporciones relativas entre cuerpos
   * son físicas (periodos de rotación NASA en horas); esta constante solo reduce la
   * velocidad percibida para que a la velocidad de simulación por defecto (3 d/s) el
   * giro sea apreciable pero no vertiginoso: Tierra ~1 vuelta/6 s, Júpiter ~1/2.5 s,
   * Ío ~1 órbita/10 s, Fobos ~1 órbita/2 s. Es el único "knob" para frenar/acelerar.
   */
  private static readonly ROTATION_VISUAL_SCALE = 0.06;

  public data: PlanetData;
  public group: THREE.Group;              // Grupo posicionado en coordenadas orbitales
  public axialTiltGroup: THREE.Group;    // Inclinado según la oblicuidad del eje
  public planetMesh: THREE.Mesh;         // Malla esférica / elipsoidal rotatoria
  public cloudsMesh?: THREE.Mesh;        // Capa de nubes rotatoria independiente (Tierra)
  public atmosphereMesh?: THREE.Mesh;    // Resplandor atmosférico
  public ringsMesh?: THREE.Mesh;         // Anillos planetarios
  public labelSprite: THREE.Sprite;      // Etiqueta flotante 3D
  public internalLayers: InternalLayers; // Corte geológico
  public geographyPins: GeographyPins;   // Marcadores de accidentes geográficos
  public moonMeshes: { mesh: THREE.Mesh; orbitRadius: number; periodDays: number; angle: number }[] = [];
  public hitbox: THREE.Mesh;             // Hitbox para selección por click
  public sceneRadius: number;

  constructor(data: PlanetData) {
    this.data = data;
    this.group = new THREE.Group();

    // 1. Escala de tamaño visual para 3D
    this.sceneRadius = this.calculateSceneRadius(data.radiusKm, data.type);

    // 2. Grupo de Inclinación Axial (Oblicuidad)
    this.axialTiltGroup = new THREE.Group();
    this.axialTiltGroup.rotation.z = (data.axialTiltDeg * Math.PI) / 180;
    this.group.add(this.axialTiltGroup);

    // 3. Generación de texturas de alta resolución fotorrealistas
    const { surfaceTex, specularTex } = this.generatePhotorealisticTextures(data);

    // 4. Malla principal (Esfera o Elipsoide de Jacobi si es Haumea)
    const geometry = new THREE.SphereGeometry(this.sceneRadius, 64, 64);
    if (data.isEllipsoid) {
      geometry.scale(1.4, 0.9, 1.15); // Deformación elipsoidal triaxial característica
    }

    const material = new THREE.MeshStandardMaterial({
      map: surfaceTex,
      bumpScale: 0.05,
      roughness: data.id === 'earth' ? 0.45 : (data.type === 'terrestrial' || data.type === 'dwarf' ? 0.85 : 0.4),
      metalness: data.id === 'mercury' || data.id === 'ceres' ? 0.2 : 0.05
    });

    if (specularTex && data.id === 'earth') {
      material.roughnessMap = specularTex;
    }

    this.planetMesh = new THREE.Mesh(geometry, material);
    this.axialTiltGroup.add(this.planetMesh);
    applyCatalogTexture(data.id, material);

    // Sombras: el planeta recibe y proyecta (las lunas proyectan sobre él)
    this.planetMesh.castShadow = true;
    this.planetMesh.receiveShadow = true;

    // 5. Capa de Nubes atmosférica independiente (Tierra)
    if (data.id === 'earth') {
      const cloudsTex = this.generateEarthCloudsTexture();
      const cloudsGeo = new THREE.SphereGeometry(this.sceneRadius * 1.015, 64, 64);
      const cloudsMat = new THREE.MeshStandardMaterial({
        map: cloudsTex,
        transparent: true,
        opacity: 0.85,
        blending: THREE.NormalBlending,
        roughness: 0.9
      });
      this.cloudsMesh = new THREE.Mesh(cloudsGeo, cloudsMat);
      this.axialTiltGroup.add(this.cloudsMesh);
      applyEarthClouds(cloudsMat);
      this.cloudsMesh.castShadow = false;
      this.cloudsMesh.receiveShadow = true;
    }

    // 6. Resplandor Atmosférico (Shader Fresnel dependiente del ángulo de visión)
    if (data.atmosphere.surfacePressureAtm > 0.001) {
      this.atmosphereMesh = this.createAtmosphereGlow(
        this.sceneRadius,
        data.atmosphere.colorHex,
        data.atmosphere.surfacePressureAtm,
        Boolean(data.isEllipsoid)
      );
      this.axialTiltGroup.add(this.atmosphereMesh);
    }

    // 7. Sistema de Anillos (Saturno, Urano, Haumea)
    if (data.ringSystem) {
      this.ringsMesh = this.createRingsMesh(this.sceneRadius, data.ringSystem);
      this.axialTiltGroup.add(this.ringsMesh);
      // Los anillos proyectan sombra sobre el planeta y la reciben de las lunas
      this.ringsMesh.castShadow = true;
      this.ringsMesh.receiveShadow = true;
    }

    // 8. Capas geológicas internas (Corte 3D)
    this.internalLayers = new InternalLayers(data, this.sceneRadius);
    this.axialTiltGroup.add(this.internalLayers.mesh);

    // 9. Marcadores de accidentes geográficos
    const landmarks = GEOGRAPHIC_LANDMARKS.filter((lm: GeographicLandmark) => lm.planetId === data.id);
    this.geographyPins = new GeographyPins(landmarks, this.sceneRadius);
    this.planetMesh.add(this.geographyPins.mesh);

    // 10. Etiqueta 3D Flotante
    this.labelSprite = this.createFloatingLabel(data.name.toUpperCase());
    this.labelSprite.position.set(0, -this.sceneRadius * 1.35, 0);
    this.group.add(this.labelSprite);

    // 11. Lunas principales
    this.createMoons();

    // 12. Hitbox para selección por raycasting
    const hitboxGeo = new THREE.SphereGeometry(this.sceneRadius * 1.4, 16, 16);
    const hitboxMat = new THREE.MeshBasicMaterial({ visible: false });
    this.hitbox = new THREE.Mesh(hitboxGeo, hitboxMat);
    this.hitbox.userData = { celestialBody: this };
    this.group.add(this.hitbox);
  }

  private calculateSceneRadius(radiusKm: number, type: string): number {
    if (type === 'gas_giant') {
      return 1.8 + Math.log10(radiusKm / 10000) * 0.9;
    } else if (type === 'ice_giant') {
      return 1.3 + Math.log10(radiusKm / 10000) * 0.7;
    } else if (type === 'dwarf') {
      return 0.35 + Math.pow(radiusKm / 1188, 0.4) * 0.4;
    } else {
      return 0.5 + Math.pow(radiusKm / 6371, 0.5) * 0.65;
    }
  }

  /**
   * Resplandor atmosférico con shader Fresnel: la intensidad del halo depende
   * del ángulo entre la normal y la dirección de visión, creando un borde
   * luminoso realista (estilo "rim glow") en lugar de una esfera aditiva plana.
   * La densidad y el alcance escalan con la presión superficial del planeta.
   */
  private createAtmosphereGlow(
    sceneRadius: number,
    colorHex: string,
    surfacePressureAtm: number,
    ellipsoid: boolean
  ): THREE.Mesh {
    // Escala logarítmica: Tierra ~1 atm, Venus ~92 atm, gigantes ~100-1000 atm
    const pressureFactor = Math.min(1, Math.log10(1 + surfacePressureAtm) / Math.log10(93));
    const radiusScale = 1 + 0.13 * pressureFactor;
    const intensity = 0.22 + 0.9 * Math.sqrt(pressureFactor);

    const geometry = new THREE.SphereGeometry(sceneRadius * radiusScale, 48, 48);
    if (ellipsoid) geometry.scale(1.4, 0.9, 1.15);

    const material = new THREE.ShaderMaterial({
      uniforms: {
        uGlowColor: { value: new THREE.Color(colorHex) },
        uPower: { value: 3.2 },
        uIntensity: { value: intensity },
        uOpacity: { value: 0.85 }
      },
      vertexShader: `
        varying vec3 vNormal;
        void main() {
          vNormal = normalize(normalMatrix * normal);
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        varying vec3 vNormal;
        uniform vec3 uGlowColor;
        uniform float uPower;
        uniform float uIntensity;
        uniform float uOpacity;
        void main() {
          // Borde luminoso: máximo cuando la normal es perpendicular a la vista
          float rim = pow(max(0.0, 0.72 - dot(vNormal, vec3(0.0, 0.0, 1.0))), uPower);
          gl_FragColor = vec4(uGlowColor * rim * uIntensity * uOpacity, rim * uIntensity * uOpacity);
        }
      `,
      side: THREE.BackSide,
      blending: THREE.AdditiveBlending,
      transparent: true,
      depthWrite: false
    });

    return new THREE.Mesh(geometry, material);
  }

  private createRingsMesh(
    sceneRadius: number,
    ringData: { innerRadiusRatio: number; outerRadiusRatio: number; colorHex: string; opacity: number }
  ): THREE.Mesh {
    const innerR = sceneRadius * ringData.innerRadiusRatio;
    const outerR = sceneRadius * ringData.outerRadiusRatio;

    const ringGeo = new THREE.RingGeometry(innerR, outerR, 128);
    ringGeo.rotateX(Math.PI / 2);

    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 8;
    const ctx = canvas.getContext('2d')!;

    const grad = ctx.createLinearGradient(0, 0, 512, 0);
    grad.addColorStop(0, 'rgba(180, 160, 120, 0.1)');
    grad.addColorStop(0.2, 'rgba(210, 190, 140, 0.9)');
    grad.addColorStop(0.58, 'rgba(230, 210, 160, 0.95)');
    grad.addColorStop(0.64, 'rgba(10, 10, 10, 0.05)');
    grad.addColorStop(0.72, 'rgba(200, 180, 130, 0.8)');
    grad.addColorStop(0.92, 'rgba(190, 170, 120, 0.6)');
    grad.addColorStop(1.0, 'rgba(100, 90, 70, 0.0)');

    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 512, 8);

    const ringTex = new THREE.CanvasTexture(canvas);

    const ringMat = new THREE.MeshStandardMaterial({
      map: ringTex,
      color: new THREE.Color(ringData.colorHex),
      side: THREE.DoubleSide,
      transparent: true,
      opacity: ringData.opacity,
      roughness: 0.6
    });

    return new THREE.Mesh(ringGeo, ringMat);
  }

  private createFloatingLabel(text: string): THREE.Sprite {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 64;
    const ctx = canvas.getContext('2d')!;

    ctx.font = '500 22px "Cormorant Garamond", "Palatino Linotype", serif';
    ctx.fillStyle = '#ece8e0';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.shadowColor = 'rgba(0, 0, 0, 0.85)';
    ctx.shadowBlur = 8;
    ctx.fillText(text, 128, 32);

    const texture = new THREE.CanvasTexture(canvas);
    const spriteMat = new THREE.SpriteMaterial({
      map: texture,
      transparent: true,
      depthTest: false
    });

    const sprite = new THREE.Sprite(spriteMat);
    sprite.scale.set(2.8, 0.7, 1);
    return sprite;
  }

  private createMoons(): void {
    this.data.moons.forEach((moon: MoonData, idx: number) => {
      const moonRadiusScene = Math.max(0.12, 0.25 * (moon.radiusKm / 1737));
      const orbitDistance = this.sceneRadius * (1.9 + idx * 0.85);

      const canvas = document.createElement('canvas');
      canvas.width = 256;
      canvas.height = 128;
      const ctx = canvas.getContext('2d')!;
      ctx.fillStyle = moon.colorHex;
      ctx.fillRect(0, 0, 256, 128);
      ctx.fillStyle = 'rgba(40, 40, 40, 0.35)';
      for (let i = 0; i < 30; i++) {
        ctx.beginPath();
        ctx.arc(Math.random() * 256, Math.random() * 128, 2 + Math.random() * 6, 0, Math.PI * 2);
        ctx.fill();
      }

      const moonTex = new THREE.CanvasTexture(canvas);

      const moonGeo = new THREE.SphereGeometry(moonRadiusScene, 24, 24);
      const moonMat = new THREE.MeshStandardMaterial({
        map: moonTex,
        roughness: 0.85
      });

      const moonMesh = new THREE.Mesh(moonGeo, moonMat);
      moonMesh.position.set(orbitDistance, 0, 0);
      // Las lunas orbitan en el plano ecuatorial del planeta (grupo de inclinación axial),
      // como en el sistema real: las órbitas lunares están cerca del ecuador planetario.
      this.axialTiltGroup.add(moonMesh);
      // Las lunas proyectan sombra sobre el planeta y la reciben del Sol
      moonMesh.castShadow = true;
      moonMesh.receiveShadow = true;

      this.moonMeshes.push({
        mesh: moonMesh,
        orbitRadius: orbitDistance,
        periodDays: moon.orbitalPeriodDays,
        angle: Math.random() * Math.PI * 2
      });
    });
  }

  private generateEarthCloudsTexture(): THREE.CanvasTexture {
    const canvas = document.createElement('canvas');
    canvas.width = 1024;
    canvas.height = 512;
    const ctx = canvas.getContext('2d')!;

    ctx.clearRect(0, 0, 1024, 512);
    ctx.fillStyle = 'rgba(255, 255, 255, 0.78)';

    for (let i = 0; i < 60; i++) {
      const cx = Math.random() * 1024;
      const cy = 60 + Math.random() * 390;
      const rx = 40 + Math.random() * 120;
      const ry = 10 + Math.random() * 30;
      const rot = (Math.random() - 0.5) * 0.6;

      ctx.beginPath();
      ctx.ellipse(cx, cy, rx, ry, rot, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.strokeStyle = 'rgba(255, 255, 255, 0.85)';
    ctx.lineWidth = 6;
    ctx.beginPath();
    for (let a = 0; a < Math.PI * 4; a += 0.1) {
      const r = a * 6;
      const x = 320 + Math.cos(a) * r;
      const y = 220 + Math.sin(a) * r;
      if (a === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();

    return new THREE.CanvasTexture(canvas);
  }

  private generatePhotorealisticTextures(planet: PlanetData): {
    surfaceTex: THREE.CanvasTexture;
    specularTex: THREE.CanvasTexture | null;
  } {
    const canvas = document.createElement('canvas');
    canvas.width = 2048;
    canvas.height = 1024;
    const ctx = canvas.getContext('2d')!;

    const w = canvas.width;
    const h = canvas.height;

    let specularCanvas: HTMLCanvasElement | null = null;

    if (planet.id === 'earth') {
      const oceanGrad = ctx.createLinearGradient(0, 0, 0, h);
      oceanGrad.addColorStop(0, '#0a1d3b');
      oceanGrad.addColorStop(0.3, '#103264');
      oceanGrad.addColorStop(0.5, '#16437e');
      oceanGrad.addColorStop(0.7, '#103264');
      oceanGrad.addColorStop(1, '#0a1d3b');
      ctx.fillStyle = oceanGrad;
      ctx.fillRect(0, 0, w, h);

      ctx.fillStyle = '#1e5f99';
      ctx.beginPath();
      ctx.ellipse(w * 0.27, h * 0.42, w * 0.13, h * 0.32, 0.15, 0, Math.PI * 2);
      ctx.ellipse(w * 0.62, h * 0.42, w * 0.22, h * 0.28, -0.05, 0, Math.PI * 2);
      ctx.fill();

      // Continentes
      ctx.fillStyle = '#9e7b45'; // Sahara
      ctx.beginPath();
      ctx.moveTo(w * 0.52, h * 0.36);
      ctx.bezierCurveTo(w * 0.62, h * 0.34, w * 0.65, h * 0.42, w * 0.62, h * 0.52);
      ctx.bezierCurveTo(w * 0.58, h * 0.64, w * 0.54, h * 0.68, w * 0.52, h * 0.55);
      ctx.closePath();
      ctx.fill();

      ctx.fillStyle = '#2d6032'; // Selvas
      ctx.beginPath();
      ctx.ellipse(w * 0.56, h * 0.54, w * 0.05, h * 0.08, 0, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#3a6c38'; // Europa
      ctx.beginPath();
      ctx.ellipse(w * 0.55, h * 0.28, w * 0.06, h * 0.06, 0.2, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#49733e'; // Asia
      ctx.beginPath();
      ctx.ellipse(w * 0.72, h * 0.28, w * 0.14, h * 0.1, 0, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#3f6938'; // América N
      ctx.beginPath();
      ctx.moveTo(w * 0.2, h * 0.22);
      ctx.bezierCurveTo(w * 0.32, h * 0.2, w * 0.34, h * 0.38, w * 0.24, h * 0.38);
      ctx.closePath();
      ctx.fill();

      ctx.fillStyle = '#225526'; // América S
      ctx.beginPath();
      ctx.moveTo(w * 0.28, h * 0.48);
      ctx.bezierCurveTo(w * 0.36, h * 0.54, w * 0.32, h * 0.72, w * 0.26, h * 0.78);
      ctx.bezierCurveTo(w * 0.24, h * 0.65, w * 0.25, h * 0.52, w * 0.28, h * 0.48);
      ctx.closePath();
      ctx.fill();

      ctx.fillStyle = '#b8773d'; // Australia
      ctx.beginPath();
      ctx.ellipse(w * 0.82, h * 0.68, w * 0.06, h * 0.05, 0, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#f0f8ff'; // Polos
      ctx.fillRect(0, 0, w, h * 0.07);
      ctx.fillRect(0, h * 0.93, w, h * 0.07);

      specularCanvas = document.createElement('canvas');
      specularCanvas.width = 512;
      specularCanvas.height = 256;
      const sCtx = specularCanvas.getContext('2d')!;
      sCtx.fillStyle = '#000000';
      sCtx.fillRect(0, 0, 512, 256);
      sCtx.fillStyle = '#ffffff';
      sCtx.beginPath();
      sCtx.ellipse(135, 110, 60, 70, 0.1, 0, Math.PI * 2);
      sCtx.ellipse(320, 110, 110, 70, 0, 0, Math.PI * 2);
      sCtx.fill();
    } else if (planet.id === 'mercury') {
      ctx.fillStyle = '#7a7674';
      ctx.fillRect(0, 0, w, h);

      ctx.fillStyle = '#54504e';
      for (let i = 0; i < 20; i++) {
        ctx.beginPath();
        ctx.ellipse(Math.random() * w, Math.random() * h, 60 + Math.random() * 120, 40 + Math.random() * 80, 0, 0, Math.PI * 2);
        ctx.fill();
      }

      for (let i = 0; i < 500; i++) {
        const cx = Math.random() * w;
        const cy = Math.random() * h;
        const cr = 3 + Math.random() * 22;

        ctx.fillStyle = '#383432';
        ctx.beginPath();
        ctx.arc(cx, cy, cr, 0, Math.PI * 2);
        ctx.fill();

        ctx.strokeStyle = '#c4c0be';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(cx, cy, cr, Math.PI * 0.8, Math.PI * 1.8);
        ctx.stroke();
      }
    } else if (planet.id === 'venus') {
      const vGrad = ctx.createLinearGradient(0, 0, 0, h);
      vGrad.addColorStop(0, '#c7ab76');
      vGrad.addColorStop(0.2, '#d6be8c');
      vGrad.addColorStop(0.5, '#e4cca0');
      vGrad.addColorStop(0.8, '#d6be8c');
      vGrad.addColorStop(1, '#c7ab76');
      ctx.fillStyle = vGrad;
      ctx.fillRect(0, 0, w, h);

      ctx.fillStyle = 'rgba(160, 130, 80, 0.25)';
      for (let i = 0; i < 25; i++) {
        const y = Math.random() * h;
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.bezierCurveTo(w * 0.3, y - 20, w * 0.7, y + 20, w, y);
        ctx.lineTo(w, y + 25);
        ctx.bezierCurveTo(w * 0.7, y + 45, w * 0.3, y + 5, 0, y + 25);
        ctx.closePath();
        ctx.fill();
      }
    } else if (planet.id === 'mars') {
      const mGrad = ctx.createLinearGradient(0, 0, 0, h);
      mGrad.addColorStop(0, '#a64426');
      mGrad.addColorStop(0.5, '#c95e3a');
      mGrad.addColorStop(1, '#a64426');
      ctx.fillStyle = mGrad;
      ctx.fillRect(0, 0, w, h);

      ctx.fillStyle = '#5e2e1c';
      ctx.beginPath();
      ctx.ellipse(w * 0.48, h * 0.52, w * 0.08, h * 0.12, 0.4, 0, Math.PI * 2);
      ctx.ellipse(w * 0.78, h * 0.62, w * 0.12, h * 0.08, -0.2, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, w, h * 0.06);
      ctx.fillRect(0, h * 0.94, w, h * 0.06);
    } else if (planet.id === 'jupiter') {
      const bands = [
        '#6a3a1a', '#b57948', '#dfc4a2', '#8c4820', '#ebd2b2',
        '#a85c2c', '#dfc4a2', '#783818', '#c98a58', '#4d2610'
      ];
      const bh = h / bands.length;
      bands.forEach((color, idx) => {
        ctx.fillStyle = color;
        ctx.fillRect(0, idx * bh, w, bh);
      });

      for (let i = 0; i < 200; i++) {
        ctx.fillStyle = i % 2 === 0 ? 'rgba(255, 235, 210, 0.3)' : 'rgba(90, 40, 10, 0.35)';
        ctx.fillRect(Math.random() * w, Math.random() * h, 80 + Math.random() * 200, 4 + Math.random() * 10);
      }

      const spotX = w * 0.55;
      const spotY = h * 0.65;
      ctx.fillStyle = '#ad341b';
      ctx.beginPath();
      ctx.ellipse(spotX, spotY, 90, 55, 0, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#de6b4b';
      ctx.beginPath();
      ctx.ellipse(spotX, spotY, 55, 32, 0, 0, Math.PI * 2);
      ctx.fill();
    } else if (planet.id === 'saturn') {
      const saturnBands = ['#c7b278', '#d6c38a', '#e8d7a4', '#bfa768', '#dfce98', '#ad9552'];
      const bh = h / saturnBands.length;
      saturnBands.forEach((c, idx) => {
        ctx.fillStyle = c;
        ctx.fillRect(0, idx * bh, w, bh);
      });
    } else if (planet.id === 'uranus') {
      const uGrad = ctx.createLinearGradient(0, 0, 0, h);
      uGrad.addColorStop(0, '#66b8c4');
      uGrad.addColorStop(0.5, '#99e0ea');
      uGrad.addColorStop(1, '#66b8c4');
      ctx.fillStyle = uGrad;
      ctx.fillRect(0, 0, w, h);
    } else if (planet.id === 'neptune') {
      const nGrad = ctx.createLinearGradient(0, 0, 0, h);
      nGrad.addColorStop(0, '#1c3da6');
      nGrad.addColorStop(0.5, '#3b62db');
      nGrad.addColorStop(1, '#1c3da6');
      ctx.fillStyle = nGrad;
      ctx.fillRect(0, 0, w, h);

      ctx.fillStyle = '#0f246b';
      ctx.beginPath();
      ctx.ellipse(w * 0.45, h * 0.42, 70, 35, 0, 0, Math.PI * 2);
      ctx.fill();
    } else if (planet.id === 'pluto') {
      // Plutón: Terreno de tolinas rojizo-ocre con el corazón de nitrógeno brillante (Sputnik Planitia)
      ctx.fillStyle = '#9e6d4e';
      ctx.fillRect(0, 0, w, h);

      // Cthulhu Macula (mancha ecuatorial oscura)
      ctx.fillStyle = '#422416';
      ctx.beginPath();
      ctx.ellipse(w * 0.35, h * 0.55, w * 0.25, h * 0.14, 0.05, 0, Math.PI * 2);
      ctx.fill();

      // Tombaugh Regio / Sputnik Planitia (El Corazón blanco-crema brillante)
      ctx.fillStyle = '#faeee1';
      ctx.beginPath();
      // Lóbulo izquierdo del corazón
      ctx.arc(w * 0.56, h * 0.44, 110, 0, Math.PI * 2);
      // Lóbulo derecho
      ctx.arc(w * 0.65, h * 0.46, 85, 0, Math.PI * 2);
      ctx.fill();

      // Celdas de nitrógeno suave
      ctx.strokeStyle = 'rgba(210, 180, 150, 0.4)';
      ctx.lineWidth = 2;
      for (let i = 0; i < 15; i++) {
        ctx.beginPath();
        ctx.arc(w * 0.55 + (Math.random() - 0.5) * 120, h * 0.45 + (Math.random() - 0.5) * 80, 15 + Math.random() * 20, 0, Math.PI * 2);
        ctx.stroke();
      }
    } else if (planet.id === 'ceres') {
      // Ceres: Gris oscuro con el cráter Occator y sus manchas blancas de carbonato de sodio
      ctx.fillStyle = '#6b6764';
      ctx.fillRect(0, 0, w, h);

      ctx.fillStyle = '#4a4643';
      for (let i = 0; i < 80; i++) {
        ctx.beginPath();
        ctx.arc(Math.random() * w, Math.random() * h, 5 + Math.random() * 25, 0, Math.PI * 2);
        ctx.fill();
      }

      // Cráter Occator y Facula brillante central
      ctx.fillStyle = '#22201e';
      ctx.beginPath();
      ctx.arc(w * 0.48, h * 0.42, 35, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(w * 0.48, h * 0.42, 8, 0, Math.PI * 2);
      ctx.fill();
    } else if (planet.id === 'haumea') {
      // Haumea: Hielo de agua cristalino blanco-azulado con una mancha roja mineral
      ctx.fillStyle = '#e4ebf5';
      ctx.fillRect(0, 0, w, h);

      ctx.fillStyle = '#bcc8d6';
      for (let i = 0; i < 30; i++) {
        ctx.fillRect(0, Math.random() * h, w, 8 + Math.random() * 20);
      }

      // Mancha roja oscura rica en minerales
      ctx.fillStyle = '#8f382c';
      ctx.beginPath();
      ctx.ellipse(w * 0.42, h * 0.48, 50, 30, 0.3, 0, Math.PI * 2);
      ctx.fill();
    } else if (planet.id === 'makemake') {
      // Makemake: Naranja rojizo uniforme cubierto de hielo de metano
      const mkGrad = ctx.createLinearGradient(0, 0, 0, h);
      mkGrad.addColorStop(0, '#c76e48');
      mkGrad.addColorStop(0.5, '#e08b65');
      mkGrad.addColorStop(1, '#c76e48');
      ctx.fillStyle = mkGrad;
      ctx.fillRect(0, 0, w, h);

      ctx.fillStyle = 'rgba(255, 230, 210, 0.15)';
      for (let i = 0; i < 40; i++) {
        ctx.beginPath();
        ctx.arc(Math.random() * w, Math.random() * h, 10 + Math.random() * 40, 0, Math.PI * 2);
        ctx.fill();
      }
    } else if (planet.id === 'eris') {
      // Eris: Ultrabrillante blanco níveo con ligero tono gélido
      const erisGrad = ctx.createLinearGradient(0, 0, 0, h);
      erisGrad.addColorStop(0, '#dbe7f2');
      erisGrad.addColorStop(0.5, '#f4f8fc');
      erisGrad.addColorStop(1, '#dbe7f2');
      ctx.fillStyle = erisGrad;
      ctx.fillRect(0, 0, w, h);

      ctx.fillStyle = '#ffffff';
      for (let i = 0; i < 60; i++) {
        ctx.beginPath();
        ctx.arc(Math.random() * w, Math.random() * h, 20 + Math.random() * 60, 0, Math.PI * 2);
        ctx.fill();
      }
    } else if (planet.id === 'sedna') {
      // Sedna: Ultra-rojo profundo de tolinas orgánicas milenarias
      const sGrad = ctx.createLinearGradient(0, 0, 0, h);
      sGrad.addColorStop(0, '#781f12');
      sGrad.addColorStop(0.5, '#9e3422');
      sGrad.addColorStop(1, '#781f12');
      ctx.fillStyle = sGrad;
      ctx.fillRect(0, 0, w, h);

      ctx.fillStyle = '#471109';
      for (let i = 0; i < 50; i++) {
        ctx.beginPath();
        ctx.ellipse(Math.random() * w, Math.random() * h, 40 + Math.random() * 80, 20 + Math.random() * 40, 0, 0, Math.PI * 2);
        ctx.fill();
      }
    } else {
      ctx.fillStyle = '#8a847d';
      ctx.fillRect(0, 0, w, h);
    }

    const surfaceTex = new THREE.CanvasTexture(canvas);
    surfaceTex.wrapS = THREE.RepeatWrapping;
    surfaceTex.wrapT = THREE.ClampToEdgeWrapping;

    const specularTex = specularCanvas ? new THREE.CanvasTexture(specularCanvas) : null;

    return { surfaceTex, specularTex };
  }

  public update(deltaDays: number): void {
    const scale = CelestialBody.ROTATION_VISUAL_SCALE;

    // Giro axial del planeta: periodo de rotación NASA en horas.
    // Valores negativos (Venus, Urano, Plutón) giran en sentido retrógrado.
    const spinTurns = ((deltaDays * 24) / this.data.rotationPeriodHours) * scale;
    this.planetMesh.rotation.y += spinTurns * Math.PI * 2;

    // Nubes terrestres: arrastradas por vientos ~15% más rápidos que la superficie
    if (this.cloudsMesh) {
      this.cloudsMesh.rotation.y += spinTurns * Math.PI * 2 * 1.15;
    }

    this.moonMeshes.forEach((moon) => {
      // Revolución orbital: periodo orbital NASA en días (negativo = retrógrada, p. ej. Tritón)
      const angleDelta = ((deltaDays / moon.periodDays) * Math.PI * 2) * scale;
      moon.angle += angleDelta;
      moon.mesh.position.x = Math.cos(moon.angle) * moon.orbitRadius;
      moon.mesh.position.z = Math.sin(moon.angle) * moon.orbitRadius;

      // Rotación propia por acoplamiento de marea (rotación síncrona): la luna siempre
      // muestra la misma cara al planeta. El signo se invierte solo en órbitas retrógradas
      // (Tritón), que también están acopladas por marea a su planeta.
      moon.mesh.rotation.y = -moon.angle;
    });
  }

  public setGeologyCutawayMode(enabled: boolean): void {
    this.planetMesh.visible = !enabled;
    if (this.cloudsMesh) this.cloudsMesh.visible = !enabled;
    this.internalLayers.setVisible(enabled);
    this.geographyPins.setVisible(!enabled);
  }
}
