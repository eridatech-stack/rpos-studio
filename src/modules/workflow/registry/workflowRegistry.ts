import { WorkflowStep } from "../types/WorkflowStep";

const registry = new Map<string, WorkflowStep>();

export function registerStep(step: WorkflowStep) {
  registry.set(step.code, step);
}

export function getStep(code: string) {
  return registry.get(code);
}

export function getAllSteps() {
  return [...registry.values()].sort(
    (a, b) => a.order - b.order
  );
}