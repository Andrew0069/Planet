import { SimulationConfig, SimulationSnapshot, SystemDefinition } from '../core/scientific.types';

interface WorkerResponse {
  id: number;
  ok: boolean;
  snapshot?: SimulationSnapshot;
  error?: string;
}

export class NBodyWorkerClient {
  private readonly worker = new Worker(new URL('../workers/nbody.worker.ts', import.meta.url), { type: 'module' });
  private sequence = 0;
  private pending = new Map<number, { resolve: (value: SimulationSnapshot) => void; reject: (reason: Error) => void }>();

  constructor() {
    this.worker.onmessage = (event: MessageEvent<WorkerResponse>) => {
      const response = event.data;
      const request = this.pending.get(response.id);
      if (!request) return;
      this.pending.delete(response.id);
      if (response.ok && response.snapshot) request.resolve(response.snapshot);
      else request.reject(new Error(response.error ?? 'Error desconocido del motor físico.'));
    };
  }

  public initialize(system: SystemDefinition, config?: Partial<SimulationConfig>): Promise<SimulationSnapshot> {
    return this.request({ type: 'initialize', system, config });
  }

  public step(count: number): Promise<SimulationSnapshot> {
    return this.request({ type: 'step', count });
  }

  public pause(paused: boolean): Promise<SimulationSnapshot> {
    return this.request({ type: 'pause', paused });
  }

  public reset(): Promise<SimulationSnapshot> {
    return this.request({ type: 'reset' });
  }

  public updateMass(bodyId: string, massKg: number): Promise<SimulationSnapshot> {
    return this.request({ type: 'update-mass', bodyId, massKg });
  }

  public rebalance(centralBodyId: string): Promise<SimulationSnapshot> {
    return this.request({ type: 'rebalance', centralBodyId });
  }

  public dispose(): void {
    this.worker.terminate();
    for (const request of this.pending.values()) request.reject(new Error('Motor físico cerrado.'));
    this.pending.clear();
  }

  private request(message: Record<string, unknown>): Promise<SimulationSnapshot> {
    const id = ++this.sequence;
    return new Promise((resolve, reject) => {
      this.pending.set(id, { resolve, reject });
      this.worker.postMessage({ id, ...message });
    });
  }
}
