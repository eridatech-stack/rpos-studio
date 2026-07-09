import { db } from "@/lib/db";
import { workflowStepRegistry } from "@/modules/workflow/steps/stepRegistry";

async function markRunRunning(runId: string, stepCode: string, progress: number) {
  await db.query(
    `
    UPDATE production_runs
    SET status = 'running',
        current_step = ?,
        progress_percent = ?
    WHERE id = ?
    `,
    [stepCode, progress, runId]
  );
}

async function markRunCompleted(runId: string) {
  await db.query(
    `
    UPDATE production_runs
    SET status = 'completed',
        current_step = NULL,
        progress_percent = 100,
        finished_at = NOW()
    WHERE id = ?
    `,
    [runId]
  );
}

async function markRunFailed(runId: string, error: string) {
  await db.query(
    `
    UPDATE production_runs
    SET status = 'failed',
        error_message = ?,
        finished_at = NOW()
    WHERE id = ?
    `,
    [error, runId]
  );
}

async function markStepRunning(stepId: string) {
  await db.query(
    `
    UPDATE production_run_steps
    SET status = 'running',
        started_at = NOW()
    WHERE id = ?
    `,
    [stepId]
  );
}

async function markStepCompleted(stepId: string) {
  await db.query(
    `
    UPDATE production_run_steps
    SET status = 'completed',
        finished_at = NOW()
    WHERE id = ?
    `,
    [stepId]
  );
}

async function markStepFailed(stepId: string, error: string) {
  await db.query(
    `
    UPDATE production_run_steps
    SET status = 'failed',
        error_message = ?,
        finished_at = NOW()
    WHERE id = ?
    `,
    [error, stepId]
  );
}

export async function runProductionWorkflow(productionRunId: string) {
  const [runRows]: any = await db.query(
    `
    SELECT *
    FROM production_runs
    WHERE id = ?
    LIMIT 1
    `,
    [productionRunId]
  );

  const run = runRows[0];

  if (!run) {
    throw new Error("Production run not found.");
  }

  const [steps]: any = await db.query(
    `
    SELECT *
    FROM production_run_steps
    WHERE production_run_id = ?
    ORDER BY step_order ASC
    `,
    [productionRunId]
  );

  try {
    for (let index = 0; index < steps.length; index++) {
      const step = steps[index];
      const progress = Math.round((index / steps.length) * 100);

      await markRunRunning(productionRunId, step.step_code, progress);
      await markStepRunning(step.id);

      const executor = workflowStepRegistry[step.step_code];

      if (!executor) {
        await db.query(
          `
          UPDATE production_run_steps
          SET status = 'skipped',
              finished_at = NOW()
          WHERE id = ?
          `,
          [step.id]
        );

        continue;
      }

      await executor.execute({
        productionRunId,
        articleId: run.article_id,
      });

      await markStepCompleted(step.id);

      await db.query(
        `
        UPDATE production_run_steps
        SET status = 'skipped',
            finished_at = NOW()
        WHERE id = ?
        `,
        [step.id]
      );
    }

    await markRunCompleted(productionRunId);
  } catch (error: any) {
    const message = error.message || "Production workflow failed.";

    const [runningSteps]: any = await db.query(
      `
      SELECT id
      FROM production_run_steps
      WHERE production_run_id = ?
        AND status = 'running'
      `,
      [productionRunId]
    );

    for (const step of runningSteps) {
      await markStepFailed(step.id, message);
    }

    await markRunFailed(productionRunId, message);
    throw error;
  }
}