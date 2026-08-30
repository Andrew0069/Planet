import * as THREE from 'three';
import { ThermodynamicsEngine } from '../core/thermodynamics/ThermodynamicsEngine';

export class SunBody {
  public mesh: THREE.Group;
  public pointLight: THREE.PointLight;
  private coreMesh: THREE.Mesh;
  private coronaMesh: THREE.Mesh;
  private outerGlowMesh: THREE.Mesh;
  private flareRaysMesh: THREE.Mesh;
  private plasmaTextureCanvas: HTMLCanvasElement;
  private plasmaTexture: THREE.CanvasTexture;
  private plasmaCtx: CanvasRenderingContext2D;

  constructor(sceneRadius: number = 3.6) {
    this.mesh = new THREE.Group();

    // 1. Canvas para textura dinámica de plasma solar de alta resolución
    this.plasmaTextureCanvas = document.createElement('canvas');
    this.plasmaTextureCanvas.width = 1024;
    this.plasmaTextureCanvas.height = 512;
    this.plasmaCtx = this.plasmaTextureCanvas.getContext('2d')!;
    this.renderSolarSurface(5778);

    this.plasmaTexture = new THREE.CanvasTexture(this.plasmaTextureCanvas);
    this.plasmaTexture.wrapS = THREE.RepeatWrapping;
    this.plasmaTexture.wrapT = THREE.ClampToEdgeWrapping;

    // 2. Núcleo principal del Sol con textura de plasma y brillo autoemisisvo
    const coreGeo = new THREE.SphereGeometry(sceneRadius, 64, 64);
    const coreMat = new THREE.MeshBasicMaterial({
      map: this.plasmaTexture,
      color: 0xffffff
    });
    this.coreMesh = new THREE.Mesh(coreGeo, coreMat);
    this.mesh.add(this.coreMesh);

    // 3. Corona interna turbulenta
    const coronaGeo = new THREE.SphereGeometry(sceneRadius * 1.12, 48, 48);
    const coronaMat = new THREE.MeshBasicMaterial({
      color: 0xffaa22,
      transparent: true,
      opacity: 0.55,
      blending: THREE.AdditiveBlending,
      side: THREE.BackSide
    });
    this.coronaMesh = new THREE.Mesh(coronaGeo, coronaMat);
    this.mesh.add(this.coronaMesh);

    // 4. Resplandor exterior (Aura estelar)
    const glowGeo = new THREE.SphereGeometry(sceneRadius * 1.45, 32, 32);
    const glowMat = new THREE.MeshBasicMaterial({
      color: 0xff5500,
      transparent: true,
      opacity: 0.3,
      blending: THREE.AdditiveBlending,
      side: THREE.BackSide
    });
    this.outerGlowMesh = new THREE.Mesh(glowGeo, glowMat);
    this.mesh.add(this.outerGlowMesh);

    // 5. Destello de rayos solares y llamaradas
    const flareGeo = new THREE.PlaneGeometry(sceneRadius * 3.8, sceneRadius * 3.8);
    const flareTex = this.createSolarFlareTexture();
    const flareMat = new THREE.MeshBasicMaterial({
      map: flareTex,
      transparent: true,
      opacity: 0.65,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      side: THREE.DoubleSide
    });
    this.flareRaysMesh = new THREE.Mesh(flareGeo, flareMat);
    this.mesh.add(this.flareRaysMesh);

    // 6. Luz puntual central
    this.pointLight = new THREE.PointLight(0xfff4d6, 3.2, 4000, 0.04);
    this.mesh.add(this.pointLight);

    // 7. Etiqueta 3D "SOL"
    const label = this.createLabel('SOL');
    label.position.set(0, -sceneRadius * 1.45, 0);
    this.mesh.add(label);

    this.updateTemperature(5778);
  }

  private createSolarFlareTexture(): THREE.CanvasTexture {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext('2d')!;

    const cx = 256;
    const cy = 256;
    const grad = ctx.createRadialGradient(cx, cy, 20, cx, cy, 250);
    grad.addColorStop(0, 'rgba(255, 255, 240, 1.0)');
    grad.addColorStop(0.2, 'rgba(255, 180, 50, 0.8)');
    grad.addColorStop(0.5, 'rgba(255, 80, 10, 0.3)');
    grad.addColorStop(1, 'rgba(255, 30, 0, 0)');

    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 512, 512);

    // Rayos de llamarada
    ctx.strokeStyle = 'rgba(255, 230, 150, 0.35)';
    ctx.lineWidth = 3;
    for (let i = 0; i < 24; i++) {
      const angle = (i / 24) * Math.PI * 2;
      const len = 140 + Math.random() * 110;
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.lineTo(cx + Math.cos(angle) * len, cy + Math.sin(angle) * len);
      ctx.stroke();
    }

