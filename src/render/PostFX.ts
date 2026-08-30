import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';

/**
 * Postprocesado del observatorio:
 * - UnrealBloomPass: las fuentes brillantes (Sol, atmósferas, etiquetas) emiten
 *   un halo cinematográfico por encima del umbral de luminancia.
 * - OutputPass: aplica el tone mapping ACES y la corrección sRGB al resultado
 *   final, preservando el pipeline de color del renderer.
 */
export class PostFX {
  public readonly composer: EffectComposer;
  public readonly bloomPass: UnrealBloomPass;

  constructor(renderer: THREE.WebGLRenderer, scene: THREE.Scene, camera: THREE.Camera) {
    const width = renderer.domElement.clientWidth || window.innerWidth;
    const height = renderer.domElement.clientHeight || window.innerHeight;

    this.composer = new EffectComposer(renderer);
    this.composer.addPass(new RenderPass(scene, camera));

    this.bloomPass = new UnrealBloomPass(new THREE.Vector2(width, height), 0.55, 0.6, 0.82);
    this.composer.addPass(this.bloomPass);

    this.composer.addPass(new OutputPass());
  }

  public setSize(width: number, height: number): void {
    this.composer.setSize(width, height);
  }

  public render(): void {
    this.composer.render();
  }

  public dispose(): void {
    this.composer.dispose();
  }
}
