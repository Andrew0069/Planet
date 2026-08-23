import { SPECTRAL_CLASSES } from '../data/star.data';
import { ThermodynamicsEngine } from '../core/thermodynamics/ThermodynamicsEngine';

export class StarControls {
  private tempSlider: HTMLInputElement;
  private tempDisplay: HTMLElement;
  private lumDisplay: HTMLElement;
  private hzDisplay: HTMLElement;
  private classButtonsContainer: HTMLElement;
  private currentTempK: number = 5778;

  public onTemperatureChanged?: (tempK: number) => void;

  constructor() {
    this.tempSlider = document.getElementById('star-temp-slider') as HTMLInputElement;
    this.tempDisplay = document.getElementById('star-temp-val') as HTMLElement;
    this.lumDisplay = document.getElementById('star-lum-val') as HTMLElement;
    this.hzDisplay = document.getElementById('star-hz-val') as HTMLElement;
    this.classButtonsContainer = document.getElementById('spectral-class-buttons') as HTMLElement;

    this.setupSpectralButtons();
    this.setupSlider();
    this.updateUI();
  }

  private setupSpectralButtons(): void {
    if (!this.classButtonsContainer) return;
    this.classButtonsContainer.innerHTML = '';

    SPECTRAL_CLASSES.forEach((spClass) => {
      const btn = document.createElement('button');
      btn.className = `spectral-btn ${spClass.type === 'G' ? 'active' : ''}`;
      btn.textContent = spClass.type;
      btn.title = `${spClass.name} (${spClass.typicalTemp} K)`;
      btn.style.borderBottom = `3px solid ${spClass.colorHex}`;

      btn.addEventListener('click', () => {
        this.setTemperature(spClass.typicalTemp);
        this.updateActiveButton(btn);
      });

      this.classButtonsContainer.appendChild(btn);
    });
  }

  private setupSlider(): void {
    if (!this.tempSlider) return;

    this.tempSlider.addEventListener('input', () => {
      const val = parseInt(this.tempSlider.value, 10);
      this.setTemperature(val);
      this.clearActiveButtons();
    });
  }

  public setTemperature(tempK: number): void {
    this.currentTempK = tempK;
    if (this.tempSlider) this.tempSlider.value = tempK.toString();
    this.updateUI();

    if (this.onTemperatureChanged) {
      this.onTemperatureChanged(tempK);
    }
  }

  private updateUI(): void {
    if (this.tempDisplay) {
      this.tempDisplay.textContent = `${this.currentTempK.toLocaleString()} K`;
    }

    const relLum = ThermodynamicsEngine.calculateRelativeLuminosity(this.currentTempK);
    if (this.lumDisplay) {
      this.lumDisplay.textContent = `${relLum.toFixed(2)} L☉`;
    }

    const hz = ThermodynamicsEngine.calculateHabitableZone(this.currentTempK);
    if (this.hzDisplay) {
      this.hzDisplay.textContent = `${hz.conservativeInnerAU.toFixed(2)} – ${hz.conservativeOuterAU.toFixed(2)} UA`;
    }
  }

  private updateActiveButton(activeBtn: HTMLElement): void {
    const buttons = this.classButtonsContainer.querySelectorAll('.spectral-btn');
    buttons.forEach((b) => b.classList.remove('active'));
    activeBtn.classList.add('active');
  }

  private clearActiveButtons(): void {
    const buttons = this.classButtonsContainer.querySelectorAll('.spectral-btn');
    buttons.forEach((b) => b.classList.remove('active'));
  }

  public getTemperature(): number {
    return this.currentTempK;
  }
}
