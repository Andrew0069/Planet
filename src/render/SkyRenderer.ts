import * as THREE from "three";
import { SkyEngine, type SkyObject, type SkyObservation, type TwilightState } from "../core/physics/SkyEngine";

const RADIUS = 120;

export class SkyRenderer {
  private readonly renderer: THREE.WebGLRenderer;
  private readonly scene = new THREE.Scene();
  private readonly camera: THREE.PerspectiveCamera;
  private readonly root = new THREE.Group();
  private readonly pickables: THREE.Object3D[] = [];
  private readonly objectMeshes = new Map<string, THREE.Mesh>();
  private readonly labels = new Map<string, THREE.Sprite>();
  private readonly faintStars: THREE.Points;
  private readonly ground: THREE.Mesh;
  private readonly horizon: THREE.Line;
  private eclipticLine: THREE.Line | null = null;
  private equatorLine: THREE.Line | null = null;
  private readonly raycaster = new THREE.Raycaster();
  private readonly pointer = new THREE.Vector2();
  private readonly resizeObserver: ResizeObserver;
  private viewAz = 180;
  private viewAlt = 28;
  private fov = 62;
  private dragging = false;
  private dragged = false;
  private lastX = 0;
  private lastY = 0;
  private disposed = false;
  private pathKey = "";
  public onSelect?: (id: string | null) => void;

