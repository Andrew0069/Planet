import { ThermodynamicsEngine } from '../core/thermodynamics/ThermodynamicsEngine';
import {
  evidenceLabel,
  OrbitalBody,
  SI,
  SimulationSnapshot,
  SystemDefinition
} from '../core/scientific.types';
import { KerrEngine, KerrGeometry, KerrTrajectory } from '../core/relativity/KerrEngine';
import { cloneSystemForLab, CURATED_SYSTEMS } from '../data/exoplanets.data';
import { NasaExoplanetClient } from '../services/NasaExoplanetClient';
import { NBodyWorkerClient } from '../services/NBodyWorkerClient';
import {
  cardinalFromAzimuth,
  formatAzimuth,
  formatHours,
  SANTA_TECLA,
  SkyEngine,
  type ObserverSite,
  type SkyObject,
  type SkyObservation
} from '../core/physics/SkyEngine';
import { SkyRenderer } from '../render/SkyRenderer';

type Workspace = 'solar' | 'sky' | 'atlas' | 'lab' | 'kerr';

interface KerrResponse {
  id: number;
  ok: boolean;
  trajectory?: KerrTrajectory;
  geometry?: KerrGeometry;
  error?: string;
}

export class WorkspaceController {
  private readonly shell: HTMLElement;
  private readonly content: HTMLElement;
  private readonly viewport: HTMLElement;
  private readonly legacyPanels: HTMLElement[];
  private systems = structuredClone(CURATED_SYSTEMS);
  private selectedSystemId = this.systems[0].id;
  private labSystem = cloneSystemForLab(this.systems[0]);
  private labBaseline = structuredClone(this.systems[0]);
  private nbody: NBodyWorkerClient | null = null;
  private labSnapshot: SimulationSnapshot | null = null;
  private labPlaying = false;
  private labBusy = false;
  private labAnimation = 0;
  private nasaAbort: AbortController | null = null;
  private kerrWorker: Worker | null = null;
  private kerrRenderer: { render: (spin: number, inclination: number, geometry: KerrGeometry) => void; dispose: () => void } | null = null;
  private kerrRequestId = 0;
  private currentWorkspace: Workspace = 'solar';
  private skyRenderer: SkyRenderer | null = null;
  private skySite: ObserverSite = SkyEngine.loadSite();
  private skyDate = new Date();
  private skyLive = true;
  private skySelectedId: string | null = null;
  private skyRaf = 0;
  private skyDidFrame = false;
  private lastSkyListMs = 0;
  private skyEventsKey = '';
  private skyEventsHtml = '';
  private lastObservation: SkyObservation | null = null;

  constructor(private readonly hooks: { onSelectBody?: (id: string | null) => void } = {}) {
    this.shell = requiredElement('science-workspace');
    this.content = requiredElement('science-workspace-content');
    this.viewport = requiredElement('viewport-3d');
    this.legacyPanels = ['left-panel', 'right-panel', 'bottom-graphs'].map((id) => requiredElement(id));
    document.querySelectorAll<HTMLButtonElement>('[data-workspace]').forEach((button) => {
      button.addEventListener('click', () => this.open(button.dataset.workspace as Workspace));
    });
    this.open('solar');
  }

  public open(workspace: Workspace): void {
    if (workspace !== 'kerr') {
      this.kerrRenderer?.dispose();
      this.kerrRenderer = null;
    }
    if (workspace !== 'sky') {
      this.stopSkyLoop();
      this.skyRenderer?.dispose();
      this.skyRenderer = null;
      this.skyDidFrame = false;
    }
    this.currentWorkspace = workspace;
    document.querySelectorAll('[data-workspace]').forEach((button) => button.classList.toggle('active', (button as HTMLElement).dataset.workspace === workspace));
    const showLegacy = workspace === 'solar';
    this.shell.classList.toggle('visible', !showLegacy);
    this.viewport.style.visibility = showLegacy ? 'visible' : 'hidden';
    this.legacyPanels.forEach((panel) => { panel.style.visibility = showLegacy ? 'visible' : 'hidden'; });
    if (showLegacy) {
      this.stopLabLoop();
      return;
    }
    if (workspace === 'sky') this.renderSky(true);
    if (workspace === 'atlas') this.renderAtlas();
    if (workspace === 'lab') void this.renderLab(true);
    if (workspace === 'kerr') this.renderKerr();
  }

  private renderSky(rebuild: boolean): void {
    this.stopLabLoop();
    if (this.skyLive) this.skyDate = new Date();
    const observation = SkyEngine.observe(this.skySite, this.skyDate);
    this.lastObservation = observation;
    if (rebuild) {
      this.content.innerHTML = skyShellHtml(this.skySite, this.skyDate, this.skyLive);
      const canvas = requiredCanvas('sky-canvas');
      this.skyRenderer?.dispose();
      this.skyRenderer = new SkyRenderer(canvas);
      this.skyRenderer.onSelect = (id) => this.selectSkyObject(id);
      this.bindSkyControls();
      this.skyDidFrame = false;
    }
    this.paintSkyHud(observation);
    this.skyRenderer?.update(observation, this.skySelectedId);
    if (!this.skyDidFrame) {
      const target =
        observation.objects.find((item) => item.id === this.skySelectedId) ??
        brightestAbove(observation.objects);
      if (target) this.skyRenderer?.lookAt(target.azimuthDeg, target.altitudeDeg);
      this.skyDidFrame = true;
    }
    this.startSkyLoop();
  }

  private startSkyLoop(): void {
    if (this.skyRaf) return;
    const tick = (now: number) => {
      if (this.currentWorkspace !== 'sky') {
        this.skyRaf = 0;
        return;
      }
      this.skyRaf = requestAnimationFrame(tick);
      const hudInterval = this.skyLive ? 1000 : 400;
      const refresh = !this.lastObservation || now - this.lastSkyListMs >= hudInterval;
      if (this.skyLive && refresh) this.skyDate = new Date();
      if (refresh) {
        this.lastObservation = SkyEngine.observe(this.skySite, this.skyDate);
        this.lastSkyListMs = now;
        this.paintSkyHud(this.lastObservation);
      }
      this.skyRenderer?.update(this.lastObservation!, this.skySelectedId);
    };
    this.skyRaf = requestAnimationFrame(tick);
  }

  private stopSkyLoop(): void {
    if (this.skyRaf) cancelAnimationFrame(this.skyRaf);
    this.skyRaf = 0;
  }

  private bindSkyControls(): void {
    requiredElement('sky-now-btn').addEventListener('click', () => {
      this.skyLive = true;
      this.skyDate = new Date();
      this.renderSky(false);
      this.syncSkyInputs();
    });
    requiredInput('sky-live').addEventListener('change', (event) => {
      this.skyLive = (event.target as HTMLInputElement).checked;
      if (this.skyLive) this.skyDate = new Date();
      this.renderSky(false);
    });
    requiredInput('sky-datetime').addEventListener('change', (event) => {
      this.skyLive = false;
      this.skyDate = SkyEngine.fromLocalInputValue(
        (event.target as HTMLInputElement).value,
        this.skySite.utcOffsetHours,
      );
      requiredInput('sky-live').checked = false;
      this.skyDidFrame = false;
      this.renderSky(false);
    });
    requiredInput('sky-lat').addEventListener('change', () => this.commitSkySite());
    requiredInput('sky-lon').addEventListener('change', () => this.commitSkySite());
    requiredElement('sky-reset-site').addEventListener('click', () => {
      this.skySite = { ...SANTA_TECLA };
      SkyEngine.saveSite(this.skySite);
      this.skyDidFrame = false;
      this.renderSky(true);
    });
  }

