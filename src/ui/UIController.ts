import { PLANETS_DATA } from '../data/planets.data';
import { GeographicLandmark } from '../data/geography.data';
import { TimeEngine } from '../core/physics/TimeEngine';
import { SceneManager } from '../render/SceneManager';
import { StarControls } from './StarControls';
import { PlanetDossier } from './PlanetDossier';
import type { ChartsManager } from './ChartsManager';
import { KeplerianEngine } from '../core/physics/KeplerianEngine';

export class UIController {
  private sceneManager: SceneManager;
  private timeEngine: TimeEngine;
  private starControls: StarControls;
  private planetDossier: PlanetDossier;
  private chartsManager: ChartsManager | null = null;

  // Elementos DOM
  private planetNavGrid: HTMLElement;
  private dwarfNavGrid: HTMLElement;
  private timeSpeedSlider: HTMLInputElement;
  private timeSpeedVal: HTMLElement;
  private datePicker: HTMLInputElement;
  private playPauseBtn: HTMLButtonElement;
  private todayBtn: HTMLButtonElement;
  private landmarkModal: HTMLElement;
  private toggleChartsBtn: HTMLButtonElement;
  private toggleLeftPanelBtn: HTMLButtonElement;
  private bottomGraphsPanel: HTMLElement;
  private leftPanel: HTMLElement;

  private selectedPlanetId: string | null = null;
  private lastTelemetryUpdateMs = 0;

  constructor(sceneManager: SceneManager, timeEngine: TimeEngine) {
    this.sceneManager = sceneManager;
    this.timeEngine = timeEngine;

    // Componentes hijos
    this.starControls = new StarControls();
    this.planetDossier = new PlanetDossier();
    void import('./ChartsManager').then(({ ChartsManager }) => {
      this.chartsManager = new ChartsManager('temp-chart', 'irradiance-chart');
    });

    // Referencias DOM
    this.planetNavGrid = document.getElementById('planet-nav-grid') as HTMLElement;
    this.dwarfNavGrid = document.getElementById('dwarf-nav-grid') as HTMLElement;
    this.timeSpeedSlider = document.getElementById('time-speed-slider') as HTMLInputElement;
    this.timeSpeedVal = document.getElementById('time-speed-val') as HTMLElement;
    this.datePicker = document.getElementById('sim-date-picker') as HTMLInputElement;
    this.playPauseBtn = document.getElementById('play-pause-btn') as HTMLButtonElement;
    this.todayBtn = document.getElementById('today-btn') as HTMLButtonElement;
    this.landmarkModal = document.getElementById('landmark-modal') as HTMLElement;
    this.toggleChartsBtn = document.getElementById('toggle-charts-btn') as HTMLButtonElement;
    this.toggleLeftPanelBtn = document.getElementById('toggle-left-panel-btn') as HTMLButtonElement;
    this.bottomGraphsPanel = document.getElementById('bottom-graphs') as HTMLElement;
    this.leftPanel = document.getElementById('left-panel') as HTMLElement;

    this.setupPlanetNav();
    this.setupTimeControls();
    this.setupLayerToggles();
    this.setupModal();
    this.setupSyncCallbacks();
  }

  private setupPlanetNav(): void {
    if (!this.planetNavGrid) return;
    this.planetNavGrid.innerHTML = '';
    if (this.dwarfNavGrid) this.dwarfNavGrid.innerHTML = '';

    // Botón para vista general del Sistema
    const sysBtn = document.createElement('button');
    sysBtn.className = 'planet-nav-btn active';
    sysBtn.textContent = '☀️ Sistema';
    sysBtn.addEventListener('click', () => {
      this.selectPlanet(null);
    });
    this.planetNavGrid.appendChild(sysBtn);

    // Separar planetas principales de planetas enanos
    const majorPlanets = PLANETS_DATA.filter((p) => p.type !== 'dwarf');
    const dwarfPlanets = PLANETS_DATA.filter((p) => p.type === 'dwarf');

    majorPlanets.forEach((planet) => {
      const btn = document.createElement('button');
      btn.className = 'planet-nav-btn';
      btn.textContent = planet.name;
      btn.setAttribute('data-id', planet.id);
      btn.addEventListener('click', () => {
        this.selectPlanet(planet.id);
      });
      this.planetNavGrid.appendChild(btn);
    });

    if (this.dwarfNavGrid) {
      dwarfPlanets.forEach((planet) => {
        const btn = document.createElement('button');
        btn.className = 'planet-nav-btn';
        btn.textContent = planet.name;
        btn.setAttribute('data-id', planet.id);
        btn.addEventListener('click', () => {
          this.selectPlanet(planet.id);
        });
        this.dwarfNavGrid.appendChild(btn);
      });
    }
  }

