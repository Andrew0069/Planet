import * as THREE from 'three';
import { KerrGeometry } from '../core/relativity/KerrEngine';

const vertexShader = `
  void main() { gl_Position = vec4(position, 1.0); }
`;

const fragmentShader = `
  precision highp float;
  uniform vec2 uResolution;
  uniform float uSpin;
  uniform float uHorizon;
  uniform float uIsco;
  uniform float uInclination;

  float hash(vec2 p) {
    p = fract(p * vec2(123.34, 456.21));
    p += dot(p, p + 45.32);
    return fract(p.x * p.y);
  }

  void main() {
    vec2 uv = (2.0 * gl_FragCoord.xy - uResolution.xy) / min(uResolution.x, uResolution.y);
    float r = length(uv);
    float frameDrag = uSpin * 0.16 / max(0.18, r * r);
    float angle = atan(uv.y, uv.x) + frameDrag;
    float bend = 0.22 / max(0.08, r);
    vec2 lensed = vec2(cos(angle + bend), sin(angle + bend)) * (r + bend * 0.22);

    vec3 color = vec3(0.004, 0.008, 0.022);
    vec2 starCell = floor(lensed * 150.0);
    float star = step(0.996, hash(starCell));
    color += star * vec3(0.65, 0.78, 1.0) * (0.4 + hash(starCell + 2.0));

    float inclinationScale = mix(0.16, 0.58, cos(uInclination) * 0.5 + 0.5);
    float diskR = length(vec2(uv.x, uv.y / max(0.12, inclinationScale)));
    float innerDisk = uIsco * 0.035;
    float outerDisk = 0.78;
    float diskMask = smoothstep(innerDisk - 0.015, innerDisk + 0.015, diskR) * (1.0 - smoothstep(outerDisk - 0.04, outerDisk, diskR));
    float turbulence = 0.65 + 0.35 * sin(diskR * 120.0 - angle * 8.0 + hash(starCell) * 3.0);
    float doppler = clamp(1.0 + 0.72 * uv.x / max(0.15, diskR) * sin(uInclination), 0.28, 1.8);
    vec3 diskColor = mix(vec3(0.9, 0.12, 0.025), vec3(1.0, 0.88, 0.48), clamp(doppler - 0.25, 0.0, 1.0));
    color += diskColor * diskMask * turbulence * doppler;

    float shadowR = uHorizon * 0.055;
    float photonRing = exp(-abs(r - shadowR * 1.55) * 130.0);
    color += vec3(1.0, 0.46, 0.12) * photonRing * 0.8;
    color *= smoothstep(shadowR, shadowR + 0.012, r);
    float vignette = smoothstep(1.45, 0.25, r);
    color *= 0.45 + 0.75 * vignette;
    gl_FragColor = vec4(color, 1.0);
  }
`;

export class KerrRenderer {
  private readonly renderer: THREE.WebGLRenderer;
  private readonly material: THREE.ShaderMaterial;
  private readonly scene = new THREE.Scene();
  private readonly camera = new THREE.Camera();
  private readonly resizeObserver: ResizeObserver;

  constructor(private readonly canvas: HTMLCanvasElement) {
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: false, powerPreference: 'high-performance' });
    this.material = new THREE.ShaderMaterial({
      vertexShader,
      fragmentShader,
      depthTest: false,
      depthWrite: false,
      uniforms: {
        uResolution: { value: new THREE.Vector2(1, 1) },
        uSpin: { value: 0 },
        uHorizon: { value: 2 },
        uIsco: { value: 6 },
        uInclination: { value: Math.PI / 3 }
      }
    });
    this.scene.add(new THREE.Mesh(new THREE.PlaneGeometry(2, 2), this.material));
    this.resizeObserver = new ResizeObserver(() => this.resize());
    this.resizeObserver.observe(canvas);
    this.resize();
  }

  public render(spin: number, inclination: number, geometry: KerrGeometry): void {
    this.material.uniforms.uSpin.value = spin;
    this.material.uniforms.uInclination.value = inclination;
    this.material.uniforms.uHorizon.value = geometry.horizonOuterRg;
    this.material.uniforms.uIsco.value = geometry.iscoProgradeRg;
    this.renderer.render(this.scene, this.camera);
  }

  public dispose(): void {
    this.resizeObserver.disconnect();
    this.material.dispose();
    this.renderer.dispose();
  }

  private resize(): void {
    const width = Math.max(1, this.canvas.clientWidth);
    const height = Math.max(1, this.canvas.clientHeight);
    const ratio = Math.min(devicePixelRatio, 1.5);
    this.renderer.setPixelRatio(ratio);
    this.renderer.setSize(width, height, false);
    this.material.uniforms.uResolution.value.set(width * ratio, height * ratio);
    this.renderer.render(this.scene, this.camera);
  }
}