  private commitSkySite(): void {
    this.skySite = {
      ...this.skySite,
      latitudeDeg: Number(requiredInput('sky-lat').value),
      longitudeDeg: Number(requiredInput('sky-lon').value),
    };
    SkyEngine.saveSite(this.skySite);
    this.skyDidFrame = false;
    this.renderSky(false);
    this.syncSkyInputs();
  }

  private syncSkyInputs(): void {
    const dateInput = document.getElementById('sky-datetime') as HTMLInputElement | null;
    const liveInput = document.getElementById('sky-live') as HTMLInputElement | null;
    if (dateInput) dateInput.value = SkyEngine.toLocalInputValue(this.skyDate, this.skySite.utcOffsetHours);
    if (liveInput) liveInput.checked = this.skyLive;
  }

  private selectSkyObject(id: string | null): void {
    this.skySelectedId = id;
    const observation = SkyEngine.observe(this.skySite, this.skyDate);
    this.lastObservation = observation;
    const obj = observation.objects.find((item) => item.id === id);
    if (obj && obj.kind !== 'star') this.hooks.onSelectBody?.(obj.kind === 'sun' ? null : obj.id);
    if (obj) this.skyRenderer?.lookAt(obj.azimuthDeg, obj.altitudeDeg);
    this.paintSkyHud(observation);
    this.skyRenderer?.update(observation, this.skySelectedId);
  }

  private paintSkyHud(observation: SkyObservation): void {
    const twilight = document.getElementById('sky-twilight');
    const lst = document.getElementById('sky-lst');
    const stamp = document.getElementById('sky-stamp');
    const list = document.getElementById('sky-object-list');
    const card = document.getElementById('sky-selected');
    const hint = document.getElementById('sky-hint');
    if (twilight) twilight.textContent = observation.twilight.label;
    if (lst) lst.textContent = formatHours(observation.lstHours);
    if (stamp) {
      stamp.textContent = `${observation.site.name} · ${SkyEngine.toLocalInputValue(observation.date, observation.site.utcOffsetHours).replace('T', ' ')} UTC${observation.site.utcOffsetHours >= 0 ? '+' : ''}${observation.site.utcOffsetHours}`;
    }
    const bodies = observation.objects.filter((item) => item.kind !== 'star');
    const visibleStars = observation.objects.filter((item) => item.kind === 'star' && item.aboveHorizon).length;
    if (hint) {
      hint.textContent = `${bodies.filter((item) => item.aboveHorizon).length} astros del sistema sobre el horizonte · ${visibleStars} estrellas brillantes · arrastra para mirar`;
    }
    if (list) {
      list.innerHTML = bodies
        .slice()
        .sort((a, b) => Number(b.aboveHorizon) - Number(a.aboveHorizon) || a.magnitude - b.magnitude)
        .map((item) => skyListRow(item, this.skySelectedId === item.id))
        .join('');
      list.querySelectorAll<HTMLButtonElement>('[data-sky-id]').forEach((button) => {
        button.addEventListener('click', () => this.selectSkyObject(button.dataset.skyId ?? null));
      });
    }
    if (card) {
      const selected =
        observation.objects.find((item) => item.id === this.skySelectedId) ??
        brightestAbove(observation.objects);
      if (selected) {
        const key = `${selected.id}|${SkyEngine.toLocalInputValue(observation.date, observation.site.utcOffsetHours).slice(0, 10)}|${observation.site.latitudeDeg}|${observation.site.longitudeDeg}`;
        if (key !== this.skyEventsKey) {
          this.skyEventsKey = key;
          this.skyEventsHtml = skyEventsHtml(SkyEngine.events(observation.site, observation.date, selected.id), observation.site);
        }
        card.innerHTML = skyCardHtml(selected, this.skyEventsHtml);
      } else {
        card.innerHTML = '<p class="hint-copy">Elige un astro.</p>';
      }
    }
  }

  private renderAtlas(): void {
    this.stopLabLoop();
    const selected = this.systems.find((item) => item.id === this.selectedSystemId) ?? this.systems[0];
    this.selectedSystemId = selected.id;
    const hz = ThermodynamicsEngine.calculateSpectralHabitableZone(selected.star);
    this.content.innerHTML = `
      <section class="workspace-layout atlas-layout">
        <aside class="workspace-sidebar">
          <div class="workspace-heading">
            <div><span class="eyebrow">CATÁLOGO VERIFICABLE</span><h2>Atlas exoplanetario</h2></div>
            <button class="science-btn" id="refresh-nasa-btn">↻ Actualizar NASA</button>
          </div>
          <p class="workspace-intro">Los sistemas del catálogo son inmutables. Los parámetros incompletos se identifican como derivados o asumidos.</p>
          <div id="atlas-status" class="science-status" aria-live="polite">Catálogo local · ${this.systems.length} sistemas</div>
          <div class="system-list">
            ${this.systems.map((system) => `
              <button class="system-card ${system.id === selected.id ? 'active' : ''}" data-system-id="${escapeHtml(system.id)}">
                <span class="system-star" style="background:${escapeHtml(system.star.colorHex)}"></span>
                <span><strong>${escapeHtml(system.name)}</strong><small>${system.bodies.length} planetas · ${escapeHtml(system.star.spectralClass)}</small></span>
                <span class="evidence-badge ${system.metadata.evidence}">${evidenceLabel(system.metadata.evidence)}</span>
              </button>`).join('')}
          </div>
        </aside>
        <main class="workspace-main">
          <div class="system-hero">
            <div>
              <span class="eyebrow">${selected.distanceLightYears ? `${format(selected.distanceLightYears, 1)} AÑOS LUZ` : 'NUESTRO VECINDARIO'}</span>
              <h2>${escapeHtml(selected.name)}</h2>
              <p>${escapeHtml(selected.description)}</p>
            </div>
            <button class="science-btn primary" id="clone-to-lab-btn">Abrir copia en Laboratorio →</button>
          </div>
          <div class="science-grid four">
            ${metric('Estrella', selected.star.name, 'observed')}
            ${metric('Masa estelar', `${format(selected.star.massKg / SI.SOLAR_MASS_KG, 3)} M☉`, selected.star.metadata.evidence)}
            ${metric('Temperatura efectiva', `${format(selected.star.effectiveTemperatureK, 0)} K`, selected.star.metadata.evidence)}
            ${metric('Luminosidad', `${format(selected.star.luminositySolar, 4)} L☉`, selected.star.metadata.evidence)}
          </div>
          <div class="atlas-visual panel-surface">
            <div class="panel-title-row"><h3>Arquitectura orbital</h3><span>Distancia radial comprimida logarítmicamente · no representa tamaños físicos</span></div>
            <canvas id="atlas-canvas" aria-label="Diagrama orbital del sistema seleccionado"></canvas>
            <div class="hz-legend">Zona habitable espectral: ${format(hz.innerM / SI.AU_M, 3)}–${format(hz.outerM / SI.AU_M, 3)} UA</div>
          </div>
          <div class="body-table-wrap panel-surface">
            <table class="science-table">
              <thead><tr><th>Cuerpo</th><th>Periodo</th><th>Semieje mayor</th><th>Masa</th><th>Temperatura eq.</th><th>Procedencia</th></tr></thead>
              <tbody>${selected.bodies.map((body) => {
                const climate = ThermodynamicsEngine.evaluateScientificPlanet(selected.star, body, body.elements.semiMajorAxisM);
                return `<tr>
                  <td><span class="body-dot" style="background:${escapeHtml(body.colorHex)}"></span>${escapeHtml(body.name)}</td>
                  <td>${format((body.elements.periodSeconds ?? 0) / SI.DAY_S, 3)} d</td>
                  <td>${format(body.elements.semiMajorAxisM / SI.AU_M, 5)} UA</td>
                  <td>${format(body.massKg / SI.EARTH_MASS_KG, 3)} M⊕</td>
                  <td>${format(body.equilibriumTemperatureK ?? climate.equilibriumTemperatureK, 0)} K <span class="uncertainty">±${format(climate.modelUncertaintyK, 0)}</span></td>
                  <td><span class="evidence-badge ${body.metadata.evidence}">${evidenceLabel(body.metadata.evidence)}</span></td>
                </tr>`;
              }).join('')}</tbody>
            </table>
          </div>
          <p class="model-disclaimer">Fuente: ${escapeHtml(selected.metadata.source)} · consulta ${escapeHtml(selected.metadata.accessedAt)}. La fase y orientación pueden ser ilustrativas cuando no están observadas.</p>
        </main>
      </section>`;

    this.content.querySelectorAll<HTMLButtonElement>('[data-system-id]').forEach((button) => button.addEventListener('click', () => {
      this.selectedSystemId = button.dataset.systemId ?? this.selectedSystemId;
      this.renderAtlas();
    }));
    requiredElement('clone-to-lab-btn').addEventListener('click', () => {
      this.labBaseline = structuredClone(selected);
      this.labSystem = cloneSystemForLab(selected);
      this.open('lab');
    });
    requiredElement('refresh-nasa-btn').addEventListener('click', () => void this.refreshFromNasa());
    requestAnimationFrame(() => drawSystemDiagram(requiredCanvas('atlas-canvas'), selected));
  }

