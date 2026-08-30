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

    const composer = new EffectComposer(this.renderer);
    composer.setPixelRatio(this.pixelRatio);
    composer.setSize(this.width, this.height);
    composer.addPass(new RenderPass(this.scene, this.camera));

    const bloomResolution = new THREE.Vector2(
      Math.max(1, Math.floor(this.width / 2)),
      Math.max(1, Math.floor(this.height / 2))
    );
    const bloomPass = new UnrealBloomPass(
      bloomResolution,
      0.55,
      0.6,
      0.82
    );
    composer.addPass(bloomPass);
    composer.addPass(new OutputPass());
    this.composer = composer;
  }

  private disposeComposer(): void {
    this.composer?.dispose();
    this.composer = null;
  }
}
