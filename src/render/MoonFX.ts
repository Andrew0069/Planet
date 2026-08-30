import * as THREE from 'three';
import { CelestialBody } from './CelestialBody';

/**
 * MoonFX — Capa de mejora gráfica de las lunas.
 *
 * Sustituye la textura plana de color de cada luna por una textura procedural
 * fotorrealista generada en canvas 2D (sin assets externos ni red) según la
 * apariencia real de cada satélite, y añade anillos de órbita sutiles que
 * permiten apreciar la trayectoria de las lunas alrededor de su planeta.
 *
 * Ver GRAPHICS_LAYER.md para el diseño completo de la capa.
 */

const TEXTURE_W = 256;
const TEXTURE_H = 128;

/** Normaliza un nombre para comparar sin tildes ni mayúsculas. */
function normalizeName(name: string): string {
  return name.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
}

/** Lunas de superficie helada (roughness baja, reflejan más luz). */
const ICY_MOONS = new Set(['europa', 'encelado', 'triton', 'miranda', 'hiiaka', 'disnomia', 'caronte']);

export function isIcyMoon(name: string): boolean {
  return ICY_MOONS.has(normalizeName(name));
}

function createCanvas(fill: string): CanvasRenderingContext2D {
  const canvas = document.createElement('canvas');
  canvas.width = TEXTURE_W;
  canvas.height = TEXTURE_H;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = fill;
  ctx.fillRect(0, 0, TEXTURE_W, TEXTURE_H);
  return ctx;
}

/** Ruido fino pseudo-aleatorio para dar textura al regolito/hielo. */
function addNoise(ctx: CanvasRenderingContext2D, alpha: number, size: number, count: number): void {
  for (let i = 0; i < count; i++) {
    ctx.fillStyle = `rgba(${Math.random() > 0.5 ? '255,255,255' : '0,0,0'},${alpha})`;
    ctx.fillRect(Math.random() * TEXTURE_W, Math.random() * TEXTURE_H, size, size);
  }
}

/** Cráteres: relleno oscuro con borde luminoso parcial (efecto relieve). */
function addCraters(
  ctx: CanvasRenderingContext2D,
  count: number,
  minR: number,
  maxR: number,
  fill: string,
  rim: string
): void {
  for (let i = 0; i < count; i++) {
    const x = Math.random() * TEXTURE_W;
    const y = Math.random() * TEXTURE_H;
    const r = minR + Math.random() * (maxR - minR);

    ctx.fillStyle = fill;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = rim;
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.arc(x, y, r, Math.PI * 0.75, Math.PI * 1.85);
    ctx.stroke();
  }
}

/**
 * Genera la textura procedural de cada luna con nombre.
 * La coordenada v=0 del mapa es el polo norte (parte superior del canvas).
 */