  private async refreshFromNasa(): Promise<void> {
    const status = document.getElementById('atlas-status');
    if (!status) return;
    this.nasaAbort?.abort();
    this.nasaAbort = new AbortController();
    status.textContent = 'Consultando NASA Exoplanet Archive…';
    status.className = 'science-status loading';
    try {
      const previousHost = this.systems.find((item) => item.id === this.selectedSystemId)?.star.name;
      const hosts = this.systems.filter((system) => system.id !== 'solar').map((system) => system.star.name);
      const refreshed = await new NasaExoplanetClient().refreshSystems(hosts, this.nasaAbort.signal);
      const solar = this.systems.find((system) => system.id === 'solar');
      this.systems = solar ? [solar, ...refreshed] : refreshed;
      const selectedName = this.systems.find((system) => system.star.name === previousHost);
      this.selectedSystemId = selectedName?.id ?? this.systems[0].id;
      this.renderAtlas();
      const nextStatus = document.getElementById('atlas-status');
      if (nextStatus) nextStatus.textContent = `Actualizado desde NASA · ${new Date().toLocaleTimeString()}`;
    } catch (error) {
      status.textContent = `Sin actualización: ${error instanceof Error ? error.message : String(error)} · se conserva el catálogo local.`;
      status.className = 'science-status warning';
    }
  }

  private async renderLab(reinitialize: boolean): Promise<void> {
    this.stopLabLoop();
    this.content.innerHTML = `
      <section class="workspace-layout lab-layout">
        <aside class="workspace-sidebar lab-controls">
          <div class="workspace-heading"><div><span class="eyebrow">MOTOR N-CUERPOS</span><h2>Laboratorio</h2></div><span class="session-chip">solo sesión</span></div>
          <label class="science-field"><span>Nombre del experimento</span><input id="lab-name" value="${escapeHtml(this.labSystem.name)}"></label>
          <div class="panel-surface compact">
            <h3>Estrella central</h3>
            <label class="science-field row"><span>Preset espectral</span><select id="lab-star-preset"><option value="custom">Personalizada</option><option value="M5V">M5V · enana roja</option><option value="K2V">K2V · enana naranja</option><option value="G2V">G2V · solar</option><option value="F5V">F5V · blanco-amarilla</option><option value="A0V">A0V · blanca</option></select></label>
            ${numberField('lab-star-mass', 'Masa', this.labSystem.star.massKg / SI.SOLAR_MASS_KG, 'M☉', 0.001)}
            ${numberField('lab-star-radius', 'Radio', this.labSystem.star.radiusM / SI.SOLAR_RADIUS_M, 'R☉', 0.001)}
            ${numberField('lab-star-temp', 'Temperatura', this.labSystem.star.effectiveTemperatureK, 'K', 1)}
            ${numberField('lab-star-lum', 'Luminosidad', this.labSystem.star.luminositySolar, 'L☉', 0.0001)}
          </div>
          <div class="lab-buttons">
            <button class="science-btn primary" id="lab-play-btn">Ejecutar</button>
            <button class="science-btn" id="lab-reset-btn">↺ Reiniciar</button>
            <button class="science-btn" id="lab-rebalance-btn">◎ Reequilibrar órbitas</button>
          </div>
          <div class="science-status" id="lab-event" aria-live="polite">Edite parámetros con la simulación pausada.</div>
          <div class="model-disclaimer">Integrador simpléctico leapfrog · coordenadas baricéntricas SI. Se pausa ante colisiones y encuentros cercanos.</div>
        </aside>
        <main class="workspace-main lab-main">
          <div class="system-hero compact-hero">
            <div><span class="eyebrow">COPIA EXPERIMENTAL</span><h2>${escapeHtml(this.labSystem.name)}</h2><p>Los cambios no modifican el catálogo real.</p></div>
            <button class="science-btn" id="lab-add-planet-btn">＋ Añadir planeta</button>
          </div>
          <div class="science-grid four" id="lab-metrics">
            ${metric('Tiempo simulado', '0.00 años', 'simulated')}
            ${metric('Error de energía', '0.00e+0', 'simulated')}
            ${metric('Error de momento', '0.00e+0', 'simulated')}
            ${metric('Baricentro', '0.00 m', 'simulated')}
          </div>
          <div class="science-grid four lab-comparison" id="lab-comparison">${this.labComparisonHtml()}</div>
          <div class="lab-canvas-wrap panel-surface">
            <div class="panel-title-row"><h3>Estado baricéntrico</h3><span>Escala radial logarítmica · tamaños amplificados</span></div>
            <canvas id="lab-canvas" aria-label="Simulación gravitacional del sistema"></canvas>
          </div>
          <div class="body-table-wrap panel-surface lab-body-editor">
            <table class="science-table"><thead><tr><th>Cuerpo</th><th>Masa (M⊕)</th><th>Radio (R⊕)</th><th>Órbita (UA)</th><th>Excentricidad</th><th>Inclinación (°)</th><th>Rotación (h)</th><th></th></tr></thead>
            <tbody>${this.labSystem.bodies.map((body) => bodyEditorRow(body)).join('')}</tbody></table>
          </div>
        </main>
      </section>`;
    this.bindLabControls();
    this.nbody ??= new NBodyWorkerClient();
    if (reinitialize || !this.labSnapshot) {
      try {
        this.labSnapshot = await this.nbody.initialize(this.labSystem);
      } catch (error) {
        this.showLabEvent(error instanceof Error ? error.message : String(error), true);
      }
    }
    this.paintLab();
  }

