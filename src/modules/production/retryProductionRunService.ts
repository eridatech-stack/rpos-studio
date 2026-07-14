import { db } from "@/lib/db";
import { addProductionEvent } from "@/modules/production/eventRepository";

type RetryProductionRunResult = {
  productionRunId: string;
  status: "queued";
};

type ProductionRunStepRow = {
  step_code: string;
  status: string;
};

export async function retryFailedProductionRun(
  productionRunId: string
): Promise<RetryProductionRunResult> {
  const connection = await db.getConnection();

  try {
    await connection.beginTransaction();

    const [runRows]: any = await connection.query(
      `
      SELECT id, keyword_id, status
      FROM production_runs
      WHERE id = ?
      LIMIT 1
      FOR UPDATE
      `,
      [productionRunId]
    );

    const run = runRows[0];

    if (!run) {
      throw new Error("Production run not found.");
    }

    if (run.status !== "failed") {
      throw new Error("Only failed production runs can be retried.");
    }

    if (!run.keyword_id) {
      throw new Error("Only keyword-backed production runs can be retried.");
    }

    const [stepRows]: any = await connection.query(
      `
      SELECT step_code, status
      FROM production_run_steps
      WHERE production_run_id = ?
      `,
      [productionRunId]
    );

    const completedSteps = new Set<string>(
      (stepRows as ProductionRunStepRow[])
        .filter((step) => step.status === "completed")
        .map((step) => step.step_code)
    );

    const progressPercent = getRetryProgressPercent(completedSteps);

    await connection.query(
      `
      UPDATE production_run_steps
      SET
        status = 'queued',
        started_at = NULL,
        finished_at = NULL,
        error_message = NULL
      WHERE production_run_id = ?
        AND status <> 'completed'
      `,
      [productionRunId]
    );

    await connection.query(
      `
      UPDATE production_runs
      SET
        status = 'queued',
        current_step = NULL,
        progress_percent = ?,
        worker_id = NULL,
        locked_at = NULL,
        error_message = NULL,
        finished_at = NULL
      WHERE id = ?
      `,
      [progressPercent, productionRunId]
    );

    await connection.commit();

    await addProductionEvent({
      productionRunId,
      eventType: "run_retried",
      status: "queued",
      message: "Failed production run returned to the worker queue.",
      details: {
        keywordId: run.keyword_id,
        completedSteps: Array.from(completedSteps),
      },
    });

    return {
      productionRunId,
      status: "queued",
    };
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

function getRetryProgressPercent(completedSteps: Set<string>) {
  if (completedSteps.has("wordpress_draft")) {
    return 100;
  }

  if (completedSteps.has("featured_image")) {
    return 85;
  }

  if (completedSteps.has("draft")) {
    return 65;
  }

  if (completedSteps.has("outline")) {
    return 40;
  }

  return 0;
}
