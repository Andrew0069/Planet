import { PlanetData } from '../data/planets.data';
import { GEOGRAPHIC_LANDMARKS, GeographicLandmark } from '../data/geography.data';
import { ThermodynamicsEngine, PlanetThermodynamicsResult } from '../core/thermodynamics/ThermodynamicsEngine';

export class PlanetDossier {
  private panel: HTMLElement;
  private currentPlanet: PlanetData | null = null;
  private isCutawayActive: boolean = false;

  public onCutawayToggled?: (active: boolean) => void;
  public onLandmarkClicked?: (landmark: GeographicLandmark) => void;
  public onCloseClicked?: () => void;

  constructor() {
    this.panel = document.getElementById('right-panel') as HTMLElement;
  }

  public showPlanet(planet: PlanetData, currentDistanceAU: number, starTempK: number): void {
    this.currentPlanet = planet;
    this.isCutawayActive = false;
    this.panel.classList.add('visible');

    const thermo = ThermodynamicsEngine.evaluatePlanet(planet, currentDistanceAU, starTempK);
    const landmarks = GEOGRAPHIC_LANDMARKS.filter((lm) => lm.planetId === planet.id);

    this.render(planet, thermo, landmarks);
  }

  public hide(): void {
    this.currentPlanet = null;
    this.panel.classList.remove('visible');
    if (this.onCutawayToggled) this.onCutawayToggled(false);
  }

  public updateTelemetry(currentDistanceAU: number, starTempK: number): void {
    if (!this.currentPlanet) return;
    const thermo = ThermodynamicsEngine.evaluatePlanet(this.currentPlanet, currentDistanceAU, starTempK);

    const distEl = document.getElementById('dossier-dist');
    const irrEl = document.getElementById('dossier-irr');
    const teqEl = document.getElementById('dossier-teq');
    const tsurfEl = document.getElementById('dossier-tsurf');
    const statusEl = document.getElementById('dossier-status');

    if (distEl) distEl.textContent = `${thermo.distanceAU.toFixed(3)} UA`;
    if (irrEl) irrEl.textContent = `${Math.round(thermo.solarIrradianceWm2).toLocaleString()} W/m²`;
    if (teqEl) teqEl.textContent = `${Math.round(thermo.equilibriumTempC)} °C (${Math.round(thermo.equilibriumTempK)} K)`;
    if (tsurfEl) tsurfEl.textContent = `${Math.round(thermo.surfaceTempEstimatedC)} °C (${Math.round(thermo.surfaceTempEstimatedK)} K)`;

    if (statusEl) {
      statusEl.textContent = thermo.statusLabel;
      statusEl.className = `tele-v ${thermo.habitabilityStatus.replace('_', '-')}`;
    }
  }

