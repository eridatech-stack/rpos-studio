import {
  WorkflowContext,
  WorkflowStep,
} from "../types/WorkflowStep";

export class WorkflowEngine {
  constructor(
    private readonly steps: WorkflowStep[]
  ) {}

  async run(
    context: WorkflowContext
  ) {
    context.logger.info(
      `Workflow started (${this.steps.length} steps)`
    );

    for (const step of this.steps) {
      context.logger.info(
        `Running ${step.code}`
      );

      await step.execute(context);

      context.logger.info(
        `Completed ${step.code}`
      );
    }

    context.logger.info("Workflow completed");
  }
}