  private setupTimeControls(): void {
    if (this.timeSpeedSlider) {
      this.timeSpeedSlider.addEventListener('input', () => {
        const val = parseFloat(this.timeSpeedSlider.value);
        this.timeEngine.setSpeed(val);
        if (this.timeSpeedVal) this.timeSpeedVal.textContent = `${val} d/s`;
      });
    }

    if (this.playPauseBtn) {
      this.playPauseBtn.addEventListener('click', () => {
        const isPaused = this.timeEngine.togglePause();
        this.playPauseBtn.textContent = isPaused ? '▶ Reanudar' : '⏸ Pausa';
        this.playPauseBtn.classList.toggle('active', isPaused);
      });
    }

    if (this.datePicker) {
      this.datePicker.addEventListener('change', () => {
        const date = new Date(this.datePicker.value);
        if (!isNaN(date.getTime())) {
          this.timeEngine.setDate(date);
        }
      });
    }

    if (this.todayBtn) {
      this.todayBtn.addEventListener('click', () => {
        this.timeEngine.setDate(new Date());
      });
    }

    if (this.toggleChartsBtn && this.bottomGraphsPanel) {
      this.toggleChartsBtn.addEventListener('click', () => {
        const isHidden = this.bottomGraphsPanel.style.display === 'none';
        this.bottomGraphsPanel.style.display = isHidden ? 'flex' : 'none';
        this.toggleChartsBtn.classList.toggle('active', isHidden);
      });
    }

    if (this.toggleLeftPanelBtn && this.leftPanel) {
      this.toggleLeftPanelBtn.addEventListener('click', () => {
        const isHidden = this.leftPanel.style.display === 'none';
        this.leftPanel.style.display = isHidden ? 'flex' : 'none';
        this.toggleLeftPanelBtn.classList.toggle('active', !isHidden);
      });
    }
  }

  private setupLayerToggles(): void {
    const chkHabitable = document.getElementById('chk-habitable-zone') as HTMLInputElement;
    if (chkHabitable) {
      chkHabitable.addEventListener('change', () => {
        this.sceneManager.setHabitableZoneVisibility(chkHabitable.checked);
      });
    }

    const chkOrbits = document.getElementById('chk-orbits') as HTMLInputElement;
    if (chkOrbits) {
      chkOrbits.addEventListener('change', () => {
        this.sceneManager.setOrbitsVisibility(chkOrbits.checked);
      });
    }

    const chkKuiper = document.getElementById('chk-kuiper') as HTMLInputElement;
    if (chkKuiper) {
      chkKuiper.addEventListener('change', () => {
        this.sceneManager.setKuiperBeltVisibility(chkKuiper.checked);
      });
    }

    const chkOort = document.getElementById('chk-oort') as HTMLInputElement;
    if (chkOort) {
      chkOort.addEventListener('change', () => {
        this.sceneManager.setOortCloudVisibility(chkOort.checked);
      });
    }
  }

  private setupModal(): void {
    const closeBtn = document.getElementById('close-modal-btn');
    if (closeBtn && this.landmarkModal) {
      closeBtn.addEventListener('click', () => {
        this.landmarkModal.classList.remove('visible');
      });
    }
  }

