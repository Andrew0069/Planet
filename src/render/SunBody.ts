import * as THREE from 'three';
import { ThermodynamicsEngine } from '../core/thermodynamics/ThermodynamicsEngine';

const SUN_VERTEX_SHADER = /* glsl */ `
  varying vec3 vObjPos;
  varying vec3 vViewNormal;
  varying vec3 vViewPos;
  void main() {
    vObjPos = position;
    vViewNormal = normalize(normalMatrix * normal);
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    vViewPos = mv.xyz;
    gl_Position = projectionMatrix * mv;
  }
`;

/**
 * Fotosfera procedural: granulación fbm animada, manchas en latitudes bajas y
 * oscurecimiento/enrojecimiento del limbo. Emite en HDR (uGain > 1) para que
 * solo el disco solar supere el umbral del bloom, sin lavar el resto de la escena.
 */
const SUN_FRAGMENT_SHADER = /* glsl */ `
  uniform vec3 uColor;
  uniform float uTime;
  uniform float uGain;
  varying vec3 vObjPos;
  varying vec3 vViewNormal;
  varying vec3 vViewPos;

  float hash(vec3 p) {
    p = fract(p * 0.3183099 + 0.1);
    p *= 17.0;
    return fract(p.x * p.y * p.z * (p.x + p.y + p.z));
  }
  float noise(vec3 x) {
    vec3 i = floor(x);
    vec3 f = fract(x);
    f = f * f * (3.0 - 2.0 * f);
    return mix(
      mix(mix(hash(i), hash(i + vec3(1, 0, 0)), f.x), mix(hash(i + vec3(0, 1, 0)), hash(i + vec3(1, 1, 0)), f.x), f.y),
      mix(mix(hash(i + vec3(0, 0, 1)), hash(i + vec3(1, 0, 1)), f.x), mix(hash(i + vec3(0, 1, 1)), hash(i + vec3(1, 1, 1)), f.x), f.y),
      f.z
    );
  }
  float fbm(vec3 p) {
    float a = 0.5;
    float s = 0.0;
    for (int i = 0; i < 4; i++) {
      s += a * noise(p);
      p = p * 2.03 + 7.1;
      a *= 0.5;
    }
    return s;
  }

  void main() {
    vec3 p = normalize(vObjPos);
    float gran = fbm(p * 11.0 + vec3(0.0, uTime * 0.05, 0.0));
    float cells = fbm(p * 26.0 - vec3(uTime * 0.09));
    float spotBand = 1.0 - smoothstep(0.3, 0.55, abs(p.y));
    float spots = smoothstep(0.66, 0.72, fbm(p * 6.0 + vec3(11.0, uTime * 0.01, 3.0))) * spotBand;

    float surf = 0.34 + 0.78 * gran + 0.4 * (cells - 0.47);
    surf *= 1.0 - 0.7 * spots;

    float mu = clamp(dot(normalize(vViewNormal), normalize(-vViewPos)), 0.0, 1.0);
    float limb = 0.32 + 0.68 * pow(mu, 0.6);
    vec3 limbTint = mix(vec3(1.0, 0.62, 0.34), vec3(1.0), pow(mu, 0.7));

    vec3 hot = mix(uColor, vec3(1.0), 0.15);
    vec3 cool = uColor * vec3(0.95, 0.5, 0.22);
    vec3 col = mix(cool, hot, smoothstep(0.15, 0.95, surf)) * (0.45 + 0.75 * surf);

    gl_FragColor = vec4(col * limbTint * limb * uGain, 1.0);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }
`;

export class SunBody {
  public mesh: THREE.Group;
  public pointLight: THREE.PointLight;
  private coreMesh: THREE.Mesh;
  private coreMaterial: THREE.ShaderMaterial;
  private coronaSprite: THREE.Sprite;
  private raysSprite: THREE.Sprite;
  private readonly sceneRadius: number;

  constructor(sceneRadius: number = 3.6) {
    this.mesh = new THREE.Group();
    this.sceneRadius = sceneRadius;

    // 1. Fotosfera procedural en HDR con oscurecimiento del limbo
    this.coreMaterial = new THREE.ShaderMaterial({
      uniforms: {
        uColor: { value: new THREE.Color(0xfff1d8) },
        uTime: { value: 0 },
        uGain: { value: 1.3 }
      },
      vertexShader: SUN_VERTEX_SHADER,
      fragmentShader: SUN_FRAGMENT_SHADER
    });
    this.coreMesh = new THREE.Mesh(new THREE.SphereGeometry(sceneRadius, 64, 64), this.coreMaterial);
    this.mesh.add(this.coreMesh);

    // 2. Corona: billboard aditivo con caída radial suave que arranca en el limbo
    //    (sustituye a las esferas aditivas planas que saturaban a blanco).
    this.coronaSprite = this.createGlowSprite(sceneRadius * 7.5, SunBody.CORONA_LIMB, false, 0.9);
    this.mesh.add(this.coronaSprite);

    // 3. Rayos coronales tenues, más extensos y con rotación lenta
    this.raysSprite = this.createGlowSprite(sceneRadius * 11, SunBody.RAYS_LIMB, true, 0.3);
    this.mesh.add(this.raysSprite);

    // 4. Luz puntual central
    this.pointLight = new THREE.PointLight(0xfff4d6, 3.2, 4000, 0.04);
    this.mesh.add(this.pointLight);

    // 5. Etiqueta 3D "SOL"
    const label = this.createLabel('SOL');
    label.position.set(0, -sceneRadius * 1.45, 0);
    this.mesh.add(label);

    this.updateTemperature(5778);
  }

