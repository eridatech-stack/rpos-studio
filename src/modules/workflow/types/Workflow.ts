import { WorkflowStep } from "./WorkflowStep";

export interface Workflow {
  code: string;

  name: string;

  steps: WorkflowStep[];
}