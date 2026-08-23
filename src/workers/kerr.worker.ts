/// <reference lib="webworker" />
import { KerrConstants, KerrEngine, KerrParameters, KerrState } from '../core/relativity/KerrEngine';

interface Request {
  id: number;
  parameters: KerrParameters;
  constants: KerrConstants;
  initial: KerrState;
  options?: { maxSteps?: number; step?: number; escapeRadiusRg?: number };
}

self.onmessage = (event: MessageEvent<Request>) => {
  const request = event.data;
  try {
    const trajectory = KerrEngine.trace(request.parameters, request.constants, request.initial, request.options);
    self.postMessage({ id: request.id, ok: true, trajectory, geometry: KerrEngine.geometry(request.parameters) });
  } catch (error) {
    self.postMessage({ id: request.id, ok: false, error: error instanceof Error ? error.message : String(error) });
  }
};

export {};
