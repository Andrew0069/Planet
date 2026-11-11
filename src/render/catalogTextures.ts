import * as THREE from "three";

const PLANET_MAPS: Record<string, string> = {
  mercury: "/textures/planets/mercury.jpg",
  venus: "/textures/planets/venus.jpg",
  earth: "/textures/planets/earth.jpg",
  mars: "/textures/planets/mars.jpg",
  jupiter: "/textures/planets/jupiter.jpg",
  saturn: "/textures/planets/saturn.jpg",
  uranus: "/textures/planets/uranus.jpg",
  neptune: "/textures/planets/neptune.jpg",
  pluto: "/textures/planets/pluto.jpg",
};

let textureAnisotropy = 8;

/**
 * Fija la anisotropía de las texturas de superficie según la capacidad real de
 * la GPU (`renderer.capabilities.getMaxAnisotropy()`). Llamar antes de crear los cuerpos.
 */
export function setTextureAnisotropy(maxSupported: number): void {
  textureAnisotropy = Math.max(1, Math.min(16, maxSupported));
}

/** Configura una textura de color (sRGB) con filtrado trilineal + anisotrópico. */
export function configureColorTexture<T extends THREE.Texture>(tex: T): T {
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = textureAnisotropy;
  tex.minFilter = THREE.LinearMipmapLinearFilter;
  tex.magFilter = THREE.LinearFilter;
  tex.generateMipmaps = true;
  tex.needsUpdate = true;
  return tex;
}

function configureMap(tex: THREE.Texture): THREE.Texture {
  configureColorTexture(tex);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.ClampToEdgeWrapping;
  tex.needsUpdate = true;
  return tex;
}

export function applyCatalogTexture(
  planetId: string,
  material: THREE.MeshStandardMaterial,
): void {
  const url = PLANET_MAPS[planetId];
  if (!url) return;
  const loader = new THREE.TextureLoader();
  loader.setCrossOrigin("anonymous");
  loader.load(url, (tex) => {
    material.map = configureMap(tex);
    if (planetId === "earth") applyOceanRoughness(tex, material);
    material.needsUpdate = true;
  });
}

/**
 * Deriva un mapa de rugosidad del propio mapa de color de la Tierra: océanos
 * (azul oscuro dominante) pulidos → reflejo especular del Sol; tierra y hielo mates.
 */
function applyOceanRoughness(
  colorTex: THREE.Texture,
  material: THREE.MeshStandardMaterial,
): void {
  const image = colorTex.image as HTMLImageElement | undefined;
  if (!image) return;
  const canvas = document.createElement("canvas");
  canvas.width = 1024;
  canvas.height = 512;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) return;
  ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
  const data = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const px = data.data;
  for (let i = 0; i < px.length; i += 4) {
    const r = px[i];
    const g = px[i + 1];
    const b = px[i + 2];
    const ocean = b > r * 1.25 && b > g * 1.05 && r + g + b < 330;
    // roughnessMap lee el canal verde (× material.roughness = 1)
    const rough = ocean ? 105 : 235;
    px[i] = rough;
    px[i + 1] = rough;
    px[i + 2] = rough;
    px[i + 3] = 255;
  }
  ctx.putImageData(data, 0, 0);
  const roughTex = new THREE.CanvasTexture(canvas);
  roughTex.wrapS = THREE.RepeatWrapping;
  roughTex.wrapT = THREE.ClampToEdgeWrapping;
  roughTex.anisotropy = textureAnisotropy;
  material.roughnessMap = roughTex;
  material.roughness = 1.0;
}

export function applyEarthClouds(
  material: THREE.MeshStandardMaterial,
): void {
  const loader = new THREE.TextureLoader();
  loader.setCrossOrigin("anonymous");
  loader.load("/textures/planets/earth-clouds.jpg", (tex) => {
    const image = tex.image as HTMLImageElement | undefined;
    if (!image) {
      material.map = configureMap(tex);
      material.needsUpdate = true;
      return;
    }
    const canvas = document.createElement("canvas");
    canvas.width = image.width;
    canvas.height = image.height;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.drawImage(image, 0, 0);
    const data = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const px = data.data;
    for (let i = 0; i < px.length; i += 4) {
      const lum = (px[i] + px[i + 1] + px[i + 2]) / 3;
      px[i] = 255;
      px[i + 1] = 255;
      px[i + 2] = 255;
      px[i + 3] = Math.min(255, lum * 1.35);
    }
    ctx.putImageData(data, 0, 0);
    const alphaTex = configureColorTexture(new THREE.CanvasTexture(canvas));
    alphaTex.wrapS = THREE.RepeatWrapping;
    alphaTex.wrapT = THREE.ClampToEdgeWrapping;
    material.map = alphaTex;
    material.transparent = true;
    material.needsUpdate = true;
  });
}

export function applyMilkyWaySky(scene: THREE.Scene): void {
  const loader = new THREE.TextureLoader();
  loader.setCrossOrigin("anonymous");
  loader.load("/textures/sky/milky-way.jpg", (tex) => {
    tex.mapping = THREE.EquirectangularReflectionMapping;
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.needsUpdate = true;
    scene.background = tex;
    // El mapa (2K) trae estrellas horneadas que al ampliarse se ven como bloques:
    // se desenfoca levemente y se atenúa para dejar solo la nebulosidad galáctica;
    // las estrellas nítidas las aporta el campo procedural de SceneManager.
    scene.backgroundBlurriness = 0.07;
    scene.backgroundIntensity = 0.6;
  });
}