  private bindLabControls(): void {
    requiredElement('lab-play-btn').addEventListener('click', () => void this.toggleLab());
    requiredElement('lab-reset-btn').addEventListener('click', async () => {
      this.labPlaying = false;
      if (this.nbody) this.labSnapshot = await this.nbody.reset();
      this.paintLab();
    });
    requiredElement('lab-rebalance-btn').addEventListener('click', async () => {
      if (!this.nbody) return;
      this.labPlaying = false;
      this.labSnapshot = await this.nbody.rebalance(this.labSystem.star.id);
      this.showLabEvent('Velocidades circulares recalculadas; el estado espacial se conservó.', false);
      this.paintLab();
    });
    requiredElement('lab-add-planet-btn').addEventListener('click', () => {
      const index = this.labSystem.bodies.length + 1;
      this.labSystem.bodies.push(createLabPlanet(index));
      void this.renderLab(true);
    });
    (requiredElement('lab-star-preset') as HTMLSelectElement).addEventListener('change', () => {
      const key = (requiredElement('lab-star-preset') as HTMLSelectElement).value;
      const preset = STAR_PRESETS[key];
      if (!preset) return;
      this.captureLabRelativeStates();
      this.labSystem.star.massKg = preset.massSolar * SI.SOLAR_MASS_KG;
      this.labSystem.star.radiusM = preset.radiusSolar * SI.SOLAR_RADIUS_M;
      this.labSystem.star.effectiveTemperatureK = preset.temperatureK;
      this.labSystem.star.luminositySolar = preset.luminositySolar;
      this.labSystem.star.spectralClass = key;
      void this.renderLab(true);
    });
    const starFields: Array<[string, () => number, (value: number) => void]> = [
      ['lab-star-mass', () => this.labSystem.star.massKg / SI.SOLAR_MASS_KG, (value) => { this.labSystem.star.massKg = value * SI.SOLAR_MASS_KG; }],
      ['lab-star-radius', () => this.labSystem.star.radiusM / SI.SOLAR_RADIUS_M, (value) => { this.labSystem.star.radiusM = value * SI.SOLAR_RADIUS_M; }],
      ['lab-star-temp', () => this.labSystem.star.effectiveTemperatureK, (value) => { this.labSystem.star.effectiveTemperatureK = value; }],
      ['lab-star-lum', () => this.labSystem.star.luminositySolar, (value) => { this.labSystem.star.luminositySolar = value; }]
    ];
    starFields.forEach(([id, previous, setter]) => requiredInput(id).addEventListener('change', () => {
      const value = Number(requiredInput(id).value);
      if (!(value > 0) || !Number.isFinite(value)) requiredInput(id).value = String(previous());
      else { this.captureLabRelativeStates(); setter(value); void this.renderLab(true); }
    }));
    requiredInput('lab-name').addEventListener('change', () => { this.labSystem.name = requiredInput('lab-name').value.trim() || this.labSystem.name; });
    this.content.querySelectorAll<HTMLInputElement>('[data-body-field]').forEach((input) => input.addEventListener('change', () => {
      const body = this.labSystem.bodies.find((item) => item.id === input.dataset.bodyId);
      if (!body) return;
      if (input.dataset.bodyField === 'name') { body.name = input.value.trim() || body.name; return void this.renderLab(false); }
      const value = Number(input.value);
      if (!Number.isFinite(value) || value < 0) return void this.renderLab(false);
      if (input.dataset.bodyField === 'mass' || input.dataset.bodyField === 'radius') this.captureLabRelativeStates();
      if (input.dataset.bodyField === 'mass') body.massKg = Math.max(1e-12, value) * SI.EARTH_MASS_KG;
      if (input.dataset.bodyField === 'radius') body.radiusM = Math.max(1e-12, value) * SI.EARTH_RADIUS_M;
      if (input.dataset.bodyField === 'rotation') body.rotationPeriodSeconds = Math.max(0, value) * 3600;
      if (input.dataset.bodyField === 'axis') { body.elements.semiMajorAxisM = Math.max(1e-6, value) * SI.AU_M; delete body.state; }
      if (input.dataset.bodyField === 'eccentricity') { body.elements.eccentricity = Math.min(0.99, value); delete body.state; }
      if (input.dataset.bodyField === 'inclination') { body.elements.inclinationRad = value * Math.PI / 180; delete body.state; }
      void this.renderLab(true);
    }));
    this.content.querySelectorAll<HTMLButtonElement>('[data-delete-body]').forEach((button) => button.addEventListener('click', () => {
      this.labSystem.bodies = this.labSystem.bodies.filter((body) => body.id !== button.dataset.deleteBody);
      void this.renderLab(true);
    }));
  }

  private async toggleLab(): Promise<void> {
    if (!this.nbody) return;
    this.labPlaying = !this.labPlaying;
    await this.nbody.pause(!this.labPlaying);
    const button = document.getElementById('lab-play-btn');
    if (button) button.textContent = this.labPlaying ? 'Pausar' : 'Ejecutar';
    if (this.labPlaying) this.labLoop();
  }

  private labLoop = (): void => {
    if (!this.labPlaying || this.currentWorkspace !== 'lab') return;
    if (!this.labBusy && this.nbody) {
      this.labBusy = true;
      void this.nbody.step(8).then((snapshot) => {
        this.labSnapshot = snapshot;
        if (snapshot.paused) this.labPlaying = false;
        if (snapshot.events.length > 0) this.showLabEvent(snapshot.events.map((event) => event.message).join(' '), true);
        this.paintLab();
      }).catch((error: Error) => {
        this.labPlaying = false;
        this.showLabEvent(error.message, true);
      }).finally(() => { this.labBusy = false; });
    }
    this.labAnimation = requestAnimationFrame(this.labLoop);
  };

  private stopLabLoop(): void {
    this.labPlaying = false;
    cancelAnimationFrame(this.labAnimation);
  }

