/// <reference lib="webworker" />
import { NBodyEngine } from '../core/physics/NBodyEngine';
import { SimulationConfig, SystemDefinition } from '../core/scientific.types';

type Request =
  | { id: number; type: 'initialize'; system: SystemDefinition; config?: Partial<SimulationConfig> }
  | { id: number; type: 'step'; count: number }
  | { id: number; type: 'pause'; paused: boolean }
  | { id: number; type: 'reset' }
  | { id: number; type: 'update-mass'; bodyId: string; massKg: number }
  | { id: number; type: 'rebalance'; centralBodyId: string };

const engine = new NBodyEngine();

self.onmessage = (event: MessageEvent<Request>) => {
  const request = event.data;
  try {
    if (request.type === 'initialize') engine.initialize(request.system, request.config);
    if (request.type === 'step') engine.step(request.count);
    if (request.type === 'pause') engine.setPaused(request.paused);
    if (request.type === 'reset') engine.reset();
    if (request.type === 'update-mass') engine.updateMass(request.bodyId, request.massKg);
    if (request.type === 'rebalance') engine.rebalanceCircularOrbits(request.centralBodyId);
    self.postMessage({ id: request.id, ok: true, snapshot: engine.getSnapshot() });
  } catch (error) {
    self.postMessage({ id: request.id, ok: false, error: error instanceof Error ? error.message : String(error) });
  }
};

export {};
