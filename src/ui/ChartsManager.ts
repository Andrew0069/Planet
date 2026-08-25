import { Chart, registerables } from 'chart.js';
import { PLANETS_DATA } from '../data/planets.data';
import { ThermodynamicsEngine } from '../core/thermodynamics/ThermodynamicsEngine';
import { KeplerianEngine } from '../core/physics/KeplerianEngine';

Chart.register(...registerables);

export class ChartsManager {
  private tempChart: Chart | null = null;
  private irradianceChart: Chart | null = null;

  constructor(tempCanvasId: string, irradianceCanvasId: string) {
    const tempCanvas = document.getElementById(tempCanvasId) as HTMLCanvasElement;
    const irrCanvas = document.getElementById(irradianceCanvasId) as HTMLCanvasElement;

    if (tempCanvas && irrCanvas) {
      this.initTempChart(tempCanvas);
      this.initIrradianceChart(irrCanvas);
    }
  }

  private initTempChart(canvas: HTMLCanvasElement): void {
    const labels = PLANETS_DATA.map((p) => p.name);

    this.tempChart = new Chart(canvas, {
      type: 'bar',
      data: {
        labels: labels,
        datasets: [
          {
            label: 'Temp. Superficie Estimada (°C)',
            data: [],
            backgroundColor: 'rgba(201, 212, 220, 0.7)',
            borderColor: '#c9d4dc',
            borderWidth: 1,
            borderRadius: 4
          },
          {
            label: 'Temp. Equilibrio Cuerpo Negro (°C)',
            data: [],
            backgroundColor: 'rgba(236, 232, 224, 0.28)',
            borderColor: '#9a958c',
            borderWidth: 1,
            borderRadius: 4
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'top',
            labels: {
              color: '#9a958c',
              font: { size: 9 },
              boxWidth: 10
            }
          },
          tooltip: {
            callbacks: {
              label: (item) => `${item.dataset.label}: ${item.raw}°C`
            }
          }
        },
        scales: {
          x: {
            grid: { color: 'rgba(255, 255, 255, 0.05)' },
            ticks: { color: '#9a958c', font: { size: 9 } }
          },
          y: {
            grid: { color: 'rgba(255, 255, 255, 0.05)' },
            ticks: { color: '#9a958c', font: { size: 9 } }
          }
        }
      }
    });
  }

  private initIrradianceChart(canvas: HTMLCanvasElement): void {
    const labels = PLANETS_DATA.map((p) => p.name);

    this.irradianceChart = new Chart(canvas, {
      type: 'line',
      data: {
        labels: labels,
        datasets: [
          {
            label: 'Irradiancia Solar (W/m²)',
            data: [],
            borderColor: '#c4a574',
            backgroundColor: 'rgba(196, 165, 116, 0.18)',
            fill: true,
            tension: 0.35,
            pointBackgroundColor: '#c4a574',
            pointRadius: 3
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'top',
            labels: {
              color: '#9a958c',
              font: { size: 9 },
              boxWidth: 10
            }
          }
        },
        scales: {
          x: {
            grid: { color: 'rgba(255, 255, 255, 0.05)' },
            ticks: { color: '#9a958c', font: { size: 9 } }
          },
          y: {
            type: 'logarithmic',
            grid: { color: 'rgba(255, 255, 255, 0.05)' },
            ticks: { color: '#9a958c', font: { size: 9 } }
          }
        }
      }
    });
  }

  public update(daysSinceJ2000: number, starTempK: number): void {
    if (!this.tempChart || !this.irradianceChart) return;

    const surfaceTemps: number[] = [];
    const eqTemps: number[] = [];
    const irradiances: number[] = [];

    PLANETS_DATA.forEach((planet) => {
      const pos = KeplerianEngine.calculatePosition(planet.elements, daysSinceJ2000);
      const thermo = ThermodynamicsEngine.evaluatePlanet(planet, pos.distanceAU, starTempK);

      surfaceTemps.push(Math.round(thermo.surfaceTempEstimatedC));
      eqTemps.push(Math.round(thermo.equilibriumTempC));
      irradiances.push(Math.round(thermo.solarIrradianceWm2));
    });

    this.tempChart.data.datasets[0].data = surfaceTemps;
    this.tempChart.data.datasets[1].data = eqTemps;
    this.tempChart.update('none');

    this.irradianceChart.data.datasets[0].data = irradiances;
    this.irradianceChart.update('none');
  }
}