  private paintLab(): void {
    if (!this.labSnapshot || this.currentWorkspace !== 'lab') return;
    const canvas = document.getElementById('lab-canvas') as HTMLCanvasElement | null;
    if (canvas) drawLabSnapshot(canvas, this.labSystem, this.labSnapshot);
    const playButton = document.getElementById('lab-play-btn');
    if (playButton) playButton.textContent = this.labPlaying ? 'Pausar' : 'Ejecutar';
    const metrics = document.getElementById('lab-metrics');
    if (metrics) {
      const barycenter = this.labSnapshot.metrics.barycenterM;
      metrics.innerHTML = [
        metric('Tiempo simulado', `${format(this.labSnapshot.metrics.elapsedSeconds / SI.YEAR_S, 3)} años`, 'simulated'),
        metric('Error de energía', this.labSnapshot.metrics.relativeEnergyError.toExponential(2), this.labSnapshot.metrics.relativeEnergyError > 1e-4 ? 'assumed' : 'simulated'),
        metric('Error de momento', this.labSnapshot.metrics.relativeAngularMomentumError.toExponential(2), 'simulated'),
        metric('Baricentro', `${Math.hypot(barycenter.x, barycenter.y, barycenter.z).toExponential(2)} m`, 'simulated')
      ].join('');
    }
  }

  private showLabEvent(message: string, warning: boolean): void {
    const target = document.getElementById('lab-event');
    if (!target) return;
    target.textContent = message;
    target.className = `science-status${warning ? ' warning' : ''}`;
  }

  private captureLabRelativeStates(): void {
    if (!this.labSnapshot) return;
    const starState = this.labSnapshot.states[this.labSystem.star.id];
    if (!starState) return;
    for (const body of this.labSystem.bodies) {
      const state = this.labSnapshot.states[body.id];
      if (!state) continue;
      body.state = {
        positionM: {
          x: state.positionM.x - starState.positionM.x,
          y: state.positionM.y - starState.positionM.y,
          z: state.positionM.z - starState.positionM.z
        },
        velocityMps: {
          x: state.velocityMps.x - starState.velocityMps.x,
          y: state.velocityMps.y - starState.velocityMps.y,
          z: state.velocityMps.z - starState.velocityMps.z
        }
      };
    }
  }

  private labComparisonHtml(): string {
    const currentHz = ThermodynamicsEngine.calculateSpectralHabitableZone(this.labSystem.star);
    const baselineHz = ThermodynamicsEngine.calculateSpectralHabitableZone(this.labBaseline.star);
    const massDelta = (this.labSystem.star.massKg / this.labBaseline.star.massKg - 1) * 100;
    const hzDelta = (currentHz.innerM / baselineHz.innerM - 1) * 100;
    return [
      metric('Δ masa estelar', `${massDelta >= 0 ? '+' : ''}${format(massDelta, 2)}%`, 'simulated'),
      metric('Δ límite HZ interior', `${hzDelta >= 0 ? '+' : ''}${format(hzDelta, 2)}%`, 'simulated'),
      metric('Cuerpos original / actual', `${this.labBaseline.bodies.length} / ${this.labSystem.bodies.length}`, 'simulated'),
      metric('Estrella original', this.labBaseline.star.spectralClass, 'observed')
    ].join('');
  }

  private renderKerr(): void {
    this.stopLabLoop();
    this.content.innerHTML = `
      <section class="workspace-layout kerr-layout">
        <aside class="workspace-sidebar kerr-controls">
          <div class="workspace-heading"><div><span class="eyebrow">RELATIVIDAD GENERAL</span><h2>Laboratorio Kerr</h2></div><span class="session-chip">métrica exacta</span></div>
          <p class="workspace-intro">Geodésicas de prueba alrededor de un agujero negro rotatorio. No simula acreción MHD, fusiones ni retroacción gravitatoria.</p>
          ${rangeField('kerr-mass', 'Masa', 10, 1, 100, 1, 'M☉')}
          ${rangeField('kerr-spin', 'Espín a*', 0.85, -0.99, 0.99, 0.01, '')}
          ${rangeField('kerr-inclination', 'Inclinación', 65, 5, 90, 1, '°')}
          <div class="panel-surface compact">
            <h3>Geodésica</h3>
            ${numberField('kerr-radius', 'Radio inicial', 18, 'GM/c²', 0.1)}
            ${numberField('kerr-lz', 'Momento axial Lz', 3.2, '', 0.1)}
            ${numberField('kerr-carter', 'Constante de Carter Q', 2, '', 0.1)}
            <label class="science-field row"><span>Tipo</span><select id="kerr-particle-type"><option value="0">Fotón</option><option value="1">Partícula masiva</option></select></label>
          </div>
          <button class="science-btn primary wide" id="kerr-trace-btn">Trazar geodésica</button>
          <div id="kerr-status" class="science-status" aria-live="polite">GPU: visualización física aproximada · CPU: trayectoria numérica.</div>
          <div class="model-disclaimer">Unidades geométricas G=c=M=1. Los resultados se convierten a SI usando la masa elegida.</div>
        </aside>
        <main class="workspace-main kerr-main">
          <div class="system-hero compact-hero"><div><span class="eyebrow">ESPACIO-TIEMPO ROTATORIO</span><h2>Geometría de Kerr</h2><p>Horizonte, ergosfera, ISCO y arrastre de referencia.</p></div></div>
          <div id="kerr-metrics" class="science-grid four"></div>
          <div class="kerr-canvas-wrap panel-surface">
            <div class="panel-title-row"><h3>Plano ecuatorial y geodésica</h3><span>Disco delgado ilustrativo · color con Doppler aproximado</span></div>
            <div class="kerr-canvas-stack"><canvas id="kerr-gpu-canvas" aria-label="Trazado GPU aproximado del agujero negro Kerr"></canvas><canvas id="kerr-canvas" aria-label="Geometría y geodésica Kerr"></canvas></div>
          </div>
          <div class="kerr-explain-grid">
            <article class="panel-surface"><span class="eyebrow">HORIZONTE</span><h3>La frontera causal</h3><p>El radio exterior depende del espín. La trayectoria se detiene al cruzarlo.</p></article>
            <article class="panel-surface"><span class="eyebrow">ERGOSFERA</span><h3>Arrastre inevitable</h3><p>En esta región ningún observador puede permanecer estático respecto al infinito.</p></article>
            <article class="panel-surface"><span class="eyebrow">ISCO</span><h3>Última órbita estable</h3><p>El espín acerca el ISCO prógrado y aleja el retrógrado.</p></article>
          </div>
        </main>
      </section>`;
    this.bindKerrControls();
    this.updateKerrPreview();
    void import('./KerrRenderer').then(({ KerrRenderer }) => {
      if (this.currentWorkspace !== 'kerr') return;
      this.kerrRenderer?.dispose();
      this.kerrRenderer = new KerrRenderer(requiredCanvas('kerr-gpu-canvas'));
      this.updateKerrPreview();
    });
  }

  private bindKerrControls(): void {
    ['kerr-mass', 'kerr-spin', 'kerr-inclination'].forEach((id) => requiredInput(id).addEventListener('input', () => {
      const input = requiredInput(id);
      const output = input.parentElement?.querySelector('output');
      if (output) output.textContent = `${input.value}${id === 'kerr-mass' ? 'M☉' : id === 'kerr-inclination' ? '°' : ''}`;
      this.updateKerrPreview();
    }));
    requiredElement('kerr-trace-btn').addEventListener('click', () => void this.traceKerr());
  }

