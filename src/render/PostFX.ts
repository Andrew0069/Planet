import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';

/**
 * Postprocesado del observatorio. El compositor se crea de forma diferida para
 * que desactivar bloom también libere sus render targets y evite por completo
 * las pasadas de postprocesado en equipos de bajos recursos.
 */
export class PostFX {
  private readonly renderer: THREE.WebGLRenderer;
  private readonly scene: THREE.Scene;
  private readonly camera: THREE.Camera;
  private composer: EffectComposer | null = null;
  private bloomEnabled: boolean;
  private width: number;
  private height: number;
  private pixelRatio: number;

  private static readonly BLOOM_STRENGTH = 0.34;
  private static readonly BLOOM_RADIUS = 0.72;
  private static readonly BLOOM_THRESHOLD = 1.0;

  constructor(
    renderer: THREE.WebGLRenderer,
    scene: THREE.Scene,
    camera: THREE.Camera,
    bloomEnabled = true
  ) {
    this.renderer = renderer;
    this.scene = scene;
    this.camera = camera;
    this.width = renderer.domElement.clientWidth || window.innerWidth;
    this.height = renderer.domElement.clientHeight || window.innerHeight;
    this.pixelRatio = renderer.getPixelRatio();
    this.bloomEnabled = bloomEnabled;

    if (bloomEnabled) this.createComposer();
  }

  public setBloomEnabled(enabled: boolean): void {
    if (this.bloomEnabled === enabled) return;

    this.bloomEnabled = enabled;
    if (enabled) {
      this.createComposer();
    } else {
      this.disposeComposer();
    }
  }

  public isBloomEnabled(): boolean {
    return this.bloomEnabled;
  }

  public setPixelRatio(pixelRatio: number): void {
    this.pixelRatio = pixelRatio;
    this.composer?.setPixelRatio(pixelRatio);
  }

  public setSize(width: number, height: number): void {
    this.width = width;
    this.height = height;
    this.composer?.setSize(width, height);
  }

  public render(): void {
    if (this.bloomEnabled && this.composer) {
      this.composer.render();
      return;
    }

    this.renderer.render(this.scene, this.camera);
  }

  public dispose(): void {
    this.disposeComposer();
  }

  private createComposer(): void {
    if (this.composer) return;

    // Buffer HDR (half float) con MSAA: el antialias del canvas no se aplica al
    // renderizar a un render target, así que sin `samples` los bordes de planetas
    // y anillos quedaban dentados con el bloom activo.
    const gl = this.renderer.getContext();
    const maxSamples = gl instanceof WebGL2RenderingContext ? gl.getParameter(gl.MAX_SAMPLES) as number : 0;
    const target = new THREE.WebGLRenderTarget(
      Math.max(1, Math.floor(this.width * this.pixelRatio)),
      Math.max(1, Math.floor(this.height * this.pixelRatio)),
      { type: THREE.HalfFloatType, samples: Math.min(4, maxSamples) }
    );
    const composer = new EffectComposer(this.renderer, target);
    composer.setPixelRatio(this.pixelRatio);
    composer.setSize(this.width, this.height);
    composer.addPass(new RenderPass(this.scene, this.camera));

    // Bloom selectivo por umbral HDR: el pipeline es lineal hasta OutputPass, de
    // modo que con umbral ≈ 1.0 solo florecen el disco solar (emite > 1) y los
    // reflejos especulares intensos; los planetas iluminados no se lavan.
    const bloomResolution = new THREE.Vector2(
      Math.max(1, Math.floor(this.width / 2)),
      Math.max(1, Math.floor(this.height / 2))
    );
    const bloomPass = new UnrealBloomPass(
      bloomResolution,
      PostFX.BLOOM_STRENGTH,
      PostFX.BLOOM_RADIUS,
      PostFX.BLOOM_THRESHOLD
    );
    composer.addPass(bloomPass);
    // OutputPass: tone mapping ACES + conversión a sRGB, una sola vez al final
    composer.addPass(new OutputPass());
    this.composer = composer;
  }

  private disposeComposer(): void {
    this.composer?.dispose();
    this.composer = null;
  }
}