function drawMoonTexture(name: string, fallbackHex: string): HTMLCanvasElement {
  const key = normalizeName(name);

  switch (key) {
    case 'luna': {
      // Mares basálticos oscuros + tierras altas claras + cráteres
      const ctx = createCanvas('#a9aab3');
      ctx.fillStyle = '#c6c7cf';
      ctx.fillRect(0, 0, TEXTURE_W, 14);
      ctx.fillRect(0, TEXTURE_H - 14, TEXTURE_W, 14);
      ctx.fillStyle = '#6f707a';
      for (const [mx, my, mw, mh] of [
        [60, 40, 55, 34], [150, 32, 40, 26], [120, 70, 46, 30],
        [200, 62, 34, 24], [40, 88, 40, 26], [190, 95, 44, 26]
      ] as const) {
        ctx.beginPath();
        ctx.ellipse(mx, my, mw, mh, Math.random() * 0.4, 0, Math.PI * 2);
        ctx.fill();
      }
      addCraters(ctx, 26, 2, 7, '#5c5d66', '#d8d9e0');
      addNoise(ctx, 0.08, 2, 260);
      return ctx.canvas;
    }
    case 'fobos': {
      // Gris con estrías/grooves lineales y el cráter Stickney
      const ctx = createCanvas('#8b8075');
      ctx.strokeStyle = 'rgba(90, 80, 70, 0.55)';
      ctx.lineWidth = 1.6;
      for (let i = 0; i < 9; i++) {
        const y = 20 + Math.random() * (TEXTURE_H - 40);
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.bezierCurveTo(TEXTURE_W * 0.33, y - 8, TEXTURE_W * 0.66, y + 8, TEXTURE_W, y);
        ctx.stroke();
      }
      ctx.strokeStyle = 'rgba(190, 180, 168, 0.7)';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.ellipse(TEXTURE_W * 0.62, TEXTURE_H * 0.42, 26, 20, 0.2, 0, Math.PI * 2);
      ctx.stroke();
      addCraters(ctx, 10, 1.5, 5, '#5f574e', '#b0a69a');
      addNoise(ctx, 0.09, 2, 200);
      return ctx.canvas;
    }
    case 'deimos': {
      // Regolito liso y claro, pocos cráteres
      const ctx = createCanvas('#a89f92');
      addCraters(ctx, 7, 1.5, 4.5, '#7d766c', '#cfc7ba');
      addNoise(ctx, 0.1, 2, 220);
      return ctx.canvas;
    }
    case 'io': {
      // Sulfuros amarillos/naranjas, manchas volcánicas oscuras
      const ctx = createCanvas('#d9b84a');
      ctx.fillStyle = '#cf7a33';
      ctx.beginPath();
      ctx.ellipse(50, 34, 38, 24, 0.3, 0, Math.PI * 2);
      ctx.ellipse(180, 88, 44, 28, -0.2, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#a84a26';
      ctx.beginPath();
      ctx.ellipse(120, 52, 30, 20, 0, 0, Math.PI * 2);
      ctx.ellipse(210, 30, 22, 14, 0.4, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#3f2a18';
      for (const [vx, vy] of [[88, 40], [150, 78], [225, 52], [60, 96]] as const) {
        ctx.beginPath();
        ctx.arc(vx, vy, 5 + Math.random() * 4, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = 'rgba(63, 42, 24, 0.6)';
        ctx.lineWidth = 1.4;
        ctx.beginPath();
        ctx.moveTo(vx, vy);
        ctx.lineTo(vx + 18 + Math.random() * 16, vy - 10 - Math.random() * 12);
        ctx.stroke();
      }
      addNoise(ctx, 0.07, 2, 200);
      return ctx.canvas;
    }
    case 'europa': {
      // Hielo blanco-crema con líneas de fractura marrones/rojizas
      const ctx = createCanvas('#e6e0d0');
      ctx.strokeStyle = 'rgba(163, 112, 76, 0.75)';
      ctx.lineWidth = 1.4;
      for (let i = 0; i < 14; i++) {
        const x0 = Math.random() * TEXTURE_W;
        const y0 = Math.random() * TEXTURE_H;
        ctx.beginPath();
        ctx.moveTo(x0, y0);
        ctx.bezierCurveTo(
          x0 + 30 + Math.random() * 40, y0 - 14 + Math.random() * 28,
          x0 + 60 + Math.random() * 40, y0 - 14 + Math.random() * 28,
          x0 + 90 + Math.random() * 40, y0
        );
        ctx.stroke();
      }
      ctx.fillStyle = 'rgba(140, 90, 60, 0.4)';
      for (let i = 0; i < 6; i++) {
        ctx.beginPath();
        ctx.arc(Math.random() * TEXTURE_W, Math.random() * TEXTURE_H, 3 + Math.random() * 6, 0, Math.PI * 2);
        ctx.fill();
      }
      addNoise(ctx, 0.05, 2, 180);
      return ctx.canvas;
    }
    case 'ganymedes': {
      // Regiones oscuras y claras (terrenos grooved) + cráteres
      const ctx = createCanvas('#a39685');
      ctx.fillStyle = '#6d6357';
      for (const [gx, gy, gw, gh] of [
        [40, 30, 60, 40], [170, 22, 52, 36], [110, 80, 56, 34], [210, 92, 36, 26]
      ] as const) {
        ctx.beginPath();
        ctx.ellipse(gx, gy, gw, gh, 0.2, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.strokeStyle = 'rgba(194, 183, 166, 0.7)';
      ctx.lineWidth = 2;
      for (let i = 0; i < 7; i++) {
        const y = 18 + Math.random() * (TEXTURE_H - 36);
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(TEXTURE_W, y + (Math.random() - 0.5) * 20);
        ctx.stroke();
      }
      addCraters(ctx, 16, 2, 6, '#5b5348', '#cbc0ae');
      addNoise(ctx, 0.06, 2, 160);
      return ctx.canvas;
    }
    case 'calisto': {
      // Densa craterización + anillos concéntricos de Valhalla
      const ctx = createCanvas('#7b7268');
      addCraters(ctx, 34, 2, 7, '#5d564d', '#a89f93');
      ctx.strokeStyle = 'rgba(141, 133, 123, 0.8)';
      ctx.lineWidth = 2;
      for (let r = 14; r < 46; r += 10) {
        ctx.beginPath();
        ctx.arc(TEXTURE_W * 0.34, TEXTURE_H * 0.45, r, 0, Math.PI * 2);
        ctx.stroke();
      }
      addNoise(ctx, 0.08, 2, 220);
      return ctx.canvas;
    }
    case 'titan': {
      // Neblina naranja/ámbar con polos ligeramente más oscuros
      const ctx = createCanvas('#d99a4e');
      const haze = ctx.createLinearGradient(0, 0, 0, TEXTURE_H);
      haze.addColorStop(0, '#c48a42');
      haze.addColorStop(0.35, '#d99a4e');
      haze.addColorStop(0.65, '#d99a4e');
      haze.addColorStop(1, '#c48a42');
      ctx.fillStyle = haze;
      ctx.fillRect(0, 0, TEXTURE_W, TEXTURE_H);
      ctx.fillStyle = 'rgba(226, 176, 110, 0.25)';
      for (let i = 0; i < 8; i++) {
        const y = 20 + Math.random() * (TEXTURE_H - 40);
        ctx.fillRect(0, y, TEXTURE_W, 3 + Math.random() * 6);
      }
      return ctx.canvas;
    }
    case 'encelado': {
      // Hielo casi puro brillante con grietas azuladas
      const ctx = createCanvas('#eef3f8');
      ctx.strokeStyle = 'rgba(170, 200, 220, 0.6)';
      ctx.lineWidth = 1.2;
      for (let i = 0; i < 10; i++) {
        const y = 15 + Math.random() * (TEXTURE_H - 30);
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.bezierCurveTo(TEXTURE_W * 0.33, y + 6, TEXTURE_W * 0.66, y - 6, TEXTURE_W, y);
        ctx.stroke();
      }
      addNoise(ctx, 0.06, 2, 140);
      return ctx.canvas;
    }
    case 'miranda': {
      // Mosaico de terrenos claros y oscuros (parches chevron)
      const ctx = createCanvas('#b8c8d2');
      ctx.fillStyle = '#dde7ec';
      for (const [mx, my] of [[70, 30], [150, 90], [200, 40]] as const) {
        ctx.beginPath();
        ctx.moveTo(mx - 30, my + 12);
        ctx.lineTo(mx, my - 16);
        ctx.lineTo(mx + 30, my + 12);
        ctx.closePath();
        ctx.fill();
      }
      ctx.fillStyle = '#7d8f9c';
      for (const [mx, my] of [[40, 90], [180, 70], [110, 20]] as const) {
        ctx.beginPath();
        ctx.moveTo(mx - 22, my + 9);
        ctx.lineTo(mx, my - 12);
        ctx.lineTo(mx + 22, my + 9);
        ctx.closePath();
        ctx.fill();
      }
      addCraters(ctx, 10, 1.5, 5, '#8fa0ab', '#e4ecef');
      addNoise(ctx, 0.05, 2, 120);
      return ctx.canvas;
    }
    case 'titania': {
      // Gris-marrón con cañones tectónicos
      const ctx = createCanvas('#b0a192');
      ctx.strokeStyle = 'rgba(125, 112, 99, 0.8)';
      ctx.lineWidth = 1.6;
      for (let i = 0; i < 6; i++) {
        const y0 = Math.random() * TEXTURE_H;
        ctx.beginPath();
        ctx.moveTo(0, y0);
        ctx.bezierCurveTo(TEXTURE_W * 0.3, y0 + 10, TEXTURE_W * 0.7, y0 - 10, TEXTURE_W, y0 + 4);
        ctx.stroke();
      }
      addCraters(ctx, 14, 2, 6, '#8a7c6d', '#d4c6b6');
      addNoise(ctx, 0.07, 2, 160);
      return ctx.canvas;
    }
    case 'triton': {
      // Terreno "cantaloupe" (bullicioso) rosado-gris con casquete polar brillante
      const ctx = createCanvas('#c9d3d6');
      ctx.fillStyle = 'rgba(216, 184, 168, 0.5)';
      ctx.beginPath();
      ctx.ellipse(180, 60, 60, 34, 0.2, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = 'rgba(179, 192, 196, 0.9)';
      ctx.lineWidth = 1.8;
      for (let i = 0; i < 26; i++) {
        const x = Math.random() * TEXTURE_W;
        const y = Math.random() * TEXTURE_H;
        ctx.beginPath();
        ctx.arc(x, y, 6 + Math.random() * 9, Math.PI * 0.9, Math.PI * 2.1);
        ctx.stroke();
      }
      ctx.fillStyle = '#e8eef0';
      ctx.fillRect(0, 0, TEXTURE_W, 14);
      addNoise(ctx, 0.06, 2, 150);
      return ctx.canvas;
    }
    case 'caronte': {
      // Gris con la Mordor Macula (casquete polar norte rojizo)
      const ctx = createCanvas('#9d9690');
      ctx.fillStyle = '#5e3a2c';
      ctx.beginPath();
      ctx.ellipse(TEXTURE_W * 0.5, 4, TEXTURE_W * 0.44, 16, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#6d4534';
      ctx.beginPath();
      ctx.ellipse(TEXTURE_W * 0.5, 10, TEXTURE_W * 0.5, 9, 0, 0, Math.PI);
      ctx.fill();
      addCraters(ctx, 8, 1.5, 5, '#7d756e', '#c6beb6');
      addNoise(ctx, 0.07, 2, 150);
      return ctx.canvas;
    }
    case 'hiiaka': {
      // Hielo de agua gris-azulado
      const ctx = createCanvas('#ccd6dc');
      addNoise(ctx, 0.08, 2, 200);
      addCraters(ctx, 8, 1.5, 5, '#aab6bd', '#e8eef2');
      return ctx.canvas;
    }
    case 'disnomia': {
      // Hielo gris uniforme
      const ctx = createCanvas('#8f969d');
      addNoise(ctx, 0.08, 2, 200);
      addCraters(ctx, 10, 1.5, 5, '#767d84', '#b6bdc4');
      return ctx.canvas;
    }
    default: {
      // Cualquier otra luna: color base + cráteres genéricos
      const ctx = createCanvas(fallbackHex);
      addCraters(ctx, 14, 2, 6, 'rgba(40,40,40,0.45)', 'rgba(255,255,255,0.35)');
      addNoise(ctx, 0.07, 2, 160);
      return ctx.canvas;
    }
  }
}

/**
 * Sustituye la textura plana de cada luna por su textura procedural fotorrealista
 * y ajusta la rugosidad según el tipo de superficie (hielo vs roca).
 */
export function applyMoonVisuals(bodies: CelestialBody[]): void {
  bodies.forEach((body) => {
    body.moonMeshes.forEach((entry, idx) => {
      const moonData = body.data.moons[idx];
      if (!moonData) return;

      const material = entry.mesh.material as THREE.MeshStandardMaterial;
      const canvas = drawMoonTexture(moonData.name, moonData.colorHex);
      const texture = new THREE.CanvasTexture(canvas);
      texture.wrapS = THREE.RepeatWrapping;
      texture.wrapT = THREE.ClampToEdgeWrapping;
      texture.colorSpace = THREE.SRGBColorSpace;

      material.map = texture;
      material.roughness = isIcyMoon(moonData.name) ? 0.28 : 0.85;
      material.needsUpdate = true;
    });
  });
}

/**
 * Añade anillos de órbita sutiles para cada luna, en el plano ecuatorial del
 * planeta (mismo marco que las órbitas lunares: `axialTiltGroup`).
 */
export function createMoonOrbitRings(bodies: CelestialBody[]): void {
  const segments = 96;
  bodies.forEach((body) => {
    body.moonMeshes.forEach((entry) => {
      const points: THREE.Vector3[] = [];
      for (let i = 0; i <= segments; i++) {
        const a = (i / segments) * Math.PI * 2;
        points.push(new THREE.Vector3(Math.cos(a) * entry.orbitRadius, 0, Math.sin(a) * entry.orbitRadius));
      }
      const geometry = new THREE.BufferGeometry().setFromPoints(points);
      const material = new THREE.LineBasicMaterial({
        color: 0xbfd6ff,
        transparent: true,
        opacity: 0.12,
        depthWrite: false
      });
      const ring = new THREE.Line(geometry, material);
      ring.name = 'moon-orbit-ring';
      body.axialTiltGroup.add(ring);
    });
  });
}


