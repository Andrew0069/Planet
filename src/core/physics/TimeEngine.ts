export class TimeEngine {
  // Época J2000.0 (2000-01-01 12:00:00 UTC) en milisegundos Unix
  public static readonly J2000_EPOCH_MS = 946728000000;

  private currentDaysSinceJ2000: number;
  private timeSpeedDaysPerSecond: number = 3.0; // 3 días de simulación por segundo real
  private isPaused: boolean = false;
  private lastRealTimestamp: number = performance.now();

  constructor(initialDate: Date = new Date()) {
    this.currentDaysSinceJ2000 = (initialDate.getTime() - TimeEngine.J2000_EPOCH_MS) / 86400000;
  }

  public update(): number {
    const now = performance.now();
    const deltaSeconds = (now - this.lastRealTimestamp) / 1000;
    this.lastRealTimestamp = now;

    if (!this.isPaused && deltaSeconds > 0 && deltaSeconds < 1.0) {
      this.currentDaysSinceJ2000 += deltaSeconds * this.timeSpeedDaysPerSecond;
    }

    return this.currentDaysSinceJ2000;
  }

  public getDaysSinceJ2000(): number {
    return this.currentDaysSinceJ2000;
  }

  public setDaysSinceJ2000(days: number): void {
    this.currentDaysSinceJ2000 = days;
  }

  public getCurrentDate(): Date {
    return new Date(TimeEngine.J2000_EPOCH_MS + this.currentDaysSinceJ2000 * 86400000);
  }

  public setDate(date: Date): void {
    this.currentDaysSinceJ2000 = (date.getTime() - TimeEngine.J2000_EPOCH_MS) / 86400000;
  }

  public setSpeed(daysPerSecond: number): void {
    this.timeSpeedDaysPerSecond = daysPerSecond;
  }

  public getSpeed(): number {
    return this.timeSpeedDaysPerSecond;
  }

  public togglePause(): boolean {
    this.isPaused = !this.isPaused;
    this.lastRealTimestamp = performance.now();
    return this.isPaused;
  }

  public setPaused(paused: boolean): void {
    this.isPaused = paused;
    this.lastRealTimestamp = performance.now();
  }

  public getIsPaused(): boolean {
    return this.isPaused;
  }
}