  private render(
    planet: PlanetData,
    thermo: PlanetThermodynamicsResult,
    landmarks: GeographicLandmark[]
  ): void {
    this.panel.innerHTML = `
      <div class="dossier-head">
        <div>
          <h2>
            <span style="display:inline-block; width:10px; height:10px; border-radius:50%; background:${planet.colorHex}"></span>
            ${planet.name}
          </h2>
          <div class="dossier-type">${planet.type.replace('_', ' ')} · ${planet.diameterKm.toLocaleString()} km</div>
        </div>
        <button id="close-dossier-btn" class="hud-btn" style="padding: 4px 10px;">Cerrar</button>
      </div>

      <div class="panel-section">
        <div class="section-title">Termodinámica y radiación</div>
        <div class="telemetry-grid">
          <span class="tele-k">Distancia al Sol</span>
          <span class="tele-v" id="dossier-dist">${thermo.distanceAU.toFixed(3)} UA</span>

          <span class="tele-k">Irradiancia solar</span>
          <span class="tele-v" id="dossier-irr">${Math.round(thermo.solarIrradianceWm2).toLocaleString()} W/m²</span>

          <span class="tele-k">Albedo Bond</span>
          <span class="tele-v">${(planet.albedoBond * 100).toFixed(1)}%</span>

          <span class="tele-k">Temp. equilibrio</span>
          <span class="tele-v" id="dossier-teq">${Math.round(thermo.equilibriumTempC)} °C (${Math.round(thermo.equilibriumTempK)} K)</span>

          <span class="tele-k">Efecto invernadero</span>
          <span class="tele-v">+${Math.round(thermo.greenhouseContributionK)} K</span>

          <span class="tele-k">Temp. superficie</span>
          <span class="tele-v" id="dossier-tsurf" style="color:var(--accent-gold); font-size:14px;">${Math.round(thermo.surfaceTempEstimatedC)} °C</span>

          <span class="tele-k">Habitabilidad</span>
          <span class="tele-v ${thermo.habitabilityStatus.replace('_', '-')}" id="dossier-status" style="font-size:11px;">${thermo.statusLabel}</span>
        </div>
      </div>

      <div class="panel-section">
        <div class="section-title">
          <span>Geología interna</span>
          <button id="toggle-cutaway-btn" class="hud-btn" style="padding: 4px 10px; font-size: 10px;">
            Corte 3D
          </button>
        </div>
        <div class="layers-list">
          ${planet.geology.layers
            .map(
              (layer) => `
            <div class="layer-card" style="border-left-color: ${layer.colorHex}">
              <div class="layer-name">${layer.name}</div>
              <div class="layer-depth">${layer.depthKm[0]} – ${layer.depthKm[1]} km · ${layer.temperatureK[0]}–${layer.temperatureK[1]} K</div>
              <div class="layer-desc">${layer.composition}</div>
            </div>
          `
            )
            .join('')}
        </div>
      </div>

      ${
        landmarks.length > 0
          ? `
      <div class="panel-section">
        <div class="section-title">Topografía notable (${landmarks.length})</div>
        <div class="landmarks-list">
          ${landmarks
            .map(
              (lm) => `
            <div class="landmark-item" data-id="${lm.id}">
              <div class="landmark-info">
                <h4>${lm.name}</h4>
                <p>Lat ${lm.latDeg.toFixed(1)}° · Lon ${lm.lonDeg.toFixed(1)}° · Elev ${lm.elevationKm > 0 ? '+' : ''}${lm.elevationKm} km</p>
              </div>
              <button class="hud-btn" style="padding: 4px 8px; font-size: 10px;">Enfocar</button>
            </div>
          `
            )
            .join('')}
        </div>
      </div>
      `
          : ''
      }

      <div class="panel-section">
        <div class="section-title">Atmósfera y dinámica</div>
        <div class="telemetry-grid">
          <span class="tele-k">Presión superficial</span>
          <span class="tele-v">${planet.atmosphere.surfacePressureAtm} atm</span>

          <span class="tele-k">Gravedad</span>
          <span class="tele-v">${planet.gravityMs2} m/s²</span>

          <span class="tele-k">Rotación</span>
          <span class="tele-v">${Math.abs(planet.rotationPeriodHours).toFixed(1)} h</span>

          <span class="tele-k">Inclinación axial</span>
          <span class="tele-v">${planet.axialTiltDeg}°</span>
        </div>
        <p style="font-size: 12px; color: var(--txt-secondary); margin-top: 8px; line-height: 1.5;">
          ${planet.atmosphere.description}
        </p>
      </div>
    `;

    // Eventos de botones internos
    const closeBtn = this.panel.querySelector('#close-dossier-btn');
    if (closeBtn) {
      closeBtn.addEventListener('click', () => {
        this.hide();
        if (this.onCloseClicked) this.onCloseClicked();
      });
    }

    const cutawayBtn = this.panel.querySelector('#toggle-cutaway-btn');
    if (cutawayBtn) {
      cutawayBtn.addEventListener('click', () => {
        this.isCutawayActive = !this.isCutawayActive;
        cutawayBtn.classList.toggle('active', this.isCutawayActive);
        cutawayBtn.textContent = this.isCutawayActive ? 'Cerrar corte' : 'Corte 3D';
        if (this.onCutawayToggled) this.onCutawayToggled(this.isCutawayActive);
      });
    }

    const landmarkItems = this.panel.querySelectorAll('.landmark-item');
    landmarkItems.forEach((item) => {
      item.addEventListener('click', () => {
        const id = item.getAttribute('data-id');
        const lm = landmarks.find((l) => l.id === id);
        if (lm && this.onLandmarkClicked) {
          this.onLandmarkClicked(lm);
        }
      });
    });
  }
}
