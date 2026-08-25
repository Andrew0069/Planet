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

function configureMap(tex: THREE.Texture): THREE.Texture {
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
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
    material.needsUpdate = true;
  });
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
    const alphaTex = new THREE.CanvasTexture(canvas);
    alphaTex.colorSpace = THREE.SRGBColorSpace;
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
  });
}