  constructor(private readonly canvas: HTMLCanvasElement) {
    this.renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      alpha: false,
      powerPreference: "high-performance",
    });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.camera = new THREE.PerspectiveCamera(this.fov, 1, 0.1, 400);
    this.camera.position.set(0, 0.08, 0);
    this.scene.add(this.root);

    this.ground = new THREE.Mesh(
      new THREE.CircleGeometry(RADIUS, 64),
      new THREE.MeshBasicMaterial({ color: 0x0b0c0f, side: THREE.DoubleSide }),
    );
    this.ground.rotation.x = -Math.PI / 2;
    this.ground.position.y = -0.02;
    this.scene.add(this.ground);

    const horizonGeom = new THREE.BufferGeometry().setFromPoints(
      Array.from({ length: 129 }, (_, i) => {
        const a = (i / 128) * Math.PI * 2;
        return new THREE.Vector3(Math.sin(a) * RADIUS, 0, -Math.cos(a) * RADIUS);
      }),
    );
    this.horizon = new THREE.Line(
      horizonGeom,
      new THREE.LineBasicMaterial({ color: 0x6f6b64, transparent: true, opacity: 0.55 }),
    );
    this.scene.add(this.horizon);

    this.addCardinal("N", 0);
    this.addCardinal("E", 90);
    this.addCardinal("S", 180);
    this.addCardinal("O", 270);

    this.faintStars = this.makeFaintStars();
    this.root.add(this.faintStars);

    this.resizeObserver = new ResizeObserver(() => this.resize());
    this.resizeObserver.observe(canvas);
    this.resize();
    this.bindInput();
    this.applyCamera();
  }

  public setView(azimuthDeg: number, altitudeDeg: number): void {
    this.viewAz = azimuthDeg;
    this.viewAlt = THREE.MathUtils.clamp(altitudeDeg, -8, 88);
    this.applyCamera();
  }

  public lookAt(azimuthDeg: number, altitudeDeg: number): void {
    this.setView(azimuthDeg, Math.max(8, altitudeDeg));
  }

  public update(observation: SkyObservation, selectedId: string | null): void {
    this.paintBackground(observation.twilight);
    this.faintStars.visible = observation.twilight.condition !== "day";
    const pathKey = `${observation.date.getTime()}|${observation.site.latitudeDeg}|${observation.site.longitudeDeg}`;
    if (pathKey !== this.pathKey) {
      this.pathKey = pathKey;
      this.syncPath("ecliptic", observation, true);
      this.syncPath("equator", observation, false);
    }

    for (const obj of observation.objects) {
      this.upsertObject(obj, selectedId, observation.twilight);
    }
    this.applyCamera();
    this.renderer.render(this.scene, this.camera);
  }

  public dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    this.resizeObserver.disconnect();
    this.renderer.dispose();
  }

  private upsertObject(obj: SkyObject, selectedId: string | null, twilight: TwilightState): void {
    let mesh = this.objectMeshes.get(obj.id);
    if (!mesh) {
      const geom =
        obj.kind === "star"
          ? new THREE.SphereGeometry(0.35, 8, 8)
          : new THREE.SphereGeometry(1, 24, 16);
      const mat = new THREE.MeshBasicMaterial({ color: obj.colorHex });
      mesh = new THREE.Mesh(geom, mat);
      mesh.userData.id = obj.id;
      this.objectMeshes.set(obj.id, mesh);
      this.root.add(mesh);
      this.pickables.push(mesh);
      const sprite = makeLabel(obj.name);
      sprite.userData.id = obj.id;
      this.labels.set(obj.id, sprite);
      this.root.add(sprite);
    }
    const p = altAzToVector(obj.altitudeDeg, obj.azimuthDeg, RADIUS);
    mesh.position.copy(p);
    const size = objectScale(obj, twilight);
    mesh.scale.setScalar(size);
    (mesh.material as THREE.MeshBasicMaterial).color.set(obj.colorHex);
    (mesh.material as THREE.MeshBasicMaterial).opacity = obj.aboveHorizon ? 1 : 0.18;
    (mesh.material as THREE.MeshBasicMaterial).transparent = !obj.aboveHorizon;
    mesh.visible = obj.kind !== "star" || obj.magnitude < 2.2 || obj.aboveHorizon;

    const label = this.labels.get(obj.id);
    if (label) {
      label.position.copy(p).multiplyScalar(1.04);
      label.visible =
        obj.kind !== "star" &&
        (obj.aboveHorizon || selectedId === obj.id) &&
        (obj.kind !== "sun" || twilight.condition === "day" || obj.aboveHorizon);
      const selected = selectedId === obj.id;
      label.scale.set(selected ? 14 : 10, selected ? 4.2 : 3, 1);
    }
  }

  private syncPath(kind: "ecliptic" | "equator", observation: SkyObservation, isEcliptic: boolean): void {
    const pts = (
      isEcliptic
        ? SkyEngine.eclipticPath(observation.site, observation.date)
        : SkyEngine.equatorPath(observation.site, observation.date)
    ).map((p) => altAzToVector(p.altitudeDeg, p.azimuthDeg, RADIUS * 0.98));
    const geom = new THREE.BufferGeometry().setFromPoints(pts);
    const color = isEcliptic ? 0xc4a574 : 0x6b7380;
    if (kind === "ecliptic") {
      this.eclipticLine?.geometry.dispose();
      if (!this.eclipticLine) {
        this.eclipticLine = new THREE.Line(
          geom,
          new THREE.LineBasicMaterial({ color, transparent: true, opacity: 0.35 }),
        );
        this.scene.add(this.eclipticLine);
      } else {
        this.eclipticLine.geometry = geom;
      }
    } else {
      this.equatorLine?.geometry.dispose();
      if (!this.equatorLine) {
        this.equatorLine = new THREE.Line(
          geom,
          new THREE.LineDashedMaterial({
            color,
            transparent: true,
            opacity: 0.28,
            dashSize: 2.5,
            gapSize: 1.6,
          }),
        );
        this.scene.add(this.equatorLine);
      } else {
        this.equatorLine.geometry = geom;
      }
      this.equatorLine.computeLineDistances();
    }
  }

  private paintBackground(twilight: TwilightState): void {
    const map: Record<TwilightState["condition"], number> = {
      day: 0x7f9bb8,
      civil: 0x243044,
      nautical: 0x141822,
      astronomical: 0x0c1016,
      night: 0x07080a,
    };
    this.scene.background = new THREE.Color(map[twilight.condition]);
    (this.ground.material as THREE.MeshBasicMaterial).color.set(
      twilight.condition === "day" ? 0x1a1c16 : 0x0b0c0f,
    );
  }

  private makeFaintStars(): THREE.Points {
    const count = 420;
    const positions = new Float32Array(count * 3);
    let seed = 1999;
    const rnd = () => {
      seed = (seed * 16807) % 2147483647;
      return (seed - 1) / 2147483646;
    };
    for (let i = 0; i < count; i++) {
      const az = rnd() * 360;
      const alt = Math.asin(rnd() * 0.92) * (180 / Math.PI);
      const v = altAzToVector(alt, az, RADIUS);
      positions[i * 3] = v.x;
      positions[i * 3 + 1] = v.y;
      positions[i * 3 + 2] = v.z;
    }
    const geom = new THREE.BufferGeometry();
    geom.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    return new THREE.Points(
      geom,
      new THREE.PointsMaterial({ color: 0xc9d4dc, size: 0.45, sizeAttenuation: true, opacity: 0.55, transparent: true }),
    );
  }

  private addCardinal(text: string, az: number): void {
    const sprite = makeLabel(text, 1.15);
    const v = altAzToVector(2.4, az, RADIUS * 0.92);
    sprite.position.copy(v);
    this.scene.add(sprite);
  }

  private bindInput(): void {
    const el = this.canvas;
    el.addEventListener("pointerdown", (e) => {
      this.dragging = true;
      this.dragged = false;
      this.lastX = e.clientX;
      this.lastY = e.clientY;
      el.setPointerCapture(e.pointerId);
    });
    el.addEventListener("pointermove", (e) => {
      if (!this.dragging) return;
      const dx = e.clientX - this.lastX;
      const dy = e.clientY - this.lastY;
      if (Math.abs(dx) + Math.abs(dy) > 2) this.dragged = true;
      this.lastX = e.clientX;
      this.lastY = e.clientY;
      this.viewAz = (this.viewAz + dx * 0.18 + 360) % 360;
      this.viewAlt = THREE.MathUtils.clamp(this.viewAlt + dy * 0.14, -8, 88);
    });
    const end = () => {
      this.dragging = false;
    };
    el.addEventListener("pointerup", end);
    el.addEventListener("pointercancel", end);
    el.addEventListener(
      "wheel",
      (e) => {
        e.preventDefault();
        this.fov = THREE.MathUtils.clamp(this.fov + Math.sign(e.deltaY) * 3.5, 24, 92);
        this.camera.fov = this.fov;
        this.camera.updateProjectionMatrix();
      },
      { passive: false },
    );
    el.addEventListener("click", (e) => this.pick(e));
  }

  private pick(e: MouseEvent): void {
    if (this.dragged) return;
    const rect = this.canvas.getBoundingClientRect();
    this.pointer.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    this.pointer.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
    this.raycaster.setFromCamera(this.pointer, this.camera);
    const hits = this.raycaster.intersectObjects(this.pickables, false);
    const id = (hits[0]?.object.userData.id as string | undefined) ?? null;
    this.onSelect?.(id);
  }

  private applyCamera(): void {
    const target = altAzToVector(this.viewAlt, this.viewAz, 40);
    this.camera.fov = this.fov;
    this.camera.lookAt(target);
    this.camera.updateProjectionMatrix();
  }

  private resize(): void {
    const width = Math.max(2, this.canvas.clientWidth);
    const height = Math.max(2, this.canvas.clientHeight);
    this.renderer.setSize(width, height, false);
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
  }
}