  private updateKerrPreview(trajectory?: KerrTrajectory): void {
    const parameters = this.kerrParameters();
    const geometry = KerrEngine.geometry(parameters);
    const rgKm = geometry.gravitationalRadiusM / 1000;
    const metrics = document.getElementById('kerr-metrics');
    if (metrics) metrics.innerHTML = [
      metric('Radio gravitacional', `${format(rgKm, 2)} km`, 'derived'),
      metric('Horizonte r+', `${format(geometry.horizonOuterRg, 4)} r₉`, 'derived'),
      metric('ISCO prógrado', `${format(geometry.iscoProgradeRg, 3)} r₉`, 'derived'),
      metric('ISCO retrógrado', `${format(geometry.iscoRetrogradeRg, 3)} r₉`, 'derived')
    ].join('');
    const canvas = document.getElementById('kerr-canvas') as HTMLCanvasElement | null;
    if (canvas) drawKerr(canvas, parameters.spin, geometry, trajectory);
    this.kerrRenderer?.render(parameters.spin, parameters.inclinationRad, geometry);
  }

  private async traceKerr(): Promise<void> {
    const status = requiredElement('kerr-status');
    status.textContent = 'Integrando geodésica en el Worker…';
    status.className = 'science-status loading';
    this.kerrWorker ??= new Worker(new URL('../workers/kerr.worker.ts', import.meta.url), { type: 'module' });
    const id = ++this.kerrRequestId;
    const particleMass = Number(requiredInput('kerr-particle-type').value) as 0 | 1;
    const request = {
      id,
      parameters: this.kerrParameters(),
      constants: {
        energy: particleMass === 0 ? 1 : 0.96,
        axialAngularMomentum: Number(requiredInput('kerr-lz').value),
        carterConstant: Number(requiredInput('kerr-carter').value),
        particleMass
      },
      initial: {
        affine: 0,
        t: 0,
        r: Number(requiredInput('kerr-radius').value),
        theta: Math.PI / 2,
        phi: 0,
        radialSign: -1 as const,
        polarSign: 1 as const
      }
    };
    try {
      const response = await new Promise<KerrResponse>((resolve, reject) => {
        const timeout = window.setTimeout(() => reject(new Error('La integración tardó demasiado.')), 15_000);
        const handler = (event: MessageEvent<KerrResponse>) => {
          if (event.data.id !== id) return;
          clearTimeout(timeout);
          this.kerrWorker?.removeEventListener('message', handler);
          resolve(event.data);
        };
        this.kerrWorker?.addEventListener('message', handler);
        this.kerrWorker?.postMessage(request);
      });
      if (!response.ok || !response.trajectory) throw new Error(response.error ?? 'No se pudo integrar la geodésica.');
      this.updateKerrPreview(response.trajectory);
      const outcome = response.trajectory.captured ? 'capturada por el horizonte' : response.trajectory.escaped ? 'escapó al infinito numérico' : 'alcanzó el límite de integración';
      status.textContent = `Trayectoria ${outcome} · ${response.trajectory.points.length} muestras · error de restricción ${response.trajectory.maxConstraintError.toExponential(2)}.`;
      status.className = 'science-status';
    } catch (error) {
      status.textContent = error instanceof Error ? error.message : String(error);
      status.className = 'science-status warning';
    }
  }

  private kerrParameters() {
    return {
      massKg: Number(requiredInput('kerr-mass').value) * SI.SOLAR_MASS_KG,
      spin: Number(requiredInput('kerr-spin').value),
      inclinationRad: (Number(requiredInput('kerr-inclination').value) * Math.PI) / 180
    };
  }

  public dispose(): void {
    this.stopLabLoop();
    this.stopSkyLoop();
    this.skyRenderer?.dispose();
    this.skyRenderer = null;
    this.kerrRenderer?.dispose();
    this.kerrRenderer = null;
    this.kerrWorker?.terminate();
    this.kerrWorker = null;
    this.nasaAbort?.abort();
    this.nbody?.dispose();
  }
}

function skyShellHtml(site: ObserverSite, date: Date, live: boolean): string {
  return `
    <section class="sky-layout">
      <div class="sky-stage">
        <canvas id="sky-canvas" aria-label="Cielo local"></canvas>
        <p class="sky-hint" id="sky-hint">Arrastra para mirar · rueda para el campo</p>
      </div>
      <aside class="sky-panel" id="sky-panel">
        <div class="workspace-heading">
          <div>
            <span class="eyebrow">CIELO LOCAL</span>
            <h2>Horizonte</h2>
          </div>
          <button class="science-btn" id="sky-now-btn" type="button">Ahora</button>
        </div>
        <p class="workspace-intro" id="sky-stamp">${escapeHtml(site.name)}</p>
        <label class="science-field">
          <span>Fecha y hora local (UTC${site.utcOffsetHours})</span>
          <input id="sky-datetime" type="datetime-local" value="${SkyEngine.toLocalInputValue(date, site.utcOffsetHours)}" />
        </label>
        <label class="sky-live">
          <input id="sky-live" type="checkbox" ${live ? 'checked' : ''} />
          <span>Seguir el reloj</span>
        </label>
        <div class="science-grid two">
          <label class="science-field"><span>Latitud</span><input id="sky-lat" type="number" step="0.0001" min="-90" max="90" value="${site.latitudeDeg}"></label>
          <label class="science-field"><span>Longitud</span><input id="sky-lon" type="number" step="0.0001" min="-180" max="180" value="${site.longitudeDeg}"></label>
        </div>
        <button class="science-btn" id="sky-reset-site" type="button">Santa Tecla</button>
        <div class="sky-meta">
          <div><span class="kicker">Condición</span><strong id="sky-twilight">—</strong></div>
          <div><span class="kicker">TSL</span><strong id="sky-lst">—</strong></div>
        </div>
        <div class="section-title">Sistema solar esta noche</div>
        <div class="sky-object-list" id="sky-object-list"></div>
        <div class="sky-selected" id="sky-selected"></div>
      </aside>
    </section>`;
}

function skyListRow(item: SkyObject, active: boolean): string {
  const alt = `${item.altitudeDeg >= 0 ? '+' : ''}${item.altitudeDeg.toFixed(0)}°`;
  return `<button class="sky-row ${active ? 'active' : ''} ${item.aboveHorizon ? 'up' : 'down'}" data-sky-id="${escapeHtml(item.id)}" type="button">
    <span class="body-dot" style="background:${escapeHtml(item.colorHex)}"></span>
    <span class="sky-row-copy"><strong>${escapeHtml(item.name)}</strong><small>${item.aboveHorizon ? formatAzimuth(item.azimuthDeg) : 'bajo horizonte'} · mag ${item.magnitude.toFixed(1)}</small></span>
    <span class="sky-alt">${alt}</span>
  </button>`;
}

