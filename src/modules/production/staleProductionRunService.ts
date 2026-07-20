import { db } from "@/lib/db";
import { addProductionEvent } from "@/modules/production/eventRepository";

const STALE_LOCK_MINUTES = 30;

type StaleProductionRunResult = {
  productionRunId: string;
  status: "queued" | "removed";
};

export async function restartStaleProductionRun(
  productionRunId: string
): Promise<StaleProductionRunResult> {
  const connection = await db.getConnection();

  try {
    await connection.beginTransaction();

    const run = await getLockedStaleRun(connection, productionRunId);

    const [stepRows]: any = await connection.query(
      `
      SELECT step_code, status
      FROM production_run_steps
      WHERE production_run_id = ?
      `,
      [productionRunId]
    );
    const completedSteps = new Set<string>(
      stepRows
        .filter((step: any) => step.status === "completed")
        .map((step: any) => String(step.step_code))
    );

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
      [getRestartProgressPercent(completedSteps), productionRunId]
    );

    await connection.commit();

    await addProductionEvent({
      productionRunId,
      eventType: "stale_run_restarted",
      status: "queued",
      message: "Stale production run was returned to the worker queue.",
      details: {
        previousWorkerId: run.worker_id,
        previousLockedAt: run.locked_at,
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

export async function removeStaleProductionRun(
  productionRunId: string
): Promise<StaleProductionRunResult> {
  const connection = await db.getConnection();

  try {
    await connection.beginTransaction();

    await getLockedStaleRun(connection, productionRunId);

    await connection.query(
      `
      DELETE FROM production_runs
      WHERE id = ?
      `,
      [productionRunId]
    );

    await connection.commit();

    return {
      productionRunId,
      status: "removed",
    };
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

async function getLockedStaleRun(
  connection: Awaited<ReturnType<typeof db.getConnection>>,
  productionRunId: string
) {
  const [runRows]: any = await connection.query(
    `
    SELECT id, status, worker_id, locked_at
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

  if (run.status !== "running") {
    throw new Error("Only running production runs can be managed as stale.");
  }

  if (!isStaleLock(run.locked_at)) {
    throw new Error(
      `This production run is not stale yet. A run is stale after ${STALE_LOCK_MINUTES} minutes without a worker lock refresh.`
    );
  }

  return run;
}

function isStaleLock(value: Date | string | null) {
  if (!value) {
    return false;
  }

  const lockedAt = new Date(value).getTime();

  if (!Number.isFinite(lockedAt)) {
    return false;
  }

  return Date.now() - lockedAt >= STALE_LOCK_MINUTES * 60 * 1000;
}

function getRestartProgressPercent(completedSteps: Set<string>) {
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