    return new THREE.CanvasTexture(canvas);
  }

  private renderSolarSurface(tempK: number): void {
    const w = this.plasmaTextureCanvas.width;
    const h = this.plasmaTextureCanvas.height;
    const ctx = this.plasmaCtx;

    const colorData = ThermodynamicsEngine.getStarColorFromTemp(tempK);
    const baseColor = new THREE.Color(colorData.hex);

    // Fondo base de la fotosfera
    ctx.fillStyle = colorData.hex;
    ctx.fillRect(0, 0, w, h);

    // Granulación y celdas convectivas solares (plasma turbulento)
    const granColor1 = baseColor.clone().offsetHSL(0, 0.2, -0.15).getStyle();
    const granColor2 = baseColor.clone().offsetHSL(0, 0.3, 0.2).getStyle();
    const darkSpotColor = baseColor.clone().offsetHSL(0, -0.2, -0.45).getStyle();

    // Capa de turbulencias y filamentos
    for (let i = 0; i < 400; i++) {
      const x = Math.random() * w;
      const y = Math.random() * h;
      const rx = 10 + Math.random() * 40;
      const ry = 6 + Math.random() * 25;
      const rot = Math.random() * Math.PI;

      ctx.fillStyle = i % 2 === 0 ? granColor1 : granColor2;
      ctx.beginPath();
      ctx.ellipse(x, y, rx, ry, rot, 0, Math.PI * 2);
      ctx.fill();
    }

    // Manchas solares (zonas magnéticas más frías)
    ctx.fillStyle = darkSpotColor;
    for (let i = 0; i < 16; i++) {
      const sx = Math.random() * w;
      const sy = h * 0.3 + Math.random() * (h * 0.4);
      const sr = 6 + Math.random() * 14;
      ctx.beginPath();
      ctx.arc(sx, sy, sr, 0, Math.PI * 2);
      ctx.fill();

      // Penumbra de la mancha
      ctx.strokeStyle = granColor1;
      ctx.lineWidth = 4;
      ctx.stroke();
    }

    if (this.plasmaTexture) {
      this.plasmaTexture.needsUpdate = true;
    }
  }

  private createLabel(text: string): THREE.Sprite {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 64;
    const ctx = canvas.getContext('2d')!;

    ctx.fillStyle = 'rgba(8, 14, 28, 0.75)';
    ctx.strokeStyle = 'rgba(255, 200, 50, 0.6)';
    ctx.lineWidth = 2;
    ctx.roundRect(16, 10, 224, 44, 8);
    ctx.fill();
    ctx.stroke();

    ctx.font = 'bold 22px "Segoe UI", Arial, sans-serif';
    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.shadowColor = 'rgba(255, 180, 50, 0.9)';
    ctx.shadowBlur = 8;
    ctx.fillText(text, 128, 32);

    const texture = new THREE.CanvasTexture(canvas);
    const spriteMat = new THREE.SpriteMaterial({
      map: texture,
      transparent: true,
      depthTest: false
    });

    const sprite = new THREE.Sprite(spriteMat);
    sprite.scale.set(3.8, 0.95, 1);
    return sprite;
  }

  public updateTemperature(tempK: number): void {
    this.renderSolarSurface(tempK);

    const colorData = ThermodynamicsEngine.getStarColorFromTemp(tempK);
    const threeColor = new THREE.Color(colorData.hex);

    const coronaColor = threeColor.clone().offsetHSL(0, 0.25, -0.1);
    (this.coronaMesh.material as THREE.MeshBasicMaterial).color.copy(coronaColor);

    const glowColor = threeColor.clone().offsetHSL(0, 0.35, -0.2);
    (this.outerGlowMesh.material as THREE.MeshBasicMaterial).color.copy(glowColor);

    const lumRatio = ThermodynamicsEngine.calculateRelativeLuminosity(tempK);
    const lightIntensity = Math.min(7.0, Math.max(0.8, 3.2 * Math.pow(lumRatio, 0.35)));

    this.pointLight.color.copy(threeColor);
    this.pointLight.intensity = lightIntensity;
  }

  public animate(elapsedTime: number, camera?: THREE.Camera): void {
    // Rotación diferencial del Sol
    this.coreMesh.rotation.y = elapsedTime * 0.04;
    this.coronaMesh.rotation.y = -elapsedTime * 0.02;

    // Sutil pulso en la corona solar
    const pulse = 1.0 + Math.sin(elapsedTime * 2.5) * 0.035;
    this.coronaMesh.scale.set(pulse, pulse, pulse);

    const glowPulse = 1.0 + Math.cos(elapsedTime * 1.8) * 0.05;
    this.outerGlowMesh.scale.set(glowPulse, glowPulse, glowPulse);

    // Alinear el destello 2D hacia la cámara
    if (camera) {
      this.flareRaysMesh.quaternion.copy(camera.quaternion);
    }
  }

}