  /** Fracción del radio del sprite que ocupa el disco solar. */
  private static readonly CORONA_LIMB = 1 / 3.75;
  private static readonly RAYS_LIMB = 1 / 5.5;

  private createGlowSprite(size: number, limb: number, rays: boolean, opacity: number): THREE.Sprite {
    const res = 256;
    const canvas = document.createElement('canvas');
    canvas.width = res;
    canvas.height = res;
    const ctx = canvas.getContext('2d')!;
    const image = ctx.createImageData(res, res);

    // Perfil angular pseudoaleatorio (suma de armónicos) para los rayos
    const harmonics = Array.from({ length: 7 }, (_, i) => ({
      k: [3, 5, 8, 13, 21, 34, 47][i],
      phase: Math.random() * Math.PI * 2,
      amp: 1 / (1 + i * 0.6)
    }));
    const ampSum = harmonics.reduce((acc, hmc) => acc + hmc.amp, 0);

    for (let y = 0; y < res; y++) {
      for (let x = 0; x < res; x++) {
        const dx = (x + 0.5) / res * 2 - 1;
        const dy = (y + 0.5) / res * 2 - 1;
        const t = Math.hypot(dx, dy);
        const d = Math.max(0, t - limb) / (1 - limb); // 0 en el limbo, 1 en el borde
        const edgeFade = Math.max(0, 1 - d);
        let v: number;
        if (rays) {
          const ang = Math.atan2(dy, dx);
          let n = 0;
          harmonics.forEach((hmc) => { n += hmc.amp * Math.sin(ang * hmc.k + hmc.phase); });
          const streak = Math.pow(0.5 + 0.5 * (n / ampSum), 2.2);
          v = (0.1 + 0.9 * streak) * Math.exp(-d * 4.2) * edgeFade * edgeFade;
        } else {
          v = (0.5 * Math.exp(-d * 12) + 0.12 * Math.exp(-d * 3.4)) * edgeFade * edgeFade;
        }
        const byte = Math.round(255 * Math.min(1, v));
        const o = (y * res + x) * 4;
        image.data[o] = byte;
        image.data[o + 1] = byte;
        image.data[o + 2] = byte;
        image.data[o + 3] = 255;
      }
    }
    ctx.putImageData(image, 0, 0);

    // Textura en espacio lineal: el perfil de caída ya está diseñado en lineal
    const texture = new THREE.CanvasTexture(canvas);
    const material = new THREE.SpriteMaterial({
      map: texture,
      blending: THREE.AdditiveBlending,
      transparent: true,
      opacity,
      depthWrite: false
    });
    const sprite = new THREE.Sprite(material);
    sprite.scale.set(size, size, 1);
    return sprite;
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
    const colorData = ThermodynamicsEngine.getStarColorFromTemp(tempK);
    const threeColor = new THREE.Color(colorData.hex);

    (this.coreMaterial.uniforms.uColor.value as THREE.Color).copy(threeColor);
    this.coronaSprite.material.color.copy(threeColor).lerp(new THREE.Color(0xffffff), 0.25);
    this.raysSprite.material.color.copy(threeColor.clone().offsetHSL(0, 0.15, -0.05));

    const lumRatio = ThermodynamicsEngine.calculateRelativeLuminosity(tempK);
    const lightIntensity = Math.min(7.0, Math.max(0.8, 3.2 * Math.pow(lumRatio, 0.35)));

    this.pointLight.color.copy(threeColor);
    this.pointLight.intensity = lightIntensity;
  }

  public animate(elapsedTime: number): void {
    // Rotación del Sol y evolución de la granulación
    this.coreMesh.rotation.y = elapsedTime * 0.04;
    this.coreMaterial.uniforms.uTime.value = elapsedTime;

    // Pulso sutil de la corona y giro lento de los rayos
    const pulse = 1.0 + Math.sin(elapsedTime * 1.3) * 0.02;
    this.coronaSprite.scale.setScalar(this.sceneRadius * 7.5 * pulse);
    this.raysSprite.material.rotation = elapsedTime * 0.01;
  }

}