function skyCardHtml(item: SkyObject, eventsHtml: string): string {
  const kindLabel = item.kind === 'sun' ? 'Sol' : item.kind === 'moon' ? 'Luna' : item.kind === 'planet' ? 'Planeta' : 'Estrella';
  return `
    <div class="dossier-head compact">
      <div>
        <h2><span class="body-dot" style="background:${escapeHtml(item.colorHex)}"></span> ${escapeHtml(item.name)}</h2>
        <div class="dossier-type">${kindLabel} · ${item.aboveHorizon ? 'sobre el horizonte' : 'bajo el horizonte'}</div>
      </div>
    </div>
    <div class="telemetry-grid">
      <span class="tele-k">Altitud</span><span class="tele-v">${item.altitudeDeg.toFixed(1)}°</span>
      <span class="tele-k">Azimut</span><span class="tele-v">${formatAzimuth(item.azimuthDeg)} · ${cardinalFromAzimuth(item.azimuthDeg)}</span>
      <span class="tele-k">AR / Dec</span><span class="tele-v">${formatHours(item.raDeg / 15)} / ${item.decDeg.toFixed(1)}°</span>
      <span class="tele-k">Magnitud vis.</span><span class="tele-v">${item.magnitude.toFixed(2)}</span>
      <span class="tele-k">Elongación</span><span class="tele-v">${item.kind === 'star' ? '—' : `${item.elongationDeg.toFixed(1)}°`}</span>
      <span class="tele-k">Fase</span><span class="tele-v">${item.kind === 'star' || item.kind === 'sun' ? '—' : `${Math.round(item.phase * 100)}%`}</span>
      <span class="tele-k">Tamaño ang.</span><span class="tele-v">${item.angularSizeArcsec > 1 ? `${item.angularSizeArcsec.toFixed(0)}″` : '—'}</span>
      <span class="tele-k">Distancia</span><span class="tele-v">${item.kind === 'star' ? '—' : `${item.distanceAU < 0.01 ? (item.distanceAU * 149597870.7).toFixed(0) + ' km' : item.distanceAU.toFixed(3) + ' UA'}`}</span>
    </div>
    ${eventsHtml}
    <p class="model-disclaimer">${escapeHtml(item.note ?? '')} Evidencia: ${evidenceLabel(item.evidence)}.</p>
  `;
}

function skyEventsHtml(
  events: ReturnType<typeof SkyEngine.events>,
  site: ObserverSite,
): string {
  const fmt = (value: Date | null) =>
    value ? SkyEngine.toLocalInputValue(value, site.utcOffsetHours).slice(11) : '—';
  let status = 'Sale, culmina y se pone en la fecha civil local.';
  if (events.circumpolar) status = 'Circumpolar: no se pone.';
  if (events.neverRises) status = 'No sale en esta latitud hoy.';
  return `<div class="sky-events">
    <div><span class="kicker">Salida</span><strong>${fmt(events.rise)}</strong></div>
    <div><span class="kicker">Culminación</span><strong>${fmt(events.transit)}</strong></div>
    <div><span class="kicker">Ocaso</span><strong>${fmt(events.set)}</strong></div>
    <p class="hint-copy">${status}</p>
  </div>`;
}

function brightestAbove(objects: SkyObject[]): SkyObject | undefined {
  return objects
    .filter((item) => item.kind !== 'star' && item.aboveHorizon && item.kind !== 'sun')
    .sort((a, b) => a.magnitude - b.magnitude)[0]
    ?? objects.find((item) => item.kind === 'star' && item.aboveHorizon)
    ?? objects.find((item) => item.kind === 'sun');
}

function metric(label: string, value: string, evidence: Parameters<typeof evidenceLabel>[0]): string {
  return `<div class="science-metric"><span>${escapeHtml(label)}</span><strong>${escapeHtml(value)}</strong><small class="evidence-badge ${evidence}">${evidenceLabel(evidence)}</small></div>`;
}

function numberField(id: string, label: string, value: number, unit: string, step: number): string {
  return `<label class="science-field row"><span>${escapeHtml(label)}</span><span class="input-unit"><input id="${id}" type="number" value="${value}" step="${step}" min="0">${escapeHtml(unit)}</span></label>`;
}

function rangeField(id: string, label: string, value: number, min: number, max: number, step: number, unit: string): string {
  return `<label class="science-range"><span>${escapeHtml(label)}</span><input id="${id}" type="range" value="${value}" min="${min}" max="${max}" step="${step}"><output>${value}${escapeHtml(unit)}</output></label>`;
}

function bodyEditorRow(body: OrbitalBody): string {
  return `<tr><td><span class="body-dot" style="background:${escapeHtml(body.colorHex)}"></span><input class="table-input name-input" data-body-field="name" data-body-id="${escapeHtml(body.id)}" value="${escapeHtml(body.name)}"></td>
    <td><input class="table-input" data-body-field="mass" data-body-id="${escapeHtml(body.id)}" type="number" min="0" step="0.001" value="${body.massKg / SI.EARTH_MASS_KG}"></td>
    <td><input class="table-input" data-body-field="radius" data-body-id="${escapeHtml(body.id)}" type="number" min="0" step="0.001" value="${body.radiusM / SI.EARTH_RADIUS_M}"></td>
    <td><input class="table-input" data-body-field="axis" data-body-id="${escapeHtml(body.id)}" type="number" min="0.000001" step="0.001" value="${body.elements.semiMajorAxisM / SI.AU_M}"></td>
    <td><input class="table-input" data-body-field="eccentricity" data-body-id="${escapeHtml(body.id)}" type="number" min="0" max="0.99" step="0.001" value="${body.elements.eccentricity}"></td>
    <td><input class="table-input" data-body-field="inclination" data-body-id="${escapeHtml(body.id)}" type="number" step="0.1" value="${body.elements.inclinationRad * 180 / Math.PI}"></td>
    <td><input class="table-input" data-body-field="rotation" data-body-id="${escapeHtml(body.id)}" type="number" min="0" step="0.1" value="${(body.rotationPeriodSeconds ?? 86400) / 3600}"></td>
    <td><button class="icon-btn" data-delete-body="${escapeHtml(body.id)}" aria-label="Eliminar ${escapeHtml(body.name)}">×</button></td></tr>`;
}

const STAR_PRESETS: Record<string, { massSolar: number; radiusSolar: number; temperatureK: number; luminositySolar: number }> = {
  M5V: { massSolar: 0.2, radiusSolar: 0.25, temperatureK: 3100, luminositySolar: 0.007 },
  K2V: { massSolar: 0.78, radiusSolar: 0.8, temperatureK: 4900, luminositySolar: 0.4 },
  G2V: { massSolar: 1, radiusSolar: 1, temperatureK: 5772, luminositySolar: 1 },
  F5V: { massSolar: 1.35, radiusSolar: 1.3, temperatureK: 6500, luminositySolar: 2.7 },
  A0V: { massSolar: 2.2, radiusSolar: 2.4, temperatureK: 9600, luminositySolar: 40 }
};