  private setupSyncCallbacks(): void {
    this.starControls.onTemperatureChanged = (tempK) => {
      this.sceneManager.setSunTemperature(tempK);
    };

    this.sceneManager.onPlanetSelected = (planet) => {
      this.updateActiveNavButton(planet ? planet.id : null);
      if (planet) {
        const pos = KeplerianEngine.calculatePosition(
          planet.elements,
          this.timeEngine.getDaysSinceJ2000()
        );
        this.planetDossier.showPlanet(planet, pos.distanceAU, this.starControls.getTemperature());
        this.selectedPlanetId = planet.id;
      } else {
        this.planetDossier.hide();
        this.selectedPlanetId = null;
      }
    };

    this.sceneManager.onLandmarkSelected = (landmark) => {
      this.showLandmarkDetails(landmark);
    };

    this.planetDossier.onCutawayToggled = (active) => {
      this.sceneManager.setGeologyCutawayForSelected(active);
    };

    this.planetDossier.onLandmarkClicked = (landmark) => {
      this.sceneManager.focusOnLandmark(landmark);
      this.showLandmarkDetails(landmark);
    };

    this.planetDossier.onCloseClicked = () => {
      this.selectPlanet(null);
    };
  }

  public selectPlanet(planetId: string | null): void {
    this.selectedPlanetId = planetId;
    this.sceneManager.selectPlanet(planetId);
    this.updateActiveNavButton(planetId);

    if (planetId) {
      const planet = PLANETS_DATA.find((p) => p.id === planetId);
      if (planet) {
        const pos = KeplerianEngine.calculatePosition(
          planet.elements,
          this.timeEngine.getDaysSinceJ2000()
        );
        this.planetDossier.showPlanet(planet, pos.distanceAU, this.starControls.getTemperature());
      }
    } else {
      this.planetDossier.hide();
    }
  }

  private updateActiveNavButton(planetId: string | null): void {
    const buttons = document.querySelectorAll('.planet-nav-btn');
    buttons.forEach((btn) => {
      const id = btn.getAttribute('data-id');
      if (planetId === null && !id) {
        btn.classList.add('active');
      } else if (planetId && id === planetId) {
        btn.classList.add('active');
      } else {
        btn.classList.remove('active');
      }
    });
  }

  public showLandmarkDetails(landmark: GeographicLandmark): void {
    if (!this.landmarkModal) return;

    const titleEl = document.getElementById('modal-landmark-title');
    const catEl = document.getElementById('modal-landmark-category');
    const coordsEl = document.getElementById('modal-landmark-coords');
    const descEl = document.getElementById('modal-landmark-desc');
    const geoEl = document.getElementById('modal-landmark-geo');

    if (titleEl) titleEl.textContent = `${landmark.iconEmoji} ${landmark.name}`;
    if (catEl) catEl.textContent = `Categoría: ${landmark.category.toUpperCase()} · ${landmark.dimensions}`;
    if (coordsEl) coordsEl.textContent = `Latitud: ${landmark.latDeg}° | Longitud: ${landmark.lonDeg}° | Elevación: ${landmark.elevationKm} km`;
    if (descEl) descEl.textContent = landmark.description;
    if (geoEl) geoEl.textContent = landmark.geologicalSignificance;

    this.landmarkModal.classList.add('visible');
  }

  public update(daysSinceJ2000: number): void {
    const now = performance.now();
    if (now - this.lastTelemetryUpdateMs < 100) return;
    this.lastTelemetryUpdateMs = now;
    const date = this.timeEngine.getCurrentDate();
    const dateStr = date.toISOString().split('T')[0];
    if (this.datePicker && document.activeElement !== this.datePicker) {
      this.datePicker.value = dateStr;
    }

    if (this.selectedPlanetId) {
      const planet = PLANETS_DATA.find((p) => p.id === this.selectedPlanetId);
      if (planet) {
        const pos = KeplerianEngine.calculatePosition(planet.elements, daysSinceJ2000);
        this.planetDossier.updateTelemetry(pos.distanceAU, this.starControls.getTemperature());
      }
    }

    this.chartsManager?.update(daysSinceJ2000, this.starControls.getTemperature());
  }
}