function altAzToVector(altDeg: number, azDeg: number, radius: number): THREE.Vector3 {
  const alt = THREE.MathUtils.degToRad(altDeg);
  const az = THREE.MathUtils.degToRad(azDeg);
  return new THREE.Vector3(
    radius * Math.cos(alt) * Math.sin(az),
    radius * Math.sin(alt),
    -radius * Math.cos(alt) * Math.cos(az),
  );
}

function objectScale(obj: SkyObject, twilight: TwilightState): number {
  if (obj.kind === "sun") return twilight.condition === "day" ? 6.4 : 4.6;
  if (obj.kind === "moon") return 4.2;
  if (obj.kind === "star") return Math.max(0.28, 1.35 - obj.magnitude * 0.28);
  const magScale = Math.max(0.7, 2.8 - obj.magnitude * 0.22);
  return magScale + Math.min(2.2, Math.log10(obj.angularSizeArcsec + 1));
}

function makeLabel(text: string, scale = 1): THREE.Sprite {
  const canvas = document.createElement("canvas");
  canvas.width = 256;
  canvas.height = 64;
  const ctx = canvas.getContext("2d")!;
  ctx.clearRect(0, 0, 256, 64);
  ctx.font = '500 22px "Cormorant Garamond", "Palatino Linotype", serif';
  ctx.fillStyle = "#ece8e0";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.shadowColor = "rgba(0,0,0,0.9)";
  ctx.shadowBlur = 8;
  ctx.fillText(text, 128, 32);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  const sprite = new THREE.Sprite(
    new THREE.SpriteMaterial({ map: texture, transparent: true, depthWrite: false }),
  );
  sprite.scale.set(10 * scale, 3 * scale, 1);
  return sprite;
}