function createLabPlanet(index: number): OrbitalBody {
  const axisAU = Math.max(0.1, index * 0.4);
  return {
    id: `custom-${crypto.randomUUID()}`,
    name: `Planeta ${index}`,
    kind: 'planet',
    massKg: SI.EARTH_MASS_KG,
    radiusM: SI.EARTH_RADIUS_M,
    colorHex: ['#5ca8dd', '#dc8056', '#86c79c', '#c6a26a'][index % 4],
    albedoBond: 0.3,
    elements: {
      semiMajorAxisM: axisAU * SI.AU_M,
      eccentricity: 0,
      inclinationRad: 0,
      ascendingNodeRad: 0,
      argumentOfPeriapsisRad: 0,
      meanAnomalyAtEpochRad: index * 1.7,
      epochJulianDate: 2451545,
      periodSeconds: Math.sqrt(axisAU ** 3) * SI.YEAR_S
    },
    metadata: { evidence: 'simulated', source: 'Constructor de sesión', accessedAt: new Date().toISOString() }
  };
}

function drawSystemDiagram(canvas: HTMLCanvasElement, system: SystemDefinition): void {
  const { context, width, height } = setupCanvas(canvas);
  context.clearRect(0, 0, width, height);
  context.save();
  context.translate(width / 2, height / 2);
  const maxAxis = Math.max(...system.bodies.map((body) => body.elements.semiMajorAxisM / SI.AU_M), 1);
  const scale = Math.min(width, height) * 0.43;
  const radial = (au: number) => (Math.log10(1 + 9 * au / maxAxis) / Math.log10(10)) * scale;
  const hz = ThermodynamicsEngine.calculateSpectralHabitableZone(system.star);
  const inner = radial(hz.innerM / SI.AU_M);
  const outer = radial(hz.outerM / SI.AU_M);
  context.strokeStyle = 'rgba(34,197,94,.25)'; context.lineWidth = Math.max(2, outer - inner);
  context.beginPath(); context.arc(0, 0, (inner + outer) / 2, 0, Math.PI * 2); context.stroke();
  system.bodies.forEach((body, index) => {
    const radius = radial(body.elements.semiMajorAxisM / SI.AU_M);
    context.strokeStyle = 'rgba(112,151,205,.25)'; context.lineWidth = 1;
    context.beginPath(); context.ellipse(0, 0, radius, radius * Math.sqrt(1 - body.elements.eccentricity ** 2), 0, 0, Math.PI * 2); context.stroke();
    const angle = body.elements.meanAnomalyAtEpochRad + index * 0.9;
    context.fillStyle = body.colorHex; context.shadowColor = body.colorHex; context.shadowBlur = 8;
    context.beginPath(); context.arc(Math.cos(angle) * radius, Math.sin(angle) * radius, Math.max(3, Math.min(8, Math.log10(body.radiusM / SI.EARTH_RADIUS_M + 1) * 5)), 0, Math.PI * 2); context.fill();
  });
  context.fillStyle = system.star.colorHex; context.shadowColor = system.star.colorHex; context.shadowBlur = 24;
  context.beginPath(); context.arc(0, 0, 10, 0, Math.PI * 2); context.fill(); context.restore();
}

function drawLabSnapshot(canvas: HTMLCanvasElement, system: SystemDefinition, snapshot: SimulationSnapshot): void {
  const { context, width, height } = setupCanvas(canvas);
  context.clearRect(0, 0, width, height); context.save(); context.translate(width / 2, height / 2);
  const entries = Object.entries(snapshot.states);
  const maxR = Math.max(...entries.map(([, state]) => Math.hypot(state.positionM.x, state.positionM.y, state.positionM.z)), SI.AU_M);
  const scale = Math.min(width, height) * 0.43;
  const radial = (meters: number) => Math.log10(1 + 9 * meters / maxR) * scale;
  entries.forEach(([id, state]) => {
    const realR = Math.hypot(state.positionM.x, state.positionM.y, state.positionM.z);
    const r = radial(realR);
    const angle = Math.atan2(state.positionM.z, state.positionM.x);
    const body = system.bodies.find((item) => item.id === id);
    context.fillStyle = body?.colorHex ?? system.star.colorHex;
    context.shadowColor = context.fillStyle; context.shadowBlur = body ? 7 : 24;
    context.beginPath(); context.arc(Math.cos(angle) * r, Math.sin(angle) * r, body ? 5 : 11, 0, Math.PI * 2); context.fill();
    context.shadowBlur = 0; context.fillStyle = '#9fb4d4'; context.font = '11px Segoe UI';
    context.fillText(body?.name ?? system.star.name, Math.cos(angle) * r + 8, Math.sin(angle) * r - 8);
  });
  context.restore();
}

function drawKerr(canvas: HTMLCanvasElement, spin: number, geometry: KerrGeometry, trajectory?: KerrTrajectory): void {
  const { context, width, height } = setupCanvas(canvas);
  context.clearRect(0, 0, width, height);
  const cx = width / 2, cy = height / 2, scale = Math.min(width, height) / 34;
  context.save(); context.translate(cx, cy); context.rotate(-spin * 0.08);
  const ergo = geometry.ergosphereEquatorRg * scale;
  context.setLineDash([4, 5]); context.strokeStyle = 'rgba(56,189,248,.65)'; context.lineWidth = 1.5;
  context.beginPath(); context.ellipse(0, 0, ergo * (1 + Math.abs(spin) * 0.45), ergo, 0, 0, Math.PI * 2); context.stroke(); context.setLineDash([]);
  const horizon = geometry.horizonOuterRg * scale;
  context.strokeStyle = 'rgba(255,255,255,.5)'; context.lineWidth = 1;
  context.beginPath(); context.arc(0, 0, horizon, 0, Math.PI * 2); context.stroke();
  if (trajectory && trajectory.points.length > 1) {
    context.strokeStyle = '#65e6ff'; context.shadowColor = '#38bdf8'; context.shadowBlur = 8; context.lineWidth = 2;
    context.beginPath(); trajectory.points.forEach((point, index) => {
      const x = point.r * Math.cos(point.phi) * scale, y = point.r * Math.sin(point.phi) * scale;
      if (index === 0) context.moveTo(x, y); else context.lineTo(x, y);
    }); context.stroke(); context.shadowBlur = 0;
  }
  context.restore();
}

function setupCanvas(canvas: HTMLCanvasElement): { context: CanvasRenderingContext2D; width: number; height: number } {
  const rect = canvas.getBoundingClientRect();
  const ratio = Math.min(devicePixelRatio, 2);
  const width = Math.max(320, rect.width), height = Math.max(220, rect.height);
  if (canvas.width !== Math.round(width * ratio) || canvas.height !== Math.round(height * ratio)) {
    canvas.width = Math.round(width * ratio); canvas.height = Math.round(height * ratio);
  }
  const context = canvas.getContext('2d')!; context.setTransform(ratio, 0, 0, ratio, 0, 0);
  return { context, width, height };
}

function format(value: number, digits: number): string { return Number.isFinite(value) ? value.toLocaleString('es', { maximumFractionDigits: digits }) : '—'; }
function escapeHtml(value: string): string { return value.replace(/[&<>'"]/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' })[char]!); }
function requiredElement(id: string): HTMLElement { const element = document.getElementById(id); if (!element) throw new Error(`Falta #${id}.`); return element; }
function requiredInput(id: string): HTMLInputElement { return requiredElement(id) as HTMLInputElement; }
function requiredCanvas(id: string): HTMLCanvasElement { return requiredElement(id) as HTMLCanvasElement; }